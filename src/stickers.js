// Sticker rewards: a player earns one sticker for each day they finish a
// Pitch Practice round (their streak days, so stickers follow the family
// account to every device). The book fills in this order, then starts a
// new page. Each sticker is a little drawing (SVG, drawn here, not emoji)
// on a 100x100 canvas; Sticker.jsx adds the white die-cut edge and shadow.
const eyes = (x1, x2, y, r = 3.2) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="#3a2e3f"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#3a2e3f"/><circle cx="${x1 + 1}" cy="${y - 1.2}" r="1" fill="#fff"/><circle cx="${x2 + 1}" cy="${y - 1.2}" r="1" fill="#fff"/>`;
const smile = (x, y, w = 5) => `<path d="M${x - w} ${y} q${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="#3a2e3f" stroke-width="2.4" stroke-linecap="round"/>`;
const blush = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="4.5" ry="2.8" fill="#ff8fb1" opacity=".55"/><ellipse cx="${x2}" cy="${y}" rx="4.5" ry="2.8" fill="#ff8fb1" opacity=".55"/>`;
export const STICKERS = [
  ['Rainbow', `
    ${['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].map((c, i) => `<path d="M${14 + i * 5} 66 a${36 - i * 5} ${36 - i * 5} 0 0 1 ${72 - i * 10} 0" fill="none" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/>`).join('')}
    <g fill="#fff"><circle cx="16" cy="68" r="8"/><circle cx="26" cy="70" r="7"/><circle cx="8" cy="71" r="5"/><circle cx="84" cy="68" r="8"/><circle cx="74" cy="70" r="7"/><circle cx="92" cy="71" r="5"/></g>
    <g fill="#e7ecf7"><rect x="4" y="71" width="30" height="6" rx="3"/><rect x="66" y="71" width="30" height="6" rx="3"/></g>`],
  ['Heart', `
    <path d="M50 84 C20 64 12 46 18 33 C24 20 42 19 50 32 C58 19 76 20 82 33 C88 46 80 64 50 84Z" fill="#ff6b9a"/>
    <path d="M50 84 C20 64 12 46 18 33 C21 27 26 24 32 23 C24 30 22 44 34 58 C40 65 46 70 50 73Z" fill="#ff4f86" opacity=".5"/>
    <ellipse cx="31" cy="34" rx="6" ry="4" transform="rotate(-35 31 34)" fill="#fff" opacity=".8"/>`],
  ['Star', `
    <path d="M50 12 L60 37 L87 38 L66 55 L73 82 L50 67 L27 82 L34 55 L13 38 L40 37Z" fill="#ffd43b" stroke="#ffc107" stroke-width="5" stroke-linejoin="round"/>
    ${eyes(43, 57, 48, 2.8)}${smile(50, 55, 3.5)}${blush(37, 63, 55)}`],
  ['Strawberry', `
    <path d="M50 88 C28 80 18 60 22 46 C26 34 40 32 50 36 C60 32 74 34 78 46 C82 60 72 80 50 88Z" fill="#ff5c6c"/>
    ${[[36, 52], [50, 48], [64, 52], [42, 64], [58, 64], [50, 76], [32, 64], [68, 64]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.6" ry="2.4" fill="#ffe08a"/>`).join('')}
    <path d="M50 38 L38 26 L46 31 L44 18 L50 29 L56 18 L54 31 L62 26Z" fill="#51cf66" stroke="#40c057" stroke-width="2" stroke-linejoin="round"/>`],
  ['Cupcake', `
    <path d="M28 56 L72 56 L66 86 L34 86Z" fill="#74c0fc"/>
    <g stroke="#4dabf7" stroke-width="3"><line x1="40" y1="58" x2="42" y2="84"/><line x1="50" y1="58" x2="50" y2="84"/><line x1="60" y1="58" x2="58" y2="84"/></g>
    <path d="M24 58 C18 50 26 40 34 42 C34 30 48 26 52 34 C58 26 72 32 68 42 C78 42 82 52 76 58Z" fill="#ffc9de"/>
    <circle cx="52" cy="24" r="6" fill="#ff4d6d"/><path d="M52 18 q2 -6 7 -7" stroke="#2b8a3e" stroke-width="2" fill="none"/>
    <g fill="#fff"><rect x="36" y="46" width="5" height="2" rx="1" transform="rotate(30 38 47)"/><rect x="56" y="44" width="5" height="2" rx="1" transform="rotate(-25 58 45)"/></g>
    <g fill="#ffd43b"><rect x="46" y="50" width="5" height="2" rx="1" transform="rotate(-10 48 51)"/><rect x="64" y="51" width="5" height="2" rx="1" transform="rotate(40 66 52)"/></g>`],
  ['Ice cream', `
    <path d="M34 50 L66 50 L50 90Z" fill="#f4b46a"/>
    <path d="M38 56 L62 56 M42 66 L58 66 M46 76 L54 76" stroke="#e09644" stroke-width="2.5"/>
    <circle cx="50" cy="38" r="17" fill="#ffb3d1"/><circle cx="38" cy="47" r="9" fill="#ffb3d1"/><circle cx="62" cy="47" r="9" fill="#ffb3d1"/>
    <path d="M36 44 q4 8 8 0 q4 8 8 0 q4 8 8 0" fill="none" stroke="#ff8cba" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="18" r="5" fill="#ff4d6d"/><ellipse cx="44" cy="31" rx="4" ry="2.5" fill="#fff" opacity=".7"/>`],
  ['Balloon', `
    <path d="M50 70 q-4 8 2 14 q5 5 -1 10" stroke="#868e96" stroke-width="2" fill="none"/>
    <ellipse cx="50" cy="40" rx="24" ry="28" fill="#9775fa"/>
    <path d="M46 68 L54 68 L50 73Z" fill="#7950f2"/>
    <ellipse cx="40" cy="28" rx="6" ry="9" transform="rotate(25 40 28)" fill="#fff" opacity=".6"/>`],
  ['Kitty', `
    <path d="M22 40 L26 14 L44 30Z M78 40 L74 14 L56 30Z" fill="#ffa94d"/>
    <path d="M27 34 L28 21 L37 29Z M73 34 L72 21 L63 29Z" fill="#ffc9de"/>
    <ellipse cx="50" cy="54" rx="32" ry="28" fill="#ffa94d"/>
    <path d="M50 27 L46 37 M50 27 L54 37" stroke="#f08c00" stroke-width="3" stroke-linecap="round"/>
    ${eyes(39, 61, 52)}${blush(31, 69, 62)}
    <g opacity="0">
      <rect x="33" y="47" width="12" height="10" fill="#ffa94d"/><rect x="55" y="47" width="12" height="10" fill="#ffa94d"/>
      <path d="M35 52 q4 3 8 0 M57 52 q4 3 8 0" fill="none" stroke="#3a2e3f" stroke-width="2.2" stroke-linecap="round"/>
      <animate attributeName="opacity" values="0;0;1;0" keyTimes="0;0.9;0.94;1" dur="3.5s" repeatCount="indefinite"/>
    </g>
    <path d="M47 60 L53 60 L50 63Z" fill="#ff6b9a"/><path d="M44 66 q3 3 6 0 q3 3 6 0" fill="none" stroke="#3a2e3f" stroke-width="2.2" stroke-linecap="round"/>`],
  ['Bunny', `
    <ellipse cx="38" cy="26" rx="8" ry="20" fill="#f1f3f5"/><ellipse cx="62" cy="26" rx="8" ry="20" fill="#f1f3f5"/>
    <ellipse cx="38" cy="27" rx="4" ry="14" fill="#ffc9de"/><ellipse cx="62" cy="27" rx="4" ry="14" fill="#ffc9de"/>
    <ellipse cx="50" cy="60" rx="30" ry="26" fill="#f8f9fa"/>
    ${eyes(40, 60, 58)}${blush(32, 68, 66)}
    <ellipse cx="50" cy="65" rx="3" ry="2.2" fill="#ff6b9a"/>${smile(50, 69, 3)}`],
  ['Bear', `
    <circle cx="26" cy="30" r="11" fill="#b07d56"/><circle cx="74" cy="30" r="11" fill="#b07d56"/>
    <circle cx="26" cy="30" r="6" fill="#e0b48c"/><circle cx="74" cy="30" r="6" fill="#e0b48c"/>
    <circle cx="50" cy="55" r="30" fill="#b07d56"/>
    <ellipse cx="50" cy="65" rx="13" ry="10" fill="#e8c6a2"/>
    ${eyes(39, 61, 51)}<ellipse cx="50" cy="61" rx="4.5" ry="3.2" fill="#3a2e3f"/>${smile(50, 66, 3.5)}${blush(30, 70, 62)}`],
  ['Whale', `
    <path d="M14 58 C14 38 36 32 54 36 C70 39 80 50 80 58 C88 52 92 44 94 40 C96 52 92 64 82 66 C72 80 30 82 18 72 C15 68 14 63 14 58Z" fill="#4dabf7"/>
    <path d="M18 66 C30 76 62 76 76 66 C70 74 34 80 18 66Z" fill="#a5d8ff"/>
    ${eyes(30, 30, 52)}${blush(26, 26, 60)}
    <path d="M44 30 q-4 -10 -10 -12 M44 30 q0 -12 4 -16 M44 30 q6 -8 12 -8" stroke="#74c0fc" stroke-width="3" fill="none" stroke-linecap="round"/>`],
  ['Butterfly', `
    <ellipse cx="32" cy="38" rx="18" ry="16" fill="#ff8cba"/><ellipse cx="68" cy="38" rx="18" ry="16" fill="#ff8cba"/>
    <ellipse cx="34" cy="66" rx="13" ry="12" fill="#b197fc"/><ellipse cx="66" cy="66" rx="13" ry="12" fill="#b197fc"/>
    <circle cx="30" cy="38" r="6" fill="#fff" opacity=".7"/><circle cx="70" cy="38" r="6" fill="#fff" opacity=".7"/>
    <rect x="46" y="28" width="8" height="48" rx="4" fill="#5c4a72"/>
    <path d="M48 28 q-6 -10 -12 -10 M52 28 q6 -10 12 -10" stroke="#5c4a72" stroke-width="2.4" fill="none" stroke-linecap="round"/>`],
  ['Flower', `
    ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="50" cy="27" rx="12" ry="17" fill="#ffffff" stroke="#ffd8e6" stroke-width="2" transform="rotate(${a} 50 50)"/>`).join('')}
    <circle cx="50" cy="50" r="14" fill="#ffd43b"/>${eyes(45, 55, 48, 2.2)}${smile(50, 53, 2.6)}`],
  ['Doggy', `
    <g>
      <ellipse cx="24" cy="44" rx="10" ry="20" transform="rotate(20 24 44)" fill="#8d5b3c"/>
      <animateTransform attributeName="transform" type="rotate" values="0 30 28;-14 30 28;0 30 28" dur="1.4s" repeatCount="indefinite"/>
    </g>
    <g>
      <ellipse cx="76" cy="44" rx="10" ry="20" transform="rotate(-20 76 44)" fill="#8d5b3c"/>
      <animateTransform attributeName="transform" type="rotate" values="0 70 28;14 70 28;0 70 28" dur="1.4s" repeatCount="indefinite"/>
    </g>
    <circle cx="50" cy="52" r="28" fill="#f5d9b8"/>
    <ellipse cx="62" cy="46" rx="9" ry="8" fill="#c99a6e"/>
    ${eyes(41, 61, 47)}
    <ellipse cx="50" cy="62" rx="12" ry="9" fill="#fff4e6"/>
    <ellipse cx="50" cy="58" rx="5" ry="3.6" fill="#3a2e3f"/>
    <path d="M44 64 q6 5 12 0" fill="none" stroke="#3a2e3f" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M47 66 q3 9 6 0Z" fill="#ff6b9a"/>${blush(33, 67, 58)}`],
  ['Diamond', `
    <path d="M24 38 L36 22 L64 22 L76 38 L50 84Z" fill="#74c0fc"/>
    <path d="M24 38 L76 38 L50 84Z" fill="#4dabf7"/>
    <path d="M36 22 L44 38 L50 22 L56 38 L64 22" fill="none" stroke="#d0ebff" stroke-width="2" stroke-linejoin="round"/>
    <path d="M24 38 L76 38 M44 38 L50 84 L56 38" fill="none" stroke="#a5d8ff" stroke-width="2" stroke-linejoin="round"/>
    <path d="M30 37 L38 25 L42 25 L36 37Z" fill="#fff" opacity=".7"/>
    ${[[18, 20, 0], [82, 26, 0.6], [80, 66, 1.2]].map(([x, y, d]) => `<path d="M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2}Z" fill="#ffd43b" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="1.8s" begin="${d}s" repeatCount="indefinite"/></path>`).join('')}`],
  ['Super hero', `
    <path d="M30 56 L18 90 L82 90 L70 56Z" fill="#ff6b6b"/>
    <path d="M34 60 L66 60 L70 90 L30 90Z" fill="#4dabf7"/>
    <path d="M50 66 L53 73 L60 73 L54 77 L57 84 L50 80 L43 84 L46 77 L40 73 L47 73Z" fill="#ffd43b"/>
    <circle cx="50" cy="38" r="22" fill="#f5d0a9"/>
    <path d="M28 36 C28 18 72 18 72 36 C66 26 56 24 50 26 C42 24 34 28 28 36Z" fill="#5c3d2e"/>
    <path d="M28 38 Q50 30 72 38 L72 46 Q50 40 28 46Z" fill="#4dabf7"/>
    <ellipse cx="41" cy="41" rx="4.6" ry="3.6" fill="#fff"/><ellipse cx="59" cy="41" rx="4.6" ry="3.6" fill="#fff"/>
    <circle cx="41.5" cy="41.5" r="2.2" fill="#3a2e3f"/><circle cx="59.5" cy="41.5" r="2.2" fill="#3a2e3f"/>
    ${smile(50, 50, 4)}${blush(34, 66, 50)}`],
  ['Spider', `
    <line x1="50" y1="2" x2="50" y2="30" stroke="#adb5bd" stroke-width="2"/>
    <g stroke="#7048e8" stroke-width="4" stroke-linecap="round" fill="none">
      <path d="M32 48 q-12 -8 -18 -2"/><path d="M30 56 q-14 -2 -18 6"/><path d="M32 64 q-10 4 -12 14"/><path d="M36 70 q-4 8 -2 16"/>
      <path d="M68 48 q12 -8 18 -2"/><path d="M70 56 q14 -2 18 6"/><path d="M68 64 q10 4 12 14"/><path d="M64 70 q4 8 2 16"/>
    </g>
    <circle cx="50" cy="56" r="22" fill="#9775fa"/>
    <ellipse cx="50" cy="64" rx="12" ry="9" fill="#b197fc"/>
    ${eyes(42, 58, 52, 4)}${smile(50, 61, 4)}${blush(36, 64, 60)}`],
  ['Sunshine', `
    ${Array.from({ length: 8 }, (_, i) => `<rect x="47" y="8" width="6" height="14" rx="3" fill="#ffc107" transform="rotate(${i * 45} 50 50)"/>`).join('')}
    <circle cx="50" cy="50" r="24" fill="#ffd43b"/>${eyes(42, 58, 48)}${smile(50, 56, 4)}${blush(36, 64, 56)}`],
  ['Moon', `
    <path d="M60 14 A36 36 0 1 0 86 64 A28 28 0 1 1 60 14Z" fill="#ffe066"/>
    <path d="M70 22 L72 28 L78 30 L72 32 L70 38 L68 32 L62 30 L68 28Z" fill="#fff3bf"/>
    <circle cx="80" cy="44" r="2.5" fill="#fff3bf"/>
    ${eyes(36, 50, 58, 2.6)}${blush(30, 56, 65)}`],
  ['Piano', `
    <rect x="12" y="28" width="76" height="46" rx="9" fill="#5c4a72"/>
    <rect x="17" y="40" width="66" height="29" rx="4" fill="#fff"/>
    <g stroke="#dee2e6" stroke-width="1.6">${[26.4, 35.8, 45.2, 54.6, 64, 73.4].map((x) => `<line x1="${x}" y1="40" x2="${x}" y2="69"/>`).join('')}</g>
    <g fill="#3a2e3f">${[23, 32.4, 51.2, 60.6, 70].map((x) => `<rect x="${x}" y="40" width="6" height="17" rx="1.5"/>`).join('')}</g>
    <circle cx="24" cy="34" r="2.2" fill="#ffd43b"/><circle cx="32" cy="34" r="2.2" fill="#ff8cba"/><circle cx="40" cy="34" r="2.2" fill="#74c0fc"/>`],
  ['Music notes', `
    <path d="M36 70 L36 26 L76 18 L76 62" fill="none" stroke="#7950f2" stroke-width="6" stroke-linejoin="round"/>
    <path d="M36 26 L76 18 L76 30 L36 38Z" fill="#7950f2"/>
    <ellipse cx="28" cy="72" rx="11" ry="9" transform="rotate(-20 28 72)" fill="#9775fa"/>
    <ellipse cx="68" cy="64" rx="11" ry="9" transform="rotate(-20 68 64)" fill="#9775fa"/>
    <ellipse cx="25" cy="69" rx="3.5" ry="2" transform="rotate(-20 25 69)" fill="#fff" opacity=".7"/>`],
  ['Crown', `
    <path d="M16 72 L20 32 L36 50 L50 24 L64 50 L80 32 L84 72Z" fill="#ffd43b" stroke="#fab005" stroke-width="4" stroke-linejoin="round"/>
    <rect x="16" y="68" width="68" height="12" rx="4" fill="#fab005"/>
    <circle cx="20" cy="30" r="5" fill="#ff8cba"/><circle cx="50" cy="22" r="5" fill="#74c0fc"/><circle cx="80" cy="30" r="5" fill="#69db7c"/>
    <circle cx="50" cy="58" r="5" fill="#ff6b6b"/>`],
  ['Donut', `
    <circle cx="50" cy="52" r="34" fill="#f4b46a"/>
    <path d="M18 48 C18 26 82 26 82 48 C84 58 74 56 70 62 C64 70 56 62 50 66 C44 70 36 62 30 64 C22 66 16 58 18 48Z" fill="#ff8cba"/>
    <circle cx="50" cy="50" r="10" fill="#fff"/>
    ${[[30, 40, '#74c0fc', 20], [44, 34, '#ffd43b', -30], [60, 36, '#69db7c', 10], [70, 46, '#fff', 60], [34, 54, '#fff', -50], [62, 58, '#74c0fc', 30]].map(([x, y, c, r]) => `<rect x="${x}" y="${y}" width="6" height="2.4" rx="1.2" fill="${c}" transform="rotate(${r} ${x + 3} ${y + 1})"/>`).join('')}`],
  ['Rocket', `
    <path d="M50 10 C66 22 70 44 64 66 L36 66 C30 44 34 22 50 10Z" fill="#f8f9fa" stroke="#dee2e6" stroke-width="2"/>
    <path d="M50 10 C58 16 62 22 64 28 L36 28 C38 22 42 16 50 10Z" fill="#ff6b6b"/>
    <circle cx="50" cy="42" r="8" fill="#74c0fc" stroke="#4dabf7" stroke-width="3"/>
    <path d="M36 52 L24 70 L37 66Z M64 52 L76 70 L63 66Z" fill="#ff6b6b"/>
    <g transform="translate(50 66)"><g>
      <path d="M-8 0 Q0 26 8 0Z" fill="#ffa94d"/><path d="M-4 0 Q0 16 4 0Z" fill="#ffd43b"/>
      <animateTransform attributeName="transform" type="scale" values="1 1;1.1 1.35;1 1" dur="0.45s" repeatCount="indefinite"/>
    </g></g>`],
  ['Web hero', `
    <path d="M66 -4 L80 26" stroke="#ced4da" stroke-width="2.4"/>
    <path d="M30 58 L20 92 L80 92 L70 58Z" fill="#7048e8"/>
    <path d="M36 62 L64 62 L68 92 L32 92Z" fill="#9775fa"/>
    <g stroke="#fff" stroke-width="1.6" fill="none" opacity=".9">
      <circle cx="50" cy="76" r="4"/><circle cx="50" cy="76" r="8"/>
      <path d="M50 66 L50 86 M40 76 L60 76 M43 69 L57 83 M57 69 L43 83"/>
    </g>
    <circle cx="50" cy="38" r="22" fill="#f5d0a9"/>
    <path d="M28 34 C28 14 74 14 72 34 C66 24 58 22 50 24 C42 22 34 26 28 34Z" fill="#3b2a20"/>
    <path d="M27 36 Q38 32 50 37 Q62 32 73 36 L72 46 Q62 42 50 46 Q38 42 28 46Z" fill="#e64980"/>
    <ellipse cx="40" cy="40.5" rx="5" ry="4" fill="#fff"/><ellipse cx="60" cy="40.5" rx="5" ry="4" fill="#fff"/>
    <circle cx="40.5" cy="41" r="2.3" fill="#3a2e3f"/><circle cx="60.5" cy="41" r="2.3" fill="#3a2e3f"/>
    ${smile(50, 51, 4)}${blush(33, 67, 51)}
    <path d="M66 62 L79 32" stroke="#7048e8" stroke-width="9" stroke-linecap="round"/>
    <circle cx="80" cy="28" r="5.5" fill="#f5d0a9"/>
    <g transform="translate(26 60)">
      <g stroke="#3a2e3f" stroke-width="1.8" stroke-linecap="round" fill="none">
        <path d="M-5 -2 l-5 -3 M-5 1 l-6 0 M-4 4 l-5 4 M5 -2 l5 -3 M5 1 l6 0 M4 4 l5 4"/>
      </g>
      <circle r="6.5" fill="#495057"/>
      <circle cx="-2.4" cy="-1" r="1.8" fill="#fff"/><circle cx="2.4" cy="-1" r="1.8" fill="#fff"/>
      <circle cx="-2.2" cy="-0.8" r="0.9" fill="#212529"/><circle cx="2.6" cy="-0.8" r="0.9" fill="#212529"/>
    </g>`],
];
export const BOOK_SIZE = STICKERS.length;

// How each sticker moves (App.css .sticker-<move>). Stickers sit still;
// the move plays only when a sticker is stuck into the book.
const MOVES = {
  Heart: 'pulse',
  Star: 'twinkle',
  Balloon: 'float',
  Kitty: 'wiggle',
  Bunny: 'hop',
  Whale: 'rock',
  Butterfly: 'flutter',
  Flower: 'spin',
  Doggy: 'wiggle',
  Diamond: 'pulse',
  'Super hero': 'float',
  Spider: 'dangle',
  Sunshine: 'spin',
  Moon: 'rock',
  'Music notes': 'wiggle',
  Rocket: 'shake',
  Donut: 'spin',
  'Web hero': 'dangle',
};
export const stickerMove = (index) => MOVES[STICKERS[index][0]] || 'bob';

export const stickerName = (index) => STICKERS[index][0];

// A sticker's whole SVG: the drawing with a white border and a soft
// shadow (an SVG filter; `id` keeps each copy's filter its own).
export function stickerSvg(index, id, play = false) {
  // The drawings' own little animations (a blink, sparkles, a flame) run
  // twice when the sticker is played and are left out otherwise.
  const art = play
    ? STICKERS[index][1].replaceAll('repeatCount="indefinite"', 'repeatCount="2"')
    : STICKERS[index][1].replace(/<animate(Transform)?\b[^>]*\/>/g, '');
  return `<svg viewBox="-6 -6 112 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/><feGaussianBlur in="d" stdDeviation="2" result="b"/><feOffset in="b" dy="2.5" result="bo"/><feFlood flood-color="#1d2140" flood-opacity=".22"/><feComposite in2="bo" operator="in" result="sh"/><feMerge><feMergeNode in="sh"/><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#${id})">${art}</g></svg>`;
}
