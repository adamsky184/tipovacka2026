# Tipovačka MS 2026

PWA pro tipování fotbalového MS 2026 (USA / Kanada / Mexiko, 11. 6. - 19. 7. 2026).

**Live:** https://adamsky184.github.io/tipovacka2026/tipovacka.html

## Stack

Vanilla JS + single-file HTML PWA. Backend Supabase. Hosting GitHub Pages. Žádný build step.

## Struktura

```
tipovacka.html              entry point (= aktuální verze)
manifest.json               PWA manifest
sw.js                       service worker (offline-first)
assets/stadiums/            fotky stadionů + mapa
backend/sql/                SQL migrace (chronologicky 02 - 09)
backend/functions/          Supabase Edge Functions (Deno)
docs/                       deploy a další dokumentace
spec.md                     produktový a technický spec
changelog.md                historie verzí
.gitignore                  obsahuje archive/ (staré verze drženy lokálně)
```

## Lokální provoz

Žádný npm install. Otevři `tipovacka.html` lokálním HTTP serverem (kvůli service workeru):

```bash
python3 -m http.server 8080
# pak http://localhost:8080/tipovacka.html
```

## Deploy

Push do `main` na GitHub → GitHub Pages auto-deploy. URL musí zůstat `tipovacka.html` (PWA installs uživatelů jsou na ni vázané).

## Supabase

Projekt: `xzlebpzepnhkedlxntgv` (eu-west-1, free tier). Sdílí ho i GIGS appka - **migrace tipovačky se nesmí dotknout `gigs_*` tabulek a `gigs_*` funkcí**.

SQL aplikace v pořadí:

```
backend/sql/02_extra_tips_discussion.sql
backend/sql/04_fifa_ranking.sql
backend/sql/05_security_v4_7.sql
backend/sql/06_security_v4_8.sql
backend/sql/07_security_v4_9_4.sql
backend/sql/08_security_v5_0.sql
backend/sql/09_rls_fix.sql
```

(`01_core.sql` a `03_*` chybí jako historický artefakt - tipovačka core schema bylo aplikováno ad-hoc před zavedením verzování.)

## Edge funkce

- `fifa-ranking-refresh` - import FIFA ranking z inside.fifa.com (běží, deployed)

## Verze a footer

Aktuální verze a datum se čtou z konstant `APP_VERSION` a `APP_VERSION_DATE` v `tipovacka.html`. Footer pak ukazuje:

```
© Adam184 · v5.1.0 · 7. 5. 2026
```

## Rebrand pro budoucí turnaj

Aktuální v5.x je hardcoded na MS 2026. Pro Euro 2028 / MS 2030: fork repo, edit configu (tournament name, dates, hostitelé, týmy, zápasy), nasadit nový Supabase projekt, nový GitHub Pages.

Plán pro v6.0: vyčlenit tournament-specific data do `config.js` a separátních seedů v `backend/sql/seed_*.sql`, ať rebrand je jen edit těchto souborů.

## Dokumentace

- [spec.md](./spec.md) - produktový a technický spec
- [changelog.md](./changelog.md) - historie verzí
- [docs/deploy.md](./docs/deploy.md) - deploy postup
