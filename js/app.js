const VIEWS = ['tienda', 'producto', 'carrito', 'cuenta', 'admin'];

async function loadViews(){
  const main = document.querySelector('.main');
  const htmls = await Promise.all(
    VIEWS.map(v => fetch(`views/${v}.html`).then(r => {
      if(!r.ok) throw new Error(`No se pudo cargar views/${v}.html`);
      return r.text();
    }))
  );
  main.innerHTML = htmls.join('\n');
}

async function fetchTRM(){
  try {
    const res = await fetch(window.GCityConfig.TRM_URL);
    if(!res.ok) return;
    const data = await res.json();
    const valor = parseFloat(data?.[0]?.valor);
    if(valor > 3000 && valor < 6000){
      window.GCityConfig.TRM = valor;
      console.log('TRM actualizada:', valor);
      const el = document.getElementById('trm-display');
      if(el) el.textContent = '$' + Math.round(valor).toLocaleString('es-CO') + ' COP / USD';
    }
  } catch (e) {
    console.warn('TRM fetch fallido, usando fallback:', window.GCityConfig.TRM);
  }
}

function refreshIcons(){
  if(window.lucide && typeof window.lucide.createIcons === 'function'){
    window.lucide.createIcons();
  }
}

function wireAuth(){
  const supa = window.GCity && window.GCity.supabase;
  if(!supa || typeof supa.onAuthChange !== 'function') return;
  supa.onAuthChange(async (event, session) => {
    const userId = session?.user?.id;
    const adminTab = document.getElementById('nav-admin');
    if(!adminTab) return;
    if(!userId){
      adminTab.style.display = 'none';
      return;
    }
    try {
      const profile = await supa.getProfile(userId);
      adminTab.style.display = (profile && profile.role === 'admin') ? 'flex' : 'none';
    } catch (_){
      adminTab.style.display = 'none';
    }
  });
}

async function init(){
  try {
    await loadViews();
  } catch (err) {
    document.querySelector('.main').innerHTML =
      `<div style="padding:40px 20px;text-align:center;color:var(--red)">
        ⚠️ Error cargando vistas.<br>
        <small style="color:var(--text-muted);display:block;margin-top:8px">
          Debes abrir la app con un servidor local (no con file://).<br>
          Ejemplo: <code>python3 -m http.server 8000</code>
        </small>
        <small style="color:var(--text-dim);display:block;margin-top:8px">${err.message}</small>
      </div>`;
    return;
  }

  await fetchTRM();

  if(typeof window.initUI === 'function') window.initUI();

  if(window.GCityTienda && typeof window.GCityTienda.init === 'function'){
    window.GCityTienda.init();
  }
  if(window.GCityCarrito && typeof window.GCityCarrito.init === 'function'){
    window.GCityCarrito.init();
  }

  wireAuth();
  refreshIcons();

  // Hook switchTab to refresh icons + lazy-init admin on demand
  const originalSwitchTab = window.switchTab;
  if(typeof originalSwitchTab === 'function'){
    window.switchTab = function(t){
      originalSwitchTab(t);
      refreshIcons();
      if(t === 'admin' && window.GCityAdmin && typeof window.GCityAdmin.init === 'function'){
        window.GCityAdmin.init();
      }
      if(t === 'carrito' && window.GCityCarrito && typeof window.GCityCarrito.render === 'function'){
        window.GCityCarrito.render();
      }
    };
  }

  const apiKey = localStorage.getItem('gcity_api_key') || '';
  if(apiKey) window.showToast('✅ Listo para buscar');
}

window.addEventListener('DOMContentLoaded', init);

// Registrar Service Worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registrado:', reg.scope))
    .catch(err => console.warn('SW error:', err));
}
