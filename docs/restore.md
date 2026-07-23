# Záloha a obnova databáze

> **Tahle záloha kryje DVĚ aplikace.** Supabase projekt `xzlebpzepnhkedlxntgv` je sdílený:
> **Tipovačka MS 2026** (tabulky bez prefixu) a **GIGS** (tabulky `gigs_*`).
> GIGS si vlastní zálohu **nedělá** — pokud tenhle repozitář přestane zálohovat, přijdou o data obě appky.
> Stejně tak keep-alive (`/api/keepalive`, Vercel cron) drží vzhůru celý projekt, tedy i GIGS.

## Co se zálohuje

| | |
|---|---|
| Projekt | `xzlebpzepnhkedlxntgv` (region eu-west-1, Postgres 17) |
| Schémata | `public` (Tipovačka 26 tabulek + GIGS 12 tabulek) a `auth` (Supabase Auth) |
| Obsah dumpu | tabulky, data, funkce (RPC), RLS policies, GRANTy, vlastnictví |
| Kde běží | GitHub Actions v tomto repu — `.github/workflows/db-backup.yml` |
| Kdy | denně 03:15 UTC + ručně (`workflow_dispatch`) |
| Kam | artefakt běhu, retence **7 dní** |
| Ověření | `scripts/db-verify-dump.sh` po každém dumpu (viz níže) |

Co se **nezálohuje**: Storage buckety (appky je nepoužívají), Edge Functions (jsou v gitu ve
`backend/functions/`), schémata `storage`, `vault`, `cron` a nastavení projektu.

## Jednorázové nastavení (nutné jednou)

1. V Supabase dashboardu → **Project Settings → Database → Connection string → Session pooler**
   (port 5432, IPv4 — přímé připojení `db.<ref>.supabase.co` je na free tieru jen IPv6 a z GitHub
   Actions nefunguje). Zkopíruj celý řetězec včetně hesla.
2. Ulož ho jako secret repozitáře — heslo se nikam nevypisuje:

   ```bash
   gh secret set SUPABASE_DB_URL --repo adamsky184/tipovacka2026
   ```

   (příkaz se na hodnotu zeptá interaktivně; alternativně GitHub → Settings → Secrets and
   variables → Actions → New repository secret, název `SUPABASE_DB_URL`)
3. Spusť ověřovací běhy:

   ```bash
   gh workflow run "DB backup (Tipovačka + GIGS)" --repo adamsky184/tipovacka2026
   gh workflow run "DB restore test (čistá DB)"   --repo adamsky184/tipovacka2026
   ```

## Health-check (co všechno se kontroluje)

`scripts/db-verify-dump.sh` neověřuje jen návratový kód `pg_dump`, ale **výsledek**:

- soubor existuje, je větší než `MIN_DUMP_BYTES` (default 500 kB) a gzip není poškozený,
- dump končí markerem `PostgreSQL database dump complete` (tj. nebyl useknutý),
- produkce hlásí aspoň 30 tabulek v `public`+`auth`,
- **počet řádků každé tabulky v dumpu == počet řádků na produkci** (COPY bloky vs `count(*)`),
- v dumpu jsou obě appky (`public.hrace`, `public.tipy`, `public.vysledky`, `public.gigs_concerts`,
  `public.gigs_artists`), aspoň 20 RLS policies a aspoň 50 funkcí.

Když cokoli neodpovídá, workflow **spadne** a artefakt se nenahraje (žádné falešně zelené zálohy).

## Restore test

`.github/workflows/db-restore-test.yml` (týdně + ručně) udělá čerstvý dump, nahraje ho do
prázdného `postgres:17` kontejneru a porovná s produkcí: počty řádků všech tabulek (`diff`),
počet RLS policies, počet tabulek s RLS a počet funkcí. Před obnovou předvytvoří Supabase role
a schéma `extensions` (pgcrypto, uuid-ossp) a odfiltruje `pg_net` (Supabase-only extension,
v holém Postgresu neexistuje a na data nemá vliv).

## Ruční obnova

### A) Do nového Supabase projektu (ostrý disaster recovery)

```bash
# 1. stáhni poslední artefakt
gh run download --repo adamsky184/tipovacka2026 -n <nazev_artefaktu> -D ./restore
cd restore && gunzip tipovacka-gigs_*.sql.gz

# 2. nový projekt v Supabase (stejný region eu-west-1), vezmi jeho Session pooler URL
export NEW_URL='postgresql://postgres.<novy_ref>:<heslo>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'

# 3. obnova (role i schéma extensions už na Supabase existují)
psql "$NEW_URL" -v ON_ERROR_STOP=0 -f tipovacka-gigs_*.sql

# 4. kontrola
psql "$NEW_URL" -At -c "select count(*) from public.tipy"
psql "$NEW_URL" -At -c "select count(*) from public.gigs_concerts"
psql "$NEW_URL" -At -c "select count(*) from pg_policies where schemaname='public'"
```

Pak přepiš `SBU`/anon klíč na nový projekt v `tipovacka.html` (konstanty `SBU`, `SBK`),
v `api/keepalive.js` a v GIGS appce, znovu nasaď Edge Functions z `backend/functions/`
a obnov pg_cron joby, pokud budou zase potřeba.

### B) Do lokálního Postgresu (jen prohlédnout data)

```bash
createdb tipovacka_restore
psql tipovacka_restore -c "create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;"
gunzip -c tipovacka-gigs_*.sql.gz | grep -v 'pg_net' | psql tipovacka_restore -v ON_ERROR_STOP=0
```

Chyby typu `role "supabase_admin" does not exist` jsou v holém Postgresu očekávané a týkají se
jen vlastnictví/GRANTů — data a RLS policies se obnoví (přesně to ověřuje restore test).

## Doporučení

Artefakty mají retenci 7 dní. Jednou za čas (např. po turnaji nebo před větším zásahem do dat)
stáhni dump a ulož ho i mimo GitHub — do složky `archive/` (je v `.gitignore`) nebo do cloudu.
