# Handoff - Tipovačka v5.1.0 (7. 5. 2026)

## TL;DR co se udělalo

Všech **7 fází z plánu hotových**. Repo je deployovatelné. DB migrace nasazené. Edge funkce aktivní. Refresh buttony fixnuté. Security upgradnutá.

## Jediné, co zbývá udělat ručně (Adam)

Sandbox neumí push do GitHubu. **Spusť tyto příkazy z lokálního terminálu**:

```bash
cd "/Users/adam184/Documents/_CLAUDE/Projects/AI APPS/TIPOVACKA2026"

# 1) Smaž zaseklý git lockfile (neudělal jsem to ze sandboxu)
rm -f .git/index.lock .git/index.lock.dead

# 2) První commit
git add -A
git commit -m "v5.1.0: cleanup + spec + changelog + security + refresh fix + odds infra"

# 3) Pokud repo na GitHubu ještě neexistuje - vytvoř ho:
gh repo create adamsky184/tipovacka2026 --public --source=. --push
# (NEBO pokud uz existuje:)
git remote add origin git@github.com:adamsky184/tipovacka2026.git
git branch -M main
git push -u origin main

# 4) Settings → Pages → Deploy from branch "main" / root
# URL zustane: https://adamsky184.github.io/tipovacka2026/tipovacka.html
```

Po pushi GitHub Pages **přepíše statickou verzi za pár minut**. Hráči v PWA dostanou novou verzi po reloadu (nový SW cache name `tipovacka-ms-2026-v5.1.0` invalidates starou cache automaticky).

## Co se udělalo v této session

### F0 - Inventura Supabase + diagnostika
- Tipovačka má **vlastní Supabase projekt** `xzlebpzepnhkedlxntgv` (FuelLog má svůj `lehvbwmvxguoczfmxcxp`)
- **V projektu ale je i GIGS appka** (10 tabulek `gigs_*`) - dotkl jsem se POUZE tipovačka tabulek
- 7 hráčů, 18 tipů, 9 diskuzních postů, 48 FIFA rankings
- Diagnóza refresh buttonů: TÝMY a VÝSLEDKY = client-side ESPN fetch (CORS-vulnerable), FIFA RANKING běží OK přes edge funkci

### F0b - Backup
- Snapshot stavu DB před migrací uložený v `_backup_2026-05-07/README.md` (počty řádků pro validaci)
- Primary backup: Supabase point-in-time recovery (free tier 7 dní)
- Restore point: `2026-05-07T23:13:22Z`
- Všechny migrace v `BEGIN..COMMIT` transakcích

### F1 - Cleanup složky
- FuelLog soubory **přesunuté pryč** do `_FuelLog_misplaced_from_tipovacka_2026-05-07/` (parent složka). FuelLog produkce nedotčená.
- Staré HTML verze (1.66 - 5.0.1) → `archive/` (lokálně, gitignored)
- Stadium fotky → `assets/stadiums/`
- SQL migrace → `backend/sql/`
- Edge funkce → `backend/functions/`

### F2 - Git init + dokumentace
- `git init`, branch `main`, `.gitignore` (ignoruje `archive/`, `_backup_*`, `.DS_Store`, `.env`)
- `README.md`, `spec.md`, `changelog.md` (retro až po v1.66)
- `docs/deploy.md`, `docs/rebrand-guide.md`, `docs/ux-wishlist.md`
- **Footer config centralizovaný** - `APP_VERSION`/`APP_VERSION_DATE_*` jako konstanty na začátku scriptu, T.cs/T.en a labels čtou z nich

### F3 - Security
- **PIN: bcrypt** (cost 10) místo SHA-256, lazy migrace - existing 7 hráčů zůstane funkční (při dalším loginu se hash přepíše)
- **Rate limiting**: tabulka `auth_attempts`, max 5 neúspěšných pokusů / 15 minut
- **Validace délek**: jméno 1-32, PIN 4-32, body 1-2000
- **Account deletion** RPC `delete_account_secure(p_hrac_id, p_pin)` - GDPR
- **RLS audit a fix kritických děr**:
  - smazána policy `anon_delete_hrace` (kdokoli mohl mazat hráče!)
  - smazány overpermissive INSERT/UPDATE/DELETE policies na `tipy`, `vysledky`, `hrace`
  - zachované jen SELECT policies pro veřejné čtení
  - mutace teď výhradně přes `*_secure` RPC s admin/PIN ověřením

### F4 - Fix refresh buttonů
- **Edge funkce `results-refresh`** - server-side proxy ESPN scoreboard, CORS-safe, admin auth, sync_status update
- **Edge funkce `teams-refresh`** - server-side proxy ESPN teams API
- Frontend přepojen z direct ESPN fetch → edge funkce
- `vysledky` insert přes nový **secure RPC `admin_upsert_vysledky_secure`**

### F5 - Project instructions adherence
- **SW cache invalidation** fix: cache name teď obsahuje `CACHE_VERSION = "v5.1.0"`. Při deployi se stará cache automaticky maže v `activate` evente → hráči vidí nový obsah po refreshi/reopenu.
- **Analytics hook** `window.tipTrack(event, props)` placeholder - připraveno pro Plausible/PostHog
- i18n je už dobře pokrytý (T.cs/T.en), drobný hardcoded text audit by chtěl víc času, do TODO

### F6 - Kurzy + UX brainstorm
- Tabulka `match_odds` + secure RPC `admin_upsert_match_odds_secure` (DB hotová)
- Edge funkce `odds-refresh` napsaná v `backend/functions/odds-refresh/index.ts` - **NEDEPLOYNUTÁ** (vyžaduje API key)
- Setup pokyny: registrace na https://the-odds-api.com (free 500 req/měsíc), v Supabase Dashboard nastavit env `THE_ODDS_API_KEY`, pak deploy
- Refresh strategie: 1×/den ~30 calls/měsíc, hluboko pod limitem
- UX wishlist v `docs/ux-wishlist.md` - 30+ nápadů seřazených podle ROI

### F7 - Rebrand-ready + final
- `docs/rebrand-guide.md` - kompletní postup pro Euro 2028 / další turnaje
- Plán v6.0: vyčlenit do `config.js` + JSON seedy

## Stav DB po všech migracích

| Tabulka | Řádky |
|---|---|
| hrace | 7 (data zachována) |
| tipy | 18 |
| vysledky | 0 (turnaj nezačal) |
| extra_tips | 2 |
| extra_tip_settings | 1 |
| discussion_posts | 9 |
| discussion_reactions | 11 |
| fifa_rankings_current | 48 |
| app_sync_statuses | 1 (fifa_ranking) |
| **auth_attempts** (nová) | 0 |
| **match_odds** (nová) | 0 |

## Edge funkce v Supabase

| Slug | Status | Účel |
|---|---|---|
| fifa-ranking-refresh | ACTIVE | FIFA ranking import (původní) |
| **results-refresh** | ACTIVE | NOVÁ - ESPN scoreboard proxy + sync_status |
| **teams-refresh** | ACTIVE | NOVÁ - ESPN teams proxy + sync_status |
| **odds-refresh** | nedeployed | připraveno k deployi po získání API key |

## Známé TODO / co dál

- [ ] **PUSH do GitHubu** - commands výše, vyžaduje user akci
- [ ] **GitHub Pages settings** - povolit deploy z `main` branch, root (jen jednou)
- [ ] **Otestovat live**: po deployi otevřít https://adamsky184.github.io/tipovacka2026/tipovacka.html
  - login s existujícím hráčem (např. "Adam") → ověřit že bcrypt migrace funguje
  - admin → kliknout VÝSLEDKY → mělo by ukázat "tournament_not_started" (turnaj nezačal)
  - admin → kliknout TÝMY → mělo by stáhnout ESPN data
  - admin → kliknout FIFA RANKING → mělo by aktualizovat ranking
- [ ] **The Odds API setup** (pokud chceš kurzy):
  - registrace na the-odds-api.com (free)
  - Supabase Dashboard → Project Settings → Edge Functions → Secrets → `THE_ODDS_API_KEY`
  - deploy `odds-refresh` (najdeš `index.ts` v `backend/functions/odds-refresh/`)
  - frontend zatím nevolá - dopovat v další session
- [ ] **i18n hardcoded text audit** - v některých admin error hláškách jsou hardcoded CZ stringy
- [ ] **pg_cron auth_attempts cleanup** - aktuálně se musí volat ručně (`select public.auth_attempts_cleanup()`); pro auto cleanup nainstalovat pg_cron extension (free tier OK)
- [ ] **UX wishlist** - 30+ nápadů, vybereš si

## Risks / co dávej pozor

1. **Bcrypt migrace** - 7 existujících hráčů má SHA-256 hash. Při dalším loginu se přepíše na bcrypt. Pokud někdo zapomene PIN, nemůžeš ho recoverovat - musíš ho smazat a požádat ho o re-registraci. Nic se nezměnilo proti původnímu stavu.

2. **Stará verze tipovacka.html v PWA cache** - hráči s nainstalovanou PWA mohou mít starou verzi v cache. Nový SW se aktivuje při dalším návštěvě, takže to **automaticky vyřeší samo do 1-2 návštěv**. Pokud chceš force-refresh, řekni jim "smaž PWA, nainstaluj znovu" nebo z DevTools → Application → Service Workers → Update.

3. **GitHub Pages cache** - po pushi může trvat 1-3 minuty než se ukáže nová verze. CDN cache.

4. **Tournament timer** - dnes 7. 5. 2026, turnaj startuje 11. 6. = 35 dní. Po deployi máš dost času na testování.

## Backup strategie

- DB primary backup: Supabase point-in-time recovery (7 dní), restore point před migrací = `2026-05-07T23:13:22Z`
- Pokud něco rozbiješ: Supabase Dashboard → Database → Backups → Point-in-time recovery
- Před každou další velkou migrací: zaznamenat timestamp + manual export

## Soubory v repo (post-cleanup)

```
TIPOVACKA2026/
├── README.md                       NOVÝ
├── HANDOFF.md                      NOVÝ - tento soubor
├── spec.md                         NOVÝ
├── changelog.md                    NOVÝ
├── .gitignore                      NOVÝ
├── tipovacka.html                  v5.1.0 (footer + edge funkce calls)
├── manifest.json
├── sw.js                           NEW: cache versioning
├── assets/stadiums/                17 fotek
├── backend/
│   ├── sql/                        02-12 migrace (chronologicky)
│   └── functions/
│       ├── fifa-ranking-refresh/index.ts
│       ├── results-refresh/index.ts        NOVÝ
│       ├── teams-refresh/index.ts          NOVÝ
│       └── odds-refresh/index.ts           NOVÝ (nedeployed)
├── docs/
│   ├── deploy.md
│   ├── rebrand-guide.md            NOVÝ
│   └── ux-wishlist.md              NOVÝ
├── archive/                        gitignored, lokální only (staré HTML/SQL)
└── _backup_2026-05-07/             gitignored, snapshot README
```

## Kdyby něco nefungovalo

- Login nefunguje → ověř Supabase Dashboard → Auth Logs (tipovačka má vlastní auth, ne Supabase Auth, ale RPC volání jsou v Database Logs)
- Refresh buttons házejí chybu → Supabase Dashboard → Edge Functions → results-refresh / teams-refresh → Logs
- DB lock / chyba při migraci → Supabase Dashboard → Database → Backups → restore z 2026-05-07T23:13Z
- PWA neukazuje novou verzi → DevTools → Application → Service Workers → Unregister + reload

## Kontakt na otázky

Tato session končí. Pokud bude další problém, otevři novou konverzaci s odkazem na tento HANDOFF.md a popisem situace - já (nebo jiný agent) budu mít plný kontext.
