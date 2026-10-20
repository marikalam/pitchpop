import { useEffect, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { isCurrent, later, newSound } from './soundBus.js';
import { speakResults, speakWords, voiceReady } from './speech.js';
import { GLOSSARY } from './theoryGlossary.js';
import { TheoryPicture } from './MusicTheory.jsx';
import ProgressDots from './ProgressDots.jsx';

// The Music Theory quiz: 20 pictures from the glossary, one at a time
// ("What is this?"), with four names to pick from - like Pitch Practice
// and NoteSpeller. The wrong choices come from the same topic when they
// can (a half rest with the other rests), so it tests the sign, not the
// topic. After each answer its meaning shows, and Next goes on to the
// next question. A right answer leaves only that button; a wrong one shows
// the right one in green next to the pick.
//
// For players who can't read yet, everything is said out loud: the
// question ("What is this?") and its four choices, each button lit up as
// its name is said; then after a pick, the answer and what it means. Tap
// the picture to hear it again.
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

// A choice the way it's said: "Piano (p)" is "Piano", "Sharp ♯" is
// "Sharp", "Bar line & measure" is "Bar line and measure".
const spoken = (term) =>
  term
    .replace(/\(.*?\)/g, '')
    .replace(/&/g, 'and')
    .replace(/[♯♭♮]/g, '')
    .trim();

// Waits for the words, but never more than a few seconds (a voice that's
// slow to load shouldn't hold up the rest).
const sayAtMost = (text, ms) => Promise.race([speakWords(text), new Promise((resolve) => setTimeout(resolve, ms))]);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  // The choice being read out loud right now (its id), lit up.
  const [reading, setReading] = useState(null);
  const { entry, choices } = quiz[index];

  // Says the question, then the four choices one at a time, each button
  // lit while its name is said. Any newer sound (an answer, the next
  // question) stops it.
  async function readQuestion() {
    const soundId = newSound();
    await voiceReady();
    if (!isCurrent(soundId)) return;
    await sayAtMost('What is this?', 4000);
    await pause(300);
    for (const choice of choices) {
      if (!isCurrent(soundId)) return;
      setReading(choice.id);
      await sayAtMost(spoken(choice.term), 3500);
      await pause(300);
    }
    if (isCurrent(soundId)) setReading(null);
  }

  // The answer out loud: right or not, its name, then what it means.
  async function readAnswer(correct, soundId = newSound()) {
    await sayAtMost(correct ? `Yes! ${spoken(entry.term)}.` : `That's ${spoken(entry.term)}.`, 4000);
    if (!isCurrent(soundId)) return;
    await pause(300);
    if (isCurrent(soundId)) await speakWords(entry.text);
  }

  // Each new question is read out loud.
  useEffect(() => {
    if (!done) readQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, quiz, done]);

  useEffect(() => () => newSound(), []);

  function hearAgain() {
    if (answered) readAnswer(answered.correct);
    else readQuestion();
  }

  function answer(choice) {
    if (answered) return;
    const correct = choice.id === entry.id;
    setAnswered({ picked: choice.id, correct });
    setOutcomes((o) => ({ ...o, [index]: correct }));
    setReading(null);
    const soundId = newSound();
    // Then the answer and its meaning, out loud.
    later(() => readAnswer(correct, soundId), 600);
    if (correct) {
      playCorrectChime();
      setCorrectCount((c) => c + 1);
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
        // Tap the picture to hear it again: the question and choices, or
        // once answered, the answer and its meaning.
        role="button"
        tabIndex={0}
        aria-label={answered ? 'Hear the answer' : 'Hear the question'}
        onClick={hearAgain}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && hearAgain()}
      >
        <span className="ns-tap-hint" aria-hidden="true">
          🔊 Tap to hear
        </span>
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
      <div className={`tq-choices${answered?.correct ? ' tq-choices-one' : ''}`}>
        {choices
          // Right: only the right answer stays.
          .filter((choice) => !answered?.correct || choice.id === entry.id)
          .map((choice) => (
            <button
              key={choice.id}
              className={`tq-choice${state(choice)}${reading === choice.id ? ' tq-choice-reading' : ''}`}
              onClick={() => answer(choice)}
              disabled={!!answered}
            >
              {choice.term}
            </button>
          ))}
      </div>
      {answered && (
        <button className="pill-btn-primary tq-next" onClick={next}>
          {index + 1 >= SESSION_ROUNDS ? 'Finish' : 'Next'} →
        </button>
      )}
    </div>
  );
}
