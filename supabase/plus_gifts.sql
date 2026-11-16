-- Free Plus given by the owner, per family account and app (MathPop Plus,
-- PitchPop Family). Only the stats owners (mathpop_stat_viewers,
-- pitchpop_stat_viewers) can list the accounts and give or take back a
-- gift. Applied to the shared project as the migration "plus_gifts".
create table if not exists public.plus_gifts (
  owner_id uuid not null references auth.users (id) on delete cascade,
  app text not null check (app in ('mathpop', 'pitchpop')),
  granted_at timestamptz not null default now(),
  primary key (owner_id, app)
);
alter table public.plus_gifts enable row level security;

create or replace function public.is_pop_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from mathpop_stat_viewers where user_id = auth.uid())
      or exists (select 1 from pitchpop_stat_viewers where user_id = auth.uid());
$$;

create or replace function public.my_gifts() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'mathpop', exists (select 1 from plus_gifts where owner_id = auth.uid() and app = 'mathpop'),
    'pitchpop', exists (select 1 from plus_gifts where owner_id = auth.uid() and app = 'pitchpop')
  );
$$;

-- my_plus also returns 'gift' (MathPop): see plus_setup.sql for the rest.
create or replace function public.my_plus() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'plusStarts', (select plus_starts from plus_config where id = 1),
    'founder', coalesce(
      (select u.created_at::date < c.plus_starts from auth.users u, plus_config c where u.id = auth.uid() and c.id = 1),
      false
    ),
    'paidUntil', (select expires_at from family_plus where owner_id = auth.uid()),
    'accountCreated', (select created_at from auth.users where id = auth.uid()),
    'gift', exists (select 1 from plus_gifts where owner_id = auth.uid() and app = 'mathpop')
  );
$$;

create or replace function public.owner_family_accounts()
returns table (id uuid, email text, created_at timestamptz, mathpop_gift boolean, pitchpop_gift boolean, mathpop_paid_until timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_pop_owner() then raise exception 'not allowed'; end if;
  return query
    select u.id, u.email::text, u.created_at,
      exists (select 1 from plus_gifts g where g.owner_id = u.id and g.app = 'mathpop'),
      exists (select 1 from plus_gifts g where g.owner_id = u.id and g.app = 'pitchpop'),
      (select f.expires_at from family_plus f where f.owner_id = u.id)
    from auth.users u
    where u.email is not null
    order by u.created_at desc;
end;
$$;

create or replace function public.owner_set_gift(target uuid, for_app text, give boolean) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if not is_pop_owner() then raise exception 'not allowed'; end if;
  if for_app not in ('mathpop', 'pitchpop') then raise exception 'unknown app'; end if;
  if give then
    insert into plus_gifts (owner_id, app) values (target, for_app) on conflict do nothing;
  else
    delete from plus_gifts where owner_id = target and app = for_app;
  end if;
  return give;
end;
$$;

revoke all on function public.owner_family_accounts() from public, anon;
revoke all on function public.owner_set_gift(uuid, text, boolean) from public, anon;
grant execute on function public.owner_family_accounts() to authenticated;
grant execute on function public.owner_set_gift(uuid, text, boolean) to authenticated;
grant execute on function public.my_gifts() to authenticated;
