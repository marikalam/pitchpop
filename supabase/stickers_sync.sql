-- Syncs each player's sticker book across the family's phones. Each
-- player's row in pitchpop_profiles gets a list of stickers:
--   stickers  [{ "index", "at", "from" }, ...]  (one per sticker stuck in)
-- The app calls merge_player_stickers(...) with what one phone has; the
-- database adds anything new and returns the combined list, so phones
-- never overwrite each other's stickers. See src/historySync.js. Until
-- this has been run, stickers just stay on the phone they were earned on.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

alter table public.pitchpop_profiles
  add column if not exists stickers jsonb not null default '[]'::jsonb;

-- security invoker: runs as the signed-in user, so the table's row-level
-- security still limits it to the family's own players.
create or replace function public.merge_player_stickers(
  p_profile_key text,
  p_stickers jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  update public.pitchpop_profiles p
  set stickers = (
    select coalesce(jsonb_agg(e order by e->>'at'), '[]'::jsonb)
    from (
      select distinct on (e->>'at') e
      from jsonb_array_elements(p.stickers || coalesce(p_stickers, '[]'::jsonb)) as e
      where e->>'at' is not null
    ) as entries
  )
  where p.owner_id = auth.uid() and p.profile_key = p_profile_key
  returning p.stickers;
$$;

revoke all on function public.merge_player_stickers(text, jsonb) from public, anon;
grant execute on function public.merge_player_stickers(text, jsonb) to authenticated;
