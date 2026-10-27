// PitchPop's own icons, used instead of emoji: flat, rounded drawings in
// the sticker colors (stickers.js), each on a 48 x 48 grid. Shown with
// <Icon name="..." /> (Icon.jsx).
const R = '#ff6b6b',
  O = '#ffa94d',
  Y = '#ffd43b',
  G = '#51cf66',
  B = '#4dabf7',
  P = '#9775fa',
  K = '#1d2140',
  W = '#fff',
  PK = '#f783ac',
  BL = '#3b6fef';

export const ICONS = {
  rainbow: `${[R, Y, B].map((c, i) => `<path d="M${6 + i * 6} 34a${18 - i * 6} ${18 - i * 6} 0 0 1 ${36 - i * 12} 0" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`).join('')}
    <g fill="#e9eefb"><circle cx="8" cy="36" r="5"/><circle cx="14" cy="38" r="4"/><circle cx="40" cy="36" r="5"/><circle cx="34" cy="38" r="4"/></g>`,
  notes: `<path d="M17 12l20-5v24" fill="none" stroke="${BL}" stroke-width="4" stroke-linejoin="round"/><path d="M17 12v22" stroke="${BL}" stroke-width="4"/>
    <ellipse cx="12.5" cy="35" rx="6.5" ry="5" fill="${BL}"/><ellipse cx="32.5" cy="31" rx="6.5" ry="5" fill="${P}"/>`,
  staff: `<rect x="4" y="8" width="40" height="32" rx="8" fill="#eef1ff"/>${[15, 20, 25, 30, 35].map((y) => `<path d="M9 ${y}h30" stroke="#aab3d6" stroke-width="1.6"/>`).join('')}
    <ellipse cx="27" cy="22.5" rx="6" ry="4.3" fill="${P}" transform="rotate(-20 27 22.5)"/><path d="M32.3 21V8" stroke="${P}" stroke-width="2.6" stroke-linecap="round"/>`,
  scales: `<path d="M5 42h12v-9h12v-9h14v18z" fill="#d0ebff"/><path d="M5 42h12v-9h12v-9h14" fill="none" stroke="${B}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="11" cy="35" rx="4.2" ry="3.2" fill="${R}"/><path d="M14.8 34.5V22" stroke="${R}" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="23" cy="26" rx="4.2" ry="3.2" fill="${Y}"/><path d="M26.8 25.5V13" stroke="#e8b400" stroke-width="2.4" stroke-linecap="round"/>
    <ellipse cx="36" cy="17" rx="4.2" ry="3.2" fill="${G}"/><path d="M39.8 16.5V4" stroke="${G}" stroke-width="2.4" stroke-linecap="round"/>`,
  target: `<circle cx="24" cy="24" r="19" fill="${R}"/><circle cx="24" cy="24" r="13" fill="${W}"/><circle cx="24" cy="24" r="7.5" fill="${R}"/><circle cx="24" cy="24" r="2.6" fill="${W}"/>`,
  flame: `<path d="M24 4c3 7 13 12 13 24a13 13 0 0 1-26 0c0-6 3-9 6-12 0 4 2 6 4 6-1-7 1-13 3-18z" fill="${O}"/><path d="M24 22c2 4 7 6 7 12a7 7 0 0 1-14 0c0-4 3-6 4-8 1 2 2 3 3 3 0-2-1-4 0-7z" fill="${Y}"/>`,
  speaker: `<path d="M8 19h7l10-8v26l-10-8H8a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z" fill="${BL}"/><path d="M31 17a9 9 0 0 1 0 14M36 12a16 16 0 0 1 0 24" fill="none" stroke="${B}" stroke-width="3.6" stroke-linecap="round"/>`,
  mute: `<path d="M8 19h7l10-8v26l-10-8H8a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3z" fill="#9aa1bd"/><path d="M32 18l12 12M44 18L32 30" stroke="${R}" stroke-width="3.6" stroke-linecap="round"/>`,
  keys: `<rect x="4" y="10" width="40" height="28" rx="6" fill="${K}"/><g fill="${W}">${[0, 1, 2, 3, 4].map((i) => `<rect x="${7.5 + i * 6.8}" y="14" width="5.8" height="21" rx="1.6"/>`).join('')}</g>
    <g fill="${K}">${[0, 1, 3].map((i) => `<rect x="${11.8 + i * 6.8}" y="14" width="3.4" height="12" rx="1"/>`).join('')}</g>`,
  book: `<path d="M24 12c-5-4-13-4-19-2v28c6-2 14-2 19 2 5-4 13-4 19-2V10c-6-2-14-2-19 2z" fill="${P}"/><path d="M24 12v28" stroke="#7a5be0" stroke-width="2"/>
    <path d="M8 13c5-1 10 0 13 2v20c-3-2-8-3-13-2z" fill="${W}"/><path d="M40 13c-5-1-10 0-13 2v20c3-2 8-3 13-2z" fill="${W}"/>
    <ellipse cx="32" cy="29" rx="3.2" ry="2.4" fill="${P}"/><path d="M35 28.5V19" stroke="${P}" stroke-width="1.8"/>`,
  party: `<path d="M8 42l8-24 14 14z" fill="${O}"/><path d="M11.5 31.5l5 5M13.5 25.5l9 9" stroke="${Y}" stroke-width="2.6"/>
    <circle cx="30" cy="10" r="2.6" fill="${R}"/><circle cx="39" cy="19" r="2.6" fill="${B}"/><rect x="34" y="6" width="4" height="4" rx="1" fill="${G}" transform="rotate(20 36 8)"/><rect x="38" y="28" width="4" height="4" rx="1" fill="${P}" transform="rotate(-20 40 30)"/>
    <path d="M23 15c1-4 4-6 7-5M31 23c3-1 6 0 7 3" fill="none" stroke="${PK}" stroke-width="2.4" stroke-linecap="round"/>`,
  star: `<path d="M24 5l5.6 11.6 12.6 1.7-9.2 8.8 2.3 12.6L24 33.6l-11.3 6.1L15 27.1l-9.2-8.8 12.6-1.7z" fill="${Y}" stroke="${Y}" stroke-width="3" stroke-linejoin="round"/><circle cx="19.5" cy="23" r="1.8" fill="${K}"/><circle cx="28.5" cy="23" r="1.8" fill="${K}"/><path d="M21 28c2 2 4 2 6 0" fill="none" stroke="${K}" stroke-width="1.8" stroke-linecap="round"/>`,
  timer: `<rect x="20" y="3" width="8" height="5" rx="2" fill="${BL}"/><circle cx="24" cy="27" r="17" fill="${B}"/><circle cx="24" cy="27" r="13" fill="${W}"/><path d="M24 27V18" stroke="${K}" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="27" r="2.5" fill="${R}"/>`,
  repeat: `<path d="M10 22a12 12 0 0 1 21-8l3-3v10H24l3.5-3.5A7 7 0 0 0 15 22z" fill="${G}"/><path d="M38 26a12 12 0 0 1-21 8l-3 3V27h10l-3.5 3.5A7 7 0 0 0 33 26z" fill="${G}"/>`,
  notebook: `<rect x="9" y="5" width="30" height="38" rx="5" fill="${O}"/><rect x="15" y="9" width="21" height="30" rx="3" fill="${W}"/><path d="M19 16h13M19 22h13M19 28h9" stroke="#f0c9a0" stroke-width="2.4" stroke-linecap="round"/>
    <g fill="${K}"><circle cx="12" cy="13" r="1.8"/><circle cx="12" cy="24" r="1.8"/><circle cx="12" cy="35" r="1.8"/></g>`,
  gift: `<rect x="7" y="20" width="34" height="22" rx="4" fill="${PK}"/><rect x="5" y="14" width="38" height="9" rx="3" fill="${R}"/><rect x="21" y="14" width="6" height="28" fill="${Y}"/>
    <path d="M24 14c-3-6-11-8-11-3s8 3 11 3zM24 14c3-6 11-8 11-3s-8 3-11 3z" fill="${Y}"/>`,
  chart: `<rect x="5" y="5" width="38" height="38" rx="9" fill="#eef1ff"/><rect x="11" y="27" width="6" height="10" rx="2" fill="${B}"/><rect x="21" y="20" width="6" height="17" rx="2" fill="${G}"/><rect x="31" y="12" width="6" height="25" rx="2" fill="${P}"/>`,
  bell: `<path d="M24 6a12 12 0 0 1 12 12v8l4 6H8l4-6v-8A12 12 0 0 1 24 6z" fill="${Y}"/><circle cx="24" cy="38" r="4.5" fill="${O}"/><rect x="21.5" y="3" width="5" height="5" rx="2.5" fill="${O}"/>`,
  dumbbell: `<rect x="14" y="21" width="20" height="6" rx="3" fill="#9aa1bd"/><rect x="5" y="13" width="8" height="22" rx="3" fill="${BL}"/><rect x="35" y="13" width="8" height="22" rx="3" fill="${BL}"/><rect x="11" y="16" width="5" height="16" rx="2" fill="${B}"/><rect x="32" y="16" width="5" height="16" rx="2" fill="${B}"/>`,
  cap: `<path d="M24 9l20 9-20 9-20-9z" fill="${K}"/><path d="M12 22v9c0 4 6 7 12 7s12-3 12-7v-9l-12 5z" fill="#3a4170"/><path d="M40 19v12" stroke="${Y}" stroke-width="2.4"/><circle cx="40" cy="33" r="3" fill="${Y}"/>`,
  home: `<path d="M24 6L5 22h5v18a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3V22h5z" fill="${R}" stroke="${R}" stroke-width="2" stroke-linejoin="round"/><rect x="19" y="28" width="10" height="15" rx="3" fill="${Y}"/><rect x="13" y="22" width="7" height="6" rx="2" fill="${W}"/>`,
  cup: `<path d="M8 18h26v10a11 11 0 0 1-11 11h-4A11 11 0 0 1 8 28z" fill="${O}"/><path d="M34 21h3a5 5 0 0 1 0 10h-3" fill="none" stroke="${O}" stroke-width="3.6"/><path d="M16 7c-2 3 2 5 0 8M23 7c-2 3 2 5 0 8" fill="none" stroke="#c9cee0" stroke-width="2.6" stroke-linecap="round"/><rect x="6" y="40" width="30" height="4" rx="2" fill="#e3c9a8"/>`,
  calendar: `<rect x="5" y="9" width="38" height="34" rx="7" fill="${W}" stroke="#d6dbee" stroke-width="2"/><path d="M5 16a7 7 0 0 1 7-7h24a7 7 0 0 1 7 7v4H5z" fill="${R}"/><rect x="13" y="4" width="4" height="9" rx="2" fill="${K}"/><rect x="31" y="4" width="4" height="9" rx="2" fill="${K}"/>
    <g fill="${B}"><rect x="11" y="25" width="6" height="5" rx="1.5"/><rect x="21" y="25" width="6" height="5" rx="1.5"/><rect x="31" y="25" width="6" height="5" rx="1.5" fill="${G}"/><rect x="11" y="33" width="6" height="5" rx="1.5"/><rect x="21" y="33" width="6" height="5" rx="1.5"/></g>`,
  teddy: `<circle cx="13" cy="13" r="6" fill="#c8915e"/><circle cx="35" cy="13" r="6" fill="#c8915e"/><circle cx="24" cy="25" r="15" fill="#d9a46e"/><ellipse cx="24" cy="30" rx="7" ry="5.5" fill="#f3d7b0"/>
    <circle cx="18.5" cy="22" r="2" fill="${K}"/><circle cx="29.5" cy="22" r="2" fill="${K}"/><ellipse cx="24" cy="28" rx="2.6" ry="2" fill="${K}"/>`,
  gear: `<path d="M21 4h6l1 5 4 2 4-3 4 4-3 4 2 4 5 1v6l-5 1-2 4 3 4-4 4-4-3-4 2-1 5h-6l-1-5-4-2-4 3-4-4 3-4-2-4-5-1v-6l5-1 2-4-3-4 4-4 4 3 4-2z" fill="#9aa1bd"/><circle cx="24" cy="24" r="7" fill="${W}"/>`,
  speech: `<path d="M8 8h32a5 5 0 0 1 5 5v16a5 5 0 0 1-5 5H22l-9 8v-8H8a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5z" fill="${B}"/><circle cx="16" cy="21" r="2.6" fill="${W}"/><circle cx="24" cy="21" r="2.6" fill="${W}"/><circle cx="32" cy="21" r="2.6" fill="${W}"/>`,
  medal: `<path d="M14 4h8l4 14h-8zM34 4h-8l-4 14h8z" fill="${B}"/><circle cx="24" cy="30" r="13" fill="${Y}"/><circle cx="24" cy="30" r="8.5" fill="${O}"/><path d="M24 25l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="${Y}"/>`,
  headphones: `<path d="M8 30v-6a16 16 0 0 1 32 0v6" fill="none" stroke="${K}" stroke-width="4"/><rect x="5" y="27" width="10" height="15" rx="4" fill="${P}"/><rect x="33" y="27" width="10" height="15" rx="4" fill="${P}"/>`,
  car: `<path d="M10 22l4-9a4 4 0 0 1 4-3h12a4 4 0 0 1 4 3l4 9z" fill="${B}"/><rect x="5" y="20" width="38" height="14" rx="5" fill="${R}"/><circle cx="14" cy="35" r="5" fill="${K}"/><circle cx="34" cy="35" r="5" fill="${K}"/><rect x="9" y="25" width="6" height="4" rx="2" fill="${Y}"/><rect x="33" y="25" width="6" height="4" rx="2" fill="${Y}"/>`,
  phone: `<rect x="13" y="4" width="22" height="40" rx="6" fill="${K}"/><rect x="16" y="9" width="16" height="28" rx="2" fill="${B}"/><rect x="21" y="39.5" width="6" height="2" rx="1" fill="#6b7290"/>`,
  check: `<circle cx="24" cy="24" r="19" fill="${G}"/><path d="M15 24.5l6 6 12-13" fill="none" stroke="${W}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  heart: `<path d="M24 41S6 30 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 13-18 24-18 24z" fill="${P}"/><ellipse cx="15" cy="16" rx="3" ry="2" fill="#c2b0ff" transform="rotate(-30 15 16)"/>`,
  sparkle: `<path d="M20 6c1 9 4 12 13 13-9 1-12 4-13 13-1-9-4-12-13-13 9-1 12-4 13-13z" fill="${Y}"/><path d="M36 26c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6z" fill="${PK}"/>`,
  ear: `<path d="M14 20a11 11 0 0 1 22 0c0 6-4 8-6 11s-1 8-6 8-6-4-6-4" fill="#f3c9a0" stroke="#d99d6c" stroke-width="3" stroke-linecap="round"/><path d="M20 20a5 5 0 0 1 10 0c0 3-3 4-3 6" fill="none" stroke="#d99d6c" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 14a10 10 0 0 1 0 14" fill="none" stroke="${B}" stroke-width="3" stroke-linecap="round"/>`,
  key: `<circle cx="15" cy="24" r="10" fill="${Y}"/><circle cx="15" cy="24" r="4" fill="${W}"/><path d="M24 22h18v5h-4v5h-5v-5h-9z" fill="${Y}"/>`,
  stats: `<rect x="5" y="5" width="38" height="38" rx="9" fill="${BL}"/><rect x="12" y="25" width="5" height="11" rx="2" fill="${W}"/><rect x="21.5" y="16" width="5" height="20" rx="2" fill="${W}"/><rect x="31" y="21" width="5" height="15" rx="2" fill="${W}"/>`,
  family: `<circle cx="14" cy="14" r="6" fill="#d99d6c"/><circle cx="34" cy="14" r="6" fill="#c8915e"/><circle cx="24" cy="26" r="4.6" fill="#f3c9a0"/>
    <path d="M5 40a9 9 0 0 1 18 0z" fill="${B}"/><path d="M25 40a9 9 0 0 1 18 0z" fill="${PK}"/><path d="M17 42a7 7 0 0 1 14 0z" fill="${Y}"/>`,
  sprout: `<path d="M24 42V24" stroke="${G}" stroke-width="4" stroke-linecap="round"/><path d="M24 26C24 16 15 11 7 12c0 9 8 14 17 14z" fill="${G}"/><path d="M24 22c0-8 7-12 15-11 0 7-6 11-15 11z" fill="#8ce99a"/>`,
  palette: `<path d="M24 5a19 19 0 0 0 0 38c3 0 4-2 3-4s0-5 3-5h6a8 8 0 0 0 8-8C44 14 35 5 24 5z" fill="#f3d9b1"/><circle cx="15" cy="20" r="3.4" fill="${R}"/><circle cx="23" cy="13" r="3.4" fill="${Y}"/><circle cx="32" cy="15" r="3.4" fill="${G}"/><circle cx="14" cy="30" r="3.4" fill="${B}"/>`,
  baby: `<circle cx="24" cy="26" r="16" fill="#f3c9a0"/><path d="M24 10c-3 0-4 4-1 5" fill="none" stroke="#c8915e" stroke-width="2.6" stroke-linecap="round"/><circle cx="18" cy="25" r="2" fill="${K}"/><circle cx="30" cy="25" r="2" fill="${K}"/><path d="M20 32c2 2 6 2 8 0" fill="none" stroke="${K}" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="30" r="2.6" fill="#ffb3b3"/><circle cx="34" cy="30" r="2.6" fill="#ffb3b3"/>`,
  science: `<path d="M18 5h12M20 5v13L9 37a4 4 0 0 0 3.5 6h23a4 4 0 0 0 3.5-6L28 18V5" fill="${W}" stroke="#9aa1bd" stroke-width="3" stroke-linejoin="round"/><path d="M13.5 30h21l4 7a2.5 2.5 0 0 1-2.2 3.6H11.7A2.5 2.5 0 0 1 9.5 37z" fill="${G}"/><circle cx="21" cy="35" r="2" fill="${W}"/><circle cx="28" cy="33" r="1.5" fill="${W}"/>`,
  muscle: `<path d="M10 38c-4-8 0-20 6-26 3-3 7-1 6 3l-3 6c4-2 10-2 14 2 5 5 4 13-3 16-6 3-15 3-20-1z" fill="#f3c9a0" stroke="#d99d6c" stroke-width="2.4" stroke-linejoin="round"/>`,
  clipboard: `<rect x="8" y="8" width="32" height="36" rx="5" fill="${B}"/><rect x="12" y="12" width="24" height="28" rx="3" fill="${W}"/><rect x="17" y="4" width="14" height="8" rx="3" fill="${K}"/><path d="M17 21l2.5 2.5L24 19M17 30l2.5 2.5L24 28" fill="none" stroke="${G}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 21h5M27 30h5" stroke="#c9cee0" stroke-width="2.6" stroke-linecap="round"/>`,
  wrench: `<path d="M30 6a10 10 0 0 0-9 14L7 34a4 4 0 0 0 6 6l14-14A10 10 0 0 0 41 17l-6 6-6-2-2-6 6-6a10 10 0 0 0-3-3z" fill="#9aa1bd"/>`,
  wave: `<path d="M14 26V14a3 3 0 0 1 6 0v9-13a3 3 0 0 1 6 0v13-10a3 3 0 0 1 6 0v12-7a3 3 0 0 1 6 0v12c0 9-6 15-14 15-6 0-10-3-13-8l-5-8a3 3 0 0 1 5-3z" fill="#f3c9a0" stroke="#d99d6c" stroke-width="2" stroke-linejoin="round"/>`,
  plus: `<circle cx="24" cy="24" r="19" fill="${G}"/><path d="M24 15v18M15 24h18" stroke="${W}" stroke-width="5" stroke-linecap="round"/>`,
  pause: `<circle cx="24" cy="24" r="19" fill="#9aa1bd"/><rect x="17" y="15" width="5" height="18" rx="2" fill="${W}"/><rect x="26" y="15" width="5" height="18" rx="2" fill="${W}"/>`,
};
