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

// How much each color needs practice, from 0 (always right lately) to 1,
// from the player's last LOOKBACK rounds. Newer rounds count more, so a
// color that's been fixed stops coming back. A color mixed up with another
// counts for both (the ear has to tell them apart), the other at half.
// A color with no rounds yet gets NEW_COLOR_NEED.
const LOOKBACK = 8;
const RECENCY = 0.75;
const NEW_COLOR_NEED = 0.4;
const MAX_SHARE = 0.4;

export function colorNeeds(history = [], names) {
  const missed = {};
  const seen = {};
  history.slice(-LOOKBACK).reverse().forEach((round, age) => {
    const w = RECENCY ** age;
    Object.entries(round.colors || {}).forEach(([name, c]) => {
      if (names.includes(name)) {
        seen[name] = (seen[name] || 0) + w * c.total;
        missed[name] = (missed[name] || 0) + w * (c.total - c.right);
      }
      Object.entries(c.mixedWith || {}).forEach(([other, n]) => {
        if (names.includes(other)) missed[other] = (missed[other] || 0) + 0.5 * w * n;
      });
    });
  });
  const needs = {};
  names.forEach((name) => {
    needs[name] = seen[name] ? Math.min(1, (missed[name] || 0) / seen[name]) : NEW_COLOR_NEED;
  });
  return needs;
}

// The colors that come back more in the next rounds (up to two), trickiest
// first. Empty without any rounds yet.
export function focusColors(history = [], names) {
  if (!history.length) return [];
  const needs = colorNeeds(history, names);
  return names
    .filter((n) => needs[n] >= 0.2)
    .sort((a, b) => needs[b] - needs[a])
    .slice(0, 2);
}

// A round of `total` chords from the player's colors, built from their
// history to help them remember their mistakes:
// - every color comes at least once, and colors missed or mixed up lately
//   come more often (up to 3x as often as one that's always right, and at
//   most 40% of the round, so it can't be guessed - 60% with two colors);
// - the round opens with the trickiest one from last time (a warm-up that
//   makes them remember it);
// - the same color never comes twice in a row, so each one has to be
//   recalled again rather than repeated (with 3 or more colors; with only
//   two, never repeating would just make them take turns).
// With no history it's an even mix, like before.
export function practiceQueue(names, total, history = [], random = Math.random) {
  if (!names.length) return [];
  const needs = colorNeeds(history, names);
  const pickFrom = (list) => list[Math.floor(random() * list.length)];

  let counts;
  if (names.length >= total) {
    // More colors than chords: the neediest ones, then any.
    const order = [...names].sort((a, b) => needs[b] - needs[a] || random() - 0.5).slice(0, total);
    counts = Object.fromEntries(order.map((n) => [n, 1]));
  } else {
    const weights = names.map((n) => 1 + 2 * needs[n]);
    const sum = weights.reduce((a, b) => a + b, 0);
    const extra = total - names.length;
    const shares = weights.map((w) => (extra * w) / sum);
    counts = Object.fromEntries(names.map((n, i) => [n, 1 + Math.floor(shares[i])]));
    // Hand out what rounding left over to the largest remainders.
    let left = total - Object.values(counts).reduce((a, b) => a + b, 0);
    const byRemainder = names
      .map((n, i) => [n, shares[i] - Math.floor(shares[i]) + random() * 1e-6])
      .sort((a, b) => b[1] - a[1]);
    for (let i = 0; left > 0; i = (i + 1) % byRemainder.length, left -= 1) counts[byRemainder[i][0]] += 1;
    // Not so often that it's a safe guess (and always spaced out): the
    // extra goes to the others, one at a time.
    // (With only two colors, 60%.)
    if (names.length >= 2) {
      const cap = Math.ceil(total * (names.length >= 3 ? MAX_SHARE : 0.6));
      names.forEach((n) => {
        while (counts[n] > cap) {
          counts[n] -= 1;
          const other = names.filter((o) => o !== n).sort((a, b) => needs[b] - needs[a] || counts[a] - counts[b])[0];
          counts[other] += 1;
        }
      });
    }
  }

  const queue = [];
  const warmUp = focusColors(history, names)[0];
  if (warmUp && counts[warmUp]) {
    queue.push(warmUp);
    counts[warmUp] -= 1;
  }
  let remaining = Object.values(counts).reduce((a, b) => a + b, 0);
  if (names.length < 3) {
    const rest = Object.entries(counts).flatMap(([n, c]) => Array(c).fill(n));
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return queue.concat(rest);
  }
  while (remaining > 0) {
    const prev = queue[queue.length - 1];
    // Something with (nearly) the most left, so the frequent colors stay
    // spread out to the end; never the color just played unless nothing
    // else is left.
    const open = Object.keys(counts).filter((n) => counts[n] > 0 && n !== prev);
    const pool = open.length ? open : Object.keys(counts).filter((n) => counts[n] > 0);
    const most = Math.max(...pool.map((n) => counts[n]));
    // Only picks that still leave a way to finish without two in a row.
    const fits = (pick) => {
      const rest = remaining - 1;
      return Object.keys(counts).every((n) => {
        const left = counts[n] - (n === pick ? 1 : 0);
        return left <= (n === pick ? Math.floor(rest / 2) : Math.ceil(rest / 2));
      });
    };
    const near = pool.filter((n) => counts[n] >= most - 1);
    const safe = near.filter(fits);
    const name = pickFrom(safe.length ? safe : pool.filter((n) => counts[n] === most));
    queue.push(name);
    counts[name] -= 1;
    remaining -= 1;
  }
  return queue;
}
