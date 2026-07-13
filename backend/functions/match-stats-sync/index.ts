// match-stats-sync edge function (v5.12.40 - +player_match_stats)
// Stahne z ESPN summary tymove boxscore statistiky zapasu + penaltove udalosti + hracske radky a nacachuje do match_stats / player_match_stats.
// Klient posle vyreseny event_id (ma alias logiku). Volani: POST {zapas_id, event_id} (anon JWT staci).
// Cte jen verejna ESPN data. Zapisuje pouze do match_stats.
import { createClient } from "jsr:@supabase/supabase-js@2";

const ESPN_SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/summary";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
}
function parseClock(dv: string): { m: number; s: number } | null {
  const mm = String(dv || "").match(/(\d+)\s*'?\s*(?:\+\s*(\d+))?/);
  if (!mm) return null;
  const m = Number(mm[1]);
  if (!Number.isFinite(m)) return null;
  return { m, s: mm[2] ? Number(mm[2]) : 0 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const zid = Number(body?.zapas_id);
    const event = String(body?.event_id || "").trim();
    if (!Number.isInteger(zid) || zid < 1) return json({ ok: false, error: "bad zapas_id" }, 400);
    if (!/^\d{1,12}$/.test(event)) return json({ ok: false, error: "bad event_id" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const res = await fetch(`${ESPN_SUMMARY}?event=${event}`, {
      headers: { "User-Agent": "TipovackaMS2026/5.12 (+match-stats)", "Accept": "application/json,*/*" },
    });
    if (!res.ok) throw new Error(`ESPN summary HTTP ${res.status}`);
    const d = await res.json();

    // mapovani home/away pres header competitors (team id)
    const hc = d?.header?.competitions?.[0] || {};
    // deno-lint-ignore no-explicit-any
    const comps = (hc?.competitors || []) as any[];
    const homeC = comps.find((c) => c?.homeAway === "home");
    const awayC = comps.find((c) => c?.homeAway === "away");
    const homeId = String(homeC?.id || homeC?.team?.id || "");
    const awayId = String(awayC?.id || awayC?.team?.id || "");

    // boxscore: {statName: displayValue} per strana
    const sides: Record<string, Record<string, string>> = { H: {}, A: {} };
    // deno-lint-ignore no-explicit-any
    for (const t of (d?.boxscore?.teams || []) as any[]) {
      const tid = String(t?.team?.id || "");
      const side = tid === homeId ? "H" : tid === awayId ? "A" : "";
      if (!side) continue;
      // deno-lint-ignore no-explicit-any
      for (const s of (t?.statistics || []) as any[]) {
        const nm = String(s?.name || s?.label || "");
        if (nm) sides[side][nm] = String(s?.displayValue ?? "");
      }
    }

    // penaltove udalosti z keyEvents (scored/missed/saved, mimo rozstrel)
    // deno-lint-ignore no-explicit-any
    const penEvents: any[] = [];
    // deno-lint-ignore no-explicit-any
    for (const e of (d?.keyEvents || []) as any[]) {
      const txt = String(e?.type?.text || "");
      if (!/penalt/i.test(txt)) continue;
      if (e?.shootout) continue;
      const c = parseClock(e?.clock?.displayValue || "");
      const tid = String(e?.team?.id || "");
      const side = tid === homeId ? "H" : tid === awayId ? "A" : "";
      const player = String(((e?.participants || [])[0])?.athlete?.displayName || "");
      const outcome = /missed/i.test(txt) ? "missed" : /saved/i.test(txt) ? "saved" : (e?.scoringPlay ? "scored" : "other");
      penEvents.push({ minute: c ? c.m : null, stoppage: c ? c.s : 0, side, player, outcome, type: txt });
    }

    // v5.12.40: hracske per-zapas statistiky ze soupisek (jen hraci, kteri nastoupili)
    // deno-lint-ignore no-explicit-any
    const pRows: any[] = [];
    // deno-lint-ignore no-explicit-any
    for (const r of (d?.rosters || []) as any[]) {
      const side = r?.homeAway === "home" ? "H" : r?.homeAway === "away" ? "A" : "";
      if (!side) continue;
      const teamName = String(r?.team?.displayName || "");
      // deno-lint-ignore no-explicit-any
      for (const p of (r?.roster || []) as any[]) {
        const name = String(p?.athlete?.displayName || "");
        if (!name) continue;
        const st: Record<string, number> = {};
        // deno-lint-ignore no-explicit-any
        for (const s of (p?.stats || []) as any[]) {
          st[String(s?.name || "")] = Number(s?.value) || 0;
        }
        if (!(st["appearances"] >= 1)) continue;
        pRows.push({
          zapas_id: zid, side, player: name, team: teamName,
          pos: String(p?.position?.abbreviation || ""),
          starter: !!p?.starter, sub_in: !!p?.subbedIn,
          goals: st["totalGoals"] || 0, assists: st["goalAssists"] || 0,
          shots: st["totalShots"] || 0, shots_on_target: st["shotsOnTarget"] || 0,
          fouls_committed: st["foulsCommitted"] || 0, fouls_suffered: st["foulsSuffered"] || 0,
          yellow: st["yellowCards"] || 0, red: st["redCards"] || 0,
          own_goals: st["ownGoals"] || 0,
          saves: st["saves"] || 0, goals_conceded: st["goalsConceded"] || 0,
        });
      }
    }
    // Idempotentne: smaz stare radky zapasu, vloz nove
    await sb.from("player_match_stats").delete().eq("zapas_id", zid);
    if (pRows.length) {
      const { error: pErr } = await sb.from("player_match_stats").insert(pRows);
      if (pErr) throw new Error("players insert: " + pErr.message);
    }

    // v5.12.39: navsteva + rozhodci z gameInfo
    const gi = d?.gameInfo || {};
    const attendance = typeof gi?.attendance === "number" && gi.attendance > 0 ? gi.attendance : null;
    // deno-lint-ignore no-explicit-any
    const ref0 = ((gi?.officials || [])[0]) as any;
    const referee = String(ref0?.fullName || ref0?.displayName || "");

    const { error: upErr } = await sb.from("match_stats").upsert({
      zapas_id: zid, event_id: event,
      home: sides.H, away: sides.A, pen_events: penEvents,
      attendance: attendance, referee: referee,
      synced_at: new Date().toISOString(),
    }, { onConflict: "zapas_id" });
    if (upErr) throw new Error("upsert: " + upErr.message);

    return json({ ok: true, zapas_id: zid, home_keys: Object.keys(sides.H).length, away_keys: Object.keys(sides.A).length, pen_events: penEvents.length, players: pRows.length });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
