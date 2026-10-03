// Zip Browser — preload bridge.
// Exposes a safe, narrow API to the renderer so it can call into the main
// process without ever touching Node directly.

const { contextBridge, ipcRenderer } = require('electron');

const params = new URLSearchParams(window.location.search);
const winId = params.get('winId');
const privateMode = params.get('privateMode') === 'true';
const partition = params.get('partition');
const initialTheme = params.get('theme');

contextBridge.exposeInMainWorld('zip', {
  winId,
  privateMode,
  partition,
  initialTheme,

  tabs: {
    create: (opts) => ipcRenderer.invoke('tabs:create', winId, opts || {}),
    close: (tabId) => ipcRenderer.invoke('tabs:close', winId, tabId),
    activate: (tabId) => ipcRenderer.invoke('tabs:activate', winId, tabId),
    navigate: (tabId, url) => ipcRenderer.invoke('tabs:navigate', winId, tabId, url),
    back: (tabId) => ipcRenderer.invoke('tabs:back', winId, tabId),
    forward: (tabId) => ipcRenderer.invoke('tabs:forward', winId, tabId),
    reload: (tabId, hard = false) => ipcRenderer.invoke('tabs:reload', winId, tabId, !!hard),
    stop: (tabId) => ipcRenderer.invoke('tabs:stop', winId, tabId),
    devtools: (tabId) => ipcRenderer.invoke('tabs:devtools', winId, tabId),
    onUpdate: (fn) => ipcRenderer.on('tabs:update', (_e, p) => fn(p)),
    onRemoved: (fn) => ipcRenderer.on('tabs:removed', (_e, p) => fn(p))
  },

  window: {
    newWindow: () => ipcRenderer.invoke('window:new'),
    newPrivate: () => ipcRenderer.invoke('window:new-private')
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (patch) => ipcRenderer.invoke('settings:set', patch),
    setTheme: (name) => ipcRenderer.invoke('settings:theme', name)
  },

  downloads: {
    list: () => ipcRenderer.invoke('downloads:list'),
    open: (id) => ipcRenderer.invoke('downloads:open', id),
    reveal: (id) => ipcRenderer.invoke('downloads:reveal', id),
    cancel: (id) => ipcRenderer.invoke('downloads:cancel', id),
    clear: () => ipcRenderer.invoke('downloads:clear'),
    onStarted: (fn) => ipcRenderer.on('downloads:started', (_e, p) => fn(p)),
    onProgress: (fn) => ipcRenderer.on('downloads:progress', (_e, p) => fn(p)),
    onDone: (fn) => ipcRenderer.on('downloads:done', (_e, p) => fn(p))
  },

  privacy: {
    report: (tabId) => ipcRenderer.invoke('privacy:report', winId, tabId),
    toggle: (tabId, enabled) => ipcRenderer.invoke('privacy:toggle', winId, tabId, enabled)
  },

  history: {
    search: (q) => ipcRenderer.invoke('history:search', q),
    clear: () => ipcRenderer.invoke('history:clear')
  },

  bookmarks: {
    list: () => ipcRenderer.invoke('bookmarks:list'),
    add: (bm) => ipcRenderer.invoke('bookmarks:add', bm),
    remove: (id) => ipcRenderer.invoke('bookmarks:remove', id)
  },

  app: {
    openExternal: (url) => ipcRenderer.invoke('app:open-external', url)
  },

  system: {
    onThemeChange: (fn) => ipcRenderer.on('theme:system-change', (_e, p) => fn(p))
  }
});
