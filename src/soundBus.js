// One sound at a time. Every chord, note run, voice clip and answer sound
// registers here; starting something new (newSound) quickly fades out
// whatever is still playing and cancels anything waiting to play (e.g. the
// note run queued after a color name), so sounds never pile on top of each
// other. Parts of the same reveal - chime, then the color name, then its
// notes - carry the id newSound returned and check isCurrent() before each
// step. The Piano keyboard and the metronome don't use this.
let generation = 0;
let playing = new Set();
let timers = new Set();

export function newSound() {
  generation += 1;
  // SoundNotices.jsx shows a one-time tip on the iPhone website.
  window.dispatchEvent(new Event('pitchpop-sound-start'));
  playing.forEach((stop) => stop());
  playing = new Set();
  timers.forEach((id) => clearTimeout(id));
  timers = new Set();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  return generation;
}

export function isCurrent(id) {
  return id === generation;
}

// The id of the sound playing now (what the last newSound() returned).
export function currentSound() {
  return generation;
}

// Louder: every sound goes through one boost per audio context, with a
// limiter after it so loud chords don't crackle.
const BOOST = 2.2;
const outputs = new WeakMap();
export function outputFor(ctx) {
  let out = outputs.get(ctx);
  if (!out) {
    out = ctx.createGain();
    out.gain.value = BOOST;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    out.connect(limiter).connect(ctx.destination);
    outputs.set(ctx, out);
  }
  return out;
}

// Tells the iPhone this is media to hear (like a video app): it plays out
// loud even with the ringer on silent, instead of being treated as quiet
// background sound. (WebKit's Audio Session API; iOS 17 and later.)
export function playOutLoud() {
  try {
    if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
  } catch {
    /* ignore */
  }
}
playOutLoud();

// Like setTimeout, but cancelled by the next newSound().
export function later(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

// Plays a buffer through a gain node that newSound() can fade out in
// ~30 ms, which avoids a click. Returns a promise for when it ends.
// `when` (audio-clock seconds) schedules it ahead, for exact timing.
// `rate` plays it faster or slower (a recorded piano note retuned), and
// `releaseAt` lets it go then, like lifting a finger off a piano key.
export function playBuffer(ctx, buffer, volume = 1, when = 0, { rate = 1, releaseAt } = {}) {
  // Muted: nothing (rather than sounds piling up to play when unmuted).
  if (muted) return Promise.resolve();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  if (releaseAt) {
    gain.gain.setValueAtTime(volume, releaseAt);
    gain.gain.setTargetAtTime(0, releaseAt, 0.07);
  }
  source.connect(gain).connect(outputFor(ctx));
  const stop = track(ctx, gain, [source]);
  // Resolves when it finishes or is stopped by newSound().
  const ended = new Promise((resolve) => {
    source.addEventListener('ended', () => {
      playing.delete(stop);
      resolve();
    });
  });
  source.start(when);
  if (releaseAt) source.stop(releaseAt + 0.6);
  return ended;
}

// For sounds built from oscillators: returns a gain node to connect them
// to; newSound() fades it out and stops the given nodes.
export function soundOutput(ctx, nodes, endsAt) {
  const gain = ctx.createGain();
  if (!muted) gain.connect(outputFor(ctx));
  const stop = track(ctx, gain, nodes);
  setTimeout(() => playing.delete(stop), Math.max(0, (endsAt - ctx.currentTime) * 1000) + 50);
  return gain;
}

// `nodes` is read when stopping, so it can be filled in after this call.
function track(ctx, gain, nodes) {
  const stop = () => {
    const now = ctx.currentTime;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.03);
      nodes.forEach((n) => {
        try {
          n.stop(now + 0.04);
        } catch {
          /* already stopped */
        }
      });
    } catch {
      /* context closed */
    }
  };
  playing.add(stop);
  return stop;
}

// ---------- Sound on/off, and waking sound up ----------
// Every audio context PitchPop makes registers here, so they can be
// muted together (the speaker button, like Instagram's) and woken up again
// when the iPhone has paused them - after a call, Siri, an alarm or
// another app - which used to leave PitchPop silent until it was
// restarted. Any tap, and coming back to the app, wakes them. Muting lasts
// until it's switched back on (or the volume is turned up), not across
// restarts, so the app never opens silent.
const contexts = new Set();
let muted = false;

function announceState() {
  window.dispatchEvent(new Event('pitchpop-sound-state'));
}

// iPhones (older iOS especially) can leave an audio context silent after
// a call, Siri, the phone locking or a trip to another app - stuck, or
// even saying it's running while nothing comes out - and then the volume
// buttons don't reach PitchPop either. So after any of those, the next
// sound makes a new context instead (the sounds themselves are kept).
let staleSince = 0;
const born = new WeakMap();
// Contexts that didn't wake up when asked.
const stuck = new WeakSet();
const KEEP_NEW_MS = 5000;
function goneStale() {
  staleSince = Date.now();
  needsUnlock = true;
}

// After the lock screen or another app, the first tap also plays a moment
// of silence through an <audio> element: on iPhones that's what reliably
// wakes up the phone's sound for the page again, so the chord that tap
// plays is heard. (A tap has to start it; iOS won't otherwise.)
let needsUnlock = false;
// 0.05 s of silence.
const SILENCE =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';
function unlockWithSilence() {
  if (!needsUnlock || muted) return;
  needsUnlock = false;
  try {
    const el = new Audio(SILENCE);
    el.setAttribute('playsinline', '');
    el.play()?.catch(() => {});
  } catch {
    /* ignore */
  }
}

// The context to play on: `ctx` while it's healthy, else a new one from
// `make` (the old one is closed).
export function freshContext(ctx, make) {
  // A context made in the last few seconds is kept even if it hasn't
  // started yet: right after the phone unlocks, iOS can take a while to
  // give sound back, and replacing the context on every tap (each new one
  // just as slow) used to keep Pitch Practice silent for good.
  const young = ctx && Date.now() - (born.get(ctx) || 0) < KEEP_NEW_MS;
  const fine =
    ctx &&
    ctx.state !== 'closed' &&
    (young || (ctx.state !== 'interrupted' && !stuck.has(ctx) && born.get(ctx) > staleSince));
  if (fine) return ctx;
  if (ctx) {
    contexts.delete(ctx);
    if (ctx.state !== 'closed') ctx.close().catch(() => {});
  }
  const next = trackContext(make());
  // A new context made in the same millisecond still counts as after it.
  born.set(next, Math.max(Date.now(), staleSince + 1));
  return next;
}

export function trackContext(ctx) {
  playOutLoud();
  contexts.add(ctx);
  ctx.addEventListener?.('statechange', () => {
    if (ctx.state === 'interrupted') goneStale();
  });
  ctx.addEventListener?.('statechange', announceState);
  if (muted) ctx.suspend().catch(() => {});
  announceState();
  return ctx;
}

// Resumes a paused context (unless muted); never waits more than 0.4 s,
// as an iPhone mid-interruption may not answer.
export function wakeContext(ctx) {
  if (muted || !ctx || ctx.state === 'running' || ctx.state === 'closed') return Promise.resolve();
  const resumed = ctx.resume().catch(() => {});
  // Still not playing after a good while: its next sound gets a new
  // context. (Not judged sooner: iOS can be slow to give sound back.)
  setTimeout(() => {
    if (ctx.state !== 'running' && ctx.state !== 'closed' && !muted) stuck.add(ctx);
  }, 1500);
  return Promise.race([resumed, new Promise((resolve) => setTimeout(resolve, 400))]);
}

export function wakeAudio() {
  contexts.forEach((ctx) => wakeContext(ctx));
}

export function isMuted() {
  return muted;
}

export function setMuted(on) {
  if (on === muted) return;
  if (on) newSound();
  muted = on;
  contexts.forEach((ctx) => {
    if (ctx.state === 'closed') return;
    (on ? ctx.suspend() : ctx.resume()).catch(() => {});
  });
  announceState();
}

// 'muted', 'blocked' (the phone has paused sound; a tap brings it back)
// or 'on'.
export function soundState() {
  if (muted) return 'muted';
  const live = [...contexts].filter((ctx) => ctx.state !== 'closed');
  return live.some((ctx) => ctx.state !== 'running') ? 'blocked' : 'on';
}

if (typeof document !== 'undefined') {
  document.addEventListener(
    'pointerdown',
    () => {
      unlockWithSilence();
      wakeAudio();
    },
    true,
  );
  document.addEventListener('visibilitychange', () => {
    // Back from the lock screen or another app: start sound afresh.
    if (document.hidden) goneStale();
    if (!document.hidden) wakeAudio();
  });
}
