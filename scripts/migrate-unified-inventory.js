'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const assert = (condition,message) => { if (!condition) throw new Error(message); };
const {mergeCatalog} = require('./build-inventory.js');
const {reconcileInventory} = require('./reconcile-inventory.js');
const core = require('../assets/inventory-core.js');
const baseline = mergeCatalog(read('assets/inventory-catalog.json'),read('assets/inventory-additions-20260909.json'));
const snapshot = read('data/inventory-snapshot-20260909.json');
const corrections = read('data/inventory-tone-corrections-20260909.json');
const result = reconcileInventory(baseline,snapshot);
const oldArchive = read('data/inventory-archive-20260909.json');
assert(JSON.stringify(oldArchive)===JSON.stringify(result.archive),'El archivo permanente no coincide con la conciliación. No se migra.');
assert(result.report.stats.skus===213 && result.report.stats.units===397 && result.report.stats.archived===15,'El inventario cambió; se requiere revisar la migración.');
const metadata = new Map();
for(const p of [...baseline.products,...result.catalog.products,...result.archive.products.map(e=>e.product)]) {
  const {variants,...meta}=p;
  metadata.set(p.id,clone(meta));
}
const products = new Map();
for(const [id,meta] of metadata) products.set(id,{...meta,variants:[]});
const rowsBySku = new Map();
for(const group of snapshot.groups) for(const row of group.rows) {
  const [number,sku,tone,price,stock]=row;
  if(!rowsBySku.has(sku)) rowsBySku.set(sku,[]);
  rowsBySku.get(sku).push({row:number,productId:group.id,tone,price,stock});
}
const allSkus = new Set();
function add(productId,variant,status,sourceRows) {
  assert(!allSkus.has(variant.sku),`SKU duplicado: ${variant.sku}`);
  allSkus.add(variant.sku);
  const product=products.get(productId);
  assert(product,`Familia desconocida: ${productId}`);
  const {sku,tone,price,stock}=variant;
  const item={sku,tone,price,stock,status};
  if(sourceRows.length) item.sourceRows=sourceRows;
  if(variant.detail) item.reason=variant.detail;
  product.variants.push(item);
}
for(const p of result.catalog.products) for(const v of p.variants) {
  const candidates=rowsBySku.get(v.sku)||[];
  const matching=candidates.filter(c=>c.productId===p.id && c.stock===v.stock && c.price===v.price);
  add(p.id,v,'active',matching.map(c=>c.row));
}
for(const entry of result.archive.products) for(const v of entry.variants)
  add(entry.product.id,v,v.status,v.sourceRows||[]);
const allProducts=[...products.values()].filter(p=>p.variants.length);
const document={
  schemaVersion:3,
  source:{...result.catalog.source,legacyCommit:'ec0bf355098e4104ad33cc0738670579175bd11a'},
  currency:'HNL',
  products:allProducts,
  audit:{
    corrections:clone(corrections.corrections),
    reconciliation:{stats:clone(result.report.stats),review:clone(result.report.review)},
    legacySources:['assets/inventory-catalog.json','assets/inventory-additions-20260909.json','data/inventory-snapshot-20260909.json','data/inventory-tone-corrections-20260909.json','data/inventory-archive-20260909.json']
  }
};
const active={schemaVersion:2,source:result.catalog.source,currency:'HNL',products:allProducts.map(p=>({...p,variants:p.variants.filter(v=>v.status==='active').map(({sku,tone,price,stock})=>({sku,tone,price,stock}))})).filter(p=>p.variants.length).map(p=>{
  const {variants,...meta}=p;
  return {...meta,variants};
})};
const current=core.prepareCatalog(result.catalog);
const migrated=core.prepareCatalog(active);
assert(migrated.bySku.size===current.bySku.size,'Se perdieron SKU activos');
for(const [sku,v] of current.bySku) assert(JSON.stringify(v)===JSON.stringify(migrated.bySku.get(sku)),`Cambio inesperado en ${sku}`);
assert(allSkus.size===228,'Se perdieron referencias históricas');
assert(allProducts.length===50,'Se perdieron familias históricas');
assert(!JSON.stringify(document).match(/"(?:precio_mayor|precioMayor|costo_unitario|warehouse|fecha_vencimiento)"\s*:/),'Datos internos no permitidos');
const destination=path.join(root,'assets/inventory.json');
fs.writeFileSync(destination,JSON.stringify(document,null,2)+'\n');
console.log(JSON.stringify({products:allProducts.length,activeProducts:current.products.length,activeSkus:current.bySku.size,activeUnits:current.products.reduce((n,p)=>n+p.stock,0),archivedSkus:allSkus.size-current.bySku.size,output:destination}));
