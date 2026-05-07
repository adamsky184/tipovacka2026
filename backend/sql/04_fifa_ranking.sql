create table if not exists public.fifa_rankings_current (
  team_name text primary key,
  group_code text,
  rank integer not null,
  points numeric(10,2),
  change integer,
  confederation text,
  trend text not null default 'flat',
  official_release_at timestamptz,
  imported_at timestamptz not null default now(),
  source_url text,
  source_meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_fifa_rankings_current_rank
  on public.fifa_rankings_current(rank);

create table if not exists public.app_sync_statuses (
  key text primary key,
  last_updated_at timestamptz not null default now(),
  detail jsonb not null default '{}'::jsonb
);

alter table public.fifa_rankings_current enable row level security;
alter table public.app_sync_statuses enable row level security;

drop policy if exists "fifa_rankings_public_select" on public.fifa_rankings_current;
create policy "fifa_rankings_public_select"
on public.fifa_rankings_current
for select
using (true);

drop policy if exists "app_sync_statuses_public_select" on public.app_sync_statuses;
create policy "app_sync_statuses_public_select"
on public.app_sync_statuses
for select
using (true);

insert into public.app_sync_statuses(key, detail)
values ('fifa_ranking', '{}'::jsonb)
on conflict (key) do nothing;
