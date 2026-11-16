import Melo from './Melo.jsx';
import { t } from './i18n.js';

// Melo's Climb (NoteSpeller): ten rainbow steps rising to a crown. Each
// note read right takes Melo up one step, and a miss never sends Melo back
// down. The tenth right note wins the crown, which Melo wears for the rest
// of the round. Right answers in a row (the streak) earn more points.
export const CROWN_AT = 10;
const STEP_COLORS = ['#ff6b6b', '#ff922b', '#fcc419', '#94d82d', '#51cf66', '#22b8cf', '#4dabf7', '#748ffc', '#9775fa', '#e599f7'];

// Points for a right note with this many in a row (counting it): 10, then
// double from 5 in a row, triple from 10.
export function pointsFor(streak) {
  return 10 * multiplierFor(streak);
}
export function multiplierFor(streak) {
  return streak >= CROWN_AT ? 3 : streak >= 5 ? 2 : 1;
}

function Flame() {
  return (
    <svg className="climb-flame" viewBox="0 0 18 22" aria-hidden="true">
      <path d="M9 1c1 5 7 7 7 13a7 7 0 0 1-14 0c0-4 3-5 3-9 2 2 3 3 4 6 1-3 0-6 0-10z" fill="currentColor" />
    </svg>
  );
}

export function CrownIcon({ size = 30 }) {
  return (
    <svg width={size} height={size * 0.74} viewBox="0 0 46 34" aria-hidden="true">
      <path d="M3 30 6 6 16 18 23 2 30 18 40 6 43 30z" fill="#FFD23F" stroke="#E0A100" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="23" cy="3" r="3" fill="#ff6b8b" />
    </svg>
  );
}

// steps: notes read right this round (Melo's step). streak: right in a
// row now (the points' multiplier). crowned: the crown has been won.
// wear: Melo's outfit from the closet.
export default function MeloClimb({ steps, streak, crowned, wear = {} }) {
  const at = Math.min(steps, CROWN_AT);
  const left = CROWN_AT - at;
  // The steps' heights, as a share of the stairs' height.
  const height = (i) => 12 + i * 8.8;
  const melo = { ...wear, ...(crowned ? { hat: 'crown' } : {}) };
  return (
    <div className="climb" aria-label={t('{n} more to the crown', { n: left })}>
      <div className="climb-head">
        <span className="climb-title">
          {t("Melo's Climb")}
          {left > 0 && at > 0 && <small>{t('{n} more to the crown', { n: left })}</small>}
        </span>
        {streak >= 2 ? (
          <span className="climb-combo" key={streak}>
            <Flame /> {t('{n} in a row', { n: streak })}
            {multiplierFor(streak) > 1 && <b>x{multiplierFor(streak)}</b>}
          </span>
        ) : (
          <span className="climb-goal">{t('{n} right = crown', { n: CROWN_AT })}</span>
        )}
      </div>
      <div className="climb-stairs">
        {Array.from({ length: CROWN_AT }, (_, i) => (
          <span
            key={i}
            className={`climb-step${i < at ? ' climb-step-on' : ''}`}
            style={{ '--c': STEP_COLORS[i], height: `${height(i)}%`, left: `${((i + 1) * 100) / (CROWN_AT + 1)}%` }}
          >
            {i >= at && <i>{i + 1}</i>}
          </span>
        ))}
        {!crowned && (
          <span className="climb-crown" style={{ left: `${(CROWN_AT * 100) / (CROWN_AT + 1)}%`, bottom: `${height(CROWN_AT - 1)}%` }}>
            <CrownIcon />
          </span>
        )}
        <span
          className="climb-melo"
          style={{ left: `${((at + 0.5) * 100) / (CROWN_AT + 1)}%`, bottom: at ? `${height(at - 1)}%` : '0%' }}
        >
          <Melo size={34} mood={at > 0 ? 'cheer' : 'wave'} wear={melo} />
        </span>
      </div>
    </div>
  );
}
