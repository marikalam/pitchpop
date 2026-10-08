import { useId } from 'react';

// The app icon (rainbow + music note), drawn in SVG rather than shown as
// the PNG, so its pieces can move when the logo is tapped: the rainbow
// bands hop up one after another from the middle out, and the note jumps
// and wiggles. `playing` is a number that goes up with each tap; it's used
// as the key, so a new tap restarts the animation from the beginning.
const BANDS = [
  { r: 18, color: '#f0c93d' },
  { r: 59, color: '#4fae5c' },
  { r: 106, color: '#3b7fd9' },
  { r: 153, color: '#5b4fcf' },
];

const NOTE_PARTS = (
  <>
    <ellipse cx="231" cy="327" rx="42" ry="31" transform="rotate(-20 231 327)" />
    <rect x="247" y="132" width="26" height="200" rx="13" />
    <path d="M262 140 L318 104 Q330 97 330 112 L330 165 Q330 177 319 183 L272 212 Z" />
  </>
);

export default function LogoMark({ playing = 0 }) {
  const bg = useId();
  return (
    <svg
      key={playing}
      className={`logo-mark logo-mark-svg${playing ? ' logo-mark-play' : ''}`}
      viewBox="0 0 512 512"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff8ef" />
          <stop offset="1" stopColor="#fdf1e5" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="144" fill={`url(#${bg})`} />
      {BANDS.map((band, i) => (
        <path
          key={band.r}
          className="lm-band"
          style={{ animationDelay: `${i * 70}ms` }}
          d={`M${256 - band.r} 380 A${band.r} ${band.r} 0 0 1 ${256 + band.r} 380`}
          fill="none"
          stroke={band.color}
          strokeWidth="47"
          strokeLinecap="round"
        />
      ))}
      <g className="lm-note">
        <g fill="#fffaf1" stroke="#fffaf1" strokeWidth="18" strokeLinejoin="round">
          {NOTE_PARTS}
        </g>
        <g fill="#232842">{NOTE_PARTS}</g>
      </g>
    </svg>
  );
}
