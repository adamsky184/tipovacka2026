#!/usr/bin/env bash
# Spolecny helper: nacte, znormalizuje a overi connection string na Supabase.
# Vstup:  SUPABASE_DB_URL  (fallback DB_URL kvuli lokalnimu spousteni)
# Vystup: exportovana promenna PGURL  -> vzdy pouzivat jako  pg_dump "$PGURL" / psql "$PGURL"
#
# NIKDY nevypisuje hodnotu (obsahuje heslo). Do logu jdou jen odvozene vlastnosti,
# aby se dala diagnostikovat spatne ulozena hodnota bez jejiho odhaleni.

_raw="${SUPABASE_DB_URL:-${DB_URL:-}}"

if [ -z "$_raw" ]; then
  echo "❌ Chybi secret SUPABASE_DB_URL (v job kroku musi byt: env: SUPABASE_DB_URL: \${{ secrets.SUPABASE_DB_URL }})" >&2
  exit 1
fi

# 1) odstran CR (Windows konce radku), zalomeni a bile znaky na okrajich
_v="$(printf '%s' "$_raw" | tr -d '\r\n' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
# 2) odstran obalujici uvozovky, kdyby se zkopirovaly s hodnotou
_v="${_v#\"}"; _v="${_v%\"}"
_v="${_v#\'}"; _v="${_v%\'}"
# 3) kdyby se ulozil cely prikaz (napr. `psql "postgresql://..."`), vytahni z nej URI
case "$_v" in
  postgres://*|postgresql://*) : ;;
  *)
    _extracted="$(printf '%s' "$_v" | grep -oE 'postgres(ql)?://[^"'"'"' ]+' | head -1 || true)"
    [ -n "$_extracted" ] && _v="$_extracted"
    ;;
esac

# --- diagnostika bez odhaleni hodnoty ---
_len=${#_v}
_scheme="${_v%%://*}"
_hostport="${_v##*@}"; _hostport="${_hostport%%/*}"
_host="${_hostport%%:*}"; _port="${_hostport##*:}"
_hostmask="$(printf '%s' "$_host" | sed -E 's/^(.{4}).*(\..{2,12})$/\1***\2/')"
echo "connection string: delka=${_len}, schema=${_scheme}, host=${_hostmask}, port=${_port}"

# --- validace ---
case "$_v" in
  postgres://*|postgresql://*) : ;;
  *)
    echo "❌ SUPABASE_DB_URL nema tvar connection stringu." >&2
    echo "   Ocekava se: postgresql://postgres.<ref>:<heslo>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres" >&2
    echo "   Supabase dashboard -> Project Settings -> Database -> Connection string -> Session pooler." >&2
    echo "   Uloz BEZ uvozovek, bez prefixu 'psql' a bez zalomeni radku:" >&2
    echo "   printf '%s' 'postgresql://...' | gh secret set SUPABASE_DB_URL --repo adamsky184/tipovacka2026" >&2
    exit 1
    ;;
esac
if [ "$_host" = "" ] || [ "$_host" = "$_v" ]; then
  echo "❌ V connection stringu chybi host (cast za '@')." >&2
  exit 1
fi
if [ "$_host" = "localhost" ] || [ "$_host" = "127.0.0.1" ]; then
  echo "❌ Connection string ukazuje na localhost — to neni produkcni Supabase." >&2
  exit 1
fi
case "$_v" in
  *"[YOUR-PASSWORD]"*|*"<heslo>"*|*"YOUR_PASSWORD"*)
    echo "❌ V connection stringu je nevyplneny zastupny text pro heslo." >&2
    exit 1
    ;;
esac

export PGURL="$_v"
