'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const core = require('../assets/inventory-core.js');
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/inventory-catalog.json'), 'utf8'));
const catalog = core.prepareCatalog(raw);
const variants = catalog.products.flatMap((p) => p.variants);
const digest = crypto.createHash('sha256').update(JSON.stringify(variants.map((v) => [v.sku, v.tone, v.price, v.stock]).sort((a,b) => a[0].localeCompare(b[0])))).digest('hex');

test('The approved retail inventory is published, with no demo products', () => {
  assert.equal(catalog.products.length, 27);
  assert.equal(variants.length, 79);
  assert.equal(catalog.bySku.size, 79);
  assert.equal(variants.reduce((sum,v) => sum+v.stock,0),126);
  assert.equal(variants.reduce((sum,v) => sum+v.stock*v.price,0),56650);
  assert.deepEqual([...new Set(variants.map((v) => v.price))].sort((a,b)=>a-b),[350,360,420,480,500]);
  assert.equal(raw.source.cutoff,'2026-09-08T22:46:19-06:00');
  assert.equal(digest,'47104afa509aa51a1f609d47b33cd20313327f1faaaeb891bad0dee69c6ebbe0');
});
test('Discontinued Advanced Radiance is removed without removing other Covergirl products', () => {
  assert.equal(catalog.byId.has('base-advanced-radiance-de-covergirl'),false);
  assert.equal(catalog.bySku.has('FARA00013120'),false);
  assert.equal(core.filterProducts(catalog,{query:'Advanced Radiance'}).length,0);
  assert.ok(catalog.byId.has('base-outlast-active-de-covergirl'));
  assert.deepEqual(core.sanitizeCart(catalog,[{sku:'FARA00013120',quantity:1},{sku:'FARA00020205',quantity:1}]),[{sku:'FARA00020205',quantity:1}]);
});
test('No internal cost, wholesale, warehouse or expiration fields are published', () => {
  const text=JSON.stringify(raw);
  for(const name of ['cost','wholesale','warehouse','barcode','expiration','inventoryValue','precioMayor','costo','bodega']) assert.ok(!text.toLowerCase().includes(name.toLowerCase()),name);
});
test('Source shade identities and separate finishes remain intact', () => {
  assert.equal(catalog.bySku.get('FARA000054555').tone,'4.5-5.5');
  assert.equal(catalog.bySku.get('FARA00001005').tone,'0.5');
  assert.equal(catalog.bySku.get('FARA0000TANN').tone,'Tan Neutral');
  assert.equal(catalog.bySku.get('FARA00025600').productId,'labial-infallible-laque-resistance-de-loreal');
  assert.notEqual(catalog.bySku.get('FARA00025600').productId,catalog.bySku.get('FARA00025601').productId);
});
test('Cart quantities are limited by SKU; distinct tones stay separate', () => {
  let cart=[];
  cart=core.changeCart(catalog,cart,'FARA00002415',1);
  cart=core.changeCart(catalog,cart,'FARA00002415',10);
  cart=core.changeCart(catalog,cart,'FARA00002420',1);
  assert.equal(core.totals(catalog,cart).quantity,6);
  assert.equal(core.totals(catalog,cart).subtotal,2880);
  assert.equal(cart.find((v)=>v.sku==='FARA00002415').quantity,5);
  assert.equal(cart.find((v)=>v.sku==='FARA00002420').quantity,1);
  cart=core.changeCart(catalog,cart,'FARA00002415',-2);
  assert.equal(core.totals(catalog,cart).quantity,4);
});
test('Legacy demo IDs, removed SKUs and invalid quantities cannot enter orders', () => {
  const cart=core.sanitizeCart(catalog,[{id:1,tone:'Porcelain',quantity:2},{sku:'UNKNOWN',quantity:2},{sku:'FARA00013120',quantity:50},{sku:'FARA00020205',quantity:50},{sku:'FARA00020205',quantity:-3}]);
  assert.deepEqual(cart,[{sku:'FARA00020205',quantity:1}]);
});
test('Search finds source SKU, accents and shades; filters and sorting work', () => {
  assert.equal(core.filterProducts(catalog,{query:'FARA0000TANN'}).length,1);
  assert.equal(core.filterProducts(catalog,{query:'loreal',category:'Labiales'}).length,2);
  assert.ok(core.filterProducts(catalog,{query:'0.5'}).some((p)=>p.id==='base-halo-glow-de-e-l-f'));
  assert.equal(core.filterProducts(catalog,{category:'Correctores'}).length,5);
  const sorted=core.filterProducts(catalog,{sort:'price-asc'});
  assert.equal(sorted[0].category,'Labiales');
  assert.equal(sorted[sorted.length-1].name,'Polvo facial suelto Airspun de Coty');
});
test('Malformed data and duplicate SKUs fail closed', () => {
  const bad=structuredClone(raw);
  bad.products[0].variants[0].sku=bad.products[1].variants[0].sku;
  assert.throws(()=>core.prepareCatalog(bad),/SKU duplicado/);
  const negative=structuredClone(raw);
  negative.products[0].variants[0].stock=-1;
  assert.throws(()=>core.prepareCatalog(negative),/Existencia no válida/);
});
test('Every configured photo exists in the approved repository image manifest', () => {
  const approved=new Set(['assets/products/Infallible Fresh Wear 32H.jpg','assets/products/Infallible Pro-Matte 24H.webp','assets/products/True Match Super-Blendable Foundation.png','assets/products/True Match Super-Blendable Powder.png']);
  for(const product of catalog.products) if(product.image) assert.ok(approved.has(product.image),product.image);
  assert.equal(catalog.products.filter((p)=>p.image).length,4);
});
test('Customer-facing SKU and exact-stock metadata remain hidden without changing cart limits', () => {
  const css=fs.readFileSync(path.join(__dirname,'../assets/inventory-store.css'),'utf8');
  assert.match(css,/\.inventory-sku\s*,\s*\.inventory-stock\s*,\s*#productDetailSku\s*,\s*#productDetailStock\s*\{\s*display:\s*none\s*!important;/);
  assert.equal(core.changeCart(catalog,[],'FARA00020205',5)[0].quantity,1);
});
