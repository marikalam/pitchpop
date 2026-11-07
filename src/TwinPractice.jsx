import { useEffect, useRef, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { prewarmVoices, speakColorName, speakResults } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';
import ProgressDots from './ProgressDots.jsx';
import Icon from './Icon.jsx';
import Rainbow from './Rainbow.jsx';
import { SpeakerIcon } from './icons.jsx';

// Twin practice (Today's practice): the two colors this player mixes up
// most this week (progress.js), on their own. Many mix-ups are "twins":
// the same chord shape one step higher or lower (Black A-C-F and Blue
// B-D-G), so only the pitch tells them apart. First the two are heard
// side by side, then ROUNDS chords - only these two - and the player picks
// the color, the Eguchi way (chord first, then color). A wrong answer
// plays both again, one after the other, so the difference is heard.
const ROUNDS = 10;
// Twins (same shape, one step apart): the lower one first.
const TWINS = [
  ['black', 'blue'],
  ['yellow', 'green'],
  ['purple', 'pink'],
];
const CHORD_MS = 2200;

const cap = (n) => n.charAt(0).toUpperCase() + n.slice(1);

// Half and half, shuffled, never more than two of the same in a row.
function buildQueue(a, b) {
  for (;;) {
    const q = [...Array(ROUNDS / 2).fill(a), ...Array(ROUNDS / 2).fill(b)];
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    if (q.every((c, i) => i < 2 || c !== q[i - 1] || c !== q[i - 2])) return q;
  }
}

// pair: the two color objects ({ name, hex, text, notes }).
export default function TwinPractice({ engine, pair, rainbowColors = [], onComplete, stickerSlot }) {
  const twin = TWINS.find(([lo, hi]) => pair.some((c) => c.name === lo) && pair.some((c) => c.name === hi));
  // The lower twin first, when they're twins.
  const [a, b] = twin ? twin.map((n) => pair.find((c) => c.name === n)) : pair;
  const [stage, setStage] = useState('meet'); // meet | play | done
  const [queue, setQueue] = useState(() => buildQueue(a.name, b.name));
  const [index, setIndex] = useState(0);
  const [answered, setAnswered] = useState(null); // { name, correct }
  const [outcomes, setOutcomes] = useState({});
  const [correctCount, setCorrectCount] = useState(0);
  const color = queue[index] === a.name ? a : b;
  const other = color === a ? b : a;
  const finished = useRef(false);

  useEffect(() => {
    prewarmVoices();
    [a, b].forEach((c) => engine.getChordBuffer(c.notes));
    return () => newSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playChord = (c) => engine.playChord(c.notes);
  function hear(c) {
    newSound();
    playChord(c);
  }

  // Each new chord plays by itself.
  useEffect(() => {
    if (stage !== 'play') return undefined;
    const id = setTimeout(() => hear(color), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, index, queue]);

  // Moves on by itself (or at once with Next).
  const nextRef = useRef(null);
  nextRef.current = next;
  const indexRef = useRef(index);
  indexRef.current = index;

  function answer(name) {
    if (answered) return;
    const correct = name === color.name;
    setAnswered({ name, correct });
    setOutcomes((o) => ({ ...o, [index]: correct }));
    const id = newSound();
    const at = index;
    if (correct) {
      playCorrectChime();
      setCorrectCount((n) => n + 1);
      later(async () => {
        await speakColorName(color.name);
        if (isCurrent(id)) playChord(color);
      }, 400);
    } else {
      // Its name and chord, then the other twin's, to hear the difference.
      playWrongBuzz();
      later(async () => {
        await speakColorName(color.name);
        if (!isCurrent(id)) return;
        playChord(color);
        later(async () => {
          await speakColorName(other.name);
          if (isCurrent(id)) playChord(other);
        }, CHORD_MS);
      }, 400);
    }
    setTimeout(() => {
      if (indexRef.current === at && !finished.current) nextRef.current();
    }, correct ? 4500 : 8500);
  }

  function next() {
    if (finished.current) return;
    newSound();
    if (index + 1 >= ROUNDS) {
      finished.current = true;
      setStage('done');
      speakResults(correctCount, ROUNDS);
      onComplete?.(correctCount, ROUNDS);
      return;
    }
    setIndex((i) => i + 1);
    setAnswered(null);
  }

  function restart() {
    finished.current = false;
    setQueue(buildQueue(a.name, b.name));
    setIndex(0);
    setAnswered(null);
    setOutcomes({});
    setCorrectCount(0);
    setStage('meet');
  }

  const button = (c, onClick, extra = '', disabled = false, tag = null) => (
    <button
      key={c.name}
      className={`option-btn sn-color twin-color${extra}`}
      style={{ background: c.hex, color: c.text }}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="twin-color-name">{cap(c.name)}</span>
      <span className="twin-color-notes">{c.notes.join(' - ')}</span>
      {tag && <span className="twin-color-tag">{tag}</span>}
    </button>
  );

  if (stage === 'meet') {
    return (
      <div className="ns-screen sn-screen twin-screen">
        <span className="sn-part">Twin practice</span>
        <h2 className="screen-title ns-title">
          {cap(a.name)} or {cap(b.name)}?
        </h2>
        <p className="screen-sub twin-sub">
          These two get mixed up most this week. Tap each one and listen to the difference.
        </p>
        <div className="sn-colors sn-colors-2 twin-meet">
          {button(a, () => hear(a), ' twin-meet-btn')}
          {button(b, () => hear(b), ' twin-meet-btn')}
        </div>
        <button className="pill-btn-primary pill-btn-full twin-start" onClick={() => setStage('play')}>
          Start: {ROUNDS} chords →
        </button>
      </div>
    );
  }

  if (stage === 'done') {
    return (
      <div className="complete-wrap">
        <div className="complete-emoji">
          <Icon name="target" />
        </div>
        <h2 className="screen-title">Twin practice complete!</h2>
        <p className="screen-sub">
          {correctCount} of {ROUNDS} right: {cap(a.name)} and {cap(b.name)}.
        </p>
        {(stickerSlot || ((then) => then))(
          <button className="pill-btn-primary" onClick={restart}>
            Play again →
          </button>,
        )}
      </div>
    );
  }

  return (
    <div className="ns-screen sn-screen twin-screen">
      <ProgressDots current={index + 1} total={ROUNDS} outcomes={outcomes} />
      <span className="sn-part">
        Twin practice · {cap(a.name)} or {cap(b.name)}
      </span>
      <h2 className="screen-title ns-title">Which color is this chord?</h2>
      <button
        className={`rainbow-play-wrap rainbow-play-wrap-compact sn-rainbow${
          answered ? (answered.correct ? ' sn-listen-right' : ' sn-listen-wrong') : ''
        }`}
        onClick={() => hear(color)}
        aria-label="Hear the chord again"
      >
        <Rainbow colors={rainbowColors} activeName={null} visible pretty />
        <span className="rainbow-center-btn">
          <SpeakerIcon />
        </span>
      </button>
      <div className="ns-answer">
        <p
          className={`note-feedback-text ns-key-prompt${answered ? (answered.correct ? ' note-feedback-correct' : '') : ' ns-key-prompt-ask'}`}
          aria-live="polite"
        >
          {answered
            ? answered.correct
              ? `Yes! That's ${cap(color.name)}.`
              : `That's ${cap(color.name)}. Now hear ${cap(other.name)}…`
            : 'Listen, count 1, 2, then pick'}
        </p>
        <div className="sn-colors sn-colors-2">
          {[a, b].map((c) => {
            const right = answered && c.name === color.name;
            const wrong = answered && !answered.correct && c.name === answered.name;
            return button(
              c,
              () => answer(c.name),
              `${right ? ' sn-color-right' : ''}${wrong ? ' sn-color-wrong' : ''}${answered && !right && !wrong ? ' sn-color-dim' : ''}`,
              !!answered,
            );
          })}
        </div>
        {answered && (
          <button className="pill-btn-primary ns-next" onClick={next}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
