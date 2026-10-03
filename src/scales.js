// Every major and minor scale, spelled correctly for its key (B♭ major has
// E♭, not D♯), with the standard one-octave piano fingering for each hand
// (as in most method books and exam syllabuses; going up, 1 = thumb).
// Minor scales come in three forms - natural, harmonic (raised 7th) and
// melodic (raised 6th and 7th going up, natural coming down) - which use
// the same fingering.

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ACCIDENTAL = { '-2': '𝄫', '-1': '♭', 0: '', 1: '♯', 2: '𝄪' };

export const FORMS = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  natural: [0, 2, 3, 5, 7, 8, 10, 12],
  harmonic: [0, 2, 3, 5, 7, 8, 11, 12],
  melodic: [0, 2, 3, 5, 7, 9, 11, 12],
};

// Circle-of-fifths order. Fingerings are 8 fingers, tonic to tonic, going up.
export const MAJOR_KEYS = [
  { tonic: 'C', rh: '12312345', lh: '54321321' },
  { tonic: 'G', rh: '12312345', lh: '54321321' },
  { tonic: 'D', rh: '12312345', lh: '54321321' },
  { tonic: 'A', rh: '12312345', lh: '54321321' },
  { tonic: 'E', rh: '12312345', lh: '54321321' },
  { tonic: 'B', rh: '12312345', lh: '43214321' },
  { tonic: 'F#', rh: '23412312', lh: '43213214', also: 'G♭' },
  { tonic: 'Db', rh: '23123412', lh: '32143213', also: 'C♯' },
  { tonic: 'Ab', rh: '34123123', lh: '32143213' },
  { tonic: 'Eb', rh: '31234123', lh: '32143213' },
  { tonic: 'Bb', rh: '41231234', lh: '32143213' },
  { tonic: 'F', rh: '12341234', lh: '54321321' },
];

export const MINOR_KEYS = [
  { tonic: 'A', rh: '12312345', lh: '54321321' },
  { tonic: 'E', rh: '12312345', lh: '54321321' },
  { tonic: 'B', rh: '12312345', lh: '43214321' },
  { tonic: 'F#', rh: '34123123', lh: '43213214' },
  { tonic: 'C#', rh: '34123123', lh: '32143213', also: 'D♭' },
  { tonic: 'G#', rh: '34123123', lh: '32143213', also: 'A♭' },
  { tonic: 'Eb', rh: '31234123', lh: '21432132', also: 'D♯' },
  { tonic: 'Bb', rh: '41231234', lh: '21321432' },
  { tonic: 'F', rh: '12341234', lh: '54321321' },
  { tonic: 'C', rh: '12312345', lh: '54321321' },
  { tonic: 'G', rh: '12312345', lh: '54321321' },
  { tonic: 'D', rh: '12312345', lh: '54321321' },
];

// "Bb" -> "B♭"
export function prettyName(tonic) {
  return tonic.replace('#', '♯').replace(/b$/, '♭');
}

function tonicPitchClass(tonic) {
  const acc = tonic.length > 1 ? (tonic[1] === '#' ? 1 : -1) : 0;
  return (LETTER_PC[tonic[0]] + acc + 12) % 12;
}

// The scale's 8 notes going up from the tonic (around middle C):
// [{ name: 'E♭', midi: 63 }, ...]
export function buildScale(tonic, steps) {
  const li = LETTERS.indexOf(tonic[0]);
  const tpc = tonicPitchClass(tonic);
  const base = 60 + tpc;
  return steps.map((step, i) => {
    const letter = LETTERS[(li + i) % 7];
    const pc = (tpc + step) % 12;
    const acc = ((pc - LETTER_PC[letter] + 18) % 12) - 6;
    return { name: letter + ACCIDENTAL[acc], midi: base + step };
  });
}

export function midiFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// The key's cadences in close position around the tonic, as usually taught
// on piano: I - IV - I - V - I (C E G, C F A, C E G, B D G, C E G in C
// major) and the 3-chord I - V - I. IV is played with the tonic at the
// bottom (second inversion) and V with the leading note at the bottom
// (first inversion, just below the tonic), so the hand barely moves.
// Minor keys use the harmonic minor (a major V with the raised 7th).
// Fingers are listed bottom note to top note; the left hand plays the same
// notes an octave lower.
const CHORD_SHAPES = {
  I: { degrees: [0, 2, 4], rh: '135', lh: '531' },
  IV: { degrees: [0, 3, 5], rh: '135', lh: '521' },
  V: { degrees: [-1, 1, 4], rh: '125', lh: '531' },
};

export function buildCadence(tonic, minor, chords) {
  const scale = buildScale(tonic, FORMS[minor ? 'harmonic' : 'major']);
  const order = chords === 3 ? ['I', 'V', 'I'] : ['I', 'IV', 'I', 'V', 'I'];
  return order.map((id) => {
    const shape = CHORD_SHAPES[id];
    const notes = shape.degrees.map((d) => (d < 0 ? { ...scale[6], midi: scale[6].midi - 12 } : scale[d]));
    const label = minor && id !== 'V' ? id.toLowerCase() : id;
    return { label, notes, rh: shape.rh, lh: shape.lh };
  });
}
