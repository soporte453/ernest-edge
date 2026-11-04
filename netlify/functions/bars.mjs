// Ernest Edge · GET /api/bars?symbol=EUR/USD&interval=5min&outputsize=3000
// Velas para el escáner en vivo y el backtesting, desde Twelve Data (plan gratuito: 8 consultas/min, 800/día).
// Solo usuarios con sesión de Supabase (para que nadie más gaste tu cuota).
// Variables: TWELVEDATA_API_KEY (obligatoria), SUPABASE_URL, SUPABASE_ANON_KEY.

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=120" } });
const cache = new Map(); // se reinicia cuando la función se apaga; suficiente para no repetir consultas seguidas
const INTERVALS = new Set(["1min", "5min", "15min", "30min", "1h", "4h"]);

export default async (req) => {
  const { TWELVEDATA_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!TWELVEDATA_API_KEY) return json(500, { error: "Los datos en vivo no están configurados: falta TWELVEDATA_API_KEY en el servidor." });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return json(401, { error: "Inicia sesión para usar los datos en vivo." });
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!u.ok) return json(401, { error: "Tu sesión expiró. Vuelve a iniciar sesión." });

  const q = new URL(req.url).searchParams;
  const symbol = (q.get("symbol") || "").toUpperCase(), interval = q.get("interval") || "5min";
  const size = Math.max(100, Math.min(5000, parseInt(q.get("outputsize") || "3000", 10) || 3000));
  if (!/^[A-Z0-9.\/:-]{1,20}$/.test(symbol)) return json(400, { error: "Símbolo inválido." });
  if (!INTERVALS.has(interval)) return json(400, { error: "Temporalidad inválida." });

  const key = `${symbol}|${interval}|${size}`, hit = cache.get(key);
  if (hit && Date.now() - hit.at < 4 * 60000) return json(200, hit.body);

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${size}&timezone=UTC&order=asc&apikey=${TWELVEDATA_API_KEY}`;
  let j;
  try { const r = await fetch(url); j = await r.json(); }
  catch (e) { return json(502, { error: "Twelve Data no respondió. Intenta en un momento." }); }
  if (!j || j.status === "error") {
    const code = j && j.code, msg = (j && j.message) || "";
    if (code === 429) return json(429, { error: "Se alcanzó el límite gratuito de Twelve Data (8 por minuto o 800 por día). Espera un minuto o intenta mañana." });
    if (code === 403 || /plan/i.test(msg)) return json(403, { error: `${symbol} no está incluido en el plan gratuito de Twelve Data.` });
    if (code === 400 || code === 404) return json(404, { error: `Twelve Data no reconoce el símbolo ${symbol}. Revísalo en Ajustes → Activos (ej.: EUR/USD, XAU/USD, BTC/USD, AAPL).` });
    return json(502, { error: "Twelve Data: " + (msg || "error desconocido") });
  }
  const bars = (j.values || []).map(v => ({ t: Math.round(Date.parse(String(v.datetime).replace(" ", "T") + "Z") / 1000), o: +v.open, h: +v.high, l: +v.low, c: +v.close }))
    .filter(b => [b.t, b.o, b.h, b.l, b.c].every(Number.isFinite)).sort((a, b) => a.t - b.t);
  const body = { source: "Twelve Data", symbol, interval, bars };
  cache.set(key, { at: Date.now(), body });
  return json(200, body);
};

export const config = { path: "/api/bars" };
