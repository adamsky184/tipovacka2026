import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FIFA_RANKING_PAGE_URL = "https://inside.fifa.com/fifa-world-ranking/men?lang=en";
const FIFA_API_BASE = "https://api.fifa.com/api/v3";

const TEAM_CODE_TO_APP_NAME: Record<string, string> = {
  MEX: "Mexiko",
  RSA: "Jihoafricka rep.",
  KOR: "Jizni Korea",
  CZE: "Cesko",
  CAN: "Kanada",
  QAT: "Katar",
  SUI: "Svycarsko",
  BIH: "Bosna a Hercegovina",
  BRA: "Brazilie",
  MAR: "Maroko",
  HAI: "Haiti",
  SCO: "Skotsko",
  USA: "USA",
  PAR: "Paraguay",
  AUS: "Australie",
  TUR: "Turecko",
  GER: "Nemecko",
  CUW: "Curacao",
  CIV: "Pobrezi slonoviny",
  ECU: "Ekvador",
  NED: "Nizozemsko",
  JPN: "Japonsko",
  SWE: "Svedsko",
  TUN: "Tunisko",
  BEL: "Belgie",
  EGY: "Egypt",
  IRN: "Iran",
  NZL: "Novy Zeland",
  ESP: "Spanelsko",
  CPV: "Kapverdy",
  KSA: "Saudska Arabie",
  URU: "Uruguay",
  FRA: "Francie",
  SEN: "Senegal",
  IRQ: "Irak",
  NOR: "Norsko",
  ARG: "Argentina",
  ALG: "Alzirsko",
  AUT: "Rakousko",
  JOR: "Jordansko",
  POR: "Portugalsko",
  COD: "DR Kongo",
  UZB: "Uzbekistan",
  COL: "Kolumbie",
  ENG: "Anglie",
  CRO: "Chorvatsko",
  GHA: "Ghana",
  PAN: "Panama",
};

type PageMeta = {
  latestScheduleId: string;
  latestOfficialDate: string;
  lastUpdateDate: string;
};

type FifaResult = {
  IdCountry?: string;
  TeamName?: Array<{ Locale?: string; Description?: string }>;
  ConfederationName?: string;
  Rank?: number;
  PrevRank?: number;
  RankingMovement?: number;
  TotalPoints?: number;
  PrevPoints?: number;
};

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

function normalizeTrend(change: number | null | undefined) {
  if (!change) return "flat";
  return change > 0 ? "up" : "down";
}

function pickTeamName(teamName?: Array<{ Locale?: string; Description?: string }>) {
  if (!Array.isArray(teamName) || !teamName.length) return "";
  const english = teamName.find((item) => (item.Locale || "").toLowerCase().startsWith("en"));
  return english?.Description || teamName[0]?.Description || "";
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "TipovackaMS2026/3.0 (+admin-refresh)",
      "Accept": "application/json,text/html,*/*",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }
  return await res.json() as T;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "TipovackaMS2026/3.0 (+admin-refresh)",
      "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} for ${url}`);
  }
  return await res.text();
}

function extractPageMeta(html: string): PageMeta {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!nextDataMatch) throw new Error("FIFA page metadata not found");

  const nextData = JSON.parse(nextDataMatch[1]);
  const ranking = nextData?.props?.pageProps?.pageData?.ranking;
  const availableDates = Array.isArray(ranking?.allAvailableDates) ? ranking.allAvailableDates : [];
  const latest = availableDates[0];
  const latestScheduleId = latest?.id || "";
  const latestOfficialDate = latest?.date || "";
  const lastUpdateDate = ranking?.lastUpdateDate || "";

  if (!latestScheduleId) throw new Error("Latest FIFA schedule id not found");

  return { latestScheduleId, latestOfficialDate, lastUpdateDate };
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

async function loadOfficialRanking() {
  const html = await fetchText(FIFA_RANKING_PAGE_URL);
  const meta = extractPageMeta(html);

  const rankingUrl =
    `${FIFA_API_BASE}/fifarankings/rankings/rankingsbyschedule` +
    `?rankingScheduleId=${encodeURIComponent(meta.latestScheduleId)}` +
    `&count=250&language=en-GB`;

  const rankingData = await fetchJson<{ Results?: FifaResult[] }>(rankingUrl);
  const results = Array.isArray(rankingData?.Results) ? rankingData.Results : [];
  if (!results.length) throw new Error("FIFA ranking results are empty");

  const rows = results
    .map((item) => {
      const code = item.IdCountry || "";
      const appName = TEAM_CODE_TO_APP_NAME[code];
      if (!appName) return null;

      const rank = Number(item.Rank);
      const prevRank = Number(item.PrevRank);
      const totalPoints = Number(item.TotalPoints);
      const movement = Number(item.RankingMovement);

      return {
        team_name: appName,
        rank: Number.isFinite(rank) ? rank : null,
        points: Number.isFinite(totalPoints) ? Number(totalPoints.toFixed(2)) : null,
        change: Number.isFinite(movement)
          ? movement
          : Number.isFinite(prevRank) && Number.isFinite(rank)
          ? prevRank - rank
          : 0,
        confederation: item.ConfederationName || null,
        trend: normalizeTrend(
          Number.isFinite(movement)
            ? movement
            : Number.isFinite(prevRank) && Number.isFinite(rank)
            ? prevRank - rank
            : 0,
        ),
        official_release_at: meta.lastUpdateDate || meta.latestOfficialDate || null,
        source_url: FIFA_RANKING_PAGE_URL,
        source_meta: {
          fifa_country_code: code,
          fifa_team_name: pickTeamName(item.TeamName),
          ranking_schedule_id: meta.latestScheduleId,
          previous_rank: Number.isFinite(prevRank) ? prevRank : null,
          previous_points: Number.isFinite(Number(item.PrevPoints))
            ? Number(Number(item.PrevPoints).toFixed(2))
            : null,
          official_date: meta.latestOfficialDate || null,
        },
      };
    })
    .filter((row) => row && row.rank != null);

  if (!rows.length) {
    throw new Error("No FIFA rows matched app teams");
  }

  return {
    rows,
    meta,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse(200, { ok: true });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

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
    const { rows, meta } = await loadOfficialRanking();

    const groupMap = new Map<string, string>();
    for (const [groupCode, teams] of Object.entries({
      A: ["Mexiko", "Jihoafricka rep.", "Jizni Korea", "Cesko"],
      B: ["Kanada", "Katar", "Svycarsko", "Bosna a Hercegovina"],
      C: ["Brazilie", "Maroko", "Haiti", "Skotsko"],
      D: ["USA", "Paraguay", "Australie", "Turecko"],
      E: ["Nemecko", "Curacao", "Pobrezi slonoviny", "Ekvador"],
      F: ["Nizozemsko", "Japonsko", "Svedsko", "Tunisko"],
      G: ["Belgie", "Egypt", "Iran", "Novy Zeland"],
      H: ["Spanelsko", "Kapverdy", "Saudska Arabie", "Uruguay"],
      I: ["Francie", "Senegal", "Irak", "Norsko"],
      J: ["Argentina", "Alzirsko", "Rakousko", "Jordansko"],
      K: ["Portugalsko", "DR Kongo", "Uzbekistan", "Kolumbie"],
      L: ["Anglie", "Chorvatsko", "Ghana", "Panama"],
    } as Record<string, string[]>)) {
      for (const team of teams) groupMap.set(team, groupCode);
    }

    const finalRows = rows.map((row) => ({
      ...row,
      group_code: groupMap.get(row.team_name) || null,
      imported_at: new Date().toISOString(),
    }));

    const { error: deleteError } = await sb
      .from("fifa_rankings_current")
      .delete()
      .neq("team_name", "");
    if (deleteError) throw new Error(`Delete old FIFA rows failed: ${deleteError.message}`);

    const { error: upsertError } = await sb
      .from("fifa_rankings_current")
      .upsert(finalRows, { onConflict: "team_name" });
    if (upsertError) throw new Error(`Save FIFA rows failed: ${upsertError.message}`);

    const syncPayload = {
      last_updated_at: new Date().toISOString(),
      detail: {
        source: "fifa_fdcp_api",
        imported_by: admin.jmeno || adminName,
        official_release_at: meta.lastUpdateDate || meta.latestOfficialDate || null,
        ranking_schedule_id: meta.latestScheduleId,
        row_count: finalRows.length,
        source_url: FIFA_RANKING_PAGE_URL,
      },
    };

    const { error: syncError } = await sb
      .from("app_sync_statuses")
      .upsert({ key: "fifa_ranking", ...syncPayload }, { onConflict: "key" });
    if (syncError) throw new Error(`Save FIFA sync status failed: ${syncError.message}`);

    return jsonResponse(200, {
      ok: true,
      imported: finalRows.length,
      official_release_at: meta.lastUpdateDate || meta.latestOfficialDate || null,
      ranking_schedule_id: meta.latestScheduleId,
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
