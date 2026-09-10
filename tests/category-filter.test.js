'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../assets/inventory-document.js');
const core = require('../assets/inventory-core.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/inventory.json'), 'utf8'));
const catalog = api.prepareCatalog(data);
const filter = (category, query = '') => api.filterProducts(catalog, {category, query, sort:'featured'});
const skinInkId = 'base-y-corrector-skin-ink-de-loreal';

test('Skin Ink appears under both Bases and Correctores without a duplicate category button', () => {
  const raw = data.products.find(p => p.id === skinInkId);
  assert.ok(raw);
  assert.equal(raw.category, 'Bases y corrector');
  assert.ok(raw.variants.some(v => v.status === 'active' && v.stock > 0));
  assert.deepEqual(catalog.byId.get(skinInkId).categories, ['Bases', 'Correctores']);
  assert.ok(filter('Bases').some(p => p.id === skinInkId));
  assert.ok(filter('Correctores').some(p => p.id === skinInkId));
  assert.equal(filter('Todos').filter(p => p.id === skinInkId).length, 1);
  assert.equal(catalog.categories.includes('Bases y corrector'), false);
  assert.equal(catalog.categories.includes('Bases y correctores'), false);
});

test('Category filters cover every active family without duplicating cards', () => {
  const all = filter('Todos');
  const seen = new Set();
  for (const category of catalog.categories.filter(c => c !== 'Todos')) {
    const products = filter(category);
    assert.equal(new Set(products.map(p => p.id)).size, products.length, category);
    for (const product of products) {
      assert.ok(product.categories.includes(category), `${product.id} no pertenece a ${category}`);
      seen.add(product.id);
    }
  }
  assert.deepEqual(seen, new Set(all.map(p => p.id)));
  assert.deepEqual(new Set(filter('Bases').map(p => p.id)), new Set(all.filter(p => p.category === 'Bases' || p.id === skinInkId).map(p => p.id)));
  assert.ok(filter('Bases', 'Skin Ink').some(p => p.id === skinInkId));
  assert.ok(filter('Correctores', 'Skin Ink').some(p => p.id === skinInkId));
  assert.equal(filter('Labiales').some(p => p.id === skinInkId), false);
});

test('Explicit multiple categories work for future families without changing SKU identity', () => {
  const raw = {schemaVersion:2, currency:'HNL', products:[{
    id:'test-mixed', name:'Producto de prueba', brand:'FARA', category:'Paletas',
    description:'Descripción de prueba para validar el catálogo.',
    categories:['Paletas','Rubores'], variants:[{sku:'FARATEST001',tone:'Único',price:100,stock:2}]
  }]};
  const prepared = core.prepareCatalog(raw);
  assert.deepEqual(prepared.categories, ['Todos','Paletas','Rubores']);
  for (const category of ['Paletas','Rubores']) {
    assert.equal(core.filterProducts(prepared,{category,query:'',sort:'featured'}).length,1);
  }
  assert.equal(core.sanitizeCart(prepared,[{sku:'FARATEST001',quantity:3}])[0].quantity,2);
  assert.throws(() => core.prepareCatalog({...raw,products:[{...raw.products[0],categories:[]}]}), /Categorías de producto no válidas/);
});

test('The filtering change preserves prices, tones, stock and archived exclusions', () => {
  const inspection = api.inspectInventory(data);
  assert.equal(inspection.catalog.bySku.size, inspection.stats.activeSkus);
  for (const product of data.products) {
    for (const variant of product.variants) {
      const published = catalog.bySku.get(variant.sku);
      if (variant.status !== 'active' || variant.stock === 0) {
        assert.equal(published, undefined);
      } else {
        assert.ok(published);
        assert.deepEqual([published.tone,published.price,published.stock,published.productId],
          [variant.tone,variant.price,variant.stock,product.id]);
      }
    }
  }
  assert.deepEqual([inspection.stats.products,inspection.stats.skus,inspection.stats.activeSkus,inspection.stats.activeUnits],[62,304,282,493]);
});
