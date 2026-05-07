-- v5.1.0 admin secure writes (7. 5. 2026)
-- Nahrazuje primy INSERT/UPDATE z anon klienta secure RPC.
-- Aplikovano spolu s F4 (refresh buttons fix).

begin;

-- admin_upsert_vysledky_secure
create or replace function public.admin_upsert_vysledky_secure(
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

  insert into public.vysledky (zapas_id, skore, aktualizovano)
  select
    (e->>'zapas_id')::integer,
    (e->>'skore')::text,
    now()
  from jsonb_array_elements(p_rows) e
  where e ? 'zapas_id' and e ? 'skore'
    and length(coalesce(e->>'skore','')) between 1 and 16
  on conflict (zapas_id) do update
    set skore = excluded.skore,
        aktualizovano = excluded.aktualizovano;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  return json_build_object('ok', true, 'imported', v_count);
end;
$$;

-- admin_update_sync_status_secure
create or replace function public.admin_update_sync_status_secure(
  p_admin_id uuid,
  p_pin text,
  p_key text,
  p_detail jsonb
)
returns json
language plpgsql
security definer
as $$
declare
  v_admin public.hrace%rowtype;
begin
  v_admin := public.auth_hrac_secure_by_id(p_admin_id, p_pin);
  if v_admin.id is null then
    return json_build_object('chyba', 'Neplatny PIN');
  end if;
  if not coalesce(v_admin.je_admin, false) then
    return json_build_object('chyba', 'Pouze admin');
  end if;

  if p_key not in ('fifa_ranking', 'results', 'teams', 'odds') then
    return json_build_object('chyba', 'Neznamy sync key');
  end if;

  insert into public.app_sync_statuses(key, last_updated_at, detail)
  values (p_key, now(), coalesce(p_detail, '{}'::jsonb))
  on conflict (key) do update
    set last_updated_at = excluded.last_updated_at,
        detail = excluded.detail;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_upsert_vysledky_secure(uuid, text, jsonb) to anon;
grant execute on function public.admin_update_sync_status_secure(uuid, text, text, jsonb) to anon;

-- Drop overpermissive RLS policies (frontend uz volá secure RPC misto direct INSERT/UPDATE/DELETE)
drop policy if exists "Vsichni pridavaji hrace" on public.hrace;
drop policy if exists "Vsichni meni vysledky" on public.vysledky;
drop policy if exists "Admin meni vysledky" on public.vysledky;
drop policy if exists "anon_delete_tipy" on public.tipy;
drop policy if exists "tipy_insert" on public.tipy;
drop policy if exists "tipy_update" on public.tipy;

commit;
