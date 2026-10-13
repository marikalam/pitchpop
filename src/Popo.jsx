import { useId } from 'react';
import { OUTFITS } from './popo.js';

// Popo: a smiling rainbow music note. `mood` 'happy' or 'oops' (an "o"
// mouth after a wrong answer, never sad), `dance` bounces it, and
// `outfit` is one of popo.js's OUTFITS, worn on its head (or eyes, or in
// its hand).
export default function Popo({ size = 80, mood = 'happy', dance = false, outfit = null, className = '' }) {
  const id = useId().replace(/:/g, '');
  const wear = OUTFITS.find((o) => o.id === outfit);
  return (
    <span
      className={`popo${dance ? ' popo-dance' : ''} ${className}`}
      style={{ width: size, height: (size * 130) / 120 }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 130" width="100%" height="100%">
        <defs>
          <linearGradient id={`popo${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff8a5c" />
            <stop offset=".5" stopColor="#f7c948" />
            <stop offset="1" stopColor="#5b8def" />
          </linearGradient>
        </defs>
        <rect x="78" y="8" width="10" height="78" rx="5" fill="#2b2f6b" />
        <path d="M88 10 q26 8 22 34 q-6-16-22-16z" fill="#2b2f6b" />
        <ellipse cx="56" cy="90" rx="40" ry="34" fill={`url(#popo${id})`} />
        <circle cx="44" cy="84" r="7" fill="#fff" />
        <circle cx="68" cy="84" r="7" fill="#fff" />
        <circle cx="45" cy="85" r="3.5" fill="#1d2140" />
        <circle cx="69" cy="85" r="3.5" fill="#1d2140" />
        {mood === 'oops' ? (
          <ellipse cx="56" cy="104" rx="5" ry="6" fill="#1d2140" />
        ) : (
          <path d="M46 100 q10 10 20 0" stroke="#1d2140" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        <circle cx="34" cy="98" r="5" fill="#ff7aa8" opacity=".6" />
        <circle cx="78" cy="98" r="5" fill="#ff7aa8" opacity=".6" />
      </svg>
      {wear && (
        <span className={`popo-wear popo-wear-${wear.id}`} style={{ fontSize: size * 0.34 }}>
          {wear.emoji}
        </span>
      )}
    </span>
  );
}
