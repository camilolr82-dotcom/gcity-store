// G-CITY Tienda — se completa en Milestone 3
const GCityTienda = {
  buscar(){
    const input = document.getElementById('tienda-search-input');
    if(input && input.value.trim()){
      window.showToast('🔍 Búsqueda disponible próximamente');
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

    // Placeholder: mostrar mensaje de bienvenida
    const container = document.getElementById('tienda-productos');
    if(container){
      container.innerHTML = `
        <div class="tienda-empty">
          <div style="font-size:48px;margin-bottom:12px">🏪</div>
          <div style="font-size:18px;font-weight:600;margin-bottom:8px">
            Bienvenido a G-CITY
          </div>
          <div style="opacity:0.6">
            Gadgets y accesorios tecnológicos — próximamente
          </div>
        </div>`;
    }
  }
};

window.GCityTienda = GCityTienda;
