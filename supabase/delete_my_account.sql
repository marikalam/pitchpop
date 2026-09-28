-- Lets a signed-in PitchPop user permanently delete their own account
-- (App Store rule 5.1.1(v): apps with sign-up must offer in-app deletion).
-- The app calls it with supabase.rpc('delete_my_account'); see deleteAccount()
-- in src/cloud.js.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- security definer lets the function delete from auth.users, which the
-- publishable key can't touch directly. It only ever deletes the caller's
-- own rows (auth.uid()), and only signed-in users may call it.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  delete from public.pitchpop_profiles where owner_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
