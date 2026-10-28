import { useEffect, useRef, useState } from 'react';
import { later, newSound } from './soundBus.js';
import { midiFreq } from './scales.js';
import { Keyboard } from './Scales.jsx';
import { HANON_COUNT, hanonExercise, positionMidi, positionName } from './hanon.js';

// Hanon, Part I (exercises 1-20): how each exercise goes up and comes back
// down, bar by bar on a keyboard with both hands' fingering (each half
// playable, the keys lighting up as it plays), and Play for the whole
// exercise with both hands, which shows each bar as it comes with the key,
// letter and fingers of the note sounding lit up - at the chosen speed.
// The choices are remembered on this device.
const KEY = 'pitchpop-hanon-v1';
const MIN_TEMPO = 40;
const MAX_TEMPO = 120;

function loadChoice() {
  const fallback = { n: 1, tempo: 60, part: 'up' };
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

// The two halves shown: going up (the first bars and the top) and going
// down (the first bar down, the last bar and the last note), each with
// their fingers.
const PARTS = [
  { id: 'up', label: 'Going up' },
  { id: 'down', label: 'Going down' },
];

function parts(ex) {
  const { list, downStart } = bars(ex);
  const last = list.length - 1;
  const lastNote = ex.rhEnd.length > 1 ? 'Last notes' : 'Last note';
  return {
    up: {
      text: `Bars 1–${downStart} go up: the same pattern, starting one white key higher each bar, to the top in bar ${downStart}.`,
      bars: [
        { label: 'Bar 1', notes: list[0], lhNotes: list[0], rh: ex.up.rh, lh: ex.up.lh },
        { label: 'Bar 2', notes: list[1], lhNotes: list[1], rh: ex.up.rh, lh: ex.up.lh },
        {
          label: `Bar ${downStart} · top`,
          notes: list[downStart - 1],
          lhNotes: list[downStart - 1],
          rh: ex.turn.rh,
          lh: ex.turn.lh,
        },
      ],
    },
    down: {
      text: `Bars ${downStart + 1}–${last + 1} come down: the pattern for going down, one white key lower each bar, to the last note.`,
      bars: [
        {
          label: `Bar ${downStart + 1} · first bar down`,
          notes: list[downStart],
          lhNotes: list[downStart],
          rh: ex.turnDown.rh,
          lh: ex.turnDown.lh,
        },
        {
          label: `Bar ${last + 1} · last bar`,
          notes: list[last],
          lhNotes: list[last],
          rh: ex.finish.rh,
          lh: ex.finish.lh,
        },
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

// Any bar of the exercise (b = its index, or the bar count for the last
// note or chord) with its fingers, for following along during Play.
function exerciseBar(ex, b) {
  const { list, downStart } = bars(ex);
  const last = list.length - 1;
  if (b > last) {
    return {
      label: ex.rhEnd.length > 1 ? 'Last notes' : 'Last note',
      notes: ex.rhEnd,
      rh: ex.rhEnd.length === 1 ? '1' : '',
      lh: ex.lhEnd.length === 1 ? '5' : '',
    };
  }
  const fingers =
    b === last
      ? ex.finish
      : b < downStart - 1
        ? ex.up
        : b === downStart - 1
          ? ex.turn
          : b === downStart
            ? ex.turnDown
            : ex.down;
  return { label: `Bar ${b + 1} of ${list.length}`, notes: list[b], rh: fingers.rh, lh: fingers.lh };
}

// One bar: its keys on a keyboard with each hand's fingers (each key once),
// the key sounding now lit, and the notes and fingers in order below (the
// one sounding now, `activeIndex`, lit too).
function BarView({ bar, active, activeIndex }) {
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
              <td key={i} className={i === activeIndex ? 'hanon-now' : undefined}>
                {positionName(p)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="scales-rh">
              Right hand
            </th>
            {bar.notes.map((_, i) => (
              <td key={i} className={i === activeIndex ? 'hanon-now' : undefined}>
                {bar.rh[i] || '–'}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className="scales-lh">
              Left hand
            </th>
            {bar.notes.map((_, i) => (
              <td key={i} className={i === activeIndex ? 'hanon-now' : undefined}>
                {bar.lh[i] || '–'}
              </td>
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
  const partId = PARTS.some((p) => p.id === choice.part) ? choice.part : 'up';
  const part = parts(ex)[partId];

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
  // the chosen speed, both hands; with `show`, the keys light up.
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
    const handsFor = (n) => [...n.lh.map(lhFreq), ...n.rh.map(rhFreq)];
    // Even sixteenths, the last note (or chord) held.
    const times = notes.map((_, i) => i);
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
      await engine.playTimed(events, 0.38);
    } catch {
      return done();
    }
    if (run.current !== id) return;
    if (show)
      notes.forEach((n, i) => later(() => setActive({ bar: n.bar, pos: n.pos, i: n.i }), events[i].at * 1000 + 80));
    setTimeout(done, length);
  }

  // The whole exercise, following along bar by bar (8 notes a bar).
  function play() {
    const notes = ex.notes.map((p, k) => ({ rh: [p], lh: [p], bar: Math.floor(k / 8), i: k % 8, pos: p }));
    notes.push({ rh: ex.rhEnd, lh: ex.lhEnd, bar: Math.ceil(ex.notes.length / 8), i: 0, pos: ex.rhEnd[0] });
    playNotes('all', notes, true);
  }

  function playPart() {
    const notes = part.bars.flatMap((bar, b) =>
      bar.chord
        ? [{ rh: bar.notes, lh: bar.lhNotes, bar: b, pos: bar.notes[0] }]
        : bar.notes.map((p, i) => ({ rh: [p], lh: [p], bar: b, pos: p, i })),
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
          <p className="scales-note">Hanon marked these ♩ = 60 to 108: start slow and speed up as it gets even.</p>
        </div>
        {/* What's playing, below the speed so changing the speed (which
            stops the music and closes this) doesn't move the slider. */}
        {playing === 'all' && active && (
          <div className="hanon-now-playing" aria-live="off">
            <BarView bar={exerciseBar(ex, active.bar)} active={active.pos} activeIndex={active.i} />
          </div>
        )}
        <div className="practice-tabs hanon-parts" role="tablist" aria-label="Part of the exercise">
          {PARTS.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={partId === p.id}
              className={`practice-tab${partId === p.id ? ' practice-tab-active' : ''}`}
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
          <BarView
            key={`${choice.n}-${partId}-${b}`}
            bar={bar}
            active={playing === 'part' && active?.bar === b ? active.pos : undefined}
            activeIndex={playing === 'part' && active?.bar === b ? active.i : undefined}
          />
        ))}
        <p className="scales-note">
          Bars between these repeat the same pattern one white key higher (going up) or lower (coming down). The left
          hand plays the same notes an octave lower. 1 = thumb.
        </p>
      </section>
    </div>
  );
}
