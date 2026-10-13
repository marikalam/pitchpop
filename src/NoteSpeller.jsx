import { useEffect, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { speakNoteName, speakResults } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';
import {
  CLEF_MODES,
  LETTERS,
  LEVELS,
  buildNoteQueue,
  lettersFor,
  readingClef,
  readingLetters,
  readingLevel,
  setReadingClef,
} from './noteReading.js';
import Staff from './Staff.jsx';

// Note reading: a note is drawn on a treble or bass staff, the player
// names it, and the app says the name and plays that exact pitch - so
// every answer, right or wrong, links the written note to its name and
// its sound.
const SESSION_ROUNDS = 10;
function ProgressDots({ current, total }) {
  const items = [];
  for (let i = 1; i <= total; i++) {
    items.push(<span key={`d${i}`} className={`progress-dot${i <= current ? ' progress-dot-filled' : ''}`} />);
    if (i < total) {
      items.push(<span key={`l${i}`} className={`progress-line${i < current ? ' progress-line-filled' : ''}`} />);
    }
  }
  return (
    <div className="progress-wrap ns-progress">
      <div className="progress-dots">{items}</div>
      <span className="progress-count">
        {current} / {total}
      </span>
    </div>
  );
}

export default function NoteSpeller({ engine, playerId, onComplete, onOpenSettings }) {
  // Clef, part of the staff and letters are set per player in Players &
  // colors.
  // The clef can be switched right here too (saved for the player).
  const [clefMode, setClefMode] = useState(() => readingClef(playerId));
  const [{ level, myLetters }] = useState(() => ({
    level: readingLevel(playerId),
    myLetters: readingLetters(playerId),
  }));
  const [queue, setQueue] = useState(() => buildNoteQueue(clefMode, SESSION_ROUNDS, level, myLetters));
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

  function restart(clef = clefMode) {
    setQueue(buildNoteQueue(clef, SESSION_ROUNDS, level, myLetters));
    setRoundIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setDone(false);
  }

  function chooseClef(clef) {
    if (clef === clefMode) return;
    newSound();
    setClefMode(clef);
    setReadingClef(playerId, clef);
    restart(clef);
  }

  // Says the letter, then plays the note - unless another sound has started
  // meanwhile (see soundBus.js).
  async function sayAndPlay(note, soundId = newSound()) {
    await speakNoteName(note.letter);
    if (!isCurrent(soundId)) return;
    engine.playPitch(note.letter, note.octave);
  }

  function answer(letter) {
    if (answered) return;
    const correct = letter === target.letter;
    setAnswered({ picked: letter, correct });
    const soundId = newSound();
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
    } else {
      playWrongBuzz();
    }
    later(() => sayAndPlay(target, soundId), 350);
  }

  function next() {
    newSound();
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      setDone(true);
      speakResults(correctCount, SESSION_ROUNDS);
      onComplete?.();
      return;
    }
    setRoundIndex((i) => i + 1);
    setAnswered(null);
  }

  // What this player reads, and where to change it.
  const clefPicker = (
    <div className="ns-settings ns-summary">
      <div className="ns-segmented ns-clef-switch" role="radiogroup" aria-label="Clef">
        {CLEF_MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={clefMode === m.id}
            className={`ns-segment${clefMode === m.id ? ' ns-segment-active' : ''}`}
            onClick={() => chooseClef(m.id)}
          >
            {m.label.replace(' clef', '')}
          </button>
        ))}
      </div>
      <span className="ns-summary-text">
        {LEVELS.find((l) => l.id === level).label} · {myLetters.length === LETTERS.length ? 'All notes' : myLetters.join(' ')}
      </span>
      {onOpenSettings && (
        <button className="ns-summary-change" onClick={onOpenSettings} aria-label="NoteSpeller settings">
          ⚙️
        </button>
      )}
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

  // Everything fits on one screen, no scrolling: the staff takes whatever
  // height is left, and once a note is answered the feedback and Next
  // replace the letter keys in the same spot.
  return (
    <div className="ns-screen">
      {clefPicker}
      <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
      <h2 className="screen-title ns-title">What note is this?</h2>
      <div className="staff-card ns-staff-card">
        <Staff note={target} highlight={answered ? (answered.correct ? 'correct' : 'wrong') : null} />
        <button
          className="staff-play-btn ns-play-btn"
          onClick={() => {
            newSound();
            engine.playPitch(target.letter, target.octave);
          }}
          aria-label="Hear the note"
        >
          🔊 Hear
        </button>
      </div>

      <div className="ns-answer">
        {answered ? (
          <div className="note-feedback">
            <p className={`note-feedback-text${answered.correct ? ' note-feedback-correct' : ''}`}>
              {answered.correct
                ? `Yes! That's ${target.letter}.`
                : `You picked ${answered.picked}. That's ${target.letter}.`}
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
        ) : (
          <div className="note-answer-grid">
            {lettersFor(clefMode, level, myLetters).map((letter) => (
              <button key={letter} className="notespeller-key" onClick={() => answer(letter)}>
                {letter}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
