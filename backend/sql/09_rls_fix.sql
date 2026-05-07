-- Immediate RLS hardening for TIPOVACKA MS 2026
-- Safe version: keeps public SELECT where the current app depends on it,
-- but removes direct anon writes and enables RLS on all affected tables.

alter table if exists public.extra_tips enable row level security;
alter table if exists public.extra_tip_settings enable row level security;
alter table if exists public.discussion_posts enable row level security;
alter table if exists public.discussion_reactions enable row level security;

drop policy if exists "extra_tips_public_select" on public.extra_tips;
create policy "extra_tips_public_select"
on public.extra_tips
for select
to anon
using (true);

drop policy if exists "extra_tip_settings_public_select" on public.extra_tip_settings;
create policy "extra_tip_settings_public_select"
on public.extra_tip_settings
for select
to anon
using (true);

drop policy if exists "discussion_posts_public_select" on public.discussion_posts;
create policy "discussion_posts_public_select"
on public.discussion_posts
for select
to anon
using (true);

drop policy if exists "discussion_reactions_public_select" on public.discussion_reactions;
create policy "discussion_reactions_public_select"
on public.discussion_reactions
for select
to anon
using (true);

revoke insert, update, delete on public.extra_tips from anon;
revoke insert, update, delete on public.extra_tip_settings from anon;
revoke insert, update, delete on public.discussion_posts from anon;
revoke insert, update, delete on public.discussion_reactions from anon;
revoke usage, select on sequence public.discussion_posts_id_seq from anon;

grant select on public.extra_tips to anon;
grant select on public.extra_tip_settings to anon;
grant select on public.discussion_posts to anon;
grant select on public.discussion_reactions to anon;

-- NOTE:
-- Writes continue to work through the existing SECURITY DEFINER RPC functions:
--   public.ulozit_extra_tipy_secure(...)
--   public.admin_upsert_extra_results_secure(...)
--   public.admin_upsert_extra_tip_secure(...)
--   public.discussion_save_post_secure(...)
--   public.discussion_delete_post_secure(...)
--   public.discussion_toggle_reaction_secure(...)
--
-- Stronger hardening is possible later by removing public SELECT from
-- extra_tips and/or discussion tables and replacing direct table reads
-- with filtered RPCs.
