import { useEffect, useState } from 'react';
import { appHandoffFromEmail } from './appLink.js';

// On the website: when an account email sent from the iPhone app was
// opened (confirm your account, reset your password), go straight back to
// the app, signed in. iPhone may ask "Open in PitchPop?" first, so there's
// also a button; on a computer the website simply carries on, signed in.
// Read once, before the page's address is tidied up.
const handoff = appHandoffFromEmail();

export default function EmailHandoff() {
  const [open, setOpen] = useState(!!handoff);

  useEffect(() => {
    if (handoff) window.location.href = handoff.link;
  }, []);

  if (!open) return null;
  return (
    <div className="handoff-backdrop" role="dialog" aria-modal="true" aria-labelledby="handoff-title">
      <div className="handoff-card">
        <div className="handoff-icon" aria-hidden="true">
          {handoff.recovery ? '🔑' : '✅'}
        </div>
        <h2 id="handoff-title" className="handoff-title">
          {handoff.recovery ? 'Set your new password in the app' : 'Your email is confirmed!'}
        </h2>
        <p className="handoff-text">
          {handoff.recovery
            ? 'Open the PitchPop app to choose a new password.'
            : 'Open the PitchPop app to start playing. You’re signed in.'}
        </p>
        <a className="pill-btn-primary pill-btn-full handoff-open" href={handoff.link}>
          Open the PitchPop app
        </a>
        <button className="handoff-stay" onClick={() => setOpen(false)}>
          Keep using the website
        </button>
      </div>
    </div>
  );
}
