import { useEffect, useRef, useState } from 'react';
import { PianoEngine } from './piano.js';
import Waves from './Waves.jsx';
import Rainbow from './Rainbow.jsx';

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

const SESSION_ROUNDS = 20;

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

export default function App() {
  const engineRef = useRef(null);
  const [mode, setMode] = useState('practice');
  const [profile, setProfile] = useState('maddie');
  const [sessionQueue, setSessionQueue] = useState(() => buildQueue(PROFILE_NAMES.maddie, SESSION_ROUNDS));
  const [sessionRound, setSessionRound] = useState(0);
  const [phase, setPhase] = useState('ready');
  const [correctCount, setCorrectCount] = useState(0);
  const [scoredCount, setScoredCount] = useState(0);
  const [justPlayed, setJustPlayed] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  if (!engineRef.current) {
    engineRef.current = new PianoEngine();
  }

  useEffect(() => {
    if (mode !== 'practice') return;
    setSessionQueue(buildQueue(PROFILE_NAMES[profile], SESSION_ROUNDS));
    setSessionRound(0);
    setPhase('ready');
    setCorrectCount(0);
    setScoredCount(0);
  }, [mode, profile]);

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

  function play(color) {
    engineRef.current.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(25);
    setJustPlayed(color.name);
    setCelebrate(color.name);
  }

  function advanceRound() {
    if (sessionRound >= SESSION_ROUNDS) {
      setSessionQueue(buildQueue(PROFILE_NAMES[profile], SESSION_ROUNDS));
      setSessionRound(0);
      setCorrectCount(0);
      setScoredCount(0);
      setPhase('ready');
      return;
    }

    const color = COLORS.find((c) => c.name === sessionQueue[sessionRound]);
    engineRef.current.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(25);
    setSessionRound((r) => r + 1);
    setPhase('waiting');
  }

  function tapStage() {
    if (phase === 'waiting') {
      setPhase('revealed');
      return;
    }
    advanceRound();
  }

  function markScore(isCorrect) {
    setScoredCount((s) => s + 1);
    if (isCorrect) setCorrectCount((c) => c + 1);
    advanceRound();
  }

  const revealedColor = sessionRound > 0 ? COLORS.find((c) => c.name === sessionQueue[sessionRound - 1]) : null;
  const finished = sessionRound >= SESSION_ROUNDS;

  function replayCurrent() {
    if (!revealedColor) return;
    engineRef.current.playChord(revealedColor.notes);
    if (navigator.vibrate) navigator.vibrate(15);
  }

  return (
    <div className="page">
      <Waves />
      <div className="app">
        <header>
          <div>
            <h1>
              <span className="ink">Pitch</span>
              <span className="pop-blue">P</span>
              <span className="pop-red">o</span>
              <span className="pop-green">p</span>
            </h1>
            <p className="subtitle">
              {mode === 'practice' ? 'Practice time — listen carefully! 🎵' : 'Tap a pad to play its chord'}
            </p>
          </div>
          <button className="mode-pill" onClick={() => setMode(mode === 'explore' ? 'practice' : 'explore')}>
            {mode === 'explore' ? '🎯 Practice' : '← Explore'}
          </button>
        </header>

        {mode === 'practice' ? (
          <>
            <div className="profile-row">
              <button
                className={`seg${profile === 'maddie' ? ' seg-active' : ''}`}
                onClick={() => setProfile('maddie')}
              >
                Maddie
              </button>
              <button
                className={`seg${profile === 'marcus' ? ' seg-active' : ''}`}
                onClick={() => setProfile('marcus')}
              >
                Marcus
              </button>
            </div>

            <button
              className={`test-stage${phase === 'revealed' ? ' test-stage-revealed' : ''}`}
              style={phase === 'revealed' ? { background: revealedColor.hex } : undefined}
              onClick={tapStage}
            >
              {phase === 'revealed' ? (
                <div className="reveal" style={{ color: revealedColor.text }} key={sessionRound}>
                  <div className="confetti" aria-hidden="true">
                    <span style={{ background: revealedColor.hex, color: revealedColor.hex }} />
                    <span style={{ background: '#fff', color: '#fff' }} />
                    <span style={{ background: revealedColor.hex, color: revealedColor.hex }} />
                    <span style={{ background: '#fff', color: '#fff' }} />
                    <span style={{ background: revealedColor.hex, color: revealedColor.hex }} />
                    <span style={{ background: '#fff', color: '#fff' }} />
                    <span style={{ background: revealedColor.hex, color: revealedColor.hex }} />
                    <span style={{ background: '#fff', color: '#fff' }} />
                  </div>
                  <div className="reveal-name">{revealedColor.name}</div>
                  <div className="reveal-notes">{revealedColor.notes.join(' ')}</div>
                </div>
              ) : (
                <>
                  <Rainbow colors={COLORS} activeName={null} visible pretty />
                  <p className="stage-hint">
                    {phase === 'waiting' ? 'Tap again to see the answer' : 'Tap the rainbow for a chord'}
                  </p>
                </>
              )}
            </button>
            {phase === 'waiting' && (
              <button className="replay-link" onClick={replayCurrent}>
                🔁 Hear it again
              </button>
            )}
            {phase === 'revealed' && (
              <div className="score-row">
                <button className="score-btn score-yes" onClick={() => markScore(true)}>
                  ✓ Got it
                </button>
                <button className="score-btn score-no" onClick={() => markScore(false)}>
                  ✗ Missed it
                </button>
              </div>
            )}
            <p className="round-count">
              {finished && phase === 'revealed' ? `${SESSION_ROUNDS} done — tap to start over` : `${sessionRound} done`}
              {scoredCount > 0 ? ` · ${correctCount}/${scoredCount} correct` : ''}
            </p>
          </>
        ) : (
          <>
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
                  onClick={() => play(color)}
                >
                  <div className="pad-name">{color.name}</div>
                  <div className="pad-notes">{color.notes.join(' ')}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
