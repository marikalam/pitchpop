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
  // Paused because nobody tapped for a while: ask instead of the minutes.
  const label = timer.idlePaused
    ? 'Still there?'
    : `${running ? 'Practicing' : 'On a break'} · ${timer.minutes} min`;
  return (
    <button
      className={`practice-badge${running ? '' : ' practice-badge-paused'}`}
      onClick={onOpen}
      aria-label={`${running ? 'Practicing' : timer.idlePaused ? 'Practice paused' : 'On a break'}, ${timer.minutes} minutes.${timer.idlePaused ? ' Are you still practicing?' : ''} Open the practice timer.`}
    >
      {running ? (
        <span className="practice-live-dot" aria-hidden="true" />
      ) : (
        <span aria-hidden="true">{timer.idlePaused ? '⏸' : '☕'}</span>
      )}
      {label}
    </button>
  );
}
