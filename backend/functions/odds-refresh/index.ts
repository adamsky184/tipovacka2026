// odds-refresh edge function (v5.1.0, draft - vyzaduje API key od The Odds API)
// Refresh kurzu na zapasy MS 2026 z The Odds API (free 500 calls/mesic).
// Cron strategie: 1x denne (cca 30 calls/mesic, hluboko pod limitem).
//
// Setup:
// 1) Zaregistrovat se na https://the-odds-api.com (free tier)
// 2) V Supabase Dashboard > Project Settings > Edge Functions > Secrets pridat:
//    THE_ODDS_API_KEY=<key>
// 3) Volani: POST /functions/v1/odds-refresh s body { admin_name, pin }
//
// Frontend volani: zatim neni napojeno, doplnit v dalsi verzi.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ODDS_API_KEY = Deno.env.get("THE_ODDS_API_KEY") ?? "";
const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const SPORT_KEY = "soccer_fifa_world_cup";  // potvrdit po startu turnaje

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

async function verifyAdmin(
  sb: ReturnType<typeof createClient>,
  adminName: string,
  pin: string,
  pinPlain: string,
) {
  const payload = /^[0-9a-f]{64}$/i.test(pin)
    ? { p_jmeno: adminName, p_pin_hash: pin, p_pin_plain: pinPlain || null }
    : { p_jmeno: adminName, p_pin_hash: null, p_pin_plain: pin };

  const { data, error } = await sb.rpc("prihlasit_hrace_secure", payload);
  if (error) throw new Error(`Admin auth failed: ${error.message}`);

  const admin = Array.isArray(data) ? data[0] : data;
  if (!admin || admin.chyba) {
    throw new Error(typeof admin?.chyba === "string" ? admin.chyba : "Admin auth failed");
  }
  if (!admin?.je_admin) throw new Error("Admin privileges required");
  return admin;
}

type OddsApiEvent = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    key: string;
    title: string;
    markets: Array<{
      key: string;
      outcomes: Array<{ name: string; price: number }>;
    }>;
  }>;
};

async function fetchOdds(): Promise<OddsApiEvent[]> {
  const url = `${ODDS_API_BASE}/sports/${SPORT_KEY}/odds?regions=eu&markets=h2h&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`;
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) throw new Error(`Odds API failed: HTTP ${res.status}`);
  return await res.json() as OddsApiEvent[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse(200, { ok: true });
  if (req.method !== "POST") return jsonResponse(405, { ok: false, error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { ok: false, error: "Supabase env not configured" });
  }
  if (!ODDS_API_KEY) {
    return jsonResponse(500, { ok: false, error: "THE_ODDS_API_KEY env not set" });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const adminName = String(body?.admin_name || "").trim();
    const pin = String(body?.pin || "").trim();
    const pinPlain = String(body?.pin_plain || "").trim();

    if (!adminName || (!pin && !pinPlain)) {
      return jsonResponse(400, { ok: false, error: "Missing admin credentials" });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const admin = await verifyAdmin(sb, adminName, pin || pinPlain, pinPlain);
    const events = await fetchOdds();

    // Vrátit raw events na frontend, ten je má namapovat na zapas_id
    // (frontend vlastní team mapping). Frontend pak posle do admin_upsert_match_odds_secure.

    // Update sync status
    const detail = {
      source: "the_odds_api",
      imported_by: admin.jmeno || adminName,
      events_count: events.length,
      sport_key: SPORT_KEY,
    };
    const { error: syncError } = await sb
      .from("app_sync_statuses")
      .upsert({ key: "odds", last_updated_at: new Date().toISOString(), detail }, { onConflict: "key" });
    if (syncError) throw new Error(`Save sync status failed: ${syncError.message}`);

    return jsonResponse(200, {
      ok: true,
      events,
      events_count: events.length,
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
