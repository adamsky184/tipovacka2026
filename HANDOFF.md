# Handoff - Tipovačka

**Aktuální verze:** v5.12.80 · 3. 8. 2026
**Poslední session:** 3. 8. 2026

## Kde jsme
Turnaj MS 2026 dohraný, appka v archivním/po-turnajovém režimu, live na tipovacka.chabrycity.cz (cíl: tipovacka.aydea.app). Single-file vanilla JS PWA (`tipovacka.html`) + Supabase (projekt `xzleb…` SDÍLENÝ s GIGS) + Vercel. Vše funkční, zálohované, footer v AYDEA formátu.

## Otevřené úkoly
- [x] SEO základ - hotovo (v5.12.79)
- [x] Footer mobil - hotovo (v5.12.80)
- [ ] Migrace domény → tipovacka.aydea.app + Supabase Auth redirect (mimo repo, až se rozhodne)
- [ ] v6.0 rebrand pro další turnaj - config.js, dropdown vítěze/střelce z `team_rosters` (budoucí)

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
