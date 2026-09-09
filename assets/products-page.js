'use strict';
// The complete catalog shares the real inventory engine with the home page.
(() => {
  const script = document.createElement('script');
  script.src = 'assets/inventory-loader.js?v=20260908-catalog2';
  script.async = false;
  document.body.appendChild(script);
})();
