//
// Whole-page checks across every modern page: layout at phone width, broken
// local references, image alt text, console errors, and the shared navbar. 🩺
//
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const WWW = path.join(__dirname, '..', 'www');
const PAGES = ['/', '/contact.html', '/startups.html', '/404.html'];

async function hermeticPage() {
  const p = await browser.newPage();
  await p.setRequestInterception(true);
  // Third-party requests are aborted so a flaky network can't fail the suite;
  // the console-error check below ignores exactly those aborted requests.
  p.on('request', req => (req.url().startsWith(BASE) ? req.continue() : req.abort()));
  return p;
}

describe.each(PAGES)('%s', (url) => {
  jest.setTimeout(30000);
  let p;
  const errors = [];

  beforeAll(async () => {
    p = await hermeticPage();
    p.on('pageerror', err => errors.push(`pageerror: ${err.message}`));
    p.on('requestfailed', req => {
      if (req.url().startsWith(BASE)) errors.push(`requestfailed: ${req.url()}`);
    });
    p.on('response', res => {
      if (res.url().startsWith(BASE) && res.status() >= 400 && !res.url().endsWith('/404.html')) {
        errors.push(`${res.status()}: ${res.url()}`);
      }
    });
    await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await p.goto(`${BASE}${url}`, { waitUntil: 'networkidle0' });
  });

  afterAll(async () => { await p.close(); });

  it('throws no script errors and requests nothing local that is missing', () => {
    expect(errors).toEqual([]);
  });

  it('fits a 375px phone without sideways scrolling', async () => {
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  it('gives every image alt text (empty is fine for decoration)', async () => {
    const missing = await p.$$eval('img', imgs => imgs.filter(i => !i.hasAttribute('alt')).map(i => i.src));
    expect(missing).toEqual([]);
  });

  it('gives every button an accessible name', async () => {
    const unnamed = await p.$$eval('button', els => els
      .filter(b => !(b.textContent.trim() || b.getAttribute('aria-label') || b.getAttribute('aria-labelledby')))
      .map(b => b.outerHTML.slice(0, 80)));
    expect(unnamed).toEqual([]);
  });

  it('points every local link at a file that exists', async () => {
    const hrefs = await p.$$eval('a[href]', els => els.map(a => a.getAttribute('href')));
    const local = [...new Set(hrefs)]
      .filter(h => h && !/^(https?:|mailto:|tel:|#|javascript:)/i.test(h))
      .map(h => h.split('#')[0].split('?')[0].replace(/^\//, ''))
      .filter(Boolean);
    const missing = local.filter(h => !fs.existsSync(path.join(WWW, h)));
    expect(missing).toEqual([]);
  });

  it('opens every new-tab link without leaking window.opener', async () => {
    const leaky = await p.$$eval('a[target="_blank"]', els => els
      .filter(a => !/noopener|noreferrer/.test(a.rel)).map(a => a.href));
    expect(leaky).toEqual([]);
  });
});

describe('homepage navigation', () => {
  jest.setTimeout(30000);
  let p;

  beforeAll(async () => {
    p = await hermeticPage();
    await p.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  });

  afterAll(async () => { await p.close(); });

  const state = () => p.evaluate(() => ({
    expanded: document.getElementById('nav-toggle-btn').getAttribute('aria-expanded'),
    open: document.getElementById('nav-menu-list').classList.contains('active')
  }));

  it('points every in-page nav link at a section that exists', async () => {
    const dangling = await p.$$eval('.navbar-menu a[href^="#"]', els =>
      els.map(a => a.getAttribute('href')).filter(h => !document.querySelector(h)));
    expect(dangling).toEqual([]);
  });

  it('opens and closes the mobile menu with the toggle, keeping aria-expanded in sync', async () => {
    expect(await state()).toEqual({ expanded: 'false', open: false });
    await p.click('#nav-toggle-btn');
    expect(await state()).toEqual({ expanded: 'true', open: true });
    await p.click('#nav-toggle-btn');
    expect(await state()).toEqual({ expanded: 'false', open: false });
  });

  it('closes the mobile menu when a link is chosen', async () => {
    await p.click('#nav-toggle-btn');
    await p.$eval('.navbar-menu a[href="#about"]', a => a.click());
    expect(await state()).toEqual({ expanded: 'false', open: false });
  });

  it('closes the mobile menu on a click outside it', async () => {
    await p.click('#nav-toggle-btn');
    await p.$eval('.hero-title', el => el.click());
    expect(await state()).toEqual({ expanded: 'false', open: false });
  });

  it('highlights the nav link of the section in view', async () => {
    await p.setViewport({ width: 1280, height: 900 });
    await p.$eval('#talks', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await p.waitForFunction(() => document.querySelector('.navbar-menu a[href="#talks"]').classList.contains('active'));
    const active = await p.$$eval('.navbar-menu a.active', els => els.map(a => a.getAttribute('href')));
    expect(active).toEqual(['#talks']);
  });

  it('keeps the footer year current', async () => {
    const year = await p.$eval('#current-year', el => el.textContent);
    expect(year).toBe(String(new Date().getFullYear()));
  });
});

describe('homepage copy', () => {
  it('introduces Ido in the first person and says what the projects are for', async () => {
    const html = await fetch(`${BASE}/index.html`).then(r => r.text());
    expect(html).toMatch(/Hi, I'm Ido\./);
    expect(html).toMatch(/open-source them/);
    expect(html).toMatch(/let the dice choose/);
  });
});

describe('now.json', () => {
  const now = JSON.parse(fs.readFileSync(path.join(WWW, 'data', 'now.json'), 'utf8'));

  it('keeps the hand-written fields as strings', () => {
    expect(typeof now.building).toBe('string');
    expect(typeof now.reading).toBe('string');
  });

  it('stores GitHub activity as owner/name plus a valid timestamp, or nothing', () => {
    if (now.github === null) return;
    expect(now.github.repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
    expect(Number.isNaN(Date.parse(now.github.at))).toBe(false);
    expect(Object.keys(now.github).sort()).toEqual(['at', 'repo', 'url', 'verb']);
  });
});
