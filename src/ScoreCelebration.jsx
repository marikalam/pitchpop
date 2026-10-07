import { useEffect, useState } from 'react';

// The animation at the top of "All done!", picked by the round's score:
//   90%+    a gold star spinning in, with sparkles and notes flying out
//   70-89%  a rainbow drawing itself, notes floating up
//   50-69%  a sprout growing out of a pot and opening a flower
//   below   a little snail sliding along: slow and steady
// Pure SVG and CSS (see .celebrate-* in App.css); it holds still for
// people who prefer reduced motion.
export function scoreTier(correct, total) {
  const pct = total ? correct / total : 0;
  if (pct >= 0.9) return 'star';
  if (pct >= 0.7) return 'rainbow';
  if (pct >= 0.5) return 'sprout';
  return 'snail';
}

export const TIER_TEXT = {
  star: { title: 'Superstar!', sub: 'Almost every chord right.' },
  rainbow: { title: 'Great job!', sub: 'Your ear is getting stronger.' },
  sprout: { title: 'Nice work!', sub: 'You’re growing, chord by chord.' },
  snail: { title: 'Keep going!', sub: 'Slow and steady: every round helps.' },
};

function Note({ x, y, className }) {
  return (
    <g className={className} transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="10" rx="6" ry="4.5" fill="#3b6fef" transform="rotate(-20 0 10)" />
      <rect x="4.5" y="-12" width="2.4" height="22" rx="1" fill="#3b6fef" />
      <path d="M6.9 -12c6 2 8 6 6 11" stroke="#3b6fef" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Star() {
  const sparkles = [
    [30, 40, '#f4b400'],
    [170, 36, '#e5473c'],
    [24, 120, '#3bb273'],
    [178, 118, '#7a4fd6'],
    [100, 14, '#f7a24f'],
  ];
  return (
    <svg viewBox="0 0 200 160" className="celebrate celebrate-star" role="img" aria-label="A spinning gold star">
      {sparkles.map(([x, y, c], i) => (
        <path
          key={i}
          className={`celebrate-sparkle celebrate-sparkle-${i}`}
          d={`M${x} ${y - 9}l2.5 6.5 6.5 2.5-6.5 2.5-2.5 6.5-2.5-6.5-6.5-2.5 6.5-2.5z`}
          fill={c}
        />
      ))}
      <Note x={40} y={80} className="celebrate-note celebrate-note-0" />
      <Note x={156} y={78} className="celebrate-note celebrate-note-1" />
      <g className="celebrate-star-body">
        <path
          d="M100 30l16.5 33.4 36.9 5.4-26.7 26 6.3 36.7L100 114.2 67 131.5l6.3-36.7-26.7-26 36.9-5.4z"
          fill="#ffc83d"
          stroke="#f0a500"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle cx="88" cy="84" r="4.5" fill="#5a3b00" />
        <circle cx="112" cy="84" r="4.5" fill="#5a3b00" />
        <path d="M89 97q11 10 22 0" stroke="#5a3b00" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const RAINBOW = ['#e5473c', '#f7a24f', '#f4c430', '#3bb273', '#3b6fef', '#7a4fd6'];

function Rainbow() {
  return (
    <svg viewBox="0 0 200 160" className="celebrate celebrate-rainbow" role="img" aria-label="A rainbow drawing itself">
      {RAINBOW.map((c, i) => {
        const r = 78 - i * 10;
        return (
          <path
            key={c}
            className="celebrate-arc"
            style={{ animationDelay: `${i * 0.12}s` }}
            d={`M${100 - r} 130a${r} ${r} 0 0 1 ${2 * r} 0`}
            stroke={c}
            strokeWidth="9"
            fill="none"
            strokeLinecap="round"
            pathLength="1"
          />
        );
      })}
      <g className="celebrate-cloud celebrate-cloud-l">
        <circle cx="26" cy="128" r="12" fill="#fff" />
        <circle cx="40" cy="122" r="14" fill="#fff" />
        <circle cx="52" cy="130" r="10" fill="#fff" />
      </g>
      <g className="celebrate-cloud celebrate-cloud-r">
        <circle cx="148" cy="130" r="10" fill="#fff" />
        <circle cx="160" cy="122" r="14" fill="#fff" />
        <circle cx="174" cy="128" r="12" fill="#fff" />
      </g>
      <Note x={72} y={60} className="celebrate-note celebrate-note-0" />
      <Note x={124} y={52} className="celebrate-note celebrate-note-1" />
    </svg>
  );
}

function Sprout() {
  return (
    <svg viewBox="0 0 200 160" className="celebrate celebrate-sprout" role="img" aria-label="A sprout growing a flower">
      <g className="celebrate-stem">
        <path d="M100 118V64" stroke="#3bb273" strokeWidth="6" strokeLinecap="round" />
        <path className="celebrate-leaf celebrate-leaf-l" d="M100 98c-18 0-28-10-30-22 16 0 27 8 30 22z" fill="#4cc283" />
        <path className="celebrate-leaf celebrate-leaf-r" d="M100 86c16 0 26-9 28-20-14 0-25 7-28 20z" fill="#4cc283" />
        <g className="celebrate-flower">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="100" cy="48" rx="7" ry="12" fill="#f28ab2" transform={`rotate(${a} 100 60)`} />
          ))}
          <circle cx="100" cy="60" r="8" fill="#ffc83d" />
        </g>
      </g>
      <path d="M68 116h64l-8 34H76z" fill="#e8792f" />
      <rect x="62" y="110" width="76" height="12" rx="4" fill="#f7a24f" />
      <path className="celebrate-drop celebrate-drop-0" d="M60 40c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="#7cc3f0" />
      <path className="celebrate-drop celebrate-drop-1" d="M144 30c4 6 6 9 6 12a6 6 0 0 1-12 0c0-3 2-6 6-12z" fill="#7cc3f0" />
    </svg>
  );
}

function Snail() {
  return (
    <svg viewBox="0 0 200 160" className="celebrate celebrate-snail" role="img" aria-label="A little snail sliding along">
      <path d="M10 136h180" stroke="#d9dfee" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
      <g className="celebrate-snail-body">
        <path d="M44 132c0-10 8-14 20-14h70c10 0 16-6 18-16l4 0c2 18-8 30-24 30z" fill="#9fd3a8" />
        <g className="celebrate-antennae">
          <path d="M150 104l-4-22M156 104l6-20" stroke="#7bbd88" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="146" cy="81" r="4" fill="#7bbd88" />
          <circle cx="162" cy="83" r="4" fill="#7bbd88" />
        </g>
        <circle cx="154" cy="112" r="2.6" fill="#2d4a33" />
        <g className="celebrate-shell">
          <circle cx="92" cy="96" r="30" fill="#f7a24f" />
          <path
            d="M92 96m-4 0a4 4 0 1 1 8 0a9 9 0 1 1-17 2a14 14 0 1 1 28-4a20 20 0 1 1-39 6"
            stroke="#c8641c"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </g>
      <Note x={40} y={50} className="celebrate-note celebrate-note-0" />
    </svg>
  );
}

// A cheer for the work, not the score: one picked at random each round.
export const CHEERS = [
  { emoji: '💪', text: 'You stuck with it all the way to the end. That’s hard work!' },
  { emoji: '🎹', text: 'Every note you practiced today counts. Way to show up!' },
  { emoji: '⚡', text: 'Practice is a superpower, and you just used it!' },
  { emoji: '🌟', text: 'Mistakes mean you’re trying. Awesome effort!' },
  { emoji: '🎶', text: 'Your hard work is music to our ears!' },
  { emoji: '🏁', text: 'Round finished! Great focus, great effort, great job!' },
  { emoji: '🚀', text: 'Little by little, practice adds up. Keep it going!' },
  { emoji: '🙌', text: 'You worked hard on that one. Give yourself a high five!' },
  { emoji: '🥁', text: 'Drumroll please… for all that awesome practicing!' },
  { emoji: '🧗', text: 'Tricky ones and all, you kept climbing. Way to go!' },
];

// After a saved practice in Practice Mode.
export const PRACTICE_CHEERS = [
  { emoji: '🎹', text: 'Every minute at the piano makes your fingers stronger. Way to work!' },
  { emoji: '💪', text: 'That was real practice. Your hard work is paying off!' },
  { emoji: '🌱', text: 'Practice is how music grows, and you just watered it!' },
  { emoji: '🏆', text: 'You showed up and did the work. That’s what champions do!' },
  { emoji: '🎶', text: 'Today’s practice is tomorrow’s beautiful music!' },
  { emoji: '🐢', text: 'Slow and steady practice wins every time. Great job!' },
  { emoji: '🚀', text: 'Look at you go! A little practice every day really adds up.' },
  { emoji: '🙌', text: 'You did it! Give yourself a big high five for practicing.' },
];

// `say`, when given, reads the cheer out loud (it gets the cheer's text):
// right away if `sayNow`, and again from the speaker button.
export function EffortCheer({ cheers = CHEERS, say, sayNow = false }) {
  const [cheer] = useState(() => cheers[Math.floor(Math.random() * cheers.length)]);
  useEffect(() => {
    if (say && sayNow) say(cheer.text);
    // Only when it first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="cheer-card" role="status">
      <span className="cheer-burst" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} />
        ))}
      </span>
      <span className="cheer-emoji" aria-hidden="true">
        {cheer.emoji}
      </span>
      <span className="cheer-text">{cheer.text}</span>
      {say && (
        <button className="cheer-hear" onClick={() => say(cheer.text)} aria-label="Hear it">
          🔊
        </button>
      )}
    </div>
  );
}

const BY_TIER = { star: Star, rainbow: Rainbow, sprout: Sprout, snail: Snail };

export default function ScoreCelebration({ tier }) {
  const Art = BY_TIER[tier] || Rainbow;
  return <Art />;
}
