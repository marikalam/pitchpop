import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BOOK_SIZE, STICKERS, loadStickerPicks, saveStickerPick, stickerBook, stickerName } from './stickers.js';
import Sticker from './Sticker.jsx';
import { dayKey } from './streak.js';

// The sticker book: every sticker has its own spot on the page. The ones
// collected are there in color; the rest wait as faded shadows. A new
// sticker is peeled up, flown over and pressed onto its spot, then does
// its little move. (If today's sticker hasn't been chosen yet, tapping a
// shadow picks it.)
export default function StickerBook({ player, days, signedIn, onSignIn, placing, onPlaced }) {
  const today = dayKey();
  const [picks, setPicks] = useState(() => loadStickerPicks()[player.id] || {});
  const [chosen, setChosen] = useState(null);
  // The sticker being stuck on: 'wait' (the book shows, then) 'fly', then 'landed'.
  const [stick, setStick] = useState(placing ?? null);
  const [phase, setPhase] = useState(placing != null ? 'wait' : null);
  const [from, setFrom] = useState(null);
  const spotRefs = useRef({});

  const book = stickerBook(signedIn ? days : [], picks, today);
  const have = new Set(book.slots.map((s) => s.index));
  const choosing = signedIn && book.waiting && phase === null;

  // Bring the spot into view, then measure where the sticker flies in from
  // (the middle of the screen, a little above the spot's row).
  useLayoutEffect(() => {
    if (phase !== 'wait') return;
    const spot = spotRefs.current[stick];
    spot?.scrollIntoView({ block: 'center' });
  }, [phase, stick]);
  useEffect(() => {
    if (phase !== 'wait') return undefined;
    const t = setTimeout(() => {
      const spot = spotRefs.current[stick];
      const r = spot?.getBoundingClientRect();
      if (!r || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setPhase('landed');
        return;
      }
      setFrom({ dx: window.innerWidth / 2 - (r.left + r.width / 2), dy: window.innerHeight * 0.38 - (r.top + r.height / 2) });
      setPhase('fly');
    }, 450);
    return () => clearTimeout(t);
  }, [phase, stick]);

  function stickChosen() {
    saveStickerPick(player.id, today, chosen);
    setPicks(loadStickerPicks()[player.id] || {});
    setStick(chosen);
    setChosen(null);
    setPhase('wait');
  }

  return (
    <div className="sbook">
      <div className="sbook-cover">
        <div className="sbook-rings" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="sbook-page">
          <h2 className="sbook-title">{signedIn ? `${player.name}'s sticker book` : 'Sticker book'}</h2>
          <p className="sbook-count">
            {signedIn ? (
              <>
                {have.size - (have.has(null) ? 1 : 0)} of {BOOK_SIZE} stickers
                {book.page ? ` · page ${book.page + 1}` : ''}
              </>
            ) : (
              'Sign in to collect a sticker for every day of practice'
            )}
          </p>
          {choosing && <p className="sbook-hint">🎁 Today's sticker is waiting! Tap the one you want.</p>}
          <div className="sbook-grid">
            {STICKERS.map(([name], i) => {
              const isNew = i === stick && phase !== null;
              const owned = have.has(i) && !isNew;
              return (
                <span key={name} className="sbook-spot" ref={(el) => (spotRefs.current[i] = el)}>
                  {isNew && phase === 'fly' ? (
                    <span
                      className="sbook-flying"
                      style={{ '--dx': `${from.dx}px`, '--dy': `${from.dy}px` }}
                      onAnimationEnd={(e) => e.target === e.currentTarget && (setPhase('landed'), onPlaced?.())}
                    >
                      <Sticker index={i} size={56} />
                    </span>
                  ) : isNew && phase === 'landed' ? (
                    <span className="sbook-landed">
                      <Sticker index={i} size={56} play />
                    </span>
                  ) : owned ? (
                    <Sticker index={i} size={56} />
                  ) : choosing ? (
                    <button
                      type="button"
                      className={`sbook-shadow sbook-shadow-btn${chosen === i ? ' is-chosen' : ''}`}
                      onClick={() => setChosen(i)}
                      aria-label={name}
                      aria-pressed={chosen === i}
                    >
                      <Sticker index={i} size={56} />
                    </button>
                  ) : (
                    <span className="sbook-shadow" title={name}>
                      <Sticker index={i} size={56} />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {phase === 'landed' && (
            <p className="sbook-done">
              ⭐ {stickerName(stick)} is in your sticker book! ⭐
            </p>
          )}
          {!signedIn && (
            <button className="pill-btn-secondary sbook-signin" onClick={onSignIn}>
              Sign in or create account
            </button>
          )}
        </div>
      </div>
      {choosing && (
        <div className="sbook-stickbar">
          <button className="pill-btn-primary" disabled={chosen === null} onClick={stickChosen}>
            {chosen === null ? 'Tap a sticker to pick it' : `Stick ${stickerName(chosen)} in! ⭐`}
          </button>
        </div>
      )}
    </div>
  );
}
