import { dayKey } from './streak.js';

// Each player's finished Pitch Practice rounds, on this device: the score
// and, per color, how many of its chords were right on the first try,
// plus what a missed color was mistaken for. Shown on the "All done!"
// screen as recent rounds and "what to work on".
const KEY = 'pitchpop-round-history-v1';
const KEEP = 60;

export function loadRoundHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

// queue: the round's colors in order; outcomes: { roundIndex: firstTryRight };
// mixups: { roundIndex: color picked first when wrong }.
export function summarizeRound(queue, outcomes, mixups) {
  const colors = {};
  queue.forEach((name, i) => {
    const c = colors[name] || { right: 0, total: 0, mixedWith: {} };
    c.total += 1;
    if (outcomes[i]) c.right += 1;
    else if (mixups[i]) c.mixedWith[mixups[i]] = (c.mixedWith[mixups[i]] || 0) + 1;
    colors[name] = c;
  });
  const correct = Object.values(outcomes).filter(Boolean).length;
  return { correct, total: queue.length, colors };
}

export function recordRound(profileId, summary, ended = new Date()) {
  const all = loadRoundHistory();
  const entry = { day: dayKey(ended), endedAt: ended.toISOString(), ...summary };
  const next = { ...all, [profileId]: [...(all[profileId] || []), entry].slice(-KEEP) };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next[profileId];
}

// The color to practice next: the lowest first-try score this round (ties:
// more chords of it), with what it was most often mistaken for. null when
// every color was right.
export function colorToWorkOn(summary) {
  const missed = Object.entries(summary.colors).filter(([, c]) => c.right < c.total);
  if (!missed.length) return null;
  missed.sort(([, a], [, b]) => a.right / a.total - b.right / b.total || b.total - a.total);
  const [name, c] = missed[0];
  const mixed = Object.entries(c.mixedWith).sort((a, b) => b[1] - a[1])[0];
  return { name, right: c.right, total: c.total, mixedWith: mixed ? mixed[0] : null };
}
