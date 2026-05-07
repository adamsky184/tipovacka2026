# Tipovačka MS 2026 - spec

## Účel

Webová PWA pro tipování zápasů fotbalového MS 2026 (USA, Kanada, Mexiko, 11. 6. - 19. 7. 2026). Uzavřená skupina cca 5-10 přátel, žádná veřejná registrace.

Designována jako **rebrandovatelná šablona** pro budoucí turnaje (Euro 2028, MS 2030, ...). Tournament-specific data (název, datum, hostitelé, týmy, zápasy) jsou centralizované v configu.

## Cíloví uživatelé

- Adam (admin) + cca 5-10 kamarádů
- CZ primárně, EN sekundárně (full i18n)
- Použití na mobilu i desktopu (PWA-installable)

## Stack

- **Frontend:** vanilla JS, single-file HTML PWA (žádný framework, žádný build step)
- **Backend:** Supabase (Postgres 17 + Edge Functions Deno + RLS)
- **Hosting:** GitHub Pages (https://adamsky184.github.io/tipovacka2026/tipovacka.html)
- **Externí data:** ESPN API (výsledky, týmy), FIFA inside.fifa.com (ranking), volitelně The Odds API (kurzy, free tier)
- **Auth:** vlastní jméno+PIN, hash v DB, RPC funkce s `security definer`

## Datový model (Supabase projekt `xzlebpzepnhkedlxntgv`)

| Tabulka | Účel | Klíč |
|---|---|---|
| `hrace` | hráči, PIN hash, admin flag | `id` UUID |
| `tipy` | zápasové tipy (tip = "X:Y") | `id` UUID, FK `hrac_id`, `zapas_id` |
| `vysledky` | finální skóre zápasů | `zapas_id` |
| `extra_tips` | tipy na vítěze turnaje a krále střelců | `hrac_id` |
| `extra_tip_settings` | lock_at, oficiální výsledky extra | id=1 (singleton) |
| `discussion_posts` | diskuze (threaded přes `parent_id`) | `id` bigint |
| `discussion_reactions` | emoji reakce na posty | `(post_id, hrac_id, emoji)` |
| `fifa_rankings_current` | aktuální FIFA ranking 48 týmů | `team_name` |
| `app_sync_statuses` | last_updated_at + detail per integration | `key` text |

**Pozn:** zápasy (matches) jsou hardcoded v `tipovacka.html` jako pole `SZ` (skupiny) a `PZ` (play-off). V budoucí rebrand verzi budou v configu nebo separate JSON.

## Sdílení projektu Supabase s GIGS appkou

Projekt `xzlebpzepnhkedlxntgv` obsahuje i 10 tabulek `gigs_*` patřících **GIGS appce** (samostatný projekt Adama). Tipovačka migrace **nesmí** sahat na žádné `gigs_*` ani jejich funkce.

## Hlavní funkce

- Login + registrace (jméno + PIN, hash SHA-256 + per-user salt; plán upgrade na bcrypt v F3)
- Tipy na zápasy (10 b za přesný výsledek, 3 b za vítěze/remízu, +1 za rozdíl skóre)
- Extra tipy: vítěz turnaje (30 b) + král střelců (20 b), lock 11. 6. 2026 19:00 UTC
- Žebříček (celkový / skupinová fáze / play-off), počítaný v DB přes `get_leaderboard_snapshot_secure`
- Tipy ostatních (viditelné jen u zápasů, kde má hráč svůj tip uložen)
- Refresh ESPN výsledků (admin tlačítko, dnes přímý fetch z browseru → migrace na edge func v F4)
- Refresh ESPN týmových profilů (cache do localStorage → migrace na edge func v F4)
- Refresh FIFA ranking (edge func `fifa-ranking-refresh`, funguje)
- Diskuze threaded + emoji reakce
- Admin: reset tipů hráče, smazat hráče, nastavit oficiální extra výsledky
- CSV export (admin: vše, hráč: vlastní)
- PWA install (iOS/Android), offline-first service worker
- CS / EN přepínač
- Light / Dark theme
- Stadiony s fotkami + odkazy
- Historie MS

## Bezpečnost (aktuální stav před F3)

- ✓ PIN hashed (SHA-256 + per-user salt `'ms2026salt' + jmeno`)
- ✓ RLS enabled na všech tipovacka tabulkách
- ✓ Všechny mutace přes RPC funkce s `security definer` + PIN ověření
- ✗ SHA-256 je rychlý → brute-force friendly (4-mistný PIN = 10000 možností)
- ✗ Žádný rate limiting na auth RPC
- ✗ Žádný account lockout
- ✗ Anon role má grant `select, insert, update, delete` na public tabulkách (mitigace: RLS)

**Plán F3:** přechod na bcrypt + rate limit + audit RLS pravidel.

## Hosting setup

- Repo: github.com/adamsky184/tipovacka2026
- **Primární URL**: https://tipovacka.chabrycity.cz/tipovacka.html (Vercel + custom doména přes CNAME)
- Vercel projekt: `tipovacka2026` (alias `tipovacka184.vercel.app`, custom `tipovacka.chabrycity.cz`)
- Doména `chabrycity.cz`: registrovaná u Wedos, autoritativní DNS Shoptet (CNAME `tipovacka` → `cname.vercel-dns.com`)
- Legacy URL (zachovaná pro existující PWA installs): https://adamsky184.github.io/tipovacka2026/tipovacka.html
- Service worker scope: `./` (relative, funguje na všech URL)

## Známá rizika / TODO

- [F3] PIN brute-force (rychlý SHA-256, žádný rate limit)
- [F4] VÝSLEDKY refresh = client-side ESPN fetch → CORS risk během turnaje
- [F4] TÝMY refresh = client-side ESPN fetch → CORS risk
- [F5] SW cache name nemá verzi → po deployu nevidí hráči nové změny bez hard refresh
- [F5] Diskuze nemá délkový limit (DoS risk)
- [F6] Kurzy zatím nejsou napojené (plán: The Odds API free, 1×/den)
- [F7] Tournament-specific data hardcoded v `tipovacka.html` → rebrand vyžaduje JS edit (plán: `config.js`)
- Podpora chyb: bez logů → přidat Sentry/Plausible/PostHog hook (free tier)
- Deduplikace verze v footeru: dnes hardcoded 4× v souboru → konstanta (plán F2)

## Verze

Aktuální: **v5.0.2** (20. 4. 2026), po cleanupu = **v5.1.0**.

Verzování: `vMAJOR.MINOR.PATCH`. Patch = bug fix, minor = feature, major = redesign / breaking change. Source of truth = JS konstanta `APP_VERSION` + `APP_VERSION_DATE` na začátku script bloku v `tipovacka.html`. Footer čte z nich.
