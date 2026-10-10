import { loadRoundHistory } from './roundHistory.js';

// Smart rounds: a Pitch Practice round still has 20 chords, but the colors
// a player missed in their last few rounds come up more often, the color
// they mix one up with is played right next to it, the first two chords
// and the last are ones they know (to start and end on a win), and a
// missed chord comes back a few chords later (see comebackQueue). Players
// can be switched back to plain even rounds (Players & colors).

const LOOKBACK = 3;
// The newest round counts most.
const ROUND_WEIGHTS = [3, 2, 1];
const MAX_SHARE = 1 / 3;
const OFF_KEY = 'pitchpop-smart-off-v1';

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadOff() {
  try {
    return JSON.parse(localStorage.getItem(OFF_KEY)) || {};
  } catch {
    return {};
  }
}

export function smartRoundsOn(profileId) {
  return !loadOff()[profileId];
}

export function setSmartRounds(profileId, on) {
  const next = { ...loadOff() };
  if (on) delete next[profileId];
  else next[profileId] = true;
  try {
    localStorage.setItem(OFF_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

// Each color's weighted first-try score over the last rounds, what it was
// mistaken for, and whether it has "graduated" (90%+ in each of the last
// two rounds it was played in).
function recentScores(profileId, names) {
  const rounds = (loadRoundHistory()[profileId] || []).slice(-LOOKBACK).reverse();
  const scores = {};
  names.forEach((name) => {
    let right = 0;
    let total = 0;
    const mixedWith = {};
    const perRound = [];
    rounds.forEach((round, i) => {
      const c = round.colors?.[name];
      if (!c || !c.total) return;
      const w = ROUND_WEIGHTS[i] || 1;
      right += c.right * w;
      total += c.total * w;
      perRound.push(c.right / c.total);
      Object.entries(c.mixedWith || {}).forEach(([other, n]) => {
        if (names.includes(other)) mixedWith[other] = (mixedWith[other] || 0) + n * w;
      });
    });
    const partner = Object.entries(mixedWith).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const graduated = perRound.length >= 2 && perRound[0] >= 0.9 && perRound[1] >= 0.9;
    scores[name] = { missRate: total ? 1 - right / total : 0, partner, graduated, played: total > 0 };
  });
  return scores;
}

// The colors to focus on: missed more than 15% of the time lately and not
// yet graduated, worst first.
function focusColors(scores) {
  return Object.entries(scores)
    .filter(([, s]) => s.missRate > 0.15 && !s.graduated)
    .sort((a, b) => b[1].missRate - a[1].missRate)
    .map(([name]) => name);
}

// How many of the round's chords each color gets: everyone some, focus
// colors more (up to a third of the round each).
function allocate(names, scores, focus, total) {
  const weights = names.map((n) => (focus.includes(n) ? 1 + 4 * scores[n].missRate : 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  // Up to a third of the round, or a bit over an even share when a player
  // has only a few colors.
  const cap = Math.max(Math.ceil(total * MAX_SHARE), Math.ceil(total / names.length) + Math.ceil(total * 0.1));
  const min = names.length * 2 <= total ? 2 : 1;
  const exact = weights.map((w) => (w / sum) * total);
  const counts = exact.map((x) => Math.min(cap, Math.max(min, Math.floor(x))));
  // Hand out what's left by largest remainder (or take back from the
  // biggest non-focus shares if over).
  let left = total - counts.reduce((a, b) => a + b, 0);
  const order = names.map((_, i) => i).sort((a, b) => exact[b] - Math.floor(exact[b]) - (exact[a] - Math.floor(exact[a])));
  for (let guard = 0; left > 0 && guard < 100; guard++) {
    const i = order[guard % order.length];
    if (counts[i] < cap) {
      counts[i] += 1;
      left -= 1;
    }
  }
  for (let guard = 0; left < 0 && guard < 100; guard++) {
    const i = counts.indexOf(Math.max(...counts));
    counts[i] -= 1;
    left += 1;
  }
  return Object.fromEntries(names.map((n, i) => [n, counts[i]]));
}

// Puts `pool` in a random order with no color three times in a row
// (counting the two chords before it, `before`): each step picks a
// remaining color at random, weighted by how many are left, never one that
// would make three in a row (unless nothing else is left).
function arrange(pool, before = []) {
  const left = {};
  pool.forEach((c) => (left[c] = (left[c] || 0) + 1));
  const out = [...before];
  for (let n = 0; n < pool.length; n++) {
    const blocked = out.length >= 2 && out[out.length - 1] === out[out.length - 2] ? out[out.length - 1] : null;
    let choices = Object.keys(left).filter((c) => left[c] > 0 && c !== blocked);
    if (!choices.length) choices = Object.keys(left).filter((c) => left[c] > 0);
    // Favor the color with the most left when it's running away, so the
    // end of the round doesn't pile up one color.
    const weights = choices.map((c) => left[c] ** 2);
    let r = Math.random() * weights.reduce((x, y) => x + y, 0);
    let pick = choices[choices.length - 1];
    for (let i = 0; i < choices.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = choices[i];
        break;
      }
    }
    out.push(pick);
    left[pick] -= 1;
  }
  return out.slice(before.length);
}

const tripleAt = (q, k) => k >= 2 && q[k] === q[k - 1] && q[k] === q[k - 2];

// Builds a round: { queue, focus } where focus is null or
// { name, partner } for the "Today's focus" tag.
export function buildSmartRound(profileId, names, total, plainQueue) {
  if (!smartRoundsOn(profileId) || names.length < 2) return { queue: plainQueue(names, total), focus: null };
  const scores = recentScores(profileId, names);
  const focus = focusColors(scores);
  if (!focus.length) return { queue: plainQueue(names, total), focus: null };

  const counts = allocate(names, scores, focus, total);
  const pool = names.flatMap((n) => Array(counts[n]).fill(n));

  // Start with two colors they know and end with one, when there are any.
  const strong = shuffle(names.filter((n) => !focus.includes(n)));
  const take = (name) => {
    const i = pool.indexOf(name);
    if (i >= 0) pool.splice(i, 1);
    return i >= 0 ? name : null;
  };
  let opening = [strong[0], strong[1] || strong[0]].filter(Boolean).map(take).filter(Boolean);
  let closing = strong.length ? [take(strong[strong.length - 1])].filter(Boolean) : [];
  // With only a few colors, taking those out can leave too few others to
  // keep the focus color from coming three times in a row: then no
  // special opening and closing.
  const most = Math.max(...names.map((n) => pool.filter((c) => c === n).length));
  if (most > 2 * (pool.length - most + 1)) {
    pool.push(...opening, ...closing);
    opening = [];
    closing = [];
  }
  // The middle, with the color left for the end not ending it twice in
  // a row too.
  let middle = arrange(pool, opening);

  // The worst color and the one it's mixed up with, side by side (twice),
  // where that doesn't make three in a row.
  const main = focus[0];
  const partner = scores[main].partner;
  if (partner) {
    for (let pairs = 0; pairs < 2; pairs++) {
      const full = () => [...opening, ...middle, ...closing];
      const mains = middle.map((c, k) => k).filter((k) => middle[k] === main && middle[k + 1] !== partner && middle[k - 1] !== partner);
      let done = false;
      for (const keep of shuffle(mains)) {
        const j = middle.findIndex((c, k) => c === partner && Math.abs(k - keep) > 1);
        if (j < 0) break;
        const saved = [...middle];
        middle.splice(j, 1);
        const m = j < keep ? keep - 1 : keep;
        middle.splice(m + 1, 0, partner);
        const q = full();
        if (q.some((_, k) => tripleAt(q, k))) middle = saved;
        else {
          done = true;
          break;
        }
      }
      if (!done) break;
    }
  }
  let queue = [...opening, ...middle, ...closing].slice(0, total);
  // A closing color that makes three in a row with the end of the middle:
  // let another known color close instead, or just keep the order.
  if (tripleAt(queue, queue.length - 1)) {
    const k = queue.slice(0, -1).findLastIndex((c, i) => i >= 2 && c !== queue[queue.length - 1] && !focus.includes(c));
    if (k > 0) {
      const q = [...queue];
      [q[k], q[q.length - 1]] = [q[q.length - 1], q[k]];
      if (!q.some((_, i) => tripleAt(q, i))) queue = q;
    }
  }
  // Any three in a row left: swap one with another color further on.
  for (let i = 2; i < queue.length; i++) {
    if (!tripleAt(queue, i)) continue;
    for (let j = opening.length; j < queue.length; j++) {
      if (queue[j] === queue[i]) continue;
      const q = [...queue];
      [q[i], q[j]] = [q[j], q[i]];
      if (!q.some((_, k) => tripleAt(q, k))) {
        queue = q;
        break;
      }
    }
  }
  return { queue, focus: { name: main, partner } };
}

// A chord missed at `index` comes back three chords later (taking the
// place of another color's chord there), unless it's already coming up.
export function comebackQueue(queue, index, name) {
  const at = index + 3;
  if (at >= queue.length - 1) return queue;
  if (queue.slice(index + 1, at + 2).includes(name)) return queue;
  const next = [...queue];
  next[at] = name;
  return next;
}
