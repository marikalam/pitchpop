import { touchSettings } from './settingsClock.js';

// Marked after the change is saved (so a sync sends the new value).
const touchSettingsLater = (id) => setTimeout(() => touchSettings(id), 0);

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
  touchSettingsLater(profileId);
  const next = { ...load() };
  if (on) next[profileId] = true;
  else delete next[profileId];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

// Which players are on Single notes (also per player): the level after
// the white-key colors, where Pitch Practice plays one white key at a time
// and they tap it on a keyboard (SingleNotes.jsx).
const NOTES_KEY = 'pitchpop-single-notes-v1';

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
  } catch {
    return {};
  }
}

export function inSingleNotes(profileId) {
  return !!loadNotes()[profileId];
}

export function setSingleNotes(profileId, on) {
  touchSettingsLater(profileId);
  const next = { ...loadNotes() };
  if (on) next[profileId] = true;
  else delete next[profileId];
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
