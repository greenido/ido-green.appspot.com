const BASE = process.env.BASE_URL || 'http://localhost:8080';

describe('contact-page', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await page.goto(`${BASE}/contact.html`, { waitUntil: 'domcontentloaded' });
  });

  it('should be titled "Ido Green - Contact Form"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Contact Form');
  });

  it('should link out to LinkedIn and GitHub', async () => {
    const links = await page.$$eval('.contact-option', els => els.map(e => e.getAttribute('href')));
    expect(links).toEqual(expect.arrayContaining([
      'https://www.linkedin.com/in/greenido',
      'https://github.com/greenido'
    ]));
  });

  it('should not publish an email address anywhere on the page', async () => {
    const { html, mailtos } = await page.evaluate(() => ({
      html: document.documentElement.outerHTML,
      mailtos: [...document.querySelectorAll('a[href^="mailto:"]')].length
    }));

    expect(mailtos).toBe(0);
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('should not embed the old third-party form', async () => {
    const html = await page.content();
    expect(html).not.toContain('wufoo');
  });
});
