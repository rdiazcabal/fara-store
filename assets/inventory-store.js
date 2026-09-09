'use strict';

(() => {
  const VERSION = '20260908-inventory1';
  const CART_KEY = 'fara-cart-v2';
  const FAVORITES_KEY = 'fara-favorites-v2';
  const WHATSAPP_NUMBER = '50493609889';
  const core = window.FaraCatalog;
  const $ = (selector) => document.querySelector(selector);
  const money = (value) => `L ${new Intl.NumberFormat('es-HN', {minimumFractionDigits: 0, maximumFractionDigits: 2}).format(value)}`;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&gt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state = {catalog: null, category: 'Todos', query: '', sort: 'featured', cart: [], favorites: new Set(), selections: new Map(), detailId: null, previousFocus: null};
  const grid = $('#retailProductGrid') || $('#productGrid');
  const fullPage = !!$('#retailProductGrid');
  if (!grid || !core) return;

  function readStorage(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Shopping remains available when storage is disabled. */ }
  }
  function syncScroll() {
    document.body.classList.toggle('no-scroll', ['#cartOverlay', '#mobileMenu', '#productDetailModal'].some((selector) => $(selector) && !$(selector).hidden));
  }
  function announce(message) {
    const region = $('#inventoryStatus');
    if (region) region.textContent = message;
  }
  function selectedVariant(product) {
    const sku = state.selections.get(product.id);
    return product.variants.find((v) => v.sku === sku && v.stock > 0) || product.variants.find((v) => v.stock > 0) || product.variants[0];
  }
  function imagePlaceholder(product) {
    const label = `${product.brand} ${product.name}`;
    return `<div class="product-image-placeholder" role="img" aria-label="Fotografía pendiente de ${escape(label)}"><span>FARA</span><strong>${escape(product.name)}</strong><small>Fotografía pendiente</small></div>`;
  }
  function imageMarkup(product, loading = 'lazy') {
    const source = product.image;
    const label = `${product.brand} ${product.name}`;
    const placeholder = imagePlaceholder(product);
    if (!source) return `<div class="product-image-frame product-image-frame--contain">${placeholder}</div>`;
    return `<div class="product-image-frame product-image-frame--contain"><img class="product-image" src="${escape(encodeURI(source))}" alt="${escape(label)}" loading="${loading}" decoding="async" data-inventory-image="${escape(product.id)}"></div>`;
  }
  function imageButton(product, loading) {
    return `<button type="button" class="product-image-open" data-detail="${escape(product.id)}" aria-label="Ver detalle de ${escape(product.name)}">${imageMarkup(product, loading)}</button>`;
  }
  function toneSelector(product, variant, compact = false) {
    return `<label class="tone-selector${compact ? ' tone-selector--compact' : ''}"><span>Tonalidad</span><select data-tone-select="${escape(product.id)}" aria-label="Tonalidad para ${escape(product.name)}">${product.variants.map((v) => `<option value="${escape(v.sku)}" ${v.sku === variant.sku ? 'selected' : ''} ${v.stock ? '' : 'disabled'}>${escape(v.tone)}</option>`).join('')}</select></label>`;
  }
  function cardMarkup(product, index) {
    const variant = selectedVariant(product);
    const isFavorite = state.favorites.has(product.id);
    const favorite = `<button class="favorite-button${isFavorite ? ' is-active' : ''}" type="button" data-favorite="${escape(product.id)}" aria-label="${isFavorite ? 'Quitar de' : 'Agregar a'} favoritos" aria-pressed="${isFavorite}">${isFavorite ? '♥' : '♡'}</button>`;
    const stock = `<p class="retail-stock inventory-stock" data-stock>${variant.stock ? `Disponible · ${variant.stock} ${variant.stock === 1 ? 'unidad' : 'unidades'} al corte` : 'Agotado'}</p>`;
    const price = `<strong data-price>${money(variant.price)}</strong>`;
    const button = `<button class="${fullPage ? 'retail-add' : 'quick-add'}" type="button" data-add="${escape(product.id)}" ${variant.stock ? '' : 'disabled'}>${variant.stock ? 'Agregar al carrito' : 'Agotado'}</button>`;
    const media = `<div class="${fullPage ? 'retail-card-media' : 'product-media'}">${imageButton(product, index < 4 ? 'eager' : 'lazy')}${favorite}${fullPage ? '' : button}</div>`;
    if (fullPage) return `<article class="retail-card" data-product-id="${escape(product.id)}">${media}<div class="retail-card-body"><span class="retail-brand">${escape(product.brand)}</span><h3><button type="button" class="inventory-title-button" data-detail="${escape(product.id)}">${escape(product.name)}</button></h3><p class="retail-description">${escape(product.presentation || 'Presentación por confirmar')}</p>${toneSelector(product, variant)}<p class="inventory-sku" data-sku>SKU: ${escape(variant.sku)}</p>${stock}<div class="retail-price-row">${price}</div>${button}</div></article>`;
    return `<article class="product-card" data-product-id="${escape(product.id)}">${media}<div class="product-info"><span>${escape(product.brand)}</span><h3><button type="button" class="inventory-title-button" data-detail="${escape(product.id)}">${escape(product.name)}</button></h3><div class="price-row">${price}</div>${toneSelector(product, variant, true)}<p class="inventory-sku" data-sku>SKU: ${escape(variant.sku)}</p>${stock}</div></article>`;
  }
  function renderCategories() {
    const target = $('#catalogCategories') || $('#categories');
    if (!target) return;
    target.innerHTML = state.catalog.categories.map((category) => `<button type="button" class="${fullPage ? 'catalog-category-button' : 'category-pill'}${state.category === category ? ' is-active' : ''}" data-category="${escape(category)}" role="tab" aria-selected="${state.category === category}">${escape(category)}</button>`).join('');
  }
  function renderProducts() {
    const filtered = core.filterProducts(state.catalog, state);
    const visible = fullPage ? filtered : filtered.slice(0, 8);
    grid.innerHTML = visible.map(cardMarkup).join('');
    const empty = $('#productsEmpty') || $('#emptyState');
    if (empty) empty.hidden = filtered.length !== 0;
  }
  function updateSelection(productId, sku) {
    const product = state.catalog.byId.get(productId);
    const variant = product?.variants.find((v) => v.sku === sku);
    if (!variant) return;
    state.selections.set(productId, sku);
    document.querySelectorAll('[data-product-id]').forEach((card) => {
      if (card.dataset.productId !== productId) return;
      const price = card.querySelector('[data-price]');
      const stock = card.querySelector('[data-stock]');
      const skuLabel = card.querySelector('[data-sku]');
      const add = card.querySelector('[data-add]');
      if (price) price.textContent = money(variant.price);
      if (stock) stock.textContent = variant.stock ? `Disponible · ${variant.stock} ${variant.stock === 1 ? 'unidad' : 'unidades'} al corte` : 'Agotado';
      if (skuLabel) skuLabel.textContent = `SKU: ${variant.sku}`;
      if (add) {add.disabled = !variant.stock; add.textContent = variant.stock ? 'Agregar al carrito' : 'Agotado';}
      card.querySelectorAll('[data-tone-select]').forEach((select) => {select.value = sku;});
    });
    if (state.detailId === productId) updateDetailVariant(product, variant);
  }
  function saveCart() { writeStorage(CART_KEY, state.cart); }
  function addToCart(sku) {
    const variant = state.catalog.bySku.get(sku);
    if (!variant || !variant.stock) { announce('Esta tonalidad no está disponible.'); return; }
    const existing = state.cart.find((item) => item.sku === sku);
    if (existing && existing.quantity >= variant.stock) { announce('Ya tienes la existencia reportada de esta tonalidad en tu carrito.'); return; }
    state.cart = core.changeCart(state.catalog, state.cart, sku, 1);
    saveCart(); renderCart(); openCart(); announce('Producto agregado al carrito.');
  }
  function changeQuantity(sku, delta) {
    const existing = state.cart.find((item) => item.sku === sku);
    const variant = state.catalog.bySku.get(sku);
    if (delta > 0 && existing && variant && existing.quantity >= variant.stock) {announce('No hay más unidades reportadas de esta tonalidad.'); return;}
    state.cart = core.changeCart(state.catalog, state.cart, sku, delta);
    saveCart(); renderCart();
  }
  function removeItem(sku) {
    state.cart = state.cart.filter((item) => item.sku !== sku);
    saveCart(); renderCart();
  }
  function renderCart() {
    const totals = core.totals(state.catalog, state.cart);
    $('#cartTitleCount').textContent = totals.quantity;
    $('#cartCount').textContent = totals.quantity;
    $('#cartCount').hidden = totals.quantity === 0;
    const items = $('#cartItems');
    const footer = $('#cartFooter');
    if (!state.cart.length) {
      items.innerHTML = '<div class="cart-empty"><h3>Tu carrito está esperando.</h3><p>Agrega tus favoritos para preparar tu pedido.</p><button class="button button--dark" id="emptyClose" type="button">Ver productos</button></div>';
      footer.hidden = true;
      footer.innerHTML = '';
      return;
    }
    items.innerHTML = state.cart.map((item) => {
      const variant = state.catalog.bySku.get(item.sku);
      const product = state.catalog.byId.get(variant.productId);
      return `<article class="cart-item"><div class="cart-item-visual">${imageMarkup(product)}</div><div class="cart-item-copy"><span>${escape(product.brand)}</span><h3>${escape(product.name)}</h3><p class="cart-item-tone">Tonalidad: <strong>${escape(variant.tone)}</strong></p><p class="inventory-sku">SKU: ${escape(variant.sku)}</p><strong>${money(variant.price)}</strong><div class="cart-item-actions"><div class="quantity-control"><button type="button" data-qty="${escape(item.sku)}" data-delta="-1" aria-label="Reducir cantidad">−</button><span>${item.quantity}</span><button type="button" data-qty="${escape(item.sku)}" data-delta="1" ${item.quantity >= variant.stock ? 'disabled' : ''} aria-label="Aumentar cantidad">+</button></div><button class="cart-remove" type="button" data-remove="${escape(item.sku)}" aria-label="Eliminar ${escape(product.name)}">Eliminar</button></div></div></article>`;
    }).join('');
    footer.innerHTML = `<div><span>Subtotal</span><strong>${money(totals.subtotal)}</strong></div><p>Existencias al corte del 8 de septiembre de 2026. Confirmaremos disponibilidad, tonalidades, pago y entrega por WhatsApp.</p><button class="button button--dark button--full" id="whatsappCheckout" type="button">Enviar pedido por WhatsApp <span>→</span></button>`;
    footer.hidden = false;
  }
  function buildWhatsAppMessage() {
    const totals = core.totals(state.catalog, state.cart);
    const lines = state.cart.map((item, index) => {
      const variant = state.catalog.bySku.get(item.sku);
      const product = state.catalog.byId.get(variant.productId);
      return `${index + 1}. ${product.brand} - ${product.name}\n   SKU: ${variant.sku}\n   Tonalidad: ${variant.tone}\n   Cantidad: ${item.quantity}\n   Precio unitario: ${money(variant.price)}\n   Total: ${money(variant.price * item.quantity)}`;
    });
    return ['*Nuevo pedido desde FARA*', '', ...lines, '', `Total de unidades: ${totals.quantity}`, `Subtotal: ${money(totals.subtotal)}`, '', 'Hola, deseo confirmar disponibilidad, tonalidades, forma de pago y entrega.'].join('\n');
  }
  function sendCart() {
    if (!state.cart.length) return;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage())}`;
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) window.location.href = url;
  }
  function openCart() {
    closeDetail(false); closeMenu();
    $('#cartOverlay').hidden = false; syncScroll();
    $('#cartClose').focus();
  }
  function closeCart() { $('#cartOverlay').hidden = true; syncScroll(); }
  function openMenu() {closeCart(); closeDetail(false); $('#mobileMenu').hidden = false; syncScroll(); $('#menuClose').focus();}
  function closeMenu() {if ($('#mobileMenu')) $('#mobileMenu').hidden = true; syncScroll();}
  function ensureDetail() {
    if ($('#productDetailModal')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="product-detail-overlay" id="productDetailModal" hidden><section class="product-detail-modal" role="dialog" aria-modal="true" aria-labelledby="productDetailTitle"><button class="product-detail-close" id="productDetailClose" type="button" aria-label="Cerrar detalle">×</button><div class="product-detail-image" id="productDetailImage"></div><div class="product-detail-copy"><span class="eyebrow" id="productDetailBrand"></span><h2 id="productDetailTitle"></h2><p id="productDetailDescription"></p><div class="product-detail-meta" id="productDetailMeta"></div><div class="product-detail-price" id="productDetailPrice"></div><label class="tone-selector tone-selector--detail"><span>Selecciona la tonalidad</span><select id="productDetailTone"></select></label><p class="inventory-sku" id="productDetailSku"></p><p class="inventory-stock" id="productDetailStock"></p><button class="button button--dark button--full" id="productDetailAdd" type="button">Agregar al carrito <span>→</span></button></div></section></div>`);
  }
  function updateDetailVariant(product, variant) {
    $('#productDetailTone').value = variant.sku;
    $('#productDetailPrice').innerHTML = `<strong>${money(variant.price)}</strong>`;
    $('#productDetailSku').textContent = `SKU: ${variant.sku}`;
    $('#productDetailStock').textContent = variant.stock ? `${variant.stock} ${variant.stock === 1 ? 'unidad disponible' : 'unidades disponibles'} al corte` : 'Agotado';
    $('#productDetailAdd').disabled = !variant.stock;
  }
  function openDetail(id) {
    const product = state.catalog.byId.get(id);
    if (!product) return;
    state.previousFocus = document.activeElement;
    closeCart(); closeMenu(); ensureDetail();
    state.detailId = id;
    $('#productDetailImage').innerHTML = imageMarkup(product, 'eager');
    $('#productDetailBrand').textContent = product.brand;
    $('#productDetailTitle').textContent = product.name;
    $('#productDetailDescription').textContent = 'Producto registrado en el inventario de FARA. Selecciona la tonalidad y confirma disponibilidad antes de completar tu pedido.';
    $('#productDetailMeta').innerHTML = [product.category, product.presentation].filter(Boolean).map((text) => `<span>${escape(text)}</span>`).join('');
    $('#productDetailTone').innerHTML = product.variants.map((v) => `<option value="${escape(v.sku)}" ${v.stock ? '' : 'disabled'}>${escape(v.tone)}</option>`).join('');
    updateDetailVariant(product, selectedVariant(product));
    $('#productDetailModal').hidden = false; syncScroll(); $('#productDetailClose').focus();
  }
  function closeDetail(restoreFocus = true) {
    const modal = $('#productDetailModal');
    if (!modal || modal.hidden) return;
    modal.hidden = true; state.detailId = null; syncScroll();
    if (restoreFocus && state.previousFocus?.isConnected) state.previousFocus.focus();
  }
  function onClick(event) {
    const target = event.target;
    if (!state.catalog && !target.closest('#inventoryRetry, #menuOpen, #menuClose, #mobileMenu nav a')) return;
    const detail = target.closest('[data-detail]');
    if (detail) {openDetail(detail.dataset.detail); return;}
    const category = target.closest('[data-category]');
    if (category) {state.category = category.dataset.category; renderCategories(); renderProducts(); return;}
    const favorite = target.closest('[data-favorite]');
    if (favorite) {
      const id = favorite.dataset.favorite;
      state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
      writeStorage(FAVORITES_KEY, [...state.favorites]); renderProducts(); return;
    }
    const add = target.closest('[data-add]');
    if (add) {const product = state.catalog.byId.get(add.dataset.add); if (product) addToCart(selectedVariant(product).sku); return;}
    const quantity = target.closest('[data-qty]');
    if (quantity) {changeQuantity(quantity.dataset.qty, Number(quantity.dataset.delta)); return;}
    const remove = target.closest('[data-remove]');
    if (remove) {removeItem(remove.dataset.remove); return;}
    if (target.closest('#cartOpen, #helpCartOpen')) {openCart(); return;}
    if (target.closest('#cartClose, #emptyClose')) {closeCart(); return;}
    if (target.closest('#whatsappCheckout')) {sendCart(); return;}
    if (target.closest('#productDetailClose')) {closeDetail(); return;}
    if (target.closest('#productDetailAdd')) {
      const product = state.catalog.byId.get(state.detailId);
      if (product) addToCart(selectedVariant(product).sku);
      return;
    }
    if (target.closest('#menuOpen')) {openMenu(); return;}
    if (target.closest('#menuClose')) {closeMenu(); return;}
    if (target.closest('#searchToggle')) {const bar = $('#searchBar'); bar.hidden = !bar.hidden; if (!bar.hidden) $('#searchInput').focus(); return;}
    if (target.closest('#searchClose')) {state.query = ''; $('#searchInput').value = ''; $('#searchBar').hidden = true; renderProducts(); return;}
    if (target.closest('#inventoryRetry')) {loadCatalog(); return;}
    if (target.id === 'cartOverlay') closeCart();
    if (target.id === 'productDetailModal') closeDetail();
    if (target.closest('#mobileMenu nav a')) closeMenu();
  }
  function onChange(event) {
    if (!state.catalog) return;
    const target = event.target;
    if (target.matches('[data-tone-select]')) {updateSelection(target.dataset.toneSelect, target.value); return;}
    if (target.id === 'productDetailTone') {if (state.detailId) updateSelection(state.detailId, target.value); return;}
    if (target.id === 'catalogSort') {state.sort = target.value; renderProducts();}
  }
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute('data-inventory-image')) return;
    const frame = img.closest('.product-image-frame');
    const product = state.catalog?.byId.get(img.dataset.inventoryImage);
    if (frame && product) {frame.innerHTML = imagePlaceholder(product);}
  }, true);
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('input', (event) => {
    if (state.catalog && event.target.matches('#catalogSearch, #searchInput')) {state.query = event.target.value; renderProducts();}
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {closeDetail(); closeCart(); closeMenu(); return;}
    const modal = $('#productDetailModal');
    if (event.key !== 'Tab' || !modal || modal.hidden) return;
    const focusable = [...modal.querySelectorAll('button:not([disabled]), select:not([disabled])')];
    if (!focusable.length) return;
    if (event.shiftKey && document.activeElement === focusable[0]) {event.preventDefault(); focusable[focusable.length - 1].focus();}
    else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) {event.preventDefault(); focusable[0].focus();}
  });
  window.addEventListener('storage', (event) => {
    if (event.key === CART_KEY && state.catalog) {state.cart = core.sanitizeCart(state.catalog, readStorage(CART_KEY, [])); renderCart();}
  });
  const newsletter = $('#newsletterForm');
  if (newsletter) newsletter.addEventListener('submit', (event) => {event.preventDefault(); newsletter.reset(); $('#newsletterMessage').hidden = false;});

  async function loadCatalog() {
    grid.innerHTML = '<p class="inventory-loading" role="status">Cargando inventario de FARA…</p>';
    $('#cartOpen').disabled = true;
    if ($('#helpCartOpen')) $('#helpCartOpen').disabled = true;
    try {
      const response = await fetch(`assets/inventory-catalog.json?v=${VERSION}`, {cache: 'no-store'});
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.catalog = core.prepareCatalog(await response.json());
      state.cart = core.sanitizeCart(state.catalog, readStorage(CART_KEY, []));
      const savedFavorites = readStorage(FAVORITES_KEY, []);
      state.favorites = new Set((Array.isArray(savedFavorites) ? savedFavorites : []).filter((id) => state.catalog.byId.has(id)));
      saveCart();
      $('#cartOpen').disabled = false;
      if ($('#helpCartOpen')) $('#helpCartOpen').disabled = false;
      renderCategories(); renderProducts(); renderCart();
      const notice = $('#inventoryNotice');
      if (notice) notice.textContent = 'Inventario al 8 de septiembre de 2026. Los precios son al detalle y las existencias se confirman antes de completar el pedido.';
      announce('Catálogo disponible.');
    } catch (error) {
      console.error('No se pudo cargar el catálogo de FARA.', error);
      grid.innerHTML = '<div class="products-empty"><h3>No pudimos cargar el catálogo</h3><p>Intenta nuevamente. No se mostrarán productos ni precios de ejemplo.</p><button class="button button--dark" type="button" id="inventoryRetry">Reintentar</button></div>';
      announce('No se pudo cargar el inventario.');
    }
  }
  loadCatalog();
})();
