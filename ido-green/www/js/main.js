/**
 * Ido Green Personal Site - Modern Vanilla JS
 * Handles responsive navigation toggle and IntersectionObserver-based ScrollSpy.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupMobileNav();
  setupScrollSpy();
  loadLatestPosts();
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
