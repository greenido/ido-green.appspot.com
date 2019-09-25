describe('contact-page', () => {
  jest.setTimeout(30000);
  beforeAll(async () => {
    await page.goto('https://ido-green.appspot.com/contact.html');
  });

  it('should be titled "Ido Green - Contant Form"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Contant Form');
  });
});