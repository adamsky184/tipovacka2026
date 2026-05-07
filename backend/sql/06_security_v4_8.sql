create extension if not exists "pgcrypto";

alter table public.hrace
  add column if not exists pin_hash text;

create index if not exists idx_hrace_pin_hash on public.hrace(pin_hash);

create or replace function public.is_sha256_hex(p_value text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_value, '') ~ '^[0-9a-f]{64}$'
$$;

create or replace function public.auth_hrac_secure_by_id(
  p_hrac_id uuid,
  p_pin text
)
returns public.hrace
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_auth json;
  v_plain text;
  v_hash text;
begin
  select * into v_hrac from public.hrace where id = p_hrac_id;
  if not found then
    return null;
  end if;

  if public.is_sha256_hex(lower(coalesce(p_pin, ''))) then
    v_hash := lower(trim(p_pin));
    if coalesce(v_hrac.pin_hash, '') <> '' and lower(v_hrac.pin_hash) = v_hash then
      return v_hrac;
    end if;
  else
    v_plain := nullif(trim(coalesce(p_pin, '')), '');
  end if;

  if v_plain is not null then
    select public.prihlasit_hrace(v_hrac.jmeno, v_plain) into v_auth;
    if v_auth is not null and coalesce(v_auth->>'id', '') = p_hrac_id::text then
      if coalesce(v_hrac.pin_hash, '') = '' then
        update public.hrace
           set pin_hash = encode(digest(v_plain, 'sha256'), 'hex')
         where id = p_hrac_id;
        select * into v_hrac from public.hrace where id = p_hrac_id;
      end if;
      return v_hrac;
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.auth_hrac_secure_by_name(
  p_jmeno text,
  p_pin_hash text default null,
  p_pin_plain text default null
)
returns public.hrace
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_auth json;
  v_hash text;
  v_plain text;
begin
  select * into v_hrac
    from public.hrace
   where lower(jmeno) = lower(trim(coalesce(p_jmeno, '')))
   limit 1;

  if not found then
    return null;
  end if;

  if public.is_sha256_hex(lower(coalesce(p_pin_hash, ''))) then
    v_hash := lower(trim(p_pin_hash));
    if coalesce(v_hrac.pin_hash, '') <> '' and lower(v_hrac.pin_hash) = v_hash then
      return v_hrac;
    end if;
  end if;

  v_plain := nullif(trim(coalesce(p_pin_plain, '')), '');
  if v_plain is not null then
    select public.prihlasit_hrace(v_hrac.jmeno, v_plain) into v_auth;
    if v_auth is not null and coalesce(v_auth->>'id', '') = v_hrac.id::text then
      if v_hash is not null and coalesce(v_hrac.pin_hash, '') <> v_hash then
        update public.hrace
           set pin_hash = v_hash
         where id = v_hrac.id;
        select * into v_hrac from public.hrace where id = v_hrac.id;
      elsif coalesce(v_hrac.pin_hash, '') = '' then
        update public.hrace
           set pin_hash = encode(digest(v_plain, 'sha256'), 'hex')
         where id = v_hrac.id;
        select * into v_hrac from public.hrace where id = v_hrac.id;
      end if;
      return v_hrac;
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.prihlasit_hrace_secure(
  p_jmeno text,
  p_pin_hash text default null,
  p_pin_plain text default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
begin
  v_hrac := public.auth_hrac_secure_by_name(p_jmeno, p_pin_hash, p_pin_plain);
  if v_hrac.id is null then
    return json_build_object('chyba', 'Neplatný PIN');
  end if;

  return json_build_object(
    'id', v_hrac.id,
    'jmeno', v_hrac.jmeno,
    'je_admin', coalesce(v_hrac.je_admin, false)
  );
end;
$$;

create or replace function public.registruj_hrace_secure(
  p_jmeno text,
  p_pin_hash text,
  p_pin_plain text
)
returns json
language plpgsql
security definer
as $$
declare
  v_reg json;
  v_hrac public.hrace%rowtype;
  v_id uuid;
begin
  select public.registruj_hrace(trim(coalesce(p_jmeno, '')), trim(coalesce(p_pin_plain, '')))
    into v_reg;

  if v_reg is null then
    return json_build_object('chyba', 'Registrace se nepodařila');
  end if;

  if coalesce(v_reg->>'chyba', '') <> '' then
    return v_reg;
  end if;

  if nullif(v_reg->>'id', '') is null then
    return json_build_object('chyba', 'Registrace se nepodařila');
  end if;

  v_id := (v_reg->>'id')::uuid;
  if public.is_sha256_hex(lower(coalesce(p_pin_hash, ''))) then
    update public.hrace
       set pin_hash = lower(trim(p_pin_hash))
     where id = v_id;
  end if;

  select * into v_hrac from public.hrace where id = v_id;

  return json_build_object(
    'id', v_hrac.id,
    'jmeno', v_hrac.jmeno,
    'je_admin', coalesce(v_hrac.je_admin, false)
  );
end;
$$;

create or replace function public.ulozit_extra_tipy_secure(
  p_hrac_id uuid,
  p_pin text,
  p_winner_tip text,
  p_scorer_tip text
)
returns json
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_lock_at timestamptz;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    return json_build_object('chyba', 'Neplatný PIN');
  end if;

  select lock_at into v_lock_at from public.extra_tip_settings where id = 1;
  if v_lock_at is null then
    v_lock_at := '2026-06-11 19:00:00+00'::timestamptz;
  end if;

  if now() >= v_lock_at and not coalesce(v_hrac.je_admin, false) then
    return json_build_object('chyba', 'Extra tipy jsou uzamčené');
  end if;

  insert into public.extra_tips (hrac_id, winner_tip, scorer_tip)
  values (p_hrac_id, trim(p_winner_tip), trim(p_scorer_tip))
  on conflict (hrac_id) do update
    set winner_tip = excluded.winner_tip,
        scorer_tip = excluded.scorer_tip,
        updated_at = now();

  return json_build_object('ok', true);
end;
$$;

create or replace function public.ulozit_tipy_secure(
  p_hrac_id uuid,
  p_pin text,
  p_zapas_id integer,
  p_tip text
)
returns json
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_tip text;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    return json_build_object('chyba', 'Neplatný PIN');
  end if;

  v_tip := nullif(trim(coalesce(p_tip, '')), '');

  if v_tip is null then
    delete from public.tipy
     where hrac_id = p_hrac_id
       and zapas_id = p_zapas_id;
    return json_build_object('ok', true);
  end if;

  if v_tip !~ '^\d{1,2}:\d{1,2}$' then
    return json_build_object('chyba', 'Neplatný tip');
  end if;

  update public.tipy
     set tip = v_tip
   where hrac_id = p_hrac_id
     and zapas_id = p_zapas_id;

  if not found then
    begin
      insert into public.tipy (hrac_id, zapas_id, tip)
      values (p_hrac_id, p_zapas_id, v_tip);
    exception when unique_violation then
      update public.tipy
         set tip = v_tip
       where hrac_id = p_hrac_id
         and zapas_id = p_zapas_id;
    end;
  end if;

  return json_build_object('ok', true);
end;
$$;

create or replace function public.admin_upsert_extra_results_secure(
  p_admin_id uuid,
  p_pin text,
  p_winner_actual text,
  p_scorer_actual text
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

  insert into public.extra_tip_settings (id, winner_actual, scorer_actual, updated_by)
  values (1, nullif(trim(p_winner_actual), ''), nullif(trim(p_scorer_actual), ''), p_admin_id)
  on conflict (id) do update
    set winner_actual = excluded.winner_actual,
        scorer_actual = excluded.scorer_actual,
        updated_by = excluded.updated_by,
        updated_at = now();

  return json_build_object('ok', true);
end;
$$;

create or replace function public.admin_upsert_extra_tip_secure(
  p_admin_id uuid,
  p_pin text,
  p_target_hrac_id uuid,
  p_winner_tip text,
  p_scorer_tip text
)
returns json
language plpgsql
security definer
as $$
declare
  v_admin public.hrace%rowtype;
  v_target public.hrace%rowtype;
begin
  v_admin := public.auth_hrac_secure_by_id(p_admin_id, p_pin);
  if v_admin.id is null then
    return json_build_object('chyba', 'Neplatný PIN');
  end if;
  if not coalesce(v_admin.je_admin, false) then
    return json_build_object('chyba', 'Pouze admin');
  end if;

  select * into v_target from public.hrace where id = p_target_hrac_id;
  if not found then
    return json_build_object('chyba', 'Hráč neexistuje');
  end if;

  if nullif(trim(p_winner_tip), '') is null or nullif(trim(p_scorer_tip), '') is null then
    return json_build_object('chyba', 'Je třeba vyplnit vítěze i střelce');
  end if;

  insert into public.extra_tips (hrac_id, winner_tip, scorer_tip)
  values (p_target_hrac_id, trim(p_winner_tip), trim(p_scorer_tip))
  on conflict (hrac_id) do update
    set winner_tip = excluded.winner_tip,
        scorer_tip = excluded.scorer_tip,
        updated_at = now();

  return json_build_object('ok', true);
end;
$$;

create or replace function public.discussion_save_post_secure(
  p_hrac_id uuid,
  p_pin text,
  p_body text,
  p_parent_id bigint default null
)
returns json
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_new_id bigint;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    return json_build_object('chyba', 'Neplatný PIN');
  end if;
  if nullif(trim(p_body), '') is null then
    return json_build_object('chyba', 'Prázdný příspěvek');
  end if;
  if p_parent_id is not null and not exists (select 1 from public.discussion_posts where id = p_parent_id) then
    return json_build_object('chyba', 'Nadřazený příspěvek neexistuje');
  end if;

  insert into public.discussion_posts (parent_id, hrac_id, body)
  values (p_parent_id, p_hrac_id, trim(p_body))
  returning id into v_new_id;

  return json_build_object('ok', true, 'id', v_new_id);
end;
$$;

create or replace function public.discussion_delete_post_secure(
  p_hrac_id uuid,
  p_pin text,
  p_post_id bigint
)
returns json
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_owner_id uuid;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    return json_build_object('chyba', 'Neplatný PIN');
  end if;

  select hrac_id into v_owner_id from public.discussion_posts where id = p_post_id;
  if v_owner_id is null then
    return json_build_object('chyba', 'Příspěvek neexistuje');
  end if;
  if not coalesce(v_hrac.je_admin, false) and v_owner_id <> p_hrac_id then
    return json_build_object('chyba', 'Nelze smazat cizí příspěvek');
  end if;

  delete from public.discussion_posts where id = p_post_id;
  return json_build_object('ok', true);
end;
$$;

create or replace function public.discussion_toggle_reaction_secure(
  p_hrac_id uuid,
  p_pin text,
  p_post_id bigint,
  p_emoji text
)
returns json
language plpgsql
security definer
as $$
declare
  v_hrac public.hrace%rowtype;
  v_exists boolean;
begin
  v_hrac := public.auth_hrac_secure_by_id(p_hrac_id, p_pin);
  if v_hrac.id is null then
    return json_build_object('chyba', 'Neplatný PIN');
  end if;
  if p_emoji not in ('👍','😂','🔥','⚽') then
    return json_build_object('chyba', 'Neplatná reakce');
  end if;
  if not exists (select 1 from public.discussion_posts where id = p_post_id) then
    return json_build_object('chyba', 'Příspěvek neexistuje');
  end if;

  select exists(
    select 1 from public.discussion_reactions
    where post_id = p_post_id and hrac_id = p_hrac_id and emoji = p_emoji
  ) into v_exists;

  if v_exists then
    delete from public.discussion_reactions
    where post_id = p_post_id and hrac_id = p_hrac_id and emoji = p_emoji;
  else
    insert into public.discussion_reactions (post_id, hrac_id, emoji)
    values (p_post_id, p_hrac_id, p_emoji);
  end if;

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.prihlasit_hrace_secure(text, text, text) to anon;
grant execute on function public.registruj_hrace_secure(text, text, text) to anon;
grant execute on function public.ulozit_tipy_secure(uuid, text, integer, text) to anon;
grant execute on function public.ulozit_extra_tipy_secure(uuid, text, text, text) to anon;
grant execute on function public.admin_upsert_extra_results_secure(uuid, text, text, text) to anon;
grant execute on function public.admin_upsert_extra_tip_secure(uuid, text, uuid, text, text) to anon;
grant execute on function public.discussion_save_post_secure(uuid, text, text, bigint) to anon;
grant execute on function public.discussion_delete_post_secure(uuid, text, bigint) to anon;
grant execute on function public.discussion_toggle_reaction_secure(uuid, text, bigint, text) to anon;
