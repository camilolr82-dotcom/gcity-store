// G-CITY Tienda
const GCityTienda = {
  productos: [],
  filtroActual: 'todo',

  async init(){
    this.setupSearch();
    await this.loadProductos();
  },

  setupSearch(){
    const input = document.getElementById('tienda-search-input');
    if(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          GCityTienda.buscar();
        }
      });
    }
  },

  toggleSearch(){
    const bar = document.getElementById('tienda-search-bar');
    if(!bar) return;
    const visible = bar.style.display !== 'none';
    bar.style.display = visible ? 'none' : 'block';
    if(!visible){
      const input = document.getElementById('tienda-search-input');
      if(input) input.focus();
    }
  },

  async loadProductos(){
    const sb = window.GCity.supabase.getClient();
    if(!sb){
      this.renderEmpty('Conectando con la tienda...');
      return;
    }

    const { data, error } = await sb
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('destacado', { ascending: false })
      .order('created_at', { ascending: false });

    if(error){
      console.error('Error loading productos:', error);
      this.renderEmpty('Error cargando productos');
      return;
    }

    this.productos = data || [];

    if(!this.productos.length){
      this.renderEmpty();
      return;
    }

    this.renderProductos(this.productos);
  },

  filtrar(cat, el){
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if(el) el.classList.add('active');

    this.filtroActual = cat;

    if(cat === 'todo'){
      this.renderProductos(this.productos);
    } else {
      const filtered = this.productos.filter(p => p.categoria === cat);
      this.renderProductos(filtered);
    }
  },

  buscar(){
    const input = document.getElementById('tienda-search-input');
    if(!input) return;
    const q = input.value.trim().toLowerCase();
    if(!q){
      this.renderProductos(this.productos);
      return;
    }

    const filtered = this.productos.filter(p => {
      const searchable = [
        p.nombre, p.descripcion, p.categoria,
        ...(p.tags || [])
      ].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(q);
    });

    this.renderProductos(filtered);
  },

  renderProductos(prods){
    const container = document.getElementById('tienda-productos');
    if(!container) return;

    if(!prods.length){
      container.innerHTML = `
        <div class="tienda-empty">
          <div class="tienda-empty-icon">🔍</div>
          <div class="tienda-empty-title">Sin resultados</div>
          <div class="tienda-empty-sub">No hay productos en esta categoría</div>
        </div>`;
      return;
    }

    const cards = prods.map(p => {
      const img = p.imagenes && p.imagenes.length
        ? `<img class="product-card-img" src="${p.imagenes[0]}" alt="${p.nombre}" loading="lazy" onerror="this.style.display='none'"/>`
        : `<div class="product-card-img" style="display:flex;align-items:center;justify-content:center;font-size:40px;background:var(--surface2)">📦</div>`;

      const badge = p.tipo === 'dropship'
        ? '<div class="product-card-badge badge-dropship">📦 Envío USA</div>'
        : (p.stock > 0 ? '<div class="product-card-badge badge-local">⚡ Envío local</div>' : '');

      return `
        <div class="product-card" onclick="GCityTienda.verProducto('${p.id}')">
          ${img}
          <div class="product-card-body">
            <div class="product-card-name">${p.nombre}</div>
            <div class="product-card-price">
              $${window.fmtCOP(p.precio_cop)}
              <span style="font-size:11px;opacity:0.6">COP</span>
            </div>
            ${badge}
            <button class="product-card-add"
                    onclick="event.stopPropagation(); GCityCarrito.agregar('${p.id}')">
              Agregar
            </button>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="product-grid">${cards}</div>`;
  },

  renderEmpty(msg){
    const container = document.getElementById('tienda-productos');
    if(!container) return;
    container.innerHTML = `
      <div class="tienda-empty">
        <div class="tienda-empty-icon">⚡</div>
        <div class="tienda-empty-title">${msg || 'Próximamente'}</div>
        <div class="tienda-empty-sub">
          ${msg ? '' : 'Estamos cargando el catálogo. Muy pronto verás los productos aquí.'}
        </div>
      </div>`;
  },

  verProducto(id){
    // TODO: Milestone 4 — vista detalle de producto
    const p = this.productos.find(x => x.id === id);
    if(p){
      window.showToast('Vista de producto — próximamente');
    }
  }
};

window.GCityTienda = GCityTienda;
