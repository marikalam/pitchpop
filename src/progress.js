import { dayKey, streakFor } from './streak.js';

// A player's last 7 days for the parent progress page (Progress.jsx), from
// their finished Pitch Practice rounds (roundHistory.js) and streak days.
export function weekProgress(rounds = [], days = [], colorNames = [], today = new Date()) {
  const keys = Array.from({ length: 7 }, (_, i) =>
    dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i)),
  );
  const week = rounds.filter((r) => r.day >= keys[0]);
  const perDay = keys.map((key) => ({ key, rounds: week.filter((r) => r.day === key).length }));
  const right = week.reduce((n, r) => n + r.correct, 0);
  const total = week.reduce((n, r) => n + r.total, 0);

  // Each color's first-try score this week (or, with nothing this week,
  // over the last 5 rounds), and what it's most often mixed up with.
  const source = week.length ? week : rounds.slice(-5);
  const colors = colorNames.map((name) => {
    let r = 0;
    let t = 0;
    const mixed = {};
    source.forEach((round) => {
      const c = round.colors?.[name];
      if (!c) return;
      r += c.right;
      t += c.total;
      Object.entries(c.mixedWith || {}).forEach(([o, n]) => (mixed[o] = (mixed[o] || 0) + n));
    });
    const partner = Object.entries(mixed).sort((a, b) => b[1] - a[1])[0];
    return { name, pct: t ? Math.round((100 * r) / t) : null, partner: partner ? partner[0] : null, misses: t - r };
  });
  const worst = colors.filter((c) => c.pct !== null && c.pct < 90 && c.partner).sort((a, b) => a.pct - b.pct)[0] || null;

  // Ready for a new color: 90%+ on every color in each of the last 2 rounds.
  const lastTwo = rounds.slice(-2);
  const ready =
    lastTwo.length === 2 &&
    lastTwo.every((round) =>
      colorNames.every((name) => {
        const c = round.colors?.[name];
        return c && c.total && c.right / c.total >= 0.9;
      }),
    );

  return {
    perDay,
    roundsThisWeek: week.length,
    pctRight: total ? Math.round((100 * right) / total) : null,
    streak: streakFor(days, dayKey(today)).current,
    colors,
    worst,
    ready,
  };
}

// The usual order to learn the colors in (the Eguchi method): red, yellow
// and blue first, brown last.
export const LEARNING_ORDER = ['red', 'yellow', 'blue', 'black', 'green', 'orange', 'purple', 'pink', 'brown'];
// Ready for the next color: at least READY_PCT% right on every color,
// READY_ROUNDS finished rounds in a row.
export const READY_PCT = 90;
export const READY_ROUNDS = 2;

// Where a player is on the way through PitchPop (the guide in Players &
// colors): step 1 Tiny Tots, 2 the first three colors, 3 adding colors
// one at a time, 4 typing the notes. With whether they're ready to move
// on, the next color to add, and the color holding them back.
export function learningStatus({ colors, tinyTots, typingNotes, rounds = [] }) {
  if (tinyTots) return { step: 1 };
  const next = LEARNING_ORDER.find((name) => !colors.includes(name)) || null;
  const recent = rounds.slice(-READY_ROUNDS);
  // Each color's lowest score over those rounds.
  const scores = colors.map((name) => {
    const pcts = recent.map((r) => {
      const c = r.colors?.[name];
      return c && c.total ? Math.round((100 * c.right) / c.total) : null;
    });
    return { name, pct: pcts.includes(null) ? null : Math.min(...pcts) };
  });
  const enough = recent.length === READY_ROUNDS;
  const ready = enough && scores.every((s) => s.pct !== null && s.pct >= READY_PCT);
  const weakest = scores.filter((s) => s.pct !== null && s.pct < READY_PCT).sort((a, b) => a.pct - b.pct)[0] || null;
  const step = typingNotes ? 4 : colors.length <= 3 ? 2 : 3;
  return { step, next, ready, enough, weakest, allColors: !next };
}
