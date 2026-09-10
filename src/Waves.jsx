export default function Waves() {
  return (
    <svg
      className="waves"
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0,150 C 220,90 460,190 720,140 C 980,90 1220,190 1440,140 L1440,320 L0,320 Z"
        fill="var(--wave-1)"
      />
      <path
        d="M0,200 C 240,160 480,230 720,195 C 960,160 1200,230 1440,195 L1440,320 L0,320 Z"
        fill="var(--wave-2)"
      />
      <path
        d="M0,245 C 260,275 500,210 720,240 C 940,270 1180,205 1440,235 L1440,320 L0,320 Z"
        fill="var(--wave-3)"
      />
    </svg>
  );
}
