-- 17 · Blok 4: hardening — fixní search_path u všech SECURITY DEFINER funkcí.
-- Nasazeno přes apply_migration 30. 7. 2026. Uloženo sem pro dohledatelnost.
--
-- Důvod: SECURITY DEFINER funkce s mutable search_path jsou bezpečnostní riziko
-- (útočník může přesměrovat nekvalifikované odkazy na vlastní objekty). Supabase linter je hlásí.
--
-- Voleno `public, extensions`:
--   - public    = aplikační tabulky (hrace, tipy, app_secrets, ...)
--   - extensions = pgcrypto (crypt, gen_salt, digest) a uuid-ossp
-- Ověřeno, že ŽÁDNÁ z opravovaných funkcí neodkazuje na auth/cron/net/storage,
-- takže public+extensions pokrývá vše a nehrozí regrese. RLS ani gigs_ views se to netýká.
--
-- Bylo 41 funkcí bez search_path (ze 48 SECURITY DEFINER); po migraci 0.
-- Ověřeno voláním: registruj_hrace_secure, prihlasit_hrace_secure, get_reg_mode,
-- get_leaderboard_snapshot_secure, get_visible_tips_secure — vše funguje.

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proconfig is null
  loop
    execute 'alter function '||r.sig||' set search_path = public, extensions';
  end loop;
end $$;
