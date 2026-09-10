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

const TEST_ROUNDS = 20;

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
  const [testQueue, setTestQueue] = useState(() => buildQueue(PROFILE_NAMES.maddie, TEST_ROUNDS));
  const [testRound, setTestRound] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [justPlayed, setJustPlayed] = useState(null);
  const [celebrate, setCelebrate] = useState(null);

  if (!engineRef.current) {
    engineRef.current = new PianoEngine();
  }

  useEffect(() => {
    if (mode !== 'test') return;
    setTestQueue(buildQueue(PROFILE_NAMES[profile], TEST_ROUNDS));
    setTestRound(0);
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
    if (mode === 'practice') {
      setJustPlayed(color.name);
      setCelebrate(color.name);
    }
  }

  function playNext() {
    if (testRound >= TEST_ROUNDS) return;
    const color = COLORS.find((c) => c.name === testQueue[testRound]);
    engineRef.current.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(25);
    setTestRound((r) => r + 1);
  }

  function restartTest() {
    setTestQueue(buildQueue(PROFILE_NAMES[profile], TEST_ROUNDS));
    setTestRound(0);
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
              {mode === 'test'
                ? `Testing ${profile === 'maddie' ? 'Maddie' : 'Marcus'} — no peeking!`
                : 'Tap a pad to play its chord'}
            </p>
          </div>
          <div className="settings-wrap">
            <button
              className="settings-dot"
              aria-label="Settings"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              &#9881;
            </button>
            {settingsOpen && (
              <div className="settings-panel">
                <div className="settings-label">Mode</div>
                <div className="settings-row">
                  <button
                    className={`seg${mode === 'practice' ? ' seg-active' : ''}`}
                    onClick={() => setMode('practice')}
                  >
                    Practice
                  </button>
                  <button
                    className={`seg${mode === 'test' ? ' seg-active' : ''}`}
                    onClick={() => setMode('test')}
                  >
                    Test
                  </button>
                </div>
                {mode === 'test' && (
                  <>
                    <div className="settings-label">Who's testing?</div>
                    <div className="settings-row">
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
                    <div className="settings-label">Random test</div>
                    <div className="round-count">
                      {testRound < TEST_ROUNDS ? `${testRound} / ${TEST_ROUNDS} played` : 'All 20 done!'}
                    </div>
                    <button className="next-btn" onClick={playNext} disabled={testRound >= TEST_ROUNDS}>
                      Next chord ▸
                    </button>
                    <button className="restart-link" onClick={restartTest}>
                      Start over
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

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
      </div>
    </div>
  );
}
