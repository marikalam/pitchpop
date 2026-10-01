import { Capacitor, registerPlugin } from '@capacitor/core';

// The practice timer on the iPhone's Lock Screen (a Live Activity; on
// iPhones with a Dynamic Island it shows there too). The native side is
// ios/App/App/PracticeActivityPlugin.swift and the PracticeTimerWidget
// extension. Only in the iOS app; on the website these do nothing.
export const hasLiveActivity = Capacitor.getPlatform() === 'ios';

const PracticeActivity = hasLiveActivity ? registerPlugin('PracticeActivity') : null;

let shown = null; // what the Lock Screen shows now, to skip repeat calls

// practice: Practice Mode's saved timer state. elapsedMs: time practiced
// so far. staleAtMs: when the idle pause would kick in (the Lock Screen
// then asks "Still practicing?"). playerName may be '' when not known (the
// native side then keeps the current player's name).
export function showPracticeOnLockScreen({ status, elapsedMs, staleAtMs, playerName }) {
  if (!PracticeActivity) return;
  const on = status === 'running' || status === 'paused';
  if (!on) {
    if (shown !== 'off') PracticeActivity.end().catch(() => {});
    shown = 'off';
    return;
  }
  const paused = status === 'paused';
  // A running timer counts on by itself, so only changes need sending.
  const key = paused
    ? `paused:${playerName}:${Math.floor(elapsedMs / 60000)}`
    : `running:${playerName}:${Math.round((Date.now() - elapsedMs) / 1000)}:${staleAtMs}`;
  if (key === shown) return;
  shown = key;
  PracticeActivity.update({ playerName, elapsedMs, paused, staleAtMs }).catch(() => {});
}
