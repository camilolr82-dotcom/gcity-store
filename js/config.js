window.GCityConfig = {
  TRM: 4100,
  TRM_FALLBACK: 4100,
  TRM_URL: 'https://www.datos.gov.co/resource/mcec-87by.json?$order=vigenciadesde%20DESC&$limit=1',
  FEE: 35000,
  API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-haiku-4-5',
  DIRECCION_CASILLERO: 'Juan Colombiano — COL-2847\n8001 NW 79th Ave, Suite 2847\nMiami, FL 33166\nUnited States',
  RAPIDAPI_AMAZON_HOST: 'real-time-amazon-data.p.rapidapi.com',
  SUPABASE_URL: 'TU_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'TU_SUPABASE_ANON_KEY'
};

window.fmtCOP = function(n){ return Math.round(n).toLocaleString('es-CO'); };
