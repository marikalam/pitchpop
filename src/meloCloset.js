import { pendingStickers, playerStickers } from './stickerStore.js';
import { loadRoundHistory } from './roundHistory.js';

// Melo's Closet: hats, glasses and ribbons for Melo, PitchPop's mascot
// (Melo.jsx). Like MathPop's Pip's Closet, hats, glasses and two special
// ribbons unlock as the sticker book fills up (a sticker for every
// finished round); nothing is spent. And each chord color has a ribbon of
// its own color that unlocks when the player has mastered that color by
// ear (MASTERED: 90% right over their recent rounds), so the best things
// to wear come from listening. Kept on this device, per player:
// { seen: [item ids already tried on], wear: { hat, glasses, ribbon } }.
const KEY = 'pitchpop-melo-closet-v1';

// Stickers needed: [id, kind, name, stickers].
const STICKER_ITEMS = [
  ['party', 'hat', 'party hat', 0],
  ['round', 'glasses', 'round glasses', 0],
  ['bow', 'hat', 'bow', 2],
  ['stars', 'glasses', 'star glasses', 3],
  ['cap', 'hat', 'baseball cap', 4],
  ['crown', 'hat', 'crown', 7],
  ['sun', 'glasses', 'sunglasses', 9],
  ['headphones', 'hat', 'headphones', 11],
  ['bunny', 'hat', 'bunny ears', 13],
  ['hearts', 'glasses', 'heart glasses', 15],
  ['wizard', 'hat', 'wizard hat', 18],
  ['rainbow', 'ribbon', 'rainbow ribbon', 21],
  ['gold', 'ribbon', 'gold ribbon', 25],
].map(([id, kind, name, need]) => ({ id, kind, name, need }));

// A ribbon for each chord color, in the order they're learned.
const COLOR_ORDER = ['red', 'yellow', 'blue', 'black', 'green', 'orange', 'purple', 'pink', 'brown', 'light green', 'beige'];
const COLOR_ITEMS = COLOR_ORDER.map((c) => ({ id: c, kind: 'ribbon', name: `${c} ribbon`, color: c }));

export const CLOSET_ITEMS = [...STICKER_ITEMS, ...COLOR_ITEMS];
export const CLOSET_KINDS = [
  ['hat', 'Hats'],
  ['glasses', 'Glasses'],
  ['ribbon', 'Ribbons'],
];
export const itemById = (id) => CLOSET_ITEMS.find((i) => i.id === id);

const MASTERED = 0.9;
const MIN_TRIES = 10;
const RECENT_ROUNDS = 10;

export function stickerCount(playerId) {
  return playerStickers(playerId).length + pendingStickers(playerId);
}

// How a color is going: { right, total } over the player's last rounds.
export function colorScore(playerId, color) {
  const rounds = (loadRoundHistory()[playerId] || []).slice(-RECENT_ROUNDS);
  let right = 0;
  let total = 0;
  rounds.forEach((r) => {
    const c = r.colors?.[color];
    if (c) {
      right += c.right;
      total += c.total;
    }
  });
  return { right, total };
}

export function mastered(playerId, color) {
  const { right, total } = colorScore(playerId, color);
  return total >= MIN_TRIES && right / total >= MASTERED;
}

export function isUnlocked(playerId, item, count = stickerCount(playerId)) {
  return item.color ? mastered(playerId, item.color) : count >= item.need;
}

function readAll() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function save(playerId, closet) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [playerId]: closet }));
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event('pitchpop-closet-changed'));
}

export function closetFor(playerId) {
  return readAll()[playerId] || { seen: STICKER_ITEMS.filter((i) => !i.need).map((i) => i.id), wear: {} };
}

// Puts an unlocked item on (or takes it off if it's on). The first time,
// it's new: returns { closet, isNew }.
export function tryOn(playerId, id) {
  const c = closetFor(playerId);
  const item = itemById(id);
  if (!item || !isUnlocked(playerId, item)) return { closet: c, isNew: false };
  const isNew = !c.seen.includes(id);
  const wear = { ...c.wear, [item.kind]: c.wear[item.kind] === id && !isNew ? null : id };
  const next = { ...c, wear, seen: isNew ? [...c.seen, id] : c.seen };
  save(playerId, next);
  return { closet: next, isNew };
}

// Unlocked but not tried on yet (the home page's NEW badge).
export function newItems(playerId) {
  const c = closetFor(playerId);
  const n = stickerCount(playerId);
  return CLOSET_ITEMS.filter((i) => isUnlocked(playerId, i, n) && !c.seen.includes(i.id));
}

// The next sticker item to unlock.
export function nextItem(playerId) {
  const n = stickerCount(playerId);
  return STICKER_ITEMS.find((i) => n < i.need) || null;
}
