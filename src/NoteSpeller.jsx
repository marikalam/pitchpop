import { useEffect, useState } from 'react';
import { playCorrectChime, playWrongBuzz } from './piano.js';
import { speakNoteName, speakResults } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';
import { LETTERS, LEVELS, buildNoteQueue, lettersFor } from './noteReading.js';
import Staff from './Staff.jsx';

// Note reading: a note is drawn on a treble or bass staff, the player
// names it, and the app says the name and plays that exact pitch - so
// every answer, right or wrong, links the written note to its name and
// its sound.
const SESSION_ROUNDS = 10;
// Each player has their own clef, level and notes (say Marcus is on just C
// and D), saved on this device by player id. Before that there was one
// clef and level for everyone; those are where a player with nothing
// saved yet starts.
export const PLAYER_SETTINGS_KEY = 'pitchpop-notespeller-players-v1';
const CLEF_KEY = 'pitchpop-notespeller-clef-v1';
const LEVEL_KEY = 'pitchpop-notespeller-level-v1';
const CLEF_MODES = [
  { id: 'treble', label: 'Treble clef' },
  { id: 'bass', label: 'Bass clef' },
];
// Fewer than two notes would leave a single answer button.
const MIN_LETTERS = 2;

function loadAllPlayerSettings() {
  try {
    return JSON.parse(localStorage.getItem(PLAYER_SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function loadPlayerSettings(playerId) {
  const saved = loadAllPlayerSettings()[playerId] || {};
  let oldClef = null;
  let oldLevel = null;
  try {
    oldClef = localStorage.getItem(CLEF_KEY);
    oldLevel = localStorage.getItem(LEVEL_KEY);
  } catch {
    /* ignore */
  }
  const pickClef = (id) => CLEF_MODES.some((m) => m.id === id);
  const pickLevel = (id) => LEVELS.some((l) => l.id === id);
  const letters = Array.isArray(saved.letters) ? LETTERS.filter((l) => saved.letters.includes(l)) : [];
  return {
    clef: [saved.clef, oldClef].find(pickClef) || 'treble',
    level: [saved.level, oldLevel].find(pickLevel) || 'medium',
    letters: letters.length >= MIN_LETTERS ? letters : LETTERS,
  };
}

function savePlayerSettings(playerId, settings) {
  try {
    const all = loadAllPlayerSettings();
    all[playerId] = settings;
    localStorage.setItem(PLAYER_SETTINGS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
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
    <div className="progress-wrap ns-progress">
      <div className="progress-dots">{items}</div>
      <span className="progress-count">
        {current} / {total}
      </span>
    </div>
  );
}

export default function NoteSpeller({ engine, playerId, onComplete }) {
  const [settings, setSettings] = useState(() => loadPlayerSettings(playerId));
  const { clef: clefMode, level, letters } = settings;
  const [queue, setQueue] = useState(() => buildNoteQueue(clefMode, SESSION_ROUNDS, level, letters));
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

  function restart(next = settings) {
    setQueue(buildNoteQueue(next.clef, SESSION_ROUNDS, next.level, next.letters));
    setRoundIndex(0);
    setAnswered(null);
    setCorrectCount(0);
    setDone(false);
  }

  function changeSettings(change) {
    const next = { ...settings, ...change };
    setSettings(next);
    savePlayerSettings(playerId, next);
    restart(next);
  }

  function chooseClef(mode) {
    if (mode !== clefMode) changeSettings({ clef: mode });
  }

  function chooseLevel(lvl) {
    if (lvl !== level) changeSettings({ level: lvl });
  }

  function toggleLetter(letter) {
    const on = letters.includes(letter);
    if (on && letters.length <= MIN_LETTERS) return;
    changeSettings({ letters: LETTERS.filter((l) => (l === letter ? !on : letters.includes(l))) });
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

  // Clef, level and notes on one small card, each on its own labelled row.
  const clefPicker = (
    <div className="ns-settings">
      <div className="ns-setting-row">
        <span className="ns-setting-label" id="ns-clef-label">
          Clef
        </span>
        <div className="ns-segmented" role="radiogroup" aria-labelledby="ns-clef-label">
          {CLEF_MODES.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={clefMode === m.id}
              className={`ns-segment${clefMode === m.id ? ' ns-segment-active' : ''}`}
              onClick={() => chooseClef(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ns-setting-row">
        <span className="ns-setting-label" id="ns-level-label">
          Level
        </span>
        <div className="ns-segmented" role="radiogroup" aria-labelledby="ns-level-label">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={level === l.id}
              className={`ns-segment${level === l.id ? ' ns-segment-active' : ''}`}
              title={l.hint}
              onClick={() => chooseLevel(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ns-setting-row">
        <span className="ns-setting-label" id="ns-notes-label">
          Notes
        </span>
        <div className="ns-segmented" role="group" aria-labelledby="ns-notes-label">
          {LETTERS.map((letter) => {
            const on = letters.includes(letter);
            return (
              <button
                key={letter}
                aria-pressed={on}
                className={`ns-segment${on ? ' ns-segment-active' : ''}`}
                disabled={on && letters.length <= MIN_LETTERS}
                onClick={() => toggleLetter(letter)}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>
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
            {lettersFor(clefMode, level, letters).map((letter) => (
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
