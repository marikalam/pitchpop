import { useEffect, useState } from 'react';
import { loadRoundHistory } from './roundHistory.js';
import { loadPracticeLog } from './practiceLog.js';
import { bonusGivenToday, giveBonusIfDone, todayPlan } from './todayPlan.js';
import Icon from './Icon.jsx';

// Short names for the chips, and for the big Next button.
const SHORT = { 'color-test': 'Pitch', tots: 'Tiny Tots', notespeller: 'Notes', theory: 'Theory', practice: 'Piano' };
const NEXT = {
  'color-test': 'Pitch Practice',
  tots: 'Tiny Tots',
  notespeller: 'NoteSpeller',
  theory: 'Theory quiz',
  practice: 'Piano practice',
};

// The home page's "Today's practice" (todayPlan.js): a list, or with
// `steps` little chips and a big Next button. Each item opens its
// activity; a signed-in player's items check off as they're done.
export default function TodayPlan({
  playerId,
  signedIn,
  colorNames,
  tinyTots,
  singleNotes = false,
  lockedIds = [],
  onOpen,
  onSignIn,
  steps = false,
}) {
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
    singleNotes,
  }).map((item) => (signedIn ? item : { ...item, done: false }));
  const doneCount = items.filter((i) => i.done).length;
  const allDone = signedIn && doneCount === items.length;

  useEffect(() => {
    if (signedIn) giveBonusIfDone(playerId, items);
  });

  // On the home page's greeting: today's steps as little chips and one big
  // button for the next thing to do.
  if (steps) {
    const next = items.find((i) => !i.done);
    return (
      <div className="today-steps-wrap">
        <p className="today-steps-count">
          {allDone ? 'All done today!' : `${doneCount} of ${items.length} done today`}
        </p>
        <div className="today-steps">
          {items.map((item) => (
            <button
              key={item.id}
              className={`today-step today-item-${item.id}${item.done ? ' today-step-done' : ''}${
                item === next ? ' today-step-next' : ''
              }`}
              onClick={() => onOpen(item.id)}
            >
              <Icon name={item.done ? 'check' : item.icon} size="28px" />
              <span>{SHORT[item.id] || item.title}</span>
            </button>
          ))}
        </div>
        {next ? (
          <button className="today-next" onClick={() => onOpen(next.id)}>
            <Icon name={next.icon} /> Next: {(singleNotes && next.id === 'color-test' && next.title) || NEXT[next.id] || next.title}
            {lockedIds.includes(next.id) && <Icon name="star" />}
          </button>
        ) : (
          <p className="today-steps-done">
            <Icon name="party" /> You earned a bonus sticker <Icon name="star" />
          </p>
        )}
      </div>
    );
  }

  return (
    <section className={`today${allDone ? ' today-all-done' : ''}`} aria-labelledby="today-title">
      <div className="today-head">
        <h3 className="today-title" id="today-title">
          <span aria-hidden="true"><Icon name="clipboard" /></span> Today's practice
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
                <Icon name={item.icon} />
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
                  <Icon name="star" />
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
              ? <><Icon name="party" /> All done today! You earned a bonus sticker <Icon name="star" /></>
              : <>{doneCount} of {items.length} done · finish all {items.length} for a bonus sticker <Icon name="star" /></>}
          </p>
        </>
      ) : (
        <p className="today-note">
          <button className="today-signin" onClick={onSignIn}>
            Sign in
          </button>{' '}
          to check these off and earn a bonus sticker <Icon name="star" />
        </p>
      )}
    </section>
  );
}
