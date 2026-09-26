import { useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';

// A separate ear-training mode from the color/chord game: instead of
// hearing a chord and picking its color, the player sees a note's letter
// name and has to find it among the keys by ear - tapping a key always
// plays its sound, so wrong guesses are still a useful "that's not it,
// but here's what it sounds like" moment.
const NOTE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const SESSION_ROUNDS = 10;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQueue(total) {
  let queue = [];
  while (queue.length < total) {
    queue = queue.concat(shuffle(NOTE_LETTERS));
  }
  return queue.slice(0, total);
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

export default function NoteSpeller({ engine }) {
  const [queue, setQueue] = useState(() => buildQueue(SESSION_ROUNDS));
  const [roundIndex, setRoundIndex] = useState(0);
  const [keyOrder, setKeyOrder] = useState(() => shuffle(NOTE_LETTERS));
  const [answered, setAnswered] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  const target = queue[roundIndex];

  function playAgain() {
    setQueue(buildQueue(SESSION_ROUNDS));
    setRoundIndex(0);
    setKeyOrder(shuffle(NOTE_LETTERS));
    setAnswered(null);
    setCorrectCount(0);
    setDone(false);
  }

  function tapKey(letter) {
    if (answered) return;
    engine.playNoteSequence([letter]);
    const correct = letter === target;
    setAnswered({ picked: letter, correct });
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
    } else {
      playWrongBuzz();
    }
    setTimeout(() => {
      if (roundIndex + 1 >= SESSION_ROUNDS) {
        setDone(true);
      } else {
        setRoundIndex((i) => i + 1);
        setKeyOrder(shuffle(NOTE_LETTERS));
        setAnswered(null);
      }
    }, 1100);
  }

  if (done) {
    return (
      <div className="complete-wrap">
        <div className="complete-emoji">🎼</div>
        <h2 className="screen-title">NoteSpeller complete!</h2>
        <p className="screen-sub">
          You got {correctCount} out of {SESSION_ROUNDS} right.
        </p>
        <button className="pill-btn-primary" onClick={playAgain}>
          Play again →
        </button>
      </div>
    );
  }

  return (
    <>
      <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
      <h2 className="screen-title">Which key is {target}?</h2>
      <p className="screen-sub">Tap a key to hear it and find out</p>
      <div className="notespeller-keys">
        {keyOrder.map((letter) => {
          let cls = 'notespeller-key';
          if (answered) {
            if (letter === target) cls += ' notespeller-key-correct';
            else if (letter === answered.picked) cls += ' notespeller-key-wrong';
          }
          return (
            <button key={letter} className={cls} onClick={() => tapKey(letter)} disabled={!!answered}>
              {letter}
            </button>
          );
        })}
      </div>
    </>
  );
}
