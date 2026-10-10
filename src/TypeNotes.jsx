import { useState } from 'react';
import { buildVoicing, playCorrectChime, playWrongBuzz } from './piano.js';
import { later, newSound } from './soundBus.js';

// After naming a chord's color, players on the notes level play its three
// notes, bottom to top (red: C, E, G), on a one-octave piano with the
// letter on every key. Each key plays as it's tapped and lights up in the
// chord's color with its number; three right keys play the chord. A wrong
// try shows the right keys and letters and lets her try again.
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Black keys sit after these white keys. They're only for looks (taps go
// through to the white key), so every tap lands on a letter.
const BLACK_AFTER = ['C', 'D', 'F', 'G', 'A'];

export default function TypeNotes({ color, engine, onNext, nextLabel }) {
  const [typed, setTyped] = useState([]);
  const [result, setResult] = useState(null); // null | 'right' | 'wrong'

  function tap(letter) {
    if (result || typed.length >= 3) return;
    newSound();
    const next = [...typed, letter];
    // Each letter sounds above the one before, as in the chord (black's
    // A, C, F goes up from A, not down to C).
    const voiced = buildVoicing(next);
    engine.playPitch(letter, voiced[voiced.length - 1].octave);
    setTyped(next);
    if (next.length < 3) return;
    const right = next.every((l, i) => l === color.notes[i]);
    setResult(right ? 'right' : 'wrong');
    later(() => {
      if (right) playCorrectChime();
      else playWrongBuzz();
    }, 350);
    later(() => (right ? engine.playChord(color.notes) : engine.playNoteSequence(color.notes)), 900);
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
        {LETTERS.map((letter) => {
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
              onClick={() => tap(letter)}
              disabled={!!result}
              aria-label={letter}
            >
              {lit && <span className="tn-key-num">{litAt + 1}</span>}
              <span className="tn-key-letter">{letter}</span>
              {BLACK_AFTER.includes(letter) && <span className="tn-black" aria-hidden="true" />}
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
      {result === 'right' && (
        <div className="feedback-actions">
          <button className="pill-btn-primary pill-btn-full" onClick={onNext}>
            {nextLabel} →
          </button>
        </div>
      )}
    </div>
  );
}
