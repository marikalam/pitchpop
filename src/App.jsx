import { useEffect, useRef, useState } from 'react';
import { PianoEngine, playCorrectChime } from './piano.js';
import Rainbow from './Rainbow.jsx';
import ProfileSwitcher from './ProfileSwitcher.jsx';
import { MusicNoteIcon, BookIcon, ChartIcon, PlayTriangleIcon, SpeakerIcon, CheckIcon, XIcon } from './icons.jsx';

const COLORS = [
  { name: 'black', hex: '#232323', text: '#FFFFFF', notes: ['A', 'C', 'F'] },
  { name: 'blue', hex: '#3B6FB0', text: '#FFFFFF', notes: ['B', 'D', 'G'] },
  { name: 'red', hex: '#D6473C', text: '#FFFFFF', notes: ['C', 'E', 'G'] },
  { name: 'yellow', hex: '#E4C13B', text: '#241D00', notes: ['C', 'F', 'A'] },
  { name: 'green', hex: '#4C8858', text: '#FFFFFF', notes: ['D', 'G', 'B'] },
  { name: 'orange', hex: '#E98A2E', text: '#241300', notes: ['E', 'G', 'C'] },
  { name: 'purple', hex: '#7C4A9E', text: '#FFFFFF', notes: ['F', 'A', 'C'] },
  { name: 'pink', hex: '#D8688C', text: '#2B0714', notes: ['G', 'B', 'D'] },
  { name: 'brown', hex: '#7A5238', text: '#FFFFFF', notes: ['G', 'C', 'E'] },
];

const PROFILE_NAMES = {
  maddie: COLORS.map((c) => c.name),
  marcus: ['black', 'blue', 'red', 'yellow', 'green', 'orange'],
};

const SESSION_ROUNDS = 10;
const PROGRESS_KEY = 'pitchpop-progress-v1';

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildQueue(names, total) {
  let queue = [];
  while (queue.length < total) {
    queue = queue.concat(shuffle(names));
  }
  return queue.slice(0, total);
}

function buildOptions(correctName, profile) {
  const pool = PROFILE_NAMES[profile].filter((n) => n !== correctName);
  const distractors = shuffle(pool).slice(0, 3);
  const names = shuffle([correctName, ...distractors]);
  return names.map((n) => COLORS.find((c) => c.name === n));
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function AppHeader({ profile, onChangeProfile, onBack, showBack }) {
  return (
    <>
      <div className="brand-row">
        <h1 className="logo">
          <span className="ink">Pitch</span>
          <span className="pop-blue">P</span>
          <span className="pop-red">o</span>
          <span className="pop-green">p</span>
        </h1>
        {!showBack && (
          <a className="games-link-btn" href="https://marikalam.github.io/games/">
            Games
          </a>
        )}
      </div>
      {showBack ? (
        <div className="nav-row">
          <button className="back-link" onClick={onBack}>
            ← Back
          </button>
          <ProfileSwitcher profile={profile} onChange={onChangeProfile} />
        </div>
      ) : (
        <ProfileSwitcher profile={profile} onChange={onChangeProfile} />
      )}
    </>
  );
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

export default function App() {
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new PianoEngine();
  }

  const [view, setView] = useState('home');
  const [profile, setProfile] = useState('maddie');
  const [progress, setProgress] = useState(loadProgress);

  const [sessionQueue, setSessionQueue] = useState([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [options, setOptions] = useState([]);
  const [answerCorrect, setAnswerCorrect] = useState(false);

  const [justPlayed, setJustPlayed] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  useEffect(() => {
    if (!justPlayed) return;
    const id = setTimeout(() => setJustPlayed(null), 450);
    return () => clearTimeout(id);
  }, [justPlayed]);

  useEffect(() => {
    if (!celebrate) return;
    const id = setTimeout(() => setCelebrate(null), 1000);
    return () => clearTimeout(id);
  }, [celebrate]);

  const currentColor = sessionQueue.length ? COLORS.find((c) => c.name === sessionQueue[roundIndex]) : null;

  function playChord(color) {
    engineRef.current.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(20);
  }

  function goHome() {
    setView('home');
  }

  function startPlay() {
    setSessionQueue(buildQueue(PROFILE_NAMES[profile], SESSION_ROUNDS));
    setRoundIndex(0);
    setView('play-listen');
  }

  function listenTap() {
    playChord(currentColor);
    setOptions(buildOptions(currentColor.name, profile));
    setView('play-question');
  }

  function relistenTap() {
    playChord(currentColor);
  }

  function chooseAnswer(color) {
    const correct = color.name === currentColor.name;
    setAnswerCorrect(correct);
    if (correct) playCorrectChime();
    setProgress((prev) => {
      const p = prev[profile] || { total: 0, correct: 0, perColor: {} };
      const next = {
        ...prev,
        [profile]: {
          total: p.total + 1,
          correct: p.correct + (correct ? 1 : 0),
          perColor: { ...p.perColor, [currentColor.name]: (p.perColor[currentColor.name] || 0) + 1 },
        },
      };
      saveProgress(next);
      return next;
    });
    setView('play-feedback');
  }

  function hearAgainFromFeedback() {
    playChord(currentColor);
    setView('play-relisten');
  }

  function chooseDifferentAnswer() {
    setView('play-question');
  }

  function nextChord() {
    if (roundIndex + 1 >= SESSION_ROUNDS) {
      setView('play-complete');
      return;
    }
    setRoundIndex((r) => r + 1);
    setView('play-listen');
  }

  function exploreTap(color) {
    playChord(color);
    setJustPlayed(color.name);
    setCelebrate(color.name);
  }

  const stats = progress[profile] || { total: 0, correct: 0, perColor: {} };
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="page">
      <div className="app">
        {view === 'home' && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack={false} />
            <div className="menu-list">
              <button className="menu-card menu-card-blue" onClick={startPlay}>
                <span className="icon-badge" style={{ background: 'rgba(255,255,255,0.22)' }}>
                  <MusicNoteIcon />
                </span>
                <span className="menu-text">
                  <span className="menu-title">Play</span>
                  <span className="menu-sub">Listen and identify chords</span>
                </span>
              </button>
              <button className="menu-card menu-card-purple" onClick={() => setView('explore')}>
                <span className="icon-badge" style={{ background: '#8E4FD6' }}>
                  <BookIcon />
                </span>
                <span className="menu-text">
                  <span className="menu-title">Explore</span>
                  <span className="menu-sub">Learn chords and colors</span>
                </span>
              </button>
              <button className="menu-card menu-card-green" onClick={() => setView('progress')}>
                <span className="icon-badge" style={{ background: '#2FAE6B' }}>
                  <ChartIcon />
                </span>
                <span className="menu-text">
                  <span className="menu-title">Progress</span>
                  <span className="menu-sub">See your stats</span>
                </span>
              </button>
            </div>
          </>
        )}

        {view === 'play-listen' && currentColor && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack onBack={goHome} />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <h2 className="screen-title">Listen to the chord</h2>
            <p className="screen-sub">Tap the rainbow to hear it</p>
            <button className="rainbow-play-wrap" onClick={listenTap} aria-label="Play chord">
              <Rainbow colors={COLORS} activeName={null} visible pretty />
              <span className="rainbow-center-btn">
                <PlayTriangleIcon />
              </span>
            </button>
            <div className="tap-pill">Tap to listen</div>
          </>
        )}

        {view === 'play-relisten' && currentColor && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack onBack={goHome} />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <h2 className="screen-title">Listen to the chord again?</h2>
            <button className="rainbow-play-wrap" onClick={relistenTap} aria-label="Replay chord">
              <Rainbow colors={COLORS} activeName={null} visible pretty />
              <span className="rainbow-center-btn">
                <SpeakerIcon />
              </span>
            </button>
            <div className="tap-pill">Tap to hear again</div>
            <button className="back-link back-link-center" onClick={chooseDifferentAnswer}>
              ← Choose a different answer
            </button>
          </>
        )}

        {view === 'play-question' && currentColor && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack onBack={goHome} />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <h2 className="screen-title">What chord did you hear?</h2>
            <div className="options-grid">
              {options.map((color) => (
                <button
                  key={color.name}
                  className="option-btn"
                  style={{ background: color.hex, color: color.text }}
                  onClick={() => chooseAnswer(color)}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'play-feedback' && currentColor && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack onBack={goHome} />
            <ProgressDots current={roundIndex + 1} total={SESSION_ROUNDS} />
            <div className={`feedback-icon-wrap${answerCorrect ? ' feedback-correct' : ' feedback-incorrect'}`}>
              {answerCorrect && (
                <div className="feedback-confetti" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              )}
              <span className="feedback-icon">{answerCorrect ? <CheckIcon /> : <XIcon />}</span>
            </div>
            <h2 className="screen-title">{answerCorrect ? 'Great job!' : 'Almost!'}</h2>
            <p className="screen-sub">{answerCorrect ? "That's right!" : 'The correct answer is:'}</p>
            <div className="answer-card" style={{ background: currentColor.hex, color: currentColor.text }}>
              <div className="answer-name">{currentColor.name}</div>
              <div className="answer-notes">{currentColor.notes.join(' · ')}</div>
            </div>
            <div className="feedback-actions">
              <button className="pill-btn-secondary" onClick={hearAgainFromFeedback}>
                🔊 Hear again
              </button>
              <button className="pill-btn-primary" onClick={nextChord}>
                {roundIndex + 1 >= SESSION_ROUNDS ? 'Finish' : 'Next chord'} →
              </button>
            </div>
          </>
        )}

        {view === 'play-complete' && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack onBack={goHome} />
            <div className="complete-wrap">
              <div className="complete-emoji">🎉</div>
              <h2 className="screen-title">All done!</h2>
              <p className="screen-sub">
                You went through all {SESSION_ROUNDS} chords for {profile === 'maddie' ? 'Maddie' : 'Marcus'}.
              </p>
              <div className="feedback-actions">
                <button className="pill-btn-secondary" onClick={goHome}>
                  Home
                </button>
                <button className="pill-btn-primary" onClick={startPlay}>
                  Play again →
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'explore' && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack onBack={goHome} />
            <h2 className="screen-title">Explore</h2>
            <p className="screen-sub">Tap a pad to play its chord</p>
            <div className="rainbow-slot">
              <Rainbow colors={COLORS} activeName={celebrate} visible={!!celebrate} />
            </div>
            <div className="grid">
              {COLORS.map((color) => (
                <button
                  key={color.name}
                  className={`pad${justPlayed === color.name ? ' pad-played' : ''}`}
                  style={{ background: color.hex, color: color.text }}
                  aria-label={`Play ${color.name} chord`}
                  onClick={() => exploreTap(color)}
                >
                  <div className="pad-name">{color.name}</div>
                  <div className="pad-notes">{color.notes.join(' ')}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {view === 'progress' && (
          <>
            <AppHeader profile={profile} onChangeProfile={setProfile} showBack onBack={goHome} />
            <h2 className="screen-title">Progress</h2>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="stat-number">{stats.total}</div>
                <div className="stat-label">Chords played</div>
              </div>
              <div className="stat-tile">
                <div className="stat-number">{accuracy}%</div>
                <div className="stat-label">Accuracy</div>
              </div>
            </div>
            <div className="screen-sub progress-colors-label">By color</div>
            <div className="progress-colors">
              {PROFILE_NAMES[profile].map((name) => {
                const color = COLORS.find((c) => c.name === name);
                const count = (stats.perColor && stats.perColor[name]) || 0;
                return (
                  <div key={name} className="progress-chip" style={{ background: color.hex, color: color.text }}>
                    {count}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
