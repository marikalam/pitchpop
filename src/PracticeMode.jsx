import { useEffect, useState } from 'react';

// A practice companion: a timer for the whole session and a tap counter
// for repetitions ("5 times scales, then 5 times Hanon"). Both are saved
// as they change, and the timer is kept as timestamps rather than ticks,
// so locking the phone or switching apps doesn't lose time.
const PRACTICE_KEY = 'pitchpop-practice-v1';
const EMPTY = { status: 'idle', startedAt: null, elapsedBefore: 0, count: 0, label: '' };

function loadPractice() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(PRACTICE_KEY)) };
  } catch {
    return EMPTY;
  }
}

function elapsedMs(p, now) {
  return p.elapsedBefore + (p.status === 'running' ? now - p.startedAt : 0);
}

function formatDuration(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function spokenDuration(ms) {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'less than a minute';
  return minutes === 1 ? '1 minute' : `${minutes} minutes`;
}

export default function PracticeMode() {
  const [practice, setPractice] = useState(loadPractice);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    try {
      localStorage.setItem(PRACTICE_KEY, JSON.stringify(practice));
    } catch {
      /* ignore */
    }
  }, [practice]);

  useEffect(() => {
    if (practice.status !== 'running') return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [practice.status]);

  const update = (changes) => setPractice((p) => ({ ...p, ...changes }));

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
    setPractice((p) => ({ ...p, status: 'done', elapsedBefore: elapsedMs(p, t), startedAt: null }));
  }

  function newPractice() {
    update({ status: 'idle', startedAt: null, elapsedBefore: 0 });
  }

  const elapsed = elapsedMs(practice, now);

  return (
    <>
      <h2 className="screen-title">Practice Mode</h2>

      <section className="practice-card" aria-label="Practice timer">
        <div className="practice-card-title">⏱️ Practice timer</div>
        {practice.status === 'done' ? (
          <>
            <div className="practice-time practice-time-done">{formatDuration(elapsed)}</div>
            <p className="practice-summary">Great practice! You practiced for {spokenDuration(elapsed)}.</p>
            <button className="pill-btn-primary pill-btn-full" onClick={newPractice}>
              Start a new practice
            </button>
          </>
        ) : (
          <>
            <div className={`practice-time${practice.status === 'paused' ? ' practice-time-paused' : ''}`} role="timer">
              {formatDuration(elapsed)}
            </div>
            {practice.status === 'idle' && (
              <button className="pill-btn-primary pill-btn-full" onClick={start}>
                ▶ Start practice
              </button>
            )}
            {practice.status !== 'idle' && (
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

      <section className="practice-card" aria-label="Repetition counter">
        <div className="practice-card-title">🔁 Counter</div>
        <input
          className="practice-label-input"
          value={practice.label}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="What are you counting? e.g. Scales"
          maxLength={40}
          aria-label="What are you counting?"
        />
        <div className="practice-count" aria-live="polite">
          {practice.count}
        </div>
        <button className="practice-plus" onClick={() => update({ count: practice.count + 1 })}>
          +1
        </button>
        <button className="practice-reset" onClick={() => update({ count: 0 })} disabled={practice.count === 0}>
          Reset to 0
        </button>
      </section>
    </>
  );
}
