const CATEGORIAS = {
  electronica: { arancel: 0.15, pesoDefault: 1.5, keywords: ['phone','iphone','samsung','tablet','ipad','tv ','monitor','camera','drone','speaker','charger','cable','adapter','laptop','macbook','computer','pc ','headphone','earbud','airpod','watch','router','keyboard','mouse'] },
  gaming:      { arancel: 0.15, pesoDefault: 3.0, keywords: ['playstation','xbox','nintendo','gaming','controller','console','ps5','ps4','switch','dualsense','joycon'] },
  belleza:     { arancel: 0.15, pesoDefault: 0.8, keywords: ['makeup','perfume','cosmetic','skincare','shampoo','beauty','lipstick','mascara','cologne','lotion'] },
  ropa:        { arancel: 0.40, pesoDefault: 1.5, keywords: ['shoe','sneaker','jacket','shirt','dress','pant','jean','hoodie','boot','sandal','cap','hat','nike','adidas','jordan','puma','vans','converse','new balance','under armour','reebok'] },
  suplementos: { arancel: 0.10, pesoDefault: 3.0, keywords: ['protein','whey','vitamin','supplement','creatine','omega','pre-workout','bcaa','multivitamin'] },
  hogar:       { arancel: 0.10, pesoDefault: 5.0, keywords: ['furniture','kitchen','appliance','vacuum','mattress','blender','coffee maker','air fryer','toaster','microwave'] },
  libros:      { arancel: 0.00, pesoDefault: 1.0, keywords: ['book','novel','paperback','hardcover'] },
  otros:       { arancel: 0.15, pesoDefault: 2.0, keywords: [] }
};

const PESO_OVERRIDES = [
  { match: /headphone|earbud|airpod/i, peso: 1.0 },
  { match: /laptop|macbook|notebook/i, peso: 5.0 },
  { match: /\b(iphone|smartphone|cellphone)\b/i, peso: 0.8 },
  { match: /\bwatch\b/i, peso: 0.5 },
  { match: /\btv\b|television/i, peso: 25.0 },
  { match: /\bps5|xbox series/i, peso: 10.0 }
];

const ORDEN_CATEGORIAS = ['electronica', 'gaming', 'belleza', 'ropa', 'suplementos', 'hogar', 'libros'];

function estimarCategoria(nombre){
  const lower = String(nombre || '').toLowerCase();
  for(const cat of ORDEN_CATEGORIAS){
    if(CATEGORIAS[cat].keywords.some(k => lower.includes(k))) return cat;
  }
  return 'otros';
}

function estimarPeso(nombre, categoria){
  for(const ov of PESO_OVERRIDES){
    if(ov.match.test(nombre)) return ov.peso;
  }
  const cat = CATEGORIAS[categoria];
  return cat ? cat.pesoDefault : 2.0;
}

function getArancel(categoria){
  return (CATEGORIAS[categoria] || CATEGORIAS.otros).arancel;
}

function parseUsd(precioStr){
  if(typeof precioStr === 'number') return precioStr;
  if(typeof precioStr !== 'string') return 0;
  const match = precioStr.match(/[\d,.]+/);
  if(!match) return 0;
  const n = parseFloat(match[0].replace(/,/g, ''));
  return isFinite(n) ? n : 0;
}

function calcularPrecioColombia(producto){
  const categoria = estimarCategoria(producto.nombre);
  const peso_lb = estimarPeso(producto.nombre, categoria);
  const precio_usd = typeof producto.precio_usd === 'number'
    ? producto.precio_usd
    : parseUsd(producto.precio_usd);
  const flete_usd = peso_lb * 11;
  const arancel_pct = getArancel(categoria);
  const arancel_usd = precio_usd * arancel_pct;
  const total_usd = precio_usd + flete_usd + arancel_usd;
  const trm = (window.GCityConfig && window.GCityConfig.TRM) || 4100;
  const fee_cop = (window.GCityConfig && window.GCityConfig.FEE) || 35000;
  const total_cop = Math.round(total_usd * trm) + fee_cop;

  return {
    categoria,
    peso_lb,
    precio_usd,
    flete_usd,
    arancel_pct,
    arancel_usd,
    fee_cop,
    total_usd,
    total_cop,
    trm_usada: trm
  };
}

window.Enrichment = { estimarCategoria, estimarPeso, getArancel, calcularPrecioColombia };
