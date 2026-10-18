import { useEffect, useLayoutEffect, useState } from 'react';
import {
  MIN_PRACTICE_MINUTES,
  formatMinutes,
  loadPracticeLog,
  practiceStats,
  recordPractice,
} from './practiceLog.js';
import Metronome from './Metronome.jsx';
import CoffeeBreak from './CoffeeBreak.jsx';
import { showPracticeOnLockScreen } from './liveActivity.js';
import { newPracticeId, practiceElsewhere, takePracticeHere } from './livePractice.js';

// A practice companion: a timer for the whole session, a tap counter for
// repetitions ("5 times scales, then 5 times Hanon"), and each player's
// practice history. The timer and counter are saved as they change, and
// the timer is kept as timestamps rather than ticks, so locking the phone
// or switching apps doesn't lose time. A practice is only saved to the
// history if it lasted at least MIN_PRACTICE_MINUTES. The timer and
// counter belong to one player (profileId); picking another player starts
// them over.
//
// The timer keeps running until the player pauses or ends it - in another
// app or with the screen off too. In the iPhone app it also shows on the
// Lock Screen (liveActivity.js).
const PRACTICE_KEY = 'pitchpop-practice-v1';
const TAB_KEY = 'pitchpop-practice-tab-v1';
// One tool at a time, so Practice Mode fits on a phone screen without
// scrolling. Every panel stays mounted (just hidden), so the timer and the
// metronome keep going while another tab is open.
const TABS = [
  { id: 'timer', icon: '⏱️', label: 'Timer' },
  { id: 'metronome', icon: '🎵', label: 'Metronome' },
  { id: 'counter', icon: '🔁', label: 'Counter' },
  { id: 'history', icon: '📅', label: 'History' },
];

function loadTab() {
  try {
    const saved = localStorage.getItem(TAB_KEY);
    if (TABS.some((t) => t.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'timer';
}
const STATUSES = ['idle', 'running', 'paused', 'tooShort', 'saved'];
const EMPTY = { status: 'idle', startedAt: null, elapsedBefore: 0, count: 0, profileId: null };

function loadPractice() {
  try {
    // (Older versions could pause by themselves and saved an idlePaused
    // flag; that's now an ordinary break.)
    // eslint-disable-next-line no-unused-vars
    const { idlePaused, ...saved } = { ...EMPTY, ...JSON.parse(localStorage.getItem(PRACTICE_KEY)) };
    return STATUSES.includes(saved.status) ? saved : { ...saved, status: 'idle', startedAt: null, elapsedBefore: 0 };
  } catch {
    return EMPTY;
  }
}

function elapsedMs(p, now) {
  return p.elapsedBefore + (p.status === 'running' ? now - p.startedAt : 0);
}

const wholeMinutes = (ms) => Math.floor(ms / 60000);

function reflectOnLockScreen(p, now, playerName) {
  showPracticeOnLockScreen({
    status: p.status,
    elapsedMs: elapsedMs(p, now),
    playerName,
  });
}

// For the practice pill in the header on other screens: whether a practice
// is on (running or paused), how many whole minutes it has so far, and
// whose it is.
export function readPracticeTimer(now = Date.now()) {
  const p = loadPractice();
  return { status: p.status, minutes: wholeMinutes(elapsedMs(p, now)), profileId: p.profileId };
}

// Stops a practice that's on, from outside Practice Mode: signing out,
// deleting the account, or switching player. Like End practice, it's
// saved to the player's history if it was long enough; then the timer,
// the counter and the Lock Screen timer are cleared.
export function stopPractice() {
  const p = loadPractice();
  const t = Date.now();
  if ((p.status === 'running' || p.status === 'paused') && p.profileId) {
    const minutes = wholeMinutes(elapsedMs(p, t));
    if (minutes >= MIN_PRACTICE_MINUTES) recordPractice(loadPracticeLog(), p.profileId, minutes, new Date(t));
  }
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(EMPTY));
  } catch {
    /* ignore */
  }
  reflectOnLockScreen(EMPTY, t, '');
  window.dispatchEvent(new Event('pitchpop-practice-changed'));
  // Practice Mode, if open, reloads the timer and the history.
  window.dispatchEvent(new Event('pitchpop-practice-idle'));
  window.dispatchEvent(new Event('pitchpop-history-synced'));
}

// Makes Practice Mode open on its Timer tab (used by the header pill).
// The home page's Start practice button: the timer starts now, for this
// player, and Practice Mode opens on it. (A practice already on just
// opens.)
export function startPracticeNow(profileId) {
  const p = loadPractice();
  if (p.status === 'running' || p.status === 'paused') return;
  // Already practicing on another phone: Practice Mode shows that instead.
  if (practiceElsewhere(profileId)) return;
  try {
    localStorage.setItem(
      PRACTICE_KEY,
      JSON.stringify({ ...EMPTY, count: p.profileId === profileId ? p.count : 0, profileId, status: 'running', startedAt: Date.now(), id: newPracticeId() }),
    );
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('pitchpop-practice-changed'));
}

export function showTimerTab() {
  try {
    localStorage.setItem(TAB_KEY, 'timer');
  } catch {
    /* ignore */
  }
}

// Made once: making a date format is slow on iPhones.
const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const WEEKDAY_LETTER = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });

function formatDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return DAY_FORMAT.format(new Date(y, m - 1, d));
}

// The timer as a ring that fills up over the first MIN_PRACTICE_MINUTES
// (when the practice is long enough to be saved, with a sticker), then
// turns gold. The minutes so far in the middle.
function PracticeRing({ ms, status }) {
  const goal = MIN_PRACTICE_MINUTES * 60000;
  const done = ms >= goal;
  const fraction = done ? 1 : ms / goal;
  const r = 96;
  const c = 2 * Math.PI * r;
  // Whole minutes only: seconds ticking by are too distracting.
  const minutes = Math.floor(ms / 60000);
  const time = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}` : String(minutes);
  return (
    <div className={`pring pring-${status}${done ? ' pring-done' : ''}`} role="timer" aria-label={`${minutes} minutes practiced`}>
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <linearGradient id="pring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffb347" />
            <stop offset="1" stopColor="#ff6b9a" />
          </linearGradient>
          <linearGradient id="pring-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe066" />
            <stop offset="1" stopColor="#fab005" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r={r} className="pring-track" />
        <circle
          cx="110"
          cy="110"
          r={r}
          className="pring-fill"
          stroke={done ? 'url(#pring-gold)' : 'url(#pring-grad)'}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          transform="rotate(-90 110 110)"
        />
      </svg>
      <div className="pring-middle">
        {status === 'paused' ? <CoffeeBreak /> : <span className="pring-top">{done ? '⭐' : '🎹'}</span>}
        <span className="pring-time">
          {time}
          <span className="pring-unit">min</span>
        </span>
        <span className="pring-label">
          {status === 'running' ? (
            <>
              <span className="practice-live-dot" aria-hidden="true" /> Practicing
            </>
          ) : status === 'paused' ? (
            'On a break'
          ) : (
            'Ready?'
          )}
        </span>
      </div>
    </div>
  );
}

// A saved practice earns a sticker (onSaved; picked with stickerSlot).
export default function PracticeMode({ profileId, profileName, ready = true, onSaved, stickerSlot, next, endOnOpen, onEndHandled }) {
  const [practice, setPractice] = useState(loadPractice);
  const [log, setLog] = useState(loadPracticeLog);
  const [now, setNow] = useState(Date.now);
  const [tab, setTab] = useState(loadTab);
  // This player's practice going on another phone (livePractice.js), and
  // why this phone's practice just stopped, if it did.
  const [away, setAway] = useState(() => practiceElsewhere(profileId));
  const [moved, setMoved] = useState(null);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    setAway(practiceElsewhere(profileId));
    const onLive = () => setAway(practiceElsewhere(profileId));
    const onMoved = (e) => setMoved(e.detail);
    window.addEventListener('pitchpop-live-changed', onLive);
    window.addEventListener('pitchpop-practice-moved', onMoved);
    return () => {
      window.removeEventListener('pitchpop-live-changed', onLive);
      window.removeEventListener('pitchpop-practice-moved', onMoved);
    };
  }, [profileId]);

  // The minutes ticking on the other phone.
  useEffect(() => {
    if (!away || away.status !== 'running') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [away]);

  async function moveHere() {
    setMoving(true);
    const ok = await takePracticeHere(profileId);
    setMoving(false);
    if (ok) {
      setMoved(null);
      setPractice(loadPractice());
      setNow(Date.now());
    }
  }

  function chooseTab(id) {
    setTab(id);
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    try {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify(practice));
    } catch {
      /* ignore */
    }
    // livePractice.js tells the family's other phones.
    window.dispatchEvent(new Event('pitchpop-practice-changed'));
    // Waits for `ready`, like the player switch below, so a signed-in
    // family's name is known.
    if (ready && practice.profileId === profileId) reflectOnLockScreen(practice, Date.now(), profileName);
  }, [practice, ready, profileId, profileName]);

  // The header's practice pill, tapped while in Practice Mode.
  useEffect(() => {
    const show = () => setTab('timer');
    window.addEventListener('pitchpop-show-timer', show);
    return () => window.removeEventListener('pitchpop-show-timer', show);
  }, []);

  // Practices saved on the family's other phones (historySync.js).
  useEffect(() => {
    const reload = () => setLog(loadPracticeLog());
    window.addEventListener('pitchpop-history-synced', reload);
    return () => window.removeEventListener('pitchpop-history-synced', reload);
  }, []);

  useEffect(() => {
    const reload = () => setPractice(loadPractice());
    window.addEventListener('pitchpop-practice-idle', reload);
    return () => window.removeEventListener('pitchpop-practice-idle', reload);
  }, []);

  useEffect(() => {
    if (practice.status !== 'running') return undefined;
    const tick = () => {
      const t = Date.now();
      setNow(t);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [practice.status]);

  const update = (changes) => setPractice((p) => ({ ...p, ...changes }));

  // A different player: start their timer and counter from zero. If the
  // previous player had practiced long enough, that practice goes into
  // their history first, as if they'd tapped End practice. (Layout effect,
  // so the previous player's numbers never flash on screen.)
  // Waits for `ready`: while a signed-in family's players are still loading,
  // profileId is briefly the guest player, which isn't a real switch.
  useLayoutEffect(() => {
    if (!ready || practice.profileId === profileId) return;
    if (!practice.profileId) {
      // Saved before practices belonged to a player: it's this player's.
      update({ profileId });
      return;
    }
    const t = Date.now();
    const minutes = wholeMinutes(elapsedMs(practice, t));
    if (['running', 'paused'].includes(practice.status) && minutes >= MIN_PRACTICE_MINUTES) {
      setLog((prev) => recordPractice(prev, practice.profileId, minutes, new Date(t)));
      onSaved?.(practice.profileId);
    }
    setNow(t);
    setPractice({ ...EMPTY, profileId });
  }, [ready, profileId, practice.profileId]);

  function start() {
    if (practiceElsewhere(profileId)) return;
    setMoved(null);
    setNow(Date.now());
    update({ status: 'running', startedAt: Date.now(), elapsedBefore: 0, id: newPracticeId() });
  }

  function pause() {
    const t = Date.now();
    setPractice((p) => ({ ...p, status: 'paused', elapsedBefore: elapsedMs(p, t), startedAt: null }));
  }

  function resume() {
    setNow(Date.now());
    update({ status: 'running', startedAt: Date.now() });
  }

  function end() {
    const t = Date.now();
    const total = elapsedMs(practice, t);
    const minutes = wholeMinutes(total);
    if (minutes < MIN_PRACTICE_MINUTES) {
      update({ status: 'tooShort', elapsedBefore: total, startedAt: null });
      return;
    }
    setLog((prev) => recordPractice(prev, profileId, minutes, new Date(t)));
    onSaved?.(profileId);
    update({ status: 'saved', elapsedBefore: total, startedAt: null });
  }

  // Opened by the home page's End practice: end it right away.
  useEffect(() => {
    if (!endOnOpen || !ready || practice.profileId !== profileId) return;
    if (['running', 'paused'].includes(practice.status)) end();
    onEndHandled?.();
  }, [endOnOpen, ready, practice.profileId, profileId]);

  function newPractice() {
    update({ status: 'idle', startedAt: null, elapsedBefore: 0 });
  }

  const minutes = wholeMinutes(elapsedMs(practice, now));
  const stats = practiceStats(log[profileId]);

  // A green dot on the Timer tab while the practice timer runs.
  const live = { timer: practice.status === 'running' };

  return (
    <div className="practice-screen">
      <div className="practice-head">
        <h2 className="screen-title practice-title">Practice Mode</h2>
      </div>

      <div className="practice-tabs" role="tablist" aria-label="Practice tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`practice-tab practice-tab-${t.id}${tab === t.id ? ' practice-tab-active' : ''}`}
            onClick={() => chooseTab(t.id)}
          >
            <span className="practice-tab-icon" aria-hidden="true">
              {t.icon}
            </span>
            <span className="practice-tab-label">{t.label}</span>
            {live[t.id] && <span className="practice-tab-live" aria-label="running" />}
          </button>
        ))}
      </div>

      <section className="practice-card practice-card-timer" aria-label="Practice timer" hidden={tab !== 'timer'}>

        {practice.status === 'saved' && (
          <>
            <div className="practice-time practice-time-done">{formatMinutes(minutes)}</div>
            <p className="practice-summary">Saved! Great practice, {profileName}.</p>
            {/* Done practicing: on to what's next today (once the sticker
                is in). */}
            {(stickerSlot || ((then) => then))(
              next || (
                <button className="pill-btn-primary pill-btn-full" onClick={newPractice}>
                  Start a new practice
                </button>
              ),
            )}
          </>
        )}

        {practice.status === 'tooShort' && (
          <>
            <div className="practice-time practice-time-paused">{formatMinutes(minutes)}</div>
            <p className="practice-summary">
              A practice needs at least {MIN_PRACTICE_MINUTES} minutes to be saved.
            </p>
            <div className="practice-actions">
              <button className="pill-btn-secondary" onClick={newPractice}>
                Don’t save
              </button>
              <button className="pill-btn-primary" onClick={resume}>
                Keep practicing
              </button>
            </div>
          </>
        )}

        {practice.status === 'idle' && away && (
          <>
            <div className={`practice-time${away.status === 'paused' ? ' practice-time-paused' : ''}`} role="timer">
              {formatMinutes(wholeMinutes(elapsedMs(away, now)))}
            </div>
            <p className="practice-status practice-away">
              📱 {profileName} is {away.status === 'paused' ? 'on a break' : 'practicing'} on another phone
            </p>
            <p className="practice-away-note">One practice at a time for each player. Bring it here to keep going on this phone.</p>
            <button className="pill-btn-primary pill-btn-full" onClick={moveHere} disabled={moving}>
              {moving ? 'Moving…' : '📲 Move practice to this phone'}
            </button>
          </>
        )}

        {['idle', 'running', 'paused'].includes(practice.status) && !(practice.status === 'idle' && away) && (
          <>
            <PracticeRing ms={elapsedMs(practice, now)} status={practice.status} />
            <p className="practice-status">
              {practice.status === 'idle' &&
                (moved === 'moved'
                  ? '📲 This practice moved to another phone'
                  : moved === 'ended'
                    ? 'This practice was ended on another phone'
                    : moved === 'elsewhere'
                      ? `📱 ${profileName} is already practicing on another phone`
                      : null)}
              {practice.status === 'running' && minutes >= MIN_PRACTICE_MINUTES && '⭐ A sticker is waiting when you end'}
              {practice.status === 'paused' && 'The timer is stopped'}
            </p>
            {practice.status === 'idle' ? (
              <button className="pill-btn-primary pill-btn-full practice-go" onClick={start}>
                {'▶\uFE0E'} Start practice
              </button>
            ) : (
              <div className="practice-actions">
                {practice.status === 'running' ? (
                  <button className="pill-btn-secondary" onClick={pause}>
                    ☕ Take a break
                  </button>
                ) : (
                  <button className="pill-btn-secondary" onClick={resume}>
                    Resume
                  </button>
                )}
                <button className="pill-btn-primary practice-go" onClick={end}>
                  End practice
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <Metronome hidden={tab !== 'metronome'} />

      <section className="practice-card practice-card-counter" aria-label="Repetition counter" hidden={tab !== 'counter'}>
        <div className="practice-card-title">🔁 Repetition counter</div>
        <p className="practice-counter-desc">
          Keep track of how many times you’ve played something, like 5 times through your scales. Tap the number
          each time you finish one.
        </p>
        <div className="practice-counter">
          <button
            className="practice-step"
            onClick={() => update({ count: Math.max(0, practice.count - 1) })}
            disabled={practice.count === 0}
            aria-label="Decrease count"
          >
            −
          </button>
          <button
            className="practice-count"
            onClick={() => update({ count: practice.count + 1 })}
            aria-label={`Count ${practice.count}. Tap to add one.`}
          >
            <span aria-live="polite">{practice.count}</span>
            <span className="practice-count-hint">tap to add 1</span>
          </button>
          <button className="practice-step" onClick={() => update({ count: practice.count + 1 })} aria-label="Increase count">
            +
          </button>
        </div>
        <button className="practice-reset" onClick={() => update({ count: 0 })} disabled={practice.count === 0}>
          ↺ Start over
        </button>
      </section>

      {/* Built only when open: it's the slowest part of Practice Mode. */}
      {tab === 'history' && (
        <section className="practice-card practice-card-history" aria-label={`${profileName}'s practice`}>
          <div className="practice-card-title">📅 {profileName}’s practice</div>
          <div className="practice-week" aria-label="Minutes practiced each day this week">
            {stats.week.map((d) => {
              const top = Math.max(15, ...stats.week.map((w) => w.minutes));
              return (
                <div key={d.key} className="practice-week-col">
                  <span className="practice-week-min">{d.minutes || ''}</span>
                  <span className="practice-week-track">
                    <span className="practice-week-bar" style={{ height: `${d.minutes ? Math.max(8, (100 * d.minutes) / top) : 0}%` }} />
                  </span>
                  <span className="practice-week-day">{WEEKDAY_LETTER.format(new Date(`${d.key}T12:00:00`))}</span>
                </div>
              );
            })}
          </div>
          <div className="practice-stats">
            <div className="practice-stat">
              <div className="practice-stat-value">🔥 {stats.streak.current}</div>
              <div className="practice-stat-label">{stats.streak.current === 1 ? 'day' : 'days'} in a row</div>
            </div>
            <div className="practice-stat">
              <div className="practice-stat-value">{formatMinutes(stats.todayMinutes)}</div>
              <div className="practice-stat-label">today</div>
            </div>
            <div className="practice-stat">
              <div className="practice-stat-value">{formatMinutes(stats.weekMinutes)}</div>
              <div className="practice-stat-label">last 7 days</div>
            </div>
          </div>
          {stats.count > 0 ? (
            <>
              <p className="practice-total">
                {formatMinutes(stats.totalMinutes)} in {stats.count} {stats.count === 1 ? 'practice' : 'practices'}
                {stats.streak.best > 1 && ` · best streak ${stats.streak.best} days`}
              </p>
              <ul className="practice-history">
                {stats.recent.map((entry) => (
                  <li key={entry.endedAt}>
                    <span>{formatDay(entry.day)}</span>
                    <span>
                      {formatMinutes(entry.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="practice-total">No saved practices yet. Practice {MIN_PRACTICE_MINUTES} minutes or more to start a streak!</p>
          )}
        </section>
      )}
    </div>
  );
}
