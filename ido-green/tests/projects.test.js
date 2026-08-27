const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'www', 'data', 'projects.json'), 'utf8'));

describe('projects data', () => {
  it('gives every project the fields the build script renders', () => {
    data.projects.forEach(p => {
      expect(typeof p.id).toBe('string');
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.url).toBeTruthy();
      expect(p.cta).toBeTruthy();
      expect(data.categories.some(c => c.id === p.category)).toBe(true);
    });
  });

  it('has no duplicate project ids', () => {
    const ids = data.projects.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every repo at an owner/name pair', () => {
    data.projects.filter(p => p.repo).forEach(p => {
      expect(p.repo).toMatch(/^[\w.-]+\/[\w.-]+$/);
    });
  });

  it('regenerates index.html byte-for-byte, so the checked-in file is current', () => {
    const before = fs.readFileSync(path.join(ROOT, 'www', 'index.html'), 'utf8');
    execFileSync('node', [path.join(ROOT, 'tools', 'build-projects.js')], { stdio: 'pipe' });
    const after = fs.readFileSync(path.join(ROOT, 'www', 'index.html'), 'utf8');
    expect(after).toBe(before);
  });
});

describe('projects section', () => {
  jest.setTimeout(30000);

  beforeAll(async () => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  });

  it('renders every project into the served HTML, not just via JS', async () => {
    // Fetched without a browser: this is what a crawler and a no-JS visitor see.
    const html = await fetch(`${BASE}/index.html`).then(r => r.text());
    const rendered = (html.match(/class="glass-card project-card/g) || []).length;
    expect(rendered).toBe(data.projects.length);

    data.projects.forEach(p => {
      expect(html).toContain(`id="project-${p.id}"`);
    });
  });

  it('leaves the filter controls inert until JS reveals them', async () => {
    const html = await fetch(`${BASE}/index.html`).then(r => r.text());
    expect(html).toMatch(/id="project-controls" hidden/);
  });

  it('reveals the controls once JS runs', async () => {
    const hidden = await page.$eval('#project-controls', el => el.hidden);
    expect(hidden).toBe(false);
  });

  it('filters down to a single category', async () => {
    await page.click('.filter-chip[data-filter="devops"]');
    const shown = await page.$$eval('.project-card', els => els.filter(e => !e.hidden).length);
    expect(shown).toBe(data.projects.filter(p => p.category === 'devops').length);

    const cats = await page.$$eval('.project-category-wrapper', els => els.filter(e => !e.hidden).length);
    expect(cats).toBe(1);

    await page.click('.filter-chip[data-filter="all"]');
  });

  it('searches titles, descriptions and tags', async () => {
    // "skiing" is only a tag on PowderCast, so a hit proves tags are searched.
    await page.type('#project-search-input', 'skiing');
    const ids = await page.$$eval('.project-card', els =>
      els.filter(e => !e.hidden).map(e => e.id)
    );
    expect(ids).toEqual(['project-powdercast']);
  });

  it('reports when nothing matches', async () => {
    await page.$eval('#project-search-input', el => { el.value = ''; });
    await page.type('#project-search-input', 'zzzznope');
    const text = await page.$eval('#project-result-count', el => el.textContent);
    expect(text).toMatch(/No projects match/);

    await page.$eval('#project-search-input', el => {
      el.value = '';
      el.dispatchEvent(new Event('input'));
    });
  });

  it('never shows a source link that duplicates the card link', async () => {
    const dupes = await page.$$eval('.project-card', els => els.filter(e => {
      const main = e.querySelector('.project-card-link');
      const repo = e.querySelector('.project-repo');
      return main && repo && main.href === repo.href;
    }).map(e => e.id));
    expect(dupes).toEqual([]);
  });

  it('keeps the whole card clickable without swallowing the source link', async () => {
    const hits = await page.evaluate(() => {
      const card = document.querySelector('.project-card .project-repo').closest('.project-card');
      const abs = card.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, abs - 150), behavior: 'instant' });

      const at = sel => {
        const r = card.querySelector(sel).getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!el) return 'offscreen';
        if (el.closest('.project-repo')) return 'repo';
        if (el.closest('.project-card-link')) return 'project';
        return 'other';
      };
      return { repo: at('.project-repo'), title: at('.project-card-title'), body: at('.project-card-description') };
    });

    expect(hits).toEqual({ repo: 'repo', title: 'project', body: 'project' });
  });
});
