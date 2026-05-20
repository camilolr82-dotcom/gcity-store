let activeTab = 'home';

function switchTab(t){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const view = document.getElementById('view-' + t);
  const nav = document.getElementById('nav-' + t);
  if(view) view.classList.add('active');
  if(nav) nav.classList.add('active');
  activeTab = t;
  if(t === 'agent'){
    const d = document.querySelector('#nav-agent .nav-dot');
    if(d) d.style.display = 'none';
  }
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showApiModal(){
  document.getElementById('api-modal').classList.add('show');
  const saved = localStorage.getItem('gcity_api_key') || '';
  if(saved) document.getElementById('api-key-input').value = saved;
}

function saveApiKey(){
  const v = document.getElementById('api-key-input').value.trim();
  if(!v.startsWith('sk-ant')){ showToast('❌ Clave inválida'); return; }
  localStorage.setItem('gcity_api_key', v);
  document.getElementById('api-modal').classList.remove('show');
  showToast('✅ Agente activado');
}

function copyAddress(){
  navigator.clipboard.writeText(window.GCityConfig.DIRECCION_CASILLERO)
    .then(() => showToast('✅ Dirección copiada'))
    .catch(() => showToast('Copia manualmente'));
}

function showRapidApiModal(){
  document.getElementById('rapidapi-modal').classList.add('show');
  const saved = localStorage.getItem('gcity_rapidapi_key') || '';
  if(saved) document.getElementById('rapidapi-key-input').value = saved;
}

function saveRapidApiKey(){
  const v = document.getElementById('rapidapi-key-input').value.trim();
  if(!v){ showToast('❌ Clave vacía'); return; }
  localStorage.setItem('gcity_rapidapi_key', v);
  document.getElementById('rapidapi-modal').classList.remove('show');
  showToast('✅ APIs de marketplace activadas');
}

function initUI(){
  const modal = document.getElementById('api-modal');
  modal.addEventListener('click', function(e){ if(e.target === this) this.classList.remove('show'); });
  const rapidModal = document.getElementById('rapidapi-modal');
  rapidModal.addEventListener('click', function(e){ if(e.target === this) this.classList.remove('show'); });
}

window.switchTab = switchTab;
window.showToast = showToast;
window.showApiModal = showApiModal;
window.saveApiKey = saveApiKey;
window.copyAddress = copyAddress;
window.showRapidApiModal = showRapidApiModal;
window.saveRapidApiKey = saveRapidApiKey;
window.initUI = initUI;
