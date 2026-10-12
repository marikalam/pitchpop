// Which players are in Tiny Tots (a setting per player, kept on this
// device): their Pitch Practice is big colors to tap instead of the game
// (TinyTots.jsx).
const KEY = 'pitchpop-tiny-tots-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function inTinyTots(profileId) {
  return !!load()[profileId];
}

export function setTinyTots(profileId, on) {
  const next = { ...load() };
  if (on) next[profileId] = true;
  else delete next[profileId];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
