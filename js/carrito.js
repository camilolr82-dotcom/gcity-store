// G-CITY Carrito — se completa en Milestone 4
const GCityCarrito = {
  items: [],

  init(){
    // Cargar carrito desde localStorage
    try {
      const saved = localStorage.getItem('gcity_cart');
      if(saved) this.items = JSON.parse(saved);
    } catch(_){}
    this.updateBadge();
  },

  updateBadge(){
    const badge = document.getElementById('cart-badge');
    if(!badge) return;
    const count = this.items.reduce((sum, i) => sum + (i.cantidad || 0), 0);
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  },

  checkout(){
    window.showToast('💳 Checkout disponible próximamente');
  }
};

window.GCityCarrito = GCityCarrito;
