#!/usr/bin/env node
// Zip Browser — fetch upstream tracker lists.
//
// Downloads a few community-maintained block lists and merges them into
// assets/lists/tracker-domains.json. Runs with `npm run fetch-lists`.
//
// This script is intentionally dependency-free. Node >= 18 required for fetch.

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'lists', 'tracker-domains.json');
const EASY_OUT = path.join(__dirname, '..', 'assets', 'lists', 'easylist.txt');

const SOURCES = [
  { kind: 'domains', url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling/hosts' },
  { kind: 'domains', url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext' },
  { kind: 'easylist', url: 'https://easylist.to/easylist/easyprivacy.txt' }
];

function parseHosts(text) {
  const out = new Set();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const parts = t.split(/\s+/);
    const host = parts.length >= 2 ? parts[1] : parts[0];
    if (host && host !== 'localhost' && host.includes('.') && !host.startsWith('127.')) {
      out.add(host.toLowerCase());
    }
  }
  return out;
}

async function main() {
  const existing = new Set(JSON.parse(fs.readFileSync(OUT, 'utf8')));
  let easyOut = '';

  for (const src of SOURCES) {
    try {
      process.stderr.write(`fetching ${src.url} ... `);
      const res = await fetch(src.url);
      if (!res.ok) { process.stderr.write(`HTTP ${res.status}\n`); continue; }
      const body = await res.text();
      if (src.kind === 'domains') {
        for (const h of parseHosts(body)) existing.add(h);
      } else if (src.kind === 'easylist') {
        easyOut += body + '\n';
      }
      process.stderr.write('ok\n');
    } catch (err) {
      process.stderr.write(`err: ${err.message}\n`);
    }
  }

  const sorted = [...existing].sort();
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 0) + '\n');
  if (easyOut) fs.writeFileSync(EASY_OUT, easyOut);
  process.stderr.write(`wrote ${sorted.length} domains to ${OUT}\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
