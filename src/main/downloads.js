// Zip Browser — downloads manager.
//
// Hooks into the default session's "will-download" event, tracks progress,
// writes to the user-chosen location, and exposes a simple list the renderer
// can show in the downloads panel.

const path = require('path');
const { shell, dialog, app } = require('electron');

class DownloadsManager {
  constructor(ses, settings) {
    this.settings = settings;
    this.items = []; // Newest first.
    ses.on('will-download', (_e, item, webContents) => this._track(item, webContents));
  }

  _track(item, webContents) {
    const id = Math.random().toString(36).slice(2);
    const filename = item.getFilename();
    const dir = this.settings.all().downloads.defaultDir || app.getPath('downloads');

    if (this.settings.all().downloads.askWhereToSave) {
      const chosen = dialog.showSaveDialogSync({
        title: 'Save file',
        defaultPath: path.join(dir, filename)
      });
      if (!chosen) {
        item.cancel();
        return;
      }
      item.setSavePath(chosen);
    } else {
      item.setSavePath(path.join(dir, filename));
    }

    const entry = {
      id,
      filename,
      url: item.getURL(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: 0,
      state: 'progressing',
      savePath: item.getSavePath(),
      startedAt: Date.now(),
      _item: item
    };
    this.items.unshift(entry);
    this._broadcast(webContents, 'downloads:started', this._public(entry));

    item.on('updated', (_e, state) => {
      entry.state = state;
      entry.receivedBytes = item.getReceivedBytes();
      this._broadcast(webContents, 'downloads:progress', this._public(entry));
    });
    item.once('done', (_e, state) => {
      entry.state = state;
      entry.receivedBytes = item.getReceivedBytes();
      entry._item = null;
      this._broadcast(webContents, 'downloads:done', this._public(entry));
    });
  }

  _public(e) {
    return {
      id: e.id,
      filename: e.filename,
      url: e.url,
      totalBytes: e.totalBytes,
      receivedBytes: e.receivedBytes,
      state: e.state,
      savePath: e.savePath,
      startedAt: e.startedAt
    };
  }

  _broadcast(webContents, channel, payload) {
    if (webContents && !webContents.isDestroyed()) {
      // Also notify the hosting BrowserWindow so the chrome can update.
      const win = webContents.hostWebContents || webContents;
      try { win.send(channel, payload); } catch (_) {}
    }
    const { BrowserWindow } = require('electron');
    for (const w of BrowserWindow.getAllWindows()) {
      try { w.webContents.send(channel, payload); } catch (_) {}
    }
  }

  list() { return this.items.map((e) => this._public(e)); }

  openItem(id) {
    const e = this.items.find((x) => x.id === id);
    if (!e || e.state !== 'completed') return false;
    shell.openPath(e.savePath);
    return true;
  }

  revealItem(id) {
    const e = this.items.find((x) => x.id === id);
    if (!e) return false;
    shell.showItemInFolder(e.savePath);
    return true;
  }

  cancel(id) {
    const e = this.items.find((x) => x.id === id);
    if (e && e._item) { e._item.cancel(); return true; }
    return false;
  }

  clear() { this.items = this.items.filter((e) => e.state === 'progressing'); }
}

module.exports = { DownloadsManager };
