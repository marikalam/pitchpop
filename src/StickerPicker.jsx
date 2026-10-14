import { useState } from 'react';
import { BOOK_SIZE, loadStickerPicks, saveStickerPick, stickerBook, stickerName } from './stickers.js';
import Sticker from './Sticker.jsx';
import { dayKey } from './streak.js';

// Today's sticker: the player picks one, then sticks it in the book (only
// then does it move). Once today's sticker is in, it just says which one.
export default function StickerPicker({ playerId, days, onPlaced }) {
  const today = dayKey();
  const [placed, setPlaced] = useState(null);
  const [chosen, setChosen] = useState(null);
  const picks = loadStickerPicks()[playerId] || {};
  const book = stickerBook(days, picks, today);
  if (!days.includes(today)) return null;

  if (placed !== null) {
    const number = book.slots.length;
    return (
      <div className="sticker-won">
        <span className="sticker-won-emoji sticker-place" aria-hidden="true">
          <Sticker index={placed} size={72} play />
        </span>
        <span>
          <span className="workon-title">{stickerName(placed)} is in your sticker book!</span>
          <br />
          <span className="workon-text">
            {number} of {BOOK_SIZE}
            {number === BOOK_SIZE ? ' · the page is full! 🎉' : ''}
          </span>
        </span>
      </div>
    );
  }

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
    setPlaced(chosen);
    onPlaced?.(chosen);
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
