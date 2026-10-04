import { useEffect, useRef, useState } from 'react';
import { newSound } from './soundBus.js';
import { midiFreq } from './scales.js';
import { Keyboard } from './Scales.jsx';
import { HANON_COUNT, hanonExercise, positionMidi, positionName } from './hanon.js';

// Hanon, Part I (exercises 1-20): each exercise's pattern going up and
// coming down with both hands' fingering, its first bar on a keyboard, and
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
  const fallback = { n: 1, tempo: 60, rhythm: 'even', hands: 'both' };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && saved.n >= 1 && saved.n <= HANON_COUNT ? { ...fallback, ...saved } : fallback;
  } catch {
    return fallback;
  }
}

// The exercise's bars (8 notes each) and the first one going up / coming
// down in the pattern the fingering is written for.
function bars(ex) {
  const list = [];
  for (let i = 0; i < ex.notes.length; i += 8) list.push(ex.notes.slice(i, i + 8));
  const matches = (bar, cell) => bar.every((p, i) => p - bar[0] === cell[i]);
  const half = Math.floor(list.length / 2);
  return {
    up: list[0],
    down: list.slice(half - 2).find((bar) => matches(bar, ex.down.cell)) || list[half],
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

function PatternTable({ title, bar, rh, lh }) {
  return (
    <div className="hanon-pattern">
      <div className="hanon-pattern-title">{title}</div>
      <table className="scales-table">
        <tbody>
          <tr>
            <th scope="row">Notes</th>
            {bar.map((p, i) => (
              <td key={i}>{positionName(p)}</td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="scales-rh">
              Right hand
            </th>
            {rh.split('').map((f, i) => (
              <td key={i}>{f}</td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="scales-lh">
              Left hand
            </th>
            {lh.split('').map((f, i) => (
              <td key={i}>{f}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function Hanon({ engine }) {
  const [choice, setChoice] = useState(loadChoice);
  const [playing, setPlaying] = useState(false);
  const run = useRef(0);
  const stop = () => {
    run.current++;
    setPlaying(false);
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
  const { up, down } = bars(ex);
  // The keyboard shows the first bar; each key once, with its fingers.
  const firstKeys = [];
  up.forEach((p, i) => {
    if (!firstKeys.some((k) => k.pos === p)) firstKeys.push({ pos: p, rh: ex.up.rh[i], lh: ex.up.lh[i] });
  });

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

  async function play() {
    if (playing) return stop();
    newSound();
    const id = ++run.current;
    setPlaying(true);
    const sixteenth = 60 / choice.tempo / 4;
    const handsFor = (rh, lh) => (choice.hands === 'rh' ? rh : choice.hands === 'lh' ? lh : [...lh, ...rh]);
    const events = noteTimes(ex.notes.length, choice.rhythm).map((t, i) => ({
      at: t * sixteenth,
      freqs: handsFor([rhFreq(ex.notes[i])], [lhFreq(ex.notes[i])]),
    }));
    const endAt = ex.notes.length * sixteenth;
    events.push({ at: endAt, freqs: handsFor(ex.rhEnd.map(rhFreq), ex.lhEnd.map(lhFreq)) });
    const done = () => {
      if (run.current === id) setPlaying(false);
    };
    const length = (endAt + 1) * 1000;
    // A safety net in case the notes never get going.
    setTimeout(done, length + 8000);
    try {
      await engine.playTimed(events, choice.hands === 'both' ? 0.38 : 0.5);
    } catch {
      return done();
    }
    if (run.current === id) setTimeout(done, length);
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
            {playing ? '■ Stop' : '▶︎ Play'}
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
        <Keyboard
          notes={firstKeys.map((k) => ({ midi: positionMidi(k.pos, 60) }))}
          rh={firstKeys.map((k) => k.rh).join('')}
          lh={firstKeys.map((k) => k.lh).join('')}
        />
        <PatternTable title="Going up (first bar)" bar={up} rh={ex.up.rh} lh={ex.up.lh} />
        <PatternTable title="Coming down (first bar)" bar={down} rh={ex.down.rh} lh={ex.down.lh} />
        <p className="scales-note">
          Each bar moves one note higher (then lower) with the same fingers. The left hand plays an octave below. 1 =
          thumb.
        </p>
      </section>

    </div>
  );
}
