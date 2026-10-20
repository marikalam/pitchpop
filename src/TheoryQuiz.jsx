import { useEffect, useRef, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { later, newSound } from './soundBus.js';
import { speakResults } from './speech.js';
import { GLOSSARY } from './theoryGlossary.js';
import { TheoryPicture } from './MusicTheory.jsx';
import ProgressDots from './ProgressDots.jsx';

// The Music Theory quiz: 20 pictures from the glossary, one at a time
// ("What is this?"), with four names to pick from - like Pitch Practice
// and NoteSpeller. The wrong choices come from the same topic when they
// can (a half rest with the other rests), so it tests the sign, not the
// topic. After each answer its meaning shows: a right one moves on by
// itself, a wrong one waits for Next so there's time to read it.
const SESSION_ROUNDS = 20;
const CHOICES = 4;

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQuiz() {
  return shuffle(GLOSSARY)
    .slice(0, SESSION_ROUNDS)
    .map((entry) => {
      const mates = shuffle(GLOSSARY.filter((e) => e.id !== entry.id && e.category === entry.category));
      const others = shuffle(GLOSSARY.filter((e) => e.category !== entry.category));
      const wrong = [...mates, ...others].slice(0, CHOICES - 1);
      return { entry, choices: shuffle([entry, ...wrong]) };
    });
}

export default function TheoryQuiz({ onComplete, stickerSlot }) {
  const [quiz, setQuiz] = useState(buildQuiz);
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Right or wrong for each question answered ({ [index]: true | false }).
  const [outcomes, setOutcomes] = useState({});
  const [done, setDone] = useState(false);
  const { entry, choices } = quiz[index];

  // next() as of the latest render, for the timer that moves on by itself.
  const nextRef = useRef(null);
  nextRef.current = next;
  useEffect(() => () => newSound(), []);

  function answer(choice) {
    if (answered) return;
    const correct = choice.id === entry.id;
    setAnswered({ picked: choice.id, correct });
    setOutcomes((o) => ({ ...o, [index]: correct }));
    newSound();
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
      later(() => nextRef.current(), 2200);
    } else {
      playWrongBuzz();
    }
  }

  function next() {
    newSound();
    if (index + 1 >= SESSION_ROUNDS) {
      setDone(true);
      speakResults(correctCount, SESSION_ROUNDS);
      onComplete?.();
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(null);
  }

  function restart() {
    setQuiz(buildQuiz());
    setIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setOutcomes({});
    setDone(false);
  }

  if (done) {
    return (
      <div className="complete-wrap">
        <div className="complete-emoji">📖</div>
        <h2 className="screen-title">Theory quiz complete!</h2>
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

  const state = (choice) => {
    if (!answered) return '';
    if (choice.id === entry.id) return ' tq-choice-right';
    if (choice.id === answered.picked) return ' tq-choice-wrong';
    return ' tq-choice-dim';
  };

  return (
    <div className="tq-screen">
      <ProgressDots current={index + 1} total={SESSION_ROUNDS} outcomes={outcomes} />
      <h2 className="screen-title tq-title">What is this? 🎼</h2>
      <div
        className={`staff-card tq-card${answered ? (answered.correct ? ' ns-staff-right' : ' ns-staff-wrong') : ''}`}
      >
        <TheoryPicture key={entry.id} picture={entry.picture} label="Music sign" />
      </div>
      {answered ? (
        <div className="tq-feedback">
          <p className={`note-feedback-text${answered.correct ? ' note-feedback-correct' : ''}`}>
            {answered.correct ? `🎉 Yes! ${entry.term}` : `That's ${entry.term}`}
          </p>
          <p className="tq-meaning">{entry.text}</p>
        </div>
      ) : null}
      <div className="tq-choices">
        {choices.map((choice) => (
          <button
            key={choice.id}
            className={`tq-choice${state(choice)}`}
            onClick={() => answer(choice)}
            disabled={!!answered}
          >
            {choice.term}
          </button>
        ))}
      </div>
      {answered && !answered.correct && (
        <button className="pill-btn-primary tq-next" onClick={next}>
          {index + 1 >= SESSION_ROUNDS ? 'Finish' : 'Next'} →
        </button>
      )}
    </div>
  );
}
