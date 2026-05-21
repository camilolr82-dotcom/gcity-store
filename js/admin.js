// G-CITY Admin Panel
const GCityAdmin = {
  productos: [],
  editingId: null,

  async init(){
    const user = await window.GCity.supabase.getUser();
    if(!user){
      document.getElementById('admin-content').innerHTML = `
        <div class="admin-auth-msg">
          <div style="font-size:48px;margin-bottom:16px">🔒</div>
          <div>Inicia sesión para acceder al admin</div>
        </div>`;
      return;
    }

    const profile = await window.GCity.supabase.getProfile(user.id);
    if(!profile || profile.rol !== 'admin'){
      document.getElementById('admin-content').innerHTML = `
        <div class="admin-auth-msg">
          <div style="font-size:48px;margin-bottom:16px">⛔</div>
          <div>No tienes permisos de administrador</div>
        </div>`;
      return;
    }

    this.renderAdmin();
    await this.loadProductos();
  },

  renderAdmin(){
    const container = document.getElementById('admin-content');
    container.innerHTML = `
      <div class="admin-tabs">
        <button class="admin-tab active" onclick="GCityAdmin.showSection('lista')">
          Productos
        </button>
        <button class="admin-tab" onclick="GCityAdmin.showSection('crear')">
          + Nuevo
        </button>
        <button class="admin-tab" onclick="GCityAdmin.showSection('pedidos')">
          Pedidos
        </button>
      </div>

      <div class="admin-section active" id="admin-lista">
        <div class="admin-stats" id="admin-stats"></div>
        <div class="admin-filtros">
          <select id="admin-filtro-cat" onchange="GCityAdmin.filtrar()">
            <option value="">Todas las categorías</option>
            <option value="audio">🎧 Audio</option>
            <option value="cargadores">⚡ Cargadores</option>
            <option value="cases">📱 Cases</option>
            <option value="gaming">🎮 Gaming</option>
            <option value="smart">💡 Smart Home</option>
            <option value="accesorios">🔌 Accesorios</option>
          </select>
          <select id="admin-filtro-tipo" onchange="GCityAdmin.filtrar()">
            <option value="">Todos los tipos</option>
            <option value="propio">Propios</option>
            <option value="dropship">Dropship</option>
          </select>
        </div>
        <div class="admin-product-list" id="admin-product-list">
          <div class="loading-msg">Cargando productos...</div>
        </div>
      </div>

      <div class="admin-section" id="admin-crear">
        <h3 class="admin-section-title" id="form-title">Nuevo Producto</h3>
        <form id="product-form" onsubmit="GCityAdmin.saveProduct(event)">

          <div class="form-group">
            <label>Nombre *</label>
            <input type="text" id="prod-nombre" required
                   placeholder="Ej: Audífonos Bluetooth ANC Pro"/>
          </div>

          <div class="form-group">
            <label>Descripción</label>
            <textarea id="prod-descripcion" rows="3"
                      placeholder="Descripción del producto..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Precio COP *</label>
              <input type="number" id="prod-precio" required min="0"
                     placeholder="85000"/>
            </div>
            <div class="form-group">
              <label>Stock</label>
              <input type="number" id="prod-stock" min="0" value="0"/>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Categoría *</label>
              <select id="prod-categoria" required>
                <option value="">Seleccionar...</option>
                <option value="audio">🎧 Audio</option>
                <option value="cargadores">⚡ Cargadores</option>
                <option value="cases">📱 Cases</option>
                <option value="gaming">🎮 Gaming</option>
                <option value="smart">💡 Smart Home</option>
                <option value="accesorios">🔌 Accesorios</option>
                <option value="otro">📦 Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tipo</label>
              <select id="prod-tipo" onchange="GCityAdmin.toggleDropship()">
                <option value="propio">Propio (en tienda)</option>
                <option value="dropship">Dropship</option>
              </select>
            </div>
          </div>

          <div id="dropship-fields" style="display:none">
            <div class="form-divider">📦 Datos de importación</div>
            <div class="form-row">
              <div class="form-group">
                <label>Fuente</label>
                <select id="prod-fuente">
                  <option value="amazon">Amazon</option>
                  <option value="aliexpress">AliExpress</option>
                </select>
              </div>
              <div class="form-group">
                <label>Precio USD</label>
                <input type="number" id="prod-precio-usd" step="0.01"
                       min="0" placeholder="29.99"
                       oninput="GCityAdmin.calcularPrecioCOP()"/>
              </div>
            </div>
            <div class="form-group">
              <label>URL del producto</label>
              <input type="url" id="prod-fuente-url"
                     placeholder="https://amazon.com/dp/..."/>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Peso (lb)</label>
                <input type="number" id="prod-peso" step="0.1" min="0"
                       placeholder="1.5"
                       oninput="GCityAdmin.calcularPrecioCOP()"/>
              </div>
              <div class="form-group">
                <label>Precio COP calculado</label>
                <div class="calc-preview" id="calc-preview">—</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Imágenes (máx 4)</label>
            <div class="img-upload-area" id="img-upload-area">
              <input type="file" id="prod-imagenes" multiple accept="image/*"
                     onchange="GCityAdmin.previewImages()"
                     style="display:none"/>
              <div class="img-upload-previews" id="img-previews"></div>
              <button type="button" class="img-upload-btn"
                      onclick="document.getElementById('prod-imagenes').click()">
                📷 Agregar fotos
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Tags (separados por coma)</label>
            <input type="text" id="prod-tags"
                   placeholder="bluetooth, inalámbrico, premium"/>
          </div>

          <div class="form-row">
            <label class="form-checkbox">
              <input type="checkbox" id="prod-destacado"/>
              <span>⭐ Destacado</span>
            </label>
            <label class="form-checkbox">
              <input type="checkbox" id="prod-activo" checked/>
              <span>✅ Activo</span>
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary"
                    onclick="GCityAdmin.cancelEdit()">Cancelar</button>
            <button type="submit" class="btn-primary" id="save-btn">
              Guardar producto
            </button>
          </div>
        </form>
      </div>

      <div class="admin-section" id="admin-pedidos">
        <div class="admin-auth-msg">
          <div style="font-size:48px;margin-bottom:16px">📦</div>
          <div>Gestión de pedidos — disponible en Milestone 4</div>
        </div>
      </div>
    `;
  },

  showSection(section){
    document.querySelectorAll('.admin-section').forEach(s =>
      s.classList.remove('active'));
    document.querySelectorAll('.admin-tab').forEach(t =>
      t.classList.remove('active'));

    const sectionEl = document.getElementById('admin-' + section);
    if(sectionEl) sectionEl.classList.add('active');

    const tabs = document.querySelectorAll('.admin-tab');
    const idx = section === 'lista' ? 0 : section === 'crear' ? 1 : 2;
    if(tabs[idx]) tabs[idx].classList.add('active');

    if(section === 'crear' && !this.editingId){
      this.resetForm();
    }
  },

  async loadProductos(){
    const sb = window.GCity.supabase.getClient();
    if(!sb) return;

    const { data, error } = await sb
      .from('productos')
      .select('*')
      .order('created_at', { ascending: false });

    if(error){
      console.error('Error loading productos:', error);
      window.showToast('❌ Error cargando productos');
      return;
    }

    this.productos = data || [];
    this.renderStats();
    this.renderProductList();
  },

  renderStats(){
    const stats = document.getElementById('admin-stats');
    if(!stats) return;

    const total = this.productos.length;
    const activos = this.productos.filter(p => p.activo).length;
    const propios = this.productos.filter(p => p.tipo === 'propio').length;
    const dropship = this.productos.filter(p => p.tipo === 'dropship').length;

    stats.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${activos}</div>
        <div class="stat-label">Activos</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${propios}</div>
        <div class="stat-label">Propios</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">${dropship}</div>
        <div class="stat-label">Dropship</div>
      </div>
    `;
  },

  renderProductList(filtered){
    const list = document.getElementById('admin-product-list');
    if(!list) return;

    const prods = filtered || this.productos;

    if(!prods.length){
      list.innerHTML = `
        <div class="admin-empty">
          <div style="font-size:40px;margin-bottom:12px">📦</div>
          <div>No hay productos todavía</div>
          <button class="btn-primary" style="margin-top:16px"
                  onclick="GCityAdmin.showSection('crear')">
            + Crear primer producto
          </button>
        </div>`;
      return;
    }

    list.innerHTML = prods.map(p => {
      const img = p.imagenes && p.imagenes.length
        ? `<img src="${p.imagenes[0]}" alt="" class="admin-prod-thumb"/>`
        : `<div class="admin-prod-thumb-empty">📷</div>`;
      const statusClass = p.activo ? 'status-active' : 'status-inactive';
      const statusText = p.activo ? 'Activo' : 'Inactivo';
      const tipoBadge = p.tipo === 'dropship'
        ? '<span class="tipo-badge dropship">Dropship</span>'
        : '<span class="tipo-badge propio">Propio</span>';

      return `
        <div class="admin-prod-row">
          ${img}
          <div class="admin-prod-info">
            <div class="admin-prod-name">${p.nombre}</div>
            <div class="admin-prod-meta">
              ${tipoBadge}
              <span class="admin-prod-cat">${p.categoria}</span>
              <span class="${statusClass}">${statusText}</span>
            </div>
            <div class="admin-prod-price">$${window.fmtCOP(p.precio_cop)} COP</div>
            <div class="admin-prod-stock">Stock: ${p.stock || 0}</div>
          </div>
          <div class="admin-prod-actions">
            <button class="action-btn" onclick="GCityAdmin.editProduct('${p.id}')"
                    title="Editar">
              <i data-lucide="edit-2" style="width:16px;height:16px"></i>
            </button>
            <button class="action-btn" onclick="GCityAdmin.toggleActive('${p.id}', ${!p.activo})"
                    title="${p.activo ? 'Desactivar' : 'Activar'}">
              <i data-lucide="${p.activo ? 'eye-off' : 'eye'}" style="width:16px;height:16px"></i>
            </button>
            <button class="action-btn danger" onclick="GCityAdmin.deleteProduct('${p.id}')"
                    title="Eliminar">
              <i data-lucide="trash-2" style="width:16px;height:16px"></i>
            </button>
          </div>
        </div>`;
    }).join('');

    if(window.lucide) window.lucide.createIcons();
  },

  filtrar(){
    const cat = document.getElementById('admin-filtro-cat').value;
    const tipo = document.getElementById('admin-filtro-tipo').value;

    let filtered = this.productos;
    if(cat) filtered = filtered.filter(p => p.categoria === cat);
    if(tipo) filtered = filtered.filter(p => p.tipo === tipo);

    this.renderProductList(filtered);
  },

  toggleDropship(){
    const tipo = document.getElementById('prod-tipo').value;
    const fields = document.getElementById('dropship-fields');
    if(fields) fields.style.display = tipo === 'dropship' ? 'block' : 'none';
  },

  calcularPrecioCOP(){
    const precioUsd = parseFloat(document.getElementById('prod-precio-usd').value) || 0;
    const pesoLb = parseFloat(document.getElementById('prod-peso').value) || 1.5;
    const preview = document.getElementById('calc-preview');

    if(!precioUsd || !preview) return;

    const resultado = window.Enrichment.calcularPrecioColombia({
      nombre: '',
      precio_usd: precioUsd,
      peso_lb: pesoLb
    });

    const conMargen = Math.round(resultado.total_cop * 1.15);
    preview.innerHTML = `$${window.fmtCOP(conMargen)} COP <span style="opacity:0.5">(+15% margen)</span>`;

    document.getElementById('prod-precio').value = conMargen;
  },

  previewImages(){
    const input = document.getElementById('prod-imagenes');
    const container = document.getElementById('img-previews');
    if(!input || !container) return;

    const files = Array.from(input.files).slice(0, 4);
    container.innerHTML = files.map(f => {
      const url = URL.createObjectURL(f);
      return `<div class="img-preview-item">
        <img src="${url}" alt=""/>
        <button type="button" class="img-preview-remove"
                onclick="this.parentElement.remove()">×</button>
      </div>`;
    }).join('');
  },

  async uploadImages(files){
    const sb = window.GCity.supabase.getClient();
    if(!sb || !files.length) return [];

    const urls = [];
    for(const file of Array.from(files).slice(0, 4)){
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

      const { error } = await sb.storage
        .from('productos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if(error){
        console.error('Upload error:', error);
        continue;
      }

      const { data: urlData } = sb.storage
        .from('productos')
        .getPublicUrl(fileName);

      if(urlData && urlData.publicUrl){
        urls.push(urlData.publicUrl);
      }
    }
    return urls;
  },

  async saveProduct(e){
    e.preventDefault();

    const btn = document.getElementById('save-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const sb = window.GCity.supabase.getClient();
      if(!sb) throw new Error('Supabase no conectado');

      const fileInput = document.getElementById('prod-imagenes');
      let imagenes = [];

      if(fileInput && fileInput.files.length){
        imagenes = await this.uploadImages(fileInput.files);
      }

      if(this.editingId && !imagenes.length){
        const existing = this.productos.find(p => p.id === this.editingId);
        if(existing) imagenes = existing.imagenes || [];
      }

      const tipo = document.getElementById('prod-tipo').value;
      const tagsRaw = document.getElementById('prod-tags').value;
      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

      const producto = {
        nombre: document.getElementById('prod-nombre').value.trim(),
        descripcion: document.getElementById('prod-descripcion').value.trim() || null,
        precio_cop: parseInt(document.getElementById('prod-precio').value),
        categoria: document.getElementById('prod-categoria').value,
        stock: parseInt(document.getElementById('prod-stock').value) || 0,
        tipo: tipo,
        imagenes: imagenes,
        tags: tags,
        destacado: document.getElementById('prod-destacado').checked,
        activo: document.getElementById('prod-activo').checked,
        fuente: tipo === 'dropship' ? document.getElementById('prod-fuente').value : null,
        fuente_url: tipo === 'dropship' ? document.getElementById('prod-fuente-url').value || null : null,
        fuente_precio_usd: tipo === 'dropship' ? parseFloat(document.getElementById('prod-precio-usd').value) || null : null,
        peso_lb: tipo === 'dropship' ? parseFloat(document.getElementById('prod-peso').value) || null : null,
        precio_usd: tipo === 'dropship' ? parseFloat(document.getElementById('prod-precio-usd').value) || null : null,
        updated_at: new Date().toISOString()
      };

      let result;
      if(this.editingId){
        result = await sb.from('productos').update(producto).eq('id', this.editingId);
      } else {
        result = await sb.from('productos').insert(producto);
      }

      if(result.error) throw result.error;

      window.showToast(this.editingId ? '✅ Producto actualizado' : '✅ Producto creado');
      this.editingId = null;
      this.resetForm();
      this.showSection('lista');
      await this.loadProductos();

    } catch(err){
      console.error('Save error:', err);
      window.showToast('❌ Error: ' + (err.message || 'No se pudo guardar'));
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar producto';
    }
  },

  editProduct(id){
    const p = this.productos.find(x => x.id === id);
    if(!p) return;

    this.editingId = id;
    this.showSection('crear');

    document.getElementById('form-title').textContent = 'Editar Producto';
    document.getElementById('prod-nombre').value = p.nombre || '';
    document.getElementById('prod-descripcion').value = p.descripcion || '';
    document.getElementById('prod-precio').value = p.precio_cop || '';
    document.getElementById('prod-stock').value = p.stock || 0;
    document.getElementById('prod-categoria').value = p.categoria || '';
    document.getElementById('prod-tipo').value = p.tipo || 'propio';
    document.getElementById('prod-tags').value = (p.tags || []).join(', ');
    document.getElementById('prod-destacado').checked = !!p.destacado;
    document.getElementById('prod-activo').checked = p.activo !== false;

    this.toggleDropship();

    if(p.tipo === 'dropship'){
      document.getElementById('prod-fuente').value = p.fuente || 'amazon';
      document.getElementById('prod-fuente-url').value = p.fuente_url || '';
      document.getElementById('prod-precio-usd').value = p.fuente_precio_usd || '';
      document.getElementById('prod-peso').value = p.peso_lb || '';
    }

    const previews = document.getElementById('img-previews');
    if(previews && p.imagenes && p.imagenes.length){
      previews.innerHTML = p.imagenes.map(url =>
        `<div class="img-preview-item">
          <img src="${url}" alt=""/>
        </div>`
      ).join('');
    }

    document.getElementById('save-btn').textContent = 'Actualizar producto';
  },

  async toggleActive(id, newState){
    const sb = window.GCity.supabase.getClient();
    if(!sb) return;

    const { error } = await sb.from('productos')
      .update({ activo: newState, updated_at: new Date().toISOString() })
      .eq('id', id);

    if(error){
      window.showToast('❌ Error actualizando');
      return;
    }

    window.showToast(newState ? '✅ Producto activado' : '🔴 Producto desactivado');
    await this.loadProductos();
  },

  async deleteProduct(id){
    if(!confirm('¿Eliminar este producto? Esta acción no se puede deshacer.')) return;

    const sb = window.GCity.supabase.getClient();
    if(!sb) return;

    const { error } = await sb.from('productos').delete().eq('id', id);

    if(error){
      window.showToast('❌ Error eliminando');
      return;
    }

    window.showToast('🗑️ Producto eliminado');
    await this.loadProductos();
  },

  resetForm(){
    const form = document.getElementById('product-form');
    if(form) form.reset();
    this.editingId = null;
    const formTitle = document.getElementById('form-title');
    if(formTitle) formTitle.textContent = 'Nuevo Producto';
    const saveBtn = document.getElementById('save-btn');
    if(saveBtn) saveBtn.textContent = 'Guardar producto';
    const dropFields = document.getElementById('dropship-fields');
    if(dropFields) dropFields.style.display = 'none';
    const activoCheck = document.getElementById('prod-activo');
    if(activoCheck) activoCheck.checked = true;
    const previews = document.getElementById('img-previews');
    if(previews) previews.innerHTML = '';
  },

  cancelEdit(){
    this.resetForm();
    this.showSection('lista');
  }
};

window.GCityAdmin = GCityAdmin;
