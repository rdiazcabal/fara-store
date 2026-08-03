'use strict';

const WHATSAPP_NUMBER = '50493609889';
const CART_STORAGE_KEY = 'fara-cart-v1';

const products = [
  {
    id: 1,
    brand: 'L’Oréal Paris',
    name: 'True Match Super-Blendable Foundation',
    category: 'Rostro',
    price: 445,
    oldPrice: 495,
    badge: 'Más vendido',
    description: 'Base de cobertura media modulable que ayuda a unificar el tono con un acabado natural.',
    details: ['30 ml', 'Acabado natural'],
    image: 'assets/brands-curated-products.png',
    imagePosition: '35% 50%',
    imageScale: 2.15
  },
  {
    id: 2,
    brand: 'L’Oréal Paris',
    name: 'Infallible Pro-Matte 24H',
    category: 'Rostro',
    price: 420,
    badge: 'Nuevo',
    description: 'Base de larga duración con acabado mate y sensación ligera para controlar el brillo.',
    details: ['30 ml', 'Acabado mate'],
    image: 'assets/brands-curated-products.png',
    imagePosition: '56% 48%',
    imageScale: 2.1
  },
  {
    id: 3,
    brand: 'L’Oréal Paris',
    name: 'Infallible Fresh Wear 32H',
    category: 'Rostro',
    price: 455,
    description: 'Base resistente y luminosa con vitamina C para una apariencia fresca durante el día.',
    details: ['30 ml', 'SPF 25'],
    image: 'assets/brands-curated-products.png',
    imagePosition: '76% 49%',
    imageScale: 2.15
  },
  {
    id: 4,
    brand: 'L’Oréal Paris',
    name: 'True Match Super-Blendable Powder',
    category: 'Rostro',
    price: 335,
    description: 'Polvo compacto suave para sellar la base, retocar y reducir el brillo sin resecar.',
    details: ['Polvo compacto', 'Cobertura ligera'],
    image: 'assets/brands-curated-products.png',
    imagePosition: '8% 63%',
    imageScale: 2.2
  },
  {
    id: 5,
    brand: 'L’Oréal Paris',
    name: 'Color Riche Lipstick',
    category: 'Labios',
    price: 325,
    oldPrice: 365,
    badge: 'Favorito',
    description: 'Labial cremoso con color intenso y acabado elegante para uso diario o eventos.',
    details: ['Acabado satinado', 'Alta pigmentación'],
    image: 'assets/brands-curated-products.png',
    imagePosition: '93% 62%',
    imageScale: 2.25
  },
  {
    id: 6,
    brand: 'L’Oréal Paris',
    name: 'True Match Foundation 30 ml',
    category: 'Rostro',
    price: 445,
    description: 'Base líquida fácil de difuminar. El tono se confirma con nuestro equipo antes de completar el pedido.',
    details: ['30 ml', 'Tono por confirmar'],
    image: 'assets/brands-curated-products.png',
    imagePosition: '32% 51%',
    imageScale: 1.65
  },
  {
    id: 7,
    brand: 'L’Oréal Paris',
    name: 'Infallible Foundation Duo',
    category: 'Sets',
    price: 795,
    badge: 'Dúo',
    description: 'Dúo de bases Infallible para combinar acabados y mantener una opción de respaldo.',
    details: ['2 productos', 'Precio especial'],
    image: 'assets/brands-curated-products.png',
    imagePosition: '67% 50%',
    imageScale: 1.42
  },
  {
    id: 8,
    brand: 'FARA Select',
    name: 'L’Oréal Beauty Essentials Set',
    category: 'Sets',
    price: 1295,
    badge: 'Exclusivo',
    description: 'Selección de maquillaje para rostro y labios preparada como set de uso diario o regalo.',
    details: ['Set completo', 'Edición FARA'],
    image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp',
    imagePosition: 'center',
    imageScale: 1
  }
];

const categories = ['Todos', 'Rostro', 'Labios', 'Sets'];
const currency = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 0 });
const $ = (selector) => document.querySelector(selector);

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];

    return saved.map((entry) => {
      const product = products.find((item) => item.id === Number(entry.id));
      if (!product) return null;
      return { ...product, quantity: Math.max(1, Number(entry.quantity) || 1) };
    }).filter(Boolean);
  } catch (error) {
    console.warn('No se pudo cargar el carrito guardado.', error);
    return [];
  }
}

const state = {
  category: 'Todos',
  query: '',
  sort: 'featured',
  cart: loadCart()
};

function saveCart() {
  const payload = state.cart.map((item) => ({ id: item.id, quantity: item.quantity }));
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
}

function productVisual(product) {
  return `
    <div class="product-image-frame">
      <img
        class="product-image"
        src="${product.image}"
        alt="${product.brand} ${product.name}"
        loading="lazy"
        style="--image-position:${product.imagePosition || 'center'};--image-scale:${product.imageScale || 1};"
      >
    </div>`;
}

function cartSvg(className = 'cart-empty-svg') {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20.5 8H6.2"></path><circle cx="9.5" cy="19.5" r="1.2"></circle><circle cx="17" cy="19.5" r="1.2"></circle></svg>`;
}

function trashSvg() {
  return '<svg class="cart-remove-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M7 7l1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path></svg>';
}

function visibleProducts() {
  const normalized = state.query.trim().toLowerCase();
  const filtered = products.filter((product) => {
    const categoryMatch = state.category === 'Todos' || product.category === state.category;
    const queryMatch = !normalized || `${product.brand} ${product.name} ${product.description} ${product.category}`.toLowerCase().includes(normalized);
    return categoryMatch && queryMatch;
  });

  return [...filtered].sort((a, b) => {
    if (state.sort === 'price-asc') return a.price - b.price;
    if (state.sort === 'price-desc') return b.price - a.price;
    if (state.sort === 'name') return a.name.localeCompare(b.name, 'es');
    return a.id - b.id;
  });
}

function renderCategories() {
  $('#catalogCategories').innerHTML = categories.map((category) => `
    <button class="catalog-category-button ${state.category === category ? 'is-active' : ''}" type="button" data-category="${category}">${category}</button>`).join('');
}

function renderProducts() {
  const visible = visibleProducts();
  $('#resultCount').textContent = `${visible.length} ${visible.length === 1 ? 'producto disponible' : 'productos disponibles'}`;
  $('#productsEmpty').hidden = visible.length !== 0;

  $('#retailProductGrid').innerHTML = visible.map((product) => `
    <article class="retail-card">
      <div class="retail-card-media">
        ${product.badge ? `<span class="retail-badge">${product.badge}</span>` : ''}
        ${productVisual(product)}
      </div>
      <div class="retail-card-body">
        <span class="retail-brand">${product.brand}</span>
        <h3>${product.name}</h3>
        <p class="retail-description">${product.description}</p>
        <div class="retail-meta">${product.details.map((detail) => `<span>${detail}</span>`).join('')}</div>
        <p class="retail-stock">Disponible · Precio al detalle</p>
        <div class="retail-price-row">
          <strong>${currency.format(product.price)}</strong>
          ${product.oldPrice ? `<del>${currency.format(product.oldPrice)}</del>` : ''}
        </div>
        <button class="retail-add" type="button" data-add="${product.id}">Agregar al carrito</button>
      </div>
    </article>`).join('');
}

function cartCount() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function subtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function buildWhatsAppMessage() {
  const productLines = state.cart.map((item, index) => {
    const lineTotal = item.price * item.quantity;
    return `${index + 1}. ${item.brand} - ${item.name}\n   Cantidad: ${item.quantity}\n   Total: ${currency.format(lineTotal)}`;
  });

  return [
    '*Nuevo pedido al detalle desde FARA*',
    '',
    ...productLines,
    '',
    `*Total de productos:* ${cartCount()}`,
    `*Subtotal:* ${currency.format(subtotal())}`,
    '',
    'Hola, deseo confirmar disponibilidad, tonos, forma de pago y entrega de este pedido.'
  ].join('\n');
}

function sendCartToWhatsApp() {
  if (state.cart.length === 0) return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWhatsAppMessage())}`;
  const whatsappWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!whatsappWindow) window.location.href = url;
}

function renderCart() {
  const count = cartCount();
  $('#cartTitleCount').textContent = count;
  $('#cartCount').textContent = count;
  $('#cartCount').hidden = count === 0;

  if (state.cart.length === 0) {
    $('#cartItems').innerHTML = `<div class="cart-empty"><span class="bag-icon">${cartSvg()}</span><h3>Tu carrito está esperando.</h3><p>Agrega productos del catálogo para preparar tu pedido.</p><button class="button button--dark" id="emptyClose" type="button">Ver productos</button></div>`;
    $('#cartFooter').hidden = true;
    $('#cartFooter').innerHTML = '';
    return;
  }

  $('#cartItems').innerHTML = state.cart.map((item) => `
    <article class="cart-item">
      <div class="cart-item-visual">${productVisual(item)}</div>
      <div class="cart-item-copy">
        <span>${item.brand}</span>
        <h3>${item.name}</h3>
        <strong>${currency.format(item.price)}</strong>
        <div class="cart-item-actions">
          <div class="quantity-control">
            <button data-qty="${item.id}" data-delta="-1" aria-label="Reducir cantidad de ${item.name}">−</button>
            <span>${item.quantity}</span>
            <button data-qty="${item.id}" data-delta="1" aria-label="Aumentar cantidad de ${item.name}">+</button>
          </div>
          <button class="cart-remove" type="button" data-remove="${item.id}" aria-label="Eliminar ${item.name} del carrito">${trashSvg()} Eliminar</button>
        </div>
      </div>
    </article>`).join('');

  $('#cartFooter').innerHTML = `
    <div><span>Subtotal</span><strong>${currency.format(subtotal())}</strong></div>
    <p>El precio mostrado es al detalle. Confirmaremos existencias, tonos, pago y entrega por WhatsApp.</p>
    <button class="button button--dark button--full" id="whatsappCheckout" type="button">Enviar pedido por WhatsApp <span>→</span></button>`;
  $('#cartFooter').hidden = false;
}

function addToCart(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;
  const existing = state.cart.find((item) => item.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ ...product, quantity: 1 });
  saveCart();
  renderCart();
  openCart();
}

function changeQuantity(id, delta) {
  const item = state.cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += delta;
  state.cart = state.cart.filter((entry) => entry.quantity > 0);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

function openCart() {
  $('#cartOverlay').hidden = false;
  document.body.classList.add('no-scroll');
}

function closeCart() {
  $('#cartOverlay').hidden = true;
  document.body.classList.remove('no-scroll');
}

renderCategories();
renderProducts();
renderCart();

$('#catalogCategories').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
});

$('#catalogSearch').addEventListener('input', (event) => {
  state.query = event.target.value;
  renderProducts();
});

$('#catalogSort').addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderProducts();
});

$('#retailProductGrid').addEventListener('click', (event) => {
  const button = event.target.closest('[data-add]');
  if (button) addToCart(Number(button.dataset.add));
});

$('#cartItems').addEventListener('click', (event) => {
  const quantityButton = event.target.closest('[data-qty]');
  const removeButton = event.target.closest('[data-remove]');
  if (quantityButton) changeQuantity(Number(quantityButton.dataset.qty), Number(quantityButton.dataset.delta));
  if (removeButton) removeFromCart(Number(removeButton.dataset.remove));
  if (event.target.closest('#emptyClose')) closeCart();
});

$('#cartFooter').addEventListener('click', (event) => {
  if (event.target.closest('#whatsappCheckout')) sendCartToWhatsApp();
});

$('#cartOpen').addEventListener('click', openCart);
$('#helpCartOpen').addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
$('#cartOverlay').addEventListener('click', (event) => {
  if (event.target.id === 'cartOverlay') closeCart();
});

$('#menuOpen').addEventListener('click', () => {
  $('#mobileMenu').hidden = false;
  document.body.classList.add('no-scroll');
});

$('#menuClose').addEventListener('click', () => {
  $('#mobileMenu').hidden = true;
  document.body.classList.remove('no-scroll');
});

window.addEventListener('storage', (event) => {
  if (event.key !== CART_STORAGE_KEY) return;
  state.cart = loadCart();
  renderCart();
});
