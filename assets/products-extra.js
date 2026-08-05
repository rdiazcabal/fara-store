'use strict';

const extraProducts = [
  { id: 9, brand: 'Maybelline', name: 'Super Stay Lumi-Matte Foundation', category: 'Rostro', price: 420, badge: 'Nuevo', description: 'Base ligera de larga duración con acabado luminoso-mate y cobertura modulable.', details: ['30 ml', 'Larga duración'], image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp', imagePosition: '18% 45%', imageScale: 1.45 },
  { id: 10, brand: 'Maybelline', name: 'Fit Me Matte + Poreless', category: 'Rostro', price: 295, oldPrice: 325, description: 'Base de acabado mate diseñada para ayudar a controlar brillo y suavizar visualmente los poros.', details: ['30 ml', 'Acabado mate'], image: 'assets/brands-curated-products.png', imagePosition: '56% 48%', imageScale: 2.05 },
  { id: 11, brand: 'Maybelline', name: 'Instant Age Rewind Concealer', category: 'Rostro', price: 285, badge: 'Favorito', description: 'Corrector de textura ligera para iluminar el contorno de ojos y cubrir imperfecciones.', details: ['Corrector', 'Cobertura media'], image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp', imagePosition: '73% 48%', imageScale: 1.8 },
  { id: 12, brand: 'Maybelline', name: 'Sky High Mascara', category: 'Ojos', price: 340, badge: 'Más vendido', description: 'Máscara para pestañas que aporta longitud y definición con una fórmula flexible.', details: ['Máscara', 'Efecto alargador'], image: 'assets/brands-curated-products.png', imagePosition: '92% 58%', imageScale: 2.25 },
  { id: 13, brand: 'Maybelline', name: 'Lifter Gloss', category: 'Labios', price: 265, description: 'Brillo labial con apariencia jugosa y sensación cómoda para uso diario.', details: ['Gloss', 'Acabado brillante'], image: 'assets/brands-curated-products.png', imagePosition: '89% 62%', imageScale: 2.2 },
  { id: 14, brand: 'e.l.f.', name: 'Halo Glow Liquid Filter', category: 'Rostro', price: 395, badge: 'Tendencia', description: 'Potenciador de luminosidad para usar solo, debajo de la base o mezclado con maquillaje.', details: ['Luminosidad', 'Uso versátil'], image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp', imagePosition: '43% 45%', imageScale: 1.65 },
  { id: 15, brand: 'e.l.f.', name: 'Power Grip Primer', category: 'Preparación', price: 335, description: 'Primer con efecto adherente que ayuda a preparar la piel y prolongar el maquillaje.', details: ['Primer', 'Acabado hidratante'], image: 'assets/brands-curated-products.png', imagePosition: '31% 51%', imageScale: 1.85 },
  { id: 16, brand: 'e.l.f.', name: 'Hydrating Camo Concealer', category: 'Rostro', price: 275, description: 'Corrector hidratante de alta cobertura con acabado satinado y aplicación uniforme.', details: ['Corrector', 'Alta cobertura'], image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp', imagePosition: '61% 47%', imageScale: 1.72 },
  { id: 17, brand: 'Revlon', name: 'ColorStay Foundation', category: 'Rostro', price: 390, oldPrice: 430, description: 'Base de larga duración con cobertura modulable para una apariencia uniforme durante el día.', details: ['30 ml', 'Larga duración'], image: 'assets/brands-curated-products.png', imagePosition: '73% 50%', imageScale: 2.0 },
  { id: 18, brand: 'Revlon', name: 'Super Lustrous Lipstick', category: 'Labios', price: 240, badge: 'Clásico', description: 'Labial cremoso con pigmentación intensa y acabado cómodo para uso diario.', details: ['Labial', 'Acabado cremoso'], image: 'assets/brands-curated-products.png', imagePosition: '94% 61%', imageScale: 2.3 },
  { id: 19, brand: 'Revlon', name: 'PhotoReady Candid Powder', category: 'Rostro', price: 310, description: 'Polvo para sellar el maquillaje y reducir brillo manteniendo una apariencia natural.', details: ['Polvo', 'Acabado natural'], image: 'assets/brands-curated-products.png', imagePosition: '8% 64%', imageScale: 2.25 },
  { id: 20, brand: 'L’Oréal Paris', name: 'Panorama Mascara', category: 'Ojos', price: 365, badge: 'Nuevo', description: 'Máscara para pestañas que ayuda a crear una mirada más abierta y definida.', details: ['Máscara', 'Volumen definido'], image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp', imagePosition: '84% 48%', imageScale: 1.9 },
  { id: 21, brand: 'L’Oréal Paris', name: 'Brow Stylist Definer', category: 'Cejas', price: 255, description: 'Lápiz fino para rellenar, perfilar y definir las cejas con trazos precisos.', details: ['Cejas', 'Punta fina'], image: 'assets/brands-curated-products.png', imagePosition: '88% 58%', imageScale: 2.15 },
  { id: 22, brand: 'L’Oréal Paris', name: 'Infallible Setting Spray', category: 'Preparación', price: 345, description: 'Spray fijador para ayudar a prolongar el maquillaje y reducir la transferencia.', details: ['Fijador', 'Larga duración'], image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp', imagePosition: '8% 48%', imageScale: 1.6 },
  { id: 23, brand: 'FARA Select', name: 'Starter Makeup Set', category: 'Sets', price: 1095, oldPrice: 1195, badge: 'Set especial', description: 'Selección básica para rostro, ojos y labios ideal para comenzar o renovar tu cosmetiquera.', details: ['4 productos', 'Precio especial'], image: 'assets/Base-maquillaje-LOreal-2-1200x675.webp', imagePosition: 'center', imageScale: 1 }
];

products.push(...extraProducts);
state.cart = loadCart();
renderCart();

if (document.querySelector('#retailProductGrid')) {
  ['Ojos', 'Cejas', 'Preparación'].forEach((category) => {
    if (!categories.includes(category)) categories.push(category);
  });
  renderCategories();
  renderProducts();
}

const productDetailStyles = document.createElement('link');
productDetailStyles.rel = 'stylesheet';
productDetailStyles.href = 'assets/product-detail.css?v=20260805-1523';
document.head.appendChild(productDetailStyles);

const productVariantsScript = document.createElement('script');
productVariantsScript.src = 'assets/product-variants.js?v=20260805-1523';
productVariantsScript.async = false;
document.body.appendChild(productVariantsScript);
