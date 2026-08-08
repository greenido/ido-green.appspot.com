//
// Testing the home page 🔔
//
const BASE = process.env.BASE_URL || 'http://localhost:8080';

describe('main-page', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  });

  it('should be titled "Ido Green | CTO, Developer Advocate & Tech Builder"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green | CTO, Developer Advocate & Tech Builder');
  });

  it('should render the hero heading', async () => {
    const heading = await page.$eval('.hero-title', el => el.textContent.trim());
    expect(heading).toContain('Building the Future');
  });

  it('should list project cards', async () => {
    const count = await page.$$eval('.project-card', els => els.length);
    expect(count).toBeGreaterThan(5);
  });

  it('should give the navbar a background that matches the colour scheme', async () => {
    // Regression guard: the navbar used to render its light-mode background
    // in dark mode, leaving the links nearly unreadable.
    // light-dark() is resolved at parse time, so reload after switching schemes.
    const navBackgroundFor = async (scheme) => {
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
      await page.reload({ waitUntil: 'domcontentloaded' });
      return page.$eval('.navbar', el => getComputedStyle(el).backgroundColor);
    };

    const darkBg = await navBackgroundFor('dark');
    const lightBg = await navBackgroundFor('light');

    expect(darkBg).not.toBe(lightBg);
    expect(darkBg).toBe('rgba(18, 21, 34, 0.72)');
    expect(lightBg).toBe('rgba(255, 255, 255, 0.72)');
  });

  it('should carry the Open Graph tags a shared link needs', async () => {
    const meta = await page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]')]
          .map(m => [m.getAttribute('property') || m.getAttribute('name'), m.content])
      )
    );

    expect(meta['og:title']).toBeTruthy();
    expect(meta['og:description']).toBeTruthy();
    expect(meta['og:url']).toBe('https://ido-green.appspot.com/');
    expect(meta['og:image']).toBe('https://ido-green.appspot.com/img/og-card.jpg');
    expect(meta['og:image:width']).toBe('1200');
    expect(meta['og:image:height']).toBe('630');
    expect(meta['twitter:card']).toBe('summary_large_image');
  });

  it('should expose valid Person structured data', async () => {
    const raw = await page.$eval('script[type="application/ld+json"]', el => el.textContent);
    const data = JSON.parse(raw); // throws if the JSON-LD is malformed

    expect(data['@type']).toBe('Person');
    expect(data.name).toBe('Ido Green');
    expect(data.sameAs).toEqual(expect.arrayContaining(['https://github.com/greenido']));
  });

  it('should degrade to a blog link if the posts feed is unavailable', async () => {
    // The fetch is deliberately not exercised here so CI stays hermetic; what
    // matters is that the shipped HTML never leaves the section empty.
    const html = await page.evaluate(async () => {
      const res = await fetch('/index.html');
      return res.text();
    });

    expect(html).toContain('id="post-fallback"');
    expect(html).toContain('greenido.wordpress.com');
  });
});
