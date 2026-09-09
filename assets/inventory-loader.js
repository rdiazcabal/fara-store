'use strict';
/* The two original entry points now load the same inventory-based storefront.
   The demo catalog and its invented variant list are deliberately not executed. */
(() => {
  if (window.__faraInventoryBootstrapped) return;
  window.__faraInventoryBootstrapped = true;
  const version = '20260908-inventory1';
  const addStyle = (file) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `assets/${file}?v=${version}`;
    document.head.appendChild(link);
  };
  addStyle('product-detail.css');
  addStyle('inventory-store.css');
  const grid = document.querySelector('#retailProductGrid, #productGrid');
  if (!grid) return;
  const section = grid.closest('section');
  const notice = document.createElement('p');
  notice.id = 'inventoryNotice';
  notice.className = 'inventory-notice';
  grid.before(notice);
  const status = document.createElement('div');
  status.id = 'inventoryStatus';
  status.className = 'inventory-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  section.appendChild(status);
  const heroText = document.querySelector('.products-hero-copy > p');
  if (heroText) heroText.textContent = 'Explora las bases, correctores, labiales, bronceadores y polvos disponibles en FARA. Elige tu tonalidad y prepara tu pedido por WhatsApp.';
  const homeHeading = document.querySelector('.catalog .section-heading h2');
  if (homeHeading) homeHeading.textContent = 'La selección FARA';
  const homeText = document.querySelector('.catalog .section-heading > p');
  if (homeText) homeText.textContent = 'Descubre los productos disponibles en nuestra tienda y encuentra tu tonalidad favorita.';
  const load = (file) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `assets/${file}?v=${version}`;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
  load('inventory-core.js').then(() => load('inventory-store.js')).catch(() => {
    grid.innerHTML = '<div class="products-empty"><h3>No pudimos cargar el catálogo</h3><p>Recarga la página para intentarlo de nuevo.</p></div>';
  });
})();