-- 16 · Blok 3: druhý registrační režim "na schválení" vedle stávajícího zvacího kódu.
-- Nasazeno přes Supabase Management API (apply_migration) 30. 7. 2026. Uloženo i sem pro dohledatelnost.
--
-- app_secrets.reg_mode: 'invite' (default, otevřený zvací kód) | 'approval' (žádost -> admin schválí)
-- Admin přepíná v Admin sekci. In-app notifikace adminovi (appka nemá mailový kanál).

create table if not exists public.registration_requests (
  id uuid primary key default gen_random_uuid(),
  jmeno text not null,
  pin_hash text not null,
  status text not null default 'pending',   -- pending | approved | rejected
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid
);
alter table public.registration_requests enable row level security;  -- žádná policy: přístup jen přes SECURITY DEFINER RPC

-- veřejný: jen režim (NE kód ani citlivá data)
create or replace function public.get_reg_mode()
returns json language sql security definer stable
set search_path = public
as $$
  select json_build_object('mode',
    coalesce(nullif((select val from public.app_secrets where key='reg_mode'), ''), 'invite'));
$$;

-- admin přepíná režim
create or replace function public.admin_set_reg_mode_secure(p_admin_id uuid, p_pin text, p_mode text)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_hrac public.hrace%rowtype; v_mode text := lower(trim(coalesce(p_mode,'')));
begin
  v_hrac := public.auth_hrac_secure_by_id(p_admin_id, p_pin);
  if v_hrac.id is null or not coalesce(v_hrac.je_admin,false) then return json_build_object('chyba','Jen pro admina'); end if;
  if v_mode not in ('invite','approval') then return json_build_object('chyba','Neplatny rezim'); end if;
  insert into public.app_secrets (key,val) values ('reg_mode', v_mode)
  on conflict (key) do update set val = excluded.val;
  return json_build_object('ok', true, 'mode', v_mode);
end; $$;

-- admin: seznam čekajících žádostí
create or replace function public.admin_list_requests_secure(p_admin_id uuid, p_pin text)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_hrac public.hrace%rowtype;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_admin_id, p_pin);
  if v_hrac.id is null or not coalesce(v_hrac.je_admin,false) then return json_build_object('chyba','Jen pro admina'); end if;
  return json_build_object('ok', true,
    'pending', coalesce((select json_agg(json_build_object('id',id,'jmeno',jmeno,'created_at',created_at) order by created_at)
                         from public.registration_requests where status='pending'), '[]'::json));
end; $$;

-- admin schválí -> vytvoří hráče se stejným pin_hash
create or replace function public.admin_approve_request_secure(p_admin_id uuid, p_pin text, p_request_id uuid)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_hrac public.hrace%rowtype; v_req public.registration_requests%rowtype; v_id uuid;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_admin_id, p_pin);
  if v_hrac.id is null or not coalesce(v_hrac.je_admin,false) then return json_build_object('chyba','Jen pro admina'); end if;
  select * into v_req from public.registration_requests where id = p_request_id and status='pending';
  if v_req.id is null then return json_build_object('chyba','Zadost neexistuje nebo uz je vyrizena'); end if;
  if exists (select 1 from public.hrace where lower(jmeno)=lower(v_req.jmeno)) then
    update public.registration_requests set status='rejected', resolved_at=now(), resolved_by=v_hrac.id where id=p_request_id;
    return json_build_object('chyba','Jmeno uz mezitim existuje - zadost zamitnuta');
  end if;
  insert into public.hrace (jmeno, pin_hash) values (v_req.jmeno, v_req.pin_hash) returning id into v_id;
  update public.registration_requests set status='approved', resolved_at=now(), resolved_by=v_hrac.id where id=p_request_id;
  return json_build_object('ok', true, 'jmeno', v_req.jmeno);
end; $$;

create or replace function public.admin_reject_request_secure(p_admin_id uuid, p_pin text, p_request_id uuid)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_hrac public.hrace%rowtype;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_admin_id, p_pin);
  if v_hrac.id is null or not coalesce(v_hrac.je_admin,false) then return json_build_object('chyba','Jen pro admina'); end if;
  update public.registration_requests set status='rejected', resolved_at=now(), resolved_by=v_hrac.id
  where id=p_request_id and status='pending';
  if not found then return json_build_object('chyba','Zadost neexistuje nebo uz je vyrizena'); end if;
  return json_build_object('ok', true);
end; $$;

-- registruj_hrace_secure: v approval režimu ukládá žádost místo účtu (invite chování beze změny)
create or replace function public.registruj_hrace_secure(p_jmeno text, p_pin_hash text, p_pin_plain text, p_invite text default null)
returns json language plpgsql security definer
set search_path = public
as $function$
declare
  v_reg json; v_hrac public.hrace%rowtype; v_id uuid;
  v_jmeno text := trim(coalesce(p_jmeno, ''));
  v_plain text := trim(coalesce(p_pin_plain, ''));
  v_code text; v_mode text;
begin
  if length(v_jmeno) < 1 or length(v_jmeno) > 32 then return json_build_object('chyba', 'Jméno musí mít 1-32 znaků'); end if;
  if length(v_plain) < 4 or length(v_plain) > 32 then return json_build_object('chyba', 'PIN musí mít 4-32 znaků'); end if;

  select coalesce(nullif((select val from public.app_secrets where key='reg_mode'),''),'invite') into v_mode;

  if v_mode = 'approval' then
    if exists (select 1 from public.hrace where lower(jmeno)=lower(v_jmeno)) then
      return json_build_object('chyba', 'Jméno již existuje');
    end if;
    if exists (select 1 from public.registration_requests where lower(jmeno)=lower(v_jmeno) and status='pending') then
      return json_build_object('chyba', 'Žádost s tímto jménem už čeká na schválení');
    end if;
    insert into public.registration_requests (jmeno, pin_hash)
    values (v_jmeno, extensions.crypt(v_plain, extensions.gen_salt('bf', 10)));
    return json_build_object('ok', true, 'pending', true);
  end if;

  select val into v_code from public.app_secrets where key = 'invite_code';
  if coalesce(trim(v_code),'') <> '' then
    if lower(trim(coalesce(p_invite,''))) <> lower(trim(v_code)) then
      return json_build_object('chyba', 'Neplatný zvací kód. Vyžádej si ho u správce tipovačky.');
    end if;
  end if;

  select public.registruj_hrace(v_jmeno, v_plain) into v_reg;
  if v_reg is null then return json_build_object('chyba', 'Registrace se nepodařila'); end if;
  if coalesce(v_reg->>'chyba', '') <> '' then return v_reg; end if;
  if nullif(v_reg->>'id', '') is null then return json_build_object('chyba', 'Registrace se nepodařila'); end if;

  v_id := (v_reg->>'id')::uuid;
  update public.hrace set pin_hash = extensions.crypt(v_plain, extensions.gen_salt('bf', 10)), last_login = now() where id = v_id;
  select * into v_hrac from public.hrace where id = v_id;
  return json_build_object('id', v_hrac.id, 'jmeno', v_hrac.jmeno, 'je_admin', coalesce(v_hrac.je_admin, false));
end;
$function$;
