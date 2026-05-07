# Changelog

Formát `vMAJOR.MINOR.PATCH - D. M. RRRR`. Stejný formát jako footer.

## v5.4.5 - 7. 5. 2026

UI fix - korunka na top-1 kartě.

- 👑 emoji u 1. místa: posunuto z pravého kraje (kde se překrývalo se skóre) do levého horního rohu s rotací -12°
- Menší font (.95rem) - méně rušivé
- Také rename Adam → Adam184 (display) s aliasy [Adam, adam] pro login backward-compat
- 💰 paid league badge u všech platících i v hlavním žebříčku (předtím jen v paid filteru)
- Fix paid league filteru - cache->object mapping přidal `in_paid_league` lookup z `players[]`

## v5.4.2 - 7. 5. 2026

Live scoreboard (B3) + clickable header cards.

- **Live banner** nahoře (sticky): zobrazí 🔴 LIVE + max 3 zápasy s skore + minutáží, jakmile pg_cron / admin vrazí do `app_sync_statuses.results.parsed_events` live data
- Polling z DB každých 30s (jen když tab visible) - **0 ESPN volání z klientů**
- Nová edge funkce `cron-results` (verify_jwt:false, chráněna `CRON_SECRET` headerem) - parsuje ESPN scoreboard a ukládá events do `app_sync_statuses`
- DB: `vysledky.status` sloupec ('final' / 'live' / 'pending') + index
- Pro plnou automatiku adminstrátor nastaví `CRON_SECRET` env v Supabase + pg_cron job (manuální setup, návod v handoff)

## v5.4.1 - 7. 5. 2026

Header KPI cards interactive + responsive.

- Karty v hlavičce **proklikávací**: ⚽ Odehráno → Výsledky, 🏟 Tipy: skupiny → Moje tipy, 🏆 Tipy: play-off → Moje tipy s play-off filterem, 🏅 Pořadí → Žebříček
- Karta `Tipy: play-off` **schovaná** dokud play-off není vylosované (testuje se přes `isPlayoffOpened()` - alespoň 1 zápas v PZ má známý tým)
- Keyboard navigation (Tab + Enter/Space)

## v5.4.0 - 7. 5. 2026

UI polish wave (A1+A2+B4+C2 z visual wishlist).

- **A1 Dashboard cards**: barevně diferencované gradient pozadí (modrá / zelená / fialová / zlatá), hover lift + glow
- **A2 Top 3 medaile**: 1. místo zlatý gradient + 👑 ikona + pulse animace, 2. stříbrný, 3. bronzový
- **B4 Match countdown banner**: sticky banner v Tipy tabu pro nezatipované zápasy do 24h ("Mexiko - JAR · Výkop za 2h 15m") + Tip teď CTA tlačítko
- **C2 Active tab**: čára dole + transparent pozadí místo plně vyplněného modrého tlačítka

Skip A3 (tip inputs) - layout tight, B3 (live scoreboard) - čeká na schválení safe varianty.

## v5.3.3 - 7. 5. 2026

UI fix.

- Dark theme jako default (předtím auto-detect dle systému; light měl některé špatně viditelné prvky)
- EN název zkrácen: `TIPPING CHALLENGE WC 2026` → `WC TIPPING 2026` (vejde se do hlavičky)

## v5.3.2 - 7. 5. 2026

Custom doména.

- Primární URL: **https://tipovacka.chabrycity.cz/tipovacka.html**
- Vercel custom domain napojen přes CNAME `tipovacka` → `cname.vercel-dns.com` (Shoptet DNS panel)
- HTTPS cert přes Let's Encrypt (Vercel automaticky)
- Legacy URLs (`*.vercel.app`, `adamsky184.github.io`) zachované pro PWA installs

## v5.3.1 - 7. 5. 2026

Paid league polish.

- Admin tab: samostatný sloupec "💰 Soutěž o peníze" s nadpisem (předtím schované v Akce)
- Onboarding: nový 4. slide o paid lize (zobrazí se i při re-onboardingu)
- FAQ/Pravidla: paid league rozdělené do strukturovaných bullet pointů (vstupné, účet, zpráva, deadline, distribuce, jak to funguje, disclaimer)
- Login overlay paid box + onboarding + FAQ vždy odkazují na "Pravidla" tab
- Tlačítko "Označit" → "Mark paid" pro jasnost

## v5.3.0 - 7. 5. 2026

Volitelná soutěž o peníze (paid league).

- Sloupec `hrace.in_paid_league` + secure RPC `admin_toggle_paid_league_secure`
- Login overlay info box: vstupné 300 Kč, účet 1972281083/0800, deadline před prvním výkopem
- FAQ/Pravidla: paid league sekce s disclaimerem
- Admin tab: 💰 toggle u každého hráče + souhrn paid pool s payout breakdown
- Žebříček: filter chip `Vše / 💰 Paid` + 💰 badge u placených hráčů
- Distribuce výher dle počtu: 2-4 vítěz vše, 5-7 split 75/25, 8+ split 65/25/10
- PAID_LEAGUE config v top-of-script konstantách (rebrand ready)

## v5.2.2 - 7. 5. 2026

UI polish patch.

- Odds pill design (lepší vizuál kurzů pod zápasem)
- Mobile layout fix - tip inputs a tendence se nepřekrývají (74px / 104px)
- AI suggester button skrytý na mobile (málo místa)

## v5.2.1 - 7. 5. 2026

Toast + diagnostika patch.

- Toast notifikace u KURZY místo skrytého status pruhu
- Edge funkce odds-refresh v4: vždy uloží sync_status (i při chybě/0 events) s detailem
- Auto-reload UI po úspěšném KURZY refreshi (kurzy se hned zobrazí u zápasů)

## v5.2.0 - 7. 5. 2026

Velká feature wave (Q1-Q10 + L1-L2).

- Q1 Konfeta animace při uložení tipu
- Q2 Toast "Tvůj tip se shoduje s X% hráčů" po uložení
- Q3 Auto dark/light theme dle systému (`prefers-color-scheme`)
- Q4 Sdílení žebříčku jako PNG (Web Share API + download fallback)
- Q5 Onboarding tutorial 3 obrazovky (admin/hráč rozlišení)
- Q6 Quick stats toast po loginu (poslední rated tip)
- Q7 Haptic feedback při uložení (`navigator.vibrate(50)`)
- Q8 Empty state humor texty
- Q9 Loading skeleton u žebříčku
- Q10 Nové badges: BLACK SHEEP + COMEBACK
- L1 AI tip suggester 🤖 (heuristika dle FIFA ranking)
- L2 Detail page hráče (modal: best/worst tipy, head-to-head)
- B1 fetchTeamPackage přes edge funkci team-detail-refresh
- B2 alert() v admin → showToast notifikace
- B3 CSP meta tag (default-src self + supabase + ESPN + fonts)
- B4 APP_VERSION konstanta (single source of truth)
- B5 autocomplete + aria-label na buttonech
- B6 i18n admin tabulkové hlavičky
- B8 Account delete UI (GDPR)
- B10 Frontend refactor na secure RPC + RLS lockdown
- B11 odds-refresh edge fn + KURZY button + UI integrace pod tipy
- B13 pg_cron auto cleanup auth_attempts (každou hodinu)
- Vercel deploy (tipovacka2026.vercel.app + tipovacka184.vercel.app)
- vercel.json: root rewrite na /tipovacka.html, no-cache headers

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
