const SPECTRUM_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black'];

const REAL_RAINBOW = ['#E5473C', '#EF8B3D', '#F0C93D', '#4FAE5C', '#3B7FD9', '#5B4FCF', '#9A4FCF'];

function arcPath(cx, cy, r) {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
}

function Cloud({ cx, cy }) {
  return (
    <g className="rainbow-cloud">
      <circle cx={cx - 15} cy={cy - 3} r={12} />
      <circle cx={cx} cy={cy - 10} r={15} />
      <circle cx={cx + 15} cy={cy - 3} r={12} />
      <circle cx={cx} cy={cy + 4} r={14} />
    </g>
  );
}

export default function Rainbow({ colors, activeName, visible, pretty = false }) {
  const bands = pretty
    ? REAL_RAINBOW.map((hex) => ({ name: hex, hex }))
    : SPECTRUM_ORDER.map((name) => colors.find((c) => c.name === name)).filter(Boolean);

  const cx = 130;
  const cy = 142;
  const bandWidth = pretty ? 11 : 9;
  const spacing = pretty ? 12 : 10;
  const startRadius = 24;
  const maxIndex = bands.length - 1;
  const outerRadius = startRadius + maxIndex * spacing;

  return (
    <svg
      className={`rainbow${visible ? ' rainbow-show' : ''}${pretty ? ' rainbow-pretty' : ''}`}
      viewBox="0 0 260 150"
      aria-hidden="true"
      focusable="false"
    >
      {pretty && (
        <>
          <Cloud cx={cx - outerRadius} cy={cy} />
          <Cloud cx={cx + outerRadius} cy={cy} />
        </>
      )}
      {bands.map((color, i) => {
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
