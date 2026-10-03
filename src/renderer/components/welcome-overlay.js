// Zip Browser — first-launch welcome overlay.
//
// Three steps: privacy level + uBlock Origin install, theme pick, search
// engine pick. The user can skip any step and close the overlay at any
// time; closing marks "welcomeShown" so it never appears again.

(function () {
  const THEMES = [
    'hacker', 'macos', 'gamer', 'ubuntu', 'arch', 'cyberpunk',
    'dracula', 'nord', 'gruvbox', 'firefox-classic', 'matrix', 'minimal'
  ];

  const ENGINES = [
    { id: 'duckduckgo', url: 'https://duckduckgo.com/?q={q}' },
    { id: 'brave',      url: 'https://search.brave.com/search?q={q}' },
    { id: 'startpage',  url: 'https://www.startpage.com/do/search?q={q}' },
    { id: 'searxng',    url: 'https://searx.be/search?q={q}' },
    { id: 'kagi',       url: 'https://kagi.com/search?q={q}' },
    { id: 'google',     url: 'https://www.google.com/search?q={q}' }
  ];

  class ZipWelcomeOverlay {
    constructor({ root, api, onThemeChange, onClose }) {
      this.root = root;
      this.api = api;
      this.onThemeChange = onThemeChange;
      this.onClose = onClose;
      this.step = 1;
      this.installing = false;
      this.render();
    }

    render() {
      this.root.hidden = false;
      this.root.innerHTML = `
        <div class="welcome">
          <aside class="welcome-side">
            <div class="welcome-logo">ZIP<span>://</span></div>
            <p class="welcome-tag">Fast. Reliable. Private by default.</p>
            <ol class="welcome-steps">
              <li class="${this.step >= 1 ? 'done' : ''}">Privacy &amp; blocking</li>
              <li class="${this.step >= 2 ? 'done' : ''}">Theme</li>
              <li class="${this.step >= 3 ? 'done' : ''}">Search engine</li>
            </ol>
            <button class="welcome-skip" id="welcome-skip">Skip &amp; start browsing</button>
          </aside>
          <main class="welcome-main" id="welcome-main"></main>
        </div>
      `;
      this.root.querySelector('#welcome-skip').addEventListener('click', () => this.close());
      this._renderStep();
    }

    _renderStep() {
      const main = this.root.querySelector('#welcome-main');
      if (this.step === 1) main.innerHTML = this._stepPrivacy();
      else if (this.step === 2) main.innerHTML = this._stepTheme();
      else if (this.step === 3) main.innerHTML = this._stepSearch();
      this._bind();
    }

    _stepPrivacy() {
      return `
        <h1>Welcome to Zip Browser</h1>
        <p class="lead">Zip blocks trackers out of the box. For the strongest ad &amp;
          tracker defence, you can install <strong>uBlock Origin</strong> —
          the gold-standard content blocker — right now.</p>

        <section class="welcome-card">
          <header>
            <div class="welcome-icon">◈</div>
            <div>
              <h2>uBlock Origin</h2>
              <p>Downloads the latest signed release from the official GitHub repository
                (<code>gorhill/uBlock</code>) and loads it as a browser extension.</p>
            </div>
          </header>
          <div class="welcome-card-body">
            <ul>
              <li>Blocks ads, trackers, malware domains and most annoyances.</li>
              <li>Runs locally — no account, no telemetry, open source (GPLv3).</li>
              <li>You can remove it anytime from Settings → Extensions.</li>
            </ul>
            <div class="welcome-card-actions">
              <button id="install-ublock" class="btn-primary">Install uBlock Origin</button>
              <button id="skip-ublock" class="btn-ghost">Skip</button>
            </div>
            <div class="welcome-status" id="ublock-status" hidden></div>
          </div>
        </section>

        <h3>Tracking protection level</h3>
        <div class="welcome-levels">
          ${['standard', 'strict', 'paranoid'].map((v) => `
            <label class="welcome-level">
              <input type="radio" name="tp" value="${v}" ${v === 'strict' ? 'checked' : ''} />
              <span>
                <strong>${v[0].toUpperCase() + v.slice(1)}</strong>
                <small>${this._tpHint(v)}</small>
              </span>
            </label>
          `).join('')}
        </div>

        <div class="welcome-nav">
          <div></div>
          <button class="btn-primary" id="to-step-2">Next →</button>
        </div>
      `;
    }

    _tpHint(v) {
      return {
        standard: 'Blocks known trackers.',
        strict: 'Default. Trackers + fingerprinters + partitioned cookies.',
        paranoid: 'Strict + referrer trimmed on every cross-origin request.'
      }[v];
    }

    _stepTheme() {
      return `
        <h1>Pick a theme</h1>
        <p class="lead">12 themes, hand-tuned. Click to preview — it applies instantly.</p>
        <div class="welcome-themes">
          ${THEMES.map((id) => `
            <button class="welcome-theme" data-theme="${id}">
              <span class="welcome-theme-swatch theme-swatch--${id}"></span>
              <span class="welcome-theme-name">${id}</span>
            </button>
          `).join('')}
        </div>
        <div class="welcome-nav">
          <button class="btn-ghost" id="to-step-1">← Back</button>
          <button class="btn-primary" id="to-step-3">Next →</button>
        </div>
      `;
    }

    _stepSearch() {
      return `
        <h1>Pick a search engine</h1>
        <p class="lead">Zip never sends your typed URL anywhere else — this is just
          what you get when you type a non-URL query.</p>
        <div class="welcome-engines">
          ${ENGINES.map((e, i) => `
            <label class="welcome-engine">
              <input type="radio" name="engine" value="${e.url}" ${i === 0 ? 'checked' : ''} />
              <span><strong>${e.id}</strong><small>${e.url}</small></span>
            </label>
          `).join('')}
        </div>
        <div class="welcome-nav">
          <button class="btn-ghost" id="to-step-2">← Back</button>
          <button class="btn-primary" id="finish">Finish &amp; start browsing</button>
        </div>
      `;
    }

    _bind() {
      const main = this.root.querySelector('#welcome-main');

      main.querySelectorAll('input[name="tp"]').forEach((r) =>
        r.addEventListener('change', (e) => this.api.settings.set({ trackingProtection: e.target.value })));

      const toStep = (n) => () => { this.step = n; this._renderStep(); };
      main.querySelector('#to-step-1')?.addEventListener('click', toStep(1));
      main.querySelector('#to-step-2')?.addEventListener('click', toStep(2));
      main.querySelector('#to-step-3')?.addEventListener('click', toStep(3));
      main.querySelector('#finish')?.addEventListener('click', () => this.close());

      const installBtn = main.querySelector('#install-ublock');
      installBtn?.addEventListener('click', () => this._installUblock(installBtn));
      main.querySelector('#skip-ublock')?.addEventListener('click', () => {
        this._status('Skipped. You can install it later from Settings → Extensions.', 'info');
      });

      main.querySelectorAll('.welcome-theme').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.theme;
          await this.api.settings.setTheme(id);
          await this.onThemeChange(id);
          main.querySelectorAll('.welcome-theme').forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });

      main.querySelectorAll('input[name="engine"]').forEach((r) =>
        r.addEventListener('change', (e) => this.api.settings.set({ searchEngine: e.target.value })));
    }

    async _installUblock(btn) {
      if (this.installing) return;
      this.installing = true;
      const prevText = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Installing…';
      this._status('Fetching the latest release from github.com/gorhill/uBlock…', 'info');
      try {
        const info = await this.api.extensions.install('ublock');
        this._status(`uBlock Origin ${info.version} installed. It's now active on every tab.`, 'ok');
        btn.textContent = 'Installed ✓';
      } catch (err) {
        this._status(`Install failed: ${err.message || err}. You can retry from Settings → Extensions.`, 'err');
        btn.textContent = prevText;
        btn.disabled = false;
      }
      this.installing = false;
    }

    _status(msg, kind) {
      const el = this.root.querySelector('#ublock-status');
      if (!el) return;
      el.hidden = false;
      el.className = `welcome-status welcome-status--${kind || 'info'}`;
      el.textContent = msg;
    }

    async close() {
      try { await this.api.welcome.complete(); } catch (_) {}
      this.root.hidden = true;
      this.root.innerHTML = '';
      if (this.onClose) this.onClose();
    }
  }

  window.ZipWelcomeOverlay = ZipWelcomeOverlay;
})();
