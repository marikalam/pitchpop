// Melo, PitchPop's mascot: a music note come to life. The round, tilted
// note head is the body (with the face), the stem and flag stick up on
// the right. `mood` is 'wave' or 'cheer' (open mouth, sparkles). `wear`
// dresses Melo from Melo's Closet (meloCloset.js): { hat, glasses, ribbon },
// each an item id or empty. Ribbons tie onto the stem; a chord color's
// ribbon is that color.
const BODY = '#FF6B8B';
const SHINE = '#FFD2DC';
const INK = '#1d1830';
const STEM = '#3B2A80';

export const RIBBON_COLORS = {
  red: '#D6473C',
  yellow: '#E4C13B',
  blue: '#3B6FB0',
  black: '#232323',
  green: '#4C8858',
  orange: '#E98A2E',
  purple: '#7C4A9E',
  pink: '#F48FB1',
  brown: '#7A5238',
  'light green': '#9CCC65',
  beige: '#E4CFA6',
  gold: '#FFC83D',
};

function Ribbon({ id }) {
  // A bow on the stem, with two tails.
  if (id === 'rainbow') {
    return (
      <g>
        <defs>
          <linearGradient id="melo-rainbow" x1="0" y1="0" x2="0" y2="1">
            {['#FF5E7E', '#FF9F43', '#FECA57', '#1DD1A1', '#54A0FF', '#8E6CFF'].map((c, i) => (
              <stop key={c} offset={`${(i / 5) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <path d="M93 25 86 46l6-3 3 6zM99 25l7 21-6-3-3 6z" fill="url(#melo-rainbow)" />
        <path d="M96 22 76 10v24zM96 22l20-12v24z" fill="url(#melo-rainbow)" />
        <circle cx="96" cy="22" r="5.5" fill="#FECA57" stroke="#fff" strokeWidth="2" />
      </g>
    );
  }
  const c = RIBBON_COLORS[id] || RIBBON_COLORS.red;
  return (
    <g>
      <path d="M93 25 86 46l6-3 3 6zM99 25l7 21-6-3-3 6z" fill={c} opacity=".85" />
      <path d="M96 22 76 10v24z" fill={c} />
      <path d="M96 22l20-12v24z" fill={c} />
      <circle cx="96" cy="22" r="5.5" fill={c} stroke="#fff" strokeWidth="2" />
    </g>
  );
}

// Hats and glasses are drawn level, then tilted with the note head.
function Hat({ id }) {
  switch (id) {
    case 'party':
      return (
        <g>
          <path d="M36 66 52 22 68 66z" fill="#8E6CFF" />
          <path d="M42 52h20M47 38h10" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="52" cy="21" r="6" fill="#FFD23F" />
        </g>
      );
    case 'bow':
      return (
        <g>
          <path d="M52 62 34 50v24zM52 62l18-12v24z" fill="#FF8FB1" stroke="#E0457A" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="52" cy="62" r="6" fill="#E0457A" />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d="M22 70c0-22 14-30 30-30s30 8 30 30z" fill="#54A0FF" />
          <path d="M66 68h28c2 4 0 7-4 7H66z" fill="#2E7DD6" />
          <circle cx="52" cy="40" r="4" fill="#2E7DD6" />
        </g>
      );
    case 'crown':
      return <path d="M30 66 34 38 44 54 52 32 60 54 70 38 74 66z" fill="#FFD23F" stroke="#E0A100" strokeWidth="3" strokeLinejoin="round" />;
    case 'headphones':
      return (
        <g>
          <path d="M14 96c0-40 18-56 38-56s38 16 38 56" stroke={STEM} strokeWidth="7" fill="none" strokeLinecap="round" />
          <rect x="6" y="84" width="16" height="26" rx="7" fill="#FF5E7E" />
          <rect x="82" y="84" width="16" height="26" rx="7" fill="#FF5E7E" />
        </g>
      );
    case 'bunny':
      return (
        <g>
          <ellipse cx="40" cy="40" rx="9" ry="26" fill="#fff" stroke="#E4E0F5" strokeWidth="3" />
          <ellipse cx="64" cy="40" rx="9" ry="26" fill="#fff" stroke="#E4E0F5" strokeWidth="3" />
          <ellipse cx="40" cy="42" rx="4" ry="17" fill="#FFB3C7" />
          <ellipse cx="64" cy="42" rx="4" ry="17" fill="#FFB3C7" />
        </g>
      );
    case 'wizard':
      return (
        <g>
          <path d="M26 68 50 6 78 68z" fill="#3B2A80" />
          <path d="M20 68h64" stroke="#3B2A80" strokeWidth="7" strokeLinecap="round" />
          <path d="M50 30l2.5 5 5.5.5-4 4 1 5.5-5-2.8-5 2.8 1-5.5-4-4 5.5-.5z" fill="#FFD23F" />
        </g>
      );
    default:
      return null;
  }
}

function Glasses({ id }) {
  if (id === 'sun') {
    return (
      <g>
        <rect x="25" y="90" width="26" height="17" rx="7" fill={INK} />
        <rect x="55" y="90" width="26" height="17" rx="7" fill={INK} />
        <path d="M51 96h4" stroke={INK} strokeWidth="3" />
        <path d="M30 94h7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      </g>
    );
  }
  if (id === 'stars' || id === 'hearts') {
    const star = (cx) => `M${cx} 85l4 9 10 1-7.5 7 2 10-8.5-5-8.5 5 2-10-7.5-7 10-1z`;
    const heart = (cx) => `M${cx} 113c-12-7-17-13-15-19 2-5 9-6 15 0 6-6 13-5 15 0 2 6-3 12-15 19z`;
    const d = id === 'stars' ? star : heart;
    return (
      <g
        fill={id === 'stars' ? '#FFD23F' : '#FF6B9A'}
        fillOpacity=".4"
        stroke={id === 'stars' ? '#E0A100' : '#C2185B'}
        strokeWidth="3.5"
        strokeLinejoin="round"
      >
        <path d={d(38)} />
        <path d={d(66)} />
      </g>
    );
  }
  if (id === 'round') {
    return (
      <g fill="none" stroke={INK} strokeWidth="3.5">
        <circle cx="38" cy="98" r="11" />
        <circle cx="66" cy="98" r="11" />
        <path d="M49 98h6" />
      </g>
    );
  }
  return null;
}

export default function Melo({ size = 120, mood = 'wave', wear = {} }) {
  const cheer = mood === 'cheer';
  return (
    <svg
      className={`melo${cheer ? ' melo-cheer' : ''}`}
      width={size}
      height={size * 1.3}
      viewBox="-20 -45 150 195"
      role="img"
      aria-label="Melo"
    >
      <ellipse cx="52" cy="146" rx="40" ry="6" fill="#000" opacity=".08" />
      {/* Stem and flag. */}
      <path d="M96 100V-20q22 10 28 34" stroke={STEM} strokeWidth="9" fill="none" strokeLinecap="round" />
      {wear.ribbon && <Ribbon id={wear.ribbon} />}
      <g transform="rotate(-18 52 102)">
        {wear.hat === 'headphones' && <Hat id="headphones" />}
        <ellipse cx="52" cy="102" rx="52" ry="40" fill={BODY} />
        <ellipse cx="30" cy="80" rx="12" ry="7" fill="#fff" opacity=".5" transform="rotate(-20 30 80)" />
        {/* The face. */}
        <circle cx="38" cy="98" r="7" fill={INK} />
        <circle cx="66" cy="98" r="7" fill={INK} />
        <circle cx="40" cy="95" r="2.4" fill="#fff" />
        <circle cx="68" cy="95" r="2.4" fill="#fff" />
        <circle cx="26" cy="110" r="7" fill={SHINE} />
        <circle cx="78" cy="110" r="7" fill={SHINE} />
        {cheer ? (
          <path d="M43 109q9 14 18 0z" fill={INK} />
        ) : (
          <path d="M44 110q8 8 16 0" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
        )}
        {wear.glasses && <Glasses id={wear.glasses} />}
        {wear.hat && wear.hat !== 'headphones' && <Hat id={wear.hat} />}
      </g>
      {cheer && (
        <g fill="#FFD23F">
          <path d="M-6 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
          <path d="M126 70l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#54A0FF" />
          <path d="M8 4l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FF6B8B" />
        </g>
      )}
    </svg>
  );
}
