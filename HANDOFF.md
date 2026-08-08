# Handoff - Tipovačka

**Aktuální verze:** v6.2.0 landing (tipovacka.html archiv zůstává v6.0.0) · 8. 8. 2026
**Poslední session:** 8. 8. 2026

## Kde jsme
MS 2026 dohráno a archivováno. Landing `/` (index.html) world-class low-poly (v6.1) + **rebrand-ready groundwork a teaser stránky (v6.2.0, NASAZENO)**: `config/ms2026.js` + `assets/seed/ms2026/*.json` (48 týmů / 104 zápasů / 16 stadionů, extrakt z tipovacka.html, validace `scripts/validate-seed.mjs`); samostatné teaser stránky **`/AFCON2027`** a **`/EURO2028`** (countdown, předběžný zájem → RPC, CZ/EN, dark/light), landing planned karty mají odkaz „Více info →". Archiv MS 2026 na `/ms2026` (= `/tipovacka.html`, PWA installs zachovány, nezměněn). Supabase (`xzleb…` SDÍLENÝ s GIGS) + Vercel. Zálohované, footer AYDEA.

## Otevřené úkoly
- [x] v6.2.0 rebrand-ready config/seed + teaser stránky AFCON/EURO — **nasazeno** (merge `feat/v6.2-rebrand-ready`). Viz `docs/OVERNIGHT-REPORT.md`.
- [x] Landing hub v6.0 (v6.0.0) + world-class redesign v6.1 (v6.1.0)
- [ ] Ostrý test předběžného zájmu na produkci `/AFCON2027` + `/EURO2028` → ověřit `select count(*) from turnaj_zajem` (první reálný write RPC v produkci)
- [ ] Loader: HTML čte z `config/seed` místo hardcoded polí — až na klonu pro nový turnaj (ne na archivu)
- [ ] Až se rozjede AFCON/EURO: překlopit teaser na živý turnaj (nový Supabase projekt vs. reuse — viz `backend/sql/21_future_tournament.sql.draft`)
- [ ] Migrace domény → tipovacka.aydea.app + Supabase Auth redirect (mimo repo, až se rozhodne)
- [ ] Další turnaj: dropdown vítěze/střelce z `team_rosters` u extra tipů (budoucí)

## Známé problémy
- Žádné kritické. PIN v localStorage plaintext (nutné pro RPC ověření) - přepis na token session až ve v6.0.

## Kontext pro Claude
- Supabase `xzleb…` je SDÍLENÝ s GIGS (prefix `gigs_*`) - **nesahat na gigs_**; nesahat na `hrace`/`tipy` bez souhlasu.
- Footer odkazy `/terms` `/privacy` jsou relativní schválně (forward-kompatibilní: fungují na chabrycity i na aydea.app).
- Záloha DB: GitHub Actions (role `tipovacka_backup`, secret `SUPABASE_DB_URL` + keychain `tipovacka-supabase-db-url`), kryje i GIGS. Keep-alive = Vercel cron `/api/keepalive`. Detaily `docs/restore.md`.
- Bodování: skóre po 90'; playoff +3 jen za remízu+správný postup; extra tip vítěz +30 / střelec +20.
- Deploy: bump `APP_VERSION` (html) i `CACHE_VERSION` (sw.js) shodně → push → Vercel (~30 s).
- Registrace: `reg_mode` = invite (kód `MS2026-1ABF85`) | approval - přepínač v Admin sekci.
- Tech historie (DB schéma, edge funkce, session log): `changelog.md`, `backend/sql/`, `docs/handoff-archiv-2026-07.md`.

## Další krok
Migrace domény na tipovacka.aydea.app až padne rozhodnutí; jinak appka splňuje AYDEA pravidla.
