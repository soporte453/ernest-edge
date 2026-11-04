// Ernest Edge · GET /api/econ?from=YYYY-MM-DD&to=YYYY-MM-DD
// Devuelve el calendario económico del rango. Con Supabase guarda el historial (cada semana queda registrada).
import { fetchWeek, readFromSupabase, lastSync, sync } from "../lib/econ.mjs";

const json = (status, body, cache) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...(cache ? { "Cache-Control": "public, max-age=300", "Netlify-CDN-Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600", "Netlify-Vary": "query" } : {}) } });
const okDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

export default async (req) => {
  const u = new URL(req.url), from = u.searchParams.get("from"), to = u.searchParams.get("to");
  if (!okDate(from) || !okDate(to)) return json(400, { error: "Parámetros from/to inválidos (YYYY-MM-DD)." });
  try {
    const hasDb = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    let events, updated = new Date().toISOString();
    if (hasDb) {
      const last = await lastSync();
      if (Date.now() - last > 3 * 3600e3) { try { await sync(); } catch (e) { /* si falla la fuente, se sirve lo guardado */ } }
      const rows = await readFromSupabase(from, to) || [];
      events = rows; updated = rows.reduce((m, r) => r.fetched_at > m ? r.fetched_at : m, "") || updated;
    } else {
      events = await fetchWeek();
    }
    const cov = covered(from, to, events);
    return json(200, { source: "Forex Factory", updated, from: cov && cov[0], to: cov && cov[1], events: events.map(({ fetched_at, ...e }) => e) }, true);
  } catch (e) {
    return json(502, { error: "No se pudo obtener el calendario: " + e.message });
  }
};
// Días realmente cubiertos: entre el primer y el último evento disponibles dentro del rango pedido
function covered(from, to, events) {
  const ds = events.map(e => e.ts.slice(0, 10)).sort(); if (!ds.length) return null;
  const a = ds[0] > from ? ds[0] : from, b = ds[ds.length - 1] < to ? ds[ds.length - 1] : to;
  return a <= b ? [a, b] : null;
}

export const config = { path: "/api/econ" };
