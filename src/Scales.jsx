import { useEffect, useRef, useState } from 'react';
import { newSound } from './soundBus.js';
import { buildScale, FORMS, MAJOR_KEYS, MINOR_KEYS, midiFreq, prettyName } from './scales.js';

// Scales: every major and minor scale with its notes on a keyboard and the
// standard fingering for each hand, and a button to hear it up and down.
// The choice is remembered on this device.
const KEY = 'pitchpop-scales-v1';
const MINOR_FORMS = [
  { id: 'natural', label: 'Natural' },
  { id: 'harmonic', label: 'Harmonic' },
  { id: 'melodic', label: 'Melodic' },
];

function loadChoice() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.index === 'number') return saved;
  } catch {
    /* ignore */
  }
  return { mode: 'major', index: 0, form: 'natural' };
}

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 }; // white pc -> black pc to its right

// Two octaves from middle C (C4-B5), the scale's keys lit, with the right
// hand's finger above each key and the left hand's below (a black key's
// finger one row further out, so it never covers its white neighbor's).
function Keyboard({ notes, rh, lh }) {
  const W = 24;
  const H = 92;
  const whites = [];
  for (let o = 0; o < 2; o++) WHITE_PCS.forEach((pc) => whites.push(60 + o * 12 + pc));
  const lit = new Map(notes.map((n, i) => [n.midi, i]));
  const x0 = (midi) => whites.indexOf(midi) * W;
  const blackX = (midi) => {
    const white = whites.indexOf(midi - 1);
    return (white + 1) * W - 7;
  };
  const isBlack = (midi) => !WHITE_PCS.includes(((midi % 12) + 12) % 12);
  const centerX = (midi) => (isBlack(midi) ? blackX(midi) + 7 : x0(midi) + W / 2);
  const width = whites.length * W;
  return (
    <svg viewBox={`0 -46 ${width} ${H + 92}`} className="scale-keys" role="img" aria-label="The scale on a keyboard">
      {whites.map((m) => (
        <rect
          key={m}
          x={x0(m) + 0.5}
          y="0"
          width={W - 1}
          height={H}
          rx="3"
          className={lit.has(m) ? 'scale-key-white scale-key-lit' : 'scale-key-white'}
        />
      ))}
      {whites.map((m) => {
        const pc = m % 12;
        if (!(pc in BLACK_AFTER) || m === whites[whites.length - 1]) return null;
        const b = m + 1;
        return (
          <rect key={b} x={blackX(b)} y="0" width="14" height={H * 0.6} rx="2" className={lit.has(b) ? 'scale-key-black scale-key-lit-black' : 'scale-key-black'} />
        );
      })}
      {notes.map((n, i) => {
        const out = isBlack(n.midi) ? 21 : 0;
        return (
          <g key={`f${i}`}>
            <circle cx={centerX(n.midi)} cy={-13 - out} r="9" className="scale-finger-rh" />
            <text x={centerX(n.midi)} y={-9 - out} className="scale-finger-text">
              {rh[i]}
            </text>
            <circle cx={centerX(n.midi)} cy={H + 13 + out} r="9" className="scale-finger-lh" />
            <text x={centerX(n.midi)} y={H + 17 + out} className="scale-finger-text">
              {lh[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// The same key note in the other list (B♭ major → B♭ minor), else the first.
function sameKeyIndex(key, mode) {
  const list = mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  const names = (k) => [prettyName(k.tonic), k.also].filter(Boolean);
  const i = list.findIndex((k) => names(k).some((n) => names(key).includes(n)));
  return Math.max(i, 0);
}

export default function Scales({ engine }) {
  const [choice, setChoice] = useState(loadChoice);
  const [playing, setPlaying] = useState(false);
  // Counts plays, so a finished or stopped one doesn't reset a newer one.
  const run = useRef(0);
  const stop = () => {
    run.current++;
    setPlaying(false);
    newSound();
  };
  // Leaving the page stops the scale.
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

  const keys = choice.mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  const key = keys[Math.min(choice.index, keys.length - 1)];
  const form = choice.mode === 'major' ? 'major' : choice.form;
  const notes = buildScale(key.tonic, FORMS[form]);
  const title = `${prettyName(key.tonic)} ${choice.mode === 'major' ? 'major' : `${choice.form} minor`}`;

  async function play() {
    if (playing) return stop();
    newSound();
    const id = ++run.current;
    // Melodic minor comes back down as the natural minor.
    const down = buildScale(key.tonic, FORMS[form === 'melodic' ? 'natural' : form]).reverse().slice(1);
    const freqs = [...notes, ...down].map((n) => midiFreq(n.midi));
    setPlaying(true);
    const done = () => {
      if (run.current === id) setPlaying(false);
    };
    try {
      await engine.getMelodyBuffer(freqs);
    } catch {
      return done();
    }
    if (run.current !== id) return;
    // The button goes back once the scale has had time to finish (0.3 s a
    // note plus the last note's ring); iPhones don't always report the
    // sound ending.
    setTimeout(done, freqs.length * 300 + 1500);
    engine.playMelody(freqs).then(done, done);
  }


  return (
    <div className="scales">
      <div className="practice-tabs scales-modes" role="tablist" aria-label="Major or minor">
        {['major', 'minor'].map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={choice.mode === m}
            className={`practice-tab${choice.mode === m ? ' practice-tab-active' : ''}`}
            onClick={() => update({ mode: m, index: sameKeyIndex(key, m) })}
          >
            <span className="practice-tab-label">{m === 'major' ? 'Major' : 'Minor'}</span>
          </button>
        ))}
      </div>

      <div className="scales-keys-grid" role="listbox" aria-label="Key">
        {keys.map((k, i) => (
          <button
            key={k.tonic}
            role="option"
            aria-selected={i === choice.index}
            className={`scales-key-chip${i === choice.index ? ' scales-key-chip-active' : ''}`}
            onClick={() => update({ index: i })}
          >
            {prettyName(k.tonic)}
            {choice.mode === 'minor' && <span className="scales-key-m">m</span>}
          </button>
        ))}
      </div>

      {choice.mode === 'minor' && (
        <div className="scales-forms" role="radiogroup" aria-label="Kind of minor scale">
          {MINOR_FORMS.map((f) => (
            <button
              key={f.id}
              role="radio"
              aria-checked={choice.form === f.id}
              className={`scales-form${choice.form === f.id ? ' scales-form-active' : ''}`}
              onClick={() => update({ form: f.id })}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <section className="practice-card scales-card" aria-label={title}>
        <div className="scales-title-row">
          <h3 className="scales-title">
            {title}
            {key.also && <span className="scales-also"> (same keys as {key.also})</span>}
          </h3>
          <button className="pill-btn-primary scales-play" onClick={play}>
            {playing ? '■ Stop' : '▶ Play'}
          </button>
        </div>
        <Keyboard notes={notes} rh={key.rh} lh={key.lh} />
        <table className="scales-table">
          <tbody>
            <tr>
              <th scope="row">Notes</th>
              {notes.map((n, i) => (
                <td key={i}>{n.name}</td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="scales-rh">
                Right hand
              </th>
              {key.rh.split('').map((f, i) => (
                <td key={i}>{f}</td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="scales-lh">
                Left hand
              </th>
              {key.lh.split('').map((f, i) => (
                <td key={i}>{f}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="scales-note">
          {form === 'melodic' ? 'Going down, play the natural minor notes. ' : ''}1 = thumb. Fingers shown going up; coming
          down, use the same fingers in reverse.
        </p>
      </section>
    </div>
  );
}
