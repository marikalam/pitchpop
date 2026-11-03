import { keepsRecords } from './records.js';
import { dayKey } from './streak.js';
import { weekProgress } from './progress.js';
import { practiceStats } from './practiceLog.js';
import { earnSticker } from './stickerStore.js';

// "Today's practice" on the home page: a short list for each player made
// from their history (the colors they mix up, the notes they missed in
// NoteSpeller, yesterday's piano minutes). Finishing the whole list earns
// one bonus sticker a day.
const NOTES_KEY = 'pitchpop-notespeller-log-v1';
const DONE_KEY = 'pitchpop-today-done-v1';
const BONUS_KEY = 'pitchpop-today-bonus-v1';
const KEEP_NOTE_ROUNDS = 20;

function read(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('pitchpop-today-changed'));
}

// A finished NoteSpeller round and the letters missed in it ({ E: 2 }).
export function recordNoteRound(playerId, misses, ended = new Date()) {
  if (!keepsRecords()) return;
  const all = read(NOTES_KEY);
  const entry = { day: dayKey(ended), misses };
  write(NOTES_KEY, { ...all, [playerId]: [...(all[playerId] || []), entry].slice(-KEEP_NOTE_ROUNDS) });
}

// Something without a history of its own done today (Tiny Tots, the
// Theory quiz).
export function markDoneToday(playerId, id) {
  if (!keepsRecords()) return;
  const all = read(DONE_KEY);
  write(DONE_KEY, { ...all, [playerId]: { ...(all[playerId]?.day === dayKey() ? all[playerId] : { day: dayKey() }), [id]: true } });
}

// One more done today (a Pitch Practice round played some other way than
// the color game, which keeps its own history): Tiny Tots, Single notes.
export function countToday(playerId, id) {
  if (!keepsRecords()) return;
  const all = read(DONE_KEY);
  const mine = all[playerId]?.day === dayKey() ? all[playerId] : { day: dayKey() };
  write(DONE_KEY, { ...all, [playerId]: { ...mine, [id]: timesToday(mine, id) + 1 } });
}

// How many times today (markDoneToday's `true` counts as once).
function timesToday(entry, id) {
  if (!entry || entry.day !== dayKey()) return 0;
  const v = entry[id];
  return v === true ? 1 : Number(v) || 0;
}

// Pitch Practice is played several times a day; it's done for the day at
// this many rounds.
export const PITCH_ROUNDS_A_DAY = 4;

const cap = (n) => n.charAt(0).toUpperCase() + n.slice(1);

// The list for one player: [{ id, icon, title, sub, done }].
export function todayPlan({
  playerId,
  rounds = [],
  practices = [],
  colorNames = [],
  tinyTots = false,
  singleNotes = false,
  notes = true,
}) {
  const today = dayKey();
  const items = [];
  // Pitch Practice rounds today, however they were played.
  const doneToday = read(DONE_KEY)[playerId];
  const pitchCount =
    rounds.filter((r) => r.day === today).length + timesToday(doneToday, 'tots') + timesToday(doneToday, 'color-test');
  const pitch = { count: pitchCount, target: PITCH_ROUNDS_A_DAY, done: pitchCount >= PITCH_ROUNDS_A_DAY };

  if (tinyTots) {
    items.push({
      id: 'tots',
      icon: 'rainbow',
      title: 'Tiny Tots',
      sub: `${pitchCount} of ${PITCH_ROUNDS_A_DAY} today · tap each color and listen`,
      ...pitch,
    });
  } else {
    // The pair mixed up most this week gets extra chords in the round
    // (smartRound.js).
    const { worst } = weekProgress(rounds, [], colorNames);
    items.push({
      id: 'color-test',
      icon: worst ? 'target' : 'rainbow',
      title: worst
        ? `${singleNotes ? 'Chord Colors' : 'Pitch Practice'}: ${cap(worst.name)} or ${cap(worst.partner)}?`
        : singleNotes
          ? 'Chord Colors'
          : 'Pitch Practice',
      sub: `${pitchCount} of ${PITCH_ROUNDS_A_DAY} today · ${
        worst
          ? `missed ${worst.misses} ${worst.misses === 1 ? 'time' : 'times'} this week`
          : colorNames.map(cap).join(', ')
      }`,
      ...pitch,
    });
    // Note Hunt, right after the chords: 20 single notes, as often.
    if (singleNotes) {
      const notesToday = timesToday(doneToday, 'single-notes');
      items.push({
        id: 'single-notes',
        icon: 'keys',
        title: 'Note Hunt',
        sub: `${notesToday} of ${PITCH_ROUNDS_A_DAY} today · 20 single notes, middle C to high C`,
        count: notesToday,
        target: PITCH_ROUNDS_A_DAY,
        done: notesToday >= PITCH_ROUNDS_A_DAY,
      });
    }
  }

  if (notes && !tinyTots) {
    const noteRounds = read(NOTES_KEY)[playerId] || [];
    const last = [...noteRounds].reverse().find((r) => r.day !== today) || null;
    const tricky = last
      ? Object.entries(last.misses || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
      : [];
    const missed = tricky.reduce((n, [, count]) => n + count, 0);
    items.push({
      id: 'notespeller',
      icon: 'staff',
      title: tricky.length ? `NoteSpeller: ${tricky.map(([l]) => l).join(' and ')}` : 'NoteSpeller',
      sub: tricky.length
        ? `Missed ${missed} ${missed === 1 ? 'time' : 'times'} last time · 20 notes`
        : last
          ? 'All right last time! · 20 notes'
          : 'Read 20 notes on the staff',
      done: noteRounds.some((r) => r.day === today),
    });
  }

  if (!tinyTots) {
    items.push({
      id: 'theory',
      icon: 'book',
      title: 'Theory quiz',
      sub: '20 music signs',
      done: !!(read(DONE_KEY)[playerId]?.day === today && read(DONE_KEY)[playerId]?.theory),
    });
  }

  const { todayMinutes, week } = practiceStats(practices);
  const yesterday = week[5]?.minutes || 0;
  items.push({
    id: 'practice',
    icon: 'timer',
    title: 'Piano practice',
    sub: todayMinutes
      ? `${todayMinutes} min today`
      : yesterday
        ? `Yesterday was ${yesterday} min`
        : 'Start the timer, then play',
    // Any saved practice today (practiceLog.js keeps those of 5+ minutes).
    done: todayMinutes > 0,
  });

  return items;
}

// The day's bonus sticker, once, when the whole list is done. True when it
// was given just now.
export function giveBonusIfDone(playerId, items) {
  if (!keepsRecords() || !items.length || !items.every((i) => i.done)) return false;
  const given = read(BONUS_KEY);
  if (given[playerId] === dayKey()) return false;
  write(BONUS_KEY, { ...given, [playerId]: dayKey() });
  earnSticker(playerId);
  return true;
}

export function bonusGivenToday(playerId) {
  return read(BONUS_KEY)[playerId] === dayKey();
}
