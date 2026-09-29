import { useEffect, useMemo, useState } from 'react';
import { allowRotation, keepPortrait } from './orientation.js';

// A playable two-octave keyboard (plus the top C), shown full screen once
// the phone is turned sideways. Several fingers can play at once, and the
// octave buttons slide the keyboard up or down.
const WHITE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
// White keys (by index within an octave) that have a black key to their right.
const HAS_SHARP = new Set(['C', 'D', 'F', 'G', 'A']);
const MIN_OCTAVE = 1;
const MAX_OCTAVE = 5;
const LABELS_KEY = 'pitchpop-piano-labels-v1';

function buildKeys(startOctave) {
  const whites = [];
  const blacks = [];
  for (let o = startOctave; o < startOctave + 2; o++) {
    WHITE_LETTERS.forEach((letter) => {
      const whiteIndex = whites.length;
      whites.push({ note: letter, octave: o, id: `${letter}${o}` });
      if (HAS_SHARP.has(letter)) blacks.push({ note: `${letter}#`, octave: o, id: `${letter}#${o}`, afterWhite: whiteIndex });
    });
  }
  whites.push({ note: 'C', octave: startOctave + 2, id: `C${startOctave + 2}` });
  return { whites, blacks };
}

function useIsLandscape() {
  const query = '(orientation: landscape)';
  const [landscape, setLandscape] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setLandscape(mql.matches);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return landscape;
}

function loadShowLabels() {
  try {
    return localStorage.getItem(LABELS_KEY) !== '0';
  } catch {
    return true;
  }
}

export default function Piano({ engine, onClose }) {
  const landscape = useIsLandscape();
  const [startOctave, setStartOctave] = useState(3);
  const [pressed, setPressed] = useState(() => new Set());
  const [showLabels, setShowLabels] = useState(loadShowLabels);
  const { whites, blacks } = useMemo(() => buildKeys(startOctave), [startOctave]);

  // The rest of PitchPop stays portrait; only this screen may turn.
  useEffect(() => {
    allowRotation();
    return keepPortrait;
  }, []);

  // Render every visible key's sound ahead of time so the first press of
  // each key plays instantly.
  useEffect(() => {
    [...whites, ...blacks].forEach((k) => engine.getPitchBuffer(k.note, k.octave));
  }, [whites, blacks, engine]);

  function press(key) {
    engine.playPitch(key.note, key.octave);
    setPressed((prev) => new Set(prev).add(key.id));
  }

  function release(key) {
    setPressed((prev) => {
      if (!prev.has(key.id)) return prev;
      const next = new Set(prev);
      next.delete(key.id);
      return next;
    });
  }

  function toggleLabels() {
    setShowLabels((on) => {
      try {
        localStorage.setItem(LABELS_KEY, on ? '0' : '1');
      } catch {
        /* ignore */
      }
      return !on;
    });
  }

  const keyHandlers = (key) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      press(key);
    },
    onPointerUp: () => release(key),
    onPointerCancel: () => release(key),
    onPointerLeave: () => release(key),
    onContextMenu: (e) => e.preventDefault(),
  });

  if (!landscape) {
    return (
      <div className="piano-screen piano-rotate">
        <button className="piano-done" onClick={onClose}>
          ← Back
        </button>
        <div className="piano-rotate-body">
          <div className="piano-rotate-phone" aria-hidden="true">
            📱
          </div>
          <h2 className="screen-title">Turn your phone sideways</h2>
          <p className="screen-sub">The piano appears when you hold your phone the long way.</p>
        </div>
      </div>
    );
  }

  const whiteWidth = 100 / whites.length;

  return (
    <div className="piano-screen">
      <div className="piano-toolbar">
        <button className="piano-done" onClick={onClose}>
          ← Done
        </button>
        <div className="piano-octave">
          <button
            className="piano-tool-btn"
            onClick={() => setStartOctave((o) => Math.max(MIN_OCTAVE, o - 1))}
            disabled={startOctave <= MIN_OCTAVE}
            aria-label="Lower octave"
          >
            ◀
          </button>
          <span className="piano-range">
            C{startOctave} – C{startOctave + 2}
          </span>
          <button
            className="piano-tool-btn"
            onClick={() => setStartOctave((o) => Math.min(MAX_OCTAVE, o + 1))}
            disabled={startOctave >= MAX_OCTAVE}
            aria-label="Higher octave"
          >
            ▶
          </button>
        </div>
        <button className="piano-tool-btn piano-labels-btn" onClick={toggleLabels} aria-pressed={showLabels}>
          {showLabels ? 'Hide names' : 'Show names'}
        </button>
      </div>

      <div className="piano-keys" role="group" aria-label="Piano keyboard">
        {whites.map((key) => (
          <button
            key={key.id}
            className={`piano-white${pressed.has(key.id) ? ' piano-key-down' : ''}`}
            aria-label={`${key.note}${key.octave}`}
            {...keyHandlers(key)}
          >
            {showLabels && (
              <span className="piano-label">
                {key.note}
                {key.note === 'C' && <sub>{key.octave}</sub>}
              </span>
            )}
          </button>
        ))}
        {blacks.map((key) => (
          <button
            key={key.id}
            className={`piano-black${pressed.has(key.id) ? ' piano-key-down' : ''}`}
            style={{ left: `${(key.afterWhite + 1) * whiteWidth}%`, width: `${whiteWidth * 0.6}%` }}
            aria-label={`${key.note[0]} sharp ${key.octave}`}
            {...keyHandlers(key)}
          />
        ))}
      </div>
    </div>
  );
}
