'use strict';

const WHATSAPP_NUMBER = '50400000000'; // Reemplazar por el número real sin + ni espacios.

const products = [
  { id: 1, brand: 'e.l.f.', name: 'Soft Glam Satin Foundation', category: 'Rostro', price: 395, oldPrice: 450, badge: 'Más vendido', palette: ['#e7c0a8', '#b77a5f'], shape: 'bottle' },
  { id: 2, brand: 'Maybelline', name: 'Super Stay Lumi-Matte', category: 'Rostro', price: 420, badge: 'Nuevo', palette: ['#f0c8ae', '#d59377'], shape: 'bottle' },
  { id: 3, brand: 'Revlon', name: 'ColorStay Polvo Translúcido', category: 'Rostro', price: 310, palette: ['#f5eadc', '#c8a19c'], shape: 'compact' },
  { id: 4, brand: 'L’Oréal Paris', name: 'Rouge Signature Lip Ink', category: 'Labios', price: 335, oldPrice: 375, palette: ['#b73555', '#62182d'], shape: 'lipstick' },
  { id: 5, brand: 'e.l.f.', name: 'Bite-Size Eyeshadow Rose Water', category: 'Ojos', price: 195, badge: 'Favorito', palette: ['#d8b0ac', '#7d5b63'], shape: 'palette' },
  { id: 6, brand: 'Maybelline', name: 'Lash Sensational Sky High', category: 'Ojos', price: 320, palette: ['#dfb2c8', '#1b1015'], shape: 'tube' },
  { id: 7, brand: 'CeraVe', name: 'Hydrating Facial Cleanser', category: 'Cuidado', price: 390, palette: ['#dfeaf0', '#83aebf'], shape: 'bottle' },
  { id: 8, brand: 'FARA Select', name: 'Velvet Glow Setting Powder', category: 'Rostro', price: 285, badge: 'Exclusivo', palette: ['#f3ece3', '#91766e'], shape: 'jar' }
];

const categories = ['Todos', 'Rostro', 'Labios', 'Ojos', 'Cuidado'];
const state = { category: 'Todos', query: '', cart: [], favorites: new Set() };
const currency = new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL', minimumFractionDigits: 0 });
const $ = (selector) => document.querySelector(selector);

function productVisual(product) {
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

function checkout() {
  const lines = state.cart.map((item) => `• ${item.quantity} × ${item.brand} ${item.name} — ${currency.format(item.price * item.quantity)}`);
  const message = encodeURIComponent(`Hola FARA, deseo confirmar este pedido:\n\n${lines.join('\n')}\n\nSubtotal: ${currency.format(subtotal())}`);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank', 'noopener,noreferrer');
}

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
$('#checkoutButton').addEventListener('click', checkout);

$('#menuOpen').addEventListener('click', () => { $('#mobileMenu').hidden = false; document.body.classList.add('no-scroll'); });
$('#menuClose').addEventListener('click', () => { $('#mobileMenu').hidden = true; document.body.classList.remove('no-scroll'); });
$('#mobileMenu nav').addEventListener('click', () => { $('#mobileMenu').hidden = true; document.body.classList.remove('no-scroll'); });

$('#newsletterForm').addEventListener('submit', (event) => {
  event.preventDefault();
  event.currentTarget.reset();
  $('#newsletterMessage').hidden = false;
});
