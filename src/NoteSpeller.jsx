import { useEffect, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { speakNoteName, speakResults } from './speech.js';
import { LETTERS, buildNoteQueue } from './noteReading.js';
import Staff from './Staff.jsx';

// Note reading: a note is drawn on a treble or bass staff, the player
// names it, and the app says the name and plays that exact pitch - so
// every answer, right or wrong, links the written note to its name and
// its sound.
const SESSION_ROUNDS = 10;
const CLEF_KEY = 'pitchpop-notespeller-clef-v1';
const CLEF_MODES = [
  { id: 'treble', label: 'Treble clef' },
  { id: 'bass', label: 'Bass clef' },
];

function loadClefMode() {
  try {
    const saved = localStorage.getItem(CLEF_KEY);
    if (CLEF_MODES.some((m) => m.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'treble';
}

function ProgressDots({ current, total }) {
  const items = [];
  for (let i = 1; i <= total; i++) {
    items.push(<span key={`d${i}`} className={`progress-dot${i <= current ? ' progress-dot-filled' : ''}`} />);
    if (i < total) {
      items.push(<span key={`l${i}`} className={`progress-line${i < current ? ' progress-line-filled' : ''}`} />);
    }
  }
  return (
    <div className="progress-wrap">
      <div className="progress-dots">{items}</div>
      <span className="progress-count">
        {current} / {total}
      </span>
    </div>
  );
}

export default function NoteSpeller({ engine, onComplete }) {
  const [clefMode, setClefMode] = useState(loadClefMode);
  const [queue, setQueue] = useState(() => buildNoteQueue(clefMode, SESSION_ROUNDS));
  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const target = queue[roundIndex];

  // Render this round's pitches ahead of time (offline rendering needs no
  // tap), so the reveal plays instantly.
  useEffect(() => {
    queue.forEach((n) => engine.getPitchBuffer(n.letter, n.octave));
  }, [queue, engine]);

  function restart(mode = clefMode) {
    setQueue(buildNoteQueue(mode, SESSION_ROUNDS));
    setRoundIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setDone(false);
  }

  function chooseClef(mode) {
    if (mode === clefMode) return;
    setClefMode(mode);
    try {
      localStorage.setItem(CLEF_KEY, mode);
    } catch {
      /* ignore */
    }
    restart(mode);
  }

  async function sayAndPlay(note) {
    await speakNoteName(note.letter);
    engine.playPitch(note.letter, note.octave);
  }

  function answer(letter) {
    if (answered) return;
    const correct = letter === target.letter;
    setAnswered({ picked: letter, correct });
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
    } else {
      playWrongBuzz();
    }
    setTimeout(() => sayAndPlay(target), 350);
  }

  function next() {
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      setDone(true);
      speakResults(correctCount, SESSION_ROUNDS);
      onComplete?.();
      return;
    }
    setRoundIndex((i) => i + 1);
    setAnswered(null);
  }

  const clefPicker = (
    <div className="clef-picker" role="radiogroup" aria-label="Clef">
      {CLEF_MODES.map((m) => (
        <button
          key={m.id}
          role="radio"
          aria-checked={clefMode === m.id}
          className={`clef-option${clefMode === m.id ? ' clef-option-active' : ''}`}
          onClick={() => chooseClef(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  if (done) {
    return (
      <>
        {clefPicker}
        <div className="complete-wrap">
          <div className="complete-emoji">🎼</div>
          <h2 className="screen-title">NoteSpeller complete!</h2>
          <p className="screen-sub">
            You got {correctCount} out of {SESSION_ROUNDS} right.
          </p>
          <button className="pill-btn-primary" onClick={() => restart()}>
            Play again →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {clefPicker}
      <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
      <h2 className="screen-title">What note is this?</h2>
      <div className="staff-card">
        <Staff note={target} highlight={answered ? (answered.correct ? 'correct' : 'wrong') : null} />
        <button className="staff-play-btn" onClick={() => engine.playPitch(target.letter, target.octave)}>
          🔊 Hear the note
        </button>
      </div>

      <div className="note-answer-grid">
        {LETTERS.map((letter) => {
          let cls = 'notespeller-key';
          if (answered) {
            if (letter === target.letter) cls += ' notespeller-key-correct';
            else if (letter === answered.picked) cls += ' notespeller-key-wrong';
          }
          return (
            <button key={letter} className={cls} onClick={() => answer(letter)} disabled={!!answered}>
              {letter}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="note-feedback">
          <p className={`note-feedback-text${answered.correct ? ' note-feedback-correct' : ''}`}>
            {answered.correct ? `Yes! That's ${target.letter}.` : `That's ${target.letter}.`}
          </p>
          <div className="feedback-actions">
            <button className="pill-btn-secondary" onClick={() => sayAndPlay(target)}>
              🔊 Hear it
            </button>
            <button className="pill-btn-primary" onClick={next}>
              {roundIndex + 1 >= SESSION_ROUNDS ? 'Finish' : 'Next'} →
            </button>
          </div>
        </div>
      )}
    </>
  );
}
