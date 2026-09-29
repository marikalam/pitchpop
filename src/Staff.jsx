import { F_CLEF, G_CLEF, GLYPH_UNITS_PER_SPACE, WHOLE_NOTE } from './musicGlyphs.js';
import { ledgerLines, staffPosition } from './noteReading.js';

// Drawing units: one staff space is SPACE wide/tall. The bottom line sits
// low enough to leave room for the treble clef's top and two ledger lines
// above the staff; HEIGHT leaves room for two ledger lines below it.
const SPACE = 20;
const BOTTOM = 7 * SPACE;
const WIDTH = 13 * SPACE;
const HEIGHT = BOTTOM + 3 * SPACE;
const GLYPH_SCALE = SPACE / GLYPH_UNITS_PER_SPACE;
const NOTE_X = 8.6 * SPACE;
const NOTE_WIDTH = WHOLE_NOTE.width * GLYPH_SCALE;

const yFor = (position) => BOTTOM - (position * SPACE) / 2;

export default function Staff({ note, highlight }) {
  const position = staffPosition(note);
  const clef = note.clef === 'treble' ? G_CLEF : F_CLEF;
  // Treble clef curls around the G line (position 2), bass clef's dots
  // frame the F line (position 6).
  const clefY = yFor(note.clef === 'treble' ? 2 : 6);
  const noteY = yFor(position);
  const clefName = note.clef === 'treble' ? 'Treble' : 'Bass';

  return (
    <svg
      className={`staff${highlight ? ` staff-${highlight}` : ''}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`${clefName} clef staff with one note`}
    >
      {[0, 2, 4, 6, 8].map((p) => (
        <line key={p} className="staff-line" x1={SPACE * 0.5} x2={WIDTH - SPACE * 0.5} y1={yFor(p)} y2={yFor(p)} />
      ))}
      <path
        className="staff-clef"
        d={clef.d}
        transform={`translate(${SPACE * 1.1} ${clefY}) scale(${GLYPH_SCALE})`}
      />
      {ledgerLines(position).map((p) => (
        <line
          key={p}
          className="staff-line"
          x1={NOTE_X - NOTE_WIDTH / 2 - SPACE * 0.45}
          x2={NOTE_X + NOTE_WIDTH / 2 + SPACE * 0.45}
          y1={yFor(p)}
          y2={yFor(p)}
        />
      ))}
      <path
        className="staff-note"
        d={WHOLE_NOTE.d}
        transform={`translate(${NOTE_X - NOTE_WIDTH / 2} ${noteY}) scale(${GLYPH_SCALE})`}
      />
    </svg>
  );
}
