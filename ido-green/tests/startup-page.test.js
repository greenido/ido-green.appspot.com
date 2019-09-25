describe('startup-page', () => {
  jest.setTimeout(30000);
  beforeAll(async () => {
    await page.goto('https://ido-green.appspot.com/startups.html');
  });

  it('should be titled "Ido Green - Startups"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Startups');
  });
});