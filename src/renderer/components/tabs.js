// Zip Browser — tab strip component.

(function () {
  class ZipTabStrip {
    constructor({ container, onActivate, onClose }) {
      this.container = container;
      this.onActivate = onActivate;
      this.onClose = onClose;
      this.tabs = new Map(); // tabId -> { tab, el }
      this.activeId = null;
    }

    upsert(tab) {
      let entry = this.tabs.get(tab.id);
      if (!entry) {
        const el = this._render(tab);
        this.container.appendChild(el);
        entry = { tab, el };
        this.tabs.set(tab.id, entry);
      } else {
        entry.tab = tab;
        this._update(entry.el, tab);
      }
      if (tab.active) {
        this.activeId = tab.id;
        for (const [id, e] of this.tabs) {
          e.el.classList.toggle('is-active', id === tab.id);
        }
      }
    }

    remove(id) {
      const e = this.tabs.get(id);
      if (!e) return;
      e.el.remove();
      this.tabs.delete(id);
      if (this.activeId === id) this.activeId = null;
    }

    getActive() { return this.activeId; }
    getActiveTitle() {
      const e = this.tabs.get(this.activeId);
      return e ? e.tab.title : '';
    }

    _render(tab) {
      const el = document.createElement('div');
      el.className = 'tab';
      el.dataset.id = tab.id;
      el.setAttribute('role', 'tab');
      el.innerHTML = `
        <span class="tab-fav" aria-hidden="true"></span>
        <span class="tab-title"></span>
        <button class="tab-close" aria-label="Close tab" title="Close tab">×</button>
      `;
      el.addEventListener('mousedown', (e) => {
        if (e.button === 1) { e.preventDefault(); this.onClose(tab.id); }
      });
      el.addEventListener('click', (e) => {
        if (e.target.closest('.tab-close')) { this.onClose(tab.id); return; }
        this.onActivate(tab.id);
      });
      this._update(el, tab);
      return el;
    }

    _update(el, tab) {
      el.querySelector('.tab-title').textContent = tab.title || 'New Tab';
      const fav = el.querySelector('.tab-fav');
      if (tab.loading) {
        fav.classList.add('is-loading');
        fav.style.backgroundImage = '';
      } else {
        fav.classList.remove('is-loading');
        fav.style.backgroundImage = tab.favicon ? `url(${JSON.stringify(tab.favicon)})` : '';
      }
      el.title = tab.title ? `${tab.title}\n${tab.url}` : tab.url || '';
    }
  }

  window.ZipTabStrip = ZipTabStrip;
})();
