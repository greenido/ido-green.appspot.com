//
// The hidden terminal (js/terminal.js) and the shared egg counter. >_
//
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const data = require('../www/data/projects.json');

async function fresh() {
  const p = await browser.newPage();
  await p.setRequestInterception(true);
  // Keep it hermetic: only the local site loads.
  p.on('request', req => (req.url().startsWith(BASE) ? req.continue() : req.abort()));
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
  await p.reload({ waitUntil: 'domcontentloaded' });
  return p;
}

async function openTerminal(p) {
  await p.evaluate(() => document.activeElement && document.activeElement.blur());
  await p.keyboard.press('Backquote');
  await p.waitForSelector('#site-terminal[open]', { timeout: 5000 });
}

async function run(p, cmd) {
  const before = await p.$$eval('#site-terminal .term-line', els => els.length);
  await p.type('#term-input', cmd);
  await p.keyboard.press('Enter');
  // Wait for the echo plus at least one line of output (some commands fetch).
  await p.waitForFunction(n => document.querySelectorAll('#site-terminal .term-line').length > n + 1, {}, before);
  return p.$$eval('#site-terminal .term-line', (els, n) => els.slice(n).map(e => e.textContent), before);
}

describe('the hidden terminal', () => {
  jest.setTimeout(30000);
  let p;

  beforeEach(async () => { p = await fresh(); });
  afterEach(async () => { await p.close(); });

  it('costs a normal visit nothing', async () => {
    const state = await p.evaluate(() => ({
      script: !!document.querySelector('script[src*="terminal.js"]'),
      global: typeof window.openSiteTerminal
    }));
    expect(state).toEqual({ script: false, global: 'undefined' });
  });

  it('opens with the backtick key and focuses the prompt', async () => {
    await openTerminal(p);
    const focused = await p.evaluate(() => document.activeElement.id);
    expect(focused).toBe('term-input');
  });

  it('ignores backtick while typing in a field', async () => {
    await p.focus('#project-search-input');
    await p.keyboard.press('Backquote');
    await new Promise(r => setTimeout(r, 400));
    expect(await p.$('#site-terminal')).toBeNull();
  });

  it('opens from the project search on a phone', async () => {
    await p.type('#project-search-input', 'terminal');
    await p.waitForSelector('#site-terminal[open]', { timeout: 5000 });
    expect(await p.$eval('#project-search-input', el => el.value)).toBe('');
  });

  it('lists its commands with help', async () => {
    await openTerminal(p);
    const lines = (await run(p, 'help')).join('\n');
    ['ls', 'cat', 'open', 'peek', 'surprise', 'everest', 'eggs', 'clear', 'exit'].forEach(c => expect(lines).toMatch(new RegExp(`^${c}\\b`, 'm')));
    // The secrets stay secret.
    expect(lines).not.toMatch(/^sudo/m);
    expect(lines).not.toMatch(/^rm/m);
  });

  it('lists every project from projects.json', async () => {
    await openTerminal(p);
    const lines = (await run(p, 'ls projects')).join('\n');
    data.projects.forEach(proj => expect(lines).toContain(proj.id));
  });

  it('reads the career straight off the page', async () => {
    await openTerminal(p);
    const lines = await run(p, 'cat career');
    const cards = await p.$$eval('.timeline-card', els => els.length);
    expect(lines.length - 1).toBe(cards);
    expect(lines.join('\n')).toContain('Yahoo!');
  });

  it('opens a project in a new tab', async () => {
    await openTerminal(p);
    await p.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); }; });
    await run(p, 'open powdercast');
    expect(await p.evaluate(() => window.__opened)).toEqual([data.projects.find(x => x.id === 'powdercast').url]);
  });

  it('suggests a project when the name is close', async () => {
    await openTerminal(p);
    const lines = (await run(p, 'open powder')).join('\n');
    expect(lines).toMatch(/Did you mean: powdercast\?/);
  });

  it('hands peek over to the Peek dialog', async () => {
    await openTerminal(p);
    // peek closes the terminal instead of printing, so no run() helper here.
    await p.type('#term-input', 'peek hwy80');
    await p.keyboard.press('Enter');
    await p.waitForSelector('#peek-dialog[open]', { timeout: 5000 });
    expect(await p.$eval('#site-terminal', d => d.open)).toBe(false);
  });

  it('launches the Everest climb', async () => {
    await openTerminal(p);
    await p.evaluate(() => { window.__climbs = 0; window.launchEverestingEgg = () => { window.__climbs++; }; });
    await p.type('#term-input', 'everest');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => window.__climbs === 1);
  });

  it('says so for an unknown command', async () => {
    await openTerminal(p);
    const lines = await run(p, 'frobnicate');
    expect(lines[1]).toMatch(/frobnicate: command not found/);
  });

  it('completes commands with Tab and walks history with the arrows', async () => {
    await openTerminal(p);
    await p.type('#term-input', 'surp');
    await p.keyboard.press('Tab');
    expect(await p.$eval('#term-input', el => el.value)).toBe('surprise ');

    await p.$eval('#term-input', el => { el.value = ''; });
    await run(p, 'echo one');
    await run(p, 'echo two');
    await p.keyboard.press('ArrowUp');
    expect(await p.$eval('#term-input', el => el.value)).toBe('echo two');
    await p.keyboard.press('ArrowUp');
    expect(await p.$eval('#term-input', el => el.value)).toBe('echo one');
  });

  it('never renders typed input as HTML', async () => {
    await openTerminal(p);
    await run(p, 'echo <img src=x onerror=window.__pwned=1>');
    expect(await p.$('#site-terminal img')).toBeNull();
    expect(await p.evaluate(() => window.__pwned)).toBeUndefined();
  });

  it('closes with exit and returns focus', async () => {
    await openTerminal(p);
    await p.type('#term-input', 'exit');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => !document.querySelector('#site-terminal').open);
  });
});

describe('the egg counter', () => {
  jest.setTimeout(30000);
  let p;

  beforeEach(async () => { p = await fresh(); });
  afterEach(async () => { await p.close(); });

  it('counts opening the terminal as the first egg', async () => {
    await openTerminal(p);
    const lines = await run(p, 'eggs');
    expect(lines[1]).toMatch(/1\/4 eggs found/);
  });

  it('awards sudo and rm once each and remembers them across visits', async () => {
    await openTerminal(p);
    expect((await run(p, 'sudo make me a coffee')).join('\n')).toMatch(/You found an egg/);
    expect((await run(p, 'sudo again')).join('\n')).not.toMatch(/You found an egg/);
    expect((await run(p, 'rm -rf /')).join('\n')).toMatch(/You found an egg/);

    await p.reload({ waitUntil: 'domcontentloaded' });
    expect(await p.evaluate(() => window.siteEggs.found())).toEqual(['terminal', 'sudo', 'rm']);
  });

  it('credits a climb from before the counter existed', async () => {
    await p.evaluate(() => localStorage.setItem('everesting-egg-found', '1'));
    expect(await p.evaluate(() => window.siteEggs.found())).toEqual(['everest']);
  });

  it('counts the climb when it is launched', async () => {
    await p.evaluate(() => { window.startEverestingEgg = () => {}; document.activeElement && document.activeElement.blur(); });
    for (const k of ['8', '8', '4', '8']) await p.keyboard.press(k);
    await p.waitForFunction(() => window.siteEggs.found().includes('everest'));
  });

  it('ignores unknown egg ids', async () => {
    expect(await p.evaluate(() => window.siteEggs.mark('nope'))).toBe(false);
  });
});
