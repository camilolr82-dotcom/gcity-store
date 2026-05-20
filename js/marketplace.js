const _mlCache = new Map();
const _CACHE_TTL_MS = 10 * 60 * 1000;

function extraerJSON(texto){
  if(!texto) return null;
  try{ return JSON.parse(texto.trim()); }catch(_){}
  const sinBackticks = texto.replace(/```json|```/g, '').trim();
  try{ return JSON.parse(sinBackticks); }catch(_){}
  const match = texto.match(/\{[\s\S]*\}/);
  if(match){
    try{ return JSON.parse(match[0]); }catch(_){}
  }
  return null;
}

async function buscarAmazon(query, limit = 5){
  const key = localStorage.getItem('gcity_rapidapi_key');
  if(!key) throw new Error('sin_key');

  const host = window.GCityConfig.RAPIDAPI_AMAZON_HOST;
  const url = `https://${host}/search?query=${encodeURIComponent(query)}&country=US&page=1`;

  let res;
  try{
    res = await fetch(url, {
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': host
      }
    });
  }catch(e){
    throw new Error('api_error');
  }
  if(!res.ok) throw new Error('api_error');

  const data = await res.json();
  const products = (data && data.data && data.data.products) || [];
  if(!products.length) throw new Error('no_results');

  const normalizados = products.map(p => {
    const priceStr = p.product_price || p.product_original_price || '';
    const match = priceStr.match(/[\d,.]+/);
    const precio_usd = match ? parseFloat(match[0].replace(/,/g, '')) : 0;
    return {
      fuente: 'amazon',
      nombre: p.product_title,
      precio_usd,
      imagen: p.product_photo,
      url: p.product_url,
      asin: p.asin,
      rating: parseFloat(p.product_star_rating) || 0,
      reviews: parseInt(p.product_num_ratings, 10) || 0,
      is_best_seller: !!p.is_best_seller,
      is_amazon_choice: !!p.is_amazon_choice
    };
  }).filter(p => p.precio_usd > 0);

  if(!normalizados.length) throw new Error('no_results');
  return normalizados.slice(0, limit);
}

async function buscarML(query, limit = 5){
  const cacheKey = query.trim().toLowerCase();
  const cached = _mlCache.get(cacheKey);
  if(cached && (Date.now() - cached.timestamp < _CACHE_TTL_MS)){
    return cached.result;
  }
  if(cached){
    _mlCache.delete(cacheKey);
  }

  const cacheEmpty = () => {
    _mlCache.set(cacheKey, { result: [], timestamp: Date.now() });
    return [];
  };

  const apiKey = localStorage.getItem('gcity_api_key');
  if(!apiKey){
    console.warn('buscarML best-effort fallback:', 'sin_key');
    return cacheEmpty();
  }

  const { API_URL, MODEL } = window.GCityConfig;

  const SYS = `Busca productos en mercadolibre.com.co usando web_search. Haz UNA sola búsqueda. No hagas múltiples queries. Usa solo los snippets de resultados, no navegues páginas completas.

Devuelve SOLO JSON sin backticks ni texto adicional:
{"productos":[{"nombre":"string","precio_cop":number,"url":"string","imagen":null,"condition":"new","envio_gratis":false}]}

Reglas:
- Máximo 5 productos
- precio_cop: número entero en pesos (ej: 4500000)
- url: link directo a mercadolibre.com.co
- Si el precio no es claro en el snippet, omite el producto
- Si no encuentras nada en la primera búsqueda, devuelve {"productos":[]} y termina
- Nunca inventes datos
- imagen siempre null (ahorra tokens)
- condition default 'new', envio_gratis default false (ahorra tokens)`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let res;
  try{
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: SYS,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: query }]
      }),
      signal: controller.signal
    });
  }catch(e){
    clearTimeout(timeoutId);
    const razon = e.name === 'AbortError' ? 'timeout' : 'api_error';
    console.warn('buscarML best-effort fallback:', razon);
    return cacheEmpty();
  }
  clearTimeout(timeoutId);

  if(!res.ok){
    console.warn('buscarML best-effort fallback:', 'api_error');
    return cacheEmpty();
  }

  const data = await res.json();
  const textBlocks = (data.content || []).filter(b => b.type === 'text');
  const rawText = textBlocks.length ? textBlocks[textBlocks.length - 1].text : '';

  const parsed = extraerJSON(rawText);
  if(!parsed){
    console.warn('buscarML best-effort fallback:', 'parse_error');
    return cacheEmpty();
  }

  if(!Array.isArray(parsed.productos)){
    console.warn('buscarML best-effort fallback:', 'api_error');
    return cacheEmpty();
  }
  if(parsed.productos.length === 0){
    console.warn('buscarML best-effort fallback:', 'no_results');
    return cacheEmpty();
  }

  const normalizados = parsed.productos
    .map(p => ({
      fuente: 'mercadolibre',
      nombre: p.nombre || '',
      precio_cop: typeof p.precio_cop === 'number' ? p.precio_cop : 0,
      imagen: p.imagen == null ? null : p.imagen,
      url: p.url == null ? null : p.url,
      condition: p.condition == null ? null : p.condition,
      envio_gratis: !!p.envio_gratis
    }))
    .filter(p => p.nombre && p.precio_cop > 0);

  if(!normalizados.length){
    console.warn('buscarML best-effort fallback:', 'no_results');
    return cacheEmpty();
  }
  const result = normalizados.slice(0, limit);
  _mlCache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

async function compararPrecios(query){
  const [amzRes, mlRes] = await Promise.allSettled([
    buscarAmazon(query),
    buscarML(query)
  ]);

  const out = { amazon: [], mercadolibre: [], errores: {} };

  if(amzRes.status === 'fulfilled') out.amazon = amzRes.value;
  else out.errores.amazon = (amzRes.reason && amzRes.reason.message) || 'error';

  if(mlRes.status === 'fulfilled') out.mercadolibre = mlRes.value;
  else out.errores.ml = (mlRes.reason && mlRes.reason.message) || 'error';

  return out;
}

window.Marketplace = { buscarAmazon, buscarML, compararPrecios };
