const fs = require('fs');
const path = require('path');

const WWW = path.join(__dirname, '..', 'www');

function walk(dir, match, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(p, match, out);
    } else if (match.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const pages = walk(WWW, /\.html$/i);
const styles = walk(WWW, /\.css$/i);
const rel = p => path.relative(WWW, p);

describe('served assets', () => {
  it('never references an image that is not on disk', () => {
    // The orphan sweep deleted ~5.8MB of unreferenced images. This is the guard
    // that would have caught it had the sweep been too greedy.
    const IMG = /\.(png|jpe?g|gif|svg|webp|ico)$/i;
    const broken = [];

    [...pages, ...styles].forEach(file => {
      const src = fs.readFileSync(file, 'utf8');
      const refs = new Set();
      for (const m of src.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
      for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) refs.add(m[1]);

      refs.forEach(ref => {
        const clean = ref.split('?')[0].split('#')[0];
        if (!IMG.test(clean)) return;
        if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:')) return;
        const abs = clean.startsWith('/')
          ? path.join(WWW, clean)
          : path.join(path.dirname(file), clean);
        if (!fs.existsSync(abs)) broken.push(`${rel(file)} -> ${ref}`);
      });
    });

    expect(broken).toEqual([]);
  });

  it('keeps every ?v= asset stamp matching the file it points at', () => {
    // app.yaml caches /css/ and /js/ for seven days, so an unversioned URL
    // cannot be updated by a deploy - and because the edge keys on
    // Vary: Accept-Encoding it goes stale per encoding variant, which is how a
    // shipped change reached curl but not Chrome. A stamp that has drifted from
    // its file is the same bug wearing a version number, so fail on it here.
    const crypto = require('crypto');
    const stale = [];
    const files = [...pages, path.join(WWW, 'js', 'main.js')].filter(f => fs.existsSync(f));

    files.forEach(file => {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/["']((\/?(?:\.\.\/)*(?:css|js)\/[A-Za-z0-9_.\/-]+\.(?:css|js)))\?v=([a-f0-9]+)["']/g)) {
        const target = m[2].startsWith('/')
          ? path.join(WWW, m[2])
          : path.resolve(path.dirname(file), m[2]);
        if (!fs.existsSync(target)) { stale.push(`${rel(file)} -> ${m[2]} (missing)`); continue; }
        const want = crypto.createHash('sha1').update(fs.readFileSync(target)).digest('hex').slice(0, 8);
        if (want !== m[3]) stale.push(`${rel(file)} -> ${m[2]} stamped ${m[3]}, content is ${want}`);
      }
    });

    expect(stale).toEqual([]);
  });

  it('ships no React development builds', () => {
    // The development bundles carry the whole warning apparatus and cost about
    // 210KB more than the production ones, for nothing a visitor can use.
    const offenders = pages.filter(p =>
      /react(-dom)?\.development\.js/.test(fs.readFileSync(p, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('pins every third-party script to a version', () => {
    // "@latest" and bare package paths let a CDN change what the page runs
    // between two visits, with no review and no way to reproduce a bug.
    const offenders = [];
    pages.forEach(p => {
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/<script[^>]+src=["'](https?:\/\/[^"']+)["']/gi)) {
        const url = m[1];
        if (/cdn\.tailwindcss\.com/.test(url)) continue; // versionless by design
        const pkg = url.match(/\/npm\/((?:@[^/]+\/)?[^/@]+)(@[^/]+)?/);
        if (!pkg) continue;
        if (!pkg[2] || pkg[2] === '@latest') offenders.push(`${rel(p)} -> ${url}`);
      }
    });
    expect(offenders).toEqual([]);
  });

  it('keeps build and dev config out of the public web root', () => {
    // Everything under www/ is served. A Gruntfile or package.json sitting
    // there is a 200, not a private file.
    const leaked = walk(WWW, /^(package.*\.json|Gruntfile\.js|gulpfile\.js|.*\.md|\.env.*|.*\.lock)$/i)
      .map(rel)
      .filter(f => f !== 'manifest.json');
    expect(leaked).toEqual([]);
  });
});
