'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../assets/inventory-core.js');
const {mergeCatalog}=require('../scripts/build-inventory.js');
const {reconcileInventory,WITHDRAWN}=require('../scripts/reconcile-inventory.js');
const read=p=>JSON.parse(fs.readFileSync(path.join(__dirname,'..',p),'utf8'));
const baseline=mergeCatalog(read('assets/inventory-catalog.json'),read('assets/inventory-additions-20260909.json'));
const source=read('data/inventory-snapshot-20260909.json');
const result=reconcileInventory(baseline,source);
const catalog=core.prepareCatalog(result.catalog);
const archived=result.archive.products.flatMap(p=>p.variants);
const byArchive=new Map(archived.map(v=>[v.sku,v]));
const original=core.prepareCatalog(baseline);

test('The complete sanitized source is reconciled without costs or wholesale fields',()=>{
  assert.equal(result.report.stats.sourceRows,233);
  assert.equal(result.report.stats.sourceSkus,227);
  assert.equal(result.report.stats.sourceUnits,408);
  assert.equal(original.bySku.size,151);
  assert.equal(original.products.length,45);
  assert.equal(original.products.reduce((n,p)=>n+p.stock,0),249);
  assert.equal(catalog.bySku.size,result.report.stats.skus);
  assert.equal(catalog.products.length,result.report.stats.products);
  assert.equal(catalog.products.reduce((n,p)=>n+p.stock,0),result.report.stats.units);
  assert.ok(catalog.products.every(p=>p.variants.every(v=>v.stock>0)));
  for(const forbidden of ['precio_mayor','costo_unitario','codigo_barras','fecha_vencimiento','precioMayor','warehouse']) {
    assert.ok(!JSON.stringify(result.catalog).includes(forbidden),forbidden);
  }
});
test('The two requested foundations and discontinued Advanced Radiance are withdrawn, not deleted from history',()=>{
  for(const id of WITHDRAWN) assert.equal(catalog.byId.has(id),false);
  for(const sku of ['FARA00012825','FARA00013120','FARA00007120','FARA00007129','FARA00007140','FARA00007310']) {
    assert.equal(catalog.bySku.has(sku),false);
    assert.equal(byArchive.get(sku).status,'withdrawn');
  }
  assert.ok(catalog.byId.has('corrector-superstay-30h-de-maybelline'));
  assert.ok(catalog.byId.has('polvo-compacto-superstay-24h-de-maybelline'));
  assert.ok(catalog.byId.has('labial-superstay-matte-ink-de-maybelline'));
});
test('Retail price and stock are updated from the new snapshot, and zero stock is archived',()=>{
  assert.deepEqual([catalog.bySku.get('FARA00002410').price,catalog.bySku.get('FARA00002410').stock],[490,2]);
  assert.deepEqual([catalog.bySku.get('FARA00015130').price,catalog.bySku.get('FARA00015130').stock],[490,10]);
  for(const sku of ['FARA00001','FARA00002420','FARA00002425','FARA00004120','FARA00014140']) {
    assert.equal(catalog.bySku.has(sku),false);
    assert.equal(byArchive.get(sku).stock,0);
    assert.equal(byArchive.get(sku).status,'out_of_stock');
  }
  assert.ok(result.archive.products.some(p=>p.product.image==='assets/products/Base Superstay de Maybelline.webp'));
});
test('Verified True Match corrections become purchasable without changing the other pending references',()=>{
  const corrections=read('data/inventory-tone-corrections-20260909.json');
  assert.equal(corrections.corrections.length,3);
  const originalSource=JSON.stringify(source);
  for(const correction of corrections.corrections) {
    const {row,sku,productId,originalTone,tone,price,stock}=correction;
    const sourceRow=source.groups.find(p=>p.id===productId).rows.find(r=>r[0]===row);
    assert.deepEqual(sourceRow,[row,sku,originalTone,price,stock]);
    const variant=catalog.bySku.get(sku);
    assert.deepEqual([variant.productId,variant.tone,variant.price,variant.stock],[productId,tone,price,stock]);
    assert.equal(byArchive.has(sku),false);
    assert.equal(result.report.review.some(r=>r.sku===sku),false);
    assert.deepEqual(core.changeCart(catalog,[],sku,100),[{sku,quantity:stock}]);
  }
  assert.equal(JSON.stringify(source),originalSource);
  assert.equal(catalog.bySku.size,213);
  assert.equal(catalog.products.reduce((n,p)=>n+p.stock,0),397);
  assert.equal(result.report.stats.archived,15);
  assert.equal(result.report.stats.review,9);
  const uncorrected=structuredClone(source);
  uncorrected.groups.find(p=>p.id==='base-true-match-de-loreal').rows.find(r=>r[0]===34)[2]='46999';
  const held=reconcileInventory(baseline,uncorrected);
  assert.equal(core.prepareCatalog(held.catalog).bySku.has('FARA0000523'),false);
  assert.equal(held.archive.products.flatMap(p=>p.variants).find(v=>v.sku==='FARA0000523').status,'review');
});
test('Newly identified shades become purchasable while malformed shades remain pending',()=>{
  for(const [sku,tone] of [['FARA00027010','10'],['FARA00039000','0'],['FARA00044002','Azul']]) {
    assert.equal(catalog.bySku.get(sku).tone,tone);
  }
  assert.equal(catalog.bySku.get('FARA0000556').tone,'5-6');
  assert.equal(catalog.bySku.get('FARA0000556').stock,8);
  assert.equal(catalog.bySku.get('FARA000054555').tone,'4.5-5.5');
  assert.equal(catalog.bySku.has('FARA00004118'),false);
  assert.equal(byArchive.get('FARA00004118').status,'review');
  assert.equal(catalog.bySku.get('FARA00004112').tone,'112');
  assert.ok(catalog.products.every(p=>p.variants.every(v=>!/^46\d{3}$/.test(v.tone))));
});
test('Repeated Fit Me SKUs are never assigned to two formulas or added together',()=>{
  for(const sku of ['FARA00006120','FARA00006220']) {
    assert.equal(catalog.bySku.has(sku),false);
    assert.equal(byArchive.get(sku).status,'review');
  }
  assert.equal(catalog.bySku.get('FARA00006210').productId,'base-fit-me-de-maybelline-morada');
  assert.equal(catalog.bySku.get('FARA00006210').stock,2);
  for(const sku of ['FARA00006118','FARA00006125','FARA00006225']) {
    assert.equal(catalog.bySku.get(sku).productId,'base-fit-me-de-maybelline-morada');
    assert.equal(catalog.bySku.get(sku).stock,1);
  }
  assert.ok(result.report.review.some(r=>r.sku==='FARA00006220'));
});
test('Existing product metadata and verified photos survive the update',()=>{
  for(const p of catalog.products) {
    const old=original.byId.get(p.id);
    if(!old) continue;
    for(const field of ['id','name','brand','category','presentation','image']) assert.deepEqual(p[field],old[field],`${p.id}.${field}`);
  }
  assert.ok(catalog.products.some(p=>p.id==='base-y-corrector-skin-ink-de-loreal'));
  assert.ok(catalog.products.some(p=>p.id==='fijador-power-grip-dewy-setting-spray-de-elf'));
  assert.ok(catalog.products.some(p=>p.id==='primer-power-grip-naranja-de-elf'));
  assert.ok(catalog.products.some(p=>p.id==='set-cuatro-polvos-sueltos-halo-glow-de-elf'));
  assert.ok(catalog.products.some(p=>p.id==='paleta-contorno-y-blush'));
});
test('Cart rejects archived SKUs, preserves distinct shades and limits quantities',()=>{
  const cart=core.sanitizeCart(catalog,[{sku:'FARA00012825',quantity:1},{sku:'FARA00002420',quantity:1},{sku:'FARA00002410',quantity:100},{sku:'FARA00002400',quantity:1}]);
  assert.deepEqual(cart,[{sku:'FARA00002410',quantity:2},{sku:'FARA00002400',quantity:1}]);
  assert.equal(core.totals(catalog,cart).subtotal,1470);
  assert.equal(core.changeCart(catalog,[],'FARA00027010',100).length,1);
  assert.equal(core.changeCart(catalog,[],'FARA00027010',100)[0].quantity,2);
});
test('Reconciliation is deterministic and never mutates the original catalog',()=>{
  const before=JSON.stringify(baseline);
  const repeat=reconcileInventory(baseline,source);
  assert.deepEqual(repeat.catalog,result.catalog);
  assert.equal(JSON.stringify(baseline),before);
  const again=reconcileInventory(result.catalog,source);
  assert.deepEqual(again.catalog.products,result.catalog.products);
});
test('Unknown families, invalid stock and duplicate source rows fail closed',()=>{
  const bad=structuredClone(source);bad.groups[0].rows[0][4]=-1;
  assert.throws(()=>reconcileInventory(baseline,bad),/Stock inválido/);
  const duplicate=structuredClone(source);duplicate.groups[0].rows.push([...duplicate.groups[0].rows[0]]);
  assert.throws(()=>reconcileInventory(baseline,duplicate),/Fila duplicada/);
  const unknown=structuredClone(source);unknown.groups[0].id='unknown-family';
  assert.throws(()=>reconcileInventory(baseline,unknown),/Familia desconocida/);
});
