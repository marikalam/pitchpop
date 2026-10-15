import { claimLivePractice, getLivePractice } from './cloud.js';
import { keepsRecords } from './records.js';

// One practice per player across the family's phones. The practice going
// on is kept in the account with the phone it's on (supabase/sync_all.sql),
// so:
//  - another phone can't start a second practice for that player; it sees
//    "Maddie is practicing on another phone · 12 min" instead,
//  - and can move it over ("Move it to this phone"): the timer carries on
//    there with the same minutes, and the first phone lets it go.
// Each practice has an id. Ending it leaves { id, status: 'idle' } behind,
// so a phone coming back still showing that practice knows it's over.
// Offline, a practice just runs on the phone; it's sent when the internet
// is back.
const PRACTICE_KEY = 'pitchpop-practice-v1';
const DEVICE_KEY = 'pitchpop-device-v1';
// What this phone last put in the account: { profileId, id, status }.
const OWNED_KEY = 'pitchpop-live-owned-v1';
// A practice nobody has touched for this long is treated as over (a phone
// that was lost or reset).
const STALE_MS = 12 * 60 * 60 * 1000;

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function deviceId() {
  let id = read(DEVICE_KEY, null);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    write(DEVICE_KEY, id);
  }
  return id;
}

export const newPracticeId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const isOn = (status) => status === 'running' || status === 'paused';
const liveStatus = (status) => (status === 'running' ? 'running' : status === 'paused' || status === 'tooShort' ? 'paused' : 'idle');

function isActiveElsewhere(live) {
  if (!live || live.device === deviceId() || !isOn(live.status)) return false;
  const age = Date.now() - Date.parse(live.updatedAt || 0);
  return !(age > STALE_MS);
}

// Players with a practice going on another phone: { profileId: live }.
const elsewhere = {};

export function practiceElsewhere(profileId) {
  return elsewhere[profileId] || null;
}

function setElsewhere(profileId, live) {
  const next = isActiveElsewhere(live) ? live : null;
  const before = elsewhere[profileId] || null;
  if (next) elsewhere[profileId] = next;
  else delete elsewhere[profileId];
  if (JSON.stringify(before) !== JSON.stringify(next)) {
    window.dispatchEvent(new CustomEvent('pitchpop-live-changed', { detail: profileId }));
  }
}

// This phone's practice stops without being saved: it moved to (or was
// ended on) another phone. PracticeMode reloads and says so.
function letGo(reason) {
  const p = read(PRACTICE_KEY, {});
  write(PRACTICE_KEY, { status: 'idle', startedAt: null, elapsedBefore: 0, count: 0, profileId: p.profileId ?? null });
  write(OWNED_KEY, null);
  window.dispatchEvent(new CustomEvent('pitchpop-practice-moved', { detail: reason }));
  window.dispatchEvent(new Event('pitchpop-practice-idle'));
}

let dirty = true;
let busy = false;

// Puts this phone's practice in the account (and lets go of one it had
// before), then checks what the account says.
export async function pushPractice() {
  if (!keepsRecords()) return;
  if (busy) {
    dirty = true;
    return;
  }
  busy = true;
  dirty = false;
  try {
    const me = deviceId();
    const p = read(PRACTICE_KEY, {});
    // A practice started before practices had ids gets one now.
    if (p.profileId && !p.id && isOn(liveStatus(p.status))) {
      p.id = newPracticeId();
      write(PRACTICE_KEY, p);
    }
    const owned = read(OWNED_KEY, null);
    // A practice this phone had put in the account and doesn't have now
    // (ended, or switched player): mark it over.
    if (owned && isOn(owned.status) && (owned.profileId !== p.profileId || owned.id !== p.id || !isOn(liveStatus(p.status)))) {
      const live = await claimLivePractice(owned.profileId, me, { id: owned.id, status: 'idle' }, false);
      if (live === undefined) throw new Error('offline');
      write(OWNED_KEY, null);
      setElsewhere(owned.profileId, live);
    }
    if (!p.profileId || !p.id || !isOn(liveStatus(p.status))) return;
    const state = { id: p.id, status: liveStatus(p.status), startedAt: p.startedAt, elapsedBefore: p.elapsedBefore, count: p.count || 0 };
    // First check it wasn't moved or ended elsewhere while this phone was away.
    const current = await getLivePractice(p.profileId);
    if (current === undefined) throw new Error('offline');
    if (current && current.id === p.id && current.device !== me) {
      letGo(isOn(current.status) ? 'moved' : 'ended');
      setElsewhere(p.profileId, current);
      return;
    }
    const live = await claimLivePractice(p.profileId, me, state, false);
    if (live === undefined) throw new Error('offline');
    if (live && live.device !== me && isActiveElsewhere(live)) {
      // Someone else is already practicing as this player: this one stops.
      letGo('elsewhere');
    } else {
      write(OWNED_KEY, { profileId: p.profileId, id: p.id, status: state.status });
    }
    setElsewhere(p.profileId, live);
  } catch {
    dirty = true;
  } finally {
    busy = false;
  }
}

// Looks at the account: is this player practicing on another phone, and
// is this phone's practice still its own?
export async function checkPractice(profileIds) {
  if (!keepsRecords()) return;
  if (dirty) await pushPractice();
  const p = read(PRACTICE_KEY, {});
  const ids = [...new Set([...profileIds, p.profileId].filter(Boolean))];
  for (const id of ids) {
    const live = await getLivePractice(id);
    if (live === undefined) return;
    if (id === p.profileId && p.id && isOn(liveStatus(p.status)) && live && live.id === p.id && live.device !== deviceId()) {
      letGo(isOn(live.status) ? 'moved' : 'ended');
    }
    setElsewhere(id, live);
  }
}

// Brings a practice from another phone to this one: the same practice
// (same minutes so far) carries on here.
export async function takePracticeHere(profileId) {
  const live = elsewhere[profileId];
  if (!live) return false;
  const p = { status: live.status === 'running' ? 'running' : 'paused', startedAt: live.startedAt, elapsedBefore: live.elapsedBefore || 0, count: live.count || 0, profileId, id: live.id };
  const result = await claimLivePractice(profileId, deviceId(), { id: p.id, status: p.status, startedAt: p.startedAt, elapsedBefore: p.elapsedBefore, count: p.count }, true);
  if (!result || result.device !== deviceId()) return false;
  write(PRACTICE_KEY, p);
  write(OWNED_KEY, { profileId, id: p.id, status: p.status });
  setElsewhere(profileId, result);
  window.dispatchEvent(new Event('pitchpop-practice-idle'));
  return true;
}

// Keeps it up to date while signed in: on every change to the practice,
// every 20 seconds while PitchPop is open, when it comes back to the
// screen and when the internet comes back. Returns a function to stop.
export function startLivePractice(getProfileIds) {
  let timer = null;
  const check = () => document.visibilityState !== 'hidden' && checkPractice(getProfileIds());
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(pushPractice, 400);
  };
  window.addEventListener('pitchpop-practice-changed', onChange);
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', check);
  const poll = setInterval(check, 20000);
  check();
  return () => {
    clearTimeout(timer);
    clearInterval(poll);
    window.removeEventListener('pitchpop-practice-changed', onChange);
    window.removeEventListener('online', check);
    document.removeEventListener('visibilitychange', check);
  };
}
