// The Music Theory glossary: simple terms, each with a short kid-friendly
// explanation and a small picture.
//
// Pictures are described, not drawn, here; MusicTheory.jsx renders them.
// Units are staff spaces. x runs left to right; `pos` is a staff position
// as in noteReading.js: 0 is the bottom line, 1 the space above it, up to
// 8 for the top line (negatives below the staff, 9+ above it).
// - width: picture width in staff spaces
// - staff: draw the five staff lines
// - glyphs: symbols from theoryGlyphs.js, placed by their reference point
// - ledgers: short ledger lines centred at x
// - barlines: plain vertical bar lines at x
// - hairpins: crescendo (open to the right) or diminuendo (open to the left)
// - curves: a tie or slur arc from x1 to x2, bowing below pos
// - focus: in a picture with more in it than the term, the part the term
//   is about, drawn highlighted: { glyphs: [indexes], ledgers, barlines,
//   curves } (e.g. the ledger line under the note, the ♯ before it)

// Notehead widths, for centring marks on a note.
const WHOLE_HEAD = 1.84;
const HEAD = 1.18;

export const THEORY_CATEGORIES = [
  { id: 'staff', label: 'Staff & clefs' },
  { id: 'notes', label: 'Notes & rests' },
  { id: 'accidentals', label: 'Sharps & flats' },
  { id: 'dynamics', label: 'Loud & soft' },
  { id: 'signs', label: 'Signs & marks' },
];

export const GLOSSARY = [
  // Staff & clefs
  {
    id: 'staff',
    category: 'staff',
    term: 'Staff',
    text: 'The five lines and four spaces that music is written on. Higher notes sit higher on the staff.',
    picture: { width: 6, staff: true },
  },
  {
    id: 'treble-clef',
    category: 'staff',
    term: 'Treble clef',
    also: 'G clef',
    text: 'Curls around the G line. It is used for higher notes, usually played by the right hand.',
    picture: {
      focus: { glyphs: [0] }, width: 4, staff: true, glyphs: [{ g: 'G_CLEF', x: 1, pos: 2 }] },
  },
  {
    id: 'bass-clef',
    category: 'staff',
    term: 'Bass clef',
    also: 'F clef',
    text: 'Its two dots sit on either side of the F line. It is used for lower notes, usually played by the left hand.',
    picture: {
      focus: { glyphs: [0] }, width: 4, staff: true, glyphs: [{ g: 'F_CLEF', x: 0.8, pos: 6 }] },
  },
  {
    id: 'line-note',
    category: 'staff',
    term: 'Line note',
    text: 'A note with a staff line going right through its middle.',
    picture: { focus: { glyphs: [0] }, width: 5, staff: true, glyphs: [{ g: 'WHOLE_NOTE', x: 1.6, pos: 4 }] },
  },
  {
    id: 'space-note',
    category: 'staff',
    term: 'Space note',
    text: 'A note sitting in a space, between two staff lines.',
    picture: { focus: { glyphs: [0] }, width: 5, staff: true, glyphs: [{ g: 'WHOLE_NOTE', x: 1.6, pos: 5 }] },
  },
  {
    id: 'middle-c',
    category: 'staff',
    term: 'Middle C',
    text: 'The C in the middle of the piano. In the treble clef it sits on a short line just below the staff.',
    picture: {
      focus: { glyphs: [1], ledgers: true },
      width: 6.5,
      staff: true,
      glyphs: [
        { g: 'G_CLEF', x: 1, pos: 2 },
        { g: 'WHOLE_NOTE', x: 4, pos: -2 },
      ],
      ledgers: [{ x: 4 + WHOLE_HEAD / 2, pos: -2, width: WHOLE_HEAD + 0.9 }],
    },
  },
  {
    id: 'going-up',
    category: 'staff',
    term: 'Notes going up',
    text: 'Each note is higher on the staff than the one before, so the music sounds higher and higher.',
    picture: {
      width: 6,
      staff: true,
      glyphs: [
        { g: 'QUARTER_NOTE_UP', x: 0.9, pos: 1 },
        { g: 'QUARTER_NOTE_UP', x: 2.5, pos: 3 },
        { g: 'QUARTER_NOTE_UP', x: 4.1, pos: 5 },
      ],
    },
  },
  {
    id: 'going-down',
    category: 'staff',
    term: 'Notes going down',
    text: 'Each note is lower on the staff than the one before, so the music sounds lower and lower.',
    picture: {
      width: 6,
      staff: true,
      glyphs: [
        { g: 'QUARTER_NOTE_UP', x: 0.9, pos: 5 },
        { g: 'QUARTER_NOTE_UP', x: 2.5, pos: 3 },
        { g: 'QUARTER_NOTE_UP', x: 4.1, pos: 1 },
      ],
    },
  },
  {
    id: 'step',
    category: 'staff',
    term: 'Step',
    text: 'From a line to the very next space (or a space to the next line): the next key on the piano.',
    picture: {
      width: 5,
      staff: true,
      glyphs: [
        { g: 'WHOLE_NOTE', x: 0.9, pos: 2 },
        { g: 'WHOLE_NOTE', x: 3.1, pos: 3 },
      ],
    },
  },
  {
    id: 'skip',
    category: 'staff',
    term: 'Skip',
    text: 'From a line to the next line (or a space to the next space): it skips one key on the piano.',
    picture: {
      width: 5,
      staff: true,
      glyphs: [
        { g: 'WHOLE_NOTE', x: 0.9, pos: 2 },
        { g: 'WHOLE_NOTE', x: 3.1, pos: 4 },
      ],
    },
  },
  {
    id: 'ledger-lines',
    category: 'staff',
    term: 'Ledger lines',
    text: 'Short extra lines for notes that are too high or too low for the staff. Middle C sits on one just below the treble staff.',
    picture: {
      focus: { ledgers: true },
      width: 6.5,
      staff: true,
      glyphs: [
        { g: 'G_CLEF', x: 1, pos: 2 },
        { g: 'WHOLE_NOTE', x: 4, pos: -2 },
      ],
      ledgers: [{ x: 4 + WHOLE_HEAD / 2, pos: -2, width: WHOLE_HEAD + 0.9 }],
    },
  },
  {
    id: 'bar-line',
    category: 'staff',
    term: 'Bar line & measure',
    text: 'A bar line divides the music into measures (also called bars), small groups of beats that make it easy to count.',
    picture: {
      focus: { barlines: true },
      width: 7.6,
      staff: true,
      glyphs: [
        { g: 'QUARTER_NOTE_UP', x: 0.8, pos: 3 },
        { g: 'QUARTER_NOTE_UP', x: 2.2, pos: 4 },
        { g: 'QUARTER_NOTE_UP', x: 4.8, pos: 5 },
        { g: 'QUARTER_NOTE_UP', x: 6.2, pos: 4 },
      ],
      barlines: [4.1],
    },
  },
  {
    id: 'final-bar-line',
    category: 'staff',
    term: 'Final bar line',
    text: 'A thin line and a thick line together mean the end of the piece.',
    picture: {
      focus: { glyphs: [1] },
      width: 5,
      staff: true,
      glyphs: [
        { g: 'HALF_NOTE_UP', x: 1.2, pos: 2 },
        { g: 'BARLINE_FINAL', x: 3.5, pos: 0 },
      ],
    },
  },
  {
    id: 'time-signature',
    category: 'staff',
    term: 'Time signature',
    text: 'The two numbers at the start. The top number says how many beats are in each measure; the bottom number says which note gets one beat. 4/4 means four quarter-note beats.',
    picture: {
      focus: { glyphs: [1, 2] },
      width: 5.5,
      staff: true,
      glyphs: [
        { g: 'G_CLEF', x: 0.8, pos: 2 },
        { g: 'TIME_SIG_4', x: 3.6, pos: 6 },
        { g: 'TIME_SIG_4', x: 3.6, pos: 2 },
      ],
    },
  },
  {
    id: 'common-time',
    category: 'staff',
    term: 'Common time',
    text: 'A "C" in place of the time signature. It means the same as 4/4: four beats in every measure.',
    picture: {
      focus: { glyphs: [1] },
      width: 5.5,
      staff: true,
      glyphs: [
        { g: 'G_CLEF', x: 0.8, pos: 2 },
        { g: 'TIME_SIG_COMMON', x: 3.6, pos: 4 },
      ],
    },
  },

  // Notes & rests
  {
    id: 'whole-note',
    category: 'notes',
    term: 'Whole note',
    text: 'An open oval with no stem. Hold it for 4 beats.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'WHOLE_NOTE', x: 1.6, pos: 3 }] },
  },
  {
    id: 'half-note',
    category: 'notes',
    term: 'Half note',
    text: 'An open oval with a stem. Hold it for 2 beats.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'HALF_NOTE_UP', x: 1.9, pos: 3 }] },
  },
  {
    id: 'quarter-note',
    category: 'notes',
    term: 'Quarter note',
    text: 'A filled-in oval with a stem. It gets 1 beat.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'QUARTER_NOTE_UP', x: 1.9, pos: 3 }] },
  },
  {
    id: 'eighth-note',
    category: 'notes',
    term: 'Eighth note',
    text: 'A quarter note with one flag. It gets half a beat, so two eighth notes fit in one beat.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'EIGHTH_NOTE_UP', x: 1.8, pos: 3 }] },
  },
  {
    id: 'sixteenth-note',
    category: 'notes',
    term: 'Sixteenth note',
    text: 'A note with two flags. It gets a quarter of a beat, so four sixteenth notes fit in one beat.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'SIXTEENTH_NOTE_UP', x: 1.8, pos: 3 }] },
  },
  {
    id: 'dotted-note',
    category: 'notes',
    term: 'Dotted note',
    text: 'A dot after a note makes it half as long again. A dotted half note lasts 3 beats (2 + 1).',
    picture: {
      focus: { glyphs: [1] },
      width: 5,
      staff: true,
      glyphs: [
        { g: 'HALF_NOTE_UP', x: 1.5, pos: 3 },
        { g: 'AUGMENTATION_DOT', x: 1.5 + HEAD + 0.45, pos: 3 },
      ],
    },
  },
  {
    id: 'whole-rest',
    category: 'notes',
    term: 'Whole rest',
    text: 'A small box hanging down from a line. Stay silent for a whole measure.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'REST_WHOLE', x: 1.95, pos: 6 }] },
  },
  {
    id: 'half-rest',
    category: 'notes',
    term: 'Half rest',
    text: 'A small box sitting on the middle line, like a hat. Stay silent for 2 beats.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'REST_HALF', x: 1.95, pos: 4 }] },
  },
  {
    id: 'quarter-rest',
    category: 'notes',
    term: 'Quarter rest',
    text: 'A squiggly line. Stay silent for 1 beat.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'REST_QUARTER', x: 2, pos: 4 }] },
  },
  {
    id: 'eighth-rest',
    category: 'notes',
    term: 'Eighth rest',
    text: 'Looks like a small 7. Stay silent for half a beat.',
    picture: { width: 5, staff: true, glyphs: [{ g: 'REST_EIGHTH', x: 2, pos: 4 }] },
  },

  // Sharps & flats
  {
    id: 'sharp',
    category: 'accidentals',
    term: 'Sharp ♯',
    text: 'Play the note one half step higher, usually the black key just to the right.',
    picture: {
      focus: { glyphs: [0] },
      width: 5.5,
      staff: true,
      glyphs: [
        { g: 'SHARP', x: 1.4, pos: 4 },
        { g: 'WHOLE_NOTE', x: 2.8, pos: 4 },
      ],
    },
  },
  {
    id: 'flat',
    category: 'accidentals',
    term: 'Flat ♭',
    text: 'Play the note one half step lower, usually the black key just to the left.',
    picture: {
      focus: { glyphs: [0] },
      width: 5.5,
      staff: true,
      glyphs: [
        { g: 'FLAT', x: 1.5, pos: 4 },
        { g: 'WHOLE_NOTE', x: 2.8, pos: 4 },
      ],
    },
  },
  {
    id: 'natural',
    category: 'accidentals',
    term: 'Natural ♮',
    text: 'Cancels a sharp or flat, so you play the plain note again (usually a white key).',
    picture: {
      focus: { glyphs: [0] },
      width: 5.5,
      staff: true,
      glyphs: [
        { g: 'NATURAL', x: 1.6, pos: 4 },
        { g: 'WHOLE_NOTE', x: 2.8, pos: 4 },
      ],
    },
  },

  // Loud & soft
  {
    id: 'piano',
    category: 'dynamics',
    term: 'Piano (p)',
    text: 'Italian for "soft". Play quietly.',
    picture: { width: 3, glyphs: [{ g: 'DYNAMIC_P', x: 0.8, pos: 4 }] },
  },
  {
    id: 'forte',
    category: 'dynamics',
    term: 'Forte (f)',
    text: 'Italian for "strong". Play loudly.',
    picture: { width: 3, glyphs: [{ g: 'DYNAMIC_F', x: 0.8, pos: 4 }] },
  },
  {
    id: 'mezzo-forte',
    category: 'dynamics',
    term: 'Mezzo forte (mf)',
    text: '"Medium loud": a little softer than forte.',
    picture: {
      width: 4,
      glyphs: [
        { g: 'DYNAMIC_M', x: 0.6, pos: 4 },
        { g: 'DYNAMIC_F', x: 2.2, pos: 4 },
      ],
    },
  },
  {
    id: 'crescendo',
    category: 'dynamics',
    term: 'Crescendo',
    also: 'cresc.',
    text: 'The widening sign means get louder little by little.',
    picture: { width: 6, hairpins: [{ type: 'crescendo', x1: 0.6, x2: 5.4, pos: 4 }] },
  },
  {
    id: 'diminuendo',
    category: 'dynamics',
    term: 'Diminuendo',
    also: 'decrescendo, dim.',
    text: 'The narrowing sign means get softer little by little.',
    picture: { width: 6, hairpins: [{ type: 'diminuendo', x1: 0.6, x2: 5.4, pos: 4 }] },
  },

  // Signs & marks
  {
    id: 'repeat',
    category: 'signs',
    term: 'Repeat sign',
    text: 'Bar lines with two dots. Play the music between the repeat signs again.',
    picture: {
      focus: { glyphs: [0, 3] },
      width: 8,
      staff: true,
      glyphs: [
        { g: 'REPEAT_LEFT', x: 0.4, pos: 0 },
        { g: 'QUARTER_NOTE_UP', x: 2.6, pos: 3 },
        { g: 'QUARTER_NOTE_UP', x: 4.1, pos: 5 },
        { g: 'REPEAT_RIGHT', x: 6.1, pos: 0 },
      ],
    },
  },
  {
    id: 'fermata',
    category: 'signs',
    term: 'Fermata',
    also: 'bird\'s eye',
    text: 'Hold the note longer than usual, until it feels right to move on.',
    picture: {
      focus: { glyphs: [1] },
      width: 5,
      staff: true,
      glyphs: [
        { g: 'WHOLE_NOTE', x: 1.6, pos: 4 },
        { g: 'FERMATA', x: 1.6 + WHOLE_HEAD / 2 - 1.21, pos: 10 },
      ],
    },
  },
  {
    id: 'staccato',
    category: 'signs',
    term: 'Staccato',
    text: 'A dot above or below the note. Play it short and bouncy, letting go quickly.',
    picture: {
      focus: { glyphs: [1] },
      width: 5,
      staff: true,
      glyphs: [
        { g: 'QUARTER_NOTE_UP', x: 1.9, pos: 5 },
        { g: 'STACCATO', x: 1.9 + HEAD / 2 - 0.17, pos: 2.66 },
      ],
    },
  },
  {
    id: 'accent',
    category: 'signs',
    term: 'Accent',
    text: 'The ">" mark means play that note a little louder than the ones around it.',
    picture: {
      focus: { glyphs: [1] },
      width: 5,
      staff: true,
      glyphs: [
        { g: 'QUARTER_NOTE_UP', x: 1.9, pos: 5 },
        { g: 'ACCENT', x: 1.9 + HEAD / 2 - 0.68, pos: 1.6 },
      ],
    },
  },
  {
    id: 'tie',
    category: 'signs',
    term: 'Tie',
    text: 'A curve joining two of the same note. Play it once and hold it for both notes together.',
    picture: {
      focus: { curves: true },
      width: 6,
      staff: true,
      glyphs: [
        { g: 'HALF_NOTE_UP', x: 1.3, pos: 3 },
        { g: 'HALF_NOTE_UP', x: 3.9, pos: 3 },
      ],
      barlines: [3.2],
      curves: [{ x1: 1.3 + HEAD * 0.75, x2: 3.9 + HEAD * 0.25, pos: 2 }],
    },
  },
  {
    id: 'slur',
    category: 'signs',
    term: 'Slur',
    text: 'A curve over different notes. Play them smoothly, connected, with no gaps (legato).',
    picture: {
      focus: { curves: true },
      width: 6,
      staff: true,
      glyphs: [
        { g: 'QUARTER_NOTE_UP', x: 1.1, pos: 2 },
        { g: 'QUARTER_NOTE_UP', x: 2.6, pos: 3 },
        { g: 'QUARTER_NOTE_UP', x: 4.1, pos: 4 },
      ],
      curves: [{ x1: 1.1 + HEAD / 2, x2: 4.1 + HEAD / 2, pos: 0.2 }],
    },
  },
  {
    id: 'pedal',
    category: 'signs',
    term: 'Pedal marks',
    text: '"Ped." means press the sustain pedal with your right foot; the star means let it up.',
    picture: {
      width: 7,
      glyphs: [
        { g: 'PEDAL', x: 0.5, pos: 4 },
        { g: 'PEDAL_UP', x: 5.4, pos: 5 },
      ],
    },
  },
];

// How basic each term is, for the Theory quiz's level (set per player in
// Players & colors): 1 the basics, 2 a bit more, 3 everything.
const LEVEL_OF = {
  staff: 1, 'treble-clef': 1, 'bass-clef': 1, 'line-note': 1, 'space-note': 1, 'middle-c': 1, 'going-up': 1,
  'going-down': 1, 'bar-line': 1, 'whole-note': 1, 'half-note': 1, 'quarter-note': 1, 'quarter-rest': 1,
  sharp: 1, flat: 1, piano: 1, forte: 1, repeat: 1,
  'ledger-lines': 2, step: 2, skip: 2, 'final-bar-line': 2, 'time-signature': 2, 'eighth-note': 2,
  'dotted-note': 2, 'whole-rest': 2, 'half-rest': 2, natural: 2, 'mezzo-forte': 2, crescendo: 2,
  diminuendo: 2, staccato: 2, tie: 2, fermata: 2,
};
export const termLevel = (entry) => LEVEL_OF[entry.id] || 3;

export const THEORY_LEVELS = [
  { id: 1, label: 'Basics', hint: 'Staff, clefs, line and space notes, Middle C, whole/half/quarter notes, loud and soft, sharp and flat' },
  { id: 2, label: 'More', hint: 'Adds ledger lines, steps and skips, time signatures, eighth notes, rests, crescendo and more' },
  { id: 3, label: 'All', hint: 'Every term, including accents, slurs, pedal marks and sixteenth notes' },
];
