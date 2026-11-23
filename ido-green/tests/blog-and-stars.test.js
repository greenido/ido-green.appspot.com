//
// The two third-party feeds the homepage decorates itself with: the latest
// WordPress posts and GitHub star counts. Both are stubbed here, so these
// tests check our rendering and our failure handling, not the APIs. 📰⭐
//
const BASE = process.env.BASE_URL || 'http://localhost:8080';

const POSTS = {
  posts: [
    {
      ID: 1,
      title: 'Fixtures &amp; Friends &#8217;24',
      URL: 'https://greenido.wordpress.com/example-one/',
      date: '2026-01-15T10:00:00+00:00',
      excerpt: '<p>An <strong>invented</strong> post <img src=x onerror="window.__pwned=1"> with a long excerpt that keeps going well past the one hundred and twenty character limit we truncate at.</p>',
      featured_image: 'https://example.files.wordpress.com/2026/01/cover.png'
    },
    { ID: 2, title: 'Second post', URL: 'https://greenido.wordpress.com/example-two/', date: '2026-01-10T10:00:00+00:00', excerpt: '<p>Short.</p>', featured_image: '' },
    { ID: 3, title: 'Third post', URL: 'https://greenido.wordpress.com/example-three/', date: '2026-01-05T10:00:00+00:00', excerpt: '', featured_image: '' }
  ]
};

const REPOS = [
  { full_name: 'greenido/weather-4-bike', stargazers_count: 12 },
  { full_name: 'greenido/PowderCast', stargazers_count: 0 }
];

async function openWith({ wp = { status: 200, body: POSTS }, gh = { status: 200, body: REPOS } } = {}) {
  const p = await browser.newPage();
  await p.setRequestInterception(true);
  p.on('request', req => {
    const url = req.url();
    const reply = ({ status, body }) => req.respond({
      status,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(body || {})
    });
    if (url.startsWith('https://public-api.wordpress.com/')) return reply(wp);
    if (url.startsWith('https://api.github.com/')) return reply(gh);
    if (url.startsWith(BASE)) return req.continue();
    return req.abort();
  });
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  return p;
}

describe('latest writing', () => {
  jest.setTimeout(30000);

  it('replaces the fallback link with one card per post', async () => {
    const p = await openWith();
    const cards = await p.$$eval('.post-card', els => els.map(a => a.href));
    expect(cards).toEqual(POSTS.posts.map(x => x.URL));
    expect(await p.$('#post-fallback')).toBeNull();
    await p.close();
  });

  it('decodes HTML entities in titles', async () => {
    const p = await openWith();
    const title = await p.$eval('.post-card .post-title', el => el.textContent);
    expect(title).toBe('Fixtures & Friends ’24');
    await p.close();
  });

  it('strips markup from excerpts and never runs it', async () => {
    const p = await openWith();
    const excerpt = await p.$eval('.post-card .post-excerpt', el => el.textContent);
    expect(excerpt).not.toMatch(/[<>]/);
    expect(excerpt.length).toBeLessThanOrEqual(121);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(await p.$('.post-excerpt img')).toBeNull();
    expect(await p.evaluate(() => window.__pwned)).toBeUndefined();
    await p.close();
  });

  it('asks the WordPress CDN for a resized thumbnail, and skips missing ones', async () => {
    const p = await openWith();
    const thumbs = await p.$$eval('.post-thumb', els => els.map(i => i.getAttribute('src')));
    expect(thumbs).toHaveLength(1);
    const url = new URL(thumbs[0]);
    expect(url.searchParams.get('w')).toBe('760');
    expect(url.searchParams.get('quality')).toBe('80');
    await p.close();
  });

  it('opens posts in a new tab without leaking window.opener', async () => {
    const p = await openWith();
    const rels = await p.$$eval('.post-card', els => els.map(a => [a.target, a.rel]));
    rels.forEach(([target, rel]) => {
      expect(target).toBe('_blank');
      expect(rel).toContain('noopener');
    });
    await p.close();
  });

  it.each([
    ['an error status', { status: 500, body: {} }],
    ['an empty list', { status: 200, body: { posts: [] } }],
    ['an unexpected shape', { status: 200, body: { nope: true } }]
  ])('keeps the fallback link on %s', async (_, wp) => {
    const p = await openWith({ wp });
    expect(await p.$('#post-fallback')).not.toBeNull();
    expect(await p.$$('.post-card')).toHaveLength(0);
    await p.close();
  });
});

describe('github star counts', () => {
  jest.setTimeout(30000);

  it('adds a star count to repos that have stars, and nothing for zero', async () => {
    const p = await openWith();
    const badges = await p.$$eval('.project-repo', els =>
      Object.fromEntries(els.map(a => [a.dataset.repo, a.querySelector('.repo-stars')?.textContent || null]))
    );
    expect(badges['greenido/weather-4-bike']).toBe(' ★ 12');
    expect(badges['greenido/PowderCast']).toBeNull();
    await p.close();
  });

  it('leaves the plain Source links when GitHub rate-limits us', async () => {
    const p = await openWith({ gh: { status: 403, body: { message: 'rate limited' } } });
    expect(await p.$$('.repo-stars')).toHaveLength(0);
    const sources = await p.$$eval('.project-repo', els => els.map(a => a.textContent.trim()));
    sources.forEach(t => expect(t).toBe('Source'));
    await p.close();
  });
});
