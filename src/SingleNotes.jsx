import { useEffect, useRef, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { speakColorName, speakNoteName, speakResults } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';
import ProgressDots from './ProgressDots.jsx';
import Icon from './Icon.jsx';

// Single notes: the level after the white-key chord colors (set per player
// in Players & colors). One white key plays - middle C up to the C above -
// and the player taps that key on the keyboard. Like the colors, it's
// the sound first: no picture of the note, just the note to hear. Every
// answer, right or wrong, then says the note's name and plays it again, so
// the sound and its name go together.
//
// A player still learning the black-key colors (light green, beige) gets
// those as chords in the same round, Pitch Practice style: the chord plays
// and they pick its color from their colors.
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

const shuffle = (list) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// 20 questions: single white keys (never the same twice in a row), and
// with black-key colors to practice, some of their chords mixed in (6 for
// one color, 8 for more).
function buildQueue(chordColors) {
  const chords = chordColors.length ? (chordColors.length === 1 ? 6 : 8) : 0;
  const chordItems = Array.from({ length: chords }, (_, i) => ({
    type: 'chord',
    color: chordColors[i % chordColors.length],
  }));
  const notes = [];
  while (notes.length < SESSION_ROUNDS - chords) {
    const k = Math.floor(Math.random() * KEYS.length);
    if (k !== notes[notes.length - 1]?.k) notes.push({ type: 'note', k });
  }
  // Chords go in at random places among the notes.
  const slots = new Set(shuffle([...Array(SESSION_ROUNDS).keys()]).slice(0, chords));
  const chordQueue = shuffle(chordItems);
  let n = 0;
  return Array.from({ length: SESSION_ROUNDS }, (_, i) => (slots.has(i) ? chordQueue.pop() : notes[n++]));
}

// chordColors: the player's black-key colors (played as chords);
// answerColors: all their colors, the choices for a chord.
export default function SingleNotes({ engine, chordColors = [], answerColors = [], onComplete, stickerSlot }) {
  const [queue, setQueue] = useState(() => buildQueue(chordColors));
  const [roundIndex, setRoundIndex] = useState(0);
  const [answered, setAnswered] = useState(null); // { key or color, correct }
  const [correctCount, setCorrectCount] = useState(0);
  const [outcomes, setOutcomes] = useState({});
  const [done, setDone] = useState(false);
  const item = queue[roundIndex];
  const isChord = item.type === 'chord';
  const target = isChord ? null : item.k;
  const note = isChord ? null : KEYS[item.k];

  // The notes ready ahead of time, so each plays at once.
  useEffect(() => {
    KEYS.forEach((k) => engine.getPitchBuffer(k.letter, k.octave));
    chordColors.forEach((c) => engine.getChordBuffer(c.notes));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // The question's sound: the note, or the chord.
  const play = () => (isChord ? engine.playChord(item.color.notes) : engine.playPitch(note.letter, note.octave));
  function hear() {
    newSound();
    play();
  }

  // Each new note plays by itself.
  useEffect(() => {
    if (done) return undefined;
    const id = setTimeout(hear, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIndex, queue, done]);

  useEffect(() => () => newSound(), []);

  // k: the key tapped (a note), or the color picked (a chord).
  function answer(k) {
    if (answered) return;
    const correct = isChord ? k === item.color.name : k === target;
    setAnswered({ key: k, correct });
    setOutcomes((o) => ({ ...o, [roundIndex]: correct }));
    const soundId = newSound();
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
    } else {
      playWrongBuzz();
    }
    // Its name, then the sound again; then on to the next by itself (a
    // wrong answer stays a little longer, to see the right one). It moves
    // on even if the sound never finishes, so it can't get stuck.
    let moved = false;
    const moveOn = () => {
      if (moved || !isCurrent(soundId)) return;
      moved = true;
      nextRef.current();
    };
    later(moveOn, correct ? 4500 : 6000);
    later(async () => {
      await (isChord ? speakColorName(item.color.name) : speakNoteName(note.letter));
      if (!isCurrent(soundId)) return;
      play();
      later(moveOn, correct ? 1500 : 2200);
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
    setQueue(buildQueue(chordColors));
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
  const cap = (n) => n.charAt(0).toUpperCase() + n.slice(1);
  const rightName = isChord ? cap(item.color.name) : name(target);
  const pickedName = answered && (isChord ? cap(answered.key) : name(answered.key));

  return (
    <div className="ns-screen sn-screen">
      <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} outcomes={outcomes} />
      <h2 className="screen-title ns-title">{isChord ? 'Which color is this chord?' : 'Which note is this?'}</h2>
      <button
        className={`sn-listen${isChord ? ' sn-listen-chord' : ''}${
          answered ? (answered.correct ? ' sn-listen-right' : ' sn-listen-wrong') : ''
        }`}
        onClick={hear}
        aria-label={isChord ? 'Hear the chord again' : 'Hear the note again'}
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
                <Icon name="party" /> Yes! That's {rightName}.
              </>
            ) : (
              `That's ${rightName}. You ${isChord ? 'picked' : 'tapped'} ${pickedName}.`
            )
          ) : isChord ? (
            'Pick the color you hear'
          ) : (
            'Tap the key you hear'
          )}
        </p>
        {isChord ? (
          // A black-key chord: pick its color, like Pitch Practice.
          <div className={`sn-colors sn-colors-${Math.min(answerColors.length, 4)}`}>
            {answerColors.map((c) => {
              const right = answered && c.name === item.color.name;
              const wrong = answered && !answered.correct && c.name === answered.key;
              return (
                <button
                  key={c.name}
                  className={`option-btn sn-color${right ? ' sn-color-right' : ''}${wrong ? ' sn-color-wrong' : ''}${
                    answered && !right && !wrong ? ' sn-color-dim' : ''
                  }`}
                  style={{ background: c.hex, color: c.text }}
                  onClick={() => answer(c.name)}
                  disabled={!!answered}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
