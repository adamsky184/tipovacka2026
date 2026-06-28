-- v5.12.0: play-off = skore po 90 min + postupujici (+3 b)
-- 1) sloupce
alter table public.tipy add column if not exists postup text;           -- volba postupujiciho u remizoveho tipu 'H'/'A'
alter table public.vysledky add column if not exists postupujici text;   -- kdo realne postoupil 'H'/'A' (jen u remizy v 90')
-- 2) get_leaderboard_snapshot_secure: + advance_bonus 3 (viz git / Supabase definice)
-- 3) ulozit_tipy_secure: + p_postup default null (viz git / Supabase definice)
-- Pozn.: skore u play-off (zapas_id>=73) je nove 90 min (cron dopocita z ESPN linescores).
