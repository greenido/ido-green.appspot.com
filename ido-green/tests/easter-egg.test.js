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

  it('opens when the same secret is typed anywhere on the page', async () => {
    // The listener stands down while a field has focus, so make sure nothing is.
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    for (const key of ['8', '8', '4', '8']) await page.keyboard.press(key);
    await page.waitForSelector(`${EGG}[open]`, { timeout: 5000 });
    expect((await eggState()).open).toBe(true);
  });

  it('ignores the secret while a text field has focus', async () => {
    // Otherwise typing 8848 into any input on the page would fire it twice:
    // once from the search handler and once from the page-wide listener.
    await page.focus('#project-search-input');
    const fired = await page.evaluate(() => {
      let count = 0;
      const real = window.startEverestingEgg;
      window.startEverestingEgg = () => { count++; };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '8', bubbles: true }));
      window.startEverestingEgg = real;
      return count;
    });
    expect(fired).toBe(0);
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

describe('the timed hints toward the climb', () => {
  const HINT_MS = 800;
  let tab;

  // A page of its own: the shortened timer must not leak into the suite above,
  // and that suite's launches leave the "found it" flag in localStorage.
  async function visit({ foundBefore = false } = {}) {
    tab = await browser.newPage();
    await tab.evaluateOnNewDocument((ms, found) => {
      window.__EGG_HINT_MS = ms;
      if (found) localStorage.setItem('everesting-egg-found', '1');
      else localStorage.removeItem('everesting-egg-found');
    }, HINT_MS, foundBefore);
    // Not networkidle0: its half-second quiet window would let the first hint
    // come and go before the test got to look at it.
    await tab.goto(BASE, { waitUntil: 'domcontentloaded' });
  }

  const hintText = () => tab.$eval('.egg-hint', el => el.textContent);

  afterEach(async () => {
    if (tab) await tab.close();
    tab = null;
  });

  it('names the secret, then says where to type it', async () => {
    await visit();
    await tab.waitForFunction(() => /8848/.test(document.querySelector('.egg-hint').textContent));
    expect(await hintText()).not.toMatch(/search box/i);

    await tab.waitForFunction(() => /search box/i.test(document.querySelector('.egg-hint').textContent));
    expect(await hintText()).toMatch(/8848/);
  });

  it('says nothing to someone who found the climb before', async () => {
    await visit({ foundBefore: true });
    await new Promise(r => setTimeout(r, HINT_MS * 3));
    expect(await tab.$('.egg-hint')).toBeNull();
  });

  it('takes the visitor to the search box', async () => {
    await visit();
    await tab.waitForSelector('.egg-hint-action');
    await tab.click('.egg-hint-action');
    const focused = await tab.evaluate(() => document.activeElement.id);
    expect(focused).toBe('project-search-input');

    // The page scrolls smoothly, so wait for it to land rather than sample once.
    await tab.waitForFunction(() => {
      const box = document.getElementById('project-search-input').getBoundingClientRect();
      return box.top >= 0 && box.bottom <= innerHeight;
    }, { timeout: 3000 });
  });

  it('stays quiet once dismissed', async () => {
    await visit();
    await tab.waitForSelector('.egg-hint-close');
    await tab.click('.egg-hint-close');
    await new Promise(r => setTimeout(r, HINT_MS * 3));
    expect(await hintText()).toBe('');
  });

  it('clears away when the climb is found', async () => {
    await visit();
    await tab.waitForSelector('.egg-hint-text');
    await tab.type('#project-search-input', '8848');
    await tab.waitForSelector('#everesting-egg[open]', { timeout: 5000 });
    expect(await hintText()).toBe('');
  });
});
