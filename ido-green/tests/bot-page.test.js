describe('bot-page', () => {
  jest.setTimeout(30000);
  beforeAll(async () => {
    await page.goto('https://ido-green.appspot.com/bots.html');
  });

  it('should be titled "Ido Green - Bots"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Bots');
  });
});