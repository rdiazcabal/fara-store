'use strict';
const fs=require('node:fs');
const zlib=require('node:zlib');
const path=require('node:path');
const inventoryApi=require('../assets/inventory-document.js');

const FILE=path.resolve(__dirname,'../assets/inventory.json');
const INPUT=JSON.parse(zlib.gunzipSync(Buffer.from('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','base64')).toString('utf8'));

const fold=(value)=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[´’`]/g,"'").toLowerCase().replace(/\binfaillible\b/g,'infallible').replace(/\binfalible\b/g,'infallible').replace(/\be\.?\s*f\.?\s*l\.?\b/g,'elf').replace(/\bl[' ]?oreal\b/g,'loreal').replace(/[^a-z0-9]+/g,' ').trim();
const brandFold=(value)=>fold(value).replace(/\bparis\b/g,'').trim();
const tokens=(value)=>new Set(fold(value).split(/\s+/).filter(Boolean));
const similarity=(a,b)=>{
  const A=tokens(a),B=tokens(b);
  if(!A.size||!B.size)return 0;
  let common=0; for(const t of A) if(B.has(t)) common++;
  return common/(A.size+B.size-common);
};
const slug=(value)=>fold(value).replace(/\s+/g,'-').replace(/^-|-$/g,'');
const cleanTone=(value)=>String(value||'').trim().replace(/\s*-\s*$/,'').trim();
const cleanPresentation=(value)=>String(value||'').trim().replace(/(\d+(?:\.\d+)?)\s*Onzas?/i,'$1 oz');
const displayBrand=(value)=>{
  const b=brandFold(value);
  if(b==='loreal') return 'L’Oréal Paris';
  if(b==='elf') return 'e.l.f.';
  if(b==='maybelline') return 'Maybelline';
  if(b==='nyx') return 'NYX';
  if(b==='milani') return 'Milani';
  if(b==='covergirl') return 'Covergirl';
  if(b==='starface') return 'Starface';
  if(b==='rimmel london') return 'Rimmel London';
  if(b==='prosa') return 'Prosa';
  if(b==='stay') return 'Stay';
  if(b==='coty') return 'Coty';
  return String(value||'').trim();
};
const categoryMap=new Map([
  ['bases','Bases'],['bases y corrector','Bases y corrector'],
  ['polvos sueltos','Polvos Sueltos'],['polvos compacto','Polvos Compactos'],
  ['corrector','Correctores'],['labial','Labiales'],['gloss','Labiales'],['lipstick','Labiales'],
  ['tinta','Tintas'],['blush liquido','Rubores'],['blush en polvo','Rubores'],['blush y contorno','Paletas'],
  ['bonceador compacto','Bronceadores'],['lapiz y gel de cejas','Cejas'],['lapiz de cejas','Cejas'],
  ['mascara en gel para cejas','Cejas'],['mascara de pestanas contra agua','Máscaras de pestañas'],
  ['mascara de pestanas','Máscaras de pestañas'],['rimel','Máscaras de pestañas'],
  ['parches para acne','Cuidado facial'],['primer de maquillaje','Prebases'],
  ['fijador de maquillaje','Fijadores'],['encrespadora','Accesorios']
]);
const category=(value)=>categoryMap.get(fold(value))||String(value||'').trim()||'Otros';
const explicitWithdrawn=new Set([
  'base advanced radiance de covergirl',
  'base outlast active de covergirl',
  'base superstay de maybelline'
]);

const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const existingSkus=new Set(data.products.flatMap(p=>p.variants.map(v=>v.sku)));
const products=data.products;
const result={sourceRows:INPUT.length,alreadyPresent:0,addedActive:0,addedOutOfStock:0,addedReview:0,newFamilies:0,skippedInvalidSku:[],skippedIncomplete:[],skippedWithdrawn:[],added:[]};

function findProduct(row){
  const n=fold(row.name), b=brandFold(row.brand);
  let exact=products.find(p=>fold(p.name)===n && brandFold(p.brand)===b);
  if(exact) return exact;
  const candidates=products.filter(p=>brandFold(p.brand)===b).map(p=>({p,score:similarity(p.name,row.name)})).sort((x,y)=>y.score-x.score);
  return candidates[0] && candidates[0].score>=0.72 ? candidates[0].p : null;
}
function ensureUniqueId(base){
  let id=base||'producto'; let n=2;
  while(products.some(p=>p.id===id)) id=`${base}-${n++}`;
  return id;
}
for(const row of INPUT){
  const sku=String(row.sku||'').trim();
  if(!/^FARA[A-Z0-9]+$/.test(sku)){result.skippedInvalidSku.push({row:row.row,sku});continue;}
  if(existingSkus.has(sku)){result.alreadyPresent++;continue;}
  const normalizedName=fold(row.name);
  if(explicitWithdrawn.has(normalizedName)){result.skippedWithdrawn.push({row:row.row,sku,name:row.name});continue;}
  if(!Number.isFinite(row.price)||row.price<=0||!Number.isSafeInteger(row.stock)||row.stock<0||!cleanTone(row.tone)){
    result.skippedIncomplete.push({row:row.row,sku,name:row.name,tone:row.tone,price:row.price,stock:row.stock});
    continue;
  }
  let product=findProduct(row);
  if(!product){
    const id=ensureUniqueId(slug(row.name));
    product={id,name:String(row.name).trim(),brand:displayBrand(row.brand),category:category(row.category),presentation:cleanPresentation(row.presentation),image:null,variants:[]};
    products.push(product); result.newFamilies++;
  }
  const tone=cleanTone(row.tone);
  const activeToneTaken=product.variants.some(v=>v.status==='active' && fold(v.tone)===fold(tone));
  let status=row.stock>0?'active':'out_of_stock';
  let reason;
  if(row.stock>0 && activeToneTaken){
    status='review';
    reason='SKU nuevo del inventario recibido, pero la tonalidad ya existe activa en esta familia con otro SKU. Requiere confirmar cuál referencia debe quedar vigente.';
  }
  const variant={sku,tone,price:row.price,stock:row.stock,status,sourceRows:[row.row]};
  if(reason) variant.reason=reason;
  product.variants.push(variant); existingSkus.add(sku);
  if(status==='active')result.addedActive++;
  else if(status==='out_of_stock')result.addedOutOfStock++;
  else result.addedReview++;
  result.added.push({sku,productId:product.id,name:product.name,tone,price:row.price,stock:row.stock,status});
}
data.audit=data.audit||{}; data.audit.events=data.audit.events||[];
data.audit.events.push({
  at:new Date().toISOString(),
  source:{file:'Pasted markdown.md',receivedDate:'2026-09-09',mode:'add-missing-only'},
  summary:{added:result.added.length,active:result.addedActive,outOfStock:result.addedOutOfStock,review:result.addedReview,newFamilies:result.newFamilies,skippedIncomplete:result.skippedIncomplete.length,skippedWithdrawn:result.skippedWithdrawn.length},
  changes:result.added.map(x=>({sku:x.sku,before:null,after:{tone:x.tone,price:x.price,stock:x.stock,status:x.status,productId:x.productId}}))
});
inventoryApi.inspectInventory(data);
fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
