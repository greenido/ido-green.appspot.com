#!/usr/bin/env node
/**
 * Stamps a content hash onto every local css/js reference.
 *
 * app.yaml caches /css/ and /js/ for seven days. Without a version in the URL
 * a deploy cannot reach anyone holding a cached copy - and because the edge
 * keys on Vary: Accept-Encoding, it is held per encoding variant, so a single
 * stale variant can serve old code to one browser family while every other
 * request looks fine. That is exactly how a shipped easter egg stayed dead for
 * Chrome users while curl reported it live.
 *
 * A hashed URL has never been cached before, so a deploy is picked up at once
 * and the seven day cache stays a benefit rather than a liability.
 *
 * Run after tools/build-projects.js. Idempotent.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WWW = path.join(__dirname, '..', 'www');

function hash(file) {
  return crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 8);
}

function walk(dir, match, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(p, match, out);
    } else if (match.test(entry.name)) out.push(p);
  }
  return out;
}

let stamped = 0;

// Pass 1: references made from inside JS. main.js fetches the easter egg by
// URL, so that URL needs its own version - main.js's hash says nothing about
// the file it goes on to load.
const mainJs = path.join(WWW, 'js', 'main.js');
if (fs.existsSync(mainJs)) {
  const egg = path.join(WWW, 'js', 'easter-egg.js');
  if (fs.existsSync(egg)) {
    const src = fs.readFileSync(mainJs, 'utf8');
    const next = src.replace(
      /(["'])\/js\/easter-egg\.js(?:\?v=[a-f0-9]+)?\1/g,
      `$1/js/easter-egg.js?v=${hash(egg)}$1`
    );
    if (next !== src) { fs.writeFileSync(mainJs, next); stamped++; }
  }
}

// Pass 2: the HTML. Done second so main.js is hashed after pass 1 changed it.
for (const file of walk(WWW, /\.html$/i)) {
  const src = fs.readFileSync(file, 'utf8');
  const next = src.replace(
    /((?:src|href)=")((?:\.\.\/)*(?:css|js)\/[A-Za-z0-9_.\/-]+\.(?:css|js))(?:\?v=[a-f0-9]+)?(")/g,
    (whole, pre, ref, post) => {
      const target = path.resolve(path.dirname(file), ref);
      if (!fs.existsSync(target)) return whole; // a dead reference is not ours to invent a hash for
      return `${pre}${ref}?v=${hash(target)}${post}`;
    }
  );
  if (next !== src) {
    fs.writeFileSync(file, next);
    stamped++;
  }
}

console.log(`Stamped content hashes into ${stamped} file(s)`);
