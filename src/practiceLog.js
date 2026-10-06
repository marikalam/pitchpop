import { dayKey, streakFor } from './streak.js';

// Saved practices, per player, on this device: [{ day, minutes, endedAt }].
// Only practices of MIN_PRACTICE_MINUTES or more are saved; the practice
// streak counts days with at least one saved practice, using the same
// rules as the game streak (streak.js).
const LOG_KEY = 'pitchpop-practice-log-v1';
export const MIN_PRACTICE_MINUTES = 5;
// A timer still running after this long was almost certainly left on by
// mistake: it stops itself there and asks how long the practice really was
// (PracticeMode.jsx).
export const MAX_PRACTICE_MINUTES = 120;
// Players collect a token for every TOKEN_MINUTES of a saved practice.
// Tokens are worked out from the saved practices rather than stored, so
// practices saved before tokens existed count too.
export const TOKEN_MINUTES = 5;

export function tokensFor(minutes) {
  return Math.floor(minutes / TOKEN_MINUTES);
}

export function loadPracticeLog() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOG_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

// Returns the updated log.
export function recordPractice(log, profileId, minutes, ended = new Date()) {
  const entry = { day: dayKey(ended), minutes, endedAt: ended.toISOString() };
  const next = { ...log, [profileId]: [...(log[profileId] || []), entry] };
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  // historySync.js sends it to the family account.
  window.dispatchEvent(new CustomEvent('pitchpop-history-changed', { detail: profileId }));
  return next;
}

// Replaces one player's saved practices (with the synced list from the
// family account).
export function replacePlayerPractices(profileId, entries) {
  const next = { ...loadPracticeLog(), [profileId]: entries };
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function practiceStats(entries = [], today = new Date()) {
  const todayKey = dayKey(today);
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
  const weekStartKey = dayKey(weekStart);
  const sum = (list) => list.reduce((total, e) => total + e.minutes, 0);
  return {
    todayMinutes: sum(entries.filter((e) => e.day === todayKey)),
    weekMinutes: sum(entries.filter((e) => e.day >= weekStartKey)),
    totalMinutes: sum(entries),
    count: entries.length,
    tokens: entries.reduce((total, e) => total + tokensFor(e.minutes), 0),
    streak: streakFor(
      entries.map((e) => e.day),
      todayKey,
    ),
    recent: [...entries].reverse().slice(0, 5),
  };
}

// "45 min", "1 h", "2 h 5 min"
export function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
