import { useEffect, useRef, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { speakNoteName, speakResults } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';
import {
  CLEF_MODES,
  buildNoteQueue,
  lettersFor,
  readingClef,
  readingLetters,
  readingLevel,
  setReadingClef,
} from './noteReading.js';
import Staff from './Staff.jsx';
import { recordNoteRound } from './todayPlan.js';

// Note reading: a note is drawn on a treble or bass staff, the player
// names it, and the app says the name and plays that exact pitch - so
// every answer, right or wrong, links the written note to its name and
// its sound.
const SESSION_ROUNDS = 20;
// The answer is a key on a one-octave piano (like the chord notes in Pitch
// Practice), with the letter on each key. Letters a player isn't reading
// yet are dimmed; the black keys are only there to look like a piano.
const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_AFTER = ['C', 'D', 'F', 'G', 'A'];
export function ProgressDots({ current, total }) {
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

export default function NoteSpeller({ engine, playerId, onComplete, onOpenSettings, stickerSlot }) {
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
  // Letters missed this round, for tomorrow's "Today's practice".
  const misses = useRef({});

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
    misses.current = {};
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
      misses.current[target.letter] = (misses.current[target.letter] || 0) + 1;
    }
    // Say the name and play the note, then on to the next note by itself
    // (a wrong answer stays up a little longer, to see the right one).
    later(async () => {
      await sayAndPlay(target, soundId);
      if (isCurrent(soundId)) later(() => nextRef.current(), correct ? 900 : 1800);
    }, 350);
  }

  // next() as of the latest render (it reads this round's state), for
  // the timer that moves on by itself.
  const nextRef = useRef(null);
  nextRef.current = next;

  function next() {
    newSound();
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      setDone(true);
      speakResults(correctCount, SESSION_ROUNDS);
      recordNoteRound(playerId, misses.current);
      onComplete?.();
      return;
    }
    setRoundIndex((i) => i + 1);
    setAnswered(null);
  }

  // Treble or bass, big enough for small fingers, and where to change
  // the rest of this player's NoteSpeller settings.
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
          {/* Play again only once the sticker is in. */}
          {(stickerSlot || ((then) => then))(
            <button className="pill-btn-primary" onClick={() => restart()}>
              Play again →
            </button>,
          )}
        </div>
      </>
    );
  }

  // Everything fits on one screen, no scrolling: the staff takes whatever
  // height is left. Once a note is answered the right key lights up green
  // (a wrong one pink), and the next note comes by itself.
  return (
    <div className="ns-screen">
      {clefPicker}
      <div className="ns-progress-row">
        <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
        <span className="ns-stars" aria-label={`${correctCount} right`}>
          ⭐ {correctCount}
        </span>
      </div>
      <h2 className="screen-title ns-title">What note is this? 🎵</h2>
      <div className={`staff-card ns-staff-card${answered ? (answered.correct ? ' ns-staff-right' : ' ns-staff-wrong') : ''}`}>
        <span className="ns-deco ns-deco-1" aria-hidden="true">♪</span>
        <span className="ns-deco ns-deco-2" aria-hidden="true">♫</span>
        <span className="ns-deco ns-deco-3" aria-hidden="true">♩</span>
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
        <p
          className={`note-feedback-text ns-key-prompt${answered ? (answered.correct ? ' note-feedback-correct' : '') : ' ns-key-prompt-ask'}`}
          aria-live="polite"
        >
          {answered
            ? answered.correct
              ? `🎉 Yes! That's ${target.letter}.`
              : `That's ${target.letter}. You tapped ${answered.picked}.`
            : 'Tap the key'}
        </p>
        <div className="tn-piano ns-piano">
          {KEYS.map((letter) => {
            const offered = lettersFor(clefMode, level, myLetters).includes(letter);
            const right = answered && letter === target.letter;
            const wrong = answered && !answered.correct && letter === answered.picked;
            return (
              <button
                key={letter}
                className={`tn-key ns-key-${letter}${offered ? '' : ' ns-key-off'}${right ? ' ns-key-right' : ''}${wrong ? ' tn-key-wrong' : ''}`}
                onClick={() => answer(letter)}
                disabled={!!answered || !offered}
                aria-label={letter}
              >
                <span className="tn-key-letter">{letter}</span>
              </button>
            );
          })}
          {KEYS.map((letter, k) =>
            BLACK_AFTER.includes(letter) ? (
              <span key={`${letter}#`} className="tn-black ns-black" style={{ '--k': k + 1 }} aria-hidden="true" />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
