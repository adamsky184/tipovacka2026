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

// v5.12.52: auto-vyhodnoceni extra tipu po finale (z104).
// Vitez = vitez finale (lokalni nazev tymu). Kral strelcu dle FIFA Zlate kopacky:
// goly -> asistence -> (minuty nemame) -> goly ze hry bez penalt -> plna shoda = sdilena cena (zapise se "A / B", parovani resi klient).
// Spusti se jen kdyz winner_actual jeste neni vyplneny (admin override ma prednost).
// deno-lint-ignore no-explicit-any
async function evalFinale(sb: any, dryRun: boolean) {
  const { data: fin } = await sb.from("vysledky").select("zapas_id,skore,postupujici").eq("zapas_id", 104).maybeSingle();
  if (!fin || !/^\d+:\d+$/.test(String(fin.skore))) return { active: false, reason: "finale jeste nedohrano" };
  const { data: set } = await sb.from("extra_tip_settings").select("id,winner_actual,scorer_actual").limit(1).maybeSingle();
  if (set && set.winner_actual) return { active: false, reason: "uz vyhodnoceno (admin/auto)" };
  const { data: meta } = await sb.from("zapasy_meta").select("home_team,away_team").eq("zapas_id", 104).maybeSingle();
  const sp = String(fin.skore).split(":").map(Number);
  const side = sp[0] > sp[1] ? "H" : sp[0] < sp[1] ? "A" : (fin.postupujici || "");
  if (!side || !meta) return { active: false, reason: "vitez neurcen" };
  const espnName = side === "H" ? meta.home_team : meta.away_team;
  let local = String(espnName || "");
  for (const [loc, aliases] of Object.entries(TEAM_ALIASES)) {
    if (loc === local || aliases.some((a) => a.toLowerCase() === local.toLowerCase())) { local = loc; break; }
  }
  const { data: gm } = await sb.from("goal_minutes").select("scorer,assist,penalty,own_goal");
  const agg: Record<string, { g: number; open: number }> = {}; const asis: Record<string, number> = {};
  // deno-lint-ignore no-explicit-any
  (gm || []).forEach((g: any) => {
    if (g.assist) asis[g.assist] = (asis[g.assist] || 0) + 1;
    if (g.own_goal || !g.scorer) return;
    const a = agg[g.scorer] = agg[g.scorer] || { g: 0, open: 0 };
    a.g++; if (!g.penalty) a.open++;
  });
  const cand = Object.keys(agg).map((n) => ({ n, g: agg[n].g, a: asis[n] || 0, open: agg[n].open }))
    .sort((x, y) => y.g - x.g || y.a - x.a || y.open - x.open);
  if (!cand.length) return { active: false, reason: "zadni strelci" };
  const t0 = cand[0];
  const tied = cand.filter((c) => c.g === t0.g && c.a === t0.a && c.open === t0.open);
  const scorer = tied.map((t) => t.n).join(" / ");
  if (!dryRun && set) {
    await sb.from("extra_tip_settings").update({ winner_actual: local, scorer_actual: scorer, updated_at: new Date().toISOString() }).eq("id", set.id);
  }
  return { active: true, dryRun, winner: local, scorer, shared: tied.length > 1, top3: cand.slice(0, 3) };
}

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    const provided = req.headers.get("X-Cron-Secret") || "";
    if (provided !== CRON_SECRET) return json({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "env" }, 500);
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    // deno-lint-ignore no-explicit-any
    const body: any = await req.json().catch(() => ({}));
    if (body && body.dry_run_finale === true) {
      const fe = await evalFinale(sb, true);
      return json({ ok: true, finale: fe });
    }
    const { data: vys } = await sb.from("vysledky").select("zapas_id");
    const { data: synced } = await sb.from("goal_minutes_sync").select("zapas_id");
    const have = new Set((synced || []).map((r) => r.zapas_id));
    const targets = (vys || []).map((r) => r.zapas_id).filter((z) => !have.has(z)).slice(0, 6);
    if (!targets.length) {
      let finale0 = null;
      try { finale0 = await evalFinale(sb, false); } catch (_e) { finale0 = { active: false, reason: "eval error" }; }
      return json({ ok: true, done: 0, note: "nothing to sync", finale: finale0 });
    }

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
    // po finale: auto-vyhodnoceni extra tipu (idempotentni, nikdy neprepise admina)
    let finale = null;
    try { finale = await evalFinale(sb, false); } catch (_e) { finale = { active: false, reason: "eval error" }; }
    return json({ ok: true, done: ok, fail, detail, finale });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
