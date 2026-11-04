// Ernest Edge · Coach con IA (Netlify Function)
// Recibe estadísticas agregadas del usuario, verifica su sesión de Supabase,
// aplica un límite diario por usuario y pide la revisión a Google Gemini (plan gratuito).
// Variables de entorno (Netlify → Site configuration → Environment variables):
//   GEMINI_API_KEY      clave de Google AI Studio (obligatoria)
//   SUPABASE_URL        URL de tu proyecto Supabase (obligatoria)
//   SUPABASE_ANON_KEY   clave pública "anon" de Supabase (obligatoria)
//   GEMINI_MODEL        opcional, por defecto "gemini-flash-latest"
//   AI_DAILY_LIMIT      opcional, revisiones por usuario y día (por defecto 5)

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Método no permitido" });
  const { GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const LIMIT = parseInt(process.env.AI_DAILY_LIMIT || "5", 10);
  if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) return json(500, { error: "La IA no está configurada en el servidor (faltan variables de entorno)." });

  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "Inicia sesión para usar la IA." });
  const sbHeaders = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };

  // 1) ¿Quién es? (verifica el token con Supabase)
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: sbHeaders });
  if (!u.ok) return json(401, { error: "Tu sesión expiró. Vuelve a iniciar sesión." });
  const user = await u.json();

  // 2) Límite diario (la tabla ai_usage tiene RLS: cada usuario solo ve y crea sus filas)
  const since = new Date(); since.setUTCHours(0, 0, 0, 0);
  const c = await fetch(`${SUPABASE_URL}/rest/v1/ai_usage?select=id&created_at=gte.${since.toISOString()}`, { headers: { ...sbHeaders, Prefer: "count=exact", Range: "0-0" } });
  const used = parseInt(((c.headers.get("content-range") || "*/0").split("/")[1]) || "0", 10) || 0;
  if (used >= LIMIT) return json(429, { error: `Llegaste al límite de ${LIMIT} revisiones con IA por hoy. Vuelve mañana.` });

  // 3) Datos del usuario (solo estadísticas agregadas)
  let body; try { body = await req.json(); } catch { return json(400, { error: "Datos inválidos." }); }
  const payload = JSON.stringify((body && body.payload) || {});
  if (payload.length > 30000) return json(413, { error: "Demasiados datos." });

  const briefing = body && body.type === "briefing";
  const prompt = briefing ? `Eres un analista de mercados que prepara el briefing diario de un trader intradía de liquidez (Smart Money). Usa EXCLUSIVAMENTE los eventos del JSON: no inventes eventos, cifras ni horarios. Responde en español, texto plano sin markdown, máximo 170 palabras, con tres bloques: "Lo importante hoy" (eventos de alto impacto con su hora local y qué activos del trader afectan), "Ventanas para no operar" (hora inicio–fin según los minutos indicados) y "Cómo encararlo" (2–3 pautas de gestión de riesgo, sin señales de compra o venta ni predicciones de dirección).
DATOS: ${payload}` : `Eres un coach de trading profesional y mentor de traders de prop firms. El trader opera conceptos de liquidez (Smart Money) con un sistema de 4 pasos: (1) contexto D1 y tendencia H4, (2) sweep de liquidez válido en H1 a favor del contexto o en extremos de rango, (3) entrada con FVG o cambio de estructura (CHoCH) en M5/M3/M1, (4) tiempo: solo en sus sesiones de plan. Objetivo: pasar una prueba de fondeo y volverse profesional.
Analiza estas estadísticas (JSON) y responde en español, en texto plano sin markdown ni asteriscos, con tres bloques titulados exactamente "Fortalezas", "Fugas de dinero" y "Plan para la próxima semana" (3 acciones concretas y medibles). Cita números concretos. Si la muestra es menor de 30 trades, dilo al inicio en una frase. No des recomendaciones de inversión ni señales de compra o venta. Máximo 220 palabras.
DATOS: ${payload}`;

  const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 900 } })
  });
  const gj = await g.json().catch(() => ({}));
  if (!g.ok) {
    if (g.status === 429) return json(429, { error: "La IA gratuita está saturada en este momento. Intenta en unos minutos." });
    return json(502, { error: "La IA no respondió: " + ((gj.error && gj.error.message) || g.status) });
  }
  const text = ((gj.candidates && gj.candidates[0] && gj.candidates[0].content && gj.candidates[0].content.parts) || []).map(p => p.text || "").join("").trim();
  if (!text) return json(502, { error: "La IA devolvió una respuesta vacía." });

  // 4) Registra el uso solo si hubo respuesta
  await fetch(`${SUPABASE_URL}/rest/v1/ai_usage`, { method: "POST", headers: { ...sbHeaders, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ user_id: user.id }) });
  return json(200, { text, remaining: Math.max(0, LIMIT - used - 1) });
};

export const config = { path: "/api/coach" };
