create or replace function public.admin_reset_tips_secure(
  p_admin_id uuid,
  p_pin text,
  p_target_hrac_id uuid
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
    return json_build_object('chyba', 'Neplatný PIN');
  end if;

  if not coalesce(v_admin.je_admin, false) then
    return json_build_object('chyba', 'Pouze admin');
  end if;

  if not exists (
    select 1
      from public.hrace
     where id = p_target_hrac_id
  ) then
    return json_build_object('chyba', 'Hráč neexistuje');
  end if;

  delete from public.tipy
   where hrac_id = p_target_hrac_id;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.admin_reset_tips_secure(uuid, text, uuid) to anon;
