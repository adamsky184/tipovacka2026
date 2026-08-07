-- 19 · v6.0.0 Landing hub: aditivní sloupce pro rozcestník turnajů.
-- Nasazeno přes apply_migration 8. 8. 2026 (schváleno Adamem). Uloženo sem pro dohledatelnost.

alter table public.turnaje
  add column if not exists status text default 'planned',   -- planned | active | archived
  add column if not exists url_path text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists icon text default '🏆';

update public.turnaje set status='archived', url_path='/tipovacka.html',
  start_date='2026-06-11', end_date='2026-07-19', icon='🏆'
  where id='ms2026';
