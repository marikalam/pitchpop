import { useEffect, useState } from 'react';
import { readPracticeTimer } from './PracticeMode.jsx';

// A small pill in the header while a practice is on, so the timer stays in
// view on every screen: a pulsing green dot and the minutes while it runs,
// a pause sign while it's paused. Tapping it goes back to the timer. The
// timer lives in PracticeMode's saved state, so this just re-reads it.
export default function PracticeBadge({ onOpen }) {
  const [timer, setTimer] = useState(readPracticeTimer);

  useEffect(() => {
    const id = setInterval(() => setTimer(readPracticeTimer()), 1000);
    return () => clearInterval(id);
  }, []);

  if (timer.status !== 'running' && timer.status !== 'paused') return null;
  const running = timer.status === 'running';
  return (
    <button
      className={`practice-badge${running ? '' : ' practice-badge-paused'}`}
      onClick={onOpen}
      aria-label={`${running ? 'Practicing' : 'Practice paused'}, ${timer.minutes} minutes. Open the practice timer.`}
    >
      {running ? <span className="practice-live-dot" aria-hidden="true" /> : <span aria-hidden="true">⏸</span>}
      {timer.minutes} min
    </button>
  );
}
