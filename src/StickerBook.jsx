import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BOOK_SIZE, STICKERS, stickerName } from './stickers.js';
import { addSticker, bookPage, pendingStickers, playerStickers } from './stickerStore.js';
import Sticker from './Sticker.jsx';

// The sticker book: a page of BOOK_SIZE boxes that fill up in order, one
// sticker per box, the rest left blank. A sticker earned but not stuck in
// yet waits here: the player picks any sticker they like from the tray,
// and it's peeled up, flown over and pressed into the next blank box, then
// does its little move. Tapping a sticker in the book makes it do its move
// again (a blink, its ears twitching...), with a squish and sparkles.
export default function StickerBook({ player, signedIn, onSignIn, placing, onPlaced }) {
  const [stickers, setStickers] = useState(() => (signedIn ? playerStickers(player.id) : []));
  const [pending, setPending] = useState(() => (signedIn ? pendingStickers(player.id) : 0));
  const [chosen, setChosen] = useState(null);
  // The sticker being stuck on: 'wait' (the book shows, then) 'fly', then 'landed'.
  const [stick, setStick] = useState(placing ?? null);
  const [phase, setPhase] = useState(placing != null ? 'wait' : null);
  const [from, setFrom] = useState(null);
  // The box last tapped; `n` counts taps so each tap starts it over.
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
  // The box the new sticker goes in (the last filled one, as it's in the
  // list already), or the next blank box while picking.
  const newBox = phase !== null ? book.onPage.length - 1 : -1;
  const nextBox = choosing ? book.onPage.length : -1;

  // Bring the spot into view, then measure where the sticker flies in from
  // (the middle of the screen, a little above the spot's row).
  useLayoutEffect(() => {
    if (phase !== 'wait') return;
    const spot = spotRefs.current[newBox];
    spot?.scrollIntoView({ block: 'center' });
  }, [phase, newBox]);
  useEffect(() => {
    if (phase !== 'wait') return undefined;
    const t = setTimeout(() => {
      const spot = spotRefs.current[newBox];
      const r = spot?.getBoundingClientRect();
      if (!r || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        setPhase('landed');
        return;
      }
      setFrom({ dx: window.innerWidth / 2 - (r.left + r.width / 2), dy: window.innerHeight * 0.38 - (r.top + r.height / 2) });
      setPhase('fly');
    }, 450);
    return () => clearTimeout(t);
  }, [phase, newBox]);

  function stickChosen() {
    addSticker(player.id, chosen, 'book');
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
            {signedIn
              ? `${book.page ? `Page ${book.page + 1} · ` : ''}${book.onPage.length} of ${BOOK_SIZE}${book.page ? ` · ${book.total} stickers in all` : ''}`
              : 'Make an account to keep every sticker you earn in your own sticker book'}
          </p>
          {choosing && (
            <p className="sbook-hint">
              🎁 {pending > 1 ? `${pending} stickers are waiting!` : 'A sticker is waiting!'} Pick any sticker you like!
            </p>
          )}
          {choosing && (
            <div className="sbook-tray">
              {STICKERS.map(([name], i) => (
                <button
                  key={name}
                  type="button"
                  className={`sbook-tray-btn${chosen === i ? ' is-chosen' : ''}`}
                  onClick={() => setChosen(i)}
                  aria-label={name}
                  aria-pressed={chosen === i}
                >
                  <Sticker index={i} size={40} />
                </button>
              ))}
            </div>
          )}
          <div className="sbook-grid">
            {Array.from({ length: BOOK_SIZE }, (_, k) => {
              const s = book.onPage[k];
              return (
                <span
                  key={k}
                  className={`sbook-spot${s ? '' : ' is-blank'}${k === nextBox ? ' is-next' : ''}`}
                  ref={(el) => (spotRefs.current[k] = el)}
                >
                  {!s ? null : k === newBox && phase === 'wait' ? null : k === newBox && phase === 'fly' ? (
                    <span
                      className="sbook-flying"
                      style={{ '--dx': `${from.dx}px`, '--dy': `${from.dy}px` }}
                      onAnimationEnd={(e) => e.target === e.currentTarget && (setPhase('landed'), onPlaced?.())}
                    >
                      <Sticker index={s.index} size={56} />
                    </span>
                  ) : k === newBox && phase === 'landed' && tapped?.k !== k ? (
                    <span className="sbook-landed">
                      <Sticker index={s.index} size={56} play />
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="sbook-sticker-btn"
                      onClick={() => setTapped((t) => ({ k, n: (t?.n ?? 0) + 1 }))}
                      aria-label={stickerName(s.index)}
                    >
                      {tapped?.k === k ? (
                        <span key={tapped.n} className="sbook-tapped">
                          <Sticker index={s.index} size={56} play />
                          <span className="sbook-sparkles" aria-hidden="true">
                            {Array.from({ length: 8 }, (_, j) => (
                              <span key={j} style={{ '--a': `${j * 45 + 20}deg` }} />
                            ))}
                          </span>
                        </span>
                      ) : (
                        <Sticker index={s.index} size={56} />
                      )}
                    </button>
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
