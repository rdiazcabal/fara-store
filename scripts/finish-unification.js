'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=p=>path.join(root,p);
const read=p=>fs.readFileSync(file(p),'utf8');
const write=(p,text)=>fs.writeFileSync(file(p),text);
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const version='20260909-unified1';
const api=require('../assets/inventory-document.js');
const document=JSON.parse(read('assets/inventory.json'));
const checked=api.inspectInventory(document);
assert(checked.stats.activeSkus===213 && checked.stats.activeUnits===397 && checked.stats.archivedSkus===15,'El inventario cambió; no se modifica el sitio.');
function replaceOnce(p,from,to) {
  const text=read(p);
  assert(text.includes(from),`No se encontró el punto de integración en ${p}`);
  assert(text.indexOf(from)===text.lastIndexOf(from),`Punto de integración ambiguo en ${p}`);
  write(p,text.replace(from,to));
}
function replaceAll(p,from,to) {
  const text=read(p);
  assert(text.includes(from),`No se encontró ${from} en ${p}`);
  write(p,text.split(from).join(to));
}
for(const p of ['index.html','productos.html','assets/app.js','assets/products-page.js','assets/inventory-loader.js','assets/inventory-store.js']) {
  let text=read(p);
  text=text.replaceAll('20260909-clean1',version).replaceAll('20260908-inventory1',version);
  write(p,text);
}
replaceOnce('assets/inventory-loader.js',"load('inventory-core.js').then(() => load('inventory-store.js'))","load('inventory-core.js').then(() => load('inventory-document.js')).then(() => load('inventory-store.js'))");
replaceOnce('assets/inventory-store.js','const core = window.FaraCatalog;','const core = window.FaraInventory;');
replaceOnce('assets/inventory-store.js','assets/inventory-catalog.json?v=${VERSION}','assets/inventory.json?v=${VERSION}');
replaceOnce('tests/catalog-display.test.js',"const version = '20260909-clean1';",`const version = '${version}';`);
replaceOnce('tests/catalog-display.test.js',"assert.match(read('assets/inventory-loader.js'), /load\\('inventory-store\\.js'\\)/);","assert.match(read('assets/inventory-loader.js'), /load\\('inventory-document\\.js'\\)/);\n  assert.match(read('assets/inventory-loader.js'), /load\\('inventory-store\\.js'\\)/);");
write('Dockerfile',`FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY *.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -q -O - http://127.0.0.1/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
`);
const nginx=read('nginx.conf');
assert(!nginx.includes('location = /assets/inventory.json'),'La regla de inventario ya existe');
write('nginx.conf',nginx.replace('  location = /index.html {',`  # The canonical inventory must not be cached between stock updates.
  location = /assets/inventory.json {
    limit_req zone=fara_assets burst=100 nodelay;
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    try_files $uri =404;
  }

  location = /assets/inventory-catalog.json {
    return 404;
  }

  location = /index.html {`));
write('.github/workflows/inventory-validation.yml',`name: Validate FARA Inventory
on:
  pull_request:
    paths:
      - 'assets/inventory*'
      - 'assets/app.js'
      - 'assets/products-page.js'
      - 'scripts/inventory.js'
      - 'Dockerfile'
      - 'nginx.conf'
      - 'index.html'
      - 'productos.html'
      - 'tests/*.test.js'
      - '.github/workflows/inventory-validation.yml'
  push:
    branches: [main]
    paths:
      - 'assets/inventory*'
      - 'assets/app.js'
      - 'assets/products-page.js'
      - 'scripts/inventory.js'
      - 'Dockerfile'
      - 'nginx.conf'
      - 'index.html'
      - 'productos.html'
      - 'tests/*.test.js'
      - '.github/workflows/inventory-validation.yml'
permissions:
  contents: read
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Validate canonical inventory and storefront
        run: |
          node --check assets/inventory-core.js
          node --check assets/inventory-document.js
          node --check assets/inventory-store.js
          node --check scripts/inventory.js
          node --test tests/*.test.js
          node scripts/inventory.js validate
      - name: Verify production image contains only the canonical inventory
        run: |
          docker build -t fara-inventory-validation .
          docker run --rm --entrypoint sh fara-inventory-validation -c 'nginx -t && test "$(find /usr/share/nginx/html -type f -name "*.json" | wc -l)" -eq 1 && test -f /usr/share/nginx/html/assets/inventory.json && test ! -e /usr/share/nginx/html/assets/inventory-catalog.json'
`);
const readme=read('README.md');
assert(!readme.includes('## Inventario único'),'La documentación ya fue migrada');
write('README.md',readme+`
## Inventario único

La fuente oficial es [assets/inventory.json](assets/inventory.json). Es el único JSON de inventario que se mantiene y se publica. Contiene las 51 familias históricas, sus SKU, tonos, precios al detalle, existencias, fotografías, estados y auditoría. El catálogo muestra únicamente referencias con estado \`active\` y stock positivo; las demás quedan conservadas para revisión o reactivación futura.

Los estados son \`active\`, \`out_of_stock\`, \`withdrawn\`, \`review\` y \`absent_from_snapshot\`. Una referencia retirada, pendiente o ausente no se reactiva automáticamente al recibir más stock. Los SKU son identificadores únicos globales y no se comparten entre fórmulas. Las tres correcciones confirmadas de True Match están incorporadas en los datos y en la auditoría.

Para comprobar el inventario:

\`\`\`bash
node scripts/inventory.js validate
\`\`\`

Para actualizar una referencia existente sin crear otro JSON:

\`\`\`bash
node scripts/inventory.js set FARA0000523 stock=2 tone=2-3 price=490
\`\`\`

Para una carga de varias referencias, \`node scripts/inventory.js apply archivo.json\` acepta un archivo temporal con \`changes\`, o \`apply -\` acepta el contenido por stdin. El archivo de entrada no se conserva como otra fuente. Cada cambio se valida antes de escribir el inventario; los errores impiden toda la carga. Para referencias nuevas se requiere la familia verificada y sus datos de producto. Para una fotografía completa se puede indicar \`fullSnapshot: true\`: los SKU activos ausentes quedan archivados, no se ofrecen con existencias antiguas. Use esta opción únicamente cuando el corte sea completo.

El historial de cambios se conserva dentro de \`audit.events\` y en Git. Los archivos anteriores permanecen recuperables en el commit \`ec0bf355098e4104ad33cc0738670579175bd11a\`, pero ya no son fuentes activas. Las estadísticas históricas de \`audit.reconciliation\` corresponden al corte original y no se usan para calcular existencias actuales.

La tienda utiliza únicamente precios al detalle. No se incluyen costos ni precios mayoristas. Las existencias son una fotografía del inventario; no existe sincronización en tiempo real con facturación y la disponibilidad final se confirma por WhatsApp. Esta herramienta no modifica el aplicativo de facturación.
`);
for(const p of [
  'assets/inventory-catalog.json',
  'assets/inventory-additions-20260909.json',
  'data/inventory-snapshot-20260909.json',
  'data/inventory-tone-corrections-20260909.json',
  'data/inventory-archive-20260909.json',
  'scripts/build-inventory.js',
  'scripts/reconcile-inventory.js',
  'scripts/migrate-unified-inventory.js',
  'tests/inventory-additions.test.js',
  'tests/inventory-archive.test.js',
  'tests/inventory-reconciliation.test.js',
  'tests/inventory.test.js',
  '.github/workflows/inventory-unification.yml',
  'scripts/finish-unification.js'
]) if(fs.existsSync(file(p))) fs.unlinkSync(file(p));
console.log('Unified inventory is now the only active inventory source.');
