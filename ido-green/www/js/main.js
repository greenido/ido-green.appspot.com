/**
 * Ido Green Personal Site - Modern Vanilla JS
 * Handles responsive navigation toggle and IntersectionObserver-based ScrollSpy.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupMobileNav();
  setupScrollSpy();
  loadLatestPosts();
  setupProjectFilter();
  loadRepoStats();
  setupEasterEgg();
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

  function launch() {
    if (window.startEverestingEgg) {
      window.startEverestingEgg();
      return;
    }
    // One in-flight request even if both triggers fire together.
    if (!loading) {
      loading = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/easter-egg.js?v=0de9f912';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }).catch(() => { loading = null; });
    }
    loading.then(() => window.startEverestingEgg && window.startEverestingEgg());
  }

  const input = document.getElementById('project-search-input');
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
    '%cThere is a climb hidden on this page.%c\nType the height of Everest in metres - in the project search, or anywhere on this page.',
    'font: 600 14px system-ui; color: #4fd1e0',
    'font: 13px system-ui; color: #8b95ab'
  );
}
