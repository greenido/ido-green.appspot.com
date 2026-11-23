/**
 * Ido Green Personal Site - Modern Vanilla JS
 * Handles responsive navigation toggle and IntersectionObserver-based ScrollSpy.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupMobileNav();
  setupScrollSpy();
  loadLatestPosts();
  setupProjectFilter();
  setupSurprise();
  setupPeek();
  setupLiveWidgets();
  setupNowStrip();
  loadRepoStats();
  setupEasterEgg();
  setupTerminal();
});

/**
 * Mobile Navigation Toggle and Menu Behavior
 */
function setupMobileNav() {
  const toggleBtn = document.querySelector('.navbar-toggle');
  const navMenu = document.querySelector('.navbar-menu');
  const menuLinks = document.querySelectorAll('.navbar-menu a');

  if (!toggleBtn || !navMenu) return;

  // Toggle active class on menu
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    toggleBtn.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('active');
  });

  // Close menu when clicking a link
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      toggleBtn.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('active');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      toggleBtn.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('active');
    }
  });
}

/**
 * Modern ScrollSpy using IntersectionObserver
 */
function setupScrollSpy() {
  const sections = document.querySelectorAll('section, header');
  const navLinks = document.querySelectorAll('.navbar-menu a');

  if (sections.length === 0 || navLinks.length === 0) return;

  const observerOptions = {
    root: null,
    rootMargin: '-30% 0px -60% 0px', // Trigger when section occupies the middle portion of viewport
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        if (!id) return;

        navLinks.forEach(link => {
          const href = link.getAttribute('href');
          // Check if href matches local hash or contains the hash
          if (href && (href === `#${id}` || href.endsWith(`#${id}`))) {
            link.classList.add('active');
            link.style.color = 'var(--accent-primary)';
            link.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          } else {
            link.classList.remove('active');
            link.style.color = '';
            link.style.backgroundColor = '';
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });
}

/**
 * Latest blog posts, pulled from the public WordPress.com API.
 *
 * The section ships with a plain link to the blog already in the markup, so if
 * the request fails, is blocked, or JS is off, the visitor still gets a route
 * through to the writing. We only replace that fallback once posts are in hand.
 */
const BLOG_SITE = 'greenido.wordpress.com';
const POST_COUNT = 3;

function loadLatestPosts() {
  const grid = document.getElementById('post-grid');
  if (!grid) return;

  const endpoint = `https://public-api.wordpress.com/rest/v1.1/sites/${BLOG_SITE}/posts/` +
    `?number=${POST_COUNT}&fields=ID,title,URL,date,excerpt,featured_image`;

  fetch(endpoint)
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
    .then(data => {
      const posts = (data && data.posts) || [];
      if (!posts.length) return;
      grid.replaceChildren(...posts.map(buildPostCard));
    })
    .catch(() => {
      // Leave the fallback link in place - nothing else to do.
    });
}

function buildPostCard(post) {
  const card = document.createElement('a');
  card.className = 'glass-card post-card';
  card.href = post.URL;
  card.target = '_blank';
  card.rel = 'noopener';

  if (post.featured_image) {
    const img = document.createElement('img');
    img.className = 'post-thumb';
    // Originals run 1000-1400px wide for a card that renders under 400px.
    // WordPress resizes on the fly, so ask for a 2x-of-widest-card version.
    img.src = resizeFeaturedImage(post.featured_image, 760);
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    card.appendChild(img);
  }

  const body = document.createElement('div');
  body.className = 'post-body';

  const date = document.createElement('span');
  date.className = 'post-date';
  date.textContent = new Date(post.date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const title = document.createElement('h3');
  title.className = 'post-title';
  // The API returns titles with HTML entities (&amp;, &#8217;) but no markup.
  title.textContent = decodeEntities(post.title);

  const excerpt = document.createElement('p');
  excerpt.className = 'post-excerpt';
  excerpt.textContent = truncate(stripHtml(post.excerpt), 120);

  body.append(date, title, excerpt);
  card.appendChild(body);
  return card;
}

/**
 * Ask the WordPress image CDN for a width-constrained, recompressed copy,
 * falling back to the original if the URL will not parse. Adding quality also
 * flips large PNG screenshots to JPEG: one recent post's image goes 2.2MB -> 98KB.
 */
function resizeFeaturedImage(url, width) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('w', width);
    parsed.searchParams.set('quality', '80');
    return parsed.href;
  } catch {
    return url;
  }
}

/** Excerpts arrive as HTML; take the text so nothing from the feed is parsed as markup. */
function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

function decodeEntities(text) {
  const doc = new DOMParser().parseFromString(text || '', 'text/html');
  return (doc.body.textContent || '').trim();
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/**
 * Project filtering and search.
 *
 * The cards are already in the HTML (rendered at build time from
 * data/projects.json), so this only shows and hides them. The controls ship
 * hidden and are revealed here: without JS an inert search box would be worse
 * than none at all.
 */
function setupProjectFilter() {
  const controls = document.getElementById('project-controls');
  const input = document.getElementById('project-search-input');
  const count = document.getElementById('project-result-count');
  if (!controls || !input || !count) return;

  const cards = [...document.querySelectorAll('.project-card')];
  const wrappers = [...document.querySelectorAll('.project-category-wrapper')];
  const chips = [...controls.querySelectorAll('.filter-chip')];
  if (!cards.length) return;

  // Build the haystack once; searching re-reads it on every keystroke.
  const haystacks = new Map(cards.map(card => [card, [
    card.querySelector('.project-card-title')?.textContent || '',
    card.querySelector('.project-card-description')?.textContent || '',
    card.dataset.tags || ''
  ].join(' ').toLowerCase()]));

  let category = 'all';

  function apply() {
    const query = input.value.trim().toLowerCase();
    let visible = 0;

    cards.forEach(card => {
      const matchesCategory = category === 'all' || card.dataset.category === category;
      const matchesQuery = !query || haystacks.get(card).includes(query);
      const show = matchesCategory && matchesQuery;
      card.hidden = !show;
      if (show) visible += 1;
    });

    // Collapse a category heading once everything under it is filtered out.
    wrappers.forEach(wrapper => {
      const anyVisible = [...wrapper.querySelectorAll('.project-card')].some(c => !c.hidden);
      wrapper.hidden = !anyVisible;
    });

    if (!query && category === 'all') {
      count.textContent = '';
    } else if (visible === 0) {
      // The nudge toward the hidden climb. Only ever seen by someone who
      // searched for something that is not here, which is the right audience.
      count.textContent = 'No projects match that search. Try the height of Everest, in metres.';
    } else {
      count.textContent = `Showing ${visible} of ${cards.length} projects`;
    }
  }

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.toggle('active', c === chip));
      category = chip.dataset.filter;
      apply();
    });
  });

  input.addEventListener('input', apply);
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape' && input.value) {
      input.value = '';
      apply();
    }
  });

  controls.hidden = false;
}

/**
 * "Surprise me": jumps to a random project and makes it glow for a moment.
 *
 * Filters are reset first so the pick can land anywhere, and the same card is
 * never picked twice in a row. The result line (a live region) names the pick,
 * so screen reader users get the surprise too.
 */
function setupSurprise() {
  const btn = document.getElementById('surprise-btn');
  const input = document.getElementById('project-search-input');
  const count = document.getElementById('project-result-count');
  const cards = [...document.querySelectorAll('.project-card')];
  if (!btn || !cards.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let last = null;
  let glowTimer = null;

  btn.addEventListener('click', () => {
    if (input && input.value) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const all = document.querySelector('.filter-chip[data-filter="all"]');
    if (all && !all.classList.contains('active')) all.click();

    const pool = cards.filter(c => c !== last);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    last = pick;

    cards.forEach(c => c.classList.remove('is-surprise'));
    // Restart the animation even if the class was only just removed.
    void pick.offsetWidth;
    pick.classList.add('is-surprise');
    clearTimeout(glowTimer);
    glowTimer = setTimeout(() => pick.classList.remove('is-surprise'), 2600);

    pick.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    const link = pick.querySelector('.project-card-link');
    if (link) link.focus({ preventScroll: true });

    const title = pick.querySelector('.project-card-title');
    if (count && title) count.textContent = `🎲 How about ${title.textContent}?`;

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'surprise_me', { project: pick.id });
    }
  });
}

/**
 * "Peek": opens an app in a modal iframe so it can be tried without leaving.
 *
 * The buttons are rendered hidden (see tools/build-projects.js) and only shown
 * here, and only for apps that allow framing. The dialog is built on first use
 * and its iframe is blanked on close so a backgrounded app stops running.
 */
function setupPeek() {
  const buttons = [...document.querySelectorAll('.project-peek')];
  if (!buttons.length || typeof HTMLDialogElement !== 'function') return;

  let dialog = null;
  let frame = null;
  let heading = null;
  let external = null;

  function build() {
    dialog = document.createElement('dialog');
    dialog.className = 'peek-dialog';
    dialog.id = 'peek-dialog';
    dialog.setAttribute('aria-labelledby', 'peek-title');

    const bar = document.createElement('div');
    bar.className = 'peek-bar';

    heading = document.createElement('h2');
    heading.className = 'peek-title';
    heading.id = 'peek-title';

    external = document.createElement('a');
    external.className = 'peek-open';
    external.target = '_blank';
    external.rel = 'noopener';
    external.textContent = 'Open in new tab ↗';

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'peek-close';
    close.setAttribute('aria-label', 'Close preview');
    close.textContent = '×';
    close.addEventListener('click', () => dialog.close());

    frame = document.createElement('iframe');
    frame.className = 'peek-frame';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.setAttribute('allow', 'geolocation');

    bar.append(heading, external, close);
    dialog.append(bar, frame);
    document.body.appendChild(dialog);

    // A click on the backdrop lands on the dialog element itself.
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      frame.src = 'about:blank';
      document.body.classList.remove('peek-open-body');
    });
  }

  function open(url, title) {
    if (!dialog) build();
    heading.textContent = title;
    frame.title = `${title} preview`;
    external.href = url;
    frame.src = url;
    document.body.classList.add('peek-open-body');
    dialog.showModal();

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'peek', { project: title });
    }
  }

  buttons.forEach(btn => {
    btn.hidden = false;
    btn.addEventListener('click', () => open(btn.dataset.peekUrl, btn.dataset.peekTitle));
  });
}

/**
 * Live data on the project cards: I-80 chain controls on Road Conditions and
 * the Palisades Tahoe snow forecast on PowderCast.
 *
 * Each source is only fetched once its card scrolls near the viewport - the
 * Caltrans feed is ~200 KB, which a visitor who never scrolls should not pay.
 * Any failure leaves the slot hidden; the card reads exactly as before.
 */
const LIVE_SOURCES = {
  i80: {
    url: 'https://cwwp2.dot.ca.gov/data/d3/cc/ccStatusD03.json',
    render: renderChainControls
  },
  snow: {
    // Palisades Tahoe. Inches, since the card is about a California resort.
    url: 'https://api.open-meteo.com/v1/forecast?latitude=39.1969&longitude=-120.2358'
      + '&daily=snowfall_sum&precipitation_unit=inch&timezone=America%2FLos_Angeles&forecast_days=3',
    render: renderSnowfall
  }
};

// Caltrans chain control levels, mildest first. Anything unknown sorts as R-0.
const CHAIN_LEVELS = ['R-0', 'R-1', 'R-2', 'R-3'];

function renderChainControls(data) {
  const entries = ((data && data.data) || [])
    .map(d => d.cc)
    .filter(cc => cc && cc.location && cc.location.route === 'I-80' && cc.inService === 'true');
  if (!entries.length) return null;

  let worst = entries[0];
  entries.forEach(cc => {
    if (CHAIN_LEVELS.indexOf(cc.statusData.status) > CHAIN_LEVELS.indexOf(worst.statusData.status)) worst = cc;
  });

  const level = worst.statusData.status;
  if (CHAIN_LEVELS.indexOf(level) <= 0) {
    return { tone: 'ok', text: '🟢 Live: no chain controls on I-80 right now' };
  }
  return {
    tone: 'warn',
    text: `🟠 Live: ${level} chain controls on I-80 near ${worst.location.locationName}`
  };
}

function renderSnowfall(data) {
  const days = data && data.daily && data.daily.snowfall_sum;
  if (!Array.isArray(days) || !days.length) return null;
  const total = days.reduce((sum, n) => sum + (Number(n) || 0), 0);
  if (total < 0.1) {
    return { tone: 'ok', text: '☀️ Live: no new snow at Palisades Tahoe in the next 3 days' };
  }
  const today = Number(days[0]) || 0;
  const lead = today >= 0.1 ? `${today.toFixed(1)}" today, ` : '';
  return {
    tone: 'snow',
    text: `❄️ Live: ${lead}${total.toFixed(1)}" over 3 days at Palisades Tahoe`
  };
}

function setupLiveWidgets() {
  const slots = [...document.querySelectorAll('.project-live[data-live]')]
    .filter(el => LIVE_SOURCES[el.dataset.live]);
  if (!slots.length) return;

  function load(slot) {
    const source = LIVE_SOURCES[slot.dataset.live];
    fetch(source.url)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .then(data => {
        const out = source.render(data);
        if (!out) return;
        slot.textContent = out.text;
        slot.dataset.tone = out.tone;
        slot.hidden = false;
      })
      .catch(() => { /* No live line - the card is still complete without it. */ });
  }

  if (!('IntersectionObserver' in window)) {
    slots.forEach(load);
    return;
  }
  // Watch the card, not the slot: the slot is display:none until it has data,
  // and an element with no box never intersects anything.
  const slotFor = new Map(slots.map(slot => [slot.closest('.project-card') || slot, slot]));
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      load(slotFor.get(entry.target));
    });
  }, { rootMargin: '300px 0px' });
  slotFor.forEach((slot, target) => observer.observe(target));
}

/**
 * The "Right now" strip in the hero.
 *
 * Reads now.json from GitHub first: a scheduled workflow commits fresh GitHub
 * activity there (tools/update-now.js), and raw.githubusercontent.com serves it
 * without waiting for a deploy. The deployed copy is the fallback. If neither
 * loads, the strip stays hidden.
 */
const NOW_SOURCES = [
  'https://raw.githubusercontent.com/greenido/ido-green.appspot.com/master/ido-green/www/data/now.json',
  '/data/now.json'
];

function timeAgo(iso) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return '';
  const seconds = Math.round((then - Date.now()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}

function setupNowStrip() {
  const strip = document.getElementById('now-strip');
  const list = document.getElementById('now-list');
  if (!strip || !list) return;

  const tryFetch = urls => {
    if (!urls.length) return Promise.reject(new Error('no source'));
    return fetch(urls[0], { cache: 'no-cache' })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
      .catch(() => tryFetch(urls.slice(1)));
  };

  tryFetch(NOW_SOURCES)
    .then(now => {
      const items = [];
      const add = (icon, label, value, href) => {
        const li = document.createElement('li');
        li.className = 'now-item';
        const key = document.createElement('span');
        key.className = 'now-key';
        key.textContent = `${icon} ${label}`;
        li.append(key, ' ');
        if (href) {
          const a = document.createElement('a');
          a.href = href;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = value;
          li.append(a);
        } else {
          li.append(value);
        }
        items.push(li);
        return li;
      };

      if (now.building) add('🛠️', 'Building', now.building);
      if (now.reading) add('📚', 'Reading', now.reading);
      const gh = now.github;
      if (gh && gh.repo && /^[\w.-]+\/[\w.-]+$/.test(gh.repo)) {
        const li = add('⌨️', gh.verb || 'Pushed to', gh.repo.split('/')[1], `https://github.com/${gh.repo}`);
        const when = timeAgo(gh.at);
        if (when) li.append(` · ${when}`);
      }
      if (!items.length) return;
      list.replaceChildren(...items);
      strip.hidden = false;
    })
    .catch(() => { /* Nothing to show - the hero is complete without it. */ });
}

/**
 * Decorates the source links with live star counts.
 *
 * One listing request covers every linked repo instead of one call per card:
 * unauthenticated GitHub allows 60 requests/hour per IP, and eleven calls a
 * page view would burn a visitor's quota in six refreshes. If the request fails
 * or the quota is gone, the plain "Source" links stay exactly as rendered -
 * the counts are a bonus, never the reason the link is there.
 */
const GITHUB_USER = 'greenido';

function loadRepoStats() {
  const links = [...document.querySelectorAll('.project-repo[data-repo]')];
  if (!links.length) return;

  fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`)
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(res.status))))
    .then(repos => {
      if (!Array.isArray(repos)) return;
      const stars = new Map(repos.map(r => [r.full_name.toLowerCase(), r.stargazers_count]));

      links.forEach(link => {
        const count = stars.get(link.dataset.repo.toLowerCase());
        if (!count) return; // Missing, or genuinely zero - nothing worth showing.
        const badge = document.createElement('span');
        badge.className = 'repo-stars';
        badge.textContent = ` ★ ${count}`;
        link.appendChild(badge);
      });
    })
    .catch(() => {
      // Rate limited, offline, or the listing moved - the links still work.
    });
}

/**
 * The hidden climb.
 *
 * One secret, two ways to enter it: type the summit height into the project
 * search (the path that works on a phone), or just type it anywhere on the
 * page with nothing focused. It replaced a ten-key Konami sequence - a single
 * short secret is easier to remember, and easier to hint at, than two.
 *
 * Either way the game is fetched on demand: js/easter-egg.js is never part of
 * a normal page load.
 */
const EGG_WORD = '8848';

function setupEasterEgg() {
  let loading = null;
  const input = document.getElementById('project-search-input');
  const stopHints = setupEggHints(input);

  function launch() {
    stopHints();
    try { localStorage.setItem(EGG_FOUND_KEY, '1'); } catch (e) { /* they just will not skip the hints next time */ }
    window.siteEggs.mark('everest');

    if (window.startEverestingEgg) {
      window.startEverestingEgg();
      return;
    }
    // One in-flight request even if both triggers fire together.
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/easter-egg.js?v=6467f086';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(() => { loading = null; });
    }
    loading.then(() => window.startEverestingEgg && window.startEverestingEgg());
  }
  // The terminal's `everest` command climbs the same way.
  window.launchEverestingEgg = launch;

  if (input) {
    input.addEventListener('input', () => {
      if (input.value.trim().toLowerCase() !== EGG_WORD) return;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.blur();
      launch();
    });
  }

  // A rolling buffer of the last few keys, so the secret can be typed anywhere
  // on the page without a field focused.
  let typed = '';
  document.addEventListener('keydown', e => {
    // Ignore it while someone is genuinely typing into a field - the search box
    // has its own handler above.
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key.length !== 1) return;

    typed = (typed + e.key).slice(-EGG_WORD.length);
    if (typed === EGG_WORD) {
      typed = '';
      launch();
    }
  });

  console.log(
    '%cThere is a climb hidden on this page.%c\nType the height of Everest in metres - in the project search, or anywhere on this page.\nAnd if you live in a shell: press ` (backtick).',
    'font: 600 14px system-ui; color: #4fd1e0',
    'font: 13px system-ui; color: #8b95ab'
  );
}

/**
 * Which secrets this visitor has found, kept in localStorage.
 *
 * Shared by the Everest climb and the terminal (js/terminal.js), which shows
 * the count and the hints. The old everesting-egg-found flag predates this
 * list, so anyone who climbed before still gets the credit.
 */
const EGGS = [
  { id: 'everest', name: 'The hidden climb', hint: 'A number you would see on a summit sign.' },
  { id: 'terminal', name: 'The terminal', hint: 'You are already here.' },
  { id: 'sudo', name: 'Admin rights', hint: 'Ask for more power than you have.' },
  { id: 'rm', name: 'Delete everything', hint: 'The command every shell warns you about.' }
];
const EGGS_KEY = 'eggs-found';

window.siteEggs = {
  all: EGGS,
  total: EGGS.length,
  found() {
    let ids = [];
    try {
      ids = JSON.parse(localStorage.getItem(EGGS_KEY)) || [];
      if (localStorage.getItem(EGG_FOUND_KEY) && !ids.includes('everest')) ids.push('everest');
    } catch (e) { /* blocked storage counts as a fresh visitor */ }
    return EGGS.map(e => e.id).filter(id => ids.includes(id));
  },
  /** Records a find. Returns true only the first time. */
  mark(id) {
    const ids = this.found();
    if (ids.includes(id) || !EGGS.some(e => e.id === id)) return false;
    ids.push(id);
    try { localStorage.setItem(EGGS_KEY, JSON.stringify(ids)); } catch (e) { /* it still counts for this visit */ }
    if (typeof window.gtag === 'function') window.gtag('event', 'easter_egg_found', { egg: id });
    return true;
  }
};

/**
 * The hidden terminal: backtick (or ~) anywhere on the page, or "terminal" in
 * the project search on a phone. js/terminal.js is fetched on first use only.
 */
const TERMINAL_WORD = 'terminal';

function setupTerminal() {
  let loading = null;

  function open() {
    if (window.openSiteTerminal) {
      window.openSiteTerminal();
      return;
    }
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/terminal.js?v=2ee99e40';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(() => { loading = null; });
    }
    loading.then(() => window.openSiteTerminal && window.openSiteTerminal());
  }

  document.addEventListener('keydown', e => {
    if (e.key !== '`' && e.key !== '~') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
    if (document.querySelector('dialog[open]')) return; // the terminal handles its own key
    e.preventDefault();
    open();
  });

  const input = document.getElementById('project-search-input');
  if (input) {
    input.addEventListener('input', () => {
      if (input.value.trim().toLowerCase() !== TERMINAL_WORD) return;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      open();
    });
  }
}

/**
 * Nudges toward the hidden climb for anyone who lingers.
 *
 * Thirty seconds on the page earns a hint that the secret exists; thirty more
 * without finding it says where to type it. Only time with the tab in view
 * counts - a hint that lands in a background tab is a hint nobody saw. Anyone
 * who has found the climb before, or dismisses a hint, is left alone.
 *
 * Returns a function that calls the whole thing off.
 */
const EGG_FOUND_KEY = 'everesting-egg-found';
// Tests shorten the wait by setting this before the page loads; nobody else does.
const EGG_HINT_MS = window.__EGG_HINT_MS || 30000;

function setupEggHints(input) {
  const noop = () => {};
  // The hints point at the search box, so a page without one gets none.
  if (!input) return noop;
  try {
    if (localStorage.getItem(EGG_FOUND_KEY)) return noop;
  } catch (e) { /* blocked storage - show the hints */ }

  const steps = [
    { before: 'There is a hidden climb on this page. Its secret is ', after: '.' },
    { before: 'Still looking? Type ', after: ' into the project search box.', action: 'Take me there' }
  ];

  // A live region is only announced reliably if it already exists when its
  // content changes, so it goes in now, empty (and hidden by :empty in CSS).
  const toast = document.createElement('div');
  toast.className = 'egg-hint';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);

  let step = 0;
  let remaining = EGG_HINT_MS;
  let startedAt = 0;
  let timer = null;

  function show({ before, after, action }) {
    const text = document.createElement('p');
    text.className = 'egg-hint-text';
    const code = document.createElement('strong');
    code.textContent = EGG_WORD;
    text.append(before, code, after);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'egg-hint-close';
    close.setAttribute('aria-label', 'Dismiss hint');
    close.textContent = '×';
    close.addEventListener('click', stop);

    toast.replaceChildren(text);
    if (action) {
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'egg-hint-action';
      go.textContent = action;
      go.addEventListener('click', () => {
        input.scrollIntoView({ block: 'center' });
        input.focus({ preventScroll: true });
      });
      toast.append(go);
    }
    toast.append(close);

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'easter_egg_hint', { egg: 'everesting', step: step + 1 });
    }
  }

  function fire() {
    timer = null;
    show(steps[step]);
    step += 1;
    remaining = EGG_HINT_MS;
    resume();
  }

  function resume() {
    if (timer || document.hidden || step >= steps.length) return;
    startedAt = performance.now();
    timer = setTimeout(fire, remaining);
  }

  function pause() {
    if (!timer) return;
    clearTimeout(timer);
    timer = null;
    remaining -= performance.now() - startedAt;
  }

  function onVisibility() {
    if (document.hidden) pause();
    else resume();
  }

  function stop() {
    pause();
    step = steps.length;
    document.removeEventListener('visibilitychange', onVisibility);
    toast.replaceChildren();
  }

  document.addEventListener('visibilitychange', onVisibility);
  resume();
  return stop;
}
