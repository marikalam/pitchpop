import { useState } from 'react';
import { speakColorName } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';

// Tiny Tots: free play for the littlest players. A big button for each of
// the player's colors: tap one and it bounces, notes and stars float up,
// its chord plays and then its name is said. No right or wrong, no score.
const SPARKS = ['🎵', '⭐', '🎶', '✨', '🎵', '⭐'];

export default function TinyTots({ colors, engine }) {
  const [popped, setPopped] = useState(null); // { name, at }

  function tap(color) {
    const soundId = newSound();
    engine.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(20);
    setPopped({ name: color.name, at: Date.now() });
    later(() => {
      if (isCurrent(soundId)) speakColorName(color.name);
    }, 1100);
  }

  return (
    <div className="tots">
      <h2 className="screen-title tots-title">Tiny Tots</h2>
      <p className="screen-sub tots-sub">Tap a color!</p>
      <div className={`tots-grid tots-grid-${Math.min(colors.length, 3)}`}>
        {colors.map((color) => {
          const now = popped?.name === color.name;
          return (
            <button
              key={now ? `${color.name}-${popped.at}` : color.name}
              className={`tots-tile${now ? ' tots-tile-pop' : ''}`}
              style={{ background: color.hex, color: color.text }}
              onClick={() => tap(color)}
              aria-label={color.name}
            >
              <span className="tots-name">{color.name}</span>
              {now && (
                <span className="tots-sparks" aria-hidden="true">
                  {SPARKS.map((s, i) => (
                    <span key={i} className="tots-spark" style={{ '--i': i }}>
                      {s}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
