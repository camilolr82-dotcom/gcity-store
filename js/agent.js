// DEPRECATED 2026-04-20: reemplazado por Home unificado. Mantener archivo por si se requiere revivir.
let isLoading = false;

function useQuickPrompt(el){
  const input = document.getElementById('chat-input');
  input.value = el.textContent.trim().replace(/^[^\w]+/, '');
  input.dispatchEvent(new Event('input'));
  input.focus();
}

function addMessage(role, content, isHtml = false){
  const area = document.getElementById('messages-area');
  const now = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
  const msg = document.createElement('div');
  msg.className = `msg ${role}`;
  if(isHtml) msg.innerHTML = content;
  else msg.innerHTML = `<div class="msg-bubble">${content}</div><div class="msg-time">${now}</div>`;
  area.appendChild(msg);
  area.scrollTop = area.scrollHeight;
}

function showTyping(){
  const area = document.getElementById('messages-area');
  const t = document.createElement('div');
  t.className = 'msg agent';
  t.id = 'typing-indicator';
  t.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  area.appendChild(t);
  area.scrollTop = area.scrollHeight;
}

function hideTyping(){
  const t = document.getElementById('typing-indicator');
  if(t) t.remove();
}

function escapeHtml(s){
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
}

function precargarCalculadora(precioUsd){
  window.switchTab('calc');
  requestAnimationFrame(() => {
    const n = parseFloat(precioUsd);
    if(!Number.isFinite(n) || n <= 0) return;
    const input = document.getElementById('precio-usd');
    if(!input) return;
    input.value = n;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function renderEstrellas(rating, num){
  const r = Math.round(Number(rating) || 0);
  if(r <= 0) return '';
  const stars = '⭐'.repeat(Math.min(r, 5));
  const n = Number(num) || 0;
  return `${stars}${n > 0 ? ' · ' + n.toLocaleString('es-CO') + ' reviews' : ''}`;
}

function renderCards(productos, seleccionados){
  if(!productos || !productos.length) return '';

  let items;
  if(Array.isArray(seleccionados) && seleccionados.length){
    items = seleccionados
      .map(s => ({ rec: s, producto: productos[s.idx] }))
      .filter(x => x.producto);
  } else {
    items = productos.slice(0, 3).map((p, idx) => ({
      rec: { idx, vale_la_pena: true, razon: (p.rating >= 4 ? 'Buen rating en Amazon.' : 'Precio competitivo en Amazon.') },
      producto: p
    }));
  }

  return items.map(({ rec, producto }) => {
    const vale = !!rec.vale_la_pena;
    const col = producto.colombia || {};
    const estrellas = renderEstrellas(producto.rating, producto.reviews);
    const hrefSafe = escapeHtml(producto.url || '#');
    const imgSafe = escapeHtml(producto.imagen || '');
    const badgesExtra = [];
    if(producto.is_best_seller) badgesExtra.push('<span class="pr-verdict" style="background:var(--yellow-dim);color:var(--yellow)">🏆 Best Seller</span>');
    if(producto.is_amazon_choice) badgesExtra.push('<span class="pr-verdict" style="background:var(--green-dim);color:var(--green)">Amazon\'s Choice</span>');

    const imgHtml = imgSafe
      ? `<img src="${imgSafe}" loading="lazy" onerror="this.style.display='none'" style="width:100%;max-height:140px;object-fit:contain;border-radius:8px;background:var(--surface2);margin-bottom:10px"/>`
      : '';

    return `<div class="product-result ${vale ? 'vale' : 'no-vale'}">
      ${imgHtml}
      <div class="pr-header"><div class="pr-name">${escapeHtml(producto.nombre)}</div><div class="pr-verdict">${vale ? '✅ Conviene' : '❌ No conviene'}</div></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
        <span class="pr-verdict" style="background:var(--surface2);color:var(--text-muted);text-transform:capitalize">${escapeHtml(col.categoria || 'otros')}</span>
        ${badgesExtra.join('')}
      </div>
      ${estrellas ? `<div class="pr-reason" style="margin-bottom:8px">${estrellas}</div>` : ''}
      <div class="pr-prices">
        <div class="pr-price-item"><div class="pr-price-label">Precio USA</div><div class="pr-price-val accent">$${escapeHtml(producto.precio_usd)} USD</div></div>
        <div class="pr-price-item"><div class="pr-price-label">Puesto en CO</div><div class="pr-price-val">$${window.fmtCOP(col.total_cop || 0)}</div></div>
        <div class="pr-price-item"><div class="pr-price-label">Peso est.</div><div class="pr-price-val">${col.peso_lb || '?'} lb</div></div>
      </div>
      <div class="pr-reason">${escapeHtml(rec.razon || 'Sin análisis disponible.')}</div>
      <div class="pr-cta">
        <a class="pr-btn primary" href="${hrefSafe}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:flex;align-items:center;justify-content:center">Ver en Amazon</a>
        <button class="pr-btn secondary" onclick="precargarCalculadora(${Number(producto.precio_usd) || 0})">Calcular mi envío</button>
      </div>
    </div>`;
  }).join('');
}

async function sendMessage(){
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if(!text || isLoading) return;

  const apiKey = localStorage.getItem('gcity_api_key') || '';
  if(!apiKey){ window.showApiModal(); window.showToast('⚠️ Activa el agente primero'); return; }

  addMessage('user', text);
  input.value = '';
  input.style.height = 'auto';
  isLoading = true;
  document.getElementById('send-btn').disabled = true;
  showTyping();

  try {
    let amazonProds = [];
    let amazonErr = null;
    try {
      amazonProds = await window.Marketplace.buscarAmazon(text, 5);
    } catch (e) {
      amazonErr = e && e.message;
    }

    if(!amazonProds.length){
      hideTyping();
      const msg = amazonErr === 'sin_key'
        ? '🔑 Necesitas activar tu RapidAPI key en la pestaña "Yo" para buscar en Amazon.'
        : amazonErr === 'api_error'
          ? '⚠️ Amazon no responde ahora. Intenta de nuevo en un momento.'
          : '😕 No encontré productos para esa búsqueda. Prueba con otras palabras.';
      addMessage('agent', msg);
      return;
    }

    amazonProds.forEach(p => {
      p.colombia = window.Enrichment.calcularPrecioColombia(p);
    });

    const payload = {
      query: text,
      trm: window.GCityConfig.TRM,
      productos: amazonProds.map((p, idx) => ({
        idx,
        nombre: p.nombre,
        precio_usd: p.precio_usd,
        total_cop: p.colombia.total_cop,
        categoria: p.colombia.categoria,
        peso_lb: p.colombia.peso_lb,
        arancel_pct: p.colombia.arancel_pct,
        rating: p.rating,
        num_ratings: p.reviews || 0,
        is_best_seller: !!p.is_best_seller,
        is_amazon_choice: !!p.is_amazon_choice,
        url: p.url
      }))
    };

    const SYS = `Eres el Agente Cazador de G-CITY, experto en ayudar a colombianos a decidir si les conviene importar un producto desde USA. Recibes productos REALES de Amazon ya con precios calculados (puestos en Colombia, incluyendo flete, arancel y fee). No calculas nada. Solo analizas y recomiendas.

Tu trabajo:
1. Elige los 3 productos más interesantes del listado (mejor relación calidad-precio, rating, ahorro, popularidad).
2. Para cada uno explica en 1-2 frases por qué vale (o no vale) la pena.
3. Si todos los productos tienen precio_total_cop muy alto o son productos sospechosos (accesorios baratos, refurbished, bundles raros), dilo honestamente.

Reglas estrictas:
- NUNCA inventes precios, productos ni datos. Solo usa lo que te pasé en el user message.
- El idx del producto lo uso yo para mergear. Siempre devuelvelo.
- Responde SOLO JSON sin backticks ni texto adicional.

Formato exacto:
{"mensaje_intro":"string corta de 1 frase","seleccionados":[{"idx":0,"vale_la_pena":true,"razon":"1-2 frases"}],"mensaje_final":"string corta opcional"}

Máximo 3 items en seleccionados. Si ningún producto vale la pena, manda seleccionados:[] y explica en mensaje_final.`;

    let claudeJson = null;
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
          max_tokens: 1000,
          system: SYS,
          messages: [{ role: 'user', content: JSON.stringify(payload) }]
        })
      });
      if(r.ok){
        const data = await r.json();
        const textBlocks = (data.content || []).filter(b => b.type === 'text');
        const rawText = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';
        claudeJson = extraerJSON(rawText);
      } else {
        console.warn('agent sendMessage: Claude HTTP', r.status);
      }
    } catch (e) {
      console.warn('agent sendMessage: Claude fetch fail', e);
    }

    hideTyping();

    let intro, seleccionados, final;
    if(claudeJson && typeof claudeJson === 'object'){
      intro = claudeJson.mensaje_intro || 'Encontré estos resultados:';
      seleccionados = Array.isArray(claudeJson.seleccionados) ? claudeJson.seleccionados : [];
      final = claudeJson.mensaje_final || '';
    } else {
      intro = 'Encontré estos productos. El análisis detallado no está disponible ahora.';
      seleccionados = null;
      final = '';
    }

    const cardsHtml = renderCards(amazonProds, seleccionados);
    const now = new Date().toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' });
    const finalHtml = final ? `<div class="msg-bubble" style="margin-top:10px">${escapeHtml(final)}</div>` : '';

    addMessage(
      'agent',
      `<div class="msg agent"><div class="msg-bubble">${escapeHtml(intro)}</div>${cardsHtml}${finalHtml}<div class="msg-time">${now}</div></div>`,
      true
    );
  } catch (e) {
    console.warn('agent sendMessage: unexpected error', e);
    hideTyping();
    addMessage('agent', '😵 Algo salió mal procesando tu búsqueda. Intenta de nuevo.');
  } finally {
    isLoading = false;
    document.getElementById('send-btn').disabled = false;
  }
}

function initAgent(){
  const chatInput = document.getElementById('chat-input');
  if(!chatInput) return;
  chatInput.addEventListener('input', function(){
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });
  chatInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(); }
  });

  const search = document.getElementById('search-input');
  if(search){
    search.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && this.value.trim()){
        chatInput.value = this.value.trim();
        this.value = '';
        window.switchTab('home'); // DEPRECATED — tab removed
        sendMessage();
      }
    });
  }
}

window.useQuickPrompt = useQuickPrompt;
window.sendMessage = sendMessage;
window.initAgent = initAgent;
window.precargarCalculadora = precargarCalculadora;
