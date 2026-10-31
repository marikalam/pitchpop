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

// Playing as media, the iPhone shows a "Now Playing" card (lock screen,
// Control Center, the car's screen). Without this it shows the page's
// address ("localhost"); with it, PitchPop's name and logo.
let named = false;
function nameNowPlaying() {
  if (named || !('mediaSession' in navigator) || typeof window.MediaMetadata !== 'function') return;
  try {
    const base = import.meta.env.BASE_URL;
    const icon = (size) => new URL(`${base}icon-${size}.png`, window.location.href).href;
    navigator.mediaSession.metadata = new window.MediaMetadata({
      title: 'PitchPop',
      artist: 'Ear training: every chord has a color',
      album: 'PitchPop',
      artwork: [
        { src: icon(192), sizes: '192x192', type: 'image/png' },
        { src: icon(512), sizes: '512x512', type: 'image/png' },
      ],
    });
    named = true;
  } catch {
    /* ignore */
  }
}

// Tells the iPhone this is media to hear (like a video app): it plays out
// loud even with the ringer on silent, instead of being treated as quiet
// background sound. (WebKit's Audio Session API; iOS 17 and later.) In
// the iPhone app too, like MathPop: the app's own setting (AppDelegate)
// doesn't reach the web view's sounds, which otherwise stay silent while
// the silent switch is on - however loud the volume.
export function playOutLoud() {
  nameNowPlaying();
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
  // Resolves when it finishes or is stopped by newSound() - or, if the
  // phone has paused sound (the context never runs, so 'ended' never
  // comes), once it would have finished, so nothing waits on it forever.
  const lasts =
    (releaseAt ? releaseAt + 0.6 - ctx.currentTime : buffer.duration / rate) + Math.max(0, when - ctx.currentTime);
  const ended = new Promise((resolve) => {
    const done = () => {
      playing.delete(stop);
      resolve();
    };
    source.addEventListener('ended', done);
    setTimeout(done, lasts * 1000 + 500);
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

// ---------- One audio context, sound on/off, and waking sound up ----------
// All of PitchPop plays through ONE audio context, made on first use and
// kept for good (only remade if it's ever closed) - the way MathPop does
// it, which iPhones handle well. Every tap anywhere resumes it (that tap
// is what iOS needs to let sound play), and so does each sound before it
// plays, so after a call, Siri, an alarm, the lock screen or another app
// the next tap brings sound back. (PitchPop used to make several contexts
// and replace them after the lock screen; on iPhones that could leave it
// silent.) The speaker button mutes it; muting lasts until it's switched
// back on (or the volume is turned up), not across restarts, so the app
// never opens silent.
let shared = null;
let muted = false;

function announceState() {
  window.dispatchEvent(new Event('pitchpop-sound-state'));
}

export function audioContext() {
  if (!shared || shared.state === 'closed') {
    playOutLoud();
    shared = new (window.AudioContext || window.webkitAudioContext)();
    shared.addEventListener?.('statechange', announceState);
    if (muted) shared.suspend().catch(() => {});
    announceState();
  }
  wakeContext(shared);
  return shared;
}

// Resumes the context if it's paused (unless muted); never waits more
// than 0.4 s, as an iPhone mid-interruption may not answer.
export function wakeContext(ctx) {
  if (muted || !ctx || ctx.state === 'running' || ctx.state === 'closed') return Promise.resolve();
  return Promise.race([ctx.resume().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 400))]);
}

export function wakeAudio() {
  if (shared) wakeContext(shared);
}

export function isMuted() {
  return muted;
}

export function setMuted(on) {
  if (on === muted) return;
  if (on) newSound();
  muted = on;
  if (shared && shared.state !== 'closed') (on ? shared.suspend() : shared.resume()).catch(() => {});
  announceState();
}

// 'muted', 'blocked' (the phone has paused sound; a tap brings it back)
// or 'on'.
export function soundState() {
  if (muted) return 'muted';
  return shared && shared.state !== 'closed' && shared.state !== 'running' ? 'blocked' : 'on';
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', wakeAudio, true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) wakeAudio();
  });
}
