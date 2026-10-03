// Zip Browser — downloads panel.

(function () {
  class ZipDownloadsPanel {
    constructor({ panel, list, badge, api }) {
      this.panel = panel;
      this.list = list;
      this.badge = badge;
      this.api = api;
      this.active = 0;
    }

    bindEvents() {
      this.api.onStarted((d) => { this._add(d); this._setBadge(this.active + 1); });
      this.api.onProgress((d) => this._update(d));
      this.api.onDone((d) => { this._update(d); if (d.state !== 'progressing') this._setBadge(Math.max(0, this.active - 1)); });
      this.list.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-id]');
        if (!btn) return;
        const id = btn.dataset.id;
        const act = btn.dataset.act;
        if (act === 'open') this.api.open(id);
        else if (act === 'reveal') this.api.reveal(id);
        else if (act === 'cancel') this.api.cancel(id);
      });
    }

    _setBadge(n) {
      this.active = n;
      if (n > 0) { this.badge.hidden = false; this.badge.textContent = String(n); }
      else { this.badge.hidden = true; }
    }

    toggle() { this.panel.hidden = !this.panel.hidden; if (!this.panel.hidden) this.refresh(); }
    open() { this.panel.hidden = false; this.refresh(); }

    async refresh() {
      const items = await this.api.list();
      this.list.innerHTML = '';
      for (const d of items) this._add(d, true);
    }

    _add(d, append) {
      let el = this.list.querySelector(`[data-id-row="${d.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'download';
        el.dataset.idRow = d.id;
        el.innerHTML = `
          <div class="download-top">
            <span class="download-name"></span>
            <span class="download-state"></span>
          </div>
          <div class="download-bar"><div class="download-bar-fill"></div></div>
          <div class="download-actions">
            <button data-id="${d.id}" data-act="open">Open</button>
            <button data-id="${d.id}" data-act="reveal">Reveal</button>
            <button data-id="${d.id}" data-act="cancel">Cancel</button>
          </div>
        `;
        if (append) this.list.appendChild(el);
        else this.list.prepend(el);
      }
      this._update(d, el);
    }

    _update(d, el) {
      el = el || this.list.querySelector(`[data-id-row="${d.id}"]`);
      if (!el) return;
      el.querySelector('.download-name').textContent = d.filename;
      el.querySelector('.download-state').textContent = this._stateText(d);
      const pct = d.totalBytes > 0 ? (d.receivedBytes / d.totalBytes) * 100 : 0;
      el.querySelector('.download-bar-fill').style.width = `${Math.min(100, pct).toFixed(1)}%`;
      el.classList.toggle('is-done', d.state === 'completed');
      el.classList.toggle('is-fail', d.state === 'cancelled' || d.state === 'interrupted');
    }

    _stateText(d) {
      if (d.state === 'completed') return 'Done';
      if (d.state === 'cancelled') return 'Cancelled';
      if (d.state === 'interrupted') return 'Interrupted';
      if (d.totalBytes <= 0) return `${this._fmt(d.receivedBytes)}`;
      return `${this._fmt(d.receivedBytes)} / ${this._fmt(d.totalBytes)}`;
    }

    _fmt(b) {
      if (b < 1024) return `${b} B`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
      if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
      return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    async clear() {
      await this.api.clear();
      this.refresh();
    }
  }

  window.ZipDownloadsPanel = ZipDownloadsPanel;
})();
