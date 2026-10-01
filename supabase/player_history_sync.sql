-- Syncs each player's practice history and game streak across the family's
-- phones. Each player's row in pitchpop_profiles gets two lists:
--   practice_log  saved practices: [{ "day", "minutes", "endedAt" }, ...]
--   streak_days   days a round of Pitch Practice was finished: ["2026-10-01", ...]
-- The app calls merge_player_history(...) with what one phone has; the
-- database adds anything new and returns the combined lists, so phones
-- never overwrite each other's practices. See src/historySync.js.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to run again.

alter table public.pitchpop_profiles
  add column if not exists practice_log jsonb not null default '[]'::jsonb,
  add column if not exists streak_days jsonb not null default '[]'::jsonb;

-- security invoker: runs as the signed-in user, so the table's row-level
-- security still limits it to the family's own players.
create or replace function public.merge_player_history(
  p_profile_key text,
  p_practice_log jsonb,
  p_streak_days jsonb
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  update public.pitchpop_profiles p
  set
    practice_log = (
      select coalesce(jsonb_agg(e order by e->>'endedAt'), '[]'::jsonb)
      from (
        select distinct on (e->>'endedAt') e
        from jsonb_array_elements(p.practice_log || coalesce(p_practice_log, '[]'::jsonb)) as e
        where e->>'endedAt' is not null
      ) as entries
    ),
    streak_days = (
      select coalesce(jsonb_agg(d order by d), '[]'::jsonb)
      from (
        select distinct d
        from jsonb_array_elements_text(p.streak_days || coalesce(p_streak_days, '[]'::jsonb)) as d
      ) as days
    )
  where p.owner_id = auth.uid() and p.profile_key = p_profile_key
  returning jsonb_build_object('practice_log', p.practice_log, 'streak_days', p.streak_days);
$$;

revoke all on function public.merge_player_history(text, jsonb, jsonb) from public, anon;
grant execute on function public.merge_player_history(text, jsonb, jsonb) to authenticated;
