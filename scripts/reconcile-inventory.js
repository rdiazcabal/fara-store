'use strict';
const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/inventory-core.js');
const {mergeCatalog} = require('./build-inventory.js');

const WITHDRAWN = new Set([
  'base-advanced-radiance-de-covergirl',
  'base-outlast-active-de-covergirl',
  'base-superstay-de-maybelline'
]);
const NEW_PRODUCTS = {
  'base-y-corrector-skin-ink-de-loreal': ['L’Oréal Paris','Base y corrector Skin Ink de L’Oréal','Bases y corrector','0.50 oz'],
  'primer-power-grip-naranja-de-elf': ['e.l.f.','Primer Power Grip de e.l.f. (Naranja)','Prebases','0.811 oz'],
  'fijador-power-grip-dewy-setting-spray-de-elf': ['e.l.f.','Fijador Power Grip Dewy Setting Spray de e.l.f.','Fijadores','2.7 oz'],
  'set-cuatro-polvos-sueltos-halo-glow-de-elf': ['e.l.f.','Set de cuatro polvos sueltos Halo Glow de e.l.f.','Polvos sueltos','0.35 oz'],
  'paleta-contorno-y-blush': ['e.l.f.','Paleta de contorno y blush','Paletas','0.47 oz'],
  'base-advanced-radiance-de-covergirl': ['Covergirl','Base Advanced Radiance de Covergirl','Bases','1 oz'],
  'base-outlast-active-de-covergirl': ['Covergirl','Base Outlast Active de Covergirl','Bases','1 oz'],
  'base-superstay-de-maybelline': ['Maybelline','Base Superstay de Maybelline','Bases','1 oz']
};
const KNOWN_FAMILY_CORRECTIONS = new Set(['FARA00025600','FARA00026600']);
const DATE_CORRUPTED = new Set(['FARA0000523','FARA0000534','FARA0000545','FARA0000556']);
function assert(ok, message) { if (!ok) throw new Error(message); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizeTone(value) {
  return String(value).normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es');
}
function newProduct(id) {
  const meta = NEW_PRODUCTS[id];
  assert(meta, `Familia sin metadata verificada: ${id}`);
  return {id,brand:meta[0],name:meta[1],category:meta[2],presentation:meta[3],image:null,variants:[]};
}
function reconcileInventory(baseline, snapshot) {
  const previous = core.prepareCatalog(baseline);
  assert(snapshot.schemaVersion === 1 && Array.isArray(snapshot.groups), 'Plantilla no válida');
  const previousProducts = new Map(previous.products.map(p=>[p.id,p]));
  const oldVariants = new Map();
  for (const p of previous.products) for (const v of p.variants) oldVariants.set(v.sku,{...v,productId:p.id});
  const oldByProductTone=new Map();
  for(const v of oldVariants.values()) oldByProductTone.set(`${v.productId}|${normalizeTone(v.tone)}`,v.sku);
  const rows = new Map();
  const sourceRows = new Set();
  for (const group of snapshot.groups) {
    assert(group && typeof group.id === 'string' && Array.isArray(group.rows), 'Familia inválida');
    assert(previousProducts.has(group.id) || NEW_PRODUCTS[group.id] || WITHDRAWN.has(group.id), `Familia desconocida: ${group.id}`);
    for (const record of group.rows) {
      const [row,sku,tone,price,stock] = record;
      assert(Number.isSafeInteger(row) && row > 1 && !sourceRows.has(row), `Fila duplicada: ${row}`);
      sourceRows.add(row);
      assert(/^FARA[A-Z0-9]+$/.test(sku), `SKU inválido: ${row}`);
      assert(typeof tone === 'string' && tone.trim(), `Tono vacío: ${row}`);
      assert(Number.isFinite(price) && price > 0, `Precio inválido: ${row}`);
      assert(Number.isSafeInteger(stock) && stock >= 0, `Stock inválido: ${row}`);
      if (!rows.has(sku)) rows.set(sku,[]);
      rows.get(sku).push({row,sku,tone:tone.trim(),price,stock,productId:group.id});
    }
  }

  const active = new Map();
  const archive = new Map();
  const review = [];
  const changes = [];
  const resolved = new Set();
  const getProduct = (id) => {
    if (!active.has(id)) active.set(id, previousProducts.has(id) ?
      {...clone(previousProducts.get(id)),variants:[]} : newProduct(id));
    return active.get(id);
  };
  function saveArchive(v,reason,sourceRows=[],detail=null) {
    assert(!archive.has(v.sku), `Archivo duplicado: ${v.sku}`);
    archive.set(v.sku,{...clone(v),status:reason,sourceRows, ...(detail?{detail}: {})});
  }
  function hold(sku,reason,candidates,old) {
    const item = {sku,reason,candidates:clone(candidates)};
    review.push(item);
    saveArchive(old || {sku,tone:candidates[0].tone,price:candidates[0].price,stock:0,productId:candidates[0].productId},'review',candidates.map(c=>c.row),reason);
    resolved.add(sku);
  }
  for (const [sku,candidates] of rows) {
    const old = oldVariants.get(sku);
    const withdrawn = candidates.every(c=>WITHDRAWN.has(c.productId)) ||
      (old && WITHDRAWN.has(old.productId));
    if (withdrawn) {
      const selected=candidates.find(c=>old && c.productId===old.productId)||candidates[0];
      saveArchive(old ? {...old,price:selected.price,stock:selected.stock} : {...selected},'withdrawn',candidates.map(c=>c.row));
      resolved.add(sku);
      continue;
    }
    const distinct = [...new Set(candidates.map(c=>c.productId))];
    let selected;
    if (old) {
      const same = candidates.filter(c=>c.productId===old.productId);
      if (same.length) selected=same[0];
      else if(KNOWN_FAMILY_CORRECTIONS.has(sku)) {
        selected={...candidates[0],productId:old.productId};
        review.push({sku,reason:'La plantilla intercambia Matte y Laque; se conserva la fórmula ya confirmada por FARA.',candidates:clone(candidates),resolution:old.productId});
      } else {
        hold(sku,'El SKU pertenece a otra familia en el catálogo anterior; requiere corrección del inventario.',candidates,old);
        continue;
      }
      if (same.length>1 && same.some(c=>c.tone!==selected.tone || c.price!==selected.price || c.stock!==selected.stock)) {
        hold(sku,'Filas contradictorias dentro de la misma familia.',candidates,old); continue;
      }
      if (distinct.length>1) review.push({sku,reason:'SKU repetido entre familias; se conserva la familia ya verificada.',candidates:clone(candidates),resolution:old.productId});
    } else if (distinct.length===1) {
      selected=candidates[0];
      if (candidates.some(c=>c.tone!==selected.tone || c.price!==selected.price || c.stock!==selected.stock)) {
        hold(sku,'Filas contradictorias dentro de la misma familia.',candidates); continue;
      }
    } else {
      const positive=candidates.filter(c=>c.stock>0);
      if (positive.length===1) {
        selected=positive[0];
        review.push({sku,reason:'SKU repetido: solo una familia tiene stock positivo; se usa esa fila y se conserva la discrepancia para corrección.',candidates:clone(candidates),resolution:selected.productId});
      } else {
        hold(sku,'SKU compartido por varias familias con existencias positivas; no es posible identificar la fórmula.',candidates);
        continue;
      }
    }
    // Preserve known identities. The export has exchanged Laque/Matte labels and Excel has converted four shade strings to dates.
    let tone=selected.tone;
    if (DATE_CORRUPTED.has(sku)) {
      if (old && old.tone && !/^\d{5}$/.test(old.tone)) tone=old.tone;
      else {hold(sku,'Excel convirtió la tonalidad en una fecha; falta el tono original.',candidates,old);continue;}
    }
    if (old && normalizeTone(tone)!==normalizeTone(old.tone) && normalizeTone(tone).replace(/-$/,'')===normalizeTone(old.tone)) tone=old.tone;
    if (selected.stock===0) {
      saveArchive(old ? {...old,price:selected.price,stock:0} : {...selected,tone},'out_of_stock',candidates.map(c=>c.row));
      resolved.add(sku);continue;
    }
    const product=getProduct(selected.productId);
    const reserved=oldByProductTone.get(`${selected.productId}|${normalizeTone(tone)}`);
    if(reserved && reserved!==sku) {hold(sku,`Tono ya identificado por el SKU ${reserved}; requiere corrección.`,candidates,old);continue;}
    const collision=product.variants.find(v=>normalizeTone(v.tone)===normalizeTone(tone) && v.sku!==sku);
    if (collision) {hold(sku,`Tono duplicado con ${collision.sku}; no se inventa una tonalidad.`,candidates,old);continue;}
    const variant={sku,tone,price:selected.price,stock:selected.stock};
    product.variants.push(variant);
    resolved.add(sku);
    changes.push({sku,productId:product.id,action:old?'updated':'added',before:old?{tone:old.tone,price:old.price,stock:old.stock}:null,after:clone(variant)});
  }
  // Any existing SKU omitted from the new snapshot is archived rather than offered with stale stock.
  for(const old of oldVariants.values()) if(!resolved.has(old.sku)) saveArchive(old,'absent_from_snapshot');
  const products=[...active.values()].filter(p=>p.variants.length);
  const result={schemaVersion:2,source:{
    kind:'inventory-reconciliation',file:snapshot.source.file,receivedDate:snapshot.source.receivedDate,
    cutoff:snapshot.source.cutoff,stockIsSnapshot:true,timezone:'America/Tegucigalpa'
  },currency:baseline.currency||'HNL',products};
  const checked=core.prepareCatalog(result);
  const archived=[...archive.values()];
  const archiveData={schemaVersion:1,source:result.source,products:[...new Set(archived.map(v=>v.productId))].map(id=>({
    product:clone(previousProducts.get(id)||newProduct(id)),
    variants:archived.filter(v=>v.productId===id)
  }))};
  const stats={
    sourceRows:sourceRows.size,sourceSkus:rows.size,sourceUnits:[...rows.values()].flat().reduce((n,r)=>n+r.stock,0),
    previousProducts:previous.products.length,previousSkus:previous.bySku.size,
    products:checked.products.length,skus:checked.bySku.size,units:checked.products.reduce((n,p)=>n+p.stock,0),
    added:changes.filter(c=>c.action==='added').length,updated:changes.filter(c=>c.action==='updated').length,
    archived:archived.length,review:review.length
  };
  assert(checked.bySku.size===changes.length, 'El catálogo contiene referencias no reconciliadas');
  for(const id of WITHDRAWN) assert(!checked.byId.has(id),`Familia retirada: ${id}`);
  for(const v of archived) assert(!checked.bySku.has(v.sku),`Referencia archivada publicada: ${v.sku}`);
  const report={source:result.source,stats,changes,review,archive:archived.map(v=>({sku:v.sku,status:v.status,productId:v.productId,sourceRows:v.sourceRows}))};
  return {catalog:result,archive:archiveData,report};
}
function buildInventory(outputPath, reportDir) {
  const root=path.resolve(__dirname,'..');
  const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
  const baseline=mergeCatalog(read('assets/inventory-catalog.json'),read('assets/inventory-additions-20260909.json'));
  const result=reconcileInventory(baseline,read('data/inventory-snapshot-20260909.json'));
  const write=(p,data)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n');};
  write(path.resolve(outputPath),result.catalog);
  if(reportDir) {
    write(path.join(path.resolve(reportDir),'inventory-report.json'),result.report);
    write(path.join(path.resolve(reportDir),'inventory-archive.json'),result.archive);
  }
  return result.report.stats;
}
if(require.main===module) console.log(JSON.stringify(buildInventory(
  process.argv[2]||path.resolve(__dirname,'../dist/inventory-catalog.json'),process.argv[3]
)));
module.exports={reconcileInventory,buildInventory,WITHDRAWN};
