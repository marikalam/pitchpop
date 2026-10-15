import { useEffect, useState } from 'react';
import { loadRoundHistory } from './roundHistory.js';
import { loadPracticeLog } from './practiceLog.js';
import { bonusGivenToday, giveBonusIfDone, todayPlan } from './todayPlan.js';

// The home page's "Today's practice" list (todayPlan.js). Each item opens
// its activity; a signed-in player's items check off as they're done.
export default function TodayPlan({ playerId, signedIn, colorNames, tinyTots, lockedIds = [], onOpen, onSignIn }) {
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh((n) => n + 1);
    const events = ['pitchpop-today-changed', 'pitchpop-history-changed', 'pitchpop-stickers-changed'];
    events.forEach((e) => window.addEventListener(e, update));
    return () => events.forEach((e) => window.removeEventListener(e, update));
  }, []);

  const items = todayPlan({
    playerId,
    rounds: loadRoundHistory()[playerId] || [],
    practices: loadPracticeLog()[playerId] || [],
    colorNames,
    tinyTots,
  }).map((item) => (signedIn ? item : { ...item, done: false }));
  const doneCount = items.filter((i) => i.done).length;
  const allDone = signedIn && doneCount === items.length;

  useEffect(() => {
    if (signedIn) giveBonusIfDone(playerId, items);
  });

  return (
    <section className={`today${allDone ? ' today-all-done' : ''}`} aria-labelledby="today-title">
      <div className="today-head">
        <h3 className="today-title" id="today-title">
          <span aria-hidden="true">📋</span> Today's practice
        </h3>
        {signedIn && (
          <span className="today-count">
            {doneCount} / {items.length}
          </span>
        )}
      </div>
      <ul className="today-list">
        {items.map((item) => (
          <li key={item.id}>
            <button className={`today-item today-item-${item.id}${item.done ? ' today-item-done' : ''}`} onClick={() => onOpen(item.id)}>
              <span className="today-item-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="today-item-text">
                <span className="today-item-title">{item.title}</span>
                <span className="today-item-sub">{item.sub}</span>
              </span>
              {item.done ? (
                <span className="today-check" aria-label="Done">
                  ✓
                </span>
              ) : lockedIds.includes(item.id) ? (
                <span className="today-lock" aria-label="PitchPop Family">
                  ⭐
                </span>
              ) : (
                <span className="today-arrow" aria-hidden="true">
                  ›
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {signedIn ? (
        <>
          <div className="today-bar" aria-hidden="true">
            <span style={{ width: `${(100 * doneCount) / items.length}%` }} />
          </div>
          <p className="today-note">
            {allDone || bonusGivenToday(playerId)
              ? '🎉 All done today! You earned a bonus sticker ⭐'
              : `${doneCount} of ${items.length} done · finish all ${items.length} for a bonus sticker ⭐`}
          </p>
        </>
      ) : (
        <p className="today-note">
          <button className="today-signin" onClick={onSignIn}>
            Sign in
          </button>{' '}
          to check these off and earn a bonus sticker ⭐
        </p>
      )}
    </section>
  );
}
