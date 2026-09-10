'use strict';
// The home page uses the same real inventory as the complete catalog.
// The previous demo products remain available in Git history, not in the storefront.
(() => {
  const script = document.createElement('script');
  script.src = 'assets/inventory-loader.js?v=20260910-descriptions1';
  script.async = false;
  document.body.appendChild(script);
})();
