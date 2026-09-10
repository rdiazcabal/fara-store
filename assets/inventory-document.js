/* The single inventory document is authoritative; only active variants reach shopping. */
(function (root, factory) {
  'use strict';
  const core = typeof module === 'object' && module.exports ? require('./inventory-core.js') : root.FaraCatalog;
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FaraInventory = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (core) {
  'use strict';
  const statuses = new Set(['active', 'out_of_stock', 'withdrawn', 'review', 'absent_from_snapshot']);
  function assert(ok, message) { if (!ok) throw new Error(message); }
  function normalizeTone(value) { return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es'); }
  function inspectInventory(raw) {
    assert(raw && raw.schemaVersion === 3 && Array.isArray(raw.products), 'Formato único de inventario no válido');
    assert(raw.currency === 'HNL' && raw.source && typeof raw.source === 'object', 'Moneda u origen no válido');
    const ids = new Set();
    const allBySku = new Map();
    const activeProducts = [];
    const stats = {products: 0, skus: 0, units: 0, activeProducts: 0, activeSkus: 0, activeUnits: 0, archivedSkus: 0, statuses: {}};
    for (const product of raw.products) {
      assert(product && typeof product.id === 'string' && product.id && !ids.has(product.id), 'ID de producto duplicado o inválido');
      ids.add(product.id);
      for (const field of ['name', 'brand', 'category']) assert(typeof product[field] === 'string' && product[field].trim(), `Campo ${field} inválido en ${product.id}`);
      assert(typeof product.description === 'string' && product.description.trim(), `Descripción inválida en ${product.id}`);
      assert(Array.isArray(product.variants) && product.variants.length > 0, `Producto sin referencias: ${product.id}`);
      const tones = new Set();
      const active = [];
      for (const item of product.variants) {
        assert(item && typeof item.sku === 'string' && /^FARA[A-Z0-9]+$/.test(item.sku) && !allBySku.has(item.sku), `SKU duplicado o inválido: ${item && item.sku}`);
        assert(typeof item.tone === 'string' && item.tone.trim(), `Tono inválido: ${item.sku}`);
        assert(Number.isFinite(item.price) && item.price > 0, `Precio inválido: ${item.sku}`);
        assert(Number.isSafeInteger(item.stock) && item.stock >= 0, `Stock inválido: ${item.sku}`);
        assert(statuses.has(item.status), `Estado inválido: ${item.sku}`);
        if (item.sourceRows !== undefined) assert(Array.isArray(item.sourceRows) && item.sourceRows.every(n => Number.isSafeInteger(n) && n > 1), `Filas de origen inválidas: ${item.sku}`);
        if (item.reason !== undefined) assert(typeof item.reason === 'string', `Motivo inválido: ${item.sku}`);
        if (item.status === 'active') {
          assert(item.stock > 0, `Referencia activa sin existencias: ${item.sku}`);
          const tone = normalizeTone(item.tone);
          assert(!tones.has(tone), `Tono activo duplicado en ${product.id}: ${item.tone}`);
          tones.add(tone);
          active.push({sku:item.sku,tone:item.tone,price:item.price,stock:item.stock});
          stats.activeSkus++;
          stats.activeUnits += item.stock;
        } else {
          if (item.status === 'out_of_stock') assert(item.stock === 0, `Agotado con existencias: ${item.sku}`);
          stats.archivedSkus++;
        }
        allBySku.set(item.sku, {productId:product.id, ...item});
        stats.skus++;
        stats.units += item.stock;
        stats.statuses[item.status] = (stats.statuses[item.status] || 0) + 1;
      }
      if (active.length) {
        activeProducts.push({...product, variants:active});
        stats.activeProducts++;
      }
    }
    stats.products = ids.size;
    assert(stats.skus === stats.activeSkus + stats.archivedSkus, 'El inventario perdió referencias');
    const activeDocument = {schemaVersion:2,source:raw.source,currency:raw.currency,products:activeProducts};
    const catalog = core.prepareCatalog(activeDocument);
    return {document:raw,catalog,allBySku,stats};
  }
  function prepareCatalog(raw) { return inspectInventory(raw).catalog; }
  return Object.freeze({...core,inspectInventory,prepareCatalog});
});
