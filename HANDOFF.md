# Handoff - Tipovačka

**Aktuální verze:** v6.1.0 landing (tipovacka.html archiv zůstává v6.0.0) · 8. 8. 2026
**Poslední session:** 8. 8. 2026

## Kde jsme
MS 2026 dohráno a archivováno. **Landing `/` (index.html) přepracován na world-class low-poly** (v6.1.0): skutečné logo, faceted grafika, hero stat ticker s count-up, teasery AFCON 2027 + EURO 2028 s předběžným zájmem (RPC → `turnaj_zajem`), pódium síň slávy, all-time žebříček všech hráčů, 6 statistik. Archiv MS 2026 na `/ms2026` (= `/tipovacka.html`, PWA installs zachovány, nezměněn). Supabase (`xzleb…` SDÍLENÝ s GIGS) + Vercel. Zálohované, footer AYDEA.

## Otevřené úkoly
- [ ] **Branch `feat/v6.2-rebrand-ready` čeká na review + merge** (rebrand-ready config/seed + teaser stránky AFCON/EURO). Viz `docs/OVERNIGHT-REPORT.md`. Produkce zůstává v6.1.0, nic nenasazeno.
- [x] Landing hub v6.0 (v6.0.0) + world-class redesign v6.1 (v6.1.0)
- [ ] Sprint 2 v6.1+: config.js + seed JSONs (rebrand-ready pro další turnaj)
- [ ] Až se rozjede AFCON/EURO: samostatné stránky `/AFCON2027` `/EURO2028` (dnes teaser vede na předběžný zájem); e-maily zájemců v `turnaj_zajem`
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
