import { useEffect, useState } from 'react';
import { speakColorName } from './speech.js';
import { isCurrent, later, newSound } from './soundBus.js';

// Tiny Tots: free play for the littlest players. A big button for each of
// the player's colors: tap one and it bounces, notes and stars float up,
// its chord plays and then its name is said. No right or wrong, no score.
// A round is TAPS taps (so it doesn't go on forever), then "All done!".
const SPARKS = ['🎵', '⭐', '🎶', '✨', '🎵', '⭐'];
const TAPS = 20;

export default function TinyTots({ colors, engine, onComplete, stickerSlot }) {
  const [popped, setPopped] = useState(null); // { name, at }
  const [taps, setTaps] = useState(0);
  const [done, setDone] = useState(false);

  // After the last tap: its chord and name first, then the done screen.
  useEffect(() => {
    if (taps < TAPS) return undefined;
    const id = setTimeout(() => {
      setDone(true);
      onComplete?.();
    }, 2600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taps]);

  function tap(color) {
    if (taps >= TAPS) return;
    setTaps(taps + 1);
    const soundId = newSound();
    engine.playChord(color.notes);
    if (navigator.vibrate) navigator.vibrate(20);
    setPopped({ name: color.name, at: Date.now() });
    later(() => {
      if (isCurrent(soundId)) speakColorName(color.name);
    }, 1100);
  }

  if (done) {
    return (
      <div className="complete-wrap">
        <div className="complete-emoji">🎉</div>
        <h2 className="screen-title">All done!</h2>
        <p className="screen-sub">{TAPS} colors played. Great listening!</p>
        {stickerSlot}
        <button
          className="pill-btn-primary"
          onClick={() => {
            setTaps(0);
            setPopped(null);
            setDone(false);
          }}
        >
          Play again →
        </button>
      </div>
    );
  }

  return (
    <div className="tots">
      <h2 className="screen-title tots-title">Tiny Tots</h2>
      <p className="screen-sub tots-sub">Tap a color!</p>
      <div className="tots-progress" aria-label={`${taps} of ${TAPS}`}>
        <span style={{ width: `${(100 * taps) / TAPS}%` }} />
        <b>
          ⭐ {taps} / {TAPS}
        </b>
      </div>
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
