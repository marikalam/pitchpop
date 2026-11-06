-- Phone notifications for the owner (through the free ntfy app, ntfy.sh):
--  - a new family account,
--  - a new download (PitchPop opened for the first time on an iPhone or
--    iPad - from pitchpop_events, see pitchpop_stats.sql).
-- Each says the new total. No email addresses or names are sent.
--
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run). Then set
-- the private topic you subscribe to in the ntfy app (keep it private:
-- anyone who knows it can read the notifications; it's kept only in the
-- database, never in this public file):
--   insert into public.pitchpop_notify (id, topic) values (1, 'your-private-topic')
--   on conflict (id) do update set topic = excluded.topic;
--
-- To stop: drop trigger on_new_family on auth.users;
--          drop trigger on_new_install on public.pitchpop_events;
-- Replaces the older notify_new_family.sql.

create extension if not exists pg_net with schema extensions;

-- Where to send (one row). Nobody can read it from the app.
create table if not exists public.pitchpop_notify (
  id int primary key check (id = 1),
  topic text not null check (topic ~ '^[A-Za-z0-9_-]{8,64}$')
);
alter table public.pitchpop_notify enable row level security;
revoke all on public.pitchpop_notify from anon, authenticated;

create or replace function public.pitchpop_send(title text, message text, tag text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  t text;
begin
  select topic into t from pitchpop_notify where id = 1;
  if t is null then return; end if;
  perform net.http_post(
    url := 'https://ntfy.sh/',
    body := jsonb_build_object('topic', t, 'title', title, 'message', message, 'tags', jsonb_build_array(tag))
  );
exception when others then
  -- A notification problem must never stop a sign-up or the app.
  null;
end;
$$;
revoke all on function public.pitchpop_send(text, text, text) from public, anon, authenticated;

-- A new account.
create or replace function public.notify_new_family()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pitchpop_send(
    'New PitchPop family',
    format('Someone just made an account. %s accounts so far.', (select count(*) from auth.users)),
    'tada'
  );
  return new;
end;
$$;
revoke all on function public.notify_new_family() from public, anon, authenticated;
drop trigger if exists on_new_family on auth.users;
create trigger on_new_family after insert on auth.users
  for each row execute function public.notify_new_family();

-- A new download: the first time PitchPop opens on an iPhone or iPad.
-- At most 20 an hour, so a flood of fake events can't spam the phone.
create or replace function public.notify_new_install()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  phones int;
  everywhere int;
begin
  if new.event <> 'open' or not new.new_install or new.platform = 'web' then
    return new;
  end if;
  if (select count(*) from pitchpop_events
      where event = 'open' and new_install and platform <> 'web' and at > now() - interval '1 hour') > 20 then
    return new;
  end if;
  select count(*) filter (where platform <> 'web'), count(*) into phones, everywhere
    from pitchpop_events where event = 'open' and new_install;
  perform pitchpop_send(
    'New PitchPop download',
    format('PitchPop was just opened for the first time on an %s. %s app installs so far (%s counting the website).',
           case when new.platform = 'ipad' then 'iPad' else 'iPhone' end, phones, everywhere),
    'iphone'
  );
  return new;
end;
$$;
revoke all on function public.notify_new_install() from public, anon, authenticated;
drop trigger if exists on_new_install on public.pitchpop_events;
create trigger on_new_install after insert on public.pitchpop_events
  for each row execute function public.notify_new_install();
