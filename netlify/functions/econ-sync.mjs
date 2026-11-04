// Ernest Edge · tarea programada: guarda el calendario de la semana en Supabase cada 4 horas,
// aunque nadie abra la app. Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
import { sync } from "../lib/econ.mjs";

export default async () => {
  try { const ev = await sync(); console.log(`Calendario sincronizado: ${ev.length} eventos`); }
  catch (e) { console.error("Error al sincronizar el calendario:", e.message); }
};

export const config = { schedule: "0 */4 * * *" };
