import { useEffect, useRef, useState } from 'react';
import { later, newSound } from './soundBus.js';
import { midiFreq } from './scales.js';
import { Keyboard } from './Scales.jsx';
import { HANON_COUNT, hanonExercise, positionMidi, positionName } from './hanon.js';

// Hanon, Part I (exercises 1-20): how each exercise starts, turns around
// at the top and finishes, bar by bar on a keyboard with both hands'
// fingering (each part playable, the keys lighting up as it plays), and
// Play for the whole exercise - at the chosen speed, in the chosen rhythm
// (even, long-short or short-long, as teachers often assign), with both
// hands or one. The choices are remembered on this device.
const KEY = 'pitchpop-hanon-v1';
const RHYTHMS = [
  { id: 'even', label: 'Even' },
  { id: 'long-short', label: 'Long–short' },
  { id: 'short-long', label: 'Short–long' },
];
const HANDS = [
  { id: 'both', label: 'Both hands' },
  { id: 'rh', label: 'Right' },
  { id: 'lh', label: 'Left' },
];
const MIN_TEMPO = 40;
const MAX_TEMPO = 120;

function loadChoice() {
  const fallback = { n: 1, tempo: 60, rhythm: 'even', hands: 'both', part: 'start' };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && saved.n >= 1 && saved.n <= HANON_COUNT ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

// The exercise's bars (8 notes each) and where the way down starts: the
// first bar in the second half with the coming-down pattern.
function bars(ex) {
  const list = [];
  for (let i = 0; i < ex.notes.length; i += 8) list.push(ex.notes.slice(i, i + 8));
  const matches = (bar, cell) => bar.every((p, i) => p - bar[0] === cell[i]);
  const half = Math.floor(list.length / 2);
  const found = list.findIndex((bar, i) => i >= half - 2 && matches(bar, ex.down.cell));
  return { list, downStart: found > 0 ? found : half };
}

// The three parts shown: how it starts, the turnaround at the top, and how
// it ends - each a few bars with their fingers.
const PARTS = [
  { id: 'start', label: 'Start' },
  { id: 'turn', label: 'Turn around' },
  { id: 'finish', label: 'Finish' },
];

function parts(ex) {
  const { list, downStart } = bars(ex);
  const last = list.length - 1;
  const lastNote = ex.rhEnd.length > 1 ? 'Last notes' : 'Last note';
  return {
    start: {
      text: `Bars 1–${downStart} go up: the same pattern, starting one white key higher each bar.`,
      bars: [
        { label: 'Bar 1', notes: list[0], lhNotes: list[0], rh: ex.up.rh, lh: ex.up.lh },
        { label: 'Bar 2', notes: list[1], lhNotes: list[1], rh: ex.up.rh, lh: ex.up.lh },
      ],
    },
    turn: {
      text: `Bar ${downStart} is the top. Right after it the hands turn around and come down, one white key lower each bar, with the pattern for going down.`,
      bars: [
        { label: `Bar ${downStart} · top`, notes: list[downStart - 1], lhNotes: list[downStart - 1], rh: ex.turn.rh, lh: ex.turn.lh },
        { label: `Bar ${downStart + 1} · going down`, notes: list[downStart], lhNotes: list[downStart], rh: ex.turnDown.rh, lh: ex.turnDown.lh },
      ],
    },
    finish: {
      text: `Bars ${downStart + 1}–${last + 1} come down, one white key lower each bar, to the last note.`,
      bars: [
        { label: `Bar ${last + 1} · last bar`, notes: list[last], lhNotes: list[last], rh: ex.finish.rh, lh: ex.finish.lh },
        {
          label: lastNote,
          notes: ex.rhEnd,
          lhNotes: ex.lhEnd,
          chord: true,
          rh: ex.rhEnd.length === 1 ? '1' : '',
          lh: ex.lhEnd.length === 1 ? '5' : '',
        },
      ],
    },
  };
}

// When each note sounds, in sixteenths: even, or pairs as dotted
// long-short (3:1) or short-long (1:3).
function noteTimes(count, rhythm) {
  return Array.from({ length: count }, (_, i) => {
    if (rhythm === 'even' || i % 2 === 0) return i;
    return i - 1 + (rhythm === 'long-short' ? 1.5 : 0.5);
  });
}

// One bar: its keys on a keyboard with each hand's fingers (each key once),
// the key sounding now lit, and the notes and fingers in order below.
function BarView({ bar, active }) {
  const shift = 7 * Math.floor(Math.min(...bar.notes) / 7);
  const keys = [];
  bar.notes.forEach((p, i) => {
    if (!keys.some((k) => k.pos === p)) keys.push({ pos: p, rh: bar.rh[i] || '', lh: bar.lh[i] || '' });
  });
  return (
    <div className="hanon-pattern">
      <div className="hanon-pattern-title">{bar.label}</div>
      <Keyboard
        notes={keys.map((k) => ({ midi: positionMidi(k.pos - shift, 60) }))}
        rh={keys.map((k) => k.rh)}
        lh={keys.map((k) => k.lh)}
        active={active === undefined ? undefined : positionMidi(active - shift, 60)}
      />
      <table className="scales-table">
        <tbody>
          <tr>
            <th scope="row">Notes</th>
            {bar.notes.map((p, i) => (
              <td key={i}>{positionName(p)}</td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="scales-rh">
              Right hand
            </th>
            {bar.notes.map((_, i) => (
              <td key={i}>{bar.rh[i] || '–'}</td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="scales-lh">
              Left hand
            </th>
            {bar.notes.map((_, i) => (
              <td key={i}>{bar.lh[i] || '–'}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function Hanon({ engine }) {
  const [choice, setChoice] = useState(loadChoice);
  // What's playing: false, 'all' (the whole exercise) or 'part'.
  const [playing, setPlaying] = useState(false);
  // The note sounding in the shown part: { bar, pos }.
  const [active, setActive] = useState(null);
  const run = useRef(0);
  const stop = () => {
    run.current++;
    setPlaying(false);
    setActive(null);
    newSound();
  };
  // Leaving the page stops the music.
  useEffect(() => () => newSound(), []);
  const update = (changes) => {
    if (playing) stop();
    const next = { ...choice, ...changes };
    setChoice(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const ex = hanonExercise(choice.n);
  const part = parts(ex)[PARTS.some((p) => p.id === choice.part) ? choice.part : 'start'];

  // Right hand from middle C, left hand an octave below.
  const rhFreq = (p) => midiFreq(positionMidi(p, 60));
  const lhFreq = (p) => midiFreq(positionMidi(p, 48));

  // Get the notes ready ahead of time so Play starts right away.
  useEffect(() => {
    new Set(ex.notes).forEach((p) => {
      engine.getToneBuffer(rhFreq(p), true);
      engine.getToneBuffer(lhFreq(p), true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, choice.n]);

  // Plays notes (each { rh: [positions], lh: [positions], bar, pos }) at
  // the chosen speed, rhythm and hands; with `show`, the keys light up.
  async function playNotes(kind, notes, show) {
    if (playing) {
      const was = playing;
      stop();
      if (was === kind) return;
    }
    newSound();
    const id = ++run.current;
    setPlaying(kind);
    const sixteenth = 60 / choice.tempo / 4;
    const handsFor = (n) =>
      choice.hands === 'rh'
        ? n.rh.map(rhFreq)
        : choice.hands === 'lh'
          ? n.lh.map(lhFreq)
          : [...n.lh.map(lhFreq), ...n.rh.map(rhFreq)];
    // The last note (or chord) comes a beat after the rest, held.
    const times = noteTimes(notes.length - 1, choice.rhythm);
    times.push(notes.length - 1);
    const events = notes.map((n, i) => ({ at: times[i] * sixteenth, freqs: handsFor(n) }));
    const endAt = events[events.length - 1].at;
    const done = () => {
      if (run.current === id) {
        setPlaying(false);
        setActive(null);
      }
    };
    const length = (endAt + 1) * 1000;
    // A safety net in case the notes never get going.
    setTimeout(done, length + 8000);
    try {
      await engine.playTimed(events, choice.hands === 'both' ? 0.38 : 0.5);
    } catch {
      return done();
    }
    if (run.current !== id) return;
    if (show) notes.forEach((n, i) => later(() => setActive({ bar: n.bar, pos: n.pos }), events[i].at * 1000 + 80));
    setTimeout(done, length);
  }

  function play() {
    const notes = ex.notes.map((p) => ({ rh: [p], lh: [p] }));
    notes.push({ rh: ex.rhEnd, lh: ex.lhEnd });
    playNotes('all', notes, false);
  }

  function playPart() {
    const notes = part.bars.flatMap((bar, b) =>
      bar.chord
        ? [{ rh: bar.notes, lh: bar.lhNotes, bar: b, pos: bar.notes[0] }]
        : bar.notes.map((p) => ({ rh: [p], lh: [p], bar: b, pos: p })),
    );
    playNotes('part', notes, true);
  }

  return (
    <div className="scales hanon">
      <p className="hanon-intro">
        <strong>Hanon</strong> · The Virtuoso Pianist, Part I
      </p>
      <div className="hanon-grid" role="listbox" aria-label="Exercise">
        {Array.from({ length: HANON_COUNT }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            role="option"
            aria-selected={n === choice.n}
            className={`scales-key-chip${n === choice.n ? ' scales-key-chip-active' : ''}`}
            onClick={() => update({ n })}
          >
            {n}
          </button>
        ))}
      </div>

      <section className="practice-card scales-card" aria-label={`Hanon exercise ${choice.n}`}>
        <div className="scales-title-row">
          <h3 className="scales-title">Exercise {choice.n}</h3>
          <button className="pill-btn-primary scales-play" onClick={play}>
            {playing === 'all' ? '■ Stop' : '▶︎ Play'}
          </button>
        </div>
        <div className="hanon-settings">
          <label className="hanon-tempo">
            <span>
              Speed <strong>♩ = {choice.tempo}</strong>
            </span>
            <input
              type="range"
              min={MIN_TEMPO}
              max={MAX_TEMPO}
              step="4"
              value={choice.tempo}
              onChange={(e) => update({ tempo: Number(e.target.value) })}
            />
          </label>
          <div className="scales-forms" role="radiogroup" aria-label="Rhythm">
            {RHYTHMS.map((r) => (
              <button
                key={r.id}
                role="radio"
                aria-checked={choice.rhythm === r.id}
                className={`scales-form${choice.rhythm === r.id ? ' scales-form-active' : ''}`}
                onClick={() => update({ rhythm: r.id })}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="scales-forms" role="radiogroup" aria-label="Hands">
            {HANDS.map((h) => (
              <button
                key={h.id}
                role="radio"
                aria-checked={choice.hands === h.id}
                className={`scales-form${choice.hands === h.id ? ' scales-form-active' : ''}`}
                onClick={() => update({ hands: h.id })}
              >
                {h.label}
              </button>
            ))}
          </div>
          <p className="scales-note">
            Hanon marked these ♩ = 60 to 108: start slow and speed up as it gets even. Long–short and short–long play
            the notes in dotted pairs, a classic way to practice them.
          </p>
        </div>
        <div className="practice-tabs hanon-parts" role="tablist" aria-label="Part of the exercise">
          {PARTS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={(choice.part || 'start') === p.id}
              className={`practice-tab${(choice.part || 'start') === p.id ? ' practice-tab-active' : ''}`}
              onClick={() => update({ part: p.id })}
            >
              <span className="practice-tab-label">{p.label}</span>
            </button>
          ))}
        </div>
        <div className="hanon-part-head">
          <p className="hanon-part-text">{part.text}</p>
          <button className="hanon-part-play" onClick={playPart}>
            {playing === 'part' ? '■ Stop' : '▶\uFE0E Hear this part'}
          </button>
        </div>
        {part.bars.map((bar, b) => (
          <BarView key={`${choice.n}-${choice.part}-${b}`} bar={bar} active={active?.bar === b ? active.pos : undefined} />
        ))}
        <p className="scales-note">
          Bars between these repeat the same pattern one white key higher (going up) or lower (coming down). The
          left hand plays the same notes an octave lower. 1 = thumb.
        </p>
      </section>

    </div>
  );
}
