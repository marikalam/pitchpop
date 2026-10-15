import { useEffect, useState } from 'react';
import { PRICES, PRIVACY_URL, TERMS_URL, buyPlan, hasPlan, manageSubscription, planOptions, restorePlan } from './plan.js';

const PERKS = [
  ['🌈', 'Every color', 'Keep adding colors after red, yellow and blue'],
  ['🎼', 'NoteSpeller', 'Read notes on the staff, treble and bass'],
  ['🎶', 'Scales & Hanon', 'Fingering for every scale, and Hanon 1–20'],
  ['📈', 'Progress page', "Each child's week, colors and reminders"],
  ['👨‍👩‍👧', 'The whole family', 'Every child gets their own player'],
];

// A grown-up check before buying (kids use this app): a sum to answer.
function ParentGate({ onPass, onCancel }) {
  const [q] = useState(() => {
    const a = 3 + Math.floor(Math.random() * 6);
    const b = 4 + Math.floor(Math.random() * 5);
    const answer = a * b;
    const choices = [...new Set([answer, answer + a, answer - b, answer + 2])].sort(() => Math.random() - 0.5);
    return { a, b, answer, choices };
  });
  const [wrong, setWrong] = useState(false);
  return (
    <div className="gate-backdrop" role="dialog" aria-modal="true" aria-label="Ask a grown-up">
      <div className="gate-card">
        <h3 className="gate-title">Ask a grown-up 👋</h3>
        <p className="gate-q">
          What is {q.a} × {q.b}?
        </p>
        <div className="gate-choices">
          {q.choices.map((c) => (
            <button
              key={c}
              className="gate-choice"
              onClick={() => (c === q.answer ? onPass() : setWrong(true))}
            >
              {c}
            </button>
          ))}
        </div>
        {wrong && <p className="gate-wrong">Not quite. Grown-ups only!</p>}
        <button className="gate-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// PitchPop Family: what it adds, the yearly and monthly choices, the free
// week, Restore, and the links Apple asks for.
export default function Paywall({ user, reason, onSignIn, onDone }) {
  const [options, setOptions] = useState(null);
  const [choice, setChoice] = useState('yearly');
  const [gate, setGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const owned = hasPlan(user);

  useEffect(() => {
    if (owned || !user) return;
    planOptions()
      .then(setOptions)
      .catch(() => setOptions([]));
  }, [owned, user]);

  const priceOf = (id) => options?.find((o) => o.id === id)?.price || PRICES[id];

  async function buy() {
    setGate(false);
    const option = options?.find((o) => o.id === choice);
    if (!option) {
      setMessage("The App Store can't be reached right now. Try again in a moment.");
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      if (await buyPlan(option)) onDone?.();
    } catch {
      setMessage('That didn’t go through. Nothing was charged; try again.');
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    setMessage('');
    try {
      if (await restorePlan()) onDone?.();
      else setMessage('No PitchPop Family plan found for this Apple ID.');
    } catch {
      setMessage("Couldn't reach the App Store. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paywall">
      <div className="paywall-hero">
        <div className="paywall-badge">⭐ PitchPop Family</div>
        <h2 className="paywall-title">{owned ? 'You have PitchPop Family!' : reason || 'Keep growing, one color at a time'}</h2>
        {!owned && <p className="paywall-sub">Try everything free for 7 days. One plan for every child in the family.</p>}
      </div>

      <ul className="paywall-perks">
        {PERKS.map(([icon, title, text]) => (
          <li key={title}>
            <span className="paywall-perk-icon" aria-hidden="true">
              {icon}
            </span>
            <span>
              <b>{title}</b>
              <span>{text}</span>
            </span>
            {owned && <span className="paywall-check">✓</span>}
          </li>
        ))}
      </ul>

      {owned ? (
        <button className="pill-btn-secondary pill-btn-full" onClick={manageSubscription}>
          Manage subscription
        </button>
      ) : !user ? (
        <div className="paywall-account">
          <p>First, make a free family account, so the plan covers every child on every phone.</p>
          <button className="pill-btn-primary pill-btn-full" onClick={onSignIn}>
            Sign in or create account
          </button>
        </div>
      ) : (
        <>
          <div className="paywall-options" role="radiogroup" aria-label="Plan">
            <button
              role="radio"
              aria-checked={choice === 'yearly'}
              className={`paywall-option${choice === 'yearly' ? ' is-on' : ''}`}
              onClick={() => setChoice('yearly')}
            >
              <span className="paywall-save">Best value</span>
              <b>Yearly</b>
              <span className="paywall-price">{priceOf('yearly')}/year</span>
              <span className="paywall-per">about $2.50 a month</span>
            </button>
            <button
              role="radio"
              aria-checked={choice === 'monthly'}
              className={`paywall-option${choice === 'monthly' ? ' is-on' : ''}`}
              onClick={() => setChoice('monthly')}
            >
              <b>Monthly</b>
              <span className="paywall-price">{priceOf('monthly')}/month</span>
              <span className="paywall-per">cancel anytime</span>
            </button>
          </div>
          <button className="pill-btn-primary pill-btn-full paywall-go" disabled={busy} onClick={() => setGate(true)}>
            {busy ? 'One moment…' : 'Start my free week'}
          </button>
          <p className="paywall-fine">
            Free for 7 days, then {priceOf(choice)} a {choice === 'yearly' ? 'year' : 'month'}. It renews automatically
            unless cancelled at least 24 hours before the end of the period; manage or cancel anytime in your Apple ID
            settings. Payment is charged to your Apple ID.
          </p>
          <button className="paywall-restore" disabled={busy} onClick={restore}>
            Restore purchases
          </button>
        </>
      )}
      {message && <p className="paywall-message">{message}</p>}
      <p className="paywall-links">
        <a href={TERMS_URL} target="_blank" rel="noreferrer">
          Terms of Use
        </a>
        {' · '}
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
      </p>
      {gate && <ParentGate onPass={buy} onCancel={() => setGate(false)} />}
    </div>
  );
}
