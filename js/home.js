const Home = {
  _lastResults: [],
  _heroOriginalHtml: null,

  async buscar(query){
    if(!query || !query.trim()) return;
    const q = query.trim();
    const resultsDiv = document.getElementById('home-results');
    if(!resultsDiv) return;

    resultsDiv.innerHTML = `
      <div class="home-loading">
        <div class="home-loading-spinner"></div>
        <div class="home-loading-text">Buscando "${Home._escape(q)}"...</div>
      </div>`;

    try {
      const productos = await window.Marketplace.buscarAmazon(q, 10);
      if(!productos || !productos.length){
        resultsDiv.innerHTML = `
          <div class="home-empty">
            <div class="home-empty-icon">😕</div>
            <div class="home-empty-text">No encontramos resultados para "${Home._escape(q)}".<br>Intenta con otras palabras.</div>
          </div>`;
        return;
      }

      const enriquecidos = productos
        .map(p => {
          const colombia = window.Enrichment.calcularPrecioColombia(p);
          const rating = parseFloat(p.rating) || 0;
          const numRatings = Number(p.reviews ?? p.num_ratings) || 0;
          const precioUsd = colombia.precio_usd || 0.01;
          const score = rating * Math.log10(numRatings + 1) / Math.sqrt(precioUsd);
          return { ...p, colombia, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      const conRazon = await Home._razonarConClaude(q, enriquecidos);
      Home._render(resultsDiv, q, conRazon);
    } catch (err) {
      console.warn('Home.buscar error:', err);
      const msg = err && err.message === 'sin_key'
        ? '🔑 Activa tu RapidAPI key en "Yo" para buscar productos de Amazon.'
        : '⚠️ No pudimos buscar en este momento. Revisa tu conexión o intenta de nuevo.';
      resultsDiv.innerHTML = `
        <div class="home-error">
          <div class="home-error-text">${msg}</div>
        </div>`;
    }
  },

  buscarDesdeInput(){
    const input = document.getElementById('home-search-input');
    if(input) Home.buscar(input.value);
  },

  async buscarCategoria(catKey, el){
    const queries = {
      electronica: 'wireless earbuds',
      ropa: 'nike sneakers men',
      suplementos: 'optimum whey protein',
      gaming: 'ps5 controller',
      belleza: 'cerave moisturizer',
      hogar: 'ninja air fryer',
      libros: 'bestseller books 2025'
    };
    const q = queries[catKey];
    if(!q) return;
    const input = document.getElementById('home-search-input');
    if(input) input.value = q;
    document.querySelectorAll('.home-chip').forEach(c => c.classList.remove('active'));
    if(el) el.classList.add('active');
    try {
      if(el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } catch (_) {}
    await Home.buscar(q);
  },

  abrirCamara(){
    window.showToast('📸 Búsqueda por foto — próximamente');
  },

  async _razonarConClaude(query, productos){
    const apiKey = localStorage.getItem('gcity_api_key') || '';
    if(!apiKey) return productos;

    const payload = {
      query,
      productos: productos.map((p, i) => ({
        idx: i,
        nombre: p.nombre,
        precio_usd: p.colombia.precio_usd,
        total_cop: p.colombia.total_cop,
        rating: p.rating,
        reviews: p.reviews || 0
      }))
    };

    const SYS = `Eres el curador de G-CITY. Recibes 4 productos ya filtrados de Amazon. Para cada uno, escribe UNA frase (max 70 caracteres) explicando por qué está bien o mal. Devuelve JSON array: [{"idx":0,"razon":"..."},...]. No agregues backticks ni texto adicional.`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const r = await fetch(window.GCityConfig.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: window.GCityConfig.MODEL,
          max_tokens: 400,
          system: SYS,
          messages: [{ role: 'user', content: JSON.stringify(payload) }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if(!r.ok) return productos;
      const data = await r.json();
      const textBlocks = (data.content || []).filter(b => b.type === 'text');
      const rawText = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
      const parsed = (typeof extraerJSON === 'function') ? extraerJSON(rawText) : JSON.parse(rawText);
      if(!Array.isArray(parsed)) return productos;
      parsed.forEach(r => {
        if(typeof r.idx === 'number' && productos[r.idx]){
          productos[r.idx].razon = String(r.razon || '').slice(0, 140);
        }
      });
      return productos;
    } catch (e) {
      clearTimeout(timeoutId);
      console.warn('Home._razonarConClaude failed:', e && e.message);
      return productos;
    }
  },

  _render(container, query, productos){
    Home._lastResults = productos;
    const cards = productos.map((p, i) => {
      const pos = i + 1;
      const rating = parseFloat(p.rating) || 0;
      const numRatings = Number(p.reviews ?? p.num_ratings) || 0;
      const starsFull = Math.round(rating);
      const stars = '★'.repeat(Math.max(0, Math.min(5, starsFull))) + '☆'.repeat(Math.max(0, 5 - starsFull));
      const precioUsd = (p.colombia.precio_usd || 0).toFixed(2);
      const totalCop = window.fmtCOP(p.colombia.total_cop || 0);
      const imgSrc = p.imagen || '';
      const imgTag = imgSrc
        ? `<img class="home-product-img" src="${Home._escape(imgSrc)}" alt="" loading="lazy" onerror="this.style.display='none'"/>`
        : `<div class="home-product-img" style="display:flex;align-items:center;justify-content:center;font-size:32px">📦</div>`;
      const reasonHtml = p.razon
        ? `<div class="home-product-reason">${Home._escape(p.razon)}</div>`
        : '';
      return `
        <div class="home-product-card" onclick="Home._openAmazon(${i})">
          ${imgTag}
          <div class="home-product-body">
            <div class="home-product-rank">${pos}</div>
            <div class="home-product-title">${Home._escape(p.nombre)}</div>
            <div class="home-product-rating"><span class="stars">${stars}</span> ${rating.toFixed(1)} · ${numRatings.toLocaleString('es-CO')} reseñas</div>
            ${reasonHtml}
            <div class="home-product-pricing">
              <div class="home-product-usd">$${precioUsd} USD</div>
              <div class="home-product-cop">Puesto en Colombia: $${totalCop} COP</div>
            </div>
            <button class="home-product-calc-btn" onclick="event.stopPropagation();Home._calcDesde(${i})">Calcular mi envío</button>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="home-results-header">
        <div class="home-results-query">Top ${productos.length} para "${Home._escape(query)}"</div>
        <div class="home-results-count">Ordenados por mejor match</div>
      </div>
      <div class="home-product-list">${cards}</div>`;
  },

  _openAmazon(idx){
    const p = Home._lastResults[idx];
    if(p && p.url) window.open(p.url, '_blank', 'noopener,noreferrer');
  },

  _calcDesde(idx){
    const p = Home._lastResults[idx];
    if(!p) return;
    Home.precargarCalculadora({
      precio_usd: p.colombia.precio_usd,
      peso_lb: p.colombia.peso_lb,
      categoria: p.colombia.categoria,
      nombre: p.nombre,
      imagen: p.imagen
    });
  },

  precargarCalculadora(producto){
    window.switchTab('calc');
    requestAnimationFrame(() => {
      const precio = parseFloat(producto.precio_usd);
      if(Number.isFinite(precio) && precio > 0){
        const input = document.getElementById('precio-usd');
        if(input){
          input.value = precio;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      const peso = parseFloat(producto.peso_lb);
      if(Number.isFinite(peso) && peso > 0){
        const pInput = document.getElementById('peso-lb');
        if(pInput){
          pInput.value = peso;
          pInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if(producto.categoria) Home._activarCategoriaEnCalc(producto.categoria, producto);
    });
  },

  _activarCategoriaEnCalc(catKey, producto){
    const catEl = document.querySelector(`.cat-option[data-cat="${catKey}"]`);
    if(catEl && typeof window.selectCat === 'function') window.selectCat(catEl);

    const catGrid = document.querySelector('.cat-grid');
    if(catGrid) catGrid.classList.add('calc-cat-focused');

    document.querySelectorAll('.cat-option').forEach(el => el.classList.remove('active-only'));
    if(catEl) catEl.classList.add('active-only');

    const hero = document.querySelector('.calc-hero');
    if(hero && producto.nombre){
      if(!Home._heroOriginalHtml) Home._heroOriginalHtml = hero.innerHTML;
      const safeName = Home._escape(producto.nombre).slice(0, 140);
      const imgHtml = producto.imagen
        ? `<img class="calc-product-thumb" src="${Home._escape(producto.imagen)}" alt="" onerror="this.style.display='none'"/>`
        : '';
      hero.innerHTML = `
        <div class="calc-product-header">
          ${imgHtml}
          <div class="calc-product-info">
            <div class="calc-product-name">${safeName}</div>
            <div class="calc-product-sub">Calculando costo puesto en Colombia</div>
          </div>
        </div>
        <button class="calc-change-cat" onclick="Home._resetCalcCategorias()">Cambiar categoría</button>
      `;
      if(window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    }
  },

  _resetCalcCategorias(){
    const catGrid = document.querySelector('.cat-grid');
    if(catGrid) catGrid.classList.remove('calc-cat-focused');
    document.querySelectorAll('.cat-option').forEach(el => el.classList.remove('active-only'));
    const hero = document.querySelector('.calc-hero');
    if(hero && Home._heroOriginalHtml){
      hero.innerHTML = Home._heroOriginalHtml;
      if(window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    }
  },

  _escape(s){
    if(s == null) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = String(s);
    const decoded = txt.value;
    return decoded
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  init(){
    const input = document.getElementById('home-search-input');
    if(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          Home.buscarDesdeInput();
        }
      });
    }
  }
};

window.Home = Home;
