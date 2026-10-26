-- PitchPop's own usage stats, for the grown-up who runs PitchPop
-- (Account -> PitchPop stats). The counts are anonymous: each app sends
-- only "opened" (and whether it's the first time today, or the first time
-- ever on that device) and "finished a round" (which activity and the
-- score) - no names, no account or device ids. First-party only: no
-- third-party analytics, as the Kids category requires.
--
-- The page also lists the family accounts (their email, when they joined,
-- when they last signed in, how many players) - only for the accounts
-- allowed to see the stats.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste ->
-- Run. Safe to run again. Whoever can see the MathPop stats can see these
-- too; to add someone else, see the last step at the bottom.

create table if not exists public.pitchpop_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  day date not null,                 -- the day on the device (its own time zone)
  event text not null check (event in ('open', 'round')),
  first_today boolean not null default false,
  new_install boolean not null default false,
  platform text not null check (platform in ('iphone', 'ipad', 'web')),
  activity text check (char_length(activity) <= 40),
  lang text check (lang in ('en', 'ja')),
  correct smallint check (correct between 0 and 100),
  total smallint check (total between 1 and 100)
);
create index if not exists pitchpop_events_day on public.pitchpop_events (day);

-- Anyone using the app can add an event; nobody can read them directly.
alter table public.pitchpop_events enable row level security;
drop policy if exists "The app sends PitchPop events" on public.pitchpop_events;
create policy "The app sends PitchPop events" on public.pitchpop_events
  for insert to anon, authenticated
  with check (day between current_date - 2 and current_date + 2);

-- The accounts allowed to see the stats.
create table if not exists public.pitchpop_stat_viewers (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.pitchpop_stat_viewers enable row level security;

-- Whoever can see the MathPop stats can see these too.
do $$
begin
  if to_regclass('public.mathpop_stat_viewers') is not null then
    insert into public.pitchpop_stat_viewers (user_id)
      select user_id from public.mathpop_stat_viewers
      on conflict do nothing;
  end if;
end;
$$;

create or replace function public.pitchpop_can_view_stats()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from pitchpop_stat_viewers where user_id = auth.uid());
$$;

-- The stats for the last `days` days, added up (never single events), and
-- the family accounts.
create or replace function public.pitchpop_stats(days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since date := current_date - greatest(1, least(days, 365)) + 1;
  result jsonb;
begin
  if not pitchpop_can_view_stats() then
    raise exception 'not allowed';
  end if;
  with ev as (select * from pitchpop_events where day >= since)
  select jsonb_build_object(
    'since', since,
    'totals', (
      select jsonb_build_object(
        'activeDays', count(*) filter (where event = 'open' and first_today),
        'newInstalls', count(*) filter (where event = 'open' and new_install),
        'opens', count(*) filter (where event = 'open'),
        'rounds', count(*) filter (where event = 'round'),
        'correct', coalesce(sum(correct) filter (where event = 'round'), 0),
        'answered', coalesce(sum(total) filter (where event = 'round'), 0)
      ) from ev
    ),
    'allTimeInstalls', (select count(*) from pitchpop_events where event = 'open' and new_install),
    'daily', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'devices', (select count(*) from ev where ev.day = d.day and event = 'open' and first_today),
        'rounds', (select count(*) from ev where ev.day = d.day and event = 'round'),
        'newInstalls', (select count(*) from ev where ev.day = d.day and event = 'open' and new_install)
      ) order by d.day)
      from (select generate_series(since, current_date, interval '1 day')::date as day) d
    ),
    'platforms', (
      select coalesce(jsonb_object_agg(platform, n), '{}') from (
        select platform, count(*) as n from ev where event = 'open' and first_today group by platform
      ) t
    ),
    'languages', (
      select coalesce(jsonb_object_agg(lang, n), '{}') from (
        select lang, count(*) as n from ev where event = 'round' and lang is not null group by lang
      ) t
    ),
    'activities', (
      select coalesce(jsonb_agg(jsonb_build_object('activity', activity, 'rounds', n, 'correct', c, 'answered', a) order by n desc), '[]')
      from (
        select activity, count(*) as n, sum(correct) as c, sum(total) as a
        from ev where event = 'round' and activity is not null
        group by activity order by n desc limit 15
      ) t
    ),
    -- The families with PitchPop players, newest first.
    'families', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'email', u.email,
        'joined', u.created_at,
        'lastSignIn', u.last_sign_in_at,
        'players', f.players
      ) order by u.created_at desc), '[]')
      from (
        select owner_id, count(*) as players from pitchpop_profiles group by owner_id
      ) f
      join auth.users u on u.id = f.owner_id
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.pitchpop_stats(int) from public, anon;
grant execute on function public.pitchpop_stats(int) to authenticated;
grant execute on function public.pitchpop_can_view_stats() to authenticated;

-- To let another account see the stats (put in the email it signs in
-- with, then run this line too):
-- insert into public.pitchpop_stat_viewers (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
