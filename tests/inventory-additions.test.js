'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('../assets/inventory-core.js');
const {mergeCatalog,buildInventory} = require('../scripts/build-inventory.js');
const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
const base = read('assets/inventory-catalog.json');
const delta = read('assets/inventory-additions-20260909.json');
const review = read('data/inventory-review-20260909.json');
const variants = delta.products.flatMap(p => p.variants);
const merged = mergeCatalog(base,delta);
const catalog = core.prepareCatalog(merged);

test('Only the new, identified references are mapped from the September 9 export', () => {
  assert.equal(variants.length,72);
  assert.equal(new Set(variants.map(v=>v.sku)).size,72);
  assert.equal(variants.reduce((s,v)=>s+v.stock,0),123);
  assert.equal(variants.reduce((s,v)=>s+v.stock*v.price,0),44500);
  const digest = crypto.createHash('sha256').update(JSON.stringify(variants.map(v=>[v.sku,v.price,v.stock]).sort((a,b)=>a[0].localeCompare(b[0])))).digest('hex');
  assert.equal(digest,'02699103bd6816d21b053142ce1c9dce60bddc34c6d26e2262f827a431217936');
  assert.equal(delta.source.cutoff,'2026-09-09T00:18:05-06:00');
  assert.equal(review.newSkuCount,75);
  assert.equal(review.pendingSkuCount,3);
  assert.equal(review.pending.reduce((s,v)=>s+v.reportedStock,0),4);
});

test('The existing catalog and its photos, tones, prices and stocks are preserved', () => {
  const before = JSON.stringify(base);
  assert.equal(base.products.length,27);
  assert.equal(core.prepareCatalog(base).bySku.size,79);
  assert.equal(catalog.products.length,45);
  assert.equal(catalog.bySku.size,151);
  assert.equal(catalog.products.reduce((s,p)=>s+p.stock,0),249);
  for(const p of base.products) {
    const combined=merged.products.find(q=>q.id===p.id);
    assert.ok(combined,p.id);
    for(const key of ['id','brand','name','category','presentation','image']) assert.deepEqual(combined[key],p[key]);
    assert.deepEqual(combined.variants.slice(0,p.variants.length),p.variants);
  }
  assert.equal(JSON.stringify(base),before);
  assert.equal(merged.source.cutoff,base.source.cutoff);
  assert.equal(merged.source.additionsCutoff,delta.source.cutoff);
  assert.deepEqual(mergeCatalog(merged,delta),merged);
});

test('Discontinued and unidentified references cannot enter the catalog or cart', () => {
  const excluded=['FARA00013120',...review.pending.map(p=>p.sku)];
  for(const sku of excluded) {
    assert.equal(catalog.bySku.has(sku),false);
    assert.deepEqual(core.sanitizeCart(catalog,[{sku,quantity:1}]),[]);
  }
  assert.equal(catalog.bySku.get('FARA00025600').productId,'labial-infallible-laque-resistance-de-loreal');
  assert.equal(catalog.bySku.get('FARA00026600').productId,'labial-infallible-matte-resistance-de-loreal');
  assert.equal(catalog.bySku.get('FARA00026220').productId,'labial-infallible-laque-resistance-de-loreal');
  assert.equal(catalog.bySku.get('FARA00026600').price,350);
  assert.equal(catalog.bySku.get('FARA00026600').stock,3);
});

test('Incremental import is idempotent and refuses collisions', () => {
  const copy=structuredClone(delta);
  copy.products[0].variants[0].sku=base.products[0].variants[0].sku;
  assert.throws(()=>mergeCatalog(base,copy),/otra familia/);
  const duplicate=structuredClone(delta);
  duplicate.products[0].variants[1].sku=duplicate.products[0].variants[0].sku;
  assert.throws(()=>mergeCatalog(base,duplicate),/SKU duplicado/);
  const tone=structuredClone(delta);
  tone.products[0].variants[1].tone=tone.products[0].variants[0].tone;
  assert.throws(()=>mergeCatalog(base,tone),/Tono duplicado/);
  const old=structuredClone(delta);
  old.products[0].variants[0].sku='FARA00013120';
  assert.throws(()=>mergeCatalog(base,old),/excluida/);
});

test('New quantities stay separate per SKU and are limited by stock', () => {
  let cart=core.changeCart(catalog,[],'FARA00043241',20);
  cart=core.changeCart(catalog,cart,'FARA00028025',2);
  assert.deepEqual(cart,[{sku:'FARA00043241',quantity:6},{sku:'FARA00028025',quantity:2}]);
  assert.deepEqual(core.totals(catalog,cart),{quantity:8,subtotal:2800});
});

test('The production build writes the merged catalog without changing the source', () => {
  const os=require('node:os');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'fara-catalog-'));
  try {
    const before=fs.readFileSync(path.join(__dirname,'../assets/inventory-catalog.json'));
    const output=path.join(dir,'inventory-catalog.json');
    const result=buildInventory(output);
    assert.deepEqual({products:result.products,skus:result.skus,units:result.units},{products:45,skus:151,units:249});
    assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')),merged);
    assert.deepEqual(fs.readFileSync(path.join(__dirname,'../assets/inventory-catalog.json')),before);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
