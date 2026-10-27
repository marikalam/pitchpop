import { useEffect, useRef, useState } from 'react';
import { bassOctave, noteLabel, playCorrectChime, playWrongBuzz } from './piano.js';
import { later, newSound } from './soundBus.js';
import Icon from './Icon.jsx';

// After naming a chord's color, players on the notes level play its three
// notes, bottom to top (red: C, E, G), on a one-octave piano with the
// letter on every key. The piano starts on the chord's first note, so its
// notes always go up left to right (brown: G … C … E). Each key plays as
// it's tapped and lights up in the chord's color with its number. Three
// right keys: a chime, and the next chord comes by itself. A wrong try
// shows the right keys and lets her try again. (Nothing is spoken: the
// letters read out loud broke the mood.)
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// Black keys sit after these white keys. They play too (C# after C...),
// for chords with a black key like light green (A, C#, E).
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

  // After a wrong try the chord's own keys light up (numbered in order)
  // and keys she tapped that aren't in it turn pink.
  const state = (note) => {
    const order = typed.indexOf(note);
    const litAt = result === 'wrong' ? color.notes.indexOf(note) : order;
    return { litAt, lit: litAt >= 0, wrongKey: result === 'wrong' && order >= 0 && !color.notes.includes(note) };
  };

  return (
    <div className="type-notes">
      <p className="type-notes-title">
        {result === 'right'
          ? `Yes! ${color.notes.map(noteLabel).join(', ')}`
          : result === 'wrong'
            ? `${color.name[0].toUpperCase()}${color.name.slice(1)} is ${color.notes.map(noteLabel).join(', ')}`
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
              {letter ? noteLabel(letter) : ''}
              {wrong && <span className="type-notes-fix">{noteLabel(color.notes[i])}</span>}
            </span>
          );
        })}
      </div>
      <div className={`tn-piano${result ? ' tn-piano-done' : ''}`}>
        {keys.map(({ letter, octave }) => {
          const { litAt, lit, wrongKey } = state(letter);
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
            </button>
          );
        })}
        {/* The black keys sit on top, between their white keys, as keys of
            their own (light green's C♯). */}
        {keys.map(({ letter, octave }, k) => {
          if (!BLACK_AFTER.includes(letter) || k === keys.length - 1) return null;
          const sharp = `${letter}#`;
          const { litAt, lit, wrongKey } = state(sharp);
          return (
            <button
              key={sharp}
              className={`tn-black${lit ? ' tn-key-lit' : ''}${wrongKey ? ' tn-key-wrong' : ''}`}
              style={{ '--k': k + 1, ...(lit ? { background: color.hex, color: color.text } : {}) }}
              onClick={() => tap(sharp, octave)}
              disabled={!!result}
              aria-label={noteLabel(sharp)}
            >
              {lit && <span className="tn-key-num">{litAt + 1}</span>}
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
            <Icon name="speaker" /> Hear the chord
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
