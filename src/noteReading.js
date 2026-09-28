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

// Each clef covers its five lines plus one ledger line above and below:
// treble from middle C (C4) to A5, bass from E2 up to middle C (C4).
export const CLEFS = {
  treble: { label: 'Treble', bottomLine: step('E', 4), low: step('C', 4), high: step('A', 5) },
  bass: { label: 'Bass', bottomLine: step('G', 2), low: step('E', 2), high: step('C', 4) },
};

export function notesFor(clef) {
  const { low, high } = CLEFS[clef];
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

// clef: 'treble' or 'bass'. Works through shuffled passes of the whole
// pool so every note comes up before any repeats, and never shows the
// same note twice in a row.
export function buildNoteQueue(clef, total) {
  const pool = notesFor(clef);
  const queue = [];
  while (queue.length < total) {
    let pass = shuffle(pool);
    if (sameNote(pass[0], queue[queue.length - 1])) pass = [...pass.slice(1), pass[0]];
    queue.push(...pass);
  }
  return queue.slice(0, total);
}
