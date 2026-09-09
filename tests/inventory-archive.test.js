'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/inventory-core.js');
const {mergeCatalog} = require('../scripts/build-inventory.js');
const {reconcileInventory} = require('../scripts/reconcile-inventory.js');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
const baseline = mergeCatalog(read('assets/inventory-catalog.json'),read('assets/inventory-additions-20260909.json'));
const result = reconcileInventory(baseline,read('data/inventory-snapshot-20260909.json'));
const committed = read('data/inventory-archive-20260909.json');

test('Permanent archive exactly matches the current reconciliation', () => {
  assert.deepEqual(committed,result.archive);
  const active = core.prepareCatalog(result.catalog);
  const archived = committed.products.flatMap(p=>p.variants);
  assert.equal(archived.length,18);
  assert.equal(new Set(archived.map(v=>v.sku)).size,18);
  for(const item of archived) {
    assert.equal(active.bySku.has(item.sku),false);
    assert.ok(['withdrawn','out_of_stock','review','absent_from_snapshot'].includes(item.status));
    assert.ok(Number.isFinite(item.price) && item.price>0);
    assert.ok(Number.isSafeInteger(item.stock) && item.stock>=0);
  }
});

test('Archived families retain their original identity and image for later reactivation', () => {
  const previous = core.prepareCatalog(baseline);
  for(const entry of committed.products) {
    const old = previous.byId.get(entry.product.id);
    if(!old) continue;
    for(const key of ['id','name','brand','category','presentation','image'])
      assert.deepEqual(entry.product[key],old[key],`${entry.product.id}.${key}`);
  }
});
