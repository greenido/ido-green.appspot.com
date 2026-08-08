const BASE = process.env.BASE_URL || 'http://localhost:8080';

describe('contact-page', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await page.goto(`${BASE}/contact.html`, { waitUntil: 'domcontentloaded' });
  });

  it('should be titled "Ido Green - Contact Form"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Contact Form');
  });

  it('should offer a mailto link instead of a third-party form embed', async () => {
    const href = await page.$eval('#contact-email', el => el.getAttribute('href'));
    expect(href).toBe('mailto:greenido@gmail.com');
  });

  it('should link out to LinkedIn and GitHub', async () => {
    const links = await page.$$eval('.contact-option', els => els.map(e => e.getAttribute('href')));
    expect(links).toEqual(expect.arrayContaining([
      'https://www.linkedin.com/in/greenido',
      'https://github.com/greenido'
    ]));
  });
});
