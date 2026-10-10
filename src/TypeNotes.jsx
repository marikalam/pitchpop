import { useState } from 'react';
import { buildVoicing, playCorrectChime, playWrongBuzz } from './piano.js';
import { later, newSound } from './soundBus.js';

// After naming a chord's color, players on the notes level type its three
// notes, bottom to top (red: C, E, G). Each letter plays as it's tapped;
// three right letters play the chord. A wrong try shows the right letters
// and lets her try again.
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

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
            : `Now type ${color.name}'s notes`}
      </p>
      <div className="type-notes-slots">
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
      {!result && (
        <>
          <div className="type-notes-keys">
            {LETTERS.map((letter) => (
              <button key={letter} className="type-notes-key" onClick={() => tap(letter)}>
                {letter}
              </button>
            ))}
            <button className="type-notes-key type-notes-undo" onClick={undo} disabled={!typed.length} aria-label="Undo">
              ⌫
            </button>
          </div>
          <button className="type-notes-hear" onClick={() => { newSound(); engine.playChord(color.notes); }}>
            🔊 Hear the chord
          </button>
        </>
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
