// Ernest Edge · configuración pública
// Copia aquí los datos de tu proyecto Supabase (Project Settings → API).
// La clave "anon" es pública por diseño: la seguridad la dan las reglas RLS de supabase/schema.sql.
window.EE_CONFIG = {
  supabaseUrl: "PEGA_AQUI_TU_SUPABASE_URL",        // ej.: https://abcdefghijk.supabase.co
  supabaseAnonKey: "PEGA_AQUI_TU_SUPABASE_ANON_KEY",
  aiEndpoint: "/api/coach",                          // déjalo así en Netlify; pon "" para desactivar la IA
  barsEndpoint: "/api/bars",                         // datos en vivo (Twelve Data); pon "" para desactivarlo
  google: false                                      // true solo si activas el inicio con Google en Supabase
};
