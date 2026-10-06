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

test('The canonical JSON matches the current reconciled catalog',()=>{
  assert.equal(data.schemaVersion,3);
  assert.equal(data.source.file,'inventario-avanzado-20261005-213452.xlsx');
  assert.deepEqual(
    [inspection.stats.products,inspection.stats.skus,inspection.stats.activeSkus,inspection.stats.activeUnits,inspection.stats.archivedSkus],
    [117,455,378,851,77]
  );
  assert.equal(new Set(data.products.flatMap(p=>p.variants.map(v=>v.sku))).size,455);
  assert.equal(inspection.allBySku.has('FARA00068001'),true);
  assert.deepEqual(
    [variant('FARA00075001').tone,variant('FARA00075001').price,variant('FARA00075001').stock,variant('FARA00075001').status],
    ['Ruby',400,2,'active']
  );
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

test('Every non-active reference stays outside shopping',()=>{
  const archived=data.products.flatMap(p=>p.variants).filter(v=>v.status!=='active');
  assert.equal(archived.length,77);
  assert.equal(archived.filter(v=>v.status==='out_of_stock').length,76);
  assert.equal(archived.filter(v=>v.status==='review').length,1);
  for(const item of archived){
    assert.equal(catalog.bySku.has(item.sku),false,item.sku);
  }
});

test('Duplicate shade references are not published twice',()=>{
  const duplicate=variant('FARA000280100');
  const canonical=variant('FARA00028100');
  assert.ok(duplicate && canonical);
  assert.deepEqual([duplicate.tone,duplicate.stock,duplicate.status],['100',0,'review']);
  assert.deepEqual([canonical.tone,canonical.stock,canonical.status],['100',2,'active']);
  assert.equal(catalog.bySku.has('FARA000280100'),false);
  assert.equal(catalog.bySku.has('FARA00028100'),true);
});

test('Product descriptions are specific and no longer use inventory filler',()=>{
  for(const product of data.products){
    assert.ok(product.description.length>=80,product.id);
    assert.doesNotMatch(product.description,/forma parte del inventario actualizado|complementar tu rutina|Selecciona la tonalidad disponible|Revisa la presentación disponible|\binventario\b|\bexistencia\b|\bstock\b/i,product.id);
    assert.ok(Object.hasOwn(product,'image'),`${product.id} no tiene campo image`);
  }
  assert.equal(new Set(data.products.map(p=>p.description)).size,data.products.length);
  assert.match(data.products.find(p=>p.id==='base-infallible-pro-matte-de-loreal').description,/acabado mate/i);
  assert.match(data.products.find(p=>p.id==='facial-moisturizing-lotion-am-30-spf-oil-free-de-cerave-3-oz').description,/SPF 30/i);
  assert.match(data.products.find(p=>p.id==='primer-the-face-glue-de-nyx').description,/adherencia/i);
});

test('Curated product images stay available after reconciliation',()=>{
  for(const product of data.products){
    assert.ok(Object.hasOwn(product,'image'),product.id);
  }
  assert.equal(data.products.find(p=>p.id==='lipstick-avenue-matte-de-maybelline').image,'assets/products/Lipstick Avenue Matte de Maybelline.avif');
  assert.equal(data.products.find(p=>p.id==='glow-reviver-lip-oil-de-e-l-f').image,'assets/products/Glow Reviver Lip Oil de e.l.f..avif');
});

test('Avenue Matte consolidates the former Scuse Me shades',()=>{
  const avenue=data.products.find(p=>p.id==='lipstick-avenue-matte-de-maybelline');
  assert.ok(avenue);
  assert.equal(data.products.some(p=>/scuse me/i.test(p.name)||p.id==='lipstick-scuse-me-matte-de-maybelline'),false);
  assert.equal(avenue.presentation,'0.12 oz');
  assert.deepEqual(avenue.variants.map(v=>v.sku).sort(),['FARA00055002','FARA00055006','FARA00055007','FARA00055008']);
  assert.deepEqual(avenue.variants.map(v=>v.tone).sort(),['002','006','007','008']);
  assert.ok(avenue.variants.every(v=>v.status==='active'));
});

test('Latest spreadsheet price updates are applied',()=>{
  assert.equal(variant('FARA00090000').price,1490);
  assert.equal(variant('FARA00090001').price,1495);
  assert.equal(variant('FARA00090002').price,980);
  assert.equal(variant('FARA00090003').price,1150);
});

test('Labiales and tintas are consecutive in featured scroll',()=>{
  const isLip=p=>String(p.category||'').toLocaleLowerCase('es')==='labiales';
  const isTint=p=>!isLip(p)&&/^tinta\b/i.test(String(p.name||''));
  const indexes=data.products.map((p,i)=>(isLip(p)||isTint(p))?i:-1).filter(i=>i>=0);
  assert.ok(indexes.length>1);
  assert.equal(Math.max(...indexes)-Math.min(...indexes)+1,indexes.length);
  const block=data.products.slice(Math.min(...indexes),Math.max(...indexes)+1);
  const firstTint=block.findIndex(isTint);
  if(firstTint>=0){
    assert.ok(block.slice(0,firstTint).every(isLip));
    assert.ok(block.slice(firstTint).every(isTint));
  }
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
