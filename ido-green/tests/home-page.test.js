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
});
