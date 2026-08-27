const BASE = process.env.BASE_URL || 'http://localhost:8080';

describe('404 page', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await page.goto(`${BASE}/404.html`, { waitUntil: 'domcontentloaded' });
  });

  it('should be titled "Page Not Found - Ido Green"', async () => {
    await expect(page.title()).resolves.toMatch('Page Not Found - Ido Green');
  });

  it('should keep itself out of the index', async () => {
    const robots = await page.$eval('meta[name="robots"]', el => el.content);
    expect(robots).toContain('noindex');
  });

  it('should offer a route back into the site', async () => {
    const hrefs = await page.$$eval('.notfound-actions a', els => els.map(e => e.getAttribute('href')));
    expect(hrefs).toEqual(expect.arrayContaining(['/', '/#portfolio', '/#writing']));
  });

  it('should reference assets absolutely, since it answers any unmatched URL', async () => {
    // A relative href would resolve against the mistyped address and 404 too.
    const local = await page.$$eval('link[rel="stylesheet"], script[src]', els =>
      els.map(e => e.getAttribute('href') || e.getAttribute('src'))
         .filter(u => u && !/^https?:/.test(u))
    );
    expect(local.length).toBeGreaterThan(0);
    local.forEach(u => expect(u.startsWith('/')).toBe(true));
  });

  it('should not load anything over plain http', async () => {
    const html = await page.content();
    expect(html).not.toMatch(/["']http:\/\//);
  });
});
