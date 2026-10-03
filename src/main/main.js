// Zip Browser — Electron main process.
// Boots the application, creates windows, and wires up IPC bridges that the
// renderer uses to control tabs, downloads, settings, and privacy features.

const { app, BrowserWindow, ipcMain, session, dialog, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');

const { WindowManager } = require('./windowManager');
const { installPrivacyDefaults, loadTrackingLists } = require('./privacy');
const { Settings } = require('./settings');
const { DownloadsManager } = require('./downloads');
const { installExtension, listInstalled, removeExtension, restorePersistedExtensions, KNOWN: KNOWN_EXTENSIONS } = require('./extensions');

// Harden the GPU / renderer process a little by default. Users who need
// legacy flags can toggle them from settings later.
app.commandLine.appendSwitch('enable-features', 'StrictOriginIsolation,PartitionedCookies');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors,SharedArrayBuffer');

// Use a dedicated userData dir so multiple installs do not stomp on each other.
app.setPath('userData', path.join(app.getPath('appData'), 'ZipBrowser'));

let windowManager = null;
let settings = null;
let downloads = null;

async function bootstrap() {
  settings = new Settings(app.getPath('userData'));
  await settings.load();

  // Load bundled tracking filter lists. These ship with the app so the
  // browser can block trackers on first launch without a network round-trip.
  const lists = await loadTrackingLists();

  const defaultSession = session.defaultSession;
  installPrivacyDefaults(defaultSession, { lists, settings });

  downloads = new DownloadsManager(defaultSession, settings);

  // Reload any extensions the user installed on a previous run.
  await restorePersistedExtensions();

  windowManager = new WindowManager({ settings, lists, downloads });

  // On first ever launch, show the welcome overlay so the user can opt
  // into uBlock Origin, pick a theme and set a search engine before
  // browsing. The shell renderer reads this flag off its window query.
  const showWelcome = !settings.all().welcomeShown;
  await windowManager.createNormalWindow({ showWelcome });

  registerIpc();
}

function registerIpc() {
  ipcMain.handle('tabs:create', (_e, winId, opts) => windowManager.createTab(winId, opts));
  ipcMain.handle('tabs:close', (_e, winId, tabId) => windowManager.closeTab(winId, tabId));
  ipcMain.handle('tabs:activate', (_e, winId, tabId) => windowManager.activateTab(winId, tabId));
  ipcMain.handle('tabs:navigate', (_e, winId, tabId, url) => windowManager.navigate(winId, tabId, url));
  ipcMain.handle('tabs:back', (_e, winId, tabId) => windowManager.goBack(winId, tabId));
  ipcMain.handle('tabs:forward', (_e, winId, tabId) => windowManager.goForward(winId, tabId));
  ipcMain.handle('tabs:reload', (_e, winId, tabId, hard) => windowManager.reload(winId, tabId, hard));
  ipcMain.handle('tabs:stop', (_e, winId, tabId) => windowManager.stop(winId, tabId));
  ipcMain.handle('tabs:devtools', (_e, winId, tabId) => windowManager.toggleDevTools(winId, tabId));

  ipcMain.handle('window:new', (_e, opts) => windowManager.createNormalWindow(opts));
  ipcMain.handle('window:new-private', () => windowManager.createPrivateWindow());

  ipcMain.handle('settings:get', () => settings.all());
  ipcMain.handle('settings:set', (_e, patch) => settings.update(patch));
  ipcMain.handle('settings:theme', (_e, name) => settings.setTheme(name));

  ipcMain.handle('downloads:list', () => downloads.list());
  ipcMain.handle('downloads:open', (_e, id) => downloads.openItem(id));
  ipcMain.handle('downloads:reveal', (_e, id) => downloads.revealItem(id));
  ipcMain.handle('downloads:cancel', (_e, id) => downloads.cancel(id));
  ipcMain.handle('downloads:clear', () => downloads.clear());

  ipcMain.handle('privacy:report', (_e, winId, tabId) => windowManager.privacyReport(winId, tabId));
  ipcMain.handle('privacy:toggle', (_e, winId, tabId, enabled) => windowManager.setTrackingProtection(winId, tabId, enabled));

  ipcMain.handle('history:search', (_e, q) => windowManager.searchHistory(q));
  ipcMain.handle('history:clear', () => windowManager.clearHistory());

  ipcMain.handle('bookmarks:list', () => settings.bookmarks());
  ipcMain.handle('bookmarks:add', (_e, bm) => settings.addBookmark(bm));
  ipcMain.handle('bookmarks:remove', (_e, id) => settings.removeBookmark(id));

  ipcMain.handle('extensions:catalog', () => Object.entries(KNOWN_EXTENSIONS).map(([k, v]) => ({ key: k, name: v.name })));
  ipcMain.handle('extensions:install', (_e, key) => installExtension(key));
  ipcMain.handle('extensions:list', () => listInstalled());
  ipcMain.handle('extensions:remove', (_e, id) => removeExtension(id));

  ipcMain.handle('welcome:complete', () => settings.update({ welcomeShown: true }));

  ipcMain.handle('app:open-external', (_e, url) => {
    // Only open http/https externally; avoid shell-exec via file:// or other schemes.
    try {
      const u = new URL(url);
      if (u.protocol === 'http:' || u.protocol === 'https:') return shell.openExternal(url);
    } catch (_) {}
    return false;
  });

  nativeTheme.on('updated', () => {
    windowManager.broadcast('theme:system-change', { dark: nativeTheme.shouldUseDarkColors });
  });
}

app.whenReady().then(bootstrap).catch((err) => {
  dialog.showErrorBox('Zip Browser failed to start', String(err && err.stack || err));
  app.exit(1);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0 && windowManager) {
    await windowManager.createNormalWindow();
  }
});

// Keep this process safe from navigation redirection attacks.
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (event, url) => {
    // The shell page itself should never navigate — tabs live inside WebContentsView.
    if (contents.getType() === 'window' || contents.getURL().startsWith('file://')) {
      event.preventDefault();
    }
    void url;
  });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
