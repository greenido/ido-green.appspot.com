/**
 * Ido Green Personal Site - Modern Vanilla JS
 * Handles responsive navigation toggle and IntersectionObserver-based ScrollSpy.
 */

document.addEventListener('DOMContentLoaded', () => {
  setupMobileNav();
  setupScrollSpy();
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