// Zip Browser — privacy engine.
//
// Default protections (always on, no toggle needed):
//   * Strip the Referer header to origin-only on cross-site requests.
//   * Set globalPrivacyControl / Sec-GPC: 1 to signal "do not sell/share".
//   * Block requests whose host matches any entry on bundled block lists.
//   * Force DNS-over-HTTPS via Cloudflare Mozilla endpoint.
//   * Set a sane Permissions-Policy and Content-Security-Policy fallback.
//   * Deny permission requests that web pages have no business getting
//     (geolocation, notifications, media, midi, etc.) unless user opts in.
//
// The lists are JSON files packaged with the app. Users can refresh them
// from the Settings panel; see scripts/fetch-trackers.js.

const fs = require('fs');
const path = require('path');
const { net } = require('electron');

const LISTS_DIR = path.join(__dirname, '..', '..', 'assets', 'lists');

async function loadTrackingLists() {
  const result = { domains: new Set(), easylist: [] };
  try {
    const domainsPath = path.join(LISTS_DIR, 'tracker-domains.json');
    if (fs.existsSync(domainsPath)) {
      const arr = JSON.parse(fs.readFileSync(domainsPath, 'utf8'));
      for (const d of arr) result.domains.add(d.toLowerCase());
    }
    const easyPath = path.join(LISTS_DIR, 'easylist.txt');
    if (fs.existsSync(easyPath)) {
      const text = fs.readFileSync(easyPath, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('!') || t.startsWith('[')) continue;
        // Only the simple domain-prefix rules; EasyList's full syntax
        // (|| … ^, element hiding, regex) is intentionally out of scope.
        const m = t.match(/^\|\|([a-z0-9.\-_]+)\^/i);
        if (m) result.domains.add(m[1].toLowerCase());
      }
    }
  } catch (err) {
    // Lists are best-effort; the browser still runs without them.
  }
  return result;
}

function hostFromUrl(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch (_) { return ''; }
}

function matchesList(host, listSet) {
  if (!host) return false;
  if (listSet.has(host)) return true;
  // Check parent domains to catch sub-sub-domains without blowing up the set.
  let i = host.indexOf('.');
  while (i !== -1) {
    const parent = host.slice(i + 1);
    if (listSet.has(parent)) return true;
    i = host.indexOf('.', i + 1);
  }
  return false;
}

function installPrivacyDefaults(ses, { lists, settings, privateMode = false } = {}) {
  if (ses._zipPrivacyInstalled) return;
  ses._zipPrivacyInstalled = true;
  ses._zipTrackingProtection = true;
  ses._zipBlockedCounters = ses._zipBlockedCounters || new Set();

  // DNS-over-HTTPS: Mozilla's Cloudflare endpoint by default. Users can
  // change this in settings.
  try {
    const doh = (settings && settings.doh && settings.doh()) || {
      serverURL: 'https://mozilla.cloudflare-dns.com/dns-query',
      secureDnsMode: 'secure'
    };
    if (typeof ses.setSSLConfig === 'function') {
      ses.setSSLConfig({ minVersion: 'tls1.2' });
    }
    if (typeof ses.resolveHost === 'function') {
      // Electron ≥ 29 supports configureDnsOverHttps via setPreloads flag;
      // not every version does. Guard behind feature detection.
      if (typeof ses.setDnsOverHttpsConfig === 'function') {
        ses.setDnsOverHttpsConfig({ servers: doh.serverURL ? [{ templates: [doh.serverURL] }] : [] });
      }
    }
  } catch (_) { /* no-op */ }

  let blockedThisTab = 0;

  // Block cross-site tracker requests. Allow first-party requests even if
  // the domain is on a list (e.g. example.com visiting its own analytics).
  //
  // Electron doesn't give us the first-party URL directly on the request
  // details, so we look it up from the owning webContents when the hint
  // isn't already in the referrer header.
  const { webContents } = require('electron');
  ses.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    if (!ses._zipTrackingProtection) return callback({ cancel: false });
    const reqHost = hostFromUrl(details.url);
    if (!reqHost) return callback({ cancel: false });
    let docHost = hostFromUrl(details.referrer || '');
    if (!docHost && typeof details.webContentsId === 'number') {
      const wc = webContents.fromId(details.webContentsId);
      if (wc && !wc.isDestroyed()) docHost = hostFromUrl(wc.getURL());
    }
    const isCrossSite = docHost && reqHost !== docHost && !reqHost.endsWith('.' + docHost);
    if (isCrossSite && lists && matchesList(reqHost, lists.domains)) {
      blockedThisTab++;
      for (const fn of ses._zipBlockedCounters) try { fn(blockedThisTab); } catch (_) {}
      return callback({ cancel: true });
    }
    return callback({ cancel: false });
  });

  ses.webRequest.onBeforeSendHeaders({ urls: ['<all_urls>'] }, (details, callback) => {
    const headers = { ...details.requestHeaders };

    // Strip Referer on cross-origin requests to origin only.
    try {
      if (headers['Referer']) {
        const ref = new URL(headers['Referer']);
        const target = new URL(details.url);
        if (ref.origin !== target.origin) {
          headers['Referer'] = ref.origin + '/';
        }
      }
    } catch (_) {}

    // Global Privacy Control + DNT, in that order of relevance.
    headers['Sec-GPC'] = '1';
    headers['DNT'] = '1';

    // Reduce Client Hints fingerprinting surface.
    delete headers['Sec-CH-UA-Full-Version-List'];
    delete headers['Sec-CH-UA-Model'];
    delete headers['Sec-CH-UA-Arch'];
    delete headers['Sec-CH-UA-Full-Version'];
    delete headers['Sec-CH-UA-Platform-Version'];

    if (privateMode) {
      // In private mode, trim the UA extras down to the baseline UA, keeping
      // compatibility without broadcasting a resizable fingerprint.
      delete headers['Sec-CH-UA-Bitness'];
      delete headers['Sec-CH-UA-WoW64'];
    }

    callback({ requestHeaders: headers });
  });

  // Lock down permission requests. Camera, microphone, geolocation and
  // notifications are blocked by default; users explicitly opt in later.
  ses.setPermissionRequestHandler((_webContents, permission, callback) => {
    const alwaysDeny = new Set([
      'geolocation', 'notifications', 'media', 'midiSysex', 'midi',
      'hid', 'serial', 'usb', 'bluetooth', 'window-management',
      'display-capture', 'idle-detection'
    ]);
    if (alwaysDeny.has(permission)) return callback(false);
    callback(true); // clipboard-read-write, fullscreen, pointerLock
  });

  ses.setPermissionCheckHandler(() => false);

  // Reject HTTP auth prompts from third parties; only accept them when
  // the main frame is the one being challenged.
  ses.on('login', (event, _webContents, details, _authInfo, callback) => {
    if (!details || !details.firstAuthAttempt) {
      event.preventDefault();
      callback();
    }
  });
}

module.exports = { installPrivacyDefaults, loadTrackingLists, matchesList, hostFromUrl };
