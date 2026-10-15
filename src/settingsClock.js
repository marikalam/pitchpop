// When each player's settings last changed on this phone, so the newest
// change wins when phones sync (playerSettings.js).
const KEY = 'pitchpop-settings-changed-v1';

export function settingsChangedAt(profileId) {
  try {
    return JSON.parse(localStorage.getItem(KEY))?.[profileId] || null;
  } catch {
    return null;
  }
}

export function touchSettings(profileId, at = new Date().toISOString()) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY)) || {};
    localStorage.setItem(KEY, JSON.stringify({ ...all, [profileId]: at }));
  } catch {
    /* ignore */
  }
  // historySync.js sends it to the family account.
  window.dispatchEvent(new CustomEvent('pitchpop-history-changed', { detail: profileId }));
}
