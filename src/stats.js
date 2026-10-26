import { Capacitor } from '@capacitor/core';
import { sendStatEvents } from './cloud.js';

// PitchPop's own usage stats (supabase/pitchpop_stats.sql): anonymous counts
// for the grown-up who runs PitchPop. Nothing identifies a child, a family
// or a device - there's no id at all. The app says only that it was opened
// (and whether that's the first time today, or the first time ever, on
// this device, so the server can count devices without knowing which),
// and when a round is finished: which activity, the language and the score.
// Events that can't be sent (offline) wait here and go with the next one.
const DAY_KEY = 'pitchpop-stats-day-v1';
const INSTALLED_KEY = 'pitchpop-stats-installed-v1';
const QUEUE_KEY = 'pitchpop-stats-queue-v1';
const MAX_QUEUED = 100;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function platform() {
  if (!Capacitor.isNativePlatform()) return 'web';
  return Math.min(window.screen.width, window.screen.height) >= 600 ? 'ipad' : 'iphone';
}

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

let sending = false;
async function send(event) {
  let queue = [];
  try {
    queue = JSON.parse(read(QUEUE_KEY) || '[]');
  } catch {
    /* start over */
  }
  // Old events the server would turn away (more than two days old) are dropped.
  const oldest = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  queue = [...queue.filter((e) => e.day >= oldest), { ...event, day: today(), platform: platform() }].slice(
    -MAX_QUEUED,
  );
  write(QUEUE_KEY, JSON.stringify(queue));
  if (sending) return;
  sending = true;
  if (await sendStatEvents(queue)) {
    // Keep anything added while these were on their way.
    let now = [];
    try {
      now = JSON.parse(read(QUEUE_KEY) || '[]');
    } catch {
      /* ignore */
    }
    write(QUEUE_KEY, JSON.stringify(now.slice(queue.length)));
  }
  sending = false;
}

// Once each time the app starts.
export function statAppOpened() {
  const day = today();
  const firstToday = read(DAY_KEY) !== day;
  const newInstall = !read(INSTALLED_KEY);
  write(DAY_KEY, day);
  write(INSTALLED_KEY, '1');
  send({ event: 'open', first_today: firstToday, new_install: newInstall });
}

// A finished round: Pitch Practice ('color-test'), NoteSpeller, the Theory
// quiz, Tiny Tots or piano practice; the score when it has one.
export function statRoundDone({ activity, lang, correct = null, total = null }) {
  send({ event: 'round', activity: String(activity).slice(0, 40), lang, correct, total });
}
