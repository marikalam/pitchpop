-- A phone notification each time a family makes a PitchPop account.
--
-- Run once in Supabase (SQL Editor -> New query -> paste -> Run), with
-- YOUR-TOPIC replaced by the private topic name you subscribe to in the
-- free ntfy app (ntfy.sh). Keep that name private: anyone who knows it
-- can read the notifications. The notification says only that someone
-- signed up and how many families there are - no email address. Who it
-- was is in Supabase under Authentication -> Users.
--
-- To stop the notifications: drop trigger on_new_family on auth.users;

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_new_family()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  total int;
begin
  begin
    select count(*) into total from auth.users;
    perform net.http_post(
      url := 'https://ntfy.sh/',
      body := jsonb_build_object(
        'topic', 'YOUR-TOPIC',
        'title', 'New PitchPop family 🎉',
        'message', format('Someone just made a PitchPop account. %s families so far.', total),
        'tags', jsonb_build_array('tada')
      )
    );
  exception when others then
    -- A notification problem must never stop someone from signing up.
    null;
  end;
  return new;
end;
$$;

revoke all on function public.notify_new_family() from public, anon, authenticated;

drop trigger if exists on_new_family on auth.users;
create trigger on_new_family
  after insert on auth.users
  for each row execute function public.notify_new_family();
