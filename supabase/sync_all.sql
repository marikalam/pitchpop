-- Everything else that follows a player from phone to phone (the practice
-- history and game streak are in player_history_sync.sql, run before this):
--   stickers       the sticker book: [{ "index", "at", "from" }, ...]
--   round_history  finished Pitch Practice rounds (the Progress page)
--   settings       the player's settings (Tiny Tots, typing notes,
--                  NoteSpeller clef, staff part and notes) with the time
--                  they last changed: { "values": {...}, "updatedAt" }
--   live_practice  the practice going on right now, and which phone it's
--                  on: { "device", "status", "startedAt", "elapsedBefore",
--                  "count", "updatedAt" } or null
-- Phones send what they have and get back the combined data (stickers and
-- rounds are only ever added; the newest settings win), so nothing saved
-- offline is lost. A practice belongs to one phone at a time: another phone
-- can only take it over on purpose ("Move it to this phone").
-- See src/historySync.js and src/livePractice.js.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

alter table public.pitchpop_profiles
  add column if not exists stickers jsonb not null default '[]'::jsonb,
  add column if not exists round_history jsonb not null default '[]'::jsonb,
  add column if not exists settings jsonb,
  add column if not exists live_practice jsonb;

-- security invoker: runs as the signed-in user, so the table's row-level
-- security still limits it to the family's own players.
create or replace function public.merge_player_extras(
  p_profile_key text,
  p_stickers jsonb,
  p_round_history jsonb,
  p_settings jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  update public.pitchpop_profiles p
  set
    stickers = (
      select coalesce(jsonb_agg(e order by e->>'at'), '[]'::jsonb)
      from (
        select distinct on (e->>'at') e
        from jsonb_array_elements(p.stickers || coalesce(p_stickers, '[]'::jsonb)) as e
        where e->>'at' is not null
      ) as entries
    ),
    round_history = (
      select coalesce(jsonb_agg(e order by e->>'endedAt'), '[]'::jsonb)
      from (
        select e
        from (
          select distinct on (e->>'endedAt') e
          from jsonb_array_elements(p.round_history || coalesce(p_round_history, '[]'::jsonb)) as e
          where e->>'endedAt' is not null
        ) as unique_rounds
        order by e->>'endedAt' desc
        limit 60
      ) as kept
    ),
    settings = case
      when p_settings is null then p.settings
      when p.settings is null then p_settings
      when coalesce(p_settings->>'updatedAt', '') > coalesce(p.settings->>'updatedAt', '') then p_settings
      else p.settings
    end
  where p.owner_id = auth.uid() and p.profile_key = p_profile_key
  returning jsonb_build_object('stickers', p.stickers, 'round_history', p.round_history, 'settings', p.settings);
$$;

-- Puts this phone's practice in the account (p_state; { id, status:
-- 'idle' } once it's over) - only if no other phone has one going (or
-- hasn't touched it for 12 hours), unless p_take_over.
-- Returns the practice in the account afterwards (null when none).
create or replace function public.claim_live_practice(
  p_profile_key text,
  p_device text,
  p_state jsonb,
  p_take_over boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_state jsonb;
begin
  update public.pitchpop_profiles p
  set live_practice = case
    when p_state is null then null
    else p_state || jsonb_build_object('device', p_device, 'updatedAt', to_jsonb(now()))
  end
  where p.owner_id = auth.uid()
    and p.profile_key = p_profile_key
    and (
      p_take_over
      or p.live_practice is null
      or p.live_practice->>'device' = p_device
      or p.live_practice->>'status' = 'idle'
      or (p.live_practice->>'updatedAt')::timestamptz < now() - interval '12 hours'
    );
  select p.live_practice into current_state
  from public.pitchpop_profiles p
  where p.owner_id = auth.uid() and p.profile_key = p_profile_key;
  return current_state;
end;
$$;

revoke all on function public.merge_player_extras(text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.merge_player_extras(text, jsonb, jsonb, jsonb) to authenticated;
revoke all on function public.claim_live_practice(text, text, jsonb, boolean) from public, anon;
grant execute on function public.claim_live_practice(text, text, jsonb, boolean) to authenticated;
