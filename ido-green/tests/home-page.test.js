describe('main-page', () => {
  beforeAll(async () => {
    await page.goto('https://ido-green.appspot.com');
  });

  it('should be titled "Ido Green - Software, Conferences and Projects"', async () => {
    await expect(page.title()).resolves.toMatch('Ido Green - Software, Conferences and Projects');
  });
});