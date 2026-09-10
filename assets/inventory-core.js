/* FARA inventory catalog: pure, testable data and cart operations. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FaraCatalog = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }
  function normalizeSearch(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u0027\u2019`\u00b4.]/g, '').toLowerCase();
  }
  // An inventory family may belong to several shopping categories. Preserve
  // its original label and expand known legacy mixed labels for filtering.
  const categoryAliases = Object.freeze({
    'bases y corrector': Object.freeze(['Bases', 'Correctores']),
    'bases y correctores': Object.freeze(['Bases', 'Correctores'])
  });
  function productCategories(original) {
    const categories = original.categories === undefined
      ? (categoryAliases[normalizeSearch(original.category).trim()] || [original.category])
      : original.categories;
    assert(Array.isArray(categories) && categories.length > 0, 'Categorías de producto no válidas');
    assert(categories.every((category) => typeof category === 'string' && category.trim()), 'Categoría de producto no válida');
    return Object.freeze([...new Set(categories.map((category) => category.trim()))]);
  }
  function prepareCatalog(raw) {
    assert(raw && raw.schemaVersion === 2 && Array.isArray(raw.products), 'Formato de catálogo no válido');
    const products = [];
    const byId = new Map();
    const bySku = new Map();
    for (const original of raw.products) {
      assert(original && typeof original.id === 'string' && original.id && !byId.has(original.id), 'ID de producto duplicado o inválido');
      assert(typeof original.name === 'string' && original.name.trim(), 'Nombre de producto no válido');
      assert(typeof original.brand === 'string' && original.brand.trim(), 'Marca no válida');
      assert(typeof original.category === 'string' && original.category.trim(), 'Categoría no válida');
      assert(typeof original.description === 'string' && original.description.trim(), 'Descripción no válida');
      assert(Array.isArray(original.variants) && original.variants.length, 'Producto sin variantes');
      const categories = productCategories(original);
      const tones = new Set();
      const variants = original.variants.map((item) => {
        assert(item && typeof item.sku === 'string' && item.sku && !bySku.has(item.sku), 'SKU duplicado o inválido');
        assert(typeof item.tone === 'string' && item.tone.trim() && !tones.has(item.tone), 'Tono duplicado o inválido');
        assert(Number.isFinite(item.price) && item.price > 0, 'Precio no válido');
        assert(Number.isSafeInteger(item.stock) && item.stock >= 0, 'Existencia no válida');
        tones.add(item.tone);
        const variant = Object.freeze({sku: item.sku, tone: item.tone, price: item.price, stock: item.stock, productId: original.id});
        bySku.set(variant.sku, variant);
        return variant;
      });
      const product = Object.freeze({
        id: original.id, name: original.name, brand: original.brand,
        category: original.category, categories, presentation: original.presentation || '',
        description: original.description, image: original.image || null, variants: Object.freeze(variants),
        stock: variants.reduce((sum, item) => sum + item.stock, 0)
      });
      byId.set(product.id, product);
      products.push(product);
    }
    assert(products.length > 0, 'El catálogo está vacío');
    return Object.freeze({
      products: Object.freeze(products), byId, bySku,
      categories: Object.freeze(['Todos', ...new Set(products.flatMap((p) => p.categories))]),
      source: raw.source || {}, currency: raw.currency || 'HNL'
    });
  }
  function sanitizeCart(catalog, entries) {
    if (!Array.isArray(entries)) return [];
    const quantities = new Map();
    for (const entry of entries) {
      // Only current, explicit SKU selections are accepted. Legacy demo IDs are not inventory SKUs.
      if (!entry || typeof entry.sku !== 'string') continue;
      const variant = catalog.bySku.get(entry.sku);
      if (!variant || variant.stock === 0) continue;
      const quantity = Number(entry.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1) continue;
      quantities.set(variant.sku, Math.min(variant.stock, (quantities.get(variant.sku) || 0) + quantity));
    }
    return [...quantities].map(([sku, quantity]) => ({sku, quantity}));
  }
  function changeCart(catalog, cart, sku, delta) {
    const variant = catalog.bySku.get(sku);
    if (!variant || !Number.isSafeInteger(delta)) return sanitizeCart(catalog, cart);
    const next = sanitizeCart(catalog, cart);
    const existing = next.find((item) => item.sku === sku);
    const quantity = Math.max(0, Math.min(variant.stock, (existing ? existing.quantity : 0) + delta));
    return sanitizeCart(catalog, [...next.filter((item) => item.sku !== sku), ...(quantity ? [{sku, quantity}] : [])]);
  }
  function totals(catalog, cart) {
    return sanitizeCart(catalog, cart).reduce((total, item) => {
      const variant = catalog.bySku.get(item.sku);
      total.quantity += item.quantity;
      total.subtotal = Math.round((total.subtotal + variant.price * item.quantity) * 100) / 100;
      return total;
    }, {quantity: 0, subtotal: 0});
  }
  function filterProducts(catalog, options) {
    const query = normalizeSearch(options.query).trim();
    const filtered = catalog.products.filter((product) => {
      if (options.category && options.category !== 'Todos' && !product.categories.includes(options.category)) return false;
      if (!query) return true;
      return normalizeSearch([product.name, product.brand, product.category, product.description, ...product.categories, ...product.variants.flatMap((v) => [v.tone, v.sku])].join(' ')).includes(query);
    });
    const price = (product) => Math.min(...product.variants.map((v) => v.price));
    if (options.sort === 'price-asc') filtered.sort((a, b) => price(a) - price(b) || a.name.localeCompare(b.name, 'es'));
    if (options.sort === 'price-desc') filtered.sort((a, b) => price(b) - price(a) || a.name.localeCompare(b.name, 'es'));
    if (options.sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return filtered;
  }
  return Object.freeze({prepareCatalog, sanitizeCart, changeCart, totals, filterProducts});
});
