import { settingsChangedAt, touchSettings } from './settingsClock.js';

// A player's settings that follow them to every phone in the family
// account: Tiny Tots, Single notes, typing the notes, and NoteSpeller's clef, staff part
// and notes. Each lives in its own per-player map on the phone; this
// gathers them up for syncing and puts synced ones back.
const MAPS = {
  tinyTots: 'pitchpop-tiny-tots-v1',
  singleNotes: 'pitchpop-single-notes-v1',
  singleNotesStyle: 'pitchpop-single-notes-style-v1',
  typeNotes: 'pitchpop-type-notes-v1',
  clef: 'pitchpop-notespeller-player-clef-v1',
  level: 'pitchpop-notespeller-player-level-v1',
  letters: 'pitchpop-notespeller-my-notes-v1',
  voice: 'pitchpop-voice-lang-v1',
};
// Never changed on this phone: any phone's settings win over these.
const NEVER = '1970-01-01T00:00:00.000Z';

function loadMap(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

export function collectSettings(profileId) {
  const values = {};
  for (const [name, key] of Object.entries(MAPS)) values[name] = loadMap(key)[profileId] ?? null;
  return { values, updatedAt: settingsChangedAt(profileId) || NEVER };
}

// Takes in settings from the account if they're newer than this phone's.
// Returns true when anything changed.
export function applySettings(profileId, settings) {
  if (!settings?.values || !(settings.updatedAt > (settingsChangedAt(profileId) || NEVER))) return false;
  for (const [name, key] of Object.entries(MAPS)) {
    const map = loadMap(key);
    const value = settings.values[name];
    if (value == null || value === false) delete map[profileId];
    else map[profileId] = value;
    try {
      localStorage.setItem(key, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  }
  try {
    const all = JSON.parse(localStorage.getItem('pitchpop-settings-changed-v1')) || {};
    localStorage.setItem('pitchpop-settings-changed-v1', JSON.stringify({ ...all, [profileId]: settings.updatedAt }));
  } catch {
    /* ignore */
  }
  return true;
}

export { touchSettings };
