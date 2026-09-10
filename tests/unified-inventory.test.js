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
const all=inspection.allBySku;
const variant=sku=>all.get(sku);

test('One canonical document preserves the reconciled inventory and historical references',()=>{
  assert.equal(data.schemaVersion,3);
  assert.deepEqual([inspection.stats.products,inspection.stats.skus,inspection.stats.activeProducts,inspection.stats.activeSkus,inspection.stats.activeUnits,inspection.stats.archivedSkus],[61,304,56,280,536,24]);
  assert.equal(new Set(data.products.flatMap(p=>p.variants.map(v=>v.sku))).size,304);
  assert.ok(data.products.every(p=>p.variants.length>0));
  assert.equal(data.source.file,'Pasted markdown(2).md');
  assert.equal(data.source.receivedDate,'2026-09-09');
});

test('True Match, Skin Tint and Fit Me follow the current inventory source',()=>{
  for(const [sku,tone,stock] of [['FARA0000523','2-3',2],['FARA0000534','3-4',2],['FARA0000545','4-5',3]]) {
    assert.deepEqual([variant(sku).tone,variant(sku).price,variant(sku).stock,variant(sku).status],[tone,490,stock,'active']);
    assert.ok(catalog.bySku.has(sku));
  }
  assert.equal(variant('FARA0000556').tone,'5-6');
  assert.deepEqual([variant('FARA00004118').tone,variant('FARA00004118').stock,variant('FARA00004118').status],['118',1,'active']);
  assert.equal(catalog.bySku.get('FARA00004118').tone,'118');
  assert.equal(catalog.bySku.get('FARA00006120').productId,'base-fit-me-de-maybelline-azul');
  assert.equal(catalog.bySku.get('FARA00006220').productId,'base-fit-me-de-maybelline-azul');
  for(const sku of ['FARA00048118','FARA00048120','FARA00048125','FARA00048210','FARA00048220','FARA00048225']) {
    assert.equal(variant(sku).status,'active');
    assert.ok(catalog.bySku.has(sku),sku);
  }
});

test('Current replacement SKUs are active and stale aliases stay historical',()=>{
  for(const [sku,stock] of [['FARA00050001',5],['FARA00050002',1],['FARA00051001',2],['FARA00053001',4]]) {
    assert.deepEqual([variant(sku).stock,variant(sku).status],[stock,'active']);
    assert.ok(catalog.bySku.has(sku),sku);
  }
  for(const sku of ['FARA00045001','FARA00045002','FARA00047001','FARA00049001','FARA00048001','FARA00048002','FARA00008310']) {
    assert.equal(variant(sku).status,'absent_from_snapshot');
    assert.equal(variant(sku).stock,0);
    assert.equal(catalog.bySku.has(sku),false);
  }
});

test('Withdrawn foundations and zero-stock references remain outside the storefront',()=>{
  for(const id of ['base-advanced-radiance-de-covergirl','base-outlast-active-de-covergirl','base-superstay-de-maybelline']) {
    assert.equal(catalog.byId.has(id),false);
    assert.ok(data.products.find(p=>p.id===id));
  }
  for(const sku of ['FARA00001','FARA00002420','FARA00002425','FARA00004120','FARA00027065','FARA00037P10','FARA00039000']) {
    assert.equal(variant(sku).status,'out_of_stock');
    assert.equal(variant(sku).stock,0);
    assert.equal(catalog.bySku.has(sku),false);
  }
  assert.deepEqual([variant('FARA00014140').tone,variant('FARA00014140').stock,variant('FARA00014140').status],['140',1,'active']);
  assert.ok(catalog.bySku.has('FARA00014140'));
  assert.equal(variant('FARA00012825').status,'withdrawn');
  assert.equal(variant('FARA00013120').status,'withdrawn');
});

test('Cart, filtering and search use only reconciled active references',()=>{
  const cart=api.sanitizeCart(catalog,[{sku:'FARA00012825',quantity:1},{sku:'FARA00048001',quantity:1},{sku:'FARA00004118',quantity:1},{sku:'FARA0000523',quantity:99},{sku:'FARA0000534',quantity:1}]);
  assert.deepEqual(cart,[{sku:'FARA00004118',quantity:1},{sku:'FARA0000523',quantity:2},{sku:'FARA0000534',quantity:1}]);
  assert.deepEqual(api.totals(catalog,cart),{quantity:4,subtotal:1960});
  assert.equal(api.changeCart(catalog,[], 'FARA0000545',100)[0].quantity,3);
  assert.equal(api.filterProducts(catalog,{query:'FARA0000523',category:'Todos',sort:'featured'}).length,1);
  assert.ok(api.filterProducts(catalog,{query:'True Match',category:'Todos',sort:'featured'}).some(p=>p.id==='base-true-match-de-loreal'));
  assert.equal(api.filterProducts(catalog,{query:'FARA00048001',category:'Todos',sort:'featured'}).length,0);
});

test('Updates cannot silently reactivate withdrawn or absent references',()=>{
  const original=JSON.stringify(data);
  const updated=applyUpdates(data,{changes:[
    {sku:'FARA0000523',stock:0},
    {sku:'FARA0000534',price:495},
    {sku:'FARA00012825',stock:4},
    {sku:'FARA00048001',stock:3}
  ]});
  const checked=api.inspectInventory(updated);
  assert.equal(checked.allBySku.get('FARA0000523').status,'out_of_stock');
  assert.equal(checked.allBySku.get('FARA0000534').price,495);
  assert.equal(checked.allBySku.get('FARA00012825').status,'withdrawn');
  assert.equal(checked.catalog.bySku.has('FARA00012825'),false);
  assert.equal(checked.allBySku.get('FARA00048001').status,'absent_from_snapshot');
  assert.equal(checked.catalog.bySku.has('FARA00048001'),false);
  assert.equal(JSON.stringify(data),original);
  const reactivated=applyUpdates(data,{changes:[{sku:'FARA00048001',stock:1,status:'active'}]});
  assert.ok(api.prepareCatalog(reactivated).bySku.has('FARA00048001'));
});

test('Batch updates reject collisions, invalid stocks and unsupported statuses atomically',()=>{
  assert.throws(()=>applyUpdates(data,{changes:[{sku:'FARA0000523',stock:5},{sku:'FARA0000523',stock:6}]}),/repetido/);
  assert.throws(()=>applyUpdates(data,{changes:[{sku:'FARA0000523',stock:-1}]}),/Stock inválido/);
  assert.throws(()=>applyUpdates(data,{changes:[{sku:'FARA0000523',status:'sold'}]}),/Estado inválido/);
  assert.throws(()=>applyUpdates(data,{changes:[{sku:'FARA0000523',productId:'otra-familia'}]}),/Familia incorrecta/);
  assert.throws(()=>applyUpdates(data,{changes:[{sku:'FARA0000534',tone:'2-3'}]}),/Tono activo duplicado/);
  assert.throws(()=>api.inspectInventory({...data,products:[...data.products,data.products[0]]}),/ID de producto duplicado/);
  assert.throws(()=>api.inspectInventory({...data,schemaVersion:2}),/Formato único/);
  assert.throws(()=>api.inspectInventory({...data,products:data.products.map(p=>({...p,variants:p.variants.map(v=>v.sku==='FARA00004118'?{...v,tone:'112'}:v)}))}),/Tono activo duplicado/);
});

test('Every configured product photo exists and no internal commercial fields are published',()=>{
  for(const product of data.products) if(product.image) assert.ok(fs.existsSync(path.join(root,product.image)),product.image);
  assert.doesNotMatch(JSON.stringify(data),/"(?:precio_mayor|precioMayor|costo_unitario|warehouse|fecha_vencimiento)"\s*:/);
});

test('All entry points use the same JSON and legacy inventory sources are gone',()=>{
  const store=read('assets/inventory-store.js');
  const loader=read('assets/inventory-loader.js');
  const docker=read('Dockerfile');
  assert.match(store,/fetch\(`assets\/inventory\.json\?v=/);
  assert.match(store,/const core = window\.FaraInventory/);
  assert.match(loader,/load\('inventory-document\.js'\)/);
  assert.match(docker,/COPY assets \/usr\/share\/nginx\/html\/assets/);
  assert.doesNotMatch(docker,/reconcile-inventory|inventory-builder/);
  for(const file of ['assets/inventory-catalog.json','assets/inventory-additions-20260909.json','data/inventory-snapshot-20260909.json','data/inventory-tone-corrections-20260909.json','data/inventory-archive-20260909.json','scripts/build-inventory.js','scripts/reconcile-inventory.js']) assert.equal(fs.existsSync(path.join(root,file)),false,file);
  const sources=['assets/inventory-document.js','scripts/inventory.js','assets/inventory-loader.js','assets/inventory-store.js','Dockerfile','.github/workflows/inventory-validation.yml'];
  for(const file of sources) assert.doesNotMatch(read(file),/require\([^\n]*inventory-(?:catalog|additions|snapshot|archive|tone-corrections)|reconcile-inventory\.js/);
  const jsons=fs.readdirSync(path.join(root,'assets')).filter(n=>n.endsWith('.json'));
  assert.deepEqual(jsons,['inventory.json']);
});
