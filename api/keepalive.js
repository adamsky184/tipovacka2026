// Keepalive: denni ping na Supabase REST, aby free projekt nebyl uspan pro neaktivitu.
// Vola se z Vercel Cron (vercel.json) jednou denne. Cte 1 radek verejne tabulky turnaje.
// Anon klic je verejny (stejny je v tipovacka.html) - zadne tajemstvi.
const SBU = "https://xzlebpzepnhkedlxntgv.supabase.co";
const SBK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGVicHplcG5oa2VkbHhudGd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDg0OTQsImV4cCI6MjA5MDcyNDQ5NH0.YKEc3ToBLiOSJbCE_U6MFHHKr_IFfQnVoSBIqaIAgcA";

export default async function handler(req, res) {
  try {
    const r = await fetch(SBU + "/rest/v1/turnaje?select=id&limit=1", {
      headers: { apikey: SBK, Authorization: "Bearer " + SBK },
    });
    const body = await r.text();
    res.status(200).json({ ok: r.ok, status: r.status, sample: body.slice(0, 60), at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
}
