import { useEffect, useState } from 'react';
import { STICKERS, stickerName } from './stickers.js';
import { addSticker, bookPage, pendingStickers, playerStickers } from './stickerStore.js';
import Sticker from './Sticker.jsx';
import { playStickerPick, playStickerStick } from './piano.js';

const ALL = STICKERS.map((_, i) => i);

// The sticker earned by finishing a Pitch Practice round, a NoteSpeller
// round or a practice. One tap on a sticker sticks it in: for a signed-in
// family that opens the sticker book where it goes on (onStick). A guest
// gets their sticker too, but without an account there's no book to keep
// it in, so it says so. What comes next (`then`, e.g. Play again) only
// shows once no sticker is waiting, so a small child can't skip it by
// tapping the wrong big button.
export default function StickerPicker({ playerId, signedIn, from, onStick, onSignIn, then = null }) {
  const [chosen, setChosen] = useState(null);
  const [pending, setPending] = useState(() => pendingStickers(playerId));
  const [guestSticker, setGuestSticker] = useState(null);

  useEffect(() => {
    const reload = () => setPending(pendingStickers(playerId));
    window.addEventListener('pitchpop-stickers-changed', reload);
    return () => window.removeEventListener('pitchpop-stickers-changed', reload);
  }, [playerId]);

  if (!signedIn && guestSticker !== null) {
    return (
      <>
        <div className="sticker-won sticker-guest">
          <span className="sticker-won-emoji sticker-place" aria-hidden="true">
            <Sticker index={guestSticker} size={72} play />
          </span>
          <span>
            <span className="workon-title">Your sticker! ⭐</span>
            <br />
            <span className="workon-text">
              Stickers can't be kept in a sticker book without an account. Make one to save every sticker!
            </span>
            <br />
            <button className="sticker-guest-signin" onClick={onSignIn}>
              Sign in or create account
            </button>
          </span>
        </div>
        {then}
      </>
    );
  }

  if (signedIn && pending === 0) {
    const last = playerStickers(playerId).at(-1);
    return (
      <>
        {last && (
          <p className="sticker-today">
            <Sticker index={last.index} size={28} /> It's in your sticker book!
          </p>
        )}
        {then}
      </>
    );
  }

  const free = signedIn ? bookPage(playerStickers(playerId), true).free : ALL;

  function stick(index) {
    if (!signedIn) {
      playStickerStick();
      setGuestSticker(index);
      return;
    }
    addSticker(playerId, index, from);
    onStick(index);
  }

  return (
    <div className="sticker-pick">
      <p className="workon-title sticker-pick-title">
        {pending > 1 ? `You have ${pending} stickers! Tap one` : 'You earned a sticker! Tap one'}
      </p>
      <div className="sticker-pick-grid">
        {free.map((i) => (
          <button
            key={i}
            type="button"
            className={`sticker-pick-btn${chosen === i ? ' is-chosen' : ''}`}
            onClick={() => {
              if (chosen !== null) return;
              playStickerPick();
              setChosen(i);
              // A moment to see it picked, then it goes in.
              setTimeout(() => {
                stick(i);
                setChosen(null);
              }, 400);
            }}
            aria-label={stickerName(i)}
            aria-pressed={chosen === i}
          >
            <Sticker index={i} size={40} />
          </button>
        ))}
      </div>
    </div>
  );
}
