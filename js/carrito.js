// G-CITY Carrito
const GCityCarrito = {
  items: [],

  init(){
    try {
      const saved = localStorage.getItem('gcity_cart');
      if(saved) this.items = JSON.parse(saved);
    } catch(_){}
    this.updateBadge();
    this.render();
  },

  save(){
    localStorage.setItem('gcity_cart', JSON.stringify(this.items));
    this.updateBadge();
  },

  updateBadge(){
    const count = this.items.reduce((sum, i) => sum + (i.cantidad || 0), 0);

    const badge = document.getElementById('cart-badge');
    if(badge){
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }

    const badgeHeader = document.getElementById('cart-badge-header');
    if(badgeHeader){
      badgeHeader.textContent = count;
      badgeHeader.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  agregar(productoId){
    const producto = window.GCityTienda && window.GCityTienda.productos
      ? window.GCityTienda.productos.find(p => p.id === productoId)
      : null;
    if(!producto) return;

    const existing = this.items.find(i => i.producto_id === productoId);
    if(existing){
      existing.cantidad += 1;
    } else {
      this.items.push({
        producto_id: productoId,
        nombre: producto.nombre,
        precio_cop: producto.precio_cop,
        imagen: (producto.imagenes && producto.imagenes[0]) || null,
        cantidad: 1
      });
    }

    this.save();
    this.render();
    window.showToast('✅ Agregado al carrito');
  },

  actualizar(productoId, cantidad){
    if(cantidad <= 0){
      this.items = this.items.filter(i => i.producto_id !== productoId);
    } else {
      const item = this.items.find(i => i.producto_id === productoId);
      if(item) item.cantidad = cantidad;
    }
    this.save();
    this.render();
  },

  eliminar(productoId){
    this.items = this.items.filter(i => i.producto_id !== productoId);
    this.save();
    this.render();
  },

  getTotal(){
    return this.items.reduce((sum, i) => sum + (i.precio_cop * i.cantidad), 0);
  },

  render(){
    const container = document.getElementById('carrito-items');
    const footer = document.getElementById('carrito-footer');
    if(!container) return;

    if(!this.items.length){
      container.innerHTML = `
        <div class="carrito-empty">
          <div style="font-size:48px;margin-bottom:12px">🛒</div>
          <div>Tu carrito está vacío</div>
          <button class="carrito-browse-btn" onclick="switchTab('tienda')">
            Ver productos
          </button>
        </div>`;
      if(footer) footer.style.display = 'none';
      return;
    }

    container.innerHTML = this.items.map(item => `
      <div class="carrito-item">
        ${item.imagen
          ? `<img class="carrito-item-img" src="${item.imagen}" alt=""/>`
          : `<div class="carrito-item-img" style="display:flex;align-items:center;justify-content:center;font-size:24px;background:var(--surface2)">📦</div>`
        }
        <div class="carrito-item-info">
          <div class="carrito-item-name">${item.nombre}</div>
          <div class="carrito-item-price">$${window.fmtCOP(item.precio_cop)} COP</div>
          <div class="carrito-item-controls">
            <button onclick="GCityCarrito.actualizar('${item.producto_id}', ${item.cantidad - 1})">−</button>
            <span>${item.cantidad}</span>
            <button onclick="GCityCarrito.actualizar('${item.producto_id}', ${item.cantidad + 1})">+</button>
            <button class="carrito-item-remove"
                    onclick="GCityCarrito.eliminar('${item.producto_id}')">
              <i data-lucide="trash-2" style="width:14px;height:14px"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    if(footer){
      footer.style.display = 'block';
      const totalEl = document.getElementById('carrito-total-valor');
      if(totalEl) totalEl.textContent = `$${window.fmtCOP(this.getTotal())} COP`;
    }

    if(window.lucide) window.lucide.createIcons();
  },

  checkout(){
    window.showToast('💳 Checkout disponible en Milestone 4');
  }
};

window.GCityCarrito = GCityCarrito;
