'use strict';

const fs = require('node:fs');

const VERSION = '20260910-descriptions1';

function normalized(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function sentenceName(product) {
  return product.name.replace(/\s+/g, ' ').trim();
}

function descriptionFor(product) {
  const name = sentenceName(product);
  const text = normalized(`${product.name} ${product.category}`);

  if (text.includes('base y corrector') || text.includes('skin ink')) {
    return `${name} combina en una misma línea productos para trabajar el maquillaje del rostro y zonas puntuales. Elige la tonalidad disponible que mejor se adapte a tu look.`;
  }
  if (text.includes('base')) {
    if (text.includes('pro-matte') || text.includes('pro matte')) {
      return `${name} es una base de maquillaje para completar tu rutina de rostro con un acabado de apariencia mate. Elige entre las tonalidades disponibles la que mejor se adapte a tu look.`;
    }
    if (text.includes('halo glow') || text.includes('lifter plump and glow')) {
      return `${name} es una base de maquillaje pensada para completar tu rutina de rostro con un acabado de apariencia luminosa. Selecciona la tonalidad disponible que prefieras para tu look.`;
    }
    if (text.includes('camo cc')) {
      return `${name} es una opción de maquillaje para unificar visualmente el tono del rostro y complementar tu rutina diaria. Elige entre las tonalidades disponibles la que mejor se adapte a tu look.`;
    }
    return `${name} es una base de maquillaje para completar tu rutina de rostro y elegir el tono que mejor se adapte a tu preferencia. Revisa las tonalidades disponibles antes de agregarla al carrito.`;
  }
  if (text.includes('corrector')) {
    return `${name} es un corrector para complementar tu maquillaje de rostro y trabajar zonas puntuales según el resultado que busques. Selecciona la tonalidad disponible que mejor se adapte a tu look.`;
  }
  if (text.includes('polvo')) {
    return `${name} es un polvo de maquillaje ideal para completar y dar el toque final a tu rutina de rostro. Elige la tonalidad disponible que mejor acompañe tu maquillaje.`;
  }
  if (text.includes('bronzer') || text.includes('bronceador') || text.includes('bonceador')) {
    return `${name} es un bronceador para aportar calidez y definición visual al maquillaje del rostro. Úsalo como toque final y elige la tonalidad disponible que prefieras.`;
  }
  if (text.includes('blush') || text.includes('rubor')) {
    return `${name} es un rubor para aportar un toque de color a las mejillas y complementar tu maquillaje. Escoge entre las tonalidades disponibles la que mejor combine con tu look.`;
  }
  if (text.includes('labial') || text.includes('lipstick') || text.includes('gloss') || text.includes('tinta')) {
    if (text.includes('gloss')) {
      return `${name} es un producto para labios que aporta color y un acabado de apariencia brillante. Elige la tonalidad disponible que mejor combine con tu estilo.`;
    }
    if (text.includes('matte') || text.includes('teddy tint')) {
      return `${name} es un producto para labios pensado para aportar color con un acabado de apariencia mate. Selecciona entre las tonalidades disponibles tu favorita.`;
    }
    return `${name} es un producto para labios que aporta color y completa tu maquillaje. Explora las tonalidades disponibles y elige la que mejor combine con tu estilo.`;
  }
  if (text.includes('ceja') || text.includes('brow')) {
    return `${name} es un producto para definir, peinar o complementar el maquillaje de las cejas. Elige la tonalidad disponible que mejor se adapte al resultado que buscas.`;
  }
  if (text.includes('mascara de pestanas') || text.includes('rimel')) {
    return `${name} es una máscara para resaltar y definir visualmente las pestañas como parte de tu maquillaje de ojos. Selecciona la opción disponible que prefieras.`;
  }
  if (text.includes('parches') || text.includes('starface')) {
    return `${name} son parches cosméticos para complementar tu rutina de cuidado facial. Revisa las opciones disponibles y elige el color o presentación que prefieras.`;
  }
  if (text.includes('primer')) {
    return `${name} es un primer para preparar la piel antes de aplicar el maquillaje y complementar tu rutina de rostro. Revisa la presentación disponible antes de agregarlo al carrito.`;
  }
  if (text.includes('fijador') || text.includes('setting spray')) {
    return `${name} es un fijador en spray pensado como paso final de tu rutina de maquillaje. Úsalo para completar tu look y revisa la presentación disponible.`;
  }
  if (text.includes('paleta') || text.includes('contorno')) {
    return `${name} reúne opciones de color para complementar el maquillaje del rostro y crear distintos looks. Revisa la presentación disponible antes de agregarla al carrito.`;
  }
  if (text.includes('encrespadora')) {
    return `${name} es una herramienta de maquillaje para dar forma visual a las pestañas antes o después de completar tu rutina de ojos. Revisa la presentación disponible en FARA.`;
  }
  return `${name} forma parte de la selección de maquillaje y cuidado personal disponible en FARA. Revisa su presentación y las opciones disponibles antes de agregarlo al carrito.`;
}

const inventoryPath = 'assets/inventory.json';
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
for (const product of inventory.products) product.description = descriptionFor(product);
fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2) + '\n');

function patch(path, before, after) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes(before)) throw new Error(`No se encontró patrón en ${path}: ${before.slice(0, 80)}`);
  fs.writeFileSync(path, source.replace(before, after));
}

patch(
  'assets/inventory-document.js',
  "      for (const field of ['name', 'brand', 'category']) assert(typeof product[field] === 'string' && product[field].trim(), `Campo ${field} inválido en ${product.id}`);\n      assert(Array.isArray(product.variants) && product.variants.length > 0, `Producto sin referencias: ${product.id}`);",
  "      for (const field of ['name', 'brand', 'category']) assert(typeof product[field] === 'string' && product[field].trim(), `Campo ${field} inválido en ${product.id}`);\n      assert(typeof product.description === 'string' && product.description.trim(), `Descripción inválida en ${product.id}`);\n      assert(Array.isArray(product.variants) && product.variants.length > 0, `Producto sin referencias: ${product.id}`);"
);

patch(
  'assets/inventory-core.js',
  "      assert(typeof original.category === 'string' && original.category.trim(), 'Categoría no válida');\n      assert(Array.isArray(original.variants) && original.variants.length, 'Producto sin variantes');",
  "      assert(typeof original.category === 'string' && original.category.trim(), 'Categoría no válida');\n      assert(typeof original.description === 'string' && original.description.trim(), 'Descripción no válida');\n      assert(Array.isArray(original.variants) && original.variants.length, 'Producto sin variantes');"
);
patch(
  'assets/inventory-core.js',
  "        category: original.category, categories, presentation: original.presentation || '',\n        image: original.image || null, variants: Object.freeze(variants),",
  "        category: original.category, categories, presentation: original.presentation || '',\n        description: original.description, image: original.image || null, variants: Object.freeze(variants),"
);
patch(
  'assets/inventory-core.js',
  "      return normalizeSearch([product.name, product.brand, product.category, ...product.categories, ...product.variants.flatMap((v) => [v.tone, v.sku])].join(' ')).includes(query);",
  "      return normalizeSearch([product.name, product.brand, product.category, product.description, ...product.categories, ...product.variants.flatMap((v) => [v.tone, v.sku])].join(' ')).includes(query);"
);

patch('assets/inventory-store.js', "  const VERSION = '20260909-unified1';", `  const VERSION = '${VERSION}';`);
patch(
  'assets/inventory-store.js',
  "    $('#productDetailDescription').textContent = 'Producto registrado en el inventario de FARA. Selecciona la tonalidad y confirma disponibilidad antes de completar tu pedido.';",
  "    $('#productDetailDescription').textContent = product.description;"
);

patch('assets/inventory-loader.js', "  const version = '20260909-unified1';", `  const version = '${VERSION}';`);
patch('assets/app.js', "  script.src = 'assets/inventory-loader.js?v=20260909-unified1';", `  script.src = 'assets/inventory-loader.js?v=${VERSION}';`);
patch('assets/products-page.js', "  script.src = 'assets/inventory-loader.js?v=20260909-unified1';", `  script.src = 'assets/inventory-loader.js?v=${VERSION}';`);
patch('index.html', 'assets/app.js?v=20260909-unified1', `assets/app.js?v=${VERSION}`);
patch('productos.html', 'assets/products-page.js?v=20260909-unified1', `assets/products-page.js?v=${VERSION}`);
patch('tests/catalog-display.test.js', "  const version = '20260909-unified1';", `  const version = '${VERSION}';`);
patch(
  'tests/category-filter.test.js',
  "    id:'test-mixed', name:'Producto de prueba', brand:'FARA', category:'Paletas',\n    categories:['Paletas','Rubores'], variants:[{sku:'FARATEST001',tone:'Único',price:100,stock:2}]",
  "    id:'test-mixed', name:'Producto de prueba', brand:'FARA', category:'Paletas',\n    description:'Descripción de prueba para validar el catálogo.',\n    categories:['Paletas','Rubores'], variants:[{sku:'FARATEST001',tone:'Único',price:100,stock:2}]"
);

const catalogDisplay = 'tests/catalog-display.test.js';
const catalogSource = fs.readFileSync(catalogDisplay, 'utf8');
if (!catalogSource.includes('Product detail uses the description stored on each product')) {
  fs.appendFileSync(catalogDisplay, `\n\ntest('Product detail uses the description stored on each product', () => {\n  const store = read('assets/inventory-store.js');\n  const data = JSON.parse(read('assets/inventory.json'));\n  assert.ok(data.products.every((product) => typeof product.description === 'string' && product.description.trim().length >= 80));\n  assert.equal(new Set(data.products.map((product) => product.description)).size, data.products.length);\n  assert.match(store, /productDetailDescription'\\)\\.textContent = product\\.description/);\n  assert.doesNotMatch(store, /Producto registrado en el inventario de FARA/);\n});\n`);
}

console.log(JSON.stringify({products: inventory.products.length, descriptions: inventory.products.filter(p => p.description).length, version: VERSION}, null, 2));
