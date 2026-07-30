-- 18 · Dedikovaná read-only role pro zálohu (Blok 1 dokončení).
-- Nasazeno přes apply_migration 30. 7. 2026. Uloženo sem pro dohledatelnost.
--
-- Proč vlastní role (a ne superuser postgres): least-privilege. Role umí jen ČÍST
-- (pg_read_all_data) a obejít RLS při čtení (BYPASSRLS — jinak pg_dump spadne na
-- auth.audit_log_entries). Nic nemění. Reset hesla role postgres přes API/query nejde
-- (jen superuser), a je zbytečně silný.
--
-- Přihlášení pro pg_dump přes Session pooler:
--   postgresql://tipovacka_backup.xzlebpzepnhkedlxntgv:<HESLO>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
-- Heslo je uloženo v GitHub secretu SUPABASE_DB_URL a v macOS keychainu
-- (service 'tipovacka-supabase-db-url'). Do gitu se NIKDY nedává.
--
-- Bezpečné vůči GIGS i keep-alive: obě jedou přes PostgREST + JWT (anon/service_role),
-- přímé Postgres připojení (a tedy tuto roli) používá jen záloha.

create role tipovacka_backup with login password '<NASTAVENO_MIMO_GIT>';
grant pg_read_all_data to tipovacka_backup;
alter role tipovacka_backup bypassrls;

-- Rotace hesla (kdyby bylo potřeba):
--   alter role tipovacka_backup password '<nove>';
--   -> pak aktualizovat GitHub secret SUPABASE_DB_URL i keychain záznam.
