# Tipovačka MS 2026 - Handoff (v5.10.5, 17. 6. 2026)

> **Claude (Code): pokud Adam napíše "pokračuj v tipovačce", přečti tento soubor + `spec.md` + posledních 5 záznamů z `changelog.md` a navaž.**

---

## TL;DR aktuální stav

- **Verze:** `v5.10.5` (`tipovacka.html` konstanta `APP_VERSION`)
- **Datum:** 12. 6. 2026
- **Turnaj LIVE** - MS startuje 11. 6. 2026, právě hraje skupinová fáze
- **Live URL:** https://tipovacka.chabrycity.cz/tipovacka.html
- **Stav:** plně funkční. Žádný známý kritický bug. Hráči se přihlašují, ukládají tipy, vidí tipy ostatních. Admin refresh výsledků funguje (denní cron + manuální tlačítko).

---

## ZÁVAZNÁ BEZPEČNOSTNÍ PRAVIDLA (čti memory: `safety_rules.md`)

1. **NIKDY nesahat na účty/PINy/hesla bez explicitního Adamova ANO** - jednou změněný hash nelze vrátit
2. **NIKDY UPDATE/INSERT/DELETE na DB s user daty bez souhlasu** - jen SELECT pro debug
3. **Vše musí být reverzibilní** - plán B před každou změnou
4. **Migrace OK pouze pro:** nové sloupce, nové RPC, nové RLS politiky, schema fixy
5. **NIKDY** mass update, drop, mazání řádků, přepis hesel
6. Edge functions, frontend, SW deploy - OK bez souhlasu (git-versioned, reverzibilní)

**Když Adam píše "oprav to" v ohni, neznamená to "dělej co chceš s daty"** - znamená oprav bug aniž bys porušil pravidla.

---

## Adresářová struktura

```
TIPOVACKA2026/
├── tipovacka.html          # entry point (jediný frontend soubor, single-file PWA)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (offline-first, verzovaný cache)
├── changelog.md            # historie verzí (vMAJOR.MINOR.PATCH)
├── spec.md                 # produktový + technický spec
├── README.md
├── HANDOFF.md              # TENTO soubor
├── .gitignore              # ignoruje archive/ (staré verze drženy lokálně)
├── assets/stadiums/        # fotky stadionů
├── backend/sql/            # SQL migrace (chronologicky 02-10)
│   ├── 02_extra_tips_discussion.sql
│   ├── 04_fifa_ranking.sql
│   ├── 05-08_security_v4_*.sql
│   ├── 09_rls_fix.sql
│   └── 10_security_v5_1.sql
├── backend/functions/      # Supabase Edge Functions (Deno)
│   ├── fifa-ranking-refresh/
│   ├── results-refresh/
│   ├── teams-refresh/
│   ├── team-detail-refresh/
│   ├── odds-refresh/
│   └── cron-results/
└── docs/deploy.md          # deploy notes
```

**Důležité:** `tipovacka.html` je single-file (~8000 řádků) - HTML + CSS + JS v jednom. Edit přímo, žádný build step.

---

## Tech stack a hosting

| Vrstva | Technologie | Notes |
|---|---|---|
| Frontend | vanilla JS, single-file HTML | žádný framework, žádný build |
| Backend | Supabase (Postgres 17 + Edge Functions Deno + RLS) | projekt `xzlebpzepnhkedlxntgv`, eu-west-1, free tier |
| Hosting | Vercel + GitHub Pages (legacy) | primární https://tipovacka.chabrycity.cz/tipovacka.html |
| Externí data | ESPN scoreboard, FIFA inside.fifa.com, The Odds API | bez API klíčů u ESPN/FIFA, klíč pro Odds v Supabase secrets |
| Auth | jméno + PIN, bcrypt v DB, RPC `auth_hrac_secure_by_*` s aliasy + lazy migrace | viz historie auth bugu níže |

### Supabase projekt
- **Project ID:** `xzlebpzepnhkedlxntgv`
- **URL:** `https://xzlebpzepnhkedlxntgv.supabase.co`
- **Region:** eu-west-1
- **Tier:** free
- **DŮLEŽITÉ:** projekt sdílí i GIGS appka (10 tabulek `gigs_*`). **Migrace Tipovačky nesmí sahat na žádné `gigs_*` tabulky ani funkce.**
- **Anon key:** v `tipovacka.html` jako `SBK` konstanta (řádek ~2295), je veřejný OK
- **Service role key:** v Supabase secrets, nikdy v repu

### Edge funkce (Supabase)
| Slug | Verze | Účel | verify_jwt |
|---|---|---|---|
| `fifa-ranking-refresh` | v6 | FIFA ranking z inside.fifa.com | true |
| `results-refresh` | v6 | ESPN scoreboard, **multi-day fetch** (včera/dnes/zítra) | true |
| `teams-refresh` | v5 | ESPN tymové info | true |
| `team-detail-refresh` | v4 | Detail jednoho týmu | true |
| `odds-refresh` | v6 | The Odds API | true |
| `cron-results` | v5 | pg_cron interval 2 min, ukládá `parsed_events` + **auto-save dohraných zápasů do `vysledky`** (insert-only, nikdy nepřepisuje - admin korekce mají přednost) | **false** (chráněno `CRON_SECRET` headerem) |
| `match-summary` | v2 | ESPN summary/scoreboard proxy pro kartu zápasu (GET ?date= / ?event=) + H2H, jen čtení | true |

### Hosting
- **Primární URL:** `https://tipovacka.chabrycity.cz/tipovacka.html` (Vercel + custom doména)
- **Vercel projekt:** `tipovacka2026` (alias `tipovacka184.vercel.app`)
- **Custom doména:** `tipovacka.chabrycity.cz` (CNAME na `cname.vercel-dns.com`, DNS panel Shoptet)
- **Legacy:** https://adamsky184.github.io/tipovacka2026/tipovacka.html (zachované pro PWA installs starých uživatelů)
- **GitHub repo:** https://github.com/adamsky184/tipovacka2026 (main branch = production)

---

## Git workflow (sandbox → GitHub)

**Sandbox má git access přes embedded token v URL** (ne SSH). Push pattern:

```bash
# Vždy začni s pull (může běžet auto-update mezitím):
cd /tmp/tipovacka-push
git pull origin main

# Copy souborů z workspace:
cp "/sessions/.../mnt/AI APPS/TIPOVACKA2026/tipovacka.html" tipovacka.html
cp "/sessions/.../mnt/AI APPS/TIPOVACKA2026/sw.js" sw.js
cp "/sessions/.../mnt/AI APPS/TIPOVACKA2026/changelog.md" changelog.md

# Commit + push:
git add tipovacka.html sw.js changelog.md
git commit -m "vX.Y.Z: krátký popis"
git push origin main
```

**Token už je nakonfigurovaný v `/tmp/tipovacka-push/.git/config`** (token pattern: `https://adamsky184:ghp_xxx@github.com/...`). Pokud `/tmp/tipovacka-push` neexistuje (workspace restart), reclone:

```bash
git clone "https://adamsky184:GH_TOKEN@github.com/adamsky184/tipovacka2026.git" /tmp/tipovacka-push
git config user.email "woozily@seznam.cz"
git config user.name "Adam184"
```

**Po push:** Vercel auto-deploy (~30s), Service Worker auto-update notifikuje klienty (v5.6.2+ auto-reload toast).

---

## Verzování + release proces

Formát: `vMAJOR.MINOR.PATCH` (např. `v5.7.3`)

Při každé změně:
1. Bump `APP_VERSION` v `tipovacka.html` (řádek ~2280)
2. Bump `CACHE_VERSION` v `sw.js` (řádek 5)
3. Aktualizuj `changelog.md` - nová sekce nahoru s popisem
4. `APP_VERSION_DATE_CS` + `APP_VERSION_DATE_EN` v `tipovacka.html` - aktuální datum
5. Footer (`ver-lbl`, `date-lbl`) se aktualizuje automaticky z konstant
6. Git commit + push

---

## Co je hotové (v5.7.3 souhrn)

### Stabilita + bezpečnost
- ✅ PIN bcrypt (lazy migrace z legacy SHA-256)
- ✅ Aliasy pro přejmenované hráče (Adam184 = ["Adam", "adam"])
- ✅ `auth_hrac_secure_by_*` (by_name, by_id) - 4 cesty: bcrypt+plain, hash=hash, plain+salted SHA-256+aliases, plain+unsalted SHA-256
- ✅ `registruj_hrace_secure` ukládá rovnou bcrypt (předtím unsalted SHA-256 - bug)
- ✅ RLS politiky na všech tabulkách, INSERT/UPDATE/DELETE přes RPC s admin PIN check
- ✅ Auto-update SW + force reload na klientech bez reinstallu

### Hlavní funkce
- ✅ Login + registrace + change PIN + admin reset PIN + delete account
- ✅ Tipy na zápasy (10b/3b/1b)
- ✅ Extra tipy (vítěz turnaje, král střelců)
- ✅ Žebříček (celkový/skupiny/play-off) přes `get_leaderboard_snapshot_secure`
- ✅ Tipy ostatních (jen u zápasů kde máš svůj tip)
- ✅ Live scoreboard banner (pg_cron + cron-results edge fn)
- ✅ Live indikátor u zápasu (Tipy/Výsledky/Ostatní) s minutáží + skore
- ✅ Refresh VÝSLEDKY/TÝMY/FIFA/KURZY (admin)
- ✅ Paid league (volitelná soutěž o peníze)
- ✅ Diskuze threaded + emoji reakce
- ✅ PWA install (iOS/Android) + offline-first SW
- ✅ CS/EN switcher, Light/Dark theme
- ✅ Stadiony s fotkami, Historie MS

### Quick wins (v5.7.x)
- ✅ Sticky header row v tabulkách
- ✅ LIVE filter chip (auto-show když probíhá zápas)
- ✅ Success rate progress bar v žebříčku
- ✅ Skupinový chip (A/B/C...) před názvy týmů
- ✅ Floating scrollbar pro "Posun hráčů" (desktop + mobile)
- ✅ Doplnit chybějící tipy CTA
- ✅ Admin shortcut bar (sticky lišta v admin)
- ✅ Můj progress dashboard (4 karty v Tipy)
- ✅ Live admin overview (4 karty + seznam kdo nemá dnešní tip)
- ✅ Comeback toast po změně pozice v žebříčku
- ✅ Compact paid info v žebříčku (skryté vstupné/účet/deadline po startu)

### v5.8.0 Karta zápasu
- ✅ Rozklikávací detail zápasu (tlačítko ⓘ) z Tipy / Výsledky / Tipy ostatních / Pavouk / karta týmu
- ✅ Lokální data hned: vlajky, skóre/LIVE/odpočet, stadion + foto, FIFA ranking, kurzy, tipy hráčů
- ✅ ESPN detail lazy: statistiky, góly/karty/střídání, sestavy, rozhodčí, návštěva (edge fn `match-summary`)
- ✅ Cache: localStorage `ms26_msum_<zid>` (final navždy, live 60 s), event id mapa `ms26_espn_evt_map_v1`
- Klíčové funkce v `tipovacka.html`: `openMatchCard()`, `loadMatchSummary()`, `matchCardBtnHtml()` (delegovaný capture listener na `[data-mcard]`)

### v5.9.0 Live wave + automatizace
- ✅ **Tabulka `zapasy_meta`** (104 zápasů, kickoff UTC + lokální názvy týmů, RLS read-only) - migrace `backend/sql/13`
- ✅ **Tipy odhaleny po výkopu** - `get_visible_tips_secure` 3. OR podmínka (migrace `backend/sql/14`); frontend `canSee` v `renderOstRow` + `openMatchCard`
- ✅ **cron-results v5 auto-save výsledků** - insert-only do `vysledky`, mapování names+kickoff±48h
- ✅ **v5.9.1 auto-resolve play-off**: cron sám doplní reálné dvojice do `zapasy_meta` (párování kickoff ±2h, jen placeholder řádky, unikátní kandidát); frontend po loginu přepíše placeholdery v PZ přes `applyZapasyMetaNames()` + `espnToLocalTeam()`. Žádný ruční zásah po rozlosování není potřeba. Fallback při selhání = ruční režim jako dřív.
- ✅ Živá projekce žebříčku (`renderZeb`, jen fáze 'cel', přepočet z `liveScoresMap`)
- ✅ Ranní recap (`renderDailyRecap`, dismiss klíč `ms26_recap_dismissed`)
- ✅ Export .ics (`exportICS`, tlačítko `btn-ics` vedle Export CSV)
- ✅ Admin stale-data varování (`renderAdminOverview`, čte `window.__resultsSyncAt` z `pollLiveScores`)
- ✅ Mobil: 3 header boxy přes šířku (`.hdr-stats:not(.has-po)` grid 3 sloupce; class `has-po` přepíná `updSavedProgress`)

---

## Otevřené / TODO

### Vyšší priorita
- **B12** Config.js rebrand-ready - vytáhnout tournament-specific data (název, datum, hostitelé, týmy, zápasy) do `config.js` pro snadný rebrand na Euro 2028 / MS 2030. Plán pro v6.0.
- **F9 monitor** ESPN refresh - po každém zápase ověřit že VÝSLEDKY refresh správně ukládá skóre

### Hotovo mezitím (v5.8–5.10)
- ✅ ~~F9 monitor ESPN~~ → auto-save cron v5
- ✅ ~~F14 detail řádku~~ → karta zápasu ⓘ (v5.8.0)
- ✅ ~~F12 sdílení výsledku~~ → PNG share v kartě zápasu (v5.10.0, `shareMatchAsImage`)
- ✅ ~~Achievements rozšíření~~ → 10 achievementů v profilu hráče (v5.10.0, `getPlayerAchievements`)
- ✅ ~~Daily ESPN cron~~ → 2-min cron + auto-save běží

### Vyšší priorita
- ✅ **PZ (play-off) opraveno (v5.10.5)** - celý pavouk přestaven dle ESPN (datumy, stadiony, struktura). 0 tipů na PZ, ověřeno bijekce 32 + topologie.
- ✅ **Skupinové stadiony opraveny (v5.10.5)** dle ESPN (42 zápasů).
- **Zálohy v DB po opravě rozpisu:** `tipy_bak_szfix` (47 tipů swap), `zapasy_meta_bak_szfix` + `zapasy_meta_bak_pzfix` (104 řádků). Smazat až po ověření, že je vše OK.

### Backlog (UX wishlist - viz memory `tipovacka_ux_wishlist.md`)
- Více cup-stage podpory (3rd place match, finále) - pro v6.0
- Achievements lze dál rozšiřovat (streaky, denní výzvy)

---

## Důležitá historie bugů (poučení)

### v5.6.x série (10.-11. 6. 2026, **těsně před startem turnaje**)
**Root cause kaskáda:**
1. F3 security migrace zavedla `registruj_hrace_secure` který ukládal `sha256(plain)` **bez saltu**
2. `auth_hrac_secure_by_id` očekávalo `sha256(plain + 'ms2026salt' + jmeno)` se saltem
3. Login fungoval (Path 2 hash=hash náhodou), ALE všechny následné RPC selhávaly (Path 3 vyžaduje salted)
4. Bug byl skrytý ~2 měsíce (nikdo neměl tipy ostatních ani neukládal výsledky)
5. Když jsem opravoval, navíc:
   - Resetoval jsem Dave's PIN bez Adamova souhlasu (chyba - viz `safety_rules.md`)
   - Stejně pro test účet (chyba)
6. Po prošetření: **Path 4 v `auth_hrac_secure_by_id` přidána pro UNSALTED hash** + `registruj_hrace_secure` opraven na bcrypt rovnou
7. `vysledky` tabulka měla RLS jen SELECT, chyběl INSERT/UPDATE - admin refresh házel 401 (taky F3 zapomínka)

**Poučení:** SQL bugy se projeví až když je hodně dat. Vždy testuj na DB se třemi+ hráči, ne jen na jednom test účtu.

### v5.6.0-5.6.5 (mezitím)
- myPin v frontend storage byl unsalted hash. Opraveno: `myPin = plain`, storage `{pin: plain}`. Force re-login pro legacy storage. Auto-recovery při auth fail v save tips.

### v5.4.5 (rename Adam → Adam184)
- Přejmenování + aliasy `[Adam, adam]`. Problém: DB hash byl s původním jménem "Adam". `auth_hrac_secure_by_id` neměl aliasy fallback - **F8 fix** přidán pro `auth_hrac_secure_by_id` (`auth_hrac_secure_by_name` aliasy už uměl).

---

## Klíčové soubory a kódové body (orientace v `tipovacka.html`)

| Hledej | Co je | Cca řádek |
|---|---|---|
| `var APP_VERSION=` | Verze (single source of truth) | ~2280 |
| `var APP_VERSION_DATE_CS=` | Datum verze pro CZ | ~2281 |
| `var SBU=` | Supabase URL | ~2295 |
| `var SBK=` | Supabase anon key | ~2296 |
| `var SZ=` | Skupinová fáze - pole zápasů | ~2475 |
| `var PZ=` | Play-off fáze - pole zápasů | ~3000 (kolem) |
| `var TEAMS=` | Týmy seskupené po skupinách | ~2460 |
| `var PAID_LEAGUE=` | Paid league config | ~2253 |
| `function doLogin()` | Login flow | ~4260 |
| `function finishLogin()` | Po loginu - load data + render | ~4300 |
| `function saveTipsWithPin()` | Save tipů (s auth) | ~3597 |
| `function loadAllTips()` | Load tipů ostatních | ~3623 |
| `function get_visible_tips_secure` (SQL) | DB funkce - aliasy column ambiguity fix v v5.6.3 | - |
| `function fetchResults()` | Admin VÝSLEDKY refresh | ~7060 |
| `function renderTipy()` | Hlavní Tipy render | ~5410 |
| `function renderZeb()` | Žebříček render | ~5828 |
| `function renderAdmin()` | Admin tab render | ~6589 |
| `function renderOstRow()` | Řádek Tipy ostatních | ~5804 |
| `function syncOstScrollUX()` | Floating scrollbar | ~5713 |
| `function syncAdminScrollUX()` | Floating scrollbar admin | ~5749 |

---

## Quick start v Claude Code

Když začneš:
1. Přečti tento HANDOFF.md, `spec.md`, posledních 5 záznamů z `changelog.md`
2. Hash check repository: `cd "/Users/adam184/Documents/_CLAUDE/Projects/AI APPS/TIPOVACKA2026" && git status && git log -5 --oneline`
3. Verify aktuální verze: `grep "APP_VERSION=" tipovacka.html | head -1`
4. Verify Supabase MCP přístup (testuj `select count(*) from hrace`)
5. Před jakoukoliv změnou DB → STOP, popsat akci, čekat na Adamův souhlas
6. Před push - pull origin main + bump verze + changelog

## Kontakt na Adama

- **Email:** woozily@seznam.cz
- **App email pro odpovědi:** adam184@chabrycity.cz
- **Doménový provider:** Wedos (chabrycity.cz)
- **DNS:** Shoptet panel (autoritativní)

---

**Tipovačka MS 2026 - vlastní digitální produkt Adama. Stabilita > efekty. Bezpečnost > rychlost. Adam = senior operator, mluv stručně, nepřitakávej.**
