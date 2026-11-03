import { touchSettings } from './settingsClock.js';

// Each player's Theory quiz level (Players & colors): 1 the basics, 2 a bit
// more, 3 every term (theoryGlossary.js). Basics until a grown-up picks.
const KEY = 'pitchpop-theory-level-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function theoryLevel(playerId) {
  const level = Number(load()[playerId]);
  return [1, 2, 3].includes(level) ? level : 1;
}

export function setTheoryLevel(playerId, level) {
  setTimeout(() => touchSettings(playerId), 0);
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), [playerId]: level }));
  } catch {
    /* ignore */
  }
}
