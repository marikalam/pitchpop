import { useState } from 'react';
import { weekProgress } from './progress.js';
import { BOOK_SIZE, loadStickerPicks, stickerBook, stickerName } from './stickers.js';
import Sticker from './Sticker.jsx';
import StickerPicker from './StickerPicker.jsx';
import { dayKey } from './streak.js';
import { loadReminder, remindersAvailable, setReminder } from './reminders.js';

// The parent progress page: the player's last 7 days (rounds, streak,
// first-try score, each color), a tip (the colors they mix up, or that
// they're ready for a new color), the sticker book, how far the rainbow
// has grown, and the daily reminder. Records are for signed-in families.
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function ReminderCard({ reminderPlayers }) {
  const [reminder, setReminderState] = useState(loadReminder);
  const [busy, setBusy] = useState(false);
  if (!remindersAvailable()) {
    return (
      <div className="prog-card prog-row">
        <span className="prog-big-emoji">🔔</span>
        <span className="muted-text">Daily practice reminders are in the PitchPop iPhone app.</span>
      </div>
    );
  }
  async function update(next) {
    setBusy(true);
    setReminderState(await setReminder(next, reminderPlayers()));
    setBusy(false);
  }
  return (
    <div className="prog-card">
      <label className="ps-switch-row prog-reminder">
        <span className="ps-switch-text">
          <b>🔔 Daily reminder</b>
          <span>A nudge at practice time, and how the week went on Sundays</span>
        </span>
        <input
          type="checkbox"
          className="ps-switch"
          checked={reminder.on}
          disabled={busy}
          onChange={(e) => update({ ...reminder, on: e.target.checked })}
        />
      </label>
      {reminder.on && (
        <label className="prog-time">
          Remind at
          <input type="time" value={reminder.time} onChange={(e) => e.target.value && update({ ...reminder, time: e.target.value })} />
        </label>
      )}
    </div>
  );
}

export default function Progress({ player, rounds, days, colors, signedIn, onSignIn, reminderPlayers }) {
  // The sticker just stuck in the book (it plays its move once, there).
  const [fresh, setFresh] = useState(null);
  if (!signedIn) {
    return (
      <div className="prog">
        <h2 className="screen-title">{player.name}'s progress</h2>
        <div className="guest-note">
          <p>Sign in to see the week's practice, how each color is going, and to collect stickers.</p>
          <button className="pill-btn-secondary" onClick={onSignIn}>
            Sign in or create account
          </button>
        </div>
      </div>
    );
  }
  const week = weekProgress(rounds, days, player.colors);
  const max = Math.max(1, ...week.perDay.map((d) => d.rounds));
  const dayLetter = (key) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'narrow' });
  };
  const hex = (name) => colors.find((c) => c.name === name)?.hex;
  const book = stickerBook(days, loadStickerPicks()[player.id], dayKey());
  const grown = Math.min(1, player.colors.length / colors.length);

  return (
    <div className="prog">
      <h2 className="screen-title">{player.name}'s week</h2>

      <div className="prog-card prog-tiles">
        <div>
          <b>{week.roundsThisWeek}</b>
          <span>{week.roundsThisWeek === 1 ? 'round' : 'rounds'}</span>
        </div>
        <div>
          <b>🔥 {week.streak}</b>
          <span>days in a row</span>
        </div>
        <div>
          <b>{week.pctRight === null ? '–' : `${week.pctRight}%`}</b>
          <span>right</span>
        </div>
      </div>

      <div className="prog-card">
        <h3 className="prog-title">This week</h3>
        <div className="prog-bars">
          {week.perDay.map((d) => (
            <div key={d.key} className="prog-bar-col">
              <span className="prog-bar-track">
                <span className="prog-bar" style={{ height: `${d.rounds ? Math.max(10, (100 * d.rounds) / max) : 0}%` }} />
              </span>
              <span className="prog-bar-label">{dayLetter(d.key)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="prog-card">
        <h3 className="prog-title">Colors</h3>
        {week.colors.map((c) => (
          <div key={c.name} className="prog-color">
            <span className="prog-dot" style={{ background: hex(c.name) }} />
            <span className="prog-color-name">{cap(c.name)}</span>
            <span className="prog-color-track">
              <span style={{ width: `${c.pct ?? 0}%`, background: hex(c.name) }} />
            </span>
            <span className="prog-color-pct">{c.pct === null ? '–' : `${c.pct}%`}</span>
          </div>
        ))}
      </div>

      {week.worst && (
        <div className="prog-card prog-row prog-tip">
          <span className="prog-big-emoji">🎯</span>
          <span>
            <b>
              Mixes up {cap(week.worst.name)} and {cap(week.worst.partner)}
            </b>
            <span className="muted-text">Smart practice is giving more of both.</span>
          </span>
        </div>
      )}
      {week.ready && (
        <div className="prog-card prog-row">
          <span className="prog-big-emoji">🏅</span>
          <span>
            <b>Ready for a new color!</b>
            <span className="muted-text">90% or more on every color, two rounds in a row. Add one in Players &amp; colors.</span>
          </span>
        </div>
      )}

      <div className="prog-card">
        <h3 className="prog-title">
          Sticker book{' '}
          <span className="muted-text">
            {book.slots.length} of {BOOK_SIZE}
            {book.page ? ` · page ${book.page + 1}` : ''}
          </span>
        </h3>
        {book.waiting && <StickerPicker playerId={player.id} days={days} onPlaced={setFresh} />}
        <div className="prog-stickers">
          {Array.from({ length: BOOK_SIZE }, (_, i) => {
            const slot = book.slots[i];
            return slot && slot.index !== null ? (
              <span key={i} className="prog-sticker" title={stickerName(slot.index)}>
                {fresh === slot.index && slot.day === dayKey() ? (
                  <span className="sticker-place">
                    <Sticker index={slot.index} size={52} play />
                  </span>
                ) : (
                  <Sticker index={slot.index} size={52} />
                )}
              </span>
            ) : (
              <span key={i} className={`prog-sticker prog-sticker-empty${slot ? ' prog-sticker-waiting' : ''}`}>
                {slot ? '🎁' : '?'}
              </span>
            );
          })}
        </div>
        <p className="muted-text prog-note">A new sticker for every day of practice.</p>
      </div>

      <div className="prog-card prog-row">
        <span className="prog-big-emoji">🌈</span>
        <span className="prog-grow">
          <b>
            Rainbow: {player.colors.length} of {colors.length} colors
          </b>
          <span className="prog-color-track">
            <span style={{ width: `${grown * 100}%`, background: 'linear-gradient(90deg,#D6473C,#E98A2E,#E4C13B,#4C8858,#3B6FB0,#7C4A9E)' }} />
          </span>
        </span>
      </div>

      <ReminderCard reminderPlayers={reminderPlayers} />
    </div>
  );
}
