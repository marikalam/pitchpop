import { BOOK_SIZE, STICKERS } from './stickers.js';
import { keepsRecords } from './records.js';
import { loadStreakDays } from './streak.js';

// Each player's sticker book: a sticker for every finished Pitch Practice
// round, NoteSpeller round and saved practice, no limit. The player picks
// which one; each sticker appears once per page of BOOK_SIZE, then a new
// page starts. Only signed-in families keep stickers (records.js).
//
// Saved per player: [{ index, at, from }] ('pitch' | 'notes' | 'practice';
// `at` is when it was stuck in, and tells stickers apart when phones sync).
// Stickers earned but not yet picked wait in PENDING_KEY (this phone only).
const STICKERS_KEY = 'pitchpop-stickers-v1';
const PENDING_KEY = 'pitchpop-sticker-pending-v1';
// Before stickers came with every activity, players got one sticker per
// day of Pitch Practice (streak days), some chosen (this key). Those days
// stay in the book (the last day of that only if its sticker was chosen).
const OLD_PICKS_KEY = 'pitchpop-sticker-picks-v1';
const OLD_LAST_DAY = '2026-10-14';

function read(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: nothing more to do.
  }
}

function oldStickers(playerId) {
  const picks = read(OLD_PICKS_KEY)[playerId] || {};
  const days = [...new Set(loadStreakDays()[playerId] || [])].filter((d) => d < OLD_LAST_DAY || (d === OLD_LAST_DAY && picks[d] != null)).sort();
  return days.map((day, i) => ({ index: picks[day] ?? i % BOOK_SIZE, at: `${day}T00:00:00.000Z`, from: 'pitch' }));
}

// The stickers saved for a player (synced with the family account).
export function savedStickers(playerId) {
  return read(STICKERS_KEY)[playerId] || [];
}

// Every sticker in a player's book, oldest first.
export function playerStickers(playerId) {
  return [...oldStickers(playerId), ...savedStickers(playerId)].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
}

// The page a sticker is being added to (`adding`) or the last page with
// stickers: the stickers on it and the ones still free to pick.
export function bookPage(stickers, adding = false) {
  const n = stickers.length;
  const page = adding ? Math.floor(n / BOOK_SIZE) : Math.max(0, Math.floor((n - 1) / BOOK_SIZE));
  const onPage = stickers.slice(page * BOOK_SIZE, (page + 1) * BOOK_SIZE);
  const used = new Set(onPage.map((s) => s.index));
  return { page, onPage, total: n, free: STICKERS.map((_, i) => i).filter((i) => !used.has(i)) };
}

export function pendingStickers(playerId) {
  return read(PENDING_KEY)[playerId] || 0;
}

// A finished activity: one more sticker waiting to be picked.
export function earnSticker(playerId) {
  if (!keepsRecords()) return;
  const pending = read(PENDING_KEY);
  write(PENDING_KEY, { ...pending, [playerId]: (pending[playerId] || 0) + 1 });
  window.dispatchEvent(new Event('pitchpop-stickers-changed'));
}

// Sticks the picked sticker in the book (using up one that was waiting).
export function addSticker(playerId, index, from) {
  if (!keepsRecords()) return;
  const all = read(STICKERS_KEY);
  write(STICKERS_KEY, { ...all, [playerId]: [...(all[playerId] || []), { index, at: new Date().toISOString(), from }] });
  const pending = read(PENDING_KEY);
  write(PENDING_KEY, { ...pending, [playerId]: Math.max(0, (pending[playerId] || 0) - 1) });
  window.dispatchEvent(new Event('pitchpop-stickers-changed'));
  // historySync.js sends it to the family account.
  window.dispatchEvent(new CustomEvent('pitchpop-history-changed', { detail: playerId }));
}

// Takes in the synced list from the family account (keeping any sticker
// stuck in here while it was on its way).
export function replaceSavedStickers(playerId, list) {
  const all = read(STICKERS_KEY);
  const byTime = new Map([...(all[playerId] || []), ...list].map((s) => [s.at, s]));
  const merged = [...byTime.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  write(STICKERS_KEY, { ...all, [playerId]: merged });
  window.dispatchEvent(new Event('pitchpop-stickers-changed'));
}
