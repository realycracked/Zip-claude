// Zip Browser — settings store.
//
// Simple JSON-on-disk persistence. Writes are debounced and atomic so a
// crash can't corrupt the file. Private windows ignore history writes but
// still read theme/search-engine/bookmarks.

const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  theme: 'hacker',
  homepage: '',
  searchEngine: 'https://duckduckgo.com/?q={q}',
  searchEngineChoices: {
    duckduckgo: 'https://duckduckgo.com/?q={q}',
    brave: 'https://search.brave.com/search?q={q}',
    startpage: 'https://www.startpage.com/do/search?q={q}',
    searxng: 'https://searx.be/search?q={q}',
    kagi: 'https://kagi.com/search?q={q}',
    google: 'https://www.google.com/search?q={q}'
  },
  doh: {
    serverURL: 'https://mozilla.cloudflare-dns.com/dns-query',
    secureDnsMode: 'secure'
  },
  trackingProtection: 'strict', // 'off' | 'standard' | 'strict' | 'paranoid'
  sendDNT: true,
  sendGPC: true,
  blockThirdPartyCookies: true,
  clearOnExit: {
    history: false,
    cookies: false,
    cache: true,
    downloads: false
  },
  downloads: {
    defaultDir: '', // empty → OS default
    askWhereToSave: true
  },
  bookmarks: [],
  customThemes: [],
  welcomeShown: false
};

function deepMerge(target, patch) {
  if (!patch || typeof patch !== 'object') return target;
  for (const k of Object.keys(patch)) {
    const v = patch[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!target[k] || typeof target[k] !== 'object') target[k] = {};
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

class Settings {
  constructor(userDataDir) {
    this.file = path.join(userDataDir, 'settings.json');
    this.data = JSON.parse(JSON.stringify(DEFAULTS));
    this._writeTimer = null;
  }

  async load() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        deepMerge(this.data, raw);
      }
    } catch (_) {
      // Corrupt file → fall back to defaults, keeping the original aside.
      try { fs.renameSync(this.file, this.file + '.corrupt'); } catch (_) {}
    }
  }

  all() {
    return JSON.parse(JSON.stringify(this.data));
  }

  update(patch) {
    deepMerge(this.data, patch);
    this._scheduleWrite();
    return this.all();
  }

  theme() { return this.data.theme; }
  setTheme(name) { this.data.theme = String(name || 'hacker'); this._scheduleWrite(); return this.theme(); }
  homepage() { return this.data.homepage; }
  searchEngine() { return this.data.searchEngine; }
  doh() { return this.data.doh; }
  bookmarks() { return this.data.bookmarks.slice(); }

  addBookmark(bm) {
    if (!bm || !bm.url) return null;
    const entry = {
      id: bm.id || Math.random().toString(36).slice(2),
      url: bm.url,
      title: bm.title || bm.url,
      folder: bm.folder || null,
      createdAt: Date.now()
    };
    this.data.bookmarks.push(entry);
    this._scheduleWrite();
    return entry;
  }

  removeBookmark(id) {
    const before = this.data.bookmarks.length;
    this.data.bookmarks = this.data.bookmarks.filter((b) => b.id !== id);
    this._scheduleWrite();
    return before !== this.data.bookmarks.length;
  }

  _scheduleWrite() {
    if (this._writeTimer) clearTimeout(this._writeTimer);
    this._writeTimer = setTimeout(() => this._writeNow(), 150);
  }

  _writeNow() {
    const tmp = this.file + '.tmp';
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
      fs.renameSync(tmp, this.file);
    } catch (err) {
      // Best-effort; don't crash the browser if disk is full.
    }
  }
}

module.exports = { Settings, DEFAULTS };
