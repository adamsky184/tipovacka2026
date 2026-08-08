-- 20 · v6.1.0 Landing world-class: teasery budoucích turnajů + sběr předběžného zájmu.
-- Nasazeno přes apply_migration 8. 8. 2026 (Adam předschválil rozsah "nové řádky/tabulky/RLS/RPC").
-- Vše aditivní/reverzibilní. Nesahá na hrace/tipy/gigs_*. Datumy ověřeny web search.

-- A) pocet_tipu na turnaje + naplnění ms2026 (2787 tipů MS 2026)
alter table public.turnaje add column if not exists pocet_tipu int;
update public.turnaje set pocet_tipu = 2787 where id = 'ms2026';

-- B) Teasery budoucích turnajů
--    AFCON 2027: výkop 19. 6. 2027, hostitelé Keňa/Tanzanie/Uganda, 24 týmů
--    EURO 2028: výkop 9. 6. 2028, hostitelé UK (Anglie/Skotsko/Wales/Sev.Irsko) + Irsko
insert into public.turnaje (id, nazev, rok, status, url_path, icon, start_date, end_date, sampion, tiper_sampion, pocet_hracu, pocet_zapasu, pocet_tipu)
values
  ('afcon2027','AFCON 2027',2027,'planned','/AFCON2027','🌍','2027-06-19',null,null,null,null,null,null),
  ('euro2028','EURO 2028',2028,'planned','/EURO2028','⚽','2028-06-09',null,null,null,null,null,null)
on conflict (id) do nothing;

-- C) Sběr předběžného zájmu: tabulka + SECURITY DEFINER RPC.
--    Žádná přímá anon policy — zápis jen přes RPC (nejpřísnější, jako hrac_emaily).
create table if not exists public.turnaj_zajem (
  id bigint generated always as identity primary key,
  turnaj_id text not null,
  email text not null,
  created_at timestamptz default now()
);
alter table public.turnaj_zajem enable row level security;

create or replace function public.zapis_zajem_secure(p_turnaj_id text, p_email text)
returns json language plpgsql security definer
set search_path = public
as $$
declare v_email text := lower(trim(coalesce(p_email,'')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return json_build_object('chyba','Neplatný e-mail'); end if;
  if length(p_turnaj_id) > 32 then return json_build_object('chyba','invalid'); end if;
  insert into public.turnaj_zajem (turnaj_id, email) values (p_turnaj_id, v_email);
  return json_build_object('ok', true);
end;$$;
grant execute on function public.zapis_zajem_secure(text,text) to anon, authenticated;
