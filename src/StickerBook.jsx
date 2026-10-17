import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BOOK_SIZE, STICKERS } from './stickers.js';
import { addSticker, bookPage, pendingStickers, playerStickers } from './stickerStore.js';
import Sticker from './Sticker.jsx';
import { playStickerPick, playStickerStick } from './piano.js';

// The sticker book: every sticker has its own spot on the page. The ones
// collected are there in color; the rest wait as faded shadows. A new
// sticker is peeled up, flown over and pressed onto its spot, then does
// its little move. (Stickers earned but not picked yet wait here: tapping
// a shadow picks one.)
export default function StickerBook({ player, signedIn, onSignIn, placing, onPlaced }) {
  const [stickers, setStickers] = useState(() => (signedIn ? playerStickers(player.id) : []));
  const [pending, setPending] = useState(() => (signedIn ? pendingStickers(player.id) : 0));
  const [chosen, setChosen] = useState(null);
  // The sticker being stuck on: 'wait' (the book shows, then) 'fly', then 'landed'.
  const [stick, setStick] = useState(placing ?? null);
  const [phase, setPhase] = useState(placing != null ? 'wait' : null);
  const [from, setFrom] = useState(null);
  // The sticker last tapped (`n` restarts its animation on every tap).
  const [tapped, setTapped] = useState(null);
  const spotRefs = useRef({});

  // Stickers stuck in on the family's other phones, or picked elsewhere.
  useEffect(() => {
    if (!signedIn) return undefined;
    const reload = () => {
      setStickers(playerStickers(player.id));
      setPending(pendingStickers(player.id));
    };
    window.addEventListener('pitchpop-stickers-changed', reload);
    window.addEventListener('pitchpop-history-synced', reload);
    return () => {
      window.removeEventListener('pitchpop-stickers-changed', reload);
      window.removeEventListener('pitchpop-history-synced', reload);
    };
  }, [signedIn, player.id]);

  const choosing = signedIn && pending > 0 && (phase === null || phase === 'landed');
  const book = bookPage(stickers, choosing);
  const have = new Set(book.onPage.map((s) => s.index));

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
    addSticker(player.id, chosen, 'book');
    setStick(chosen);
    setChosen(null);
    setPhase('wait');
  }

  return (
    <div className={`sbook${choosing ? ' sbook-choosing' : ''}`}>
      <div className="sbook-cover">
        <div className="sbook-rings" aria-hidden="true">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="sbook-page">
          <h2 className="sbook-title">{signedIn ? `${player.name}'s sticker book` : 'Sticker book'}</h2>
          <p className="sbook-count">
            {signedIn
              ? `${book.page ? `Page ${book.page + 1} · ` : ''}${book.onPage.length} of ${BOOK_SIZE}${book.page ? ` · ${book.total} stickers in all` : ''}`
              : 'Make an account to keep every sticker you earn in your own sticker book'}
          </p>
          {choosing && (
            <p className="sbook-hint">
              🎁 {pending > 1 ? `${pending} stickers are waiting!` : 'A sticker is waiting!'} Tap the one you want.
            </p>
          )}
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
                      onAnimationEnd={(e) => {
                        if (e.target !== e.currentTarget) return;
                        playStickerStick();
                        setPhase('landed');
                        onPlaced?.();
                      }}
                    >
                      <Sticker index={i} size={50} />
                    </span>
                  ) : owned || (isNew && phase === 'landed') ? (
                    // Tap a sticker (the one just stuck in too): it jumps
                    // and does its move.
                    <button
                      type="button"
                      className="sbook-tap"
                      onClick={() => {
                        playStickerPick();
                        setTapped((t) => ({ index: i, n: (t?.n || 0) + 1 }));
                      }}
                      aria-label={name}
                    >
                      {tapped?.index === i ? (
                        <span key={tapped.n} className="sbook-tapped">
                          <Sticker index={i} size={50} play />
                        </span>
                      ) : isNew ? (
                        <span className="sbook-landed">
                          <Sticker index={i} size={50} play />
                        </span>
                      ) : (
                        <Sticker index={i} size={50} />
                      )}
                    </button>
                  ) : choosing ? (
                    <button
                      type="button"
                      className={`sbook-shadow sbook-shadow-btn${chosen === i ? ' is-chosen' : ''}`}
                      onClick={() => {
                        playStickerPick();
                        setChosen(i);
                      }}
                      aria-label={name}
                      aria-pressed={chosen === i}
                    >
                      <Sticker index={i} size={50} />
                    </button>
                  ) : (
                    <span className="sbook-shadow" title={name}>
                      <Sticker index={i} size={50} />
                    </span>
                  )}
                </span>
              );
            })}
          </div>
          {phase === 'landed' && (
            <p className="sbook-done">
              ⭐ In your sticker book! ⭐
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
            {chosen === null ? 'Tap a sticker to pick it' : 'Stick it in! ⭐'}
          </button>
        </div>
      )}
    </div>
  );
}
