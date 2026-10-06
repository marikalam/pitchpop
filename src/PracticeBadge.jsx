import { useEffect, useState } from 'react';
import { readPracticeTimer } from './PracticeMode.jsx';

// A small pill in the header while a practice is on, so the timer stays in
// view on every screen (Practice Mode's other tabs too): a pulsing green
// dot, "Practicing" and the minutes while it runs, a coffee cup while it's
// on a break. Tapping it goes back to the timer. The
// timer lives in PracticeMode's saved state, so this just re-reads it.
export default function PracticeBadge({ onOpen }) {
  const [timer, setTimer] = useState(readPracticeTimer);

  useEffect(() => {
    const id = setInterval(() => setTimer(readPracticeTimer()), 1000);
    return () => clearInterval(id);
  }, []);

  // A timer that stopped itself after being left on: tap to say how long
  // the practice really was.
  if (timer.status === 'leftOn') {
    return (
      <button className="practice-badge practice-badge-paused" onClick={onOpen} aria-label="Was the practice timer left on? Open the practice timer.">
        <span aria-hidden="true">🙈</span>
        Timer left on?
      </button>
    );
  }
  if (timer.status !== 'running' && timer.status !== 'paused') return null;
  const running = timer.status === 'running';
  const label = `${running ? 'Practicing' : 'On a break'} · ${timer.minutes} min`;
  return (
    <button
      className={`practice-badge${running ? '' : ' practice-badge-paused'}`}
      onClick={onOpen}
      aria-label={`${running ? 'Practicing' : 'On a break'}, ${timer.minutes} minutes. Open the practice timer.`}
    >
      {running ? (
        <span className="practice-live-dot" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">☕</span>
      )}
      {label}
    </button>
  );
}
