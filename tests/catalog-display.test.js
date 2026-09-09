'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('The catalog heading has no public inventory counter', () => {
  const html = read('productos.html');
  const store = read('assets/inventory-store.js');
  assert.doesNotMatch(html, /id=["']resultCount["']/);
  assert.doesNotMatch(store, /#resultCount/);
  assert.match(html, /id="catalogTitle">Todos los productos<\/h2>/);
});

test('Cards show presentation without a count of shades', () => {
  const store = read('assets/inventory-store.js');
  assert.match(store, /<p class="retail-description">\$\{escape\(product\.presentation \|\| 'Presentación por confirmar'\)\}<\/p>/);
  assert.doesNotMatch(store, /product\.variants\.length/);
  assert.match(store, /data-tone-select/);
  assert.match(store, /value="\$\{escape\(v\.sku\)\}"/);
});

test('Both pages load the same fresh storefront version', () => {
  const version = '20260909-clean1';
  assert.ok(read('index.html').includes(`assets/app.js?v=${version}`));
  assert.ok(read('productos.html').includes(`assets/products-page.js?v=${version}`));
  for (const file of ['assets/app.js', 'assets/products-page.js']) {
    assert.ok(read(file).includes(`assets/inventory-loader.js?v=${version}`));
  }
  assert.ok(read('assets/inventory-loader.js').includes(`const version = '${version}'`));
  assert.match(read('assets/inventory-loader.js'), /load\('inventory-store\.js'\)/);
});
