#!/usr/bin/env bash
# Zaloha CELEHO sdileneho Supabase projektu xzlebpzepnhkedlxntgv.
#
# POZOR: projekt je SDILENY dvema aplikacemi:
#   - Tipovacka MS 2026 (tabulky bez prefixu: hrace, tipy, vysledky, ...)
#   - GIGS (tabulky s prefixem gigs_)
# Tenhle dump pokryva OBE appky. GIGS vlastni zalohu NEMA.
#
# Pouziti:  SUPABASE_DB_URL='postgresql://...' ./scripts/db-dump.sh [vystupni_soubor.sql.gz]
# SUPABASE_DB_URL = Session pooler connection string (IPv4, port 5432) ze Supabase dashboardu.
set -euo pipefail

# shellcheck source=scripts/db-conn.sh
. "$(dirname "$0")/db-conn.sh"    # nastavi a overi $PGURL

OUT="${1:-backup_$(date -u +%Y%m%d_%H%M%S).sql.gz}"

# --schema=public : obe appky (Tipovacka i gigs_)
# --schema=auth   : Supabase Auth (uzivatele) - Tipovacka ho nepouziva, GIGS/budoucnost muze
# Bez --no-owner / --no-privileges: dump je plnohodnotny vcetne vlastnictvi, GRANTu a RLS policies,
# aby sel obnovit do noveho Supabase projektu 1:1. Restore do holeho Postgresu resi restore-test
# (predvytvori role a odfiltruje extension pg_net) - viz docs/restore.md.
pg_dump "$PGURL" \
  --schema=public \
  --schema=auth \
  --no-sync \
  --quote-all-identifiers \
  --verbose \
  2> >(grep -v '^pg_dump: dumping contents of table' >&2) \
  | gzip -9 > "$OUT"

echo "$OUT"
