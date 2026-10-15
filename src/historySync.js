import { mergeCloudExtras, mergeCloudHistory } from './cloud.js';
import { applySettings, collectSettings } from './playerSettings.js';
import { loadRoundHistory, mergeRoundHistory } from './roundHistory.js';
import { replaceSavedStickers, savedStickers } from './stickerStore.js';
import { loadPracticeLog, replacePlayerPractices } from './practiceLog.js';
import { loadStreakDays, replaceStreakDays } from './streak.js';

// Keeps each player's practice history, game streak, stickers, Pitch
// Practice rounds and settings the same on every phone signed in to the
// family account. Each phone sends what it has and gets back the combined
// lists (the database only ever adds, so phones never overwrite each
// other; for settings the newest change wins), then saves them locally.
// Runs on sign-in, whenever something is recorded, when the app comes back
// to the foreground, when the internet comes back, and every couple of
// minutes until a sync goes through - so everything done offline catches
// up. Screens showing this data listen for 'pitchpop-history-synced'.

// Players whose last sync didn't go through (offline): tried again.
const failed = new Set();

async function syncPlayer(profileId) {
  const merged = await mergeCloudHistory(
    profileId,
    loadPracticeLog()[profileId] || [],
    loadStreakDays()[profileId] || [],
  );
  const extras = await mergeCloudExtras(
    profileId,
    savedStickers(profileId),
    loadRoundHistory()[profileId] || [],
    collectSettings(profileId),
  );
  if (extras) {
    if (Array.isArray(extras.stickers)) replaceSavedStickers(profileId, extras.stickers);
    if (Array.isArray(extras.round_history)) mergeRoundHistory(profileId, extras.round_history);
    applySettings(profileId, extras.settings);
  }
  if (!merged || !extras) failed.add(profileId);
  else failed.delete(profileId);
  if (!merged) return !!extras;
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
  const onOnline = () => syncPlayers([...ids]);
  // Something didn't go through: try again every couple of minutes.
  const retry = setInterval(() => {
    const waiting = [...ids].filter((id) => failed.has(id));
    if (waiting.length) syncPlayers(waiting);
  }, 120000);
  window.addEventListener('pitchpop-history-changed', onChange);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  return () => {
    clearInterval(retry);
    window.removeEventListener('pitchpop-history-changed', onChange);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
  };
}
