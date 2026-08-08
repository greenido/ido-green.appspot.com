const BASE = process.env.BASE_URL || 'http://localhost:8080';

describe('bot-page', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await page.goto(`${BASE}/bots.html`, { waitUntil: 'domcontentloaded' });
  });

  it('should be titled "Ido Green - Bots"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Bots');
  });
});
