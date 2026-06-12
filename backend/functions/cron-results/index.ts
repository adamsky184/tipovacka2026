// cron-results edge function (v5.9.1)
// Volane pg_cronem kazde 2 min. Stahne ESPN scoreboard, parse + ulozi parsed_events do app_sync_statuses.
// v5.9.0: dohrane zapasy auto-uklada do vysledky (mapovani pres zapasy_meta + TEAM_ALIASES).
//   - INSERT s ignoreDuplicates: existujici radek NIKDY neprepisuje (admin zustava zdroj pravdy pro korekce)
//   - zadne dalsi ESPN cally navic, max 12 insertu/run
// v5.9.1: auto-resolve play-off dvojic - kdyz ESPN event nematchne zadny zapas podle jmen,
//   sparuje se podle casu vykopu (+-2h) s play-off radkem ktery ma jeste placeholder nazvy
//   ("2. sk.A", "Vitez Z73"...) a UPDATE zapasy_meta na realne ESPN nazvy. Jen unikatni kandidat.
// Bez verify_jwt (cron je interni). Anti-abuse: jen volani s tajnym CRON_SECRET v hlavicce.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard";

// Aliasy: lokalni nazev tymu (zapasy_meta) -> ESPN displayName varianty
const TEAM_ALIASES: Record<string, string[]> = {
  "Mexiko": ["Mexico", "MEX"],
  "Jihoafricka rep.": ["South Africa", "RSA"],
  "Jizni Korea": ["South Korea", "Korea Republic", "KOR"],
  "Cesko": ["Czechia", "Czech Republic", "CZE"],
  "Kanada": ["Canada", "CAN"],
  "Katar": ["Qatar", "QAT"],
  "Svycarsko": ["Switzerland", "SUI"],
  "Bosna a Hercegovina": ["Bosnia and Herzegovina", "Bosnia & Herzegovina", "BIH"],
  "Brazilie": ["Brazil", "BRA"],
  "Maroko": ["Morocco", "MAR"],
  "Skotsko": ["Scotland", "SCO"],
  "Australie": ["Australia", "AUS"],
  "Turecko": ["Türkiye", "Turkey", "TUR"],
  "Nemecko": ["Germany", "GER"],
  "Pobrezi slonoviny": ["Côte d'Ivoire", "Ivory Coast", "CIV"],
  "Ekvador": ["Ecuador", "ECU"],
  "Nizozemsko": ["Netherlands", "NED"],
  "Japonsko": ["Japan", "JPN"],
  "Svedsko": ["Sweden", "SWE"],
  "Tunisko": ["Tunisia", "TUN"],
  "Belgie": ["Belgium", "BEL"],
  "Egypt": ["Egypt", "EGY"],
  "Iran": ["IR Iran", "Iran", "IRN"],
  "Novy Zeland": ["New Zealand", "NZL"],
  "Spanelsko": ["Spain", "ESP"],
  "Kapverdy": ["Cabo Verde", "Cape Verde", "CPV"],
  "Saudska Arabie": ["Saudi Arabia", "KSA"],
  "Uruguay": ["Uruguay", "URU"],
  "Francie": ["France", "FRA"],
  "Senegal": ["Senegal", "SEN"],
  "Irak": ["Iraq", "IRQ"],
  "Norsko": ["Norway", "NOR"],
  "Argentina": ["Argentina", "ARG"],
  "Alzirsko": ["Algeria", "ALG"],
  "Rakousko": ["Austria", "AUT"],
  "Jordansko": ["Jordan", "JOR"],
  "Portugalsko": ["Portugal", "POR"],
  "DR Kongo": ["Congo DR", "DR Congo", "COD"],
  "Uzbekistan": ["Uzbekistan", "UZB"],
  "Anglie": ["England", "ENG"],
  "Chorvatsko": ["Croatia", "CRO"],
  "Ghana": ["Ghana", "GHA"],
  "Panama": ["Panama", "PAN"],
  "USA": ["USA", "United States"],
  "Haiti": ["Haiti", "HAI"],
  "Paraguay": ["Paraguay", "PAR"],
  "Curacao": ["Curaçao", "Curacao", "CUW"],
  "Kolumbie": ["Colombia", "COL"],
};

function nameMatches(localName: string, espnName: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
  const a = norm(localName), b = norm(espnName);
  if (!a || !b) return false;
  if (a === b) return true;
  const aliases = TEAM_ALIASES[localName] || [];
  return aliases.some((al) => norm(al) === b);
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

Deno.serve(async (req) => {
  // Auth via CRON_SECRET hlavicka (settable v Supabase Edge Function Secrets)
  if (CRON_SECRET) {
    const provided = req.headers.get("X-Cron-Secret") || "";
    if (provided !== CRON_SECRET) {
      return jsonResponse(401, { ok: false, error: "Unauthorized" });
    }
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { ok: false, error: "Supabase env not configured" });
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Fetch ESPN scoreboard
    const res = await fetch(ESPN_SCOREBOARD_URL, {
      headers: { "User-Agent": "TipovackaMS2026/5.9 (+cron)", "Accept": "application/json" },
    });
    if (!res.ok) {
      await sb.from("app_sync_statuses").upsert(
        { key: "results", last_updated_at: new Date().toISOString(), detail: { source: "cron", error: `HTTP ${res.status}`, events_count: 0 } },
        { onConflict: "key" },
      );
      return jsonResponse(200, { ok: false, error: `ESPN HTTP ${res.status}` });
    }
    const json = await res.json();
    const events = Array.isArray(json?.events) ? json.events : [];

    // deno-lint-ignore no-explicit-any
    const parsed = events.map((ev: any) => {
      const comp = ev.competitions?.[0];
      if (!comp) return null;
      // deno-lint-ignore no-explicit-any
      const home = comp.competitors?.find((c: any) => c.homeAway === "home");
      // deno-lint-ignore no-explicit-any
      const away = comp.competitors?.find((c: any) => c.homeAway === "away");
      const st = comp.status;
      return {
        home: home?.team?.displayName || "",
        away: away?.team?.displayName || "",
        homeScore: home?.score ?? "",
        awayScore: away?.score ?? "",
        completed: !!st?.type?.completed,
        statusDesc: st?.type?.description || "",
        clock: st?.displayClock || "",
        date: ev?.date || "",
      };
    }).filter(Boolean);

    const liveCount = parsed.filter((p) => p && !p.completed && p.homeScore !== "").length;
    const finalCount = parsed.filter((p) => p && p.completed).length;

    // v5.9.1: auto-resolve play-off dvojic podle casu vykopu
    let metaUpdated = 0;
    const metaUpdatedIds: number[] = [];
    // deno-lint-ignore no-explicit-any
    let metaCache: any[] | null = null;
    try {
      const isPlaceholder = (s: string) => /sk\.|nejl|Vitez|Porazeny|Winner|Loser/i.test(s || "");
      const { data: meta } = await sb.from("zapasy_meta").select("zapas_id,stage,home_team,away_team,kickoff");
      metaCache = meta || [];
      for (const ev of parsed) {
        if (!ev || !ev.home || !ev.away || !ev.date) continue;
        // Uz matchuje podle jmen? -> nic neresolvovat
        const namedHit = metaCache.some((m) => nameMatches(m.home_team || "", ev.home) && nameMatches(m.away_team || "", ev.away));
        if (namedHit) continue;
        const evTime = Date.parse(ev.date);
        if (!Number.isFinite(evTime)) continue;
        const candidates = metaCache.filter((m) =>
          isPlaceholder(m.home_team || "") && isPlaceholder(m.away_team || "") &&
          m.kickoff && Math.abs(evTime - Date.parse(m.kickoff)) <= 2 * 3600 * 1000
        );
        if (candidates.length === 1 && metaUpdated < 8) {
          const { error: updErr } = await sb.from("zapasy_meta")
            .update({ home_team: ev.home, away_team: ev.away })
            .eq("zapas_id", candidates[0].zapas_id);
          if (!updErr) {
            candidates[0].home_team = ev.home;
            candidates[0].away_team = ev.away;
            metaUpdated++;
            metaUpdatedIds.push(candidates[0].zapas_id);
          }
        }
      }
    } catch (_e) { /* resolve selhani nesmi shodit cron */ }

    // v5.9.0: auto-save dohranych zapasu do vysledky (insert-only, nikdy neprepisuje)
    let autoSaved = 0;
    const autoSavedIds: number[] = [];
    try {
      const completedEvents = parsed.filter((p) => {
        if (!p || !p.completed) return false;
        const hs = Number(p.homeScore), as = Number(p.awayScore);
        return p.homeScore !== "" && p.awayScore !== "" && Number.isFinite(hs) && Number.isFinite(as);
      });
      if (completedEvents.length) {
        const meta = metaCache || (await sb.from("zapasy_meta").select("zapas_id,home_team,away_team,kickoff")).data;
        const { data: existing } = await sb.from("vysledky").select("zapas_id");
        const hasResult = new Set((existing || []).map((r) => r.zapas_id));
        const rows: { zapas_id: number; skore: string; status: string; aktualizovano: string }[] = [];
        for (const ev of completedEvents) {
          if (!ev) continue;
          const evTime = ev.date ? Date.parse(ev.date) : NaN;
          const hits = (meta || []).filter((m) => {
            if (!nameMatches(m.home_team || "", ev.home) || !nameMatches(m.away_team || "", ev.away)) return false;
            // Stejna dvojice muze hrat vicekrat (play-off) -> kickoff musi sedet na +-48h
            if (Number.isFinite(evTime) && m.kickoff) {
              const diff = Math.abs(evTime - Date.parse(m.kickoff));
              if (diff > 48 * 3600 * 1000) return false;
            }
            return true;
          });
          if (hits.length === 1 && !hasResult.has(hits[0].zapas_id)) {
            rows.push({
              zapas_id: hits[0].zapas_id,
              skore: `${Number(ev.homeScore)}:${Number(ev.awayScore)}`,
              status: "final",
              aktualizovano: new Date().toISOString(),
            });
          }
        }
        if (rows.length) {
          const capped = rows.slice(0, 12);
          // ignoreDuplicates=true => ON CONFLICT DO NOTHING (existujici skore se NIKDY neprepise)
          const { error: insErr } = await sb.from("vysledky").upsert(capped, { onConflict: "zapas_id", ignoreDuplicates: true });
          if (!insErr) { autoSaved = capped.length; capped.forEach((r) => autoSavedIds.push(r.zapas_id)); }
        }
      }
    } catch (_e) { /* auto-save selhani nesmi shodit cron - parsed_events se ulozi vzdy */ }

    await sb.from("app_sync_statuses").upsert(
      {
        key: "results",
        last_updated_at: new Date().toISOString(),
        detail: { source: "cron", events_count: parsed.length, live_count: liveCount, final_count: finalCount, auto_saved: autoSaved, auto_saved_ids: autoSavedIds, meta_updated: metaUpdated, meta_updated_ids: metaUpdatedIds, parsed_events: parsed.slice(0, 30) },
      },
      { onConflict: "key" },
    );

    return jsonResponse(200, { ok: true, events_count: parsed.length, live_count: liveCount, final_count: finalCount, auto_saved: autoSaved });
  } catch (e) {
    return jsonResponse(500, { ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
