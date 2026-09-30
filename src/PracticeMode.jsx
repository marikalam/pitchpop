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

// A practice companion: a timer for the whole session, a tap counter for
// repetitions ("5 times scales, then 5 times Hanon"), and each player's
// practice history. The timer and counter are saved as they change, and
// the timer is kept as timestamps rather than ticks, so locking the phone
// or switching apps doesn't lose time. A practice is only saved to the
// history if it lasted at least MIN_PRACTICE_MINUTES. The timer and
// counter belong to one player (profileId); picking another player starts
// them over.
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
  }, [practice]);

  useEffect(() => {
    if (practice.status !== 'running') return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
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
    }
    setNow(t);
    setPractice({ ...EMPTY, profileId });
  }, [ready, profileId, practice.profileId]);

  function start() {
    setNow(Date.now());
    update({ status: 'running', startedAt: Date.now(), elapsedBefore: 0 });
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
    update({ status: 'saved', elapsedBefore: total, startedAt: null });
  }

  function newPractice() {
    update({ status: 'idle', startedAt: null, elapsedBefore: 0 });
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
              {practice.status === 'paused' && 'Paused'}
            </p>
            {practice.status === 'idle' ? (
              <button className="pill-btn-primary pill-btn-full" onClick={start}>
                ▶ Start practice
              </button>
            ) : (
              <div className="practice-actions">
                {practice.status === 'running' ? (
                  <button className="pill-btn-secondary" onClick={pause}>
                    Pause
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
