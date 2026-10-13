import { useEffect, useRef, useState } from 'react';
import { bassOctave, playCorrectChime, playWrongBuzz } from './piano.js';
import { later, newSound } from './soundBus.js';

// After naming a chord's color, players on the notes level play its three
// notes, bottom to top (red: C, E, G), on a one-octave piano with the
// letter on every key. The piano starts on the chord's first note, so its
// notes always go up left to right (brown: G … C … E). Each key plays as
// it's tapped and lights up in the chord's color with its number. Three
// right keys: a chime, and the next chord comes by itself. A wrong try
// shows the right keys and lets her try again. (Nothing is spoken: the
// letters read out loud broke the mood.)
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Black keys sit after these white keys. They're only for looks (taps go
// through to the white key), so every tap lands on a letter.
const BLACK_AFTER = ['C', 'D', 'F', 'G', 'A'];

// One octave of white keys from `first` up, each with its octave (it goes
// up one past B).
function keysFrom(first) {
  const start = LETTERS.indexOf(first);
  let octave = bassOctave(first);
  return LETTERS.map((_, i) => {
    const letter = LETTERS[(start + i) % LETTERS.length];
    if (i > 0 && letter === 'C') octave += 1;
    return { letter, octave };
  });
}

export default function TypeNotes({ color, engine, onNext, nextLabel }) {
  const [typed, setTyped] = useState([]);
  const [result, setResult] = useState(null); // null | 'right' | 'wrong'
  const keys = keysFrom(color.notes[0]);
  // Moving on by itself only while this chord is still on screen (not
  // after Next was tapped, or the player left).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  function tap(letter, octave) {
    if (result || typed.length >= 3) return;
    newSound();
    const next = [...typed, letter];
    engine.playPitch(letter, octave);
    setTyped(next);
    if (next.length < 3) return;
    const right = next.every((l, i) => l === color.notes[i]);
    setResult(right ? 'right' : 'wrong');
    later(() => {
      if (right) playCorrectChime();
      else playWrongBuzz();
    }, 350);
    if (right) later(() => alive.current && onNext(), 1500);
  }

  function undo() {
    if (result) return;
    setTyped((t) => t.slice(0, -1));
  }

  function tryAgain() {
    newSound();
    setTyped([]);
    setResult(null);
  }

  return (
    <div className="type-notes">
      <p className="type-notes-title">
        {result === 'right'
          ? `Yes! ${color.notes.join(', ')}`
          : result === 'wrong'
            ? `${color.name[0].toUpperCase()}${color.name.slice(1)} is ${color.notes.join(', ')}`
            : `Now play ${color.name}'s notes`}
      </p>
      <div className={`type-notes-slots${result === 'wrong' ? ' type-notes-slots-fixed' : ''}`}>
        {[0, 1, 2].map((i) => {
          const letter = typed[i];
          const wrong = result === 'wrong' && letter !== color.notes[i];
          return (
            <span
              key={i}
              className={`type-notes-slot${letter ? ' type-notes-slot-filled' : ''}${wrong ? ' type-notes-slot-wrong' : ''}`}
              style={letter && !wrong ? { background: color.hex, color: color.text, borderColor: color.hex } : undefined}
            >
              {letter || ''}
              {wrong && <span className="type-notes-fix">{color.notes[i]}</span>}
            </span>
          );
        })}
      </div>
      <div className={`tn-piano${result ? ' tn-piano-done' : ''}`}>
        {keys.map(({ letter, octave }, k) => {
          const order = typed.indexOf(letter);
          // After a wrong try the chord's own keys light up (numbered in
          // order) and keys she tapped that aren't in it turn pink.
          const wrongKey = result === 'wrong' && order >= 0 && !color.notes.includes(letter);
          const litAt = result === 'wrong' ? color.notes.indexOf(letter) : order;
          const lit = litAt >= 0;
          return (
            <button
              key={letter}
              className={`tn-key${lit ? ' tn-key-lit' : ''}${wrongKey ? ' tn-key-wrong' : ''}`}
              style={lit ? { background: color.hex, color: color.text } : undefined}
              onClick={() => tap(letter, octave)}
              disabled={!!result}
              aria-label={letter}
            >
              {lit && <span className="tn-key-num">{litAt + 1}</span>}
              <span className="tn-key-letter">{letter}</span>
              {BLACK_AFTER.includes(letter) && k < keys.length - 1 && <span className="tn-black" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {!result && (
        <div className="tn-tools">
          <button className="type-notes-hear" onClick={undo} disabled={!typed.length}>
            ⌫ Undo
          </button>
          <button
            className="type-notes-hear"
            onClick={() => {
              newSound();
              engine.playChord(color.notes);
            }}
          >
            🔊 Hear the chord
          </button>
        </div>
      )}
      {result === 'wrong' && (
        <div className="feedback-actions">
          <button className="pill-btn-secondary" onClick={onNext}>
            {nextLabel}
          </button>
          <button className="pill-btn-primary" onClick={tryAgain}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
