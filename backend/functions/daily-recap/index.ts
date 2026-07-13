// daily-recap edge function (v5.12.45)
// Denne v 05:00 UTC (07:00 CZ) sestavi souhrn vcerejska: vysledky, tiperi dne,
// aktualni poradi (top 3) a skokan/propad dne. Uklada do app_sync_statuses key 'daily_recap'.
// Zadny novy uzivatel, zadny zasah do tipu. Auth: X-Cron-Secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}
function basePts(tip: string, res: string): number {
  const t = tip.split(":").map(Number), r = res.split(":").map(Number);
  if (t.some(isNaN) || r.some(isNaN)) return 0;
  if (t[0] === r[0] && t[1] === r[1]) return 10;
  if (Math.sign(t[0] - t[1]) === Math.sign(r[0] - r[1])) return (t[0] - t[1]) === (r[0] - r[1]) ? 4 : 3;
  return 0;
}

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    if ((req.headers.get("X-Cron-Secret") || "") !== CRON_SECRET) return json({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "env" }, 500);
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const since = new Date(Date.now() - 26 * 3600e3).toISOString();
    const nowIso = new Date().toISOString();

    const { data: metaAll } = await sb.from("zapasy_meta").select("zapas_id,kickoff");
    const yZids = new Set((metaAll || []).filter((m) => m.kickoff >= since && m.kickoff <= nowIso).map((m) => m.zapas_id));

    const { data: vysAll } = await sb.from("vysledky").select("zapas_id,skore,postupujici");
    const playedAll = (vysAll || []).filter((v) => /^\d+:\d+$/.test(String(v.skore)));
    const resBy: Record<number, { skore: string; postupujici: string | null }> = {};
    playedAll.forEach((v) => { resBy[v.zapas_id] = { skore: v.skore, postupujici: v.postupujici }; });
    const yPlayed = playedAll.filter((v) => yZids.has(v.zapas_id));

    // prodlouzeni vs penalty u vcerejsich remiz (dle golu minute>90)
    const yIds = yPlayed.map((v) => v.zapas_id);
    const etBy: Record<number, boolean> = {};
    if (yIds.length) {
      const { data: gm } = await sb.from("goal_minutes").select("zapas_id,minute").in("zapas_id", yIds).gt("minute", 90);
      (gm || []).forEach((g) => { etBy[g.zapas_id] = true; });
    }
    const lines = yPlayed.map((v) => ({
      zid: v.zapas_id, skore: v.skore, postupujici: v.postupujici || null,
      et: v.postupujici ? !!etBy[v.zapas_id] : null,
    }));

    // body vsech hracu: celkem + bez vcerejska (pro poradi a skokany) + vcerejsi (tiperi dne)
    // tipy maji >1000 radku -> strankovani (PostgREST limit)
    // deno-lint-ignore no-explicit-any
    const tipy: any[] = [];
    for (let off = 0; ; off += 1000) {
      const { data: page } = await sb.from("tipy").select("hrac_id,zapas_id,tip,postup").order("hrac_id", { ascending: true }).order("zapas_id", { ascending: true }).range(off, off + 999);
      tipy.push(...(page || []));
      if (!page || page.length < 1000) break;
    }
    const { data: hraci } = await sb.from("hrace").select("id,jmeno");
    const nameBy: Record<string, string> = {}; (hraci || []).forEach((h) => { nameBy[h.id] = h.jmeno; });
    const tot: Record<string, number> = {}, before: Record<string, number> = {};
    const day: Record<string, { p: number; exact: number }> = {};
    Object.keys(nameBy).forEach((id) => { tot[id] = 0; before[id] = 0; });
    (tipy || []).forEach((t) => {
      if (!/^\d+:\d+$/.test(String(t.tip))) return;
      const r = resBy[t.zapas_id]; if (!r) return;
      let p = basePts(t.tip, r.skore);
      const sp = String(t.tip).split(":");
      if (t.zapas_id >= 73 && r.postupujici && sp[0] === sp[1] && t.postup === r.postupujici) p += 3;
      if (!(t.hrac_id in tot)) { tot[t.hrac_id] = 0; before[t.hrac_id] = 0; }
      tot[t.hrac_id] += p;
      if (yZids.has(t.zapas_id)) {
        const d = day[t.hrac_id] = day[t.hrac_id] || { p: 0, exact: 0 };
        d.p += p; if (basePts(t.tip, r.skore) === 10) d.exact++;
      } else {
        before[t.hrac_id] += p;
      }
    });
    function ranks(map: Record<string, number>) {
      const ids = Object.keys(map).sort((a, b) => map[b] - map[a] || (nameBy[a] || "").localeCompare(nameBy[b] || ""));
      const r: Record<string, number> = {}; ids.forEach((id, i) => { r[id] = i + 1; });
      return r;
    }
    const rNow = ranks(tot), rBefore = ranks(before);
    const standings = Object.keys(tot).sort((a, b) => rNow[a] - rNow[b]).slice(0, 3)
      .map((id) => ({ jmeno: nameBy[id] || "?", total: tot[id] }));
    let up: { jmeno: string; from: number; to: number } | null = null;
    let down: { jmeno: string; from: number; to: number } | null = null;
    Object.keys(tot).forEach((id) => {
      const d = rBefore[id] - rNow[id]; // + = posun nahoru
      if (d > 0 && (!up || d > (up.from - up.to))) up = { jmeno: nameBy[id] || "?", from: rBefore[id], to: rNow[id] };
      if (d < 0 && (!down || d < (down.from - down.to))) down = { jmeno: nameBy[id] || "?", from: rBefore[id], to: rNow[id] };
    });
    const top = Object.keys(day).map((id) => ({ jmeno: nameBy[id] || "?", p: day[id].p, exact: day[id].exact }))
      .sort((a, b) => b.p - a.p || b.exact - a.exact).slice(0, 3).filter((x) => x.p > 0);

    const detail = { date: new Date().toISOString().slice(0, 10), lines, top, standings, up, down };
    await sb.from("app_sync_statuses").upsert({ key: "daily_recap", last_updated_at: new Date().toISOString(), detail }, { onConflict: "key" });
    return json({ ok: true, matches: lines.length, top, standings, up, down });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
