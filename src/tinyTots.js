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

// How a Single notes round goes, per player: 'parts' (Part 1, the usual
// round of chords, then Part 2, 10 single notes) or 'black' (one round:
// the white keys as single notes, only the black-key colors as chords).
const STYLE_KEY = 'pitchpop-single-notes-style-v1';

export function singleNotesStyle(profileId) {
  try {
    return (JSON.parse(localStorage.getItem(STYLE_KEY)) || {})[profileId] === 'black' ? 'black' : 'parts';
  } catch {
    return 'parts';
  }
}

export function setSingleNotesStyle(profileId, style) {
  touchSettingsLater(profileId);
  try {
    const all = JSON.parse(localStorage.getItem(STYLE_KEY)) || {};
    if (style === 'black') all[profileId] = 'black';
    else delete all[profileId];
    localStorage.setItem(STYLE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
