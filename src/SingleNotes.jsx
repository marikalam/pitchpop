import { useEffect, useRef, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { speakNoteName, speakResults } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';
import ProgressDots from './ProgressDots.jsx';
import Icon from './Icon.jsx';

// Single notes: the level after the white-key chord colors (set per player
// in Players & colors). One white key plays - middle C up to the C above -
// and the player taps that key on the keyboard. Like the colors, it's
// the sound first: no picture of the note, just the note to hear. Every
// answer, right or wrong, then says the note's name and plays it again, so
// the sound and its name go together.
const SESSION_ROUNDS = 20;
// The eight white keys, middle C (C4) up to C5. The two Cs are different
// keys: the high C has to be told apart from middle C by ear.
const KEYS = [
  { letter: 'C', octave: 4 },
  { letter: 'D', octave: 4 },
  { letter: 'E', octave: 4 },
  { letter: 'F', octave: 4 },
  { letter: 'G', octave: 4 },
  { letter: 'A', octave: 4 },
  { letter: 'B', octave: 4 },
  { letter: 'C', octave: 5 },
];
const BLACK_AFTER = ['C', 'D', 'F', 'G', 'A'];

// 20 keys at random, never the same one twice in a row.
function buildQueue() {
  const queue = [];
  while (queue.length < SESSION_ROUNDS) {
    const k = Math.floor(Math.random() * KEYS.length);
    if (k !== queue[queue.length - 1]) queue.push(k);
  }
  return queue;
}

export default function SingleNotes({ engine, onComplete, stickerSlot }) {
  const [queue, setQueue] = useState(buildQueue);
  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState(null); // { key, correct }
  const [correctCount, setCorrectCount] = useState(0);
  const [outcomes, setOutcomes] = useState({});
  const [done, setDone] = useState(false);
  const target = queue[roundIndex];
  const note = KEYS[target];

  // The notes ready ahead of time, so each plays at once.
  useEffect(() => {
    KEYS.forEach((k) => engine.getPitchBuffer(k.letter, k.octave));
  }, [engine]);

  function hear() {
    newSound();
    engine.playPitch(note.letter, note.octave);
  }

  // Each new note plays by itself.
  useEffect(() => {
    if (done) return undefined;
    const id = setTimeout(hear, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, queue, done]);

  useEffect(() => () => newSound(), []);

  function answer(k) {
    if (answered) return;
    const correct = k === target;
    setAnswered({ key: k, correct });
    setOutcomes((o) => ({ ...o, [roundIndex]: correct }));
    const soundId = newSound();
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
    } else {
      playWrongBuzz();
    }
    // Its name, then the note again; then on to the next by itself (a
    // wrong answer stays a little longer, to see the right key). It moves
    // on even if the sound never finishes, so it can't get stuck.
    let moved = false;
    const moveOn = () => {
      if (moved || !isCurrent(soundId)) return;
      moved = true;
      nextRef.current();
    };
    later(moveOn, correct ? 4000 : 5500);
    later(async () => {
      await speakNoteName(note.letter);
      if (!isCurrent(soundId)) return;
      engine.playPitch(note.letter, note.octave);
      later(moveOn, correct ? 1200 : 2000);
    }, 400);
  }

  const nextRef = useRef(null);
  nextRef.current = next;

  function next() {
    newSound();
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      setDone(true);
      speakResults(correctCount, SESSION_ROUNDS);
      onComplete?.(correctCount, SESSION_ROUNDS);
      return;
    }
    setRoundIndex((i) => i + 1);
    setAnswered(null);
  }

  function restart() {
    setQueue(buildQueue());
    setRoundIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setOutcomes({});
    setDone(false);
  }

  if (done) {
    return (
      <div className="complete-wrap">
        <div className="complete-emoji">
          <Icon name="keys" />
        </div>
        <h2 className="screen-title">Single notes complete!</h2>
        <p className="screen-sub">
          You got {correctCount} out of {SESSION_ROUNDS} right.
        </p>
        {/* Play again only once the sticker is in. */}
        {(stickerSlot || ((then) => then))(
          <button className="pill-btn-primary" onClick={restart}>
            Play again →
          </button>,
        )}
      </div>
    );
  }

  const name = (k) => (k === 0 ? 'middle C' : k === KEYS.length - 1 ? 'high C' : KEYS[k].letter);

  return (
    <div className="ns-screen sn-screen">
      <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} outcomes={outcomes} />
      <h2 className="screen-title ns-title">Which note is this?</h2>
      <button
        className={`sn-listen${answered ? (answered.correct ? ' sn-listen-right' : ' sn-listen-wrong') : ''}`}
        onClick={hear}
        aria-label="Hear the note again"
      >
        <Icon name="speaker" size="72px" />
        <span>Tap to hear again</span>
      </button>

      <div className="ns-answer">
        <p
          className={`note-feedback-text ns-key-prompt${answered ? (answered.correct ? ' note-feedback-correct' : '') : ' ns-key-prompt-ask'}`}
          aria-live="polite"
        >
          {answered ? (
            answered.correct ? (
              <>
                <Icon name="party" /> Yes! That's {name(target)}.
              </>
            ) : (
              `That's ${name(target)}. You tapped ${name(answered.key)}.`
            )
          ) : (
            'Tap the key you hear'
          )}
        </p>
        <div className="tn-piano ns-piano sn-piano">
          {KEYS.map((k, i) => {
            const right = answered && i === target;
            const wrong = answered && !answered.correct && i === answered.key;
            return (
              <button
                key={i}
                className={`tn-key ns-key-${k.letter}${right ? ' ns-key-right' : ''}${wrong ? ' tn-key-wrong' : ''}`}
                onClick={() => answer(i)}
                disabled={!!answered}
                aria-label={name(i)}
              >
                <span className="tn-key-letter">{k.letter}</span>
              </button>
            );
          })}
          {KEYS.map((k, i) =>
            BLACK_AFTER.includes(k.letter) && i < KEYS.length - 1 ? (
              <span key={`${i}#`} className="tn-black ns-black" style={{ '--k': i + 1 }} aria-hidden="true" />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
