// G-CITY Tienda
const GCityTienda = {

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

  filtrar(cat, el){
    // Actualizar chip activo
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    if(el) el.classList.add('active');

    // TODO: filtrar productos desde Supabase (Milestone 3)
    console.log('Filtrar por:', cat);
  },

  buscar(){
    const input = document.getElementById('tienda-search-input');
    if(input && input.value.trim()){
      // TODO: buscar en Supabase (Milestone 3)
      window.showToast('🔍 Búsqueda disponible cuando conectemos productos');
    }
  },

  init(){
    const input = document.getElementById('tienda-search-input');
    if(input){
      input.addEventListener('keydown', function(e){
        if(e.key === 'Enter'){
          e.preventDefault();
          GCityTienda.buscar();
        }
      });
    }
  }
};

window.GCityTienda = GCityTienda;
