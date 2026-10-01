import { useEffect, useLayoutEffect, useState } from 'react';
import {
  MIN_PRACTICE_MINUTES,
  TOKEN_MINUTES,
  formatMinutes,
  loadPracticeLog,
  practiceStats,
  recordPractice,
  tokensFor,
} from './practiceLog.js';
import Metronome from './Metronome.jsx';
import CoffeeBreak from './CoffeeBreak.jsx';
import { hasLiveActivity, showPracticeOnLockScreen } from './liveActivity.js';

// A practice companion: a timer for the whole session, a tap counter for
// repetitions ("5 times scales, then 5 times Hanon"), and each player's
// practice history. The timer and counter are saved as they change, and
// the timer is kept as timestamps rather than ticks, so locking the phone
// or switching apps doesn't lose time. A practice is only saved to the
// history if it lasted at least MIN_PRACTICE_MINUTES. The timer and
// counter belong to one player (profileId); picking another player starts
// them over.
//
// If nobody touches the app for a while (IDLE_MINUTES) while the timer
// runs, it pauses itself at that point and asks whether you're still
// practicing, so a forgotten timer doesn't keep counting all day. A
// running metronome counts as practicing. In the iPhone app the timer
// shows on the Lock Screen (liveActivity.js), so it can keep running with
// the phone locked on the piano: there the limit is 2 hours, on the
// website 5 minutes.
const PRACTICE_KEY = 'pitchpop-practice-v1';
const ACTIVITY_KEY = 'pitchpop-last-activity-v1';
export const IDLE_MINUTES = hasLiveActivity ? 120 : 5;
const IDLE_LABEL = hasLiveActivity ? '2 hours' : '5 minutes';
const IDLE_MS = IDLE_MINUTES * 60000;
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
const EMPTY = { status: 'idle', startedAt: null, elapsedBefore: 0, count: 0, profileId: null, idlePaused: false };

function loadPractice() {
  try {
    const saved = { ...EMPTY, ...JSON.parse(localStorage.getItem(PRACTICE_KEY)) };
    return STATUSES.includes(saved.status) ? saved : { ...saved, status: 'idle', startedAt: null, elapsedBefore: 0 };
  } catch {
    return EMPTY;
  }
}

function elapsedMs(p, now) {
  return p.elapsedBefore + (p.status === 'running' ? now - p.startedAt : 0);
}

const wholeMinutes = (ms) => Math.floor(ms / 60000);

function lastActivity() {
  try {
    return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
  } catch {
    return 0;
  }
}

function noteActivity(now = Date.now()) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    /* ignore */
  }
}

// The idle pause as a pure step: a running practice with no activity for
// IDLE_MS since the last tap (or since it started) stops counting at that
// point. Returns the same object when nothing changes.
function idleStopAt(p, last = lastActivity()) {
  return Math.max(last, p.startedAt) + IDLE_MS;
}

function withIdlePause(p, now, last = lastActivity()) {
  if (p.status !== 'running') return p;
  const stopAt = idleStopAt(p, last);
  if (now < stopAt) return p;
  return { ...p, status: 'paused', elapsedBefore: elapsedMs(p, stopAt), startedAt: null, idlePaused: true };
}

// Applies the idle pause to the saved practice. Practice Mode hears about
// it through the event; the header pill re-reads the saved state.
function settleIdle(now = Date.now()) {
  const p = loadPractice();
  const settled = withIdlePause(p, now);
  if (settled === p) return;
  try {
    localStorage.setItem(PRACTICE_KEY, JSON.stringify(settled));
  } catch {
    /* ignore */
  }
  reflectOnLockScreen(settled, now, '');
  window.dispatchEvent(new Event('pitchpop-practice-idle'));
}

function reflectOnLockScreen(p, now, playerName) {
  showPracticeOnLockScreen({
    status: p.status,
    elapsedMs: elapsedMs(p, now),
    staleAtMs: p.status === 'running' ? idleStopAt(p) : null,
    playerName,
  });
}

// Taps move the idle limit later; tell the Lock Screen now and then (it
// shows "Still practicing?" once the limit passes).
let lockScreenRefreshedAt = 0;
function refreshLockScreen(now) {
  if (!hasLiveActivity || now - lockScreenRefreshedAt < 60000) return;
  const p = loadPractice();
  if (p.status !== 'running') return;
  lockScreenRefreshedAt = now;
  reflectOnLockScreen(p, now, '');
}

// Every tap or key press counts as activity. The idle check runs first, so
// the tap that wakes the phone after a long break doesn't count the break.
if (typeof document !== 'undefined') {
  const onActivity = () => {
    const now = Date.now();
    settleIdle(now);
    noteActivity(now);
    refreshLockScreen(now);
  };
  document.addEventListener('pointerdown', onActivity, true);
  document.addEventListener('keydown', onActivity, true);
}

// For the practice pill in the header on other screens: whether a practice
// is on (running or paused) and how many whole minutes it has so far.
export function readPracticeTimer(now = Date.now()) {
  settleIdle(now);
  const p = loadPractice();
  return { status: p.status, minutes: wholeMinutes(elapsedMs(p, now)), idlePaused: p.idlePaused };
}

// Makes Practice Mode open on its Timer tab (used by the header pill).
export function showTimerTab() {
  try {
    localStorage.setItem(TAB_KEY, 'timer');
  } catch {
    /* ignore */
  }
}

function formatDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function PracticeMode({ profileId, profileName, ready = true }) {
  const [practice, setPractice] = useState(loadPractice);
  const [log, setLog] = useState(loadPracticeLog);
  const [now, setNow] = useState(Date.now);
  const [tab, setTab] = useState(loadTab);
  const [metronomeOn, setMetronomeOn] = useState(false);

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
      if (metronomeOn) noteActivity(t);
      setPractice((p) => withIdlePause(p, t));
      setNow(t);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [practice.status, metronomeOn]);

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
    }
    setNow(t);
    setPractice({ ...EMPTY, profileId });
  }, [ready, profileId, practice.profileId]);

  function start() {
    setNow(Date.now());
    update({ status: 'running', startedAt: Date.now(), elapsedBefore: 0, idlePaused: false });
  }

  function pause() {
    const t = Date.now();
    setPractice((p) => ({ ...p, status: 'paused', elapsedBefore: elapsedMs(p, t), startedAt: null, idlePaused: false }));
  }

  function resume() {
    setNow(Date.now());
    update({ status: 'running', startedAt: Date.now(), idlePaused: false });
  }

  function end() {
    const t = Date.now();
    const total = elapsedMs(practice, t);
    const minutes = wholeMinutes(total);
    if (minutes < MIN_PRACTICE_MINUTES) {
      update({ status: 'tooShort', elapsedBefore: total, startedAt: null, idlePaused: false });
      return;
    }
    setLog((prev) => recordPractice(prev, profileId, minutes, new Date(t)));
    update({ status: 'saved', elapsedBefore: total, startedAt: null, idlePaused: false });
  }

  function newPractice() {
    update({ status: 'idle', startedAt: null, elapsedBefore: 0, idlePaused: false });
  }

  const minutes = wholeMinutes(elapsedMs(practice, now));
  const stats = practiceStats(log[profileId]);
  const earning = tokensFor(minutes);
  const tokenWord = (n) => (n === 1 ? 'token' : 'tokens');

  const live = { timer: practice.status === 'running', metronome: metronomeOn };

  return (
    <div className="practice-screen">
      <div className="practice-head">
        <h2 className="screen-title practice-title">Practice Mode</h2>
        <div className="token-chip" aria-label={`${profileName} has ${stats.tokens} ${tokenWord(stats.tokens)}`}>
          <span aria-hidden="true">🪙</span> {stats.tokens}
        </div>
      </div>

      <div className="practice-tabs" role="tablist" aria-label="Practice tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`practice-tab${tab === t.id ? ' practice-tab-active' : ''}`}
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

      <section className="practice-card" aria-label="Practice timer" hidden={tab !== 'timer'}>
        <div className="practice-card-title">⏱️ Practice timer</div>

        {practice.status === 'saved' && (
          <>
            <div className="practice-time practice-time-done">{formatMinutes(minutes)}</div>
            <p className="practice-summary">Saved! Great practice, {profileName}.</p>
            {earning > 0 && (
              <div className="token-earned" role="status">
                <span className="token-earned-coin" aria-hidden="true">
                  🪙
                </span>
                You earned {earning} {tokenWord(earning)}!
              </div>
            )}
            <button className="pill-btn-primary pill-btn-full" onClick={newPractice}>
              Start a new practice
            </button>
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

        {['idle', 'running', 'paused'].includes(practice.status) && (
          <>
            <div className={`practice-time${practice.status === 'paused' ? ' practice-time-paused' : ''}`} role="timer">
              {formatMinutes(minutes)}
            </div>
            <p className="practice-status">
              {practice.status === 'idle' &&
                `Practices of ${MIN_PRACTICE_MINUTES}+ minutes are saved · 🪙 1 token per ${TOKEN_MINUTES} minutes`}
              {practice.status === 'running' && (
                <>
                  <span className="practice-live-dot" aria-hidden="true" /> Practicing
                  {earning > 0 && ` · 🪙 ${earning} ${tokenWord(earning)} so far`}
                </>
              )}
              {practice.status === 'paused' && !practice.idlePaused && 'On a break · the timer is stopped'}
            </p>
            {practice.status === 'paused' && !practice.idlePaused && <CoffeeBreak />}
            {practice.status === 'paused' && practice.idlePaused && (
              <div className="practice-idle" role="alert">
                <strong>Are you still practicing?</strong>
                <span>
                  Nothing was tapped for {IDLE_LABEL}, so the timer paused. Tap Resume to keep going.
                </span>
              </div>
            )}
            {practice.status === 'idle' ? (
              <button className="pill-btn-primary pill-btn-full" onClick={start}>
                ▶ Start practice
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
                <button className="pill-btn-primary" onClick={end}>
                  End practice
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <Metronome hidden={tab !== 'metronome'} onRunningChange={setMetronomeOn} />

      <section className="practice-card" aria-label="Repetition counter" hidden={tab !== 'counter'}>
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

      <section className="practice-card" aria-label={`${profileName}'s practice`} hidden={tab !== 'history'}>
        <div className="practice-card-title">📅 {profileName}’s practice</div>
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
                    {tokensFor(entry.minutes) > 0 && <span className="practice-history-tokens"> · 🪙 {tokensFor(entry.minutes)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="practice-total">No saved practices yet. Practice {MIN_PRACTICE_MINUTES} minutes or more to start a streak!</p>
        )}
      </section>
    </div>
  );
}
