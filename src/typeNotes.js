// Which players type the notes of each chord after naming its color (the
// next level after colors, like Maddie's: "Red — C, E, G!"). A setting
// per player, kept on this device.
const KEY = 'pitchpop-type-notes-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function typesNotes(profileId) {
  return !!load()[profileId];
}

export function setTypesNotes(profileId, on) {
  const next = { ...load() };
  if (on) next[profileId] = true;
  else delete next[profileId];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
