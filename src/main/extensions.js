// Zip Browser — extension installer.
//
// Downloads a Chromium-format extension (uBlock Origin for now) from an
// allow-listed GitHub release and loads it into the default session so the
// user has real ad/tracker blocking from first launch. We only accept
// downloads from github.com/gorhill/uBlock/releases to keep the trust
// chain narrow; new sources must be added here, not from the UI.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { session, app, net } = require('electron');

const KNOWN = {
  ublock: {
    name: 'uBlock Origin',
    releasesUrl: 'https://api.github.com/repos/gorhill/uBlock/releases/latest',
    assetPattern: /^uBlock0_.+\.chromium\.zip$/,
    allowedHost: 'github.com',
    allowedPrefix: '/gorhill/uBlock/releases/download/'
  }
};

function userExtensionsDir() {
  return path.join(app.getPath('userData'), 'extensions');
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, redirect: 'follow' });
    req.setHeader('Accept', 'application/vnd.github+json');
    req.setHeader('User-Agent', 'ZipBrowser');
    let body = '';
    req.on('response', (res) => {
      if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
      res.on('data', (chunk) => { body += chunk.toString('utf8'); });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function fetchBinary(url, destPath, allowedHost, allowedPrefix) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    if (u.hostname !== allowedHost && !u.hostname.endsWith('.githubusercontent.com')) {
      return reject(new Error(`Refusing to download from ${u.hostname} — not on the allow list`));
    }
    if (u.hostname === allowedHost && !u.pathname.startsWith(allowedPrefix)) {
      return reject(new Error(`Refusing GitHub URL whose path is not ${allowedPrefix}`));
    }
    const req = net.request({ url, redirect: 'follow' });
    req.setHeader('User-Agent', 'ZipBrowser');
    req.on('response', (res) => {
      if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode} downloading ${url}`));
      const out = fs.createWriteStream(destPath);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

// Minimal zip extractor: handles the "store" and "deflate" methods, enough
// for uBlock's release zips. Avoids pulling a dependency.
async function unzip(zipPath, destDir) {
  const zlib = require('zlib');
  const buf = fs.readFileSync(zipPath);
  // Find End of Central Directory record.
  const EOCD_MIN = 22;
  let eocd = -1;
  for (let i = buf.length - EOCD_MIN; i >= 0 && i > buf.length - 65557; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('EOCD not found — bad zip');
  const totalEntries = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);

  let p = cdOffset;
  const entries = [];
  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Bad CD signature');
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const uncompSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.slice(p + 46, p + 46 + nameLen).toString('utf8');
    entries.push({ name, method, compSize, uncompSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }

  for (const e of entries) {
    // Guard against zip-slip (../ in archive paths).
    if (e.name.includes('..') || path.isAbsolute(e.name)) {
      throw new Error(`Unsafe path in archive: ${e.name}`);
    }
    const outPath = path.join(destDir, e.name);
    if (e.name.endsWith('/')) {
      fs.mkdirSync(outPath, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    // Parse local header to find data start.
    let lp = e.localOffset;
    if (buf.readUInt32LE(lp) !== 0x04034b50) throw new Error('Bad local header');
    const lnameLen = buf.readUInt16LE(lp + 26);
    const lextraLen = buf.readUInt16LE(lp + 28);
    const dataStart = lp + 30 + lnameLen + lextraLen;
    const data = buf.slice(dataStart, dataStart + e.compSize);
    let out;
    if (e.method === 0) out = data;
    else if (e.method === 8) out = zlib.inflateRawSync(data);
    else throw new Error(`Unsupported compression method ${e.method} for ${e.name}`);
    fs.writeFileSync(outPath, out);
  }
}

async function installExtension(key) {
  const spec = KNOWN[key];
  if (!spec) throw new Error(`Unknown extension: ${key}`);

  const base = userExtensionsDir();
  fs.mkdirSync(base, { recursive: true });

  const meta = await fetchJson(spec.releasesUrl);
  const asset = (meta.assets || []).find((a) => spec.assetPattern.test(a.name));
  if (!asset) throw new Error(`No Chromium asset found on ${key}'s latest release`);

  const zipPath = path.join(base, asset.name);
  await fetchBinary(asset.browser_download_url, zipPath, spec.allowedHost, spec.allowedPrefix);

  const extractDir = path.join(base, key);
  // Fresh install: nuke any previous version so we don't mix files.
  if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
  fs.mkdirSync(extractDir, { recursive: true });

  await unzip(zipPath, extractDir);

  // uBlock's zip extracts into a top-level "uBlock0.chromium" folder;
  // find the manifest and load from there.
  const manifestDir = findManifestDir(extractDir);
  if (!manifestDir) throw new Error('No manifest.json found inside extracted archive');

  const ses = session.defaultSession;
  const loaded = await ses.loadExtension(manifestDir, { allowFileAccess: true });

  try { fs.unlinkSync(zipPath); } catch (_) {}

  return {
    id: loaded.id,
    name: loaded.name,
    version: loaded.version,
    path: manifestDir
  };
}

function findManifestDir(root) {
  // DFS, but shallow — extensions are at most one level deep.
  if (fs.existsSync(path.join(root, 'manifest.json'))) return root;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory()) {
      const sub = path.join(root, e.name);
      if (fs.existsSync(path.join(sub, 'manifest.json'))) return sub;
    }
  }
  return null;
}

async function listInstalled() {
  const ses = session.defaultSession;
  if (typeof ses.getAllExtensions !== 'function') return [];
  return ses.getAllExtensions().map((e) => ({ id: e.id, name: e.name, version: e.version, path: e.path }));
}

async function removeExtension(id) {
  const ses = session.defaultSession;
  try { ses.removeExtension(id); return true; } catch (_) { return false; }
}

// Reload any extensions previously installed into userData/extensions/ on
// each app start. Electron does not persist extensions across runs.
async function restorePersistedExtensions() {
  const base = userExtensionsDir();
  if (!fs.existsSync(base)) return [];
  const loaded = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(base, entry.name);
    const manifestDir = findManifestDir(dir);
    if (!manifestDir) continue;
    try {
      const ext = await session.defaultSession.loadExtension(manifestDir, { allowFileAccess: true });
      loaded.push({ id: ext.id, name: ext.name, version: ext.version });
    } catch (err) {
      // Not fatal — a corrupt extension shouldn't prevent the browser from starting.
    }
  }
  return loaded;
}

module.exports = { installExtension, listInstalled, removeExtension, restorePersistedExtensions, KNOWN };
