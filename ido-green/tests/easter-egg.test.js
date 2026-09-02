const BASE = process.env.BASE_URL || 'http://localhost:8080';

const EGG = '#everesting-egg';

// Reads the altitude straight off the HUD would mean OCR, so the game exposes
// nothing - instead we sample the canvas, which is enough to tell a running
// climb from a static intro screen.
async function eggState() {
  return page.evaluate(sel => {
    const dialog = document.querySelector(sel);
    return {
      scriptLoaded: !!document.querySelector('script[src*="easter-egg"]'),
      exists: !!dialog,
      open: dialog ? dialog.open : false
    };
  }, EGG);
}

describe('the hidden climb', () => {
  beforeEach(async () => {
    await page.goto(BASE, { waitUntil: 'networkidle0' });
  });

  it('costs a normal visit nothing', async () => {
    const state = await eggState();
    expect(state.scriptLoaded).toBe(false);
    expect(state.exists).toBe(false);
    const hasGlobal = await page.evaluate(() => typeof window.startEverestingEgg);
    expect(hasGlobal).toBe('undefined');
  });

  it('opens when the summit height is typed into the project search', async () => {
    await page.type('#project-search-input', '8848');
    await page.waitForSelector(`${EGG}[open]`, { timeout: 5000 });

    const state = await eggState();
    expect(state.scriptLoaded).toBe(true);
    expect(state.open).toBe(true);

    // The search box hands itself back so the projects are not left filtered.
    const left = await page.$eval('#project-search-input', el => el.value);
    expect(left).toBe('');
  });

  it('opens on the Konami code', async () => {
    // The listener ignores the sequence while a field has focus, so make sure
    // nothing is focused first.
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                       'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
      await page.keyboard.press(key);
    }
    await page.waitForSelector(`${EGG}[open]`, { timeout: 5000 });
    expect((await eggState()).open).toBe(true);
  });

  it('actually runs the climb once started', async () => {
    await page.type('#project-search-input', '8848');
    await page.waitForSelector(`${EGG}[open]`, { timeout: 5000 });
    await page.keyboard.press('Space');

    // Two samples of the same canvas region a moment apart: a running climb
    // scrolls, an intro screen does not.
    const sample = () => page.evaluate(sel => {
      const c = document.querySelector(sel + ' canvas');
      const ctx = c.getContext('2d');
      return [...ctx.getImageData(0, Math.floor(c.height * 0.4), Math.floor(c.width), 1).data]
        .reduce((a, b) => a + b, 0);
    }, EGG);

    const first = await sample();
    await new Promise(r => setTimeout(r, 900));
    const second = await sample();
    expect(second).not.toBe(first);
  });

  it('closes on Escape and cleans up after itself', async () => {
    await page.type('#project-search-input', '8848');
    await page.waitForSelector(`${EGG}[open]`, { timeout: 5000 });

    await page.keyboard.press('Escape');

    // The overlay locks page scrolling while it is up; leaving it locked would
    // strand the visitor on a frozen page. Wait on the unlock rather than on
    // dialog.open, which flips false a task earlier than the close handler runs.
    await page.waitForFunction(() => document.body.style.overflow === '', { timeout: 5000 });

    const open = await page.$eval(EGG, el => el.open);
    expect(open).toBe(false);
  });

  it('hints at the climb when a search finds nothing', async () => {
    await page.type('#project-search-input', 'zzzznotathing');
    await page.waitForFunction(
      () => /No projects match/.test(document.getElementById('project-result-count').textContent)
    );
    const text = await page.$eval('#project-result-count', el => el.textContent);
    expect(text).toMatch(/height of Everest/i);
  });
});
