// Practice streaks, per player: the set of days each player finished a
// round, stored on this device like the rest of their progress.
const STREAK_KEY = 'pitchpop-streak-days-v1';

// Local calendar day ("2026-09-28"), so a streak follows the family's own
// midnight rather than UTC's.
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function previousDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function loadStreakDays() {
  try {
    const saved = JSON.parse(localStorage.getItem(STREAK_KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

// Returns the updated map; a day is only recorded once.
export function recordStreakDay(allDays, profileId, today = dayKey()) {
  const days = allDays[profileId] || [];
  if (days.includes(today)) return allDays;
  const next = { ...allDays, [profileId]: [...days, today].sort() };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

// current: consecutive days ending today, or ending yesterday if today
// isn't done yet (the streak is still alive until today ends).
// doneToday: whether today already counts. best: longest run ever.
export function streakFor(days = [], today = dayKey()) {
  const set = new Set(days);
  const doneToday = set.has(today);

  let current = 0;
  let cursor = doneToday ? today : previousDay(today);
  while (set.has(cursor)) {
    current += 1;
    cursor = previousDay(cursor);
  }

  let best = 0;
  let run = 0;
  let prev = null;
  for (const day of [...set].sort()) {
    run = prev && previousDay(day) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }

  return { current, best, doneToday };
}
