#!/usr/bin/env bash
# Health-check zalohy: porovna dump s produkci (pocet tabulek + pocet radku KAZDE tabulky)
# a zkontroluje velikost + kompletnost souboru. Nekontroluje exit status pg_dumpu, ale VYSLEDEK.
#
# Pouziti: SUPABASE_DB_URL='postgresql://...' ./scripts/db-verify-dump.sh backup.sql.gz
set -euo pipefail

# shellcheck source=scripts/db-conn.sh
. "$(dirname "$0")/db-conn.sh"    # nastavi a overi $PGURL
DUMP="${1:?Chybi cesta k dumpu (.sql.gz)}"
MIN_BYTES="${MIN_DUMP_BYTES:-500000}"   # brana na velikost: pod 500 kB je dump podezrele maly
MIN_TABLES="${MIN_TABLES:-30}"          # produkce: 26 Tipovacka + 12 gigs_ + auth
MIN_POLICIES="${MIN_POLICIES:-20}"
MIN_FUNCS="${MIN_FUNCS:-50}"

fail() { echo "❌ $*" >&2; exit 1; }

# --- 1) soubor existuje, ma rozumnou velikost, gzip je cely a validni ---
[ -f "$DUMP" ] || fail "dump neexistuje: $DUMP"
SIZE=$(wc -c < "$DUMP" | tr -d ' ')
echo "velikost dumpu: $SIZE B"
[ "$SIZE" -ge "$MIN_BYTES" ] || fail "dump je mensi nez limit ${MIN_BYTES} B (soubor: ${SIZE} B)"
gzip -t "$DUMP" || fail "gzip archiv je poskozeny"
zcat "$DUMP" | tail -5 | grep -q 'PostgreSQL database dump complete' \
  || fail "dump neni kompletni (chybi zaverecny marker 'PostgreSQL database dump complete')"

# --- 2) pocty radku na produkci (presne, jednim dotazem) ---
psql "$PGURL" -At -F$'\t' -v ON_ERROR_STOP=1 -c "
  select table_schema||'.'||table_name,
         (xpath('/row/cnt/text()',
                query_to_xml(format('select count(*) as cnt from %I.%I', table_schema, table_name),
                             false, true, '')))[1]::text::bigint
  from information_schema.tables
  where table_schema in ('public','auth') and table_type='BASE TABLE'
  order by 1;" | sort > /tmp/prod_counts.tsv

PROD_TABLES=$(wc -l < /tmp/prod_counts.tsv | tr -d ' ')
echo "tabulek na produkci (public+auth): $PROD_TABLES"
[ "$PROD_TABLES" -ge "$MIN_TABLES" ] || fail "zdroj hlasi jen $PROD_TABLES tabulek (limit $MIN_TABLES)"

# --- 3) pocty radku v dumpu (COPY bloky) ---
zcat "$DUMP" | awk '
  /^COPY /   { t=$2; gsub(/"/,"",t); incopy=1; n=0; next }
  incopy && /^\\\.$/ { print t"\t"n; incopy=0; next }
  incopy     { n++ }
' | sort > /tmp/dump_counts.tsv

DUMP_TABLES=$(wc -l < /tmp/dump_counts.tsv | tr -d ' ')
echo "tabulek s daty v dumpu: $DUMP_TABLES"

# --- 4) porovnani tabulka po tabulce ---
MISMATCH=0
while IFS=$'\t' read -r tbl cnt; do
  dcnt=$(awk -F'\t' -v t="$tbl" '$1==t {print $2}' /tmp/dump_counts.tsv | head -1)
  if [ -z "$dcnt" ]; then
    echo "❌ $tbl: v dumpu chybi COPY blok (produkce: $cnt radku)"; MISMATCH=1
  elif [ "$dcnt" != "$cnt" ]; then
    echo "❌ $tbl: produkce $cnt vs dump $dcnt"; MISMATCH=1
  fi
done < /tmp/prod_counts.tsv
[ "$MISMATCH" -eq 0 ] || fail "pocty radku nesedi (viz vyse)"

# --- 5) kontrola, ze jsou v dumpu obe appky + schema objekty ---
for t in public.hrace public.tipy public.vysledky public.gigs_concerts public.gigs_artists; do
  grep -q "^$t	" /tmp/prod_counts.tsv || fail "ocekavana tabulka $t na produkci neexistuje"
done
POLICIES=$(zcat "$DUMP" | grep -c '^CREATE POLICY' || true)
FUNCS=$(zcat "$DUMP" | grep -c '^CREATE FUNCTION' || true)
echo "RLS policies v dumpu: $POLICIES | funkci: $FUNCS"
[ "$POLICIES" -ge "$MIN_POLICIES" ] || fail "v dumpu je jen $POLICIES RLS policies (limit $MIN_POLICIES)"
[ "$FUNCS" -ge "$MIN_FUNCS" ] || fail "v dumpu je jen $FUNCS funkci (limit $MIN_FUNCS)"

TIPY=$(awk -F'\t' '$1=="public.tipy"{print $2}' /tmp/prod_counts.tsv)
GIGS=$(awk -F'\t' '$1=="public.gigs_concerts"{print $2}' /tmp/prod_counts.tsv)
echo "✅ Health-check OK: $PROD_TABLES tabulek, tipy=$TIPY radku, gigs_concerts=$GIGS radku, $POLICIES policies, $FUNCS funkci"
