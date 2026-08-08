//
// Testing the 'startups' page 🔔
//
const BASE = process.env.BASE_URL || 'http://localhost:8080';

describe('startup-page', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await page.goto(`${BASE}/startups.html`, { waitUntil: 'domcontentloaded' });
  });

  it('should be titled "Ido Green - Startups"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Startups');
  });

  it('should link back to the presentations list', async () => {
    const hrefs = await page.$$eval('a', els => els.map(e => e.getAttribute('href')));
    expect(hrefs).toContain('RoadShow.html');
  });
});
