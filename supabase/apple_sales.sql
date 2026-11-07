-- Apple's own numbers (App Store Connect sales reports), for the owner:
-- downloads, re-downloads, purchases and money earned, per app and day.
-- Filled once a day by .github/workflows/apple-stats.yml, which fetches
-- the reports with the App Store Connect key and sends them here with a
-- private token. Read by apple_sales_summary() for PitchPop's stats.
-- Covers every app in the Apple account (PitchPop, MathPop...).
--
-- Run once in Supabase (SQL Editor). Then set the private token and the
-- vendor number (App Store Connect -> Payments and Financial Reports, top
-- left) - never in this public file:
--   insert into public.apple_sales_config (id, token, vendor_number)
--   values (1, 'a-long-random-token', '12345678')
--   on conflict (id) do update set token = excluded.token, vendor_number = excluded.vendor_number;
-- and put the same token in GitHub: Settings -> Secrets and variables ->
-- Actions -> APPLE_STATS_TOKEN.

create table if not exists public.apple_sales_daily (
  apple_id text not null,
  title text,
  day date not null,
  downloads int not null default 0,      -- first-time downloads
  redownloads int not null default 0,
  updates int not null default 0,
  purchases int not null default 0,      -- in-app purchases and subscriptions (refunds subtract)
  proceeds jsonb not null default '{}',  -- money earned, by currency: {"USD": 4.24}
  countries jsonb not null default '{}', -- first-time downloads by country: {"US": 3}
  updated_at timestamptz not null default now(),
  primary key (apple_id, day)
);
alter table public.apple_sales_daily enable row level security;
revoke all on public.apple_sales_daily from anon, authenticated;

create table if not exists public.apple_sales_config (
  id int primary key check (id = 1),
  token text not null check (char_length(token) >= 32),
  vendor_number text
);
alter table public.apple_sales_config enable row level security;
revoke all on public.apple_sales_config from anon, authenticated;

-- For the workflow: the vendor number, with the right token.
create or replace function public.apple_sales_vendor(token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select vendor_number from apple_sales_config where id = 1 and apple_sales_config.token = apple_sales_vendor.token;
$$;
revoke all on function public.apple_sales_vendor(text) from public;
grant execute on function public.apple_sales_vendor(text) to anon;

-- For the workflow: days of numbers, with the right token. Returns how
-- many were saved.
create or replace function public.apple_sales_ingest(token text, rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not exists (select 1 from apple_sales_config c where c.id = 1 and c.token = apple_sales_ingest.token) then
    raise exception 'not allowed';
  end if;
  insert into apple_sales_daily (apple_id, title, day, downloads, redownloads, updates, purchases, proceeds, countries, updated_at)
  select r->>'appleId', r->>'title', (r->>'day')::date,
         coalesce((r->>'downloads')::int, 0), coalesce((r->>'redownloads')::int, 0), coalesce((r->>'updates')::int, 0),
         coalesce((r->>'purchases')::int, 0), coalesce(r->'proceeds', '{}'), coalesce(r->'countries', '{}'), now()
  from jsonb_array_elements(rows) r
  on conflict (apple_id, day) do update set
    title = excluded.title, downloads = excluded.downloads, redownloads = excluded.redownloads,
    updates = excluded.updates, purchases = excluded.purchases, proceeds = excluded.proceeds,
    countries = excluded.countries, updated_at = now();
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.apple_sales_ingest(text, jsonb) from public;
grant execute on function public.apple_sales_ingest(text, jsonb) to anon;

-- For the owner's stats: per app, the last 30 days and all time.
create or replace function public.apple_sales_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not pitchpop_can_view_stats() then
    raise exception 'not allowed';
  end if;
  with money as (
    select apple_id, day, m.key as cur, m.value::numeric as amt
    from apple_sales_daily, jsonb_each_text(proceeds) m
  ), apps as (
    select apple_id, max(title) as title, max(day) as last_day,
           sum(downloads) as downloads, sum(redownloads) as redownloads, sum(purchases) as purchases
    from apple_sales_daily group by apple_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'appleId', a.apple_id,
    'title', a.title,
    'lastDay', a.last_day,
    'allTime', jsonb_build_object(
      'downloads', a.downloads, 'redownloads', a.redownloads, 'purchases', a.purchases,
      'proceeds', (select coalesce(jsonb_object_agg(cur, round(s, 2)), '{}') from (
        select cur, sum(amt) s from money where money.apple_id = a.apple_id group by cur) t)
    ),
    'last30', (select jsonb_build_object(
      'downloads', coalesce(sum(downloads), 0), 'purchases', coalesce(sum(purchases), 0),
      'proceeds', (select coalesce(jsonb_object_agg(cur, round(s, 2)), '{}') from (
        select cur, sum(amt) s from money where money.apple_id = a.apple_id and money.day > a.last_day - 30 group by cur) t))
      from apple_sales_daily d where d.apple_id = a.apple_id and d.day > a.last_day - 30),
    'daily', (select jsonb_agg(jsonb_build_object('day', d.day, 'downloads', d.downloads, 'purchases', d.purchases,
                                                  'usd', coalesce((d.proceeds->>'USD')::numeric, 0)) order by d.day)
              from apple_sales_daily d where d.apple_id = a.apple_id and d.day > a.last_day - 30),
    'countries', (select coalesce(jsonb_object_agg(k, n), '{}') from (
        select c.key k, sum(c.value::int) n from apple_sales_daily d, jsonb_each_text(d.countries) c
        where d.apple_id = a.apple_id group by c.key order by n desc limit 8) t)
  ) order by a.downloads desc), '[]') into result
  from apps a;
  return result;
end;
$$;
revoke all on function public.apple_sales_summary() from public, anon;
grant execute on function public.apple_sales_summary() to authenticated;

-- PitchPop's App Store numbers for the stats page's time range (7, 30 or
-- 90 days), shaped like MathPop's mathpop_store_stats.
create or replace function public.pitchpop_store_stats(days int default 30)
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
  with a as (select * from apple_sales_daily where title ilike 'pitch%'),
       s as (select * from a where day >= since)
  select jsonb_build_object(
    'since', since,
    'through', (select max(day) from a),
    'totals', jsonb_build_object(
      'download', (select coalesce(sum(downloads), 0) from s),
      'redownload', (select coalesce(sum(redownloads), 0) from s),
      'purchase', (select coalesce(sum(purchases), 0) from s)),
    'allTime', jsonb_build_object(
      'download', (select coalesce(sum(downloads), 0) from a),
      'purchase', (select coalesce(sum(purchases), 0) from a)),
    'proceeds', (select coalesce(jsonb_object_agg(cur, amt), '{}') from (
      select m.key cur, round(sum(m.value::numeric), 2) amt from s, jsonb_each_text(s.proceeds) m group by m.key) t),
    'proceedsAllTime', (select coalesce(jsonb_object_agg(cur, amt), '{}') from (
      select m.key cur, round(sum(m.value::numeric), 2) amt from a, jsonb_each_text(a.proceeds) m group by m.key) t),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'downloads', downloads) order by day), '[]') from s),
    'countries', (select coalesce(jsonb_agg(jsonb_build_object('territory', k, 'downloads', n) order by n desc), '[]') from (
      select c.key k, sum(c.value::int) n from s, jsonb_each_text(s.countries) c group by c.key order by n desc limit 12) t)
  ) into result;
  return result;
end;
$$;
revoke all on function public.pitchpop_store_stats(int) from public, anon;
grant execute on function public.pitchpop_store_stats(int) to authenticated;
