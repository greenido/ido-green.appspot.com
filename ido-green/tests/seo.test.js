//
// Crawler-facing files: they break silently, so assert they are well-formed. 🔍
//
const BASE = process.env.BASE_URL || 'http://localhost:8080';

describe('seo files', () => {
  jest.setTimeout(30000);

  it('should serve a sitemap in the correct namespace', async () => {
    const res = await page.goto(`${BASE}/sitemap.xml`);
    expect(res.status()).toBe(200);

    const xml = await res.text();
    // Easy to typo as "sitemap.org", which silently invalidates the whole file.
    expect(xml).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
    expect(xml).toContain('<loc>https://ido-green.appspot.com/</loc>');

    const parsed = await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, 'application/xml');
      return {
        error: !!doc.querySelector('parsererror'),
        urls: doc.getElementsByTagName('url').length
      };
    }, xml);

    expect(parsed.error).toBe(false);
    expect(parsed.urls).toBeGreaterThan(0);
  });

  it('should point robots.txt at the sitemap', async () => {
    const res = await page.goto(`${BASE}/robots.txt`);
    expect(res.status()).toBe(200);

    const body = await res.text();
    expect(body).toContain('Sitemap: https://ido-green.appspot.com/sitemap.xml');
  });

  it('should ship the social card image', async () => {
    const res = await page.goto(`${BASE}/img/og-card.jpg`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image');
  });
});
