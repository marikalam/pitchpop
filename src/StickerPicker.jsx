import { useState } from 'react';
import { loadStickerPicks, saveStickerPick, stickerBook, stickerName } from './stickers.js';
import Sticker from './Sticker.jsx';
import { dayKey } from './streak.js';

// Today's sticker on the "All done!" screen: the player picks one, then
// taps to stick it in - which opens the sticker book, where it goes on.
// Once today's sticker is in, it just says which one.
export default function StickerPicker({ playerId, days, onStick }) {
  const today = dayKey();
  const [chosen, setChosen] = useState(null);
  if (!days.includes(today)) return null;
  const book = stickerBook(days, loadStickerPicks()[playerId], today);

  if (!book.waiting) {
    const mine = book.slots.find((s) => s.day === today);
    return mine ? (
      <p className="sticker-today">
        <Sticker index={mine.index} size={28} /> Today's sticker: {stickerName(mine.index)}. Come back tomorrow for the next one!
      </p>
    ) : null;
  }

  function stick() {
    saveStickerPick(playerId, today, chosen);
    onStick(chosen);
  }

  return (
    <div className="sticker-pick">
      <p className="workon-title sticker-pick-title">Pick today's sticker!</p>
      <div className="sticker-pick-grid">
        {book.free.map((i) => (
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
        {chosen === null ? 'Tap a sticker' : `Stick ${stickerName(chosen)} in my book ⭐`}
      </button>
    </div>
  );
}
