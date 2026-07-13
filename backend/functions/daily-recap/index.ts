// daily-recap edge function (v5.12.44)
// Jednou denne (rano) sestavi recap vcerejsiho dne: vysledky + nejlepsi tiperi dne.
// Uklada do app_sync_statuses (key 'daily_recap') - zadny novy uzivatel, zadny zasah do tipu.
// Auth: X-Cron-Secret.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}
function pts(tip: string, res: string): number {
  const t = tip.split(":").map(Number), r = res.split(":").map(Number);
  if (t.some(isNaN) || r.some(isNaN)) return 0;
  if (t[0] === r[0] && t[1] === r[1]) return 10;
  if (Math.sign(t[0] - t[1]) === Math.sign(r[0] - r[1])) {
    return (t[0] - t[1]) === (r[0] - r[1]) ? 4 : 3;
  }
  return 0;
}

Deno.serve(async (req) => {
  if (CRON_SECRET) {
    if ((req.headers.get("X-Cron-Secret") || "") !== CRON_SECRET) return json({ ok: false, error: "Unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, error: "env" }, 500);
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    // "vcerejsek" = poslednich 26 hodin (nocni zapasy CZ casu)
    const since = new Date(Date.now() - 26 * 3600e3).toISOString();
    const { data: meta } = await sb.from("zapasy_meta").select("zapas_id,home_team,away_team,kickoff").gte("kickoff", since).lte("kickoff", new Date().toISOString());
    const zids = (meta || []).map((m) => m.zapas_id);
    if (!zids.length) {
      await sb.from("app_sync_statuses").upsert({ key: "daily_recap", last_updated_at: new Date().toISOString(), detail: { date: new Date().toISOString().slice(0, 10), lines: [], top: [] } }, { onConflict: "key" });
      return json({ ok: true, matches: 0 });
    }
    const { data: vys } = await sb.from("vysledky").select("zapas_id,skore,postupujici").in("zapas_id", zids);
    const played = (vys || []).filter((v) => /^\d+:\d+$/.test(String(v.skore)));
    // deno-lint-ignore no-explicit-any
    const metaBy: Record<number, any> = {}; (meta || []).forEach((m) => { metaBy[m.zapas_id] = m; });
    const lines = played.map((v) => {
      const m = metaBy[v.zapas_id];
      return { zid: v.zapas_id, txt: `${m?.home_team || "?"} ${v.skore} ${m?.away_team || "?"}${v.postupujici ? (v.postupujici === "H" ? " (postup domácí)" : " (postup hosté)") : ""}` };
    });
    // nejlepsi tiperi dne
    const playedIds = played.map((v) => v.zapas_id);
    // deno-lint-ignore no-explicit-any
    let top: any[] = [];
    if (playedIds.length) {
      const { data: tipy } = await sb.from("tipy").select("hrac_id,zapas_id,tip,postup").in("zapas_id", playedIds);
      const { data: hraci } = await sb.from("hrace").select("id,jmeno");
      const nameBy: Record<string, string> = {}; (hraci || []).forEach((h) => { nameBy[h.id] = h.jmeno; });
      const resBy: Record<number, { skore: string; postupujici: string | null }> = {};
      played.forEach((v) => { resBy[v.zapas_id] = { skore: v.skore, postupujici: v.postupujici }; });
      const acc: Record<string, { p: number; exact: number }> = {};
      (tipy || []).forEach((t) => {
        if (!/^\d+:\d+$/.test(String(t.tip))) return;
        const r = resBy[t.zapas_id]; if (!r) return;
        let p = pts(t.tip, r.skore);
        const sp = String(t.tip).split(":");
        if (t.zapas_id >= 73 && r.postupujici && sp[0] === sp[1] && t.postup === r.postupujici) p += 3;
        const a = acc[t.hrac_id] = acc[t.hrac_id] || { p: 0, exact: 0 };
        a.p += p; if (pts(t.tip, r.skore) === 10) a.exact++;
      });
      top = Object.keys(acc).map((id) => ({ jmeno: nameBy[id] || "?", p: acc[id].p, exact: acc[id].exact }))
        .sort((a, b) => b.p - a.p || b.exact - a.exact).slice(0, 3).filter((x) => x.p > 0);
    }
    const detail = { date: new Date().toISOString().slice(0, 10), lines, top };
    await sb.from("app_sync_statuses").upsert({ key: "daily_recap", last_updated_at: new Date().toISOString(), detail }, { onConflict: "key" });
    return json({ ok: true, matches: lines.length, top });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
