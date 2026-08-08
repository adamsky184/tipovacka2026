/* config/ms2026.js — tournament-specific konfigurace MS 2026.
 * Rebrand-ready groundwork (v6.2): tournament data vytažená z tipovacka.html.
 * NEEDITUJE tipovacka.html — ta zůstává zdrojem pravdy pro živý archiv; tohle je
 * strukturovaná kopie pro budoucí config-driven turnaje. Formát viz config/_schema.md.
 *
 * Hodnoty ověřeny proti tipovacka.html (SZ/PZ/TEAMS/scoring) + DB řádku `turnaje` (anon SELECT).
 * Bodování potvrzeno z tipovacka.html (ř. 2495/2573/2991): 10 přesný · 3 vítěz/remíza
 *   · +1 rozdíl · +3 postup (play-off remíza), extra vítěz 30 / král střelců 20, skóre po 90'.
 */
window.TOURNAMENT_CONFIG = {
  id: 'ms2026',
  name_cs: 'MS 2026', name_en: 'World Cup 2026',
  hosts_cs: ['USA', 'Kanada', 'Mexiko'], hosts_en: ['USA', 'Canada', 'Mexico'],
  start_date: '2026-06-11', end_date: '2026-07-19',
  team_count: 48, match_count: 104,
  extra_tip_lock_at: '2026-06-11T19:00:00Z',
  scoring: {
    exact: 10,             // přesný výsledek
    winner_or_draw: 3,     // správný vítěz nebo remíza
    goal_diff_bonus: 1,    // navíc za správný rozdíl skóre
    playoff_advance: 3,    // play-off: u remízy po 90' za správného postupujícího
    extra_winner: 30,      // extra tip: vítěz turnaje
    extra_scorer: 20,      // extra tip: král střelců
    score_at: '90min'      // hodnotí se výsledek po základní hrací době
  },
  champion: 'Španělsko',
  top_scorer: 'Kylian Mbappé', top_scorer_goals: 10,
  primary_color: '#3b82f6', gold: '#f59e0b',
  // odkazy na seed soubory (relativně k rootu)
  seed: {
    teams: 'assets/seed/ms2026/teams.json',
    matches: 'assets/seed/ms2026/matches.json',
    stadiums: 'assets/seed/ms2026/stadiums.json'
  },
  // statistiky finálního stavu (z DB `turnaje`, anon SELECT) — pro landing/archiv
  stats: { players: 13, matches: 104, tips_total: 2787 }
};
