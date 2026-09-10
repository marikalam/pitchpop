import { useEffect, useRef, useState } from 'react';
import { PianoEngine } from './piano.js';

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

export default function App() {
  const engineRef = useRef(null);
  const [justPlayed, setJustPlayed] = useState(null);

  if (!engineRef.current) {
    engineRef.current = new PianoEngine();
  }

  useEffect(() => {
    if (!justPlayed) return;
    const id = setTimeout(() => setJustPlayed(null), 450);
    return () => clearTimeout(id);
  }, [justPlayed]);

  function play(color) {
    engineRef.current.playChord(color.notes);
    setJustPlayed(color.name);
    if (navigator.vibrate) navigator.vibrate(25);
  }

  return (
    <div className="page">
      <div className="app">
        <header>
          <div>
            <h1>
              Pitch<span className="pop">Pop</span>
            </h1>
            <p className="subtitle">Tap a pad to play its chord</p>
          </div>
        </header>

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
