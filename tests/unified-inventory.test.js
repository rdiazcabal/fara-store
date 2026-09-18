'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('assets/inventory.json'));
const api=require('../assets/inventory-document.js');
const inspection=api.inspectInventory(data);
const catalog=inspection.catalog;
const variant=sku=>inspection.allBySku.get(sku);

test('The canonical JSON matches the September 18 inventory snapshot',()=>{
  assert.equal(data.schemaVersion,3);
  assert.equal(data.source.file,'inventario-avanzado-20260918-163354.xlsx');
  assert.equal(data.source.receivedDate,'2026-09-18');
  assert.equal(data.source.cutoff,'2026-09-18 16:33:54 CST');
  assert.deepEqual([inspection.stats.skus,inspection.stats.activeSkus,inspection.stats.activeUnits,inspection.stats.archivedSkus],[276,276,502,0]);
  assert.equal(new Set(data.products.flatMap(p=>p.variants.map(v=>v.sku))).size,276);
  assert.ok(data.products.every(p=>p.variants.length>0));
  assert.ok(data.products.flatMap(p=>p.variants).every(v=>v.status==='active'&&v.stock>0));
});

test('Key stocks and the new positive SKUs follow the updated Excel',()=>{
  for(const [sku,stock,price] of [
    ['FARA00002490',2,480],['FARA00003101',6,480],['FARA0000556',6,480],
    ['FARA00016120',5,480],['FARA00015130',11,480],['FARA00015310',1,480],
    ['FARA00015312',1,480],['FARA00066001',2,800],['FARA00070001',3,650],
    ['FARA00074004',1,495],['FARA00046001',2,490]
  ]) assert.deepEqual([variant(sku).stock,variant(sku).price,variant(sku).status],[stock,price,'active'],sku);
  assert.equal(variant('FARA00015310').tone,'310');
  assert.equal(variant('FARA00015312').tone,'312');
});

test('Zero-stock references are removed from the canonical catalog',()=>{
  for(const sku of ['FARA00001','FARA00002410','FARA00002420','FARA00002425','FARA000053125','FARA00004120','FARA00014140','FARA00056000','FARA00056001']) {
    assert.equal(inspection.allBySku.has(sku),false,sku);
    assert.equal(catalog.bySku.has(sku),false,sku);
  }
});

test('Bases and powders use L480 while unrelated prices keep their Excel value',()=>{
  for(const product of data.products) {
    const category=product.category.toLowerCase();
    if(category.startsWith('base')||category.startsWith('polvo')) {
      for(const item of product.variants) assert.equal(item.price,480,item.sku);
    }
  }
  assert.equal(variant('FARA00046001').price,490);
});

test('Cart, filtering and search use only the current positive inventory',()=>{
  const cart=api.sanitizeCart(catalog,[{sku:'FARA00002490',quantity:99},{sku:'FARA00015310',quantity:1},{sku:'FARA00002410',quantity:1}]);
  assert.deepEqual(cart,[{sku:'FARA00002490',quantity:2},{sku:'FARA00015310',quantity:1}]);
  assert.equal(api.filterProducts(catalog,{query:'FARA00015312',category:'Todos',sort:'featured'}).length,1);
  assert.equal(api.filterProducts(catalog,{query:'FARA00002410',category:'Todos',sort:'featured'}).length,0);
});

test('Every configured product photo exists and no internal commercial fields are published',()=>{
  for(const product of data.products) if(product.image) assert.ok(fs.existsSync(path.join(root,product.image)),product.image);
  assert.doesNotMatch(JSON.stringify(data),/"(?:precio_mayor|precioMayor|costo_unitario|warehouse|fecha_vencimiento)"\s*:/);
});

test('All entry points use the same JSON and legacy inventory sources are absent',()=>{
  const store=read('assets/inventory-store.js');
  const loader=read('assets/inventory-loader.js');
  const docker=read('Dockerfile');
  assert.match(store,/fetch\(\`assets\/inventory\.json\?v=/);
  assert.match(loader,/load\('inventory-document\.js'\)/);
  assert.match(docker,/COPY assets \/usr\/share\/nginx\/html\/assets/);
  const jsons=fs.readdirSync(path.join(root,'assets')).filter(n=>n.endsWith('.json'));
  assert.deepEqual(jsons,['inventory.json']);
});
