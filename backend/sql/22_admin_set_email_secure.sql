-- 22 · v6.3.0: admin_set_email_secure — admin přiřadí/aktualizuje/odebere e-mail hráči.
-- Nasazeno přes apply_migration 8. 8. 2026. Aditivní, reverzibilní (drop function).
-- Admin ověřuje SVŮJ PIN (kopie logiky z admin_reset_pin_secure: bcrypt / legacy sha256+salt+aliasy).
-- Píše jen do hrac_emaily (ne hrace/tipy). Recovery anchor pro účty MS 2026 (jméno+PIN).
-- E-mail validace shodná se set_email_secure. on conflict (hrac_id) — PK hrac_emaily_pkey.

create or replace function public.admin_set_email_secure(
  p_admin_id uuid, p_admin_pin text, p_target_id uuid, p_email text
) returns json
language plpgsql security definer
set search_path to 'public','extensions'
as $function$
declare
  v_admin public.hrace%rowtype;
  v_email text := lower(trim(coalesce(p_email,'')));
begin
  select * into v_admin from public.hrace where id = p_admin_id;
  if v_admin.id is null or v_admin.je_admin is not true then
    return json_build_object('chyba','unauthorized');
  end if;

  declare
    v_match boolean := false;
    v_legacy text;
  begin
    if public.is_bcrypt_hash(coalesce(v_admin.pin_hash,'')) then
      if extensions.crypt(p_admin_pin, v_admin.pin_hash) = v_admin.pin_hash then
        v_match := true;
      end if;
    elsif public.is_sha256_hex(coalesce(v_admin.pin_hash,'')) then
      v_legacy := encode(sha256((p_admin_pin || 'ms2026salt' || v_admin.jmeno)::bytea), 'hex');
      if v_legacy = v_admin.pin_hash then v_match := true; end if;
      if not v_match then
        declare v_alias text;
        begin
          foreach v_alias in array coalesce(v_admin.aliases,'{}') loop
            v_legacy := encode(sha256((p_admin_pin || 'ms2026salt' || v_alias)::bytea), 'hex');
            if v_legacy = v_admin.pin_hash then v_match := true; exit; end if;
          end loop;
        end;
      end if;
    end if;
    if not v_match then
      return json_build_object('chyba','invalid_admin_pin');
    end if;
  end;

  if not exists(select 1 from public.hrace where id = p_target_id) then
    return json_build_object('chyba','target_not_found');
  end if;

  if v_email = '' then
    delete from public.hrac_emaily where hrac_id = p_target_id;
    return json_build_object('ok', true, 'email', null);
  end if;

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$' or length(v_email) > 120 then
    return json_build_object('chyba','Neplatný e-mail');
  end if;

  if exists(select 1 from public.hrac_emaily where email = v_email and hrac_id <> p_target_id) then
    return json_build_object('chyba','E-mail už používá jiný účet');
  end if;

  insert into public.hrac_emaily (hrac_id, email) values (p_target_id, v_email)
  on conflict (hrac_id) do update set email = excluded.email, updated_at = now();

  return json_build_object('ok', true, 'email', v_email);
end;
$function$;
grant execute on function public.admin_set_email_secure(uuid,text,uuid,text) to anon, authenticated;

-- admin_list_emails_secure — admin (po ověření PINu) načte e-maily všech hráčů pro admin UI
-- + coverage indikátor. Read-only (RLS na hrac_emaily jinak čtení blokuje).
create or replace function public.admin_list_emails_secure(
  p_admin_id uuid, p_admin_pin text
) returns json
language plpgsql security definer
set search_path to 'public','extensions'
as $function$
declare
  v_admin public.hrace%rowtype;
begin
  select * into v_admin from public.hrace where id = p_admin_id;
  if v_admin.id is null or v_admin.je_admin is not true then
    return json_build_object('chyba','unauthorized');
  end if;

  declare
    v_match boolean := false;
    v_legacy text;
  begin
    if public.is_bcrypt_hash(coalesce(v_admin.pin_hash,'')) then
      if extensions.crypt(p_admin_pin, v_admin.pin_hash) = v_admin.pin_hash then
        v_match := true;
      end if;
    elsif public.is_sha256_hex(coalesce(v_admin.pin_hash,'')) then
      v_legacy := encode(sha256((p_admin_pin || 'ms2026salt' || v_admin.jmeno)::bytea), 'hex');
      if v_legacy = v_admin.pin_hash then v_match := true; end if;
      if not v_match then
        declare v_alias text;
        begin
          foreach v_alias in array coalesce(v_admin.aliases,'{}') loop
            v_legacy := encode(sha256((p_admin_pin || 'ms2026salt' || v_alias)::bytea), 'hex');
            if v_legacy = v_admin.pin_hash then v_match := true; exit; end if;
          end loop;
        end;
      end if;
    end if;
    if not v_match then
      return json_build_object('chyba','invalid_admin_pin');
    end if;
  end;

  return coalesce((
    select json_agg(json_build_object('hrac_id', hrac_id, 'email', email))
    from public.hrac_emaily
  ), '[]'::json);
end;
$function$;
grant execute on function public.admin_list_emails_secure(uuid,text) to anon, authenticated;
