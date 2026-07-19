// roster-sync edge function (v5.12.57)
// Jednorazove/na vyzadani: stahne oficialni soupisky vsech 48 tymu z ESPN
// (vc. hracu s 0 minutami) a ulozi do team_rosters pod lokalnimi nazvy tymu.
// Auth: X-Cron-Secret. Nikdy nesaha na tipy/vysledky/ucty.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD";
const UA = { "User-Agent": "TipovackaMS2026/5.12 (+roster-sync)", "Accept": "application/json,*/*" };

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
function toLocal(espn: string): string {
  const n = (x: string) => x.toLowerCase().replace(/[^a-z]/g, "");
  const b = n(espn);
  for (const [loc, aliases] of Object.entries(TEAM_ALIASES)) {
    if (n(loc) === b || aliases.some((a) => n(a) === b)) return loc;
  }
  return espn;
}
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    if ((req.headers.get("X-Cron-Secret") || "") !== CRON_SECRET) return json({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "env" }, 500);
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const tr = await fetch(`${BASE}/teams?limit=100`, { headers: UA });
    const tj = await tr.json();
    // deno-lint-ignore no-explicit-any
    const teams = (tj?.sports?.[0]?.leagues?.[0]?.teams || []).map((t: any) => ({ id: String(t?.team?.id || ""), name: String(t?.team?.displayName || "") }));
    if (!teams.length) return json({ ok: false, error: "no teams from espn" }, 502);
    let okc = 0, fail = 0, players = 0; const detail: string[] = [];
    // deno-lint-ignore no-explicit-any
    const rows: any[] = [];
    for (const t of teams) {
      try {
        const rr = await fetch(`${BASE}/teams/${t.id}/roster`, { headers: UA });
        const rj = await rr.json();
        // deno-lint-ignore no-explicit-any
        const ath = (rj?.athletes || []) as any[];
        if (!ath.length) { fail++; detail.push(`${t.name}:empty`); continue; }
        const local = toLocal(t.name);
        for (const a of ath) {
          const nm = String(a?.displayName || "").trim();
          if (!nm) continue;
          rows.push({
            team: local, player: nm,
            jersey: a?.jersey != null && /^\d+$/.test(String(a.jersey)) ? parseInt(String(a.jersey), 10) : null,
            pos: String(a?.position?.abbreviation || "").slice(0, 4) || null,
            age: typeof a?.age === "number" ? a.age : null,
          });
          players++;
        }
        okc++;
      } catch (e) { fail++; detail.push(`${t.name}:${e instanceof Error ? e.message : "err"}`); }
    }
    if (rows.length < 500) return json({ ok: false, error: "too few players, aborting", players, detail }, 502);
    await sb.from("team_rosters").delete().neq("team", "");
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await sb.from("team_rosters").insert(rows.slice(i, i + 500));
      if (error) return json({ ok: false, error: error.message }, 500);
    }
    return json({ ok: true, teams: okc, fail, players, detail: detail.slice(0, 10) });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
