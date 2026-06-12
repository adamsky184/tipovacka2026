// match-summary edge function (v5.8.0)
// Server-side proxy ESPN, CORS-safe. Pro kartu zapasu (detail).
// GET ?date=YYYYMMDD  -> kompaktni scoreboard (id, home, away, state) pro mapovani zapas -> ESPN event id
// GET ?event=ID       -> orezany match summary (skore, statistiky, goly/karty/stridani, sestavy, info)
// Cte jen verejna ESPN data, nic nezapisuje do DB.

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD";
const UA_HEADERS = {
  "User-Agent": "TipovackaMS2026/5.8 (+match-card)",
  "Accept": "application/json,*/*",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      // Edge cache: dohrany zapas se uz nemeni, live se meni porad -> kratke TTL staci
      "Cache-Control": "public, max-age=30",
    },
  });
}

// deno-lint-ignore no-explicit-any
function trimSummary(d: any) {
  const hc = ((d?.header?.competitions || [])[0]) || {};
  const st = hc?.status?.type || {};
  const competitors = (hc.competitors || []).map((c: any) => ({
    homeAway: c?.homeAway || "",
    score: c?.score ?? "",
    winner: !!c?.winner,
    team: c?.team?.displayName || "",
    abbr: c?.team?.abbreviation || "",
  }));
  const stats = ((d?.boxscore?.teams) || []).map((t: any) => ({
    team: t?.team?.displayName || "",
    items: (t?.statistics || []).map((s: any) => ({
      name: s?.name || "",
      label: s?.label || "",
      value: s?.displayValue ?? "",
    })),
  }));
  const keyEvents = ((d?.keyEvents) || [])
    .map((e: any) => ({
      type: e?.type?.text || "",
      clock: e?.clock?.displayValue || "",
      team: e?.team?.displayName || "",
      players: (e?.participants || [])
        .map((p: any) => p?.athlete?.displayName || "")
        .filter(Boolean),
      scoringPlay: !!e?.scoringPlay,
      ownGoal: /own goal/i.test(e?.type?.text || ""),
      penalty: /penalty/i.test(e?.type?.text || ""),
      shootout: !!e?.shootout,
    }))
    .filter((e: any) => e.scoringPlay || /card|substitution/i.test(e.type));
  const rosters = ((d?.rosters) || []).map((r: any) => ({
    homeAway: r?.homeAway || "",
    team: r?.team?.displayName || "",
    formation: r?.formation || "",
    starters: (r?.roster || [])
      .filter((p: any) => p?.starter)
      .map((p: any) => ({
        name: p?.athlete?.displayName || "",
        jersey: p?.jersey || "",
        pos: p?.position?.abbreviation || "",
      })),
  }));
  const gi = d?.gameInfo || {};
  const ref = ((gi?.officials || [])[0]) || {};
  return {
    status: {
      state: st?.state || "",
      completed: !!st?.completed,
      detail: st?.detail || "",
      shortDetail: st?.shortDetail || "",
    },
    competitors,
    stats,
    keyEvents,
    rosters,
    info: {
      venue: gi?.venue?.fullName || "",
      attendance: typeof gi?.attendance === "number" ? gi.attendance : null,
      referee: ref?.fullName || ref?.displayName || "",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse(200, { ok: true });
  if (req.method !== "GET") return jsonResponse(405, { ok: false, error: "Method not allowed" });

  try {
    const url = new URL(req.url);
    const date = (url.searchParams.get("date") || "").trim();
    const event = (url.searchParams.get("event") || "").trim();

    if (event) {
      if (!/^\d{1,12}$/.test(event)) return jsonResponse(400, { ok: false, error: "Bad event id" });
      const res = await fetch(`${ESPN_BASE}/summary?event=${event}`, { headers: UA_HEADERS });
      if (!res.ok) throw new Error(`ESPN summary fetch failed: HTTP ${res.status}`);
      const json = await res.json();
      return jsonResponse(200, { ok: true, summary: trimSummary(json) });
    }

    if (date) {
      if (!/^\d{8}$/.test(date)) return jsonResponse(400, { ok: false, error: "Bad date (YYYYMMDD)" });
      const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}`, { headers: UA_HEADERS });
      if (!res.ok) throw new Error(`ESPN scoreboard fetch failed: HTTP ${res.status}`);
      const json = await res.json();
      // deno-lint-ignore no-explicit-any
      const events = ((json as any)?.events || []).map((e: any) => {
        const c = ((e?.competitions) || [])[0] || {};
        let home = "", away = "";
        (c?.competitors || []).forEach((x: any) => {
          if (x?.homeAway === "home") home = x?.team?.displayName || "";
          if (x?.homeAway === "away") away = x?.team?.displayName || "";
        });
        return {
          id: String(e?.id || ""),
          home,
          away,
          state: c?.status?.type?.state || "",
          date: e?.date || "",
        };
      });
      return jsonResponse(200, { ok: true, events });
    }

    return jsonResponse(400, { ok: false, error: "Missing ?date= or ?event=" });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
