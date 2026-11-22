//
// The live homepage bits: Right now strip, Surprise me, Peek, live card data,
// and the "things I helped ship" list. 🎲
//
// Every third-party request (GitHub raw, Caltrans, Open-Meteo) is answered
// from fixtures below, so the suite stays hermetic and never depends on what
// the real feeds happen to say today.
//
const BASE = process.env.BASE_URL || 'http://localhost:8080';
const { summarize } = require('../tools/update-now.js');

const NOW_FIXTURE = {
  building: 'A test fixture',
  reading: 'An invented book',
  github: { verb: 'Pushed to', repo: 'example/demo-repo', url: 'https://github.com/example/demo-repo', at: new Date(Date.now() - 2 * 3600e3).toISOString() }
};

function caltrans(status) {
  const cc = (route, s, name) => ({ cc: {
    location: { route, locationName: name },
    inService: 'true',
    statusData: { status: s }
  } });
  return { data: [cc('I-80', 'R-0', 'Truckee'), cc('I-80', status, 'Kingvale'), cc('US-50', 'R-3', 'Echo Summit')] };
}

const SNOW_FIXTURE = { daily: { snowfall_sum: [2.5, 4, 0] } };

async function openPage({ now = NOW_FIXTURE, rawFails = false, chains = 'R-0' } = {}) {
  const p = await browser.newPage();
  await p.setRequestInterception(true);
  p.on('request', req => {
    const url = req.url();
    const json = body => req.respond({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(body)
    });
    if (url.startsWith('https://raw.githubusercontent.com/')) {
      return rawFails ? req.respond({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' }) : json(now);
    }
    if (url.includes('cwwp2.dot.ca.gov')) return json(caltrans(chains));
    if (url.includes('api.open-meteo.com')) return json(SNOW_FIXTURE);
    if (url.startsWith(BASE)) return req.continue();
    // Fonts, GitHub API, WordPress: not under test here.
    return req.abort();
  });
  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  return p;
}

describe('right now strip', () => {
  jest.setTimeout(30000);

  it('is hidden in the served HTML so a failed fetch leaves no empty box', async () => {
    const html = await fetch(`${BASE}/index.html`).then(r => r.text());
    expect(html).toMatch(/id="now-strip" hidden/);
  });

  it('renders building, reading and the latest GitHub activity', async () => {
    const p = await openPage();
    await p.waitForSelector('#now-strip:not([hidden])');
    const items = await p.$$eval('.now-item', els => els.map(e => e.textContent));
    expect(items[0]).toContain('A test fixture');
    expect(items[1]).toContain('An invented book');
    expect(items[2]).toMatch(/Pushed to demo-repo · 2 hours ago/);
    const href = await p.$eval('.now-item a', a => a.href);
    expect(href).toBe('https://github.com/example/demo-repo');
    await p.close();
  });

  it('falls back to the deployed now.json when GitHub raw is unavailable', async () => {
    const p = await openPage({ rawFails: true });
    await p.waitForSelector('#now-strip:not([hidden])');
    const first = await p.$eval('.now-item', e => e.textContent);
    expect(first).toContain('Building');
    expect(first).not.toContain('A test fixture');
    await p.close();
  });

  it('refuses a repo name that is not owner/name', async () => {
    const p = await openPage({ now: { github: { verb: 'Pushed to', repo: 'javascript:alert(1)', at: '2026-01-01T00:00:00Z' } } });
    await new Promise(r => setTimeout(r, 500));
    const hidden = await p.$eval('#now-strip', el => el.hidden);
    expect(hidden).toBe(true);
    await p.close();
  });
});

describe('update-now summarize()', () => {
  const ev = (type, payload, repo = 'example/one', at = '2026-01-02T00:00:00Z') =>
    ({ type, payload, repo: { name: repo }, created_at: at });

  it('picks the newest event that represents real work', () => {
    const out = summarize([
      ev('WatchEvent', {}, 'example/starred'),
      ev('IssueCommentEvent', {}, 'example/comment'),
      ev('PushEvent', {}, 'example/pushed')
    ]);
    expect(out).toEqual({ verb: 'Pushed to', repo: 'example/pushed', url: 'https://github.com/example/pushed', at: '2026-01-02T00:00:00Z' });
  });

  it('only counts merged PRs as merged', () => {
    expect(summarize([ev('PullRequestEvent', { action: 'closed', pull_request: { merged: false } })])).toBeNull();
    expect(summarize([ev('PullRequestEvent', { action: 'closed', pull_request: { merged: true } })]).verb).toBe('Merged a PR on');
  });

  it('never stores free text from the event payload', () => {
    const out = summarize([ev('PushEvent', { commits: [{ message: 'secret stuff' }] })]);
    expect(JSON.stringify(out)).not.toContain('secret');
  });

  it('returns null for junk input', () => {
    expect(summarize(null)).toBeNull();
    expect(summarize([])).toBeNull();
  });
});

describe('live card data', () => {
  jest.setTimeout(30000);

  const liveText = (p, id) => p.$eval(`#project-${id} .project-live`, el => (el.hidden ? null : el.textContent));

  async function scrollTo(p, id) {
    await p.$eval(`#project-${id}`, el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await p.waitForSelector(`#project-${id} .project-live:not([hidden])`, { timeout: 5000 });
  }

  it('does not fetch the feeds until the cards are near the viewport', async () => {
    const p = await openPage();
    await new Promise(r => setTimeout(r, 500));
    expect(await liveText(p, 'hwy80')).toBeNull();
    await p.close();
  });

  it('reports clear roads on I-80', async () => {
    const p = await openPage();
    await scrollTo(p, 'hwy80');
    expect(await liveText(p, 'hwy80')).toMatch(/no chain controls on I-80/);
    await p.close();
  });

  it('names the worst I-80 chain control, ignoring other routes', async () => {
    const p = await openPage({ chains: 'R-2' });
    await scrollTo(p, 'hwy80');
    expect(await liveText(p, 'hwy80')).toMatch(/R-2 chain controls on I-80 near Kingvale/);
    await p.close();
  });

  it('shows the Palisades Tahoe snow forecast', async () => {
    const p = await openPage();
    await scrollTo(p, 'powdercast');
    expect(await liveText(p, 'powdercast')).toMatch(/2\.5" today, 6\.5" over 3 days at Palisades Tahoe/);
    await p.close();
  });
});

describe('surprise me', () => {
  jest.setTimeout(30000);

  it('clears filters, picks a card, highlights it and names it', async () => {
    const p = await openPage();
    await p.type('#project-search-input', 'skiing');
    await p.click('#surprise-btn');

    const state = await p.evaluate(() => ({
      search: document.getElementById('project-search-input').value,
      hiddenCards: document.querySelectorAll('.project-card[hidden]').length,
      glowing: [...document.querySelectorAll('.project-card.is-surprise')].map(c => c.id),
      focused: document.activeElement.closest('.project-card')?.id,
      count: document.getElementById('project-result-count').textContent
    }));
    expect(state.search).toBe('');
    expect(state.hiddenCards).toBe(0);
    expect(state.glowing).toHaveLength(1);
    expect(state.focused).toBe(state.glowing[0]);
    expect(state.count).toMatch(/^🎲 How about .+\?$/);
    await p.close();
  });

  it('never picks the same project twice in a row', async () => {
    const p = await openPage();
    const picks = [];
    for (let i = 0; i < 8; i++) {
      await p.click('#surprise-btn');
      picks.push(await p.$eval('.project-card.is-surprise', c => c.id));
    }
    picks.slice(1).forEach((id, i) => expect(id).not.toBe(picks[i]));
    await p.close();
  });
});

describe('peek', () => {
  jest.setTimeout(30000);

  it('only offers Peek on apps that allow framing', async () => {
    const data = require('../www/data/projects.json');
    const p = await openPage();
    const ids = await p.$$eval('.project-peek:not([hidden])', els => els.map(b => b.closest('.project-card').id));
    const expected = data.projects.filter(x => x.peek).map(x => `project-${x.id}`);
    expect(ids).toEqual(expected);
    // These two send X-Frame-Options and would show a blank box.
    expect(ids).not.toContain('project-everesting');
    expect(ids).not.toContain('project-water2route');
    await p.close();
  });

  it('opens the app in a dialog and unloads it on close', async () => {
    const p = await openPage();
    await p.$eval('#project-hwy80 .project-peek', b => b.click());
    await p.waitForSelector('#peek-dialog[open]');

    const opened = await p.evaluate(() => ({
      title: document.querySelector('.peek-title').textContent,
      src: document.querySelector('.peek-frame').getAttribute('src'),
      external: document.querySelector('.peek-open').href,
      sandbox: document.querySelector('.peek-frame').getAttribute('sandbox')
    }));
    expect(opened.title).toBe('Road Conditions');
    expect(opened.src).toBe('https://hwy80.vercel.app/');
    expect(opened.external).toBe('https://hwy80.vercel.app/');
    expect(opened.sandbox).toContain('allow-scripts');

    await p.keyboard.press('Escape');
    // The close event (which blanks the frame) fires a task after [open] goes.
    await p.waitForFunction(() => document.querySelector('.peek-frame').getAttribute('src') === 'about:blank');
    expect(await p.$eval('#peek-dialog', d => d.open)).toBe(false);
    await p.close();
  });

  it('does not navigate the card when Peek is clicked', async () => {
    const p = await openPage();
    // Click real coordinates, as a person would: the stretched card link sits
    // under the button, so a wrong z-index would send this click to the app.
    // (page.click's own scrolling fights the site's smooth scroll, so measure.)
    await p.$eval('#project-powdercast', el => el.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 300));
    const box = await p.$eval('#project-powdercast .project-peek', b => {
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await p.mouse.click(box.x, box.y);
    await p.waitForSelector('#peek-dialog[open]');
    expect(p.url()).toBe(`${BASE}/`);
    await p.close();
  });
});

describe('things I helped ship', () => {
  it('is in the served HTML with at least three items', async () => {
    const html = await fetch(`${BASE}/index.html`).then(r => r.text());
    const items = (html.match(/class="glass-card shipped-item"/g) || []).length;
    expect(items).toBeGreaterThanOrEqual(3);
    expect(html).toContain('Yahoo! Pipes');
  });
});
