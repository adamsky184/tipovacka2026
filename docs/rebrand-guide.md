# Rebrand guide - jak appku použít na další turnaj

Aktuální v5.x je hardcoded na MS 2026. Pro Euro 2028 / MS 2030 / jakýkoli další turnaj následuj tyto kroky.

## Co je tournament-specific (musí se přepsat)

### V `tipovacka.html`

1. **APP_VERSION + APP_VERSION_DATE** (start scriptu) - drž semver
2. **`SZ` array** - seznam zápasů skupinové fáze ve formátu `[id, group_code, team_1, team_2, datetime_iso, ...]`
3. **`PZ` array** - seznam zápasů play-off (R16, QF, SF, F)
4. **Týmy a skupiny** - hardcoded v `<title>`, manifest, `T.cs/T.en` strings
5. **Stadiony** - JSON pole někde v JS s názvy a obrázky (v `assets/stadiums/`)
6. **Group constants** v edge funkci `fifa-ranking-refresh`
7. **`extra_tip_settings.lock_at`** v DB - kdy se uzavírají extra tipy (default = první zápas turnaje)
8. **Title, manifest name, theme color** v HTML head

### V configuracích

9. **Supabase projekt** - založit nový (žádné mixování hráčů mezi turnaji), nový anon key + URL do `SBU` / `SBK`
10. **GitHub repo** - `tipovacka2028` apod.
11. **GitHub Pages** - `https://adamsky184.github.io/tipovacka2028/tipovacka.html`
12. **PWA `start_url`** v `manifest.json`
13. **SW cache version** v `sw.js`

## Co se přesouvá / klonuje

| Co | Jak |
|---|---|
| Týmy | nový seed, ručně do `SZ`/`PZ` arrays + `TEAM_CODE_TO_APP_NAME` v edge funkci |
| Stadiony | nahradit v `assets/stadiums/` + update mapy v JS |
| Hráči | každý turnaj nová DB → hráči se znovu registrují (žádný carry-over) |
| Branding | colors v CSS variables (root), title v HTML, app_title v T.cs/T.en |

## Plán v6.0 (cestovní mapa pro snadný rebrand)

Aktuální v5.1 zatím vyžaduje editovat HTML. Verze v6.0 plánovaná **po MS 2026** udělá:

1. **`config.js`** - jediný soubor s tournament-specific daty:
   ```js
   window.TOURNAMENT_CONFIG = {
     id: 'ms2026',
     name_cs: 'MS 2026', name_en: 'World Cup 2026',
     start_date: '2026-06-11', end_date: '2026-07-19',
     hosts: ['USA', 'Kanada', 'Mexiko'],
     team_count: 48, match_count: 104,
     extra_tip_lock_at: '2026-06-11T19:00:00Z',
     primary_color: '#3b82f6',
     ...
   };
   ```

2. **`assets/seed/teams.json`** - týmy
3. **`assets/seed/matches.json`** - zápasy (SZ + PZ)
4. **`assets/seed/stadiums.json`** - stadiony

5. **Loader v HTML**: čte z těchto souborů místo hardcoded arrays

Po v6.0 rebrand = edit 4 souborů + nový Supabase projekt + nový GitHub repo. ~30 minut práce.

## Checklist pro nový turnaj (s v5.1, manuálně)

- [ ] Fork repo `tipovacka2026` → `tipovacka<rok>`
- [ ] Založit Supabase projekt (free tier), zaznamenat URL + anon key
- [ ] Aplikovat migrace v pořadí `backend/sql/02_*.sql` až `12_*.sql`
- [ ] Edit `tipovacka.html`:
  - [ ] `APP_VERSION = 'v1.0.0'`
  - [ ] `APP_VERSION_DATE_*`
  - [ ] `SBU` + `SBK`
  - [ ] `SZ` + `PZ` arrays
  - [ ] Title a manifest texts
  - [ ] T.cs/T.en strings (názvy, popis turnaje)
- [ ] Edit `manifest.json` (name, theme, start_url)
- [ ] Edit `sw.js` `CACHE_VERSION`
- [ ] Vyměnit fotky stadionů v `assets/stadiums/`
- [ ] Edit `backend/functions/fifa-ranking-refresh/index.ts` - `TEAM_CODE_TO_APP_NAME` + skupiny
- [ ] Deploy edge funkce (`fifa-ranking-refresh`, `results-refresh`, `teams-refresh`)
- [ ] Deploy `index.html` → GitHub Pages
- [ ] Test login, registrace, tip, refresh
- [ ] Update `spec.md` + `changelog.md`

## Komerční potenciál do budoucna

Tipovačka jako produkt: pokud se z toho má stát **šablona pro libovolný sportovní turnaj** (Tour de France, hokej, NBA finals, ...), pak:

- Generic data model (zatím hardcoded "fotbal")
- Tip formát konfigurovatelný (X:Y vs winner-only vs prediction set)
- Pravidla bodování v configu, ne kódu
- Multi-tenant - jeden hosting, víc turnajů, hráči si vyberou
- Subscription přes RevenueCat / Stripe
- White-label deploy pro firmy / kluby

Tohle je už větší product engineering, ne 1 sprint.
