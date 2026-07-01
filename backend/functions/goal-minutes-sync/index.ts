// goal-minutes-sync edge function (v5.12.24)
// Stahne z ESPN summary minuty golu daneho zapasu a nacachuje do goal_minutes (+ goal_minutes_sync).
// Klient (ktery ma plnou alias logiku) posle uz vyreseny event_id -> tady jen fetch + parse + zapis (service role).
// Volani: POST {zapas_id, event_id}  (anon JWT staci, stejne jako match-summary/yt-highlights)
// Cte jen verejna ESPN data. Zapisuje pouze do goal_minutes* (nic jineho nesaha).
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

// "45'" -> {m:45,s:0}; "90'+3'" -> {m:90,s:3}
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
      headers: { "User-Agent": "TipovackaMS2026/5.12 (+goal-minutes)", "Accept": "application/json,*/*" },
    });
    if (!res.ok) throw new Error(`ESPN summary HTTP ${res.status}`);
    const d = await res.json();

    const hc = d?.header?.competitions?.[0] || {};
    // deno-lint-ignore no-explicit-any
    const comps = (hc?.competitors || []) as any[];
    const homeC = comps.find((c) => c?.homeAway === "home");
    const awayC = comps.find((c) => c?.homeAway === "away");
    const homeId = String(homeC?.id || homeC?.team?.id || "");
    const awayId = String(awayC?.id || awayC?.team?.id || "");
    const homeFinal = Number(homeC?.score);
    const awayFinal = Number(awayC?.score);

    // deno-lint-ignore no-explicit-any
    const ke = (d?.keyEvents || []) as any[];
    // deno-lint-ignore no-explicit-any
    const goals: any[] = [];
    for (const e of ke) {
      if (!e?.scoringPlay) continue;
      if (e?.shootout) continue; // penaltovy rozstrel nema minutu v ramci zapasu
      const txt = String(e?.type?.text || "");
      const c = parseClock(e?.clock?.displayValue || "");
      if (!c) continue;
      const tid = String(e?.team?.id || "");
      let side = tid === homeId ? "H" : tid === awayId ? "A" : "";
      if (!side) continue;
      const own = /own goal/i.test(txt);
      const pen = /penalt/i.test(txt) && !/missed|saved/i.test(txt);
      const scorer = String(((e?.participants || [])[0])?.athlete?.displayName || "");
      goals.push({ m: c.m, s: c.s, side, own, pen, scorer });
    }
    goals.sort((a, b) => (a.m + a.s) - (b.m + b.s));

    const rows = goals.map((g, i) => ({
      zapas_id: zid, seq: i + 1, minute: g.m, stoppage: g.s,
      side: g.side, scorer: g.scorer, own_goal: g.own, penalty: g.pen,
    }));

    // Idempotentne: smaz stare radky zapasu, vloz nove.
    await sb.from("goal_minutes").delete().eq("zapas_id", zid);
    if (rows.length) {
      const { error: insErr } = await sb.from("goal_minutes").insert(rows);
      if (insErr) throw new Error("insert: " + insErr.message);
    }
    await sb.from("goal_minutes_sync").upsert({
      zapas_id: zid, event_id: event, goal_count: rows.length,
      home_final: Number.isFinite(homeFinal) ? homeFinal : null,
      away_final: Number.isFinite(awayFinal) ? awayFinal : null,
      synced_at: new Date().toISOString(),
    }, { onConflict: "zapas_id" });

    return json({ ok: true, zapas_id: zid, goal_count: rows.length, goals: rows });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
