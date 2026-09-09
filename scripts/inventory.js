'use strict';
const fs = require('node:fs');
const path = require('node:path');
const inventory = require('../assets/inventory-document.js');
const FILE = path.resolve(__dirname, '../assets/inventory.json');
const clone = value => JSON.parse(JSON.stringify(value));
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const read = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function applyUpdates(source, input) {
  assert(input && Array.isArray(input.changes) && input.changes.length, 'Se requiere un arreglo changes');
  const next = clone(source);
  const original = inventory.inspectInventory(next);
  const products = new Map(next.products.map(p => [p.id, p]));
  const bySku = new Map();
  for (const product of next.products) for (const variant of product.variants) bySku.set(variant.sku, {product, variant});
  const seen = new Set();
  const changes = [];
  for (const change of input.changes) {
    assert(change && typeof change.sku === 'string' && !seen.has(change.sku), `SKU repetido en la carga: ${change && change.sku}`);
    seen.add(change.sku);
    const old = bySku.get(change.sku);
    const productId = change.productId || old?.product.id;
    assert(productId && (!old || old.product.id === productId), `Familia incorrecta para ${change.sku}`);
    let product = products.get(productId);
    if (!product) {
      assert(change.product && change.product.id === productId, `Faltan datos de la nueva familia ${productId}`);
      const {variants, ...meta} = change.product;
      product = {...clone(meta), variants:[]};
      next.products.push(product);
      products.set(productId, product);
    }
    const before = old ? clone(old.variant) : null;
    const variant = old ? old.variant : {sku:change.sku};
    for (const key of ['tone','price','stock','sourceRows','reason']) if (Object.hasOwn(change,key)) variant[key] = clone(change[key]);
    if (Object.hasOwn(change,'status')) variant.status = change.status;
    else if (!old || ['active','out_of_stock'].includes(before.status)) variant.status = variant.stock > 0 ? 'active' : 'out_of_stock';
    // Review, withdrawn and absent references require an explicit status to reactivate.
    if (!old) {product.variants.push(variant); bySku.set(variant.sku,{product,variant});}
    changes.push({sku:change.sku,before,after:clone(variant)});
  }
  if (input.fullSnapshot === true) {
    for (const [sku,entry] of bySku) if (!seen.has(sku) && entry.variant.status === 'active') {
      const before = clone(entry.variant);
      entry.variant.status = 'absent_from_snapshot';
      changes.push({sku,before,after:clone(entry.variant)});
    }
  }
  if (input.source) {
    assert(typeof input.source === 'object' && !Array.isArray(input.source), 'Origen inválido');
    for (const key of ['file','receivedDate','cutoff','stockIsSnapshot']) if (Object.hasOwn(input.source,key)) next.source[key] = input.source[key];
  }
  const checked = inventory.inspectInventory(next);
  for (const [sku,entry] of original.allBySku) assert(checked.allBySku.has(sku), `Se perdió el SKU ${sku}`);
  next.audit = next.audit || {};
  next.audit.events = next.audit.events || [];
  next.audit.events.push({at:new Date().toISOString(),source:input.source || null,changes});
  return next;
}
function write(next) {
  inventory.inspectInventory(next);
  const temporary = `${FILE}.tmp`;
  try {
    fs.writeFileSync(temporary,JSON.stringify(next,null,2)+'\n');
    fs.renameSync(temporary,FILE);
  } catch(error) { try {fs.unlinkSync(temporary);} catch {} throw error; }
}
function main(args=process.argv.slice(2)) {
  const command=args.shift() || 'validate';
  if (command === 'validate') {
    console.log(JSON.stringify(inventory.inspectInventory(read()).stats,null,2));
    return;
  }
  let input;
  if (command === 'set') {
    const sku=args.shift();
    assert(sku, 'Uso: node scripts/inventory.js set SKU stock=2 tone=118 price=490 status=active');
    const change={sku};
    for (const arg of args) {
      const index=arg.indexOf('=');
      assert(index>0,`Argumento inválido: ${arg}`);
      const key=arg.slice(0,index), value=arg.slice(index+1);
      assert(['productId','tone','price','stock','status','reason'].includes(key),`Campo no permitido: ${key}`);
      change[key]=['price','stock'].includes(key)?Number(value):value;
    }
    input={changes:[change]};
  } else if (command === 'apply') {
    const text=args[0] && args[0]!=='-' ? fs.readFileSync(args[0],'utf8') : fs.readFileSync(0,'utf8');
    input=JSON.parse(text);
  } else throw new Error('Comandos: validate, set SKU campo=valor, apply [archivo|-]');
  const next=applyUpdates(read(),input);
  write(next);
  console.log(JSON.stringify(inventory.inspectInventory(next).stats,null,2));
}
if (require.main===module) {
  try {main();} catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={read,applyUpdates,write,main,FILE};
