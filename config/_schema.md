# Config & seed schéma — rebrand-ready formát turnaje

Tento dokument popisuje formát konfiguračních a seed souborů, aby rebrand na nový
turnaj (EURO 2028, MS 2030, …) znamenal jen **editaci 4 souborů** + nový Supabase projekt.

Struktura pro turnaj `<id>` (např. `ms2026`, `euro2028`):

```
config/<id>.js                     # window.TOURNAMENT_CONFIG
assets/seed/<id>/teams.json        # týmy + skupiny
assets/seed/<id>/matches.json      # zápasy (skupiny + play-off)
assets/seed/<id>/stadiums.json     # stadiony
```

> ⚠️ **v6.2 = pouze groundwork.** Tyto soubory zatím žádný živý kód nenačítá —
> `tipovacka.html` (archiv MS 2026) má data stále hardcoded a **nesmí se měnit**.
> Loader (`tipovacka.html` čte z configu místo hardcoded polí) je budoucí krok,
> který se udělá až na klonu pro nový turnaj, ne na zmrazeném archivu.

---

## `config/<id>.js`

Přiřadí `window.TOURNAMENT_CONFIG` (načítá se `<script>` před hlavním kódem).

| klíč | typ | popis |
|---|---|---|
| `id` | string | identifikátor turnaje, shodný s názvem adresáře seedu |
| `name_cs` / `name_en` | string | název turnaje (dvojjazyčně) |
| `hosts_cs` / `hosts_en` | string[] | hostitelské země |
| `start_date` / `end_date` | string `YYYY-MM-DD` | první a poslední den turnaje |
| `team_count` / `match_count` | number | počty pro rychlé statistiky |
| `extra_tip_lock_at` | string ISO 8601 (UTC) | deadline extra tipů (default = start turnaje) |
| `scoring` | object | pravidla bodování (viz níže) |
| `champion` | string\|null | vítězný tým (po turnaji; předtím null) |
| `top_scorer` / `top_scorer_goals` | string\|null / number\|null | král střelců |
| `primary_color` / `gold` | string hex | akcentní barvy (odpovídají CSS variables) |
| `seed` | object | relativní cesty k seed JSON souborům |
| `stats` | object | finální souhrn `{players, matches, tips_total}` (pro landing/archiv) |

### `scoring`
| klíč | typ | výchozí MS 2026 | význam |
|---|---|---|---|
| `exact` | number | 10 | přesný výsledek |
| `winner_or_draw` | number | 3 | správný vítěz / remíza |
| `goal_diff_bonus` | number | 1 | navíc za správný rozdíl skóre |
| `playoff_advance` | number | 3 | play-off: u remízy po 90' za správného postupujícího |
| `extra_winner` | number | 30 | extra tip: vítěz turnaje |
| `extra_scorer` | number | 20 | extra tip: král střelců |
| `score_at` | string | `'90min'` | hodnotí se výsledek po základní hrací době (prodloužení se nepočítá) |

---

## `assets/seed/<id>/teams.json`

Pole týmů: `[{ code, name_cs, name_en, group }]`

| pole | typ | popis |
|---|---|---|
| `code` | string | stabilní slug (deterministicky z `name_cs`); lze nahradit FIFA kódem |
| `name_cs` / `name_en` | string | název týmu dvojjazyčně |
| `group` | string | písmeno skupiny (`A`–`L`) |

## `assets/seed/<id>/matches.json`

Pole zápasů: `[{ id, phase, group, round, team1, team2, datetime, venue }]`

| pole | typ | popis |
|---|---|---|
| `id` | number | pořadové ID zápasu (unikátní napříč celým turnajem) |
| `phase` | `'group'` \| `'playoff'` | fáze |
| `group` | string\|null | písmeno skupiny (jen `group`), jinak `null` |
| `round` | string\|null | kolo play-off (`16F`,`OF`,`CF`,`SF`,`O3`,`FIN`), jinak `null` |
| `team1` / `team2` | string | týmy; u play-off placeholdery pavouka (`2. sk.A`, `Vitez Z73`, …) |
| `datetime` | string `YYYY-MM-DDTHH:MM` | čas výkopu (wall-clock, přesně jako ve zdroji) |
| `venue` | string | „Město / Stadion" |

## `assets/seed/<id>/stadiums.json`

Pole stadionů: `[{ name, city, country, capacity_wc, capacity_std, usage, lat, lng, image, plan, wiki, address, home_cs, home_en, desc_cs, desc_en, fact_cs, fact_en }]`

Cesty `image` (`assets/stadiums/*.jpeg`) a `plan` (`assets/planky/*`) jsou relativní k rootu.
Pole `source_truncated: true` označuje řádek, který byl v původním `STAD` poli zkrácený
(chybí lat/lng/image) — u MS 2026 se to týká Levi's Stadium; foto přesto existuje v `assets/stadiums/levis.jpeg`.

---

## Generování a validace

```bash
node scripts/gen-seed-ms2026.mjs   # extrahuje seed z tipovacka.html (jen čte)
node scripts/validate-seed.mjs     # TEST GATE: seed == SZ/PZ/TEAMS v tipovacka.html
```

`validate-seed.mjs` je nezávislý parser — porovná počet/ID/týmy/datum/stadion/fázi
zápasů a úplnost skupin. Exit 0 = PASS. Pro nový turnaj napiš obdobu generátoru
(nebo seed vytvoř ručně dle schématu) a validaci přizpůsob novému zdroji dat.
