import { mergeCloudHistory } from './cloud.js';
import { loadPracticeLog, replacePlayerPractices } from './practiceLog.js';
import { loadStreakDays, replaceStreakDays } from './streak.js';

// Keeps each player's practice history and game streak the same on every
// phone signed in to the family account. Each phone sends what it has and
// gets back the combined lists (the database only ever adds, so phones
// never overwrite each other), then saves them locally. Runs on sign-in,
// whenever a practice or a streak day is recorded, and when the app comes
// back to the foreground. Screens showing this data listen for the
// 'pitchpop-history-synced' event.

async function syncPlayer(profileId) {
  const merged = await mergeCloudHistory(
    profileId,
    loadPracticeLog()[profileId] || [],
    loadStreakDays()[profileId] || [],
  );
  if (!merged) return false;
  if (Array.isArray(merged.practice_log)) replacePlayerPractices(profileId, merged.practice_log);
  if (Array.isArray(merged.streak_days)) replaceStreakDays(profileId, merged.streak_days);
  return true;
}

export async function syncPlayers(profileIds) {
  const results = await Promise.all(profileIds.map(syncPlayer));
  if (results.some(Boolean)) window.dispatchEvent(new Event('pitchpop-history-synced'));
}

// Starts syncing the given players (the family account's); returns a
// function that stops it (on sign-out).
export function startHistorySync(profileIds) {
  const ids = new Set(profileIds);
  syncPlayers([...ids]);
  const onChange = (e) => {
    if (ids.has(e.detail)) syncPlayers([e.detail]);
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') syncPlayers([...ids]);
  };
  window.addEventListener('pitchpop-history-changed', onChange);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('pitchpop-history-changed', onChange);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
