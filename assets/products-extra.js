'use strict';
// Shared enhancements loaded by both storefront pages.
(function () {
  const icons = {
    Instagram: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r=".9" fill="currentColor" stroke="none"></circle></svg>',
    Facebook: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M13.7 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.6 1.7-1.6H17V3.8c-.3 0-1.4-.1-2.6-.1-2.7 0-4.4 1.6-4.4 4.6V10H7v3h3v8h3.7z"></path></svg>',
    TikTok: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v10.2a4.2 4.2 0 1 1-3.1-4.1"></path><path d="M14 3c.5 2.4 2 3.8 4.5 4.2"></path></svg>'
  };

  function decorateSocialLinks() {
    document.querySelectorAll('.footer > div').forEach((group) => {
      const heading = group.querySelector('strong');
      if (!heading || heading.textContent.trim().toLowerCase() !== 'síguenos') return;

      group.querySelectorAll('a').forEach((link) => {
        const name = link.textContent.trim();
        const icon = icons[name];
        if (!icon || link.dataset.socialIcon === 'true') return;

        link.dataset.socialIcon = 'true';
        link.style.display = 'inline-flex';
        link.style.alignItems = 'center';
        link.style.gap = '8px';
        link.innerHTML = `${icon}<span>${name}</span>`;
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorateSocialLinks, {once: true});
  } else {
    decorateSocialLinks();
  }
})();
