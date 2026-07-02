// results-refresh edge function (v5.12.28 - multi-day + resolved 90')
// Server-side proxy ESPN scoreboard (dnes/vcera/zitra kvuli timezone overlapum), CORS-safe.
// v5.12.28: nove vraci i `resolved` = server-side namapovane radky {zapas_id, skore, postupujici}
//   s KOREKTNIM 90' skore + postupujicim u play-off (stejna logika jako cron-results, prodlouzeni se nepocita).
//   Klient upsertne `resolved`; kdyz chybi, spadne zpet na stare mapovani z `events` (bezpecna degradace).
//   computeResolved je obaleny try/catch a NIKDY neshodi odpoved (fallback = prazdny resolved).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard";
const ESPN_SUMMARY_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/summary";
const UA_HEADERS = { "User-Agent": "TipovackaMS2026/5.12 (+refresh)", "Accept": "application/json,*/*" };

// Aliasy lokalni nazev tymu (zapasy_meta) -> ESPN displayName (shodne s cron-results)
const TEAM_ALIASES: Record<string, string[]> = {
  "Mexiko": ["Mexico", "MEX"], "Jihoafricka rep.": ["South Africa", "RSA"],
  "Jizni Korea": ["South Korea", "Korea Republic", "KOR"], "Cesko": ["Czechia", "Czech Republic", "CZE"],
  "Kanada": ["Canada", "CAN"], "Katar": ["Qatar", "QAT"], "Svycarsko": ["Switzerland", "SUI"],
  "Bosna a Hercegovina": ["Bosnia and Herzegovina", "Bosnia & Herzegovina", "Bosnia-Herzegovina", "BIH"],
  "Brazilie": ["Brazil", "BRA"], "Maroko": ["Morocco", "MAR"], "Skotsko": ["Scotland", "SCO"],
  "Australie": ["Australia", "AUS"], "Turecko": ["Türkiye", "Turkey", "TUR"], "Nemecko": ["Germany", "GER"],
  "Pobrezi slonoviny": ["Côte d'Ivoire", "Ivory Coast", "CIV"], "Ekvador": ["Ecuador", "ECU"],
  "Nizozemsko": ["Netherlands", "NED"], "Japonsko": ["Japan", "JPN"], "Svedsko": ["Sweden", "SWE"],
  "Tunisko": ["Tunisia", "TUN"], "Belgie": ["Belgium", "BEL"], "Egypt": ["Egypt", "EGY"],
  "Iran": ["IR Iran", "Iran", "IRN"], "Novy Zeland": ["New Zealand", "NZL"], "Spanelsko": ["Spain", "ESP"],
  "Kapverdy": ["Cabo Verde", "Cape Verde", "CPV"], "Saudska Arabie": ["Saudi Arabia", "KSA"],
  "Uruguay": ["Uruguay", "URU"], "Francie": ["France", "FRA"], "Senegal": ["Senegal", "SEN"],
  "Irak": ["Iraq", "IRQ"], "Norsko": ["Norway", "NOR"], "Argentina": ["Argentina", "ARG"],
  "Alzirsko": ["Algeria", "ALG"], "Rakousko": ["Austria", "AUT"], "Jordansko": ["Jordan", "JOR"],
  "Portugalsko": ["Portugal", "POR"], "DR Kongo": ["Congo DR", "DR Congo", "COD"], "Uzbekistan": ["Uzbekistan", "UZB"],
  "Anglie": ["England", "ENG"], "Chorvatsko": ["Croatia", "CRO"], "Ghana": ["Ghana", "GHA"],
  "Panama": ["Panama", "PAN"], "USA": ["USA", "United States"], "Haiti": ["Haiti", "HAI"],
  "Paraguay": ["Paraguay", "PAR"], "Curacao": ["Curaçao", "Curacao", "CUW"], "Kolumbie": ["Colombia", "COL"],
};
function nameMatches(localName: string, espnName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const a = norm(localName), b = norm(espnName);
  if (!a || !b) return false;
  if (a === b) return true;
  return (TEAM_ALIASES[localName] || []).some((al) => norm(al) === b);
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

function yyyymmdd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fetchOneDay(date: string): Promise<unknown[]> {
  const url = `${ESPN_SCOREBOARD_URL}?dates=${date}`;
  const res = await fetch(url, { headers: UA_HEADERS });
  if (!res.ok) return [];
  const json = await res.json();
  return Array.isArray((json as { events?: unknown[] })?.events) ? (json as { events: unknown[] }).events : [];
}

async function fetchScoreboardMultiDay(): Promise<{ events: unknown[]; days: string[] }> {
  // Fetch dnes, vcera i zitra (UTC) - pokryti timezone overlapu a delayed updates
  const now = new Date();
  const dates: string[] = [];
  for (let i = -1; i <= 1; i++) dates.push(yyyymmdd(new Date(now.getTime() + i * 86400000)));
  const seen = new Set<string>();
  const all: unknown[] = [];
  for (const d of dates) {
    const events = await fetchOneDay(d);
    for (const ev of events) {
      const id = String((ev as { id?: string | number })?.id || "");
      if (id && !seen.has(id)) { seen.add(id); all.push(ev); }
    }
  }
  return { events: all, days: dates };
}

// Server-side mapovani ESPN eventu -> radky vysledky s KOREKTNIM 90' skore + postupujicim (jako cron-results).
// deno-lint-ignore no-explicit-any
async function computeResolved(sb: ReturnType<typeof createClient>, events: any[]) {
  const { data: meta } = await sb.from("zapasy_meta").select("zapas_id,home_team,away_team,kickoff");
  // deno-lint-ignore no-explicit-any
  const metaArr = (meta || []) as any[];
  // deno-lint-ignore no-explicit-any
  const parsed = events.map((ev: any) => {
    const comp = ev?.competitions?.[0];
    if (!comp) return null;
    const st = comp?.status?.type;
    // deno-lint-ignore no-explicit-any
    const home = (comp.competitors || []).find((c: any) => c?.homeAway === "home");
    // deno-lint-ignore no-explicit-any
    const away = (comp.competitors || []).find((c: any) => c?.homeAway === "away");
    if (!home || !away) return null;
    return {
      id: String(ev?.id || ""),
      home: home?.team?.displayName || "", away: away?.team?.displayName || "",
      homeScore: home?.score, awayScore: away?.score,
      completed: !!st?.completed, date: ev?.date || "",
    };
  }).filter(Boolean) as any[];

  const rows: { zapas_id: number; skore: string; postupujici: string | null }[] = [];
  for (const ev of parsed) {
    if (!ev.completed) continue;
    const hs = Number(ev.homeScore), as = Number(ev.awayScore);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
    const evTime = ev.date ? Date.parse(ev.date) : NaN;
    // deno-lint-ignore no-explicit-any
    const hits = metaArr.filter((m: any) => {
      if (!nameMatches(m.home_team || "", ev.home) || !nameMatches(m.away_team || "", ev.away)) return false;
      if (Number.isFinite(evTime) && m.kickoff && Math.abs(evTime - Date.parse(m.kickoff)) > 48 * 3600 * 1000) return false;
      return true;
    });
    if (hits.length !== 1) continue;
    const zid = hits[0].zapas_id as number;
    let skore = `${hs}:${as}`;
    let postupujici: string | null = null;
    // Play-off: skore po 90' (prodlouzeni se nepocita) + postupujici u remizy po 90'
    if (zid >= 73 && ev.id) {
      try {
        const sRes = await fetch(`${ESPN_SUMMARY_URL}?event=${ev.id}`, { headers: UA_HEADERS });
        if (sRes.ok) {
          const sj = await sRes.json();
          const hc = sj?.header?.competitions?.[0];
          // deno-lint-ignore no-explicit-any
          const ch = (hc?.competitors || []).find((c: any) => c?.homeAway === "home");
          // deno-lint-ignore no-explicit-any
          const ca = (hc?.competitors || []).find((c: any) => c?.homeAway === "away");
          // deno-lint-ignore no-explicit-any
          const sum2 = (ls: any) => {
            const a = Array.isArray(ls) ? ls : [];
            return (Number(a?.[0]?.displayValue) || 0) + (Number(a?.[1]?.displayValue) || 0);
          };
          if (Array.isArray(ch?.linescores) && ch.linescores.length >= 2 && Array.isArray(ca?.linescores) && ca.linescores.length >= 2) {
            const h90 = sum2(ch.linescores), a90 = sum2(ca.linescores);
            skore = `${h90}:${a90}`;
            postupujici = h90 === a90 ? (ch?.winner ? "H" : ca?.winner ? "A" : null) : null;
          }
        }
      } catch (_e) { /* fallback: ponech scoreboard skore; admin muze opravit rucne */ }
    }
    rows.push({ zapas_id: zid, skore, postupujici });
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse(200, { ok: true });
  if (req.method !== "GET" && req.method !== "POST") return jsonResponse(405, { ok: false, error: "Method not allowed" });

  try {
    const { events, days } = await fetchScoreboardMultiDay();

    // resolved (server-side korektni 90' + postupujici) - NIKDY neshodi odpoved
    let resolved: { zapas_id: number; skore: string; postupujici: string | null }[] = [];
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      try { resolved = await computeResolved(sb, events); } catch (_e) { resolved = []; }

      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const adminName = String(body?.admin_name || "").trim();
        const pin = String(body?.pin || "").trim();
        if (adminName && pin) {
          const detail = {
            source: "espn_scoreboard_multiday",
            imported_by: adminName,
            events_count: events.length,
            resolved_count: resolved.length,
            source_url: ESPN_SCOREBOARD_URL,
            days_fetched: days,
          };
          await sb.from("app_sync_statuses").upsert(
            { key: "results", last_updated_at: new Date().toISOString(), detail },
            { onConflict: "key" },
          );
        }
      }
    }

    return jsonResponse(200, { ok: true, events, events_count: events.length, days_fetched: days, resolved });
  } catch (error) {
    return jsonResponse(500, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
