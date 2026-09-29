// Note-reading model for NoteSpeller: which notes each clef quizzes and
// where each one sits on the staff.
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// A diatonic step count, so "one line or space higher" is always +1.
function step(letter, octave) {
  return octave * 7 + LETTERS.indexOf(letter);
}

function fromStep(s) {
  return { letter: LETTERS[((s % 7) + 7) % 7], octave: Math.floor(s / 7) };
}

export const CLEFS = {
  treble: { label: 'Treble', bottomLine: step('E', 4) },
  bass: { label: 'Bass', bottomLine: step('G', 2) },
};

// Which notes each level quizzes, per clef:
// - easy: the five notes of middle C position (treble C4-G4, bass F3-C4),
//   the first ones piano beginners read;
// - medium: the five lines plus one ledger line above and below (treble
//   middle C to A5, bass E2 to middle C) - NoteSpeller's original range;
// - hard: two ledger lines above and below (treble A3-C6, bass C2-E4).
export const LEVELS = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
];

const RANGES = {
  easy: { treble: [step('C', 4), step('G', 4)], bass: [step('F', 3), step('C', 4)] },
  medium: { treble: [step('C', 4), step('A', 5)], bass: [step('E', 2), step('C', 4)] },
  hard: { treble: [step('A', 3), step('C', 6)], bass: [step('C', 2), step('E', 4)] },
};

export function notesFor(clef, level = 'medium') {
  const [low, high] = RANGES[level][clef];
  const notes = [];
  for (let s = low; s <= high; s++) notes.push({ clef, ...fromStep(s) });
  return notes;
}

// Staff position: 0 is the bottom line, 1 the space above it, 8 the top
// line; negatives are below the staff and 10+ above it.
export function staffPosition(note) {
  return step(note.letter, note.octave) - CLEFS[note.clef].bottomLine;
}

// Ledger line positions a note needs (always even positions outside 0-8).
export function ledgerLines(position) {
  const lines = [];
  for (let p = -2; p >= position; p -= 2) lines.push(p);
  for (let p = 10; p <= position; p += 2) lines.push(p);
  return lines;
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const sameNote = (a, b) => a && b && a.clef === b.clef && a.letter === b.letter && a.octave === b.octave;

// The answer buttons for a level: easy only offers the letters it can ask,
// so beginners pick from five instead of seven.
export function lettersFor(clef, level = 'medium') {
  const inPool = new Set(notesFor(clef, level).map((n) => n.letter));
  return LETTERS.filter((l) => inPool.has(l));
}

// clef: 'treble' or 'bass'. Works through shuffled passes of the whole
// pool so every note comes up before any repeats, and never shows the
// same note twice in a row.
export function buildNoteQueue(clef, total, level = 'medium') {
  const pool = notesFor(clef, level);
  const queue = [];
  while (queue.length < total) {
    let pass = shuffle(pool);
    if (sameNote(pass[0], queue[queue.length - 1])) pass = [...pass.slice(1), pass[0]];
    queue.push(...pass);
  }
  return queue.slice(0, total);
}
