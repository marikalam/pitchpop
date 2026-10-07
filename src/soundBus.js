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
  source.connect(gain).connect(ctx.destination);
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
  if (!muted) gain.connect(ctx.destination);
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

export function trackContext(ctx) {
  contexts.add(ctx);
  ctx.addEventListener?.('statechange', announceState);
  if (muted) ctx.suspend().catch(() => {});
  announceState();
  return ctx;
}

// Resumes a paused context (unless muted); never waits more than 0.4 s,
// as an iPhone mid-interruption may not answer.
export function wakeContext(ctx) {
  if (muted || !ctx || ctx.state === 'running' || ctx.state === 'closed') return Promise.resolve();
  return Promise.race([ctx.resume().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 400))]);
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
  document.addEventListener('pointerdown', wakeAudio, true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wakeAudio();
  });
}
