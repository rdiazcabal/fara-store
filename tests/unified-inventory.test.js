'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('assets/inventory.json'));
const api=require('../assets/inventory-document.js');
const {applyUpdates}=require('../scripts/inventory.js');
const inspection=api.inspectInventory(data);
const catalog=inspection.catalog;
const variant=sku=>inspection.allBySku.get(sku);
const zeroSkus=["FARA00006222","FARA00006230","FARA00006235","FARA00006118","FARA00006124","FARA00006125","FARA00006130","FARA00006210","FARA00006220","FARA00006225","FARA00006245","FARA00002410","FARA00002420","FARA00002425","FARA00002430","FARA00002460","FARA00002465","FARA00002470","FARA00002480","FARA00003102","FARA000031025","FARA00003103","FARA00003108","FARA00008112","FARA00008115","FARA00008125","FARA00004120","FARA00004118","FARA00007129","FARA00005052","FARA000054555","FARA000053125","FARA0000523","FARA0000534","FARA0000545","FARA00035005","FARA00071003","FARA00071004","FARA00072002","FARA00027065","FARA00027112","FARA00037P10","FARA00039000","FARA00065002","FARA00014140","FARA00014130","FARA00001","FARA00056000","FARA00056001","FARA00050002","FARA00045001","FARA00057000","FARA00061017"];

test('The canonical JSON preserves current inventory and historical references',()=>{
  assert.equal(data.schemaVersion,3);
  assert.equal(data.source.file,'inventario-avanzado-20260918-163354.xlsx');
  assert.deepEqual([inspection.stats.products,inspection.stats.skus,inspection.stats.activeSkus,inspection.stats.activeUnits,inspection.stats.archivedSkus],[82,333,274,500,59]);
  assert.equal(new Set(data.products.flatMap(p=>p.variants.map(v=>v.sku))).size,333);
  assert.equal(inspection.allBySku.has('FARA00068001'),false);
});


test('Changing only status to out_of_stock never takes down the whole catalog',()=>{
  const edited=JSON.parse(JSON.stringify(data));
  const live=edited.products.flatMap(p=>p.variants).find(v=>v.sku==='FARA00002490');
  assert.ok(live && live.stock>0);
  live.status='out_of_stock';
  const checked=api.inspectInventory(edited);
  assert.equal(checked.catalog.bySku.has('FARA00002490'),false);

  const normalized=applyUpdates(data,{changes:[{sku:'FARA00002490',status:'out_of_stock'}]});
  const changed=api.inspectInventory(normalized).allBySku.get('FARA00002490');
  assert.deepEqual([changed.status,changed.stock],['out_of_stock',0]);
});

test('All 53 zero-stock spreadsheet rows remain as history outside shopping',()=>{
  assert.equal(zeroSkus.length,53);
  for(const sku of zeroSkus){
    assert.ok(variant(sku),sku);
    assert.deepEqual([variant(sku).stock,variant(sku).status],[0,'out_of_stock'],sku);
    assert.equal(catalog.bySku.has(sku),false,sku);
  }
  assert.equal(variant('FARA00005052').price,470);
  assert.equal(variant('FARA00001').price,500);
});

test('Older aliases remain historical without being reactivated',()=>{
  for(const sku of ['FARA00045002','FARA00047001','FARA00049001','FARA00048001','FARA00048002']){
    assert.ok(variant(sku),sku);
    assert.equal(variant(sku).stock,0,sku);
    assert.notEqual(variant(sku).status,'active',sku);
    assert.equal(catalog.bySku.has(sku),false,sku);
  }
});

test('Product descriptions are specific and no longer use inventory filler',()=>{
  for(const product of data.products){
    assert.ok(product.description.length>=80,product.id);
    assert.doesNotMatch(product.description,/forma parte del inventario actualizado|complementar tu rutina|Selecciona la tonalidad disponible|Revisa la presentación disponible/i,product.id);
  }
  assert.equal(new Set(data.products.map(p=>p.description)).size,data.products.length);
  assert.match(data.products.find(p=>p.id==='base-infallible-pro-matte-de-loreal').description,/acabado mate/i);
  assert.match(data.products.find(p=>p.id==='facial-moisturizing-lotion-am-spf30-oil-free').description,/SPF 30/i);
  assert.match(data.products.find(p=>p.id==='primer-the-face-glue-de-nyx').description,/adherencia/i);
});

test('Shopping exposes only currently active references',()=>{
  const activeSku='FARA00002490';
  assert.ok(catalog.bySku.has(activeSku));
  const cart=api.sanitizeCart(catalog,[{sku:activeSku,quantity:99},{sku:'FARA00002410',quantity:1}]);
  assert.deepEqual(cart,[{sku:activeSku,quantity:variant(activeSku).stock}]);
  assert.equal(api.filterProducts(catalog,{query:'FARA00002410',category:'Todos',sort:'featured'}).length,0);
});

test('All entry points still use the same single JSON',()=>{
  const store=read('assets/inventory-store.js');
  const loader=read('assets/inventory-loader.js');
  const docker=read('Dockerfile');
  assert.match(store,/fetch\(\`assets\/inventory\.json\?v=/);
  assert.match(loader,/load\('inventory-document\.js'\)/);
  assert.match(docker,/COPY assets \/usr\/share\/nginx\/html\/assets/);
  assert.deepEqual(fs.readdirSync(path.join(root,'assets')).filter(n=>n.endsWith('.json')),['inventory.json']);
});
