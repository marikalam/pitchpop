import { useEffect, useState } from 'react';
import { STICKERS, stickerName } from './stickers.js';
import { addSticker, pendingStickers, playerStickers } from './stickerStore.js';
import Sticker from './Sticker.jsx';

const ALL = STICKERS.map((_, i) => i);

// The sticker earned by finishing a Pitch Practice round, a NoteSpeller
// round or a practice. The player picks one; for a signed-in family,
// sticking it in opens the sticker book where it goes on (onStick). A
// guest gets their sticker too, but without an account there's no book
// to keep it in, so it says so.
export default function StickerPicker({ playerId, signedIn, from, onStick, onSignIn }) {
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
      <div className="sticker-won sticker-guest">
        <span className="sticker-won-emoji sticker-place" aria-hidden="true">
          <Sticker index={guestSticker} size={72} play />
        </span>
        <span>
          <span className="workon-title">{stickerName(guestSticker)}! ⭐</span>
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
    );
  }

  if (signedIn && pending === 0) {
    const last = playerStickers(playerId).at(-1);
    return last ? (
      <p className="sticker-today">
        <Sticker index={last.index} size={28} /> {stickerName(last.index)} is in your sticker book!
      </p>
    ) : null;
  }

  function stick() {
    if (!signedIn) {
      setGuestSticker(chosen);
      return;
    }
    addSticker(playerId, chosen, from);
    onStick(chosen);
  }

  return (
    <div className="sticker-pick">
      <p className="workon-title sticker-pick-title">
        {pending > 1 ? `You have ${pending} stickers! Pick one` : 'You earned a sticker! Pick one'}
      </p>
      <div className="sticker-pick-grid">
        {ALL.map((i) => (
          <button
            key={i}
            type="button"
            className={`sticker-pick-btn${chosen === i ? ' is-chosen' : ''}`}
            onClick={() => setChosen(i)}
            aria-label={stickerName(i)}
            aria-pressed={chosen === i}
          >
            <Sticker index={i} size={40} />
          </button>
        ))}
      </div>
      <button className="pill-btn-primary sticker-pick-go" disabled={chosen === null} onClick={stick}>
        {chosen === null
          ? 'Tap a sticker'
          : signedIn
            ? `Stick ${stickerName(chosen)} in my book ⭐`
            : `Pick ${stickerName(chosen)} ⭐`}
      </button>
    </div>
  );
}
