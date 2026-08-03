'use strict';

const products = [
  {
    id: 1,
    brand: 'L’Oréal Paris',
    name: 'True Match Super-Blendable Foundation',
    category: 'Rostro',
    price: 445,
    oldPrice: 495,
    badge: 'Más vendido',
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
    image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp',
    imagePosition: 'center',
    imageScale: 1
  }
];

const categories = ['Todos', 'Rostro', 'Labios', 'Sets'];
const state = { category: 'Todos', query: '', cart: [], favorites: new Set() };
const currency = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 0 });
const $ = (selector) => document.querySelector(selector);

function productVisual(product) {
  if (product.image) {
    const fitClass = product.imageFit === 'contain' ? ' product-image-frame--contain' : '';
    return `
      <div class="product-image-frame${fitClass}">
        <img
          class="product-image"
          src="${product.image}"
          alt="${product.brand} ${product.name}"
          loading="lazy"
          style="--image-position:${product.imagePosition || 'center'};--image-scale:${product.imageScale || 1};"
        >
      </div>`;
  }

  return `<div class="product-visual product-visual--${product.shape}" style="--tone-a:${product.palette[0]};--tone-b:${product.palette[1]}" aria-hidden="true"><div class="product-aura"></div><div class="product-object"><span class="product-brand-mark">F</span></div><div class="product-shadow"></div></div>`;
}

function renderCategories() {
  $('#categories').innerHTML = categories.map((category) => `<button class="category-pill ${state.category === category ? 'is-active' : ''}" data-category="${category}">${category}</button>`).join('');
}

function renderProducts() {
  const normalized = state.query.trim().toLowerCase();
  const visible = products.filter((product) => {
    const categoryMatch = state.category === 'Todos' || product.category === state.category;
    const queryMatch = !normalized || `${product.brand} ${product.name} ${product.category}`.toLowerCase().includes(normalized);
    return categoryMatch && queryMatch;
  });

  $('#productGrid').innerHTML = visible.map((product) => `
    <article class="product-card">
      <div class="product-media">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <button class="favorite-button ${state.favorites.has(product.id) ? 'is-active' : ''}" data-favorite="${product.id}" aria-label="Agregar a favoritos">${state.favorites.has(product.id) ? '♥' : '♡'}</button>
        ${productVisual(product)}
        <button class="quick-add" data-add="${product.id}">Agregar al carrito</button>
      </div>
      <div class="product-info"><span>${product.brand}</span><h3>${product.name}</h3><div class="price-row"><strong>${currency.format(product.price)}</strong>${product.oldPrice ? `<del>${currency.format(product.oldPrice)}</del>` : ''}</div></div>
    </article>`).join('');
  $('#emptyState').hidden = visible.length !== 0;
}

function cartCount() { return state.cart.reduce((sum, item) => sum + item.quantity, 0); }
function subtotal() { return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0); }

function renderCart() {
  const count = cartCount();
  $('#cartTitleCount').textContent = count;
  $('#cartCount').textContent = count;
  $('#cartCount').hidden = count === 0;

  if (state.cart.length === 0) {
    $('#cartItems').innerHTML = `<div class="cart-empty"><span class="bag-icon">□</span><h3>Tu carrito está esperando.</h3><p>Agrega tus favoritos y vuelve cuando estés lista.</p><button class="button button--dark" id="emptyClose">Ver productos</button></div>`;
    $('#cartFooter').hidden = true;
    return;
  }

  $('#cartItems').innerHTML = state.cart.map((item) => `
    <article class="cart-item"><div class="cart-item-visual">${productVisual(item)}</div><div class="cart-item-copy"><span>${item.brand}</span><h3>${item.name}</h3><strong>${currency.format(item.price)}</strong><div class="quantity-control"><button data-qty="${item.id}" data-delta="-1">−</button><span>${item.quantity}</span><button data-qty="${item.id}" data-delta="1">+</button></div></div></article>`).join('');
  $('#subtotal').textContent = currency.format(subtotal());
  $('#cartFooter').hidden = false;
}

function addToCart(id) {
  const product = products.find((item) => item.id === id);
  const existing = state.cart.find((item) => item.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ ...product, quantity: 1 });
  renderCart();
  openCart();
}

function changeQuantity(id, delta) {
  const item = state.cart.find((entry) => entry.id === id);
  if (!item) return;
  item.quantity += delta;
  state.cart = state.cart.filter((entry) => entry.quantity > 0);
  renderCart();
}

function openCart() { $('#cartOverlay').hidden = false; document.body.classList.add('no-scroll'); }
function closeCart() { $('#cartOverlay').hidden = true; document.body.classList.remove('no-scroll'); }

renderCategories();
renderProducts();
renderCart();

$('#categories').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderProducts();
});

$('#productGrid').addEventListener('click', (event) => {
  const add = event.target.closest('[data-add]');
  const favorite = event.target.closest('[data-favorite]');
  if (add) addToCart(Number(add.dataset.add));
  if (favorite) {
    const id = Number(favorite.dataset.favorite);
    state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
    renderProducts();
  }
});

$('#cartItems').addEventListener('click', (event) => {
  const button = event.target.closest('[data-qty]');
  if (button) changeQuantity(Number(button.dataset.qty), Number(button.dataset.delta));
  if (event.target.closest('#emptyClose')) closeCart();
});

$('#searchToggle').addEventListener('click', () => { $('#searchBar').hidden = !$('#searchBar').hidden; if (!$('#searchBar').hidden) $('#searchInput').focus(); });
$('#searchClose').addEventListener('click', () => { state.query = ''; $('#searchInput').value = ''; $('#searchBar').hidden = true; renderProducts(); });
$('#searchInput').addEventListener('input', (event) => { state.query = event.target.value; renderProducts(); });
$('#cartOpen').addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
$('#cartOverlay').addEventListener('click', (event) => { if (event.target.id === 'cartOverlay') closeCart(); });

$('#menuOpen').addEventListener('click', () => { $('#mobileMenu').hidden = false; document.body.classList.add('no-scroll'); });
$('#menuClose').addEventListener('click', () => { $('#mobileMenu').hidden = true; document.body.classList.remove('no-scroll'); });
$('#mobileMenu nav').addEventListener('click', () => { $('#mobileMenu').hidden = true; document.body.classList.remove('no-scroll'); });

$('#newsletterForm').addEventListener('submit', (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  $('#newsletterMessage').hidden = false;
});
