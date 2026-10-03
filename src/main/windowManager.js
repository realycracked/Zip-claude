// Zip Browser — window + tab manager.
// Uses Electron's modern WebContentsView API: each tab is one view, and we
// position/resize them so they fill the viewport below the custom chrome.
//
// A "window" here is the shell BrowserWindow that renders the custom chrome
// (tab strip, omnibar, side panels). Tabs are not nested BrowserWindows.

const { BrowserWindow, WebContentsView, session, nativeImage, screen } = require('electron');
const path = require('path');
const crypto = require('crypto');

const { installPrivacyDefaults } = require('./privacy');
const { createPartitionName } = require('./session');

const CHROME_HEIGHT = 88; // Height of custom chrome; must match CSS.
const SHELL_HTML = path.join(__dirname, '..', 'renderer', 'index.html');
const PRELOAD = path.join(__dirname, '..', 'preload', 'preload.js');
const START_PAGE = `file://${path.join(__dirname, '..', 'renderer', 'start.html')}`;

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

class ZipWindow {
  constructor({ id, win, privateMode, partition }) {
    this.id = id;
    this.win = win;
    this.privateMode = privateMode;
    this.partition = partition;
    this.tabs = new Map(); // tabId -> { id, view, title, url, favicon, loading }
    this.activeTabId = null;
    this.chromeHeight = CHROME_HEIGHT;
  }
}

class WindowManager {
  constructor({ settings, lists, downloads }) {
    this.settings = settings;
    this.lists = lists;
    this.downloads = downloads;
    this.windows = new Map();
    this.history = []; // In-memory history for non-private windows.
    this.maxHistory = 5000;
  }

  async createNormalWindow(opts = {}) {
    return this._createWindow({ privateMode: false, showWelcome: !!opts.showWelcome });
  }

  async createPrivateWindow() {
    return this._createWindow({ privateMode: true });
  }

  async _createWindow({ privateMode, showWelcome = false }) {
    const id = newId();
    const partition = privateMode
      ? createPartitionName({ ephemeral: true })
      : createPartitionName({ ephemeral: false });

    const display = screen.getPrimaryDisplay();
    const win = new BrowserWindow({
      width: Math.min(1440, display.workAreaSize.width - 80),
      height: Math.min(900, display.workAreaSize.height - 80),
      minWidth: 640,
      minHeight: 420,
      backgroundColor: privateMode ? '#120a1e' : '#111317',
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
      titleBarOverlay: process.platform !== 'darwin'
        ? { color: '#00000000', symbolColor: '#e6e6e6', height: 44 }
        : undefined,
      autoHideMenuBar: true,
      show: false,
      icon: path.join(__dirname, '..', '..', 'assets', 'icons', 'zip.png'),
      webPreferences: {
        preload: PRELOAD,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: true
      }
    });

    const zw = new ZipWindow({ id, win, privateMode, partition });
    this.windows.set(id, zw);

    win.on('closed', () => {
      for (const t of zw.tabs.values()) {
        try { t.view.webContents.close(); } catch (_) {}
      }
      this.windows.delete(id);
    });

    win.on('resize', () => this._layoutActiveTab(zw));
    win.on('maximize', () => this._layoutActiveTab(zw));
    win.on('unmaximize', () => this._layoutActiveTab(zw));
    win.on('enter-full-screen', () => this._layoutActiveTab(zw));
    win.on('leave-full-screen', () => this._layoutActiveTab(zw));

    await win.loadFile(SHELL_HTML, {
      query: {
        winId: id,
        privateMode: String(privateMode),
        theme: this.settings.theme(),
        partition,
        welcome: String(showWelcome)
      }
    });

    win.show();

    // Open a first tab by default.
    const firstUrl = this.settings.homepage() || START_PAGE;
    await this.createTab(id, { url: firstUrl });

    return id;
  }

  broadcast(channel, payload) {
    for (const zw of this.windows.values()) {
      zw.win.webContents.send(channel, payload);
    }
  }

  _getWindow(winId) {
    const zw = this.windows.get(winId);
    if (!zw) throw new Error(`Unknown window ${winId}`);
    return zw;
  }

  async createTab(winId, opts = {}) {
    const zw = this._getWindow(winId);
    const tabId = newId();
    const ses = session.fromPartition(zw.partition, { cache: !zw.privateMode });

    // Make sure every brand-new session partition has privacy defaults applied.
    installPrivacyDefaults(ses, {
      lists: this.lists,
      settings: this.settings,
      privateMode: zw.privateMode
    });

    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webviewTag: false,
        spellcheck: true,
        safeDialogs: true,
        enableBlinkFeatures: '',
        disableBlinkFeatures: 'AuxclickFeature'
      }
    });

    zw.win.contentView.addChildView(view);

    const tab = {
      id: tabId,
      view,
      title: 'New Tab',
      url: opts.url || START_PAGE,
      favicon: null,
      loading: false,
      canGoBack: false,
      canGoForward: false,
      secure: false,
      certError: null,
      blocked: 0
    };
    zw.tabs.set(tabId, tab);

    const wc = view.webContents;
    const sendUpdate = () => this._emitTab(zw, tab);

    wc.on('page-title-updated', (_e, title) => { tab.title = title; sendUpdate(); });
    wc.on('page-favicon-updated', (_e, favicons) => {
      tab.favicon = favicons && favicons[0] ? favicons[0] : null;
      sendUpdate();
    });
    wc.on('did-start-loading', () => { tab.loading = true; sendUpdate(); });
    wc.on('did-stop-loading', () => { tab.loading = false; sendUpdate(); });
    wc.on('did-start-navigation', (_e, url, _isInPlace, isMainFrame) => {
      if (!isMainFrame) return;
      tab.url = url;
      tab.secure = url.startsWith('https://');
      tab.certError = null;
      sendUpdate();
    });
    wc.on('did-navigate', (_e, url) => {
      tab.url = url;
      tab.canGoBack = wc.navigationHistory.canGoBack();
      tab.canGoForward = wc.navigationHistory.canGoForward();
      sendUpdate();
      if (!zw.privateMode) this._recordHistory({ url, title: tab.title, at: Date.now() });
    });
    wc.on('certificate-error', (event, _url, error, _cert, callback) => {
      // Never silently trust bad certs. Deny by default; surface the error so
      // the chrome can show a full-screen warning page.
      event.preventDefault();
      callback(false);
      tab.certError = error;
      sendUpdate();
    });
    wc.setWindowOpenHandler(({ url, disposition }) => {
      if (disposition === 'new-window' || disposition === 'foreground-tab' || disposition === 'background-tab') {
        this.createTab(winId, { url });
        return { action: 'deny' };
      }
      return { action: 'deny' };
    });

    // Report blocked-tracker counts to the renderer. The privacy engine
    // calls every function registered under `ses._zipBlockedCounters`
    // whenever a request is blocked.
    tab._blockedListener = (count) => { tab.blocked = count; sendUpdate(); };
    if (!ses._zipBlockedCounters) ses._zipBlockedCounters = new Set();
    ses._zipBlockedCounters.add(tab._blockedListener);

    await wc.loadURL(tab.url);
    this.activateTab(winId, tabId);
    return tabId;
  }

  _emitTab(zw, tab) {
    zw.win.webContents.send('tabs:update', {
      winId: zw.id,
      tab: {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favicon: tab.favicon,
        loading: tab.loading,
        canGoBack: tab.canGoBack,
        canGoForward: tab.canGoForward,
        secure: tab.secure,
        certError: tab.certError,
        blocked: tab.blocked,
        active: tab.id === zw.activeTabId
      }
    });
  }

  activateTab(winId, tabId) {
    const zw = this._getWindow(winId);
    const tab = zw.tabs.get(tabId);
    if (!tab) return false;
    zw.activeTabId = tabId;
    for (const t of zw.tabs.values()) {
      t.view.setVisible && t.view.setVisible(t.id === tabId);
    }
    this._layoutActiveTab(zw);
    for (const t of zw.tabs.values()) this._emitTab(zw, t);
    return true;
  }

  _layoutActiveTab(zw) {
    const tab = zw.tabs.get(zw.activeTabId);
    if (!tab) return;
    const [w, h] = zw.win.getContentSize();
    tab.view.setBounds({ x: 0, y: zw.chromeHeight, width: w, height: Math.max(0, h - zw.chromeHeight) });
  }

  closeTab(winId, tabId) {
    const zw = this._getWindow(winId);
    const tab = zw.tabs.get(tabId);
    if (!tab) return false;
    try { zw.win.contentView.removeChildView(tab.view); } catch (_) {}
    try { tab.view.webContents.close(); } catch (_) {}
    zw.tabs.delete(tabId);
    if (zw.activeTabId === tabId) {
      const next = zw.tabs.keys().next().value;
      if (next) this.activateTab(winId, next);
      else zw.win.close();
    }
    zw.win.webContents.send('tabs:removed', { winId, tabId });
    return true;
  }

  navigate(winId, tabId, input) {
    const zw = this._getWindow(winId);
    const tab = zw.tabs.get(tabId);
    if (!tab) return false;
    const trimmed = String(input || '').trim().toLowerCase();
    // Firefox-style internal pages. These are routed to the chrome, not to
    // the tab's webContents, because they need privileged IPC access.
    if (trimmed === 'about:welcome' || trimmed === 'about:zip') {
      zw.win.webContents.send('internal:open', { page: 'welcome' });
      return true;
    }
    if (trimmed === 'about:settings' || trimmed === 'about:preferences') {
      zw.win.webContents.send('internal:open', { page: 'settings' });
      return true;
    }
    const url = this._resolveInput(input);
    tab.view.webContents.loadURL(url);
    return true;
  }

  _resolveInput(input) {
    const trimmed = String(input || '').trim();
    if (!trimmed) return START_PAGE;
    if (/^(https?|file|about|chrome|zip):/i.test(trimmed)) return trimmed;
    // Looks like a bare host or IP (contains a dot, no spaces)?
    if (/^[^\s]+\.[^\s]{2,}$/.test(trimmed) && !trimmed.includes(' ')) {
      return `https://${trimmed}`;
    }
    const engine = this.settings.searchEngine();
    const q = encodeURIComponent(trimmed);
    return engine.replace('{q}', q);
  }

  goBack(winId, tabId) {
    const t = this._getWindow(winId).tabs.get(tabId);
    if (t && t.view.webContents.navigationHistory.canGoBack()) t.view.webContents.navigationHistory.goBack();
  }

  goForward(winId, tabId) {
    const t = this._getWindow(winId).tabs.get(tabId);
    if (t && t.view.webContents.navigationHistory.canGoForward()) t.view.webContents.navigationHistory.goForward();
  }

  reload(winId, tabId, hard) {
    const t = this._getWindow(winId).tabs.get(tabId);
    if (!t) return;
    if (hard) t.view.webContents.reloadIgnoringCache();
    else t.view.webContents.reload();
  }

  stop(winId, tabId) {
    const t = this._getWindow(winId).tabs.get(tabId);
    if (t) t.view.webContents.stop();
  }

  toggleDevTools(winId, tabId) {
    const t = this._getWindow(winId).tabs.get(tabId);
    if (!t) return;
    const wc = t.view.webContents;
    if (wc.isDevToolsOpened()) wc.closeDevTools();
    else wc.openDevTools({ mode: 'right', activate: true });
  }

  privacyReport(winId, tabId) {
    const t = this._getWindow(winId).tabs.get(tabId);
    if (!t) return null;
    return {
      url: t.url,
      secure: t.secure,
      certError: t.certError,
      blocked: t.blocked
    };
  }

  setTrackingProtection(winId, tabId, enabled) {
    const t = this._getWindow(winId).tabs.get(tabId);
    if (!t) return false;
    t.view.webContents.session.setPreloads([]);
    t.view.webContents.session._zipTrackingProtection = !!enabled;
    return true;
  }

  _recordHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) this.history.length = this.maxHistory;
  }

  searchHistory(q) {
    if (!q) return this.history.slice(0, 50);
    const needle = String(q).toLowerCase();
    return this.history
      .filter((h) => (h.url + ' ' + (h.title || '')).toLowerCase().includes(needle))
      .slice(0, 50);
  }

  clearHistory() {
    this.history.length = 0;
  }
}

module.exports = { WindowManager, CHROME_HEIGHT };
