// Ernest Edge · lógica compartida del calendario económico
// Fuente: feed semanal público de Forex Factory (nfs.faireconomy.media).
const FEED = "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const IMP = { High: 3, Medium: 2, Low: 1, Holiday: 0 };

export async function fetchWeek() {
  const r = await fetch(FEED, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Forex Factory respondió ${r.status}`);
  const raw = await r.json();
  if (!Array.isArray(raw)) throw new Error("Formato inesperado del calendario");
  return raw.filter(e => e && e.date && e.title).map(e => {
    const ts = new Date(e.date).toISOString();
    const cur = String(e.country || "").toUpperCase();
    return { id: `${ts}|${cur}|${e.title}`.slice(0, 300), ts, cur, title: String(e.title), impact: IMP[e.impact] ?? 1,
      actual: e.actual ? String(e.actual) : "", forecast: e.forecast ? String(e.forecast) : "", previous: e.previous ? String(e.previous) : "" };
  });
}

// Guarda la semana en Supabase (requiere la clave service_role SOLO en el servidor)
export async function saveToSupabase(events) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !events.length) return false;
  const now = new Date().toISOString();
  const rows = events.map(e => ({ ...e, fetched_at: now }));
  const r = await fetch(`${SUPABASE_URL}/rest/v1/econ_events?on_conflict=id`, {
    method: "POST",
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows)
  });
  if (!r.ok) throw new Error(`Supabase respondió ${r.status}: ${await r.text()}`);
  return true;
}

export async function readFromSupabase(from, to) {
  const { SUPABASE_URL } = process.env, key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  const a = new Date(from + "T00:00:00Z"); a.setUTCDate(a.getUTCDate() - 1);
  const b = new Date(to + "T00:00:00Z"); b.setUTCDate(b.getUTCDate() + 2);
  const url = `${SUPABASE_URL}/rest/v1/econ_events?select=id,ts,cur,title,impact,actual,forecast,previous,fetched_at&ts=gte.${a.toISOString()}&ts=lt.${b.toISOString()}&order=ts.asc&limit=3000`;
  const r = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return null;
  return r.json();
}

export async function lastSync() {
  const { SUPABASE_URL } = process.env, key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return 0;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/econ_events?select=fetched_at&order=fetched_at.desc&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!r.ok) return 0;
  const j = await r.json(); return j[0] ? new Date(j[0].fetched_at).getTime() : 0;
}

export async function sync() {
  const ev = await fetchWeek();
  await saveToSupabase(ev);
  return ev;
}
