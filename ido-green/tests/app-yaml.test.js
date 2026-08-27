const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');

const APP_YAML = path.join(__dirname, '..', 'app.yaml');
const ROOT = path.join(__dirname, '..');

const config = YAML.load(fs.readFileSync(APP_YAML, 'utf8'));

/**
 * App Engine tries each handler in order and uses the FIRST whose url pattern
 * matches. A static handler never falls through: if its pattern matches but the
 * file is missing, App Engine answers with its own generic 404 and later
 * handlers are never consulted. That is what silently broke the custom 404 page,
 * so these tests model the matching rather than trusting the file to look right.
 */
function firstMatch(url) {
  return config.handlers.find(h => new RegExp(`^${h.url}$`).test(url));
}

// app.yaml writes backreferences as \1 while JS String.replace expects $1.
function resolveStatic(url, handler) {
  const target = handler.static_files.replace(/\\(\d)/g, '$$$1');
  return url.replace(new RegExp(`^${handler.url}$`), target);
}

describe('app.yaml routing', () => {
  it('sends unmatched extensionless URLs to the PHP 404 front controller', () => {
    ['/talks', '/blog', '/about', '/some/deep/path'].forEach(url => {
      const handler = firstMatch(url);
      expect(handler).toBeDefined();
      expect(handler.script).toBe('auto');
      expect(handler.static_files).toBeUndefined();
    });
  });

  it('still serves the real pages from static handlers', () => {
    const cases = {
      '/': 'www/index.html',
      '/contact.html': 'www/contact.html',
      '/startups.html': 'www/startups.html',
      '/sitemap.xml': 'www/sitemap.xml',
      '/robots.txt': 'www/robots.txt'
    };

    for (const [url, expected] of Object.entries(cases)) {
      const handler = firstMatch(url);
      expect(handler).toBeDefined();
      expect(handler.script).toBeUndefined();

      const resolved = resolveStatic(url, handler);
      expect(resolved).toBe(expected);
      expect(fs.existsSync(path.join(ROOT, resolved))).toBe(true);
    }
  });

  it('serves css, js and images through static handlers', () => {
    ['/css/main.css', '/js/main.js', '/img/og-card.jpg'].forEach(url => {
      const handler = firstMatch(url);
      expect(handler.script).toBeUndefined();
      expect(fs.existsSync(path.join(ROOT, resolveStatic(url, handler)))).toBe(true);
    });
  });

  it('sets Vary: Accept-Encoding on every compressible handler', () => {
    // Without Vary the edge cache keeps one variant per URL, so a single request
    // that omits Accept-Encoding pins the uncompressed copy for everyone.
    const compressible = config.handlers.filter(
      h => h.static_files && !h.url.includes('png|jpg')
    );

    expect(compressible.length).toBeGreaterThan(0);
    compressible.forEach(h => {
      expect(h.http_headers).toBeDefined();
      expect(h.http_headers.Vary).toBe('Accept-Encoding');
    });
  });

  it('keeps the PHP front controller as the last handler', () => {
    const last = config.handlers[config.handlers.length - 1];
    expect(last.url).toBe('/.*');
    expect(last.script).toBe('auto');
    expect(config.entrypoint).toMatch(/not-found\.php$/);
  });
});
