import { touchSettings } from './settingsClock.js';

// Which players hear PitchPop's voice in Japanese (a setting per player,
// synced like the others): colors, note names (ドレミ) and results. The
// rest of the app stays in English.
const KEY = 'pitchpop-voice-lang-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function voiceLang(profileId) {
  return load()[profileId] === 'ja' ? 'ja' : 'en';
}

export function setVoiceLang(profileId, lang) {
  const next = { ...load() };
  if (lang === 'ja') next[profileId] = 'ja';
  else delete next[profileId];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  setTimeout(() => touchSettings(profileId), 0);
}
