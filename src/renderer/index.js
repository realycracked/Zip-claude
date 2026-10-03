// Zip Browser — renderer entry.
//
// Glues the chrome controls to the main-process API exposed via preload.

(function () {
  const { tabs, settings, window: zipWindow, downloads, privacy, bookmarks, system, app, extensions, welcome } = window.zip;
  const privateMode = window.zip.privateMode;
  document.body.dataset.private = String(privateMode);

  // Theme bootstrap --------------------------------------------------------
  async function applyTheme(name) {
    const link = document.getElementById('theme-stylesheet');
    link.href = `styles/themes/${name}.css`;
    document.body.className = document.body.className
      .split(' ')
      .filter((c) => !c.startsWith('theme-'))
      .concat('theme-' + name)
      .join(' ');
  }

  function openWelcome() {
    new window.ZipWelcomeOverlay({
      root: document.getElementById('welcome-overlay'),
      api: { settings, extensions, welcome },
      onThemeChange: applyTheme,
      onClose: () => { /* nothing — overlay hides itself */ }
    });
  }

  (async () => {
    const cfg = await settings.get();
    await applyTheme(cfg.theme || window.zip.initialTheme || 'hacker');
    if (window.zip.showWelcome) openWelcome();
  })();

  // about:welcome and about:settings open panels, not web pages.
  window.zip.internal.onOpen(({ page }) => {
    if (page === 'welcome') openWelcome();
    else if (page === 'settings') settingsPanel.open('general');
  });

  // Tab strip --------------------------------------------------------------
  const tabStrip = new window.ZipTabStrip({
    container: document.getElementById('tab-strip'),
    onActivate: (id) => tabs.activate(id),
    onClose: (id) => tabs.close(id)
  });

  document.getElementById('new-tab-btn').addEventListener('click', () => tabs.create({}));

  tabs.onUpdate(({ tab }) => {
    tabStrip.upsert(tab);
    if (tab.active) {
      syncOmniForTab(tab);
    }
  });
  tabs.onRemoved(({ tabId }) => {
    tabStrip.remove(tabId);
  });

  // Omnibar ----------------------------------------------------------------
  const omnibar = new window.ZipOmnibar({
    input: document.getElementById('url-input'),
    lock: document.getElementById('lock-icon'),
    security: document.getElementById('security-indicator'),
    blockedCounter: document.getElementById('blocked-counter'),
    shield: document.getElementById('shield-btn'),
    bookmark: document.getElementById('bookmark-btn'),
    onNavigate: (url) => {
      const active = tabStrip.getActive();
      if (active) tabs.navigate(active, url);
    },
    onToggleShield: async () => {
      const active = tabStrip.getActive();
      if (!active) return;
      const enabled = !omnibar.state.shieldOn;
      await privacy.toggle(active, enabled);
      omnibar.setShield(enabled);
      toast(enabled ? 'Tracking protection on for this site' : 'Tracking protection off for this site');
    },
    onBookmark: async () => {
      const url = omnibar.getUrl();
      if (!url) return;
      const title = tabStrip.getActiveTitle() || url;
      await bookmarks.add({ url, title });
      toast('Bookmarked');
    },
    onSiteInfo: () => openSiteInfo()
  });

  function syncOmniForTab(tab) {
    omnibar.setUrl(tab.url);
    omnibar.setSecure(tab.secure, tab.certError);
    omnibar.setBlocked(tab.blocked || 0);
    document.getElementById('back-btn').disabled = !tab.canGoBack;
    document.getElementById('forward-btn').disabled = !tab.canGoForward;
  }

  // Nav buttons ------------------------------------------------------------
  document.getElementById('back-btn').addEventListener('click', () => {
    const active = tabStrip.getActive();
    if (active) tabs.back(active);
  });
  document.getElementById('forward-btn').addEventListener('click', () => {
    const active = tabStrip.getActive();
    if (active) tabs.forward(active);
  });
  document.getElementById('reload-btn').addEventListener('click', (e) => {
    const active = tabStrip.getActive();
    if (active) tabs.reload(active, e.shiftKey);
  });
  document.getElementById('devtools-btn').addEventListener('click', () => {
    const active = tabStrip.getActive();
    if (active) tabs.devtools(active);
  });
  document.getElementById('private-btn').addEventListener('click', () => zipWindow.newPrivate());

  // Panels -----------------------------------------------------------------
  const downloadsPanel = new window.ZipDownloadsPanel({
    panel: document.getElementById('downloads-panel'),
    list: document.getElementById('downloads-list'),
    badge: document.getElementById('downloads-badge'),
    api: downloads
  });
  document.getElementById('downloads-btn').addEventListener('click', () => downloadsPanel.toggle());
  document.getElementById('clear-downloads').addEventListener('click', () => downloadsPanel.clear());
  downloadsPanel.bindEvents();

  const settingsPanel = new window.ZipSettingsPanel({
    panel: document.getElementById('settings-panel'),
    content: document.getElementById('settings-content'),
    api: settings,
    onThemeChange: applyTheme,
    onClearHistory: () => window.zip.history.clear().then(() => toast('History cleared'))
  });

  document.getElementById('menu-btn').addEventListener('click', () => {
    document.getElementById('menu-panel').toggleAttribute('hidden');
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).hidden = true;
    });
  });

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', () => handleMenu(btn.dataset.action));
  });

  function handleMenu(action) {
    document.getElementById('menu-panel').hidden = true;
    switch (action) {
      case 'new-tab': return tabs.create({});
      case 'new-window': return zipWindow.newWindow();
      case 'new-private': return zipWindow.newPrivate();
      case 'downloads': return downloadsPanel.open();
      case 'settings': return settingsPanel.open('general');
      case 'themes': return settingsPanel.open('themes');
      case 'devtools': {
        const a = tabStrip.getActive();
        if (a) tabs.devtools(a);
        return;
      }
      case 'about': return settingsPanel.open('about');
      default: return;
    }
  }

  async function openSiteInfo() {
    const active = tabStrip.getActive();
    if (!active) return;
    const panel = document.getElementById('site-info-panel');
    const body = document.getElementById('site-info-body');
    const report = await privacy.report(active);
    if (!report) return;
    body.innerHTML = `
      <div class="site-info ${report.secure ? 'is-secure' : 'is-insecure'}">
        <div class="site-info-row"><strong>URL</strong><span>${escapeHtml(report.url)}</span></div>
        <div class="site-info-row"><strong>Connection</strong>
          <span>${report.secure ? 'Encrypted (HTTPS)' : 'Not encrypted (HTTP)'}</span>
        </div>
        <div class="site-info-row"><strong>Trackers blocked</strong><span>${report.blocked}</span></div>
        ${report.certError ? `<div class="site-info-warn">Certificate problem: ${escapeHtml(report.certError)}</div>` : ''}
      </div>
    `;
    panel.hidden = false;
  }

  // Keyboard shortcuts -----------------------------------------------------
  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 't') { e.preventDefault(); tabs.create({}); }
    else if (ctrl && e.key.toLowerCase() === 'w') { e.preventDefault(); const a = tabStrip.getActive(); if (a) tabs.close(a); }
    else if (ctrl && e.key.toLowerCase() === 'n' && !e.shiftKey) { e.preventDefault(); zipWindow.newWindow(); }
    else if (ctrl && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); zipWindow.newPrivate(); }
    else if (ctrl && e.key.toLowerCase() === 'l') { e.preventDefault(); document.getElementById('url-input').select(); }
    else if (ctrl && e.key.toLowerCase() === 'r') { e.preventDefault(); const a = tabStrip.getActive(); if (a) tabs.reload(a, e.shiftKey); }
    else if (ctrl && e.key.toLowerCase() === 'j') { e.preventDefault(); downloadsPanel.toggle(); }
    else if (ctrl && e.key.toLowerCase() === ',') { e.preventDefault(); settingsPanel.open('general'); }
    else if (e.key === 'F12') { e.preventDefault(); const a = tabStrip.getActive(); if (a) tabs.devtools(a); }
    else if (e.altKey && e.key === 'ArrowLeft') { const a = tabStrip.getActive(); if (a) tabs.back(a); }
    else if (e.altKey && e.key === 'ArrowRight') { const a = tabStrip.getActive(); if (a) tabs.forward(a); }
  });

  // Click handler to intercept start-page links.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-navigate]');
    if (!a) return;
    e.preventDefault();
    const active = tabStrip.getActive();
    if (active) tabs.navigate(active, a.dataset.navigate);
  });

  // Toasts -----------------------------------------------------------------
  function toast(msg) {
    const stack = document.getElementById('toast-stack');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.classList.add('toast--out'), 2400);
    setTimeout(() => el.remove(), 2800);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  system.onThemeChange(({ dark }) => {
    document.body.dataset.systemDark = String(dark);
  });
})();
