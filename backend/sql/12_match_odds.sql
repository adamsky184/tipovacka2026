-- v5.1.0 match_odds (7. 5. 2026)
-- Tabulka pro ulozeni kurzu na zapasy z The Odds API (free tier 500 calls/mesic).
-- Refresh strategie: 1x denne pres edge funkci odds-refresh nebo manualne adminem.

begin;

create table if not exists public.match_odds (
  zapas_id integer not null,
  bookmaker text not null,
  home_odds numeric(6,2),
  draw_odds numeric(6,2),
  away_odds numeric(6,2),
  fetched_at timestamptz not null default now(),
  primary key (zapas_id, bookmaker)
);

create index if not exists idx_match_odds_zapas on public.match_odds(zapas_id);

alter table public.match_odds enable row level security;

drop policy if exists "match_odds_public_select" on public.match_odds;
create policy "match_odds_public_select"
  on public.match_odds
  for select
  to anon
  using (true);

create or replace function public.admin_upsert_match_odds_secure(
  p_admin_id uuid,
  p_pin text,
  p_rows jsonb
)
returns json
language plpgsql
security definer
as $$
declare
  v_admin public.hrace%rowtype;
  v_count integer := 0;
begin
  v_admin := public.auth_hrac_secure_by_id(p_admin_id, p_pin);
  if v_admin.id is null then
    return json_build_object('chyba', 'Neplatny PIN');
  end if;
  if not coalesce(v_admin.je_admin, false) then
    return json_build_object('chyba', 'Pouze admin');
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    return json_build_object('chyba', 'Ocekava se array');
  end if;

  insert into public.match_odds (zapas_id, bookmaker, home_odds, draw_odds, away_odds, fetched_at)
  select
    (e->>'zapas_id')::integer,
    (e->>'bookmaker')::text,
    nullif(e->>'home_odds','')::numeric,
    nullif(e->>'draw_odds','')::numeric,
    nullif(e->>'away_odds','')::numeric,
    now()
  from jsonb_array_elements(p_rows) e
  where e ? 'zapas_id' and e ? 'bookmaker'
  on conflict (zapas_id, bookmaker) do update
    set home_odds = excluded.home_odds,
        draw_odds = excluded.draw_odds,
        away_odds = excluded.away_odds,
        fetched_at = excluded.fetched_at;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  return json_build_object('ok', true, 'imported', v_count);
end;
$$;

grant execute on function public.admin_upsert_match_odds_secure(uuid, text, jsonb) to anon;

commit;
