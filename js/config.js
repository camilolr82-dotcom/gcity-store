window.GCityConfig = {
  TRM: 4100,
  TRM_FALLBACK: 4100,
  TRM_URL: 'https://www.datos.gov.co/resource/mcec-87by.json?$order=vigenciadesde%20DESC&$limit=1',
  FEE: 35000,
  API_URL: 'https://api.anthropic.com/v1/messages',
  MODEL: 'claude-haiku-4-5',
  DIRECCION_CASILLERO: 'Juan Colombiano — COL-2847\n8001 NW 79th Ave, Suite 2847\nMiami, FL 33166\nUnited States',
  RAPIDAPI_AMAZON_HOST: 'real-time-amazon-data.p.rapidapi.com',
  SUPABASE_URL: 'https://iolwbzsynktprgyfkace.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvbHdienN5bmt0cHJneWZrYWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMjE3ODYsImV4cCI6MjA5NDg5Nzc4Nn0.05JaoZk2kmYSCjOK23Q_vSqpIIAaOzGZtSnHA3q42zA'
};

window.fmtCOP = function(n){ return Math.round(n).toLocaleString('es-CO'); };
