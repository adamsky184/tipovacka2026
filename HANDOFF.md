# Tipovačka MS 2026 — kompletní handoff

> **Účel dokumentu:** samostatný, úplný podklad o celé aplikaci (i bez přístupu ke kódu).
> **Aktuální k:** 23. 7. 2026 · **Verze:** `v5.12.75` · **Stav:** turnaj DOKONČEN, appka v archivním/po-turnajovém režimu.

---

## 1. Co to je

**Tipovačka MS 2026** je live tipovací PWA na Mistrovství světa ve fotbale 2026. Uzavřená parta 13 hráčů tipovala výsledky všech 104 zápasů. Vlastní digitální produkt Adama (senior operátor). Priority: **stabilita > efekty, bezpečnost > rychlost**.

- **Live URL:** https://tipovacka2026.vercel.app (custom doména tipovacka.chabrycity.cz)
- **GitHub:** repo `tipovacka2026`, branch `main` = produkce
- **Výsledek turnaje:** 🏆 mistr světa **Španělsko** (finále 0:0 po 90', 1:0 po prodloužení — Ferran Torres 106'), král střelců **Kylian Mbappé** (10 gólů)
- **Vítěz tipovačky:** 👑 **Adam184 374 b** · 2. Michal Roubal 327 · 3. Dave80 280
- 13 hráčů · ~2 787 tipů · vše vyhodnoceno vč. extra tipů (auto dle FIFA pravidel)

## 2. Tech stack

| Vrstva | Technologie | Poznámka |
|---|---|---|
| Frontend | **single-file vanilla JS** (`tipovacka.html`, ~11k řádků) | žádný framework/build, edit přímo |
| Backend | **Supabase**: Postgres + Edge Functions (Deno) + RLS | projekt `xzlebpzepnhkedlxntgv` |
| Hosting | **Vercel** (free) | deploy = `git push` na main (~30 s) |
| PWA | `manifest.json` + `sw.js` | network-first pro navigaci; `CACHE_VERSION` = `APP_VERSION` |
| Externí data | ESPN (scoreboard/summary/rosters), FIFA ranking, The Odds API, YouTube | klíče Odds/YT v DB `app_secrets` (jen service_role) |
| Auth | jméno + PIN (bcrypt), SECURITY DEFINER RPC s PIN ověřením | žádný Supabase Auth |

- `SBU` = `https://xzlebpzepnhkedlxntgv.supabase.co`, `SBK` = anon key (veřejný, v HTML)
- Service role key jen v Supabase env — **nikdy v repu**
- ⚠️ **Projekt sdílí i jiná appka** (tabulky `gigs_*`). **Nikdy na ně nesahat.**
- ⚠️ **Nikdy nesahat na `hrace` (účty/PINy) a `tipy` bez výslovného souhlasu Adama.**

## 3. Struktura repa

```
TIPOVACKA2026/
├── tipovacka.html        # CELÝ frontend — entry point
├── sw.js                 # service worker (CACHE_VERSION!)
├── manifest.json, vercel.json (rewrites + headers + denní cron /api/keepalive)
├── api/keepalive.js      # Vercel fn: denní ping Supabase (proti uspání free projektu)
├── changelog.md          # historie verzí (nejnovější nahoře)
├── HANDOFF.md            # tento soubor
├── assets/planky/        # plánky 16 stadionů (staženo lokálně, FIFA/oficiální weby)
├── *.jpeg/*.png          # fotky stadionů, mapa
├── backend/functions/    # Supabase Edge Functions (Deno TS) — deploy přes MCP/dashboard
│   ├── cron-results/      # auto-výsledky z ESPN (běžel à 2 min, cron VYPNUT po turnaji)
│   ├── results-refresh/   # ruční načtení výsledků (v7: multi-day, resolved 90')
│   ├── match-summary/     # proxy ESPN pro kartu zápasu
│   ├── goal-minutes-sync/ # góly+asistence (v2)
│   ├── match-stats-sync/  # boxscore, hráčské řádky, minuty+ofsajdy (v4)
│   ├── stats-cron/        # dosync statistik + evalFinale (v2, cron VYPNUT)
│   ├── daily-recap/       # souhrn bota (v6: +extra body, cron VYPNUT)
│   ├── roster-sync/       # oficiální soupisky 48 týmů (jednorázově staženo)
│   ├── odds-refresh/, fifa-ranking-refresh/, teams-refresh/, yt-highlights/
└── archive/ (gitignored) # lokální zálohy: finální HTML/SW, DB exporty, landing mock
```

## 4. DB tabulky (public)

**Core:** `hrace` (účty, PIN bcrypt, je_admin) · `tipy` (tip, postup H/A) · `vysledky` (skore po 90', postupujici) · `zapasy_meta` (kickoff, názvy) · `extra_tips` + `extra_tip_settings` (winner/scorer tip + actual)
**Statistiky (cache z ESPN, navždy naše):** `goal_minutes` (+assist, penalty, own_goal, side) · `goal_minutes_sync` · `match_stats` (boxscore jsonb home/away vč. přihrávek, pen_events, attendance, referee) · `player_match_stats` (3254 řádků: góly, asistence, střely, karty, zákroky, **minutes, offsides, starter**) · `team_rosters` (1247 hráčů vč. 0 minut) · `match_media` (YT highlights cache) · `fifa_rankings_current`
**Komunita:** `discussion_posts` (+**pinned**) · `discussion_reactions` · `daily_recaps` (souhrny bota, historie) · `recap_reactions` · `anketa_hlasy` (co dál: euro2028/afcon2027/oboji/uvidim/konec) · `hrac_emaily` (spárované e-maily)
**Archiv:** `turnaje` (ms2026: šampion, tipér šampion) · `turnaj_archiv` (13 hráčů, konečné pořadí, body, extra_body, email)
**Systém:** `app_secrets` (klíče, jen service_role) · `app_sync_statuses` · `auth_attempts`

Vše za RLS; zápisy jen přes SECURITY DEFINER RPC s PIN auth (`auth_hrac_secure_by_id`). Chybové návraty `{"chyba":"..."}`.

## 5. Bodování (finální, ověřeno)

- Přesný výsledek **10 b** · vítěz + správný rozdíl **4 b** · vítěz/remíza **3 b** · jinak 0
- Playoff (zid ≥ 73): hodnotí se **skóre po 90 minutách**; bonus **+3** jen za remízový tip + správného postupujícího
- Extra tipy: vítěz turnaje **+30**, král střelců **+20**; párování `plainNorm` (lowercase, bez diakritiky), sdílená cena „A / B" — tip na kohokoliv ze sdílených platí
- Král střelců dle **oficiálních FIFA pravidel Zlaté kopačky**: góly → asistence → góly ze hry (bez penalt) → sdílení. Auto-vyhodnocení `evalFinale` ve stats-cron (admin override má přednost). Pro MS 2026: Mbappé 10 g (bez remízy).

## 6. Cron / automatizace — STAV PO TURNAJI

- pg_cron: **všechny turnajové joby odplánované** (cron_results_2min, stats_cron_10min, daily_recap_5utc). Běží jen `auth_attempts_cleanup_hourly`.
- **Vercel Cron `/api/keepalive`** denně 06:00 UTC — pinguje Supabase REST, aby free projekt nebyl uspán. KLÍČOVÉ, nemazat.
- Edge funkce zůstávají nasazené (lze volat ručně s `X-Cron-Secret: tipovacka_cron_2026_xy7Z`).

## 7. Klíčové frontend koncepty

- `APP_VERSION` v HTML + `CACHE_VERSION` v sw.js musí být shodné; deploy = bump obou + changelog + commit + push + poll live URL.
- Hub menu (7 položek): HUBS mapa, subnav `.nb-sub`. Zakončení (`finale`) = po turnaji první tab + výchozí, `finaleIsPublic()` = `FINALE_PUBLIC || !!results[104]`.
- Zakončení: podium, ceny turnaje (rozklikávací top 3 + ⓘ vysvětlivky), anketa + e-mail (i v uvítacím popupu a Diskuzi), vysvědčení hráčů, share PNG.
- Týmy: vlastní modal soupisky (team_rosters + statistiky + zápasy, barevné pozice) — žádná ESPN závislost, malé FIFA/ESPN odkazy jen doplňkově. Živý „nej střelec MS" (`teamTopScorerLive`, ESPN anglické názvy přes `teamMatches`).
- Profil hráče: dlaždice vč. minut, základ/střídal, na-90 metrik, ofsajdů; góly ze hry/z penalt.
- Diskuze: reakce 👍😂🔥⚽, vlákna, admin pin (`admin_set_post_pinned_secure`, max 1), reakce i na souhrny bota (`recap_toggle_reaction_secure`), odpověď na bota přes prefix v composeru.
- PostgREST **limit 1000 řádků** — všude kde hrozí, stránkovat s pevným `.order()` (tipy, player_match_stats)!
- Editace kódu: python heredoc s `assert old in s`; syntax check = extrakce `<script>` + `new Function`; POZOR na skutečné unicode znaky vs `\u` escapy při matchování.

## 8. Bezpečnostní pravidla práce (NEMĚNNÁ)

1. Pracovat jen v adresáři projektu. 2. Nikdy neohrozit DB — vše reverzibilně, zálohy před zásahem. 3. Nesahat na `hrace`/`tipy` bez výslovného souhlasu. 4. Nesahat na `gigs_*`. 5. „Oprav to" ≠ volná ruka nad daty. 6. Vše ověřit v preview před deployem (desktop + mobil).

## 9. Zálohy

- **Databáze: GitHub Actions denně** — `.github/workflows/db-backup.yml`, dump `public`+`auth`
  (Tipovačka **i GIGS**), artefakt 7 dní. Obnova a ověření: `docs/restore.md`. Vyžaduje secret
  `SUPABASE_DB_URL`.
- Git tagy: `v5.12.42-stable`, **`v5.12-final-turnaj`** (finální stav po turnaji)
- `archive/` (lokální, gitignored): `tipovacka_v5.12.64_final_turnaj.html`, `sw_...js`, `db_bak_tipy_szfix_2026-07-20.json`, `landing_mock_v1.html`, staré verze HTML
- DB: `turnaje` + `turnaj_archiv` = zmrazené konečné pořadí; `*_bak_*` tabulky smazány 20. 7. (tipy_bak exportován)

## 10. Roadmapa (po turnaji)

1. **Profil hráče přes jméno v headeru** (avatar/vlajka, e-mail, PIN, historické stats; login i e-mailem) — návrh schvaluje Adam
2. **Landing page / rozcestník** — síň slávy (turnaje, trofeje 🥇🥈🥉, all-time body z `turnaj_archiv`), karty turnajů, archivní režim MS 2026; mock v `archive/landing_mock_v1.html`
3. **v6.0 rebrand pro další turnaj** (config.js; anketa hráčů: EURO 2028) + dropdown vítěze a autocomplete střelců z `team_rosters` u extra tipů
4. Push notifikace (až EURO 2028) · EN lokalizace nových sekcí Zakončení

---

## 11. Session 23. 7. 2026 — záloha, právní vrstva, auth, ikony (v5.12.75)

### Co bylo (výchozí stav dle auditu `_AYDEA_AUDIT.md`)

- Databáze bez jakékoli zálohy (Supabase free = žádné automatické zálohy ani PITR).
- Žádné podmínky užití ani zásady ochrany osobních údajů, přestože se ukládají jména,
  e-maily a diskuzní příspěvky.
- Registrace otevřená komukoli s odkazem, admin se o nové registraci nedozvěděl.
- Přihlašování bez rate-limitu (tabulka `auth_attempts` existovala, ale klient ji nepoužíval),
  poslední přihlášení se nikde neevidovalo.
- PWA měla jen inline SVG ikonu (chybělo `icon-512.png` i `apple-touch-icon`).

### Co je teď

**Záloha (kryje Tipovačku i GIGS).** Supabase projekt `xzlebpzepnhkedlxntgv` je sdílený s appkou
GIGS (`gigs_*`), **GIGS vlastní zálohu nemá** — tenhle repozitář zálohuje za obě. Stejně tak
keep-alive `/api/keepalive` (Vercel cron 06:00 UTC) drží vzhůru celý projekt, tedy i GIGS.
- `.github/workflows/db-backup.yml` — denně 03:15 UTC + ruční spuštění; `pg_dump` schémat
  `public` a `auth` → gzip → artefakt s retencí 7 dní.
- `scripts/db-verify-dump.sh` — health-check: velikost, neporušenost gzipu, závěrečný marker
  dumpu, počet tabulek a **shoda počtu řádků každé tabulky s produkcí**, přítomnost obou appek,
  minimální počet RLS policies a funkcí. Při neshodě workflow spadne a artefakt se nenahraje.
- `.github/workflows/db-restore-test.yml` — týdně + ručně: obnova dumpu do čistého
  `postgres:17` a `diff` proti produkci (řádky všech tabulek, RLS policies, počet funkcí).
- `docs/restore.md` — postup obnovy do nového Supabase projektu i lokálně.

**Právní vrstva.** Appka nemá framework, takže `/terms` a `/privacy` **nejdou** jako Next routes;
zvolil jsem **samostatné statické stránky** `terms.html` a `privacy.html` + rewrites ve
`vercel.json` (jednodušší než sekce v 11tisícřádkovém `tipovacka.html`, načtou se i když appka
selže a jdou sdílet/indexovat samostatně). Odkazy jsou v obou footerech. Zásady popisují uložené
údaje, Supabase EU (eu-west-1), Vercel, Google Fonts a YouTube embed, `localStorage` místo cookies
(proto bez cookie lišty) a smazání účtu přes existující `delete_account_secure`.

**Registrace a auth.**
- Registrace vyžaduje **zvací kód** (`app_secrets.invite_code`, pro anon klíč nečitelný).
  Admin ho vidí a mění v sekci Admin; prázdný kód = registrace otevřená.
- **Rate-limit**: 8 neúspěšných pokusů na jméno za 15 minut → dočasné zablokování; po úspěšném
  přihlášení se pokusy mažou. Vše přes existující tabulku `auth_attempts`.
- Nový sloupec **`hrace.last_login`**, plní se při každém přihlášení i registraci.
- **Admin notifikace bez mailového kanálu**: appka žádný mail neodesílá, takže notifikace je
  in-app — přehled hráčů (registrace, poslední přihlášení, počet tipů, e-mail), nové registrace
  zvýrazněné a odznak s počtem na záložce Admin (baseline se nastaví při první návštěvě).

**PWA ikony.** `assets/icons/` — `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`,
`apple-touch-icon.png` (předloha `icon.svg`), zapojené v `manifest.json` i v `<head>`.

### Čím ověřeno

- **Rate-limit**: 9 pokusů přes REST na fiktivní jméno — 9. vrátil „Příliš mnoho neúspěšných
  pokusů“; testovací záznamy smazány.
- **Zvací kód**: registrace bez kódu i se špatným kódem vrací chybu; `app_secrets` je přes anon
  klíč nedostupné (`permission denied`).
- **Zachycená regrese**: po přidání parametru `p_invite` existovaly dvě signatury
  `registruj_hrace_secure` a PostgREST vracel `PGRST203`; stará 3parametrová verze zrušena,
  volání se 3 parametry znovu ověřeno.
- **Admin RPC** bez práv admina vrací „Jen pro admina“ (obě nové funkce).
- **Klient**: kontrola v preview — pole zvacího kódu vč. validace a EN překladu, render admin
  přehledu, odznak (0 při první návštěvě, 1 po nové registraci), odkazy v obou footerech.
- **Produkce**: `v5.12.75` nasazena; `/terms` a `/privacy` vrací 200 se správnými titulky,
  všechny čtyři ikony 200, manifest obsahuje 192/512/maskable.
- **Workflows**: obě registrované na GitHubu; běh zálohy proběhl přes checkout a instalaci
  PostgreSQL 17 klienta a zastavil se přesně na chybějícím secretu (viz níže).

### Co zbývá

1. **Uložit secret ve správném tvaru a spustit ověřovací běhy** (jediný zbývající krok Bloku 1).
   Aktuálně uložená hodnota má **20 znaků**, takže to není connection string (~110 znaků) —
   `pg_dump` ji bral jako název databáze a padal na lokálním socketu. Vezmi celý řetězec ze
   Supabase → Database → **Session pooler** (port 5432) a ulož ho bez uvozovek a bez zalomení:
   ```bash
   printf '%s' 'postgresql://postgres.xzlebpzepnhkedlxntgv:<HESLO>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres' \
     | gh secret set SUPABASE_DB_URL --repo adamsky184/tipovacka2026
   gh workflow run "DB restore test (čistá DB)" --repo adamsky184/tipovacka2026
   ```
   Restore test je „ostrá“ zkouška obnovy — dokud neproběhne zeleně, zálohu neber jako hotovou.
   Workflow dnes špatnou hodnotu odhalí hned v kroku *Kontrola připojení k produkci* a napíše
   délku/schéma/host (nikdy samotnou hodnotu).

   **Ověřeno bez produkce:** `db-selftest.yml` (běží při každé změně skriptů, bez secretu) postaví
   dvě dočasné databáze a projede celý řetězec dump → health-check → restore → porovnání.
   Poslední běh zelený: 6 tabulek, tipy 1300 řádků, gigs_concerts 641, policies 3/3, funkce 1/1,
   plus test, že vadný connection string je odhalen dřív než spadne `pg_dump`.
   Self-test rovnou odhalil, že v CI byl v PATH `pg_dump` 16 (proti produkčnímu Postgresu 17.6
   by dump spadl na *server version mismatch*) — opraveno předřazením `/usr/lib/postgresql/17/bin`.
2. **PIN v `localStorage`** (klíč `ms26s`) zůstává v plaintextu — je to nutné, protože každé RPC
   posílá PIN k ověření. Riziko: kdo se dostane k prohlížeči/XSS, získá PIN. Přepis na tokenovou
   session je větší architektonická změna, vhodná až k dalšímu turnaji.
3. **Fotky stadionů v rootu** mají jednotky MB (~10 MB celkem) — zbytečně nafukují repo i přenos,
   časem převést na WebP a zmenšit.
4. Zvážit **archivaci dumpu mimo GitHub** (artefakty mizí po 7 dnech) a doplnění plného jména /
   adresy provozovatele do zásad, pokud má být appka formálně veřejná.

