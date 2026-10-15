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

// The home page's End practice button, while a practice is on: shows the
// minutes so far; tapping it ends the practice in Practice Mode (onEnd).
export function EndPracticeButton({ onEnd }) {
  const [timer, setTimer] = useState(readPracticeTimer);

  useEffect(() => {
    const id = setInterval(() => setTimer(readPracticeTimer()), 1000);
    return () => clearInterval(id);
  }, []);

  if (timer.status !== 'running' && timer.status !== 'paused') return null;
  return (
    <button className="home-practice home-practice-end" onClick={() => onEnd(timer.profileId)}>
      <span className="home-practice-icon" aria-hidden="true">
        {'■\uFE0E'}
      </span>
      End practice · {timer.minutes} min
    </button>
  );
}
