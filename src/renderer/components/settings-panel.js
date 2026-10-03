// Zip Browser — settings panel.

(function () {
  const THEMES = [
    { id: 'hacker', name: 'Hacker Terminal', hint: 'Green-on-black monospace, zero chrome' },
    { id: 'macos', name: 'macOS Monterey', hint: 'Soft gradients, traffic-light buttons' },
    { id: 'gamer', name: 'RGB Gamer', hint: 'Neon red/purple with scanline accents' },
    { id: 'ubuntu', name: 'Ubuntu Aubergine', hint: 'Classic orange-on-aubergine' },
    { id: 'arch', name: 'Arch Linux', hint: 'Clean cyan on deep slate' },
    { id: 'cyberpunk', name: 'Cyberpunk 2088', hint: 'Hot pink + cyan neon' },
    { id: 'dracula', name: 'Dracula', hint: 'Legible dark palette with purple accents' },
    { id: 'nord', name: 'Nord', hint: 'Cool arctic blues' },
    { id: 'gruvbox', name: 'Gruvbox', hint: 'Warm, earthy retro' },
    { id: 'firefox-classic', name: 'Firefox Classic', hint: 'Familiar Firefox-style chrome' },
    { id: 'matrix', name: 'Matrix', hint: 'Falling-rain green digital rain' },
    { id: 'minimal', name: 'Minimal Light', hint: 'White, flat, library quiet' }
  ];

  class ZipSettingsPanel {
    constructor({ panel, content, api, onThemeChange, onClearHistory }) {
      this.panel = panel;
      this.content = content;
      this.api = api;
      this.onThemeChange = onThemeChange;
      this.onClearHistory = onClearHistory;
      this.cfg = null;
      this.active = 'general';

      panel.querySelectorAll('.settings-nav button').forEach((btn) => {
        btn.addEventListener('click', () => this.open(btn.dataset.tab));
      });
    }

    async open(tab) {
      this.panel.hidden = false;
      this.active = tab;
      this.panel.querySelectorAll('.settings-nav button').forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === tab);
      });
      this.cfg = await this.api.get();
      this.content.innerHTML = this._render(tab);
      this._bind(tab);
    }

    _render(tab) {
      switch (tab) {
        case 'general': return this._renderGeneral();
        case 'privacy': return this._renderPrivacy();
        case 'themes': return this._renderThemes();
        case 'search': return this._renderSearch();
        case 'downloads': return this._renderDownloads();
        case 'extensions': return this._renderExtensions();
        case 'advanced': return this._renderAdvanced();
        case 'about': return this._renderAbout();
      }
      return '';
    }

    _renderExtensions() {
      return `
        <h3>Extensions</h3>
        <p class="muted">Zip can load Chromium-format extensions. Only
          vetted sources are allowed — new ones must be added by a
          developer in <code>src/main/extensions.js</code>.</p>
        <div class="welcome-card" style="margin-top:16px;">
          <header>
            <div class="welcome-icon">◈</div>
            <div>
              <h2>uBlock Origin</h2>
              <p>Install or reinstall from <code>github.com/gorhill/uBlock</code>.</p>
            </div>
          </header>
          <div class="welcome-card-actions">
            <button class="btn-primary" id="ext-install-ublock">Install / reinstall</button>
          </div>
          <div class="welcome-status" id="ext-status" hidden></div>
        </div>
        <h3>Installed</h3>
        <div class="ext-list" id="ext-installed"></div>
      `;
    }

    _renderGeneral() {
      const c = this.cfg;
      return `
        <h3>General</h3>
        <label class="row">
          <span>Homepage</span>
          <input type="text" id="homepage" value="${esc(c.homepage)}" placeholder="Leave blank for Start page" />
        </label>
        <p class="muted">Shortcuts: <kbd>Ctrl+T</kbd> new tab · <kbd>Ctrl+Shift+P</kbd> private window · <kbd>Ctrl+L</kbd> focus URL · <kbd>F12</kbd> dev tools.</p>
      `;
    }

    _renderPrivacy() {
      const c = this.cfg;
      return `
        <h3>Privacy &amp; security</h3>
        <fieldset>
          <legend>Tracking protection</legend>
          ${['off', 'standard', 'strict', 'paranoid'].map((v) => `
            <label class="radio">
              <input type="radio" name="tp" value="${v}" ${c.trackingProtection === v ? 'checked' : ''} />
              <span class="radio-label">
                <strong>${v[0].toUpperCase() + v.slice(1)}</strong>
                <small>${this._tpHint(v)}</small>
              </span>
            </label>
          `).join('')}
        </fieldset>

        <label class="row"><span>Send Global Privacy Control (Sec-GPC)</span>
          <input type="checkbox" id="gpc" ${c.sendGPC ? 'checked' : ''} />
        </label>
        <label class="row"><span>Send Do Not Track (DNT)</span>
          <input type="checkbox" id="dnt" ${c.sendDNT ? 'checked' : ''} />
        </label>
        <label class="row"><span>Block third-party cookies</span>
          <input type="checkbox" id="tpc" ${c.blockThirdPartyCookies ? 'checked' : ''} />
        </label>

        <h4>DNS-over-HTTPS</h4>
        <label class="row"><span>DoH endpoint</span>
          <input type="text" id="doh" value="${esc(c.doh.serverURL)}" />
        </label>

        <h4>Clear data</h4>
        <div class="btn-row">
          <button id="clear-history">Clear history</button>
          <button id="clear-cookies">Clear cookies</button>
          <button id="clear-cache">Clear cache</button>
        </div>
      `;
    }

    _tpHint(level) {
      return {
        off: 'No blocking. Websites load as-is.',
        standard: 'Known trackers blocked on cross-site requests.',
        strict: 'Default. Known trackers + fingerprinters blocked; third-party cookies isolated.',
        paranoid: 'Strict + strip extra client-hint headers; break-prone, safest.'
      }[level];
    }

    _renderThemes() {
      const current = this.cfg.theme;
      return `
        <h3>Themes</h3>
        <p class="muted">10+ built-in themes, hand-picked and tested. Pick one, it applies instantly.</p>
        <div class="theme-grid">
          ${THEMES.map((t) => `
            <button class="theme-card ${current === t.id ? 'is-current' : ''}" data-theme="${t.id}">
              <div class="theme-swatch theme-swatch--${t.id}"></div>
              <div class="theme-meta">
                <strong>${esc(t.name)}</strong>
                <small>${esc(t.hint)}</small>
              </div>
            </button>
          `).join('')}
        </div>
      `;
    }

    _renderSearch() {
      const c = this.cfg;
      const choices = c.searchEngineChoices;
      return `
        <h3>Search engines</h3>
        <p class="muted">Choose where <em>Search or type a URL</em> sends non-URL queries.</p>
        <div class="engine-list">
          ${Object.entries(choices).map(([key, url]) => `
            <label class="engine">
              <input type="radio" name="engine" value="${esc(url)}" ${c.searchEngine === url ? 'checked' : ''} />
              <span><strong>${esc(key)}</strong><small>${esc(url)}</small></span>
            </label>
          `).join('')}
        </div>
      `;
    }

    _renderDownloads() {
      const c = this.cfg;
      return `
        <h3>Downloads</h3>
        <label class="row"><span>Always ask where to save</span>
          <input type="checkbox" id="ask-save" ${c.downloads.askWhereToSave ? 'checked' : ''} />
        </label>
        <label class="row"><span>Default folder</span>
          <input type="text" id="dl-dir" value="${esc(c.downloads.defaultDir)}" placeholder="System default" />
        </label>
      `;
    }

    _renderAdvanced() {
      const c = this.cfg;
      return `
        <h3>Advanced</h3>
        <label class="row"><span>Clear cache on exit</span>
          <input type="checkbox" id="clear-cache-exit" ${c.clearOnExit.cache ? 'checked' : ''} />
        </label>
        <label class="row"><span>Clear history on exit</span>
          <input type="checkbox" id="clear-history-exit" ${c.clearOnExit.history ? 'checked' : ''} />
        </label>
        <label class="row"><span>Clear cookies on exit</span>
          <input type="checkbox" id="clear-cookies-exit" ${c.clearOnExit.cookies ? 'checked' : ''} />
        </label>
        <p class="muted">Zip never collects telemetry. These toggles only affect your local data.</p>
      `;
    }

    _renderAbout() {
      return `
        <h3>About Zip Browser</h3>
        <p>Zip Browser is an open-source, privacy-focused desktop browser.</p>
        <p>This early build uses the Chromium runtime through Electron for fast
          iteration. The project also ships a reproducible <strong>Firefox fork</strong>
          roadmap under <code>firefox-fork/</code> for a long-term Gecko-based build.</p>
        <ul>
          <li>No telemetry, no account, no sync server.</li>
          <li>Tracking protection, HTTPS indicators, DNS-over-HTTPS, GPC.</li>
          <li>12 built-in themes, user-defined themes coming next.</li>
        </ul>
        <p class="muted">Licensed under MPL-2.0.</p>
      `;
    }

    _bind(tab) {
      const api = this.api;
      if (tab === 'general') {
        this.content.querySelector('#homepage').addEventListener('change', (e) => api.set({ homepage: e.target.value }));
      }
      if (tab === 'privacy') {
        this.content.querySelectorAll('input[name="tp"]').forEach((r) => r.addEventListener('change', (e) => api.set({ trackingProtection: e.target.value })));
        this.content.querySelector('#gpc').addEventListener('change', (e) => api.set({ sendGPC: e.target.checked }));
        this.content.querySelector('#dnt').addEventListener('change', (e) => api.set({ sendDNT: e.target.checked }));
        this.content.querySelector('#tpc').addEventListener('change', (e) => api.set({ blockThirdPartyCookies: e.target.checked }));
        this.content.querySelector('#doh').addEventListener('change', (e) => api.set({ doh: { serverURL: e.target.value } }));
        this.content.querySelector('#clear-history').addEventListener('click', () => this.onClearHistory());
      }
      if (tab === 'themes') {
        this.content.querySelectorAll('.theme-card').forEach((card) => {
          card.addEventListener('click', async () => {
            const id = card.dataset.theme;
            await api.setTheme(id);
            await this.onThemeChange(id);
            this.content.querySelectorAll('.theme-card').forEach((c) => c.classList.remove('is-current'));
            card.classList.add('is-current');
          });
        });
      }
      if (tab === 'search') {
        this.content.querySelectorAll('input[name="engine"]').forEach((r) => r.addEventListener('change', (e) => api.set({ searchEngine: e.target.value })));
      }
      if (tab === 'downloads') {
        this.content.querySelector('#ask-save').addEventListener('change', (e) => api.set({ downloads: { askWhereToSave: e.target.checked } }));
        this.content.querySelector('#dl-dir').addEventListener('change', (e) => api.set({ downloads: { defaultDir: e.target.value } }));
      }
      if (tab === 'extensions') {
        const extApi = window.zip.extensions;
        const list = this.content.querySelector('#ext-installed');
        const status = this.content.querySelector('#ext-status');
        const refresh = async () => {
          const items = await extApi.list();
          list.innerHTML = items.length ? items.map((it) => `
            <div class="ext-item">
              <div>
                <strong>${esc(it.name)}</strong> <small>v${esc(it.version)}</small>
                <br /><small>${esc(it.id)}</small>
              </div>
              <button class="danger" data-remove="${esc(it.id)}">Remove</button>
            </div>
          `).join('') : '<p class="muted">No extensions installed.</p>';
          list.querySelectorAll('[data-remove]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              await extApi.remove(btn.dataset.remove);
              refresh();
            });
          });
        };
        this.content.querySelector('#ext-install-ublock').addEventListener('click', async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          const prev = btn.textContent;
          btn.textContent = 'Installing…';
          status.hidden = false; status.className = 'welcome-status welcome-status--info';
          status.textContent = 'Fetching latest release from github.com/gorhill/uBlock…';
          try {
            const info = await extApi.install('ublock');
            status.className = 'welcome-status welcome-status--ok';
            status.textContent = `uBlock Origin ${info.version} installed.`;
          } catch (err) {
            status.className = 'welcome-status welcome-status--err';
            status.textContent = `Install failed: ${err.message || err}`;
          }
          btn.textContent = prev;
          btn.disabled = false;
          refresh();
        });
        refresh();
      }
      if (tab === 'advanced') {
        this.content.querySelector('#clear-cache-exit').addEventListener('change', (e) => api.set({ clearOnExit: { cache: e.target.checked } }));
        this.content.querySelector('#clear-history-exit').addEventListener('change', (e) => api.set({ clearOnExit: { history: e.target.checked } }));
        this.content.querySelector('#clear-cookies-exit').addEventListener('change', (e) => api.set({ clearOnExit: { cookies: e.target.checked } }));
      }
    }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.ZipSettingsPanel = ZipSettingsPanel;
})();
