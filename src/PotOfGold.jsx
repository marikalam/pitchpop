export default function PotOfGold() {
  return (
    <svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true" focusable="false">
      <g className="pot-sparkle">
        <path d="M 39 8 L 40.4 11.6 L 44 13 L 40.4 14.4 L 39 18 L 37.6 14.4 L 34 13 L 37.6 11.6 Z" />
      </g>
      <circle className="pot-coin" cx="16" cy="21" r="6.5" />
      <circle className="pot-coin" cx="24" cy="15" r="7.5" />
      <circle className="pot-coin" cx="32" cy="21" r="6.5" />
      <path className="pot-body" d="M 9 25 L 39 25 L 33.5 42 C 33.5 42 29 44 24 44 C 19 44 14.5 42 14.5 42 Z" />
      <ellipse className="pot-rim" cx="24" cy="25" rx="15" ry="4.5" />
    </svg>
  );
}
