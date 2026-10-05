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
  assert.equal(data.source.file,'inventario-avanzado-20261005-094033.xlsx');
  assert.deepEqual(
    [inspection.stats.products,inspection.stats.skus,inspection.stats.activeSkus,inspection.stats.activeUnits,inspection.stats.archivedSkus],
    [118,455,388,888,67]
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
  assert.equal(archived.length,67);
  assert.equal(archived.filter(v=>v.status==='out_of_stock').length,66);
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

test('New product families keep image null for later uploads',()=>{
  const ids=['anthelios-mineral-light-fluid-sunscreen-spf-50-de-la-roche-posay','anthelios-melt-in-milk-sunscreen-rostro-cuerpo-de-la-roche-posay','toleriane-purifying-foaming-face-wash-de-la-roche-posay','shea-better-24h-moisture-body-wash-coconut-waters-de-eos-16-oz','shea-better-24h-moisture-body-lotion-vanilla-cashmere-de-eos-16-oz','paradise-hyaluron-tint-lip-stain-serum-de-loreal','glow-reviver-lip-oil-de-e-l-f','radiant-tone-dual-serum-de-eucerin','q10-revitalize-daily-cream-de-eucerin','radiant-tone-eye-cream-de-eucerin','radiant-tone-cleansing-gel-de-eucerin'];
  for(const id of ids){
    const product=data.products.find(p=>p.id===id);
    assert.ok(product,id);
    assert.equal(product.image,null,id);
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
