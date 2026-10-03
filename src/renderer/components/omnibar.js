// Zip Browser — omnibar (unified URL + search bar).

(function () {
  class ZipOmnibar {
    constructor({ input, lock, security, blockedCounter, shield, bookmark, onNavigate, onToggleShield, onBookmark, onSiteInfo }) {
      this.input = input;
      this.lock = lock;
      this.security = security;
      this.blockedCounter = blockedCounter;
      this.shield = shield;
      this.bookmark = bookmark;
      this.onNavigate = onNavigate;
      this.state = { shieldOn: true };
      this._lastUrl = '';
      this._focused = false;

      input.addEventListener('focus', () => { this._focused = true; input.select(); });
      input.addEventListener('blur', () => { this._focused = false; this.setUrl(this._lastUrl); });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim();
          if (val) onNavigate(val);
        } else if (e.key === 'Escape') {
          this.setUrl(this._lastUrl);
          input.blur();
        }
      });

      security.addEventListener('click', (e) => { e.stopPropagation(); onSiteInfo(); });
      shield.addEventListener('click', (e) => { e.stopPropagation(); onToggleShield(); });
      bookmark.addEventListener('click', (e) => { e.stopPropagation(); onBookmark(); });
    }

    getUrl() { return this._lastUrl; }

    setUrl(url) {
      this._lastUrl = url || '';
      if (this._focused) return;
      this.input.value = this._prettyUrl(url || '');
    }

    _prettyUrl(url) {
      if (!url) return '';
      try {
        const u = new URL(url);
        if (u.protocol === 'file:') return url;
        // Hide the "https://" prefix like modern browsers, but keep http: and others visible.
        if (u.protocol === 'https:') return url.replace(/^https:\/\//, '');
        return url;
      } catch (_) { return url; }
    }

    setSecure(secure, certError) {
      this.lock.textContent = certError ? '⚠' : (secure ? '🔒' : '⚠');
      this.security.classList.toggle('is-secure', !!secure && !certError);
      this.security.classList.toggle('is-insecure', !secure || !!certError);
    }

    setShield(on) {
      this.state.shieldOn = !!on;
      this.shield.classList.toggle('is-off', !on);
    }

    setBlocked(count) {
      if (!count) { this.blockedCounter.hidden = true; return; }
      this.blockedCounter.hidden = false;
      this.blockedCounter.textContent = count > 999 ? '999+' : String(count);
    }
  }

  window.ZipOmnibar = ZipOmnibar;
})();
