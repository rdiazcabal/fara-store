'use strict';

(() => {
  const DEFAULT_TONES = {
    foundation: ['Porcelain', 'Ivory', 'Natural Beige', 'Warm Beige', 'Golden Honey', 'Caramel'],
    concealer: ['Light', 'Light Medium', 'Medium', 'Tan', 'Deep'],
    powder: ['Translúcido', 'Claro', 'Medio', 'Oscuro'],
    lipstick: ['Nude Rosado', 'Rosa Malva', 'Rojo Clásico', 'Vino', 'Terracota'],
    gloss: ['Crystal', 'Petal', 'Topaz', 'Ruby'],
    mascara: ['Negro', 'Negro Intenso', 'Café'],
    brow: ['Soft Brown', 'Medium Brown', 'Dark Brown', 'Black Brown'],
    primer: ['Única'],
    spray: ['Única'],
    set: ['Única']
  };

  const toneOverrides = {
    1: DEFAULT_TONES.foundation,
    2: ['101 Classic Ivory', '102 Shell Beige', '103 Natural Buff', '104 Golden Beige', '105.5 Light Beige', '106 Sun Beige'],
    3: ['400 Pearl', '410 Ivory', '420 True Beige', '425 Linen', '460 Golden Beige', '485 Golden Sun'],
    4: DEFAULT_TONES.powder,
    5: DEFAULT_TONES.lipstick,
    6: DEFAULT_TONES.foundation,
    7: DEFAULT_TONES.foundation,
    8: DEFAULT_TONES.set,
    9: ['110 Porcelain', '118 Light Beige', '128 Warm Nude', '220 Natural Beige', '228 Soft Tan', '310 Sun Beige'],
    10: ['110 Porcelain', '118 Light Beige', '128 Warm Nude', '220 Natural Beige', '228 Soft Tan', '310 Sun Beige'],
    11: DEFAULT_TONES.concealer,
    12: DEFAULT_TONES.mascara,
    13: DEFAULT_TONES.gloss,
    14: ['Fair 1', 'Fair/Light 2', 'Light/Medium 3', 'Medium/Tan 4', 'Tan/Deep 5'],
    15: DEFAULT_TONES.primer,
    16: DEFAULT_TONES.concealer,
    17: DEFAULT_TONES.foundation,
    18: DEFAULT_TONES.lipstick,
    19: DEFAULT_TONES.powder,
    20: DEFAULT_TONES.mascara,
    21: DEFAULT_TONES.brow,
    22: DEFAULT_TONES.spray,
    23: DEFAULT_TONES.set
  };

  const fallbackTones = (product) => {
    const name = `${product.name} ${product.category}`.toLowerCase();
    if (name.includes('concealer') || name.includes('corrector')) return DEFAULT_TONES.concealer;
    if (name.includes('powder') || name.includes('polvo')) return DEFAULT_TONES.powder;
    if (name.includes('lipstick') || name.includes('labial')) return DEFAULT_TONES.lipstick;
    if (name.includes('gloss')) return DEFAULT_TONES.gloss;
    if (name.includes('mascara') || name.includes('pestaña')) return DEFAULT_TONES.mascara;
    if (name.includes('brow') || name.includes('ceja')) return DEFAULT_TONES.brow;
    if (product.category === 'Sets') return DEFAULT_TONES.set;
    if (product.category === 'Rostro') return DEFAULT_TONES.foundation;
    return ['Única'];
  };

  products.forEach((product) => {
    product.tones = toneOverrides[product.id] || fallbackTones(product);
  });

  const toneFor = (product, value) => value || product.tones?.[0] || 'Única';
  const itemKey = (id, tone) => `${Number(id)}::${tone || 'Única'}`;
  const productById = (id) => products.find((product) => product.id === Number(id));

  function normalizeStoredCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) return [];
      return saved.map((entry) => {
        const product = productById(entry.id);
        if (!product) return null;
        const tone = toneFor(product, entry.tone);
        return {
          ...product,
          tone,
          cartKey: itemKey(product.id, tone),
          quantity: Math.max(1, Number(entry.quantity) || 1)
        };
      }).filter(Boolean);
    } catch (error) {
      console.warn('No se pudo cargar el carrito con tonalidades.', error);
      return [];
    }
  }

  loadCart = normalizeStoredCart;
  state.cart = normalizeStoredCart();

  saveCart = function saveCartWithTones() {
    const payload = state.cart.map((item) => ({
      id: item.id,
      tone: toneFor(item, item.tone),
      quantity: item.quantity
    }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
  };

  function toneOptions(product, selectedTone) {
    return product.tones.map((tone) => `<option value="${tone}" ${tone === selectedTone ? 'selected' : ''}>${tone}</option>`).join('');
  }

  function enhanceCards() {
    document.querySelectorAll('.retail-card').forEach((card) => {
      const addButton = card.querySelector('[data-add]');
      if (!addButton) return;
      const product = productById(addButton.dataset.add);
      if (!product) return;

      card.dataset.productId = product.id;
      const media = card.querySelector('.retail-card-media');
      if (media && !media.dataset.detailReady) {
        media.dataset.detailReady = 'true';
        media.setAttribute('role', 'button');
        media.setAttribute('tabindex', '0');
        media.setAttribute('aria-label', `Ver detalle de ${product.name}`);
        media.classList.add('is-clickable');
      }

      const body = card.querySelector('.retail-card-body');
      if (body && !body.querySelector('.tone-selector')) {
        const label = document.createElement('label');
        label.className = 'tone-selector';
        label.innerHTML = `<span>Tonalidad</span><select data-tone-select="${product.id}" aria-label="Tonalidad para ${product.name}">${toneOptions(product, product.tones[0])}</select>`;
        addButton.before(label);
      }
    });

    document.querySelectorAll('.product-card').forEach((card) => {
      const addButton = card.querySelector('[data-add]');
      if (!addButton) return;
      const product = productById(addButton.dataset.add);
      if (!product) return;

      card.dataset.productId = product.id;
      const media = card.querySelector('.product-media');
      if (media && !media.dataset.detailReady) {
        media.dataset.detailReady = 'true';
        media.setAttribute('role', 'button');
        media.setAttribute('tabindex', '0');
        media.setAttribute('aria-label', `Ver detalle de ${product.name}`);
        media.classList.add('is-clickable');
      }

      const info = card.querySelector('.product-info');
      if (info && !info.querySelector('.tone-selector')) {
        const label = document.createElement('label');
        label.className = 'tone-selector tone-selector--compact';
        label.innerHTML = `<span>Tonalidad</span><select data-tone-select="${product.id}" aria-label="Tonalidad para ${product.name}">${toneOptions(product, product.tones[0])}</select>`;
        info.appendChild(label);
      }
    });
  }

  const originalRenderProducts = renderProducts;
  renderProducts = function renderProductsWithTones() {
    originalRenderProducts();
    enhanceCards();
  };

  function addVariantToCart(id, tone) {
    const product = productById(id);
    if (!product) return;
    const selectedTone = toneFor(product, tone);
    const key = itemKey(product.id, selectedTone);
    const existing = state.cart.find((item) => (item.cartKey || itemKey(item.id, item.tone)) === key);

    if (existing) existing.quantity += 1;
    else state.cart.push({ ...product, tone: selectedTone, cartKey: key, quantity: 1 });

    saveCart();
    renderCart();
    openCart();
  }

  function cartSvgFixed() {
    return '<svg class="cart-empty-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>';
  }

  renderCart = function renderVariantCart() {
    const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelector('#cartTitleCount').textContent = count;
    const countBadge = document.querySelector('#cartCount');
    countBadge.textContent = count;
    countBadge.hidden = count === 0;

    const itemsContainer = document.querySelector('#cartItems');
    const footer = document.querySelector('#cartFooter');

    if (state.cart.length === 0) {
      itemsContainer.innerHTML = `<div class="cart-empty"><span class="bag-icon">${cartSvgFixed()}</span><h3>Tu carrito está esperando.</h3><p>Agrega tus favoritos y vuelve cuando estés lista.</p><button class="button button--dark" id="emptyClose" type="button">Ver productos</button></div>`;
      footer.hidden = true;
      footer.innerHTML = '';
      return;
    }

    itemsContainer.innerHTML = state.cart.map((item) => {
      const key = item.cartKey || itemKey(item.id, item.tone);
      return `<article class="cart-item">
        <div class="cart-item-visual">${productVisual(item)}</div>
        <div class="cart-item-copy">
          <span>${item.brand}</span>
          <h3>${item.name}</h3>
          <p class="cart-item-tone">Tonalidad: <strong>${toneFor(item, item.tone)}</strong></p>
          <strong>${currency.format(item.price)}</strong>
          <div class="cart-item-actions">
            <div class="quantity-control">
              <button data-variant-qty="${key}" data-delta="-1" aria-label="Reducir cantidad">−</button>
              <span>${item.quantity}</span>
              <button data-variant-qty="${key}" data-delta="1" aria-label="Aumentar cantidad">+</button>
            </div>
            <button class="cart-remove" type="button" data-variant-remove="${key}" aria-label="Eliminar ${item.name} del carrito">${trashSvg()} Eliminar</button>
          </div>
        </div>
      </article>`;
    }).join('');

    footer.innerHTML = `<div><span>Subtotal</span><strong>${currency.format(subtotal())}</strong></div>
      <p>Confirmaremos existencias, tonalidades, forma de pago y entrega por WhatsApp.</p>
      <button class="button button--dark button--full" id="whatsappCheckout" type="button">Enviar pedido por WhatsApp <span>→</span></button>`;
    footer.hidden = false;
  };

  buildWhatsAppMessage = function buildVariantMessage() {
    const productLines = state.cart.map((item, index) => {
      const lineTotal = item.price * item.quantity;
      return `${index + 1}. ${item.brand} - ${item.name}\n   Tonalidad: ${toneFor(item, item.tone)}\n   Cantidad: ${item.quantity}\n   Total: ${currency.format(lineTotal)}`;
    });

    return [
      '*Nuevo pedido desde FARA*',
      '',
      ...productLines,
      '',
      `*Total de productos:* ${cartCount()}`,
      `*Subtotal:* ${currency.format(subtotal())}`,
      '',
      'Hola, deseo confirmar disponibilidad, tonalidades, forma de pago y entrega de este pedido.'
    ].join('\n');
  };

  function changeVariantQuantity(key, delta) {
    const item = state.cart.find((entry) => (entry.cartKey || itemKey(entry.id, entry.tone)) === key);
    if (!item) return;
    item.quantity += delta;
    state.cart = state.cart.filter((entry) => entry.quantity > 0);
    saveCart();
    renderCart();
  }

  function removeVariant(key) {
    state.cart = state.cart.filter((entry) => (entry.cartKey || itemKey(entry.id, entry.tone)) !== key);
    saveCart();
    renderCart();
  }

  function ensureModal() {
    if (document.querySelector('#productDetailModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="product-detail-overlay" id="productDetailModal" hidden>
        <section class="product-detail-modal" role="dialog" aria-modal="true" aria-labelledby="productDetailTitle">
          <button class="product-detail-close" id="productDetailClose" type="button" aria-label="Cerrar detalle">×</button>
          <div class="product-detail-image" id="productDetailImage"></div>
          <div class="product-detail-copy">
            <span class="eyebrow" id="productDetailBrand"></span>
            <h2 id="productDetailTitle"></h2>
            <p id="productDetailDescription"></p>
            <div class="product-detail-meta" id="productDetailMeta"></div>
            <div class="product-detail-price" id="productDetailPrice"></div>
            <label class="tone-selector tone-selector--detail">
              <span>Selecciona la tonalidad</span>
              <select id="productDetailTone"></select>
            </label>
            <button class="button button--dark button--full" id="productDetailAdd" type="button">Agregar al carrito <span>→</span></button>
          </div>
        </section>
      </div>`);
  }

  function openProductDetail(id) {
    const product = productById(id);
    if (!product) return;
    ensureModal();
    const modal = document.querySelector('#productDetailModal');
    modal.dataset.productId = product.id;
    document.querySelector('#productDetailImage').innerHTML = productVisual(product);
    document.querySelector('#productDetailBrand').textContent = product.brand;
    document.querySelector('#productDetailTitle').textContent = product.name;
    document.querySelector('#productDetailDescription').textContent = product.description || 'Producto seleccionado por FARA. Confirma disponibilidad y tonalidad antes de completar tu pedido.';
    document.querySelector('#productDetailMeta').innerHTML = (product.details || [product.category, 'Precio al detalle']).map((detail) => `<span>${detail}</span>`).join('');
    document.querySelector('#productDetailPrice').innerHTML = `<strong>${currency.format(product.price)}</strong>${product.oldPrice ? `<del>${currency.format(product.oldPrice)}</del>` : ''}`;
    document.querySelector('#productDetailTone').innerHTML = toneOptions(product, product.tones[0]);
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    document.querySelector('#productDetailClose').focus();
  }

  function closeProductDetail() {
    const modal = document.querySelector('#productDetailModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  document.addEventListener('click', (event) => {
    const addButton = event.target.closest('.retail-add[data-add], .quick-add[data-add]');
    if (addButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const card = addButton.closest('.retail-card, .product-card');
      const select = card?.querySelector('[data-tone-select]');
      addVariantToCart(addButton.dataset.add, select?.value);
      return;
    }

    const media = event.target.closest('.retail-card-media.is-clickable, .product-media.is-clickable');
    if (media && !event.target.closest('button')) {
      const card = media.closest('[data-product-id]');
      if (card) openProductDetail(card.dataset.productId);
      return;
    }

    const qtyButton = event.target.closest('[data-variant-qty]');
    if (qtyButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      changeVariantQuantity(qtyButton.dataset.variantQty, Number(qtyButton.dataset.delta));
      return;
    }

    const removeButton = event.target.closest('[data-variant-remove]');
    if (removeButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      removeVariant(removeButton.dataset.variantRemove);
      return;
    }

    if (event.target.closest('#productDetailClose') || event.target.id === 'productDetailModal') closeProductDetail();

    const detailAdd = event.target.closest('#productDetailAdd');
    if (detailAdd) {
      const modal = document.querySelector('#productDetailModal');
      addVariantToCart(modal.dataset.productId, document.querySelector('#productDetailTone').value);
      closeProductDetail();
    }
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeProductDetail();
    const media = event.target.closest?.('.retail-card-media.is-clickable, .product-media.is-clickable');
    if (media && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const card = media.closest('[data-product-id]');
      if (card) openProductDetail(card.dataset.productId);
    }
  });

  renderProducts();
  renderCart();
})();
