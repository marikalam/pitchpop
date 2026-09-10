const SPECTRUM_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black'];

function arcPath(cx, cy, r) {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
}

export default function Rainbow({ colors, activeName, visible }) {
  const ordered = SPECTRUM_ORDER.map((name) => colors.find((c) => c.name === name)).filter(Boolean);

  const cx = 130;
  const cy = 142;
  const bandWidth = 9;
  const spacing = 10;
  const startRadius = 24;
  const maxIndex = ordered.length - 1;

  return (
    <svg
      className={`rainbow${visible ? ' rainbow-show' : ''}`}
      viewBox="0 0 260 150"
      aria-hidden="true"
      focusable="false"
    >
      {ordered.map((color, i) => {
        const r = startRadius + (maxIndex - i) * spacing;
        return (
          <path
            key={color.name}
            d={arcPath(cx, cy, r)}
            stroke={color.hex}
            strokeWidth={bandWidth}
            fill="none"
            strokeLinecap="round"
            className={`rainbow-band${activeName === color.name ? ' rainbow-band-active' : ''}`}
          />
        );
      })}
    </svg>
  );
}
