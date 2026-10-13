import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { dayKey } from './streak.js';

// Daily practice reminders on the iPhone (local notifications, nothing
// sent from a server): one at the chosen time on each of the next 7 days
// (skipping today once everyone has practiced), and a short summary of
// the week on Sunday evening. They're scheduled again whenever PitchPop
// opens or a round ends, so the names, streak and numbers stay current.
const KEY = 'pitchpop-reminder-v1';
const DAILY_IDS = [101, 102, 103, 104, 105, 106, 107];
const WEEKLY_ID = 201;

export const remindersAvailable = () => Capacitor.isNativePlatform();

export function loadReminder() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.time === 'string') return saved;
  } catch {
    /* ignore */
  }
  return { on: false, time: '16:30' };
}

function saveReminder(r) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

// Turns reminders on (asking iOS for permission the first time) or off,
// or changes the time. Returns the saved setting (still off if the
// permission was refused).
export async function setReminder(next, players) {
  if (!remindersAvailable()) return loadReminder();
  if (next.on) {
    const { display } = await LocalNotifications.requestPermissions();
    if (display !== 'granted') next = { ...next, on: false };
  }
  saveReminder(next);
  await scheduleReminders(players);
  return next;
}

const listNames = (names) =>
  names.length <= 1 ? names[0] || '' : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

// players: [{ name, streak, practicedToday, week: { rounds, pctRight } }]
export async function scheduleReminders(players = []) {
  if (!remindersAvailable()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [...DAILY_IDS, WEEKLY_ID].map((id) => ({ id })),
    });
    const r = loadReminder();
    if (!r.on || !players.length) return;
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    const [hour, minute] = r.time.split(':').map(Number);
    const now = new Date();
    const best = [...players].sort((a, b) => b.streak - a.streak)[0];
    const notifications = [];
    DAILY_IDS.forEach((id, i) => {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute);
      if (at <= now) return;
      if (i === 0 && players.every((p) => p.practicedToday)) return;
      // A streak shown for tomorrow and later only holds if today counts.
      const streak = i === 0 || best.practicedToday ? best.streak : 0;
      notifications.push({
        id,
        title: 'PitchPop',
        body:
          `Time for ${listNames(players.map((p) => p.name))}'s pitch practice 🎵` +
          (streak > 1 ? ` ${best.name} is on a ${streak}-day streak!` : ''),
        schedule: { at, allowWhileIdle: true },
      });
    });
    // Sunday at 6 pm: how the week went.
    const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7), 18, 0);
    if (sunday <= now) sunday.setDate(sunday.getDate() + 7);
    const lines = players
      .filter((p) => p.week.rounds)
      .map((p) => `${p.name}: ${p.week.rounds} ${p.week.rounds === 1 ? 'round' : 'rounds'}, ${p.week.pctRight}% right`);
    if (lines.length) {
      notifications.push({
        id: WEEKLY_ID,
        title: 'PitchPop · This week',
        body: `${lines.join(' · ')} 🌈`,
        schedule: { at: sunday, allowWhileIdle: true },
      });
    }
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.warn('Could not schedule reminders', err);
  }
}

