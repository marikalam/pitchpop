// A little cup of coffee with steam rising from it, shown while the
// practice timer is on a break. The steam is CSS animation (see
// .coffee-steam in App.css) and stays still for people who prefer reduced
// motion.
export default function CoffeeBreak() {
  return (
    <svg className="coffee-break" viewBox="0 -30 120 140" role="img" aria-label="A cup of coffee">
      <g className="coffee-steam" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <path className="coffee-steam-1" d="M42 44c-6-7 6-12 0-20s6-12 0-18" />
        <path className="coffee-steam-2" d="M58 44c-6-7 6-12 0-20s6-12 0-18" />
        <path className="coffee-steam-3" d="M74 44c-6-7 6-12 0-20s6-12 0-18" />
      </g>
      {/* saucer */}
      <ellipse cx="58" cy="100" rx="46" ry="7" fill="#d9c7b8" />
      {/* handle */}
      <path d="M90 62c14 0 18 18 2 22" fill="none" stroke="#e8792f" strokeWidth="7" strokeLinecap="round" />
      {/* cup */}
      <path d="M24 52h68l-6 36c-1 6-6 10-12 10H42c-6 0-11-4-12-10z" fill="#f7a24f" />
      <ellipse cx="58" cy="52" rx="34" ry="6" fill="#6b3f22" />
      <path d="M34 66h48" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
