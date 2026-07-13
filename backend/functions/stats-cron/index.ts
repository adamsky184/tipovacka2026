// stats-cron edge function (v5.12.43)
// Kazdych 10 min: pro dohrane zapasy bez nacachovanych statistik (goal_minutes_sync chybi)
// dohleda ESPN event id (scoreboard + aliasy, stejne jako cron-results) a zavola
// goal-minutes-sync + match-stats-sync (goly+asistence, boxscore, hraci, navsteva).
// Auth: X-Cron-Secret. Cap 6 zapasu/beh. Nikdy nesaha na tipy/vysledky.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const SB = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard";
const UA = { "User-Agent": "TipovackaMS2026/5.12 (+stats-cron)", "Accept": "application/json,*/*" };

const TEAM_ALIASES: Record<string, string[]> = {
  "Mexiko": ["Mexico"], "Jihoafricka rep.": ["South Africa"], "Jizni Korea": ["South Korea", "Korea Republic"],
  "Cesko": ["Czechia", "Czech Republic"], "Kanada": ["Canada"], "Katar": ["Qatar"], "Svycarsko": ["Switzerland"],
  "Bosna a Hercegovina": ["Bosnia and Herzegovina", "Bosnia-Herzegovina", "Bosnia & Herzegovina"],
  "Brazilie": ["Brazil"], "Maroko": ["Morocco"], "Skotsko": ["Scotland"], "Australie": ["Australia"],
  "Turecko": ["Türkiye", "Turkey"], "Nemecko": ["Germany"], "Pobrezi slonoviny": ["Côte d'Ivoire", "Ivory Coast"],
  "Ekvador": ["Ecuador"], "Nizozemsko": ["Netherlands"], "Japonsko": ["Japan"], "Svedsko": ["Sweden"],
  "Tunisko": ["Tunisia"], "Belgie": ["Belgium"], "Egypt": ["Egypt"], "Iran": ["IR Iran", "Iran"],
  "Novy Zeland": ["New Zealand"], "Spanelsko": ["Spain"], "Kapverdy": ["Cabo Verde", "Cape Verde"],
  "Saudska Arabie": ["Saudi Arabia"], "Uruguay": ["Uruguay"], "Francie": ["France"], "Senegal": ["Senegal"],
  "Irak": ["Iraq"], "Norsko": ["Norway"], "Argentina": ["Argentina"], "Alzirsko": ["Algeria"],
  "Rakousko": ["Austria"], "Jordansko": ["Jordan"], "Portugalsko": ["Portugal"], "DR Kongo": ["Congo DR", "DR Congo"],
  "Uzbekistan": ["Uzbekistan"], "Anglie": ["England"], "Chorvatsko": ["Croatia"], "Ghana": ["Ghana"],
  "Panama": ["Panama"], "USA": ["USA", "United States"], "Haiti": ["Haiti"], "Paraguay": ["Paraguay"],
  "Curacao": ["Curaçao", "Curacao"], "Kolumbie": ["Colombia"],
};
function nm(local: string, espn: string): boolean {
  const n = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");
  const a = n(local), b = n(espn);
  if (!a || !b) return false;
  if (a === b) return true;
  return (TEAM_ALIASES[local] || []).some((al) => n(al) === b);
}
function fmt(d: Date) { return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`; }

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    const provided = req.headers.get("X-Cron-Secret") || "";
    if (provided !== CRON_SECRET) return json({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "env" }, 500);
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: vys } = await sb.from("vysledky").select("zapas_id");
    const { data: synced } = await sb.from("goal_minutes_sync").select("zapas_id");
    const have = new Set((synced || []).map((r) => r.zapas_id));
    const targets = (vys || []).map((r) => r.zapas_id).filter((z) => !have.has(z)).slice(0, 6);
    if (!targets.length) return json({ ok: true, done: 0, note: "nothing to sync" });

    const { data: meta } = await sb.from("zapasy_meta").select("zapas_id,home_team,away_team,kickoff");
    // deno-lint-ignore no-explicit-any
    const metaBy: Record<number, any> = {};
    (meta || []).forEach((m) => { metaBy[m.zapas_id] = m; });

    // scoreboard cache per den
    // deno-lint-ignore no-explicit-any
    const dayCache: Record<string, any[]> = {};
    async function eventsFor(day: string) {
      if (dayCache[day]) return dayCache[day];
      const r = await fetch(`${SB}?dates=${day}`, { headers: UA });
      const j = r.ok ? await r.json() : {};
      // deno-lint-ignore no-explicit-any
      dayCache[day] = (Array.isArray(j?.events) ? j.events : []).map((ev: any) => {
        const c = ev?.competitions?.[0] || {};
        // deno-lint-ignore no-explicit-any
        const h = (c.competitors || []).find((x: any) => x?.homeAway === "home");
        // deno-lint-ignore no-explicit-any
        const a = (c.competitors || []).find((x: any) => x?.homeAway === "away");
        return { id: String(ev?.id || ""), home: h?.team?.displayName || "", away: a?.team?.displayName || "" };
      });
      return dayCache[day];
    }
    async function resolveEid(zid: number): Promise<string | null> {
      const m = metaBy[zid]; if (!m || !m.kickoff) return null;
      const k = new Date(m.kickoff); const et = new Date(k.getTime() - 4 * 3600e3);
      const days = [...new Set([fmt(et), fmt(new Date(et.getTime() + 864e5)), fmt(new Date(et.getTime() - 864e5))])];
      for (const d of days) {
        const evs = await eventsFor(d);
        const hit = evs.find((e) => nm(m.home_team || "", e.home) && nm(m.away_team || "", e.away));
        if (hit) return hit.id;
      }
      return null;
    }
    const hdrs = { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY, "content-type": "application/json" };
    let ok = 0, fail = 0; const detail: string[] = [];
    for (const zid of targets) {
      try {
        const eid = await resolveEid(zid);
        if (!eid) { fail++; detail.push(`z${zid}:no-event`); continue; }
        const body = JSON.stringify({ zapas_id: zid, event_id: eid });
        const g = await (await fetch(`${SUPABASE_URL}/functions/v1/goal-minutes-sync`, { method: "POST", headers: hdrs, body })).json();
        const st = await (await fetch(`${SUPABASE_URL}/functions/v1/match-stats-sync`, { method: "POST", headers: hdrs, body })).json();
        if (g?.ok && st?.ok) { ok++; detail.push(`z${zid}:ok`); }
        else { fail++; detail.push(`z${zid}:${JSON.stringify(g?.ok)}/${JSON.stringify(st?.ok)}`); }
      } catch (e) { fail++; detail.push(`z${zid}:${e instanceof Error ? e.message : "err"}`); }
    }
    return json({ ok: true, done: ok, fail, detail });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
