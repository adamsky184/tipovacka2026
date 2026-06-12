-- v5.9.0: get_visible_tips_secure - tipy vsech hracu viditelne po vykopu zapasu
-- Po kickoffu (zapasy_meta.kickoff <= now()) uz nelze tipovat, skryvani nema smysl.
-- ROLLBACK: odstranit treti OR podminku (puvodni verze = jen own + own_matches), viz git historie.
create or replace function public.get_visible_tips_secure(p_hrac_id uuid, p_pin text)
returns table(hrac_id uuid, zapas_id integer, tip text)
language plpgsql
security definer
as $function$
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
    -- Alias CTE columns to avoid clash with OUT parameter "zapas_id"
    return query
    with own_matches as (
      select distinct t.zapas_id as om_zid
        from public.tipy t
       where t.hrac_id = p_hrac_id
    ),
    started_matches as (
      select zm.zapas_id as sm_zid
        from public.zapasy_meta zm
       where zm.kickoff <= now()
    )
    select t.hrac_id, t.zapas_id, t.tip
      from public.tipy t
     where t.hrac_id = p_hrac_id
        or t.zapas_id in (select om_zid from own_matches)
        or t.zapas_id in (select sm_zid from started_matches)
     order by t.zapas_id, t.hrac_id;
  end if;
end;
$function$;
