import { useState } from 'react';
import { newSound } from './soundBus.js';
import { speakColorName } from './speech.js';
import Icon from './Icon.jsx';

// A new color for this player (a grown-up added it in Players & colors),
// introduced the Eguchi way: the chord comes first. The child taps to hear
// the new chord, and only then does its color appear - "This chord is
// Beige!" - with its notes. Then on to play.
const MET_KEY = 'pitchpop-colors-met-v1';

function loadMet() {
  try {
    return JSON.parse(localStorage.getItem(MET_KEY)) || {};
  } catch {
    return {};
  }
}

function saveMet(playerId, names) {
  try {
    localStorage.setItem(MET_KEY, JSON.stringify({ ...loadMet(), [playerId]: names }));
  } catch {
    /* ignore */
  }
}

// The first of `colorNames` this player hasn't met yet, or null. The first
// time a player is seen, all their colors count as met (nothing to show).
export function newColorFor(playerId, colorNames) {
  const met = loadMet()[playerId];
  if (!met) {
    saveMet(playerId, colorNames);
    return null;
  }
  return colorNames.find((name) => !met.includes(name)) || null;
}

export function markColorMet(playerId, name) {
  const met = loadMet()[playerId] || [];
  if (!met.includes(name)) saveMet(playerId, [...met, name]);
}

const CONFETTI = ['#ff6b6b', '#ffd43b', '#4dabf7', '#51cf66', '#9775fa', '#f783ac', '#ffa94d'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default function NewColor({ playerName, color, engine, noteLabel, onDone }) {
  const [heard, setHeard] = useState(false);

  function hear() {
    newSound();
    engine.playChord(color.notes);
    if (!heard) {
      setHeard(true);
      // The name once the chord has rung, never on top of it.
      setTimeout(() => speakColorName(color.name), 1800);
    }
  }

  return (
    <div className={`newcolor${heard ? ' newcolor-heard' : ''}`} role="dialog" aria-labelledby="newcolor-title">
      {heard && (
        <div className="newcolor-confetti" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                background: CONFETTI[i % CONFETTI.length],
                animationDelay: `${(i % 10) * 0.12}s`,
                borderRadius: i % 3 ? '3px' : '50%',
              }}
            />
          ))}
        </div>
      )}
      <div className="newcolor-card">
        <p className="newcolor-kicker">{heard ? 'New color!' : `A new chord for ${playerName}!`}</p>
        {heard ? (
          <>
            <button
              className="newcolor-flag"
              style={{ background: color.hex, color: color.text }}
              onClick={hear}
              aria-label={`Hear ${color.name} again`}
            >
              {cap(color.name)}
            </button>
            <h2 className="newcolor-title" id="newcolor-title">
              This chord is {cap(color.name)}!
            </h2>
            <div className="newcolor-notes">
              {color.notes.map((n) => (
                <span key={n}>{noteLabel(n)}</span>
              ))}
            </div>
            <div className="newcolor-actions">
              <button className="pill-btn-secondary" onClick={hear}>
                <Icon name="speaker" /> Hear it again
              </button>
              <button className="pill-btn-primary" onClick={onDone}>
                Let's play →
              </button>
            </div>
          </>
        ) : (
          <>
            <button className="newcolor-listen" onClick={hear} aria-label="Hear the new chord">
              <Icon name="speaker" size="64px" />
            </button>
            <h2 className="newcolor-title" id="newcolor-title">
              Listen…
            </h2>
            <p className="newcolor-sub">Tap to hear the new chord. Then find out its color!</p>
          </>
        )}
      </div>
    </div>
  );
}
