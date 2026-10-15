import { useState } from 'react';
import {
  PRIVACY_URL,
  TERMS_URL,
  buyPlan,
  freeForever,
  hasPlan,
  planErrorMessage,
  planOptions,
  restorePlan,
  savedPlan,
  showCustomerCenter,
  showPaywall,
} from './plan.js';

const PERKS = [
  ['🌈', 'Every color', 'Keep adding colors after red, yellow and blue'],
  ['🎼', 'NoteSpeller', 'Read notes on the staff, treble and bass'],
  ['🎶', 'Scales & Hanon', 'Fingering for every scale, and Hanon 1–20'],
  ['📈', 'Progress page', "Each child's week, colors and reminders"],
  ['👨‍👩‍👧', 'The whole family', 'Every child gets their own player'],
];

const LABELS = { yearly: ['Yearly', '/year'], monthly: ['Monthly', '/month'], lifetime: ['Lifetime', ' once'] };

// A grown-up check before anything to do with buying (kids use this app).
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
            <button key={c} className="gate-choice" onClick={() => (c === q.answer ? onPass() : setWrong(true))}>
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

// PitchPop Family: what it adds, then (after a grown-up check)
// RevenueCat's paywall with Lifetime, Yearly and Monthly. If that paywall
// can't be shown, our own buttons for the same choices. With the plan:
// RevenueCat's Customer Center to manage it.
export default function Paywall({ user, reason, onSignIn, onDone }) {
  const [gate, setGate] = useState(null); // what to do once a grown-up passes
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState(null); // fallback buttons
  const owned = hasPlan(user);
  const forever = freeForever(user);
  const plan = savedPlan();

  async function run(task) {
    setBusy(true);
    setMessage('');
    try {
      await task();
    } catch (err) {
      const text = planErrorMessage(err);
      if (text) setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  const seePlans = () =>
    run(async () => {
      const result = await showPaywall();
      if (result === 'PURCHASED' || result === 'RESTORED' || result === 'NOT_PRESENTED') onDone?.();
      else if (result === 'ERROR') {
        // RevenueCat's paywall isn't available (not set up yet, or offline):
        // the same choices as plain buttons.
        const list = await planOptions();
        if (list.length) setOptions(list);
        else setMessage("The plans can't be loaded right now. Check the internet and try again.");
      }
    });

  const buy = (option) =>
    run(async () => {
      if (await buyPlan(option)) onDone?.();
    });

  const restore = () =>
    run(async () => {
      if (await restorePlan()) onDone?.();
      else setMessage('No PitchPop Family plan found for this Apple ID.');
    });

  const guarded = (task) => () => setGate(() => task);

  return (
    <div className="paywall">
      <div className="paywall-hero">
        <div className="paywall-badge">⭐ PitchPop Family</div>
        <h2 className="paywall-title">
          {forever ? 'Everything is free for your family' : owned ? 'You have PitchPop Family!' : reason || 'Keep growing, one color at a time'}
        </h2>
        <p className="paywall-sub">
          {forever
            ? 'Thank you for being here from the start. 💜'
            : owned
              ? plan.lifetime
                ? 'Lifetime: yours for good.'
                : plan.expires
                  ? `${plan.willRenew ? 'Renews' : 'Ends'} ${new Date(plan.expires).toLocaleDateString()}.`
                  : ''
              : 'Try it free for 7 days. One plan for every child in the family.'}
        </p>
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

      {forever ? null : owned ? (
        <button className="pill-btn-secondary pill-btn-full" disabled={busy} onClick={guarded(() => run(showCustomerCenter))}>
          Manage my plan
        </button>
      ) : !user ? (
        <div className="paywall-account">
          <p>First, make a free family account, so the plan covers every child on every phone.</p>
          <button className="pill-btn-primary pill-btn-full" onClick={onSignIn}>
            Sign in or create account
          </button>
        </div>
      ) : options ? (
        <div className="paywall-choices">
          {options.map((o) => (
            <button key={o.id} className="paywall-option paywall-option-row" disabled={busy} onClick={guarded(() => buy(o))}>
              {o.id === 'yearly' && <span className="paywall-save">Best value</span>}
              <b>{LABELS[o.id][0]}</b>
              <span className="paywall-price">
                {o.price}
                {LABELS[o.id][1]}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button className="pill-btn-primary pill-btn-full paywall-go" disabled={busy} onClick={guarded(seePlans)}>
          {busy ? 'One moment…' : 'See plans'}
        </button>
      )}
      {!owned && user && (
        <>
          <p className="paywall-fine">
            Monthly and yearly plans start with a free week, then renew automatically unless cancelled at least 24 hours
            before the end of the period; manage or cancel anytime in your Apple ID settings. Lifetime is a one-time
            purchase. Payment is charged to your Apple ID.
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
      {gate && (
        <ParentGate
          onPass={() => {
            const task = gate;
            setGate(null);
            task();
          }}
          onCancel={() => setGate(null)}
        />
      )}
    </div>
  );
}
