// Popo, PitchPop's mascot (Popo.jsx), and the outfits a player unlocks with
// stickers (one sticker per day of practice, stickers.js). The outfit a
// player picked is kept on this device.
export const OUTFITS = [
  { id: 'crown', emoji: '👑', name: 'Crown', stickers: 1 },
  { id: 'tophat', emoji: '🎩', name: 'Top hat', stickers: 5 },
  { id: 'shades', emoji: '🕶️', name: 'Shades', stickers: 10 },
  { id: 'bow', emoji: '🎀', name: 'Bow', stickers: 15 },
  { id: 'cap', emoji: '🧢', name: 'Cap', stickers: 20 },
  { id: 'wand', emoji: '🪄', name: 'Wand', stickers: 30 },
];
const KEY = 'pitchpop-popo-outfit-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

// The outfit a player wears: their pick, if they still have enough
// stickers for it.
export function popoOutfit(playerId, stickers) {
  const id = load()[playerId];
  const outfit = OUTFITS.find((o) => o.id === id);
  return outfit && stickers >= outfit.stickers ? outfit.id : null;
}

export function setPopoOutfit(playerId, outfitId) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...load(), [playerId]: outfitId }));
  } catch {
    /* ignore */
  }
}
