create or replace function public.get_visible_tips_secure(
  p_hrac_id uuid,
  p_pin text
)
returns table(hrac_id uuid, zapas_id integer, tip text)
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    raise exception 'Neplatný PIN';
  end if;

  if coalesce(v_hrac.je_admin, false) then
    return query
    select t.hrac_id, t.zapas_id, t.tip
      from public.tipy t
     order by t.zapas_id, t.hrac_id;
  else
    return query
    with own_matches as (
      select distinct t.zapas_id
        from public.tipy t
       where t.hrac_id = p_hrac_id
    )
    select t.hrac_id, t.zapas_id, t.tip
      from public.tipy t
     where t.hrac_id = p_hrac_id
        or t.zapas_id in (select zapas_id from own_matches)
     order by t.zapas_id, t.hrac_id;
  end if;
end;
$$;

create or replace function public.get_tip_trends_secure(
  p_hrac_id uuid,
  p_pin text
)
returns table(
  zapas_id integer,
  home_count integer,
  draw_count integer,
  away_count integer,
  total_count integer
)
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    raise exception 'Neplatný PIN';
  end if;

  return query
  select
    t.zapas_id,
    sum(case when split_part(t.tip, ':', 1)::int > split_part(t.tip, ':', 2)::int then 1 else 0 end)::int as home_count,
    sum(case when split_part(t.tip, ':', 1)::int = split_part(t.tip, ':', 2)::int then 1 else 0 end)::int as draw_count,
    sum(case when split_part(t.tip, ':', 1)::int < split_part(t.tip, ':', 2)::int then 1 else 0 end)::int as away_count,
    count(*)::int as total_count
  from public.tipy t
  where t.hrac_id <> p_hrac_id
    and t.tip ~ '^\d{1,2}:\d{1,2}$'
  group by t.zapas_id
  order by t.zapas_id;
end;
$$;

create or replace function public.get_leaderboard_snapshot_secure(
  p_hrac_id uuid,
  p_pin text,
  p_phase text default 'cel'
)
returns table(
  hrac_id uuid,
  jmeno text,
  je_admin boolean,
  total integer,
  pre integer,
  spr integer,
  dif integer,
  spa integer,
  hod integer,
  uzam integer,
  recent_exact integer,
  recent_points integer,
  draw_hits integer,
  history jsonb
)
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_phase text;
  v_from_id integer;
  v_to_id integer;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    raise exception 'Neplatný PIN';
  end if;

  v_phase := lower(coalesce(p_phase, 'cel'));
  if v_phase = 'sk' then
    v_from_id := 1;
    v_to_id := 72;
  elsif v_phase = 'po' then
    v_from_id := 73;
    v_to_id := 104;
  else
    v_phase := 'cel';
    v_from_id := 1;
    v_to_id := 104;
  end if;

  return query
  with match_scope as (
    select generate_series(v_from_id, v_to_id)::int as zapas_id
  ),
  base as (
    select
      h.id as hrac_id,
      h.jmeno,
      coalesce(h.je_admin, false) as je_admin,
      m.zapas_id,
      t.tip,
      r.skore,
      case
        when t.tip is null or r.skore is null then 0
        when split_part(t.tip, ':', 1)::int = split_part(r.skore, ':', 1)::int
         and split_part(t.tip, ':', 2)::int = split_part(r.skore, ':', 2)::int then 10
        when sign(split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
           = sign(split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int)
         and (split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
           = (split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int) then 4
        when sign(split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
           = sign(split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int) then 3
        else 0
      end as pts,
      case
        when t.tip is not null and r.skore is not null
         and split_part(t.tip, ':', 1)::int = split_part(r.skore, ':', 1)::int
         and split_part(t.tip, ':', 2)::int = split_part(r.skore, ':', 2)::int then 1 else 0
      end as exact_hit,
      case
        when t.tip is not null and r.skore is not null
         and not (
           split_part(t.tip, ':', 1)::int = split_part(r.skore, ':', 1)::int
           and split_part(t.tip, ':', 2)::int = split_part(r.skore, ':', 2)::int
         )
         and sign(split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
           = sign(split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int)
        then 1 else 0
      end as trend_hit,
      case
        when t.tip is not null and r.skore is not null
         and not (
           split_part(t.tip, ':', 1)::int = split_part(r.skore, ':', 1)::int
           and split_part(t.tip, ':', 2)::int = split_part(r.skore, ':', 2)::int
         )
         and sign(split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
           = sign(split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int)
         and (split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
           = (split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int)
        then 1 else 0
      end as diff_bonus,
      case
        when t.tip is not null and r.skore is not null
         and (
           case
             when split_part(t.tip, ':', 1)::int = split_part(r.skore, ':', 1)::int
              and split_part(t.tip, ':', 2)::int = split_part(r.skore, ':', 2)::int then 10
             when sign(split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
                = sign(split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int)
              and (split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
                = (split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int) then 4
             when sign(split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
                = sign(split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int) then 3
             else 0
           end
         ) = 0 then 1 else 0
      end as wrong_hit,
      case when t.tip is not null then 1 else 0 end as saved_tip,
      case when t.tip is not null and r.skore is not null then 1 else 0 end as rated_tip,
      case
        when t.tip is not null and r.skore is not null
         and split_part(t.tip, ':', 1)::int = split_part(t.tip, ':', 2)::int
         and split_part(r.skore, ':', 1)::int = split_part(r.skore, ':', 2)::int
         and (
           sign(split_part(t.tip, ':', 1)::int - split_part(t.tip, ':', 2)::int)
           = sign(split_part(r.skore, ':', 1)::int - split_part(r.skore, ':', 2)::int)
         ) then 1 else 0
      end as draw_hit
    from public.hrace h
    cross join match_scope m
    left join public.tipy t
      on t.hrac_id = h.id
     and t.zapas_id = m.zapas_id
    left join public.vysledky r
      on r.zapas_id = m.zapas_id
  ),
  recent_ranked as (
    select
      b.hrac_id,
      b.pts,
      b.exact_hit,
      row_number() over (partition by b.hrac_id order by b.zapas_id desc) as rn
    from base b
    where b.tip is not null
      and b.skore is not null
  ),
  recent as (
    select
      rr.hrac_id,
      coalesce(sum(case when rr.rn <= 5 and rr.exact_hit = 1 then 1 else 0 end), 0)::int as recent_exact,
      coalesce(sum(case when rr.rn <= 5 then rr.pts else 0 end), 0)::int as recent_points
    from recent_ranked rr
    group by rr.hrac_id
  ),
  history_source as (
    select
      b.hrac_id,
      b.zapas_id,
      sum(b.pts) over (partition by b.hrac_id order by b.zapas_id rows between unbounded preceding and current row) as cum_pts
    from base b
    where b.tip is not null
      and b.skore is not null
  ),
  history_cte as (
    select
      hs.hrac_id,
      coalesce(jsonb_agg(hs.cum_pts order by hs.zapas_id), '[]'::jsonb) as history
    from history_source hs
    group by hs.hrac_id
  )
  select
    b.hrac_id,
    max(b.jmeno) as jmeno,
    max(b.je_admin) as je_admin,
    coalesce(sum(b.pts), 0)::int as total,
    coalesce(sum(b.exact_hit), 0)::int as pre,
    coalesce(sum(b.trend_hit), 0)::int as spr,
    coalesce(sum(b.diff_bonus), 0)::int as dif,
    coalesce(sum(b.wrong_hit), 0)::int as spa,
    coalesce(sum(b.rated_tip), 0)::int as hod,
    coalesce(sum(b.saved_tip), 0)::int as uzam,
    coalesce(max(r.recent_exact), 0)::int as recent_exact,
    coalesce(max(r.recent_points), 0)::int as recent_points,
    coalesce(sum(b.draw_hit), 0)::int as draw_hits,
    coalesce(max(h.history), '[]'::jsonb) as history
  from base b
  left join recent r
    on r.hrac_id = b.hrac_id
  left join history_cte h
    on h.hrac_id = b.hrac_id
  group by b.hrac_id
  order by
    coalesce(sum(b.pts), 0) desc,
    coalesce(sum(b.exact_hit), 0) desc,
    coalesce(sum(b.trend_hit), 0) desc,
    coalesce(sum(b.diff_bonus), 0) desc,
    max(b.jmeno) asc;
end;
$$;

grant execute on function public.get_visible_tips_secure(uuid, text) to anon;
grant execute on function public.get_tip_trends_secure(uuid, text) to anon;
grant execute on function public.get_leaderboard_snapshot_secure(uuid, text, text) to anon;
