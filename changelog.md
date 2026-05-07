# Changelog

Formát `vMAJOR.MINOR.PATCH - D. M. RRRR`. Stejný formát jako footer.

## v5.1.0 - 7. 5. 2026

Cleanup release, žádná změna funkcionality.

- Cleanup složky: FuelLog soubory přesunuty pryč, staré verze do `archive/` (lokálně, gitignored)
- Stadium fotky → `assets/stadiums/`
- SQL migrace → `backend/sql/`
- Edge funkce → `backend/functions/`
- `spec.md` + `changelog.md` (nové)
- `.gitignore`
- Git init, první commit

## v5.0.2 - 20. 4. 2026

- Drobné UI a header polish
- Last UI iterace pred cleanupem

## v5.0.1 - 20. 4. 2026

- Bugfix sady po v5.0

## v5.0 - 20. 4. 2026

- Major redesign hlavičky (nový sticky header, integrovaný countdown pill)
- Tier filtry (skupinová / play-off + sort chips)
- Sticky scroll bar pro tabulku Tipy ostatních
- `admin_reset_tips_secure` RPC

## v4.9.x - 8. 4. - 20. 4. 2026

Iterace 4.9 (.1 až .6) - hodně malých fixů a UX úprav: rival hráči, badge logika, dual tip input, sniper/draw badges, similar player, today/tomorrow filtry, FAQ a install panel, theme switcher, mobile polish.

## v4.9 - 8. 4. 2026

- `get_visible_tips_secure` (RLS-safe), `get_tip_trends_secure`
- Tipy ostatních se odkrývají jen u zápasů, kde má hráč svůj tip
- `get_leaderboard_snapshot_secure` (server-side leaderboard)

## v4.8 - 8. 4. 2026

- `auth_hrac_secure_by_id`, `auth_hrac_secure_by_name` (lazy SHA-256 migrace z plain PINu)
- Bezpečnější admin RPC (PIN ověření před každou mutací)

## v4.7 - 8. 4. 2026

- `*_secure` RPC vlna: PIN se neposílá v plain do RPC bodies, posílá se hash
- `is_sha256_hex` validátor

## v4.3 - 7. 4. 2026

- Pravidla, FAQ
- Hype against community badge

## v4.2 - 7. 4. 2026

- Header polish
- Lang switcher (CS/EN)

## v4.0 - 6. 4. 2026

- Extra tipy (vítěz, král střelců) + lock_at + oficiální výsledky
- Diskuze threaded + emoji reakce
- `extra_tip_settings`, `discussion_posts`, `discussion_reactions` tabulky

## v3.4 - 6. 4. 2026

- Stadiony s fotkami + linky na mapy
- Historie MS s medailovým přehledem

## v3.0 - 6. 4. 2026

- Edge funkce `fifa-ranking-refresh` (FIFA inside.fifa.com FDCP API)
- `fifa_rankings_current`, `app_sync_statuses` tabulky
- Admin tlačítko FIFA RANKING

## v2.x - 6. 4. 2026

Iterace 2.8 - 2.9: Tipy ostatních, žebříček, tabulka skupin, play-off pavouk.

## v1.66 - 4. 4. 2026

První funkční verze - login, registrace, základní tipy, hardcoded zápasy.
