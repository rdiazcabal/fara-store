'use strict';

const fs = require('node:fs');
const path = require('node:path');
const core = require('../assets/inventory-core.js');

function mergeCatalog(base, additions) {
  // Validate both sources before constructing a new, independent catalog.
  const current = core.prepareCatalog(base);
  core.prepareCatalog(additions);
  const excluded = new Set(additions.excludedSkus || []);
  const products = base.products.map((p) => ({
    ...p, variants: p.variants.filter((v) => !excluded.has(v.sku)).map((v) => ({...v}))
  })).filter((p) => p.variants.length);
  const byId = new Map(products.map((p) => [p.id, p]));
  const bySku = new Map();
  for (const product of products) {
    for (const variant of product.variants) bySku.set(variant.sku, product.id);
  }
  const seen = new Set();

  for (const incoming of additions.products) {
    let product = byId.get(incoming.id);
    if (!product) {
      product = {...incoming, variants: []};
      products.push(product);
      byId.set(product.id, product);
    }
    // An existing family's name, category, presentation and image are authoritative.
    for (const variant of incoming.variants) {
      if (excluded.has(variant.sku)) throw new Error(`Referencia excluida: ${variant.sku}`);
      if (seen.has(variant.sku)) throw new Error(`SKU repetido en la carga: ${variant.sku}`);
      seen.add(variant.sku);
      if (bySku.has(variant.sku)) {
        if (bySku.get(variant.sku) !== product.id) throw new Error(`SKU asociado a otra familia: ${variant.sku}`);
        continue; // Never overwrite a previously published SKU.
      }
      if (product.variants.some((v) => v.tone === variant.tone)) {
        throw new Error(`Tono duplicado en ${product.id}: ${variant.tone}`);
      }
      product.variants.push({...variant});
      bySku.set(variant.sku, product.id);
    }
  }
  const merged = {
    ...base,
    source: {...base.source, additionsCutoff: additions.source.cutoff},
    products
  };
  const checked = core.prepareCatalog(merged);
  if (checked.bySku.size !== bySku.size) throw new Error('El catálogo combinado perdió referencias');
  if (!current.products.length) throw new Error('Catálogo base vacío');
  return merged;
}

function buildInventory(outputPath) {
  const root = path.resolve(__dirname, '..');
  const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  const base = read('assets/inventory-catalog.json');
  const additions = read('assets/inventory-additions-20260909.json');
  const merged = mergeCatalog(base, additions);
  const destination = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(destination, JSON.stringify(merged, null, 2) + '\n');
  const catalog = core.prepareCatalog(merged);
  return {products:catalog.products.length, skus:catalog.bySku.size,
    units:catalog.products.reduce((sum,p)=>sum+p.stock,0), output:destination};
}

if (require.main === module) {
  const output = process.argv[2] || path.resolve(__dirname, '../dist/inventory-catalog.json');
  console.log(JSON.stringify(buildInventory(output)));
}

module.exports = {mergeCatalog, buildInventory};
