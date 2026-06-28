// yt-highlights: dohleda YouTube highlight video pro zapas a nacachuje ho do match_media.
// API klic je ulozeny v privatni tabulce app_secrets (cte jen service_role), nikdy v gitu ani frontendu.
// Volani z appky: GET ?zapas_id=..&home=..&away=..&year=..  (anon JWT staci)
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
}

// Preferuj oficialni/serizne kanaly pred spamem
const OFFICIAL = ["fifa", "fox soccer", "telemundo", "espn", "bbc sport", "itv"];
function rank(it: any, home: string, away: string): number {
  const ch = String(it?.snippet?.channelTitle || "").toLowerCase();
  const t = String(it?.snippet?.title || "").toLowerCase();
  let s = 0;
  if (ch.includes("fifa")) s += 100;
  else if (OFFICIAL.some((o) => ch.includes(o))) s += 60;
  if (t.includes("highlight")) s += 15;
  if (home && t.includes(home.toLowerCase())) s += 4;
  if (away && t.includes(away.toLowerCase())) s += 4;
  // potlac zjevny spam/AI kanaly
  if (/horor|cctv|evolution|edits?|shorts/.test(ch + " " + t)) s -= 40;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const zid = url.searchParams.get("zapas_id");
    const home = url.searchParams.get("home") || "";
    const away = url.searchParams.get("away") || "";
    const year = url.searchParams.get("year") || "2026";
    if (!zid || !/^\d+$/.test(zid)) return json({ ok: false, error: "zapas_id required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) cache
    const { data: cached } = await sb.from("match_media")
      .select("yt_video_id,yt_checked_at").eq("zapas_id", Number(zid)).maybeSingle();
    if (cached && cached.yt_video_id) {
      return json({ ok: true, video_id: cached.yt_video_id, cached: true });
    }
    // nedavno hledano a nic -> nehamruj YT (6h)
    if (cached && cached.yt_checked_at) {
      const age = Date.now() - new Date(cached.yt_checked_at).getTime();
      if (age < 6 * 3600 * 1000) return json({ ok: true, video_id: null, cached: true });
    }

    // 2) klic
    const { data: keyRow } = await sb.from("app_secrets").select("val").eq("key", "yt_api_key").maybeSingle();
    const key = keyRow?.val;
    if (!key) return json({ ok: false, error: "no api key configured" }, 500);

    // 3) YouTube search
    const q = `${home} vs ${away} highlights ${year}`;
    const yurl = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10" +
      "&videoEmbeddable=true&relevanceLanguage=en&q=" + encodeURIComponent(q) + "&key=" + key;
    const yr = await fetch(yurl);
    if (!yr.ok) {
      const body = await yr.text();
      return json({ ok: false, error: "yt http " + yr.status, detail: body.slice(0, 200) }, 502);
    }
    const yj = await yr.json();
    const items: any[] = Array.isArray(yj.items) ? yj.items : [];
    items.sort((a, b) => rank(b, home, away) - rank(a, home, away));
    const best = items[0];
    const vid = best?.id?.videoId || null;
    const ch = best?.snippet?.channelTitle || null;

    // 4) upsert cache
    await sb.from("match_media").upsert({
      zapas_id: Number(zid),
      yt_video_id: vid,
      yt_channel: ch,
      yt_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return json({ ok: true, video_id: vid, channel: ch });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
