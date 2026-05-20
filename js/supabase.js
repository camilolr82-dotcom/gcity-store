// G-CITY Supabase Client
(function(){
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.GCityConfig;

  let client = null;

  function getClient(){
    if(!client && window.supabase && SUPABASE_URL !== 'TU_SUPABASE_URL'){
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  async function signInWithMagicLink(email){
    const sb = getClient();
    if(!sb) return { error: { message: 'Supabase no configurado' } };
    return sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
  }

  async function getUser(){
    const sb = getClient();
    if(!sb) return null;
    const { data } = await sb.auth.getUser();
    return data?.user || null;
  }

  async function getSession(){
    const sb = getClient();
    if(!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session || null;
  }

  async function signOut(){
    const sb = getClient();
    if(!sb) return;
    await sb.auth.signOut();
  }

  async function getProfile(userId){
    const sb = getClient();
    if(!sb) return null;
    const { data } = await sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return data;
  }

  function onAuthChange(callback){
    const sb = getClient();
    if(!sb) return;
    sb.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  window.GCity = window.GCity || {};
  window.GCity.supabase = {
    getClient,
    signInWithMagicLink,
    getUser,
    getSession,
    signOut,
    getProfile,
    onAuthChange
  };
})();
