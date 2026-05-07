// teams-refresh edge function (v5.1.0)
// Server-side proxy ESPN teams API, CORS-safe, admin auth required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ESPN_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams";

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

async function fetchTeams() {
  const res = await fetch(ESPN_TEAMS_URL, {
    headers: {
      "User-Agent": "TipovackaMS2026/5.1 (+admin-refresh)",
      "Accept": "application/json,*/*",
    },
  });
  if (!res.ok) throw new Error(`ESPN teams fetch failed: HTTP ${res.status}`);
  const json = await res.json() as {
    sports?: Array<{ leagues?: Array<{ teams?: Array<{ team?: Record<string, unknown> }> }> }>;
  };
  const wrappers = json?.sports?.[0]?.leagues?.[0]?.teams ?? [];
  return wrappers
    .map((w) => {
      const t = (w?.team || w) as Record<string, unknown> & {
        id?: string | number;
        displayName?: string;
        shortDisplayName?: string;
        name?: string;
        location?: string;
        color?: string;
        alternateColor?: string;
        abbreviation?: string;
        logo?: string;
        logos?: Array<{ href?: string }>;
        links?: unknown;
      };
      if (!t) return null;
      return {
        id: String(t.id || ""),
        name: t.displayName || t.shortDisplayName || t.name || "",
        shortName: t.shortDisplayName || t.abbreviation || t.name || "",
        logo: t.logos?.[0]?.href || t.logo || "",
        location: t.location || "",
        color: t.color || "",
        alternateColor: t.alternateColor || "",
        links: t.links || [],
      };
    })
    .filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse(200, { ok: true });
  if (req.method !== "POST") return jsonResponse(405, { ok: false, error: "Method not allowed" });

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(500, { ok: false, error: "Supabase env not configured" });
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
    const teams = await fetchTeams();

    const detail = {
      source: "espn_teams",
      imported_by: admin.jmeno || adminName,
      teams_count: teams.length,
      source_url: ESPN_TEAMS_URL,
    };
    const { error: syncError } = await sb
      .from("app_sync_statuses")
      .upsert({ key: "teams", last_updated_at: new Date().toISOString(), detail }, { onConflict: "key" });
    if (syncError) throw new Error(`Save sync status failed: ${syncError.message}`);

    return jsonResponse(200, {
      ok: true,
      teams,
      teams_count: teams.length,
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
