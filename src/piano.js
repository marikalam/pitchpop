const NOTE_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SAMPLE_RATE = 44100;

function freq(note, octave) {
  const semitone = (octave - 4) * 12 + (NOTE_SEMITONE[note] - 9);
  return 440 * Math.pow(2, semitone / 12);
}

function bassOctave(note) {
  return note === 'A' || note === 'B' ? 3 : 4;
}

export function buildVoicing(notes) {
  const voiced = [];
  let prevAbs = -Infinity;
  notes.forEach((note, i) => {
    let octave = i === 0 ? bassOctave(note) : voiced[voiced.length - 1].octave;
    let abs = (octave - 4) * 12 + NOTE_SEMITONE[note];
    while (abs <= prevAbs) {
      octave += 1;
      abs = (octave - 4) * 12 + NOTE_SEMITONE[note];
    }
    voiced.push({ note, octave });
    prevAbs = abs;
  });
  return voiced;
}

function buildImpulse(ctx, duration, decay) {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * duration);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function buildNoiseBuffer(ctx, duration) {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  return buffer;
}

function scheduleNote(ctx, compressor, reverbSend, noiseBuffer, startTime, freqHz, duration) {
  const harmonics = [1, 2, 3, 4, 5, 6];
  const amps = [1, 0.55, 0.3, 0.17, 0.1, 0.06];
  const decayScale = [1, 0.8, 0.6, 0.45, 0.34, 0.26];
  const baseGain = 0.16;

  harmonics.forEach((h, idx) => {
    const stretch = 1 + 0.0004 * h * h;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freqHz * h * stretch;

    const env = ctx.createGain();
    const peak = amps[idx] * baseGain;
    const noteDuration = duration * decayScale[idx];
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(peak, startTime + 0.006);
    env.gain.exponentialRampToValueAtTime(0.0001, startTime + noteDuration);

    osc.connect(env);
    env.connect(compressor);
    env.connect(reverbSend);

    osc.start(startTime);
    osc.stop(startTime + noteDuration + 0.05);
  });

  const hammer = ctx.createBufferSource();
  hammer.buffer = noiseBuffer;
  const hammerFilter = ctx.createBiquadFilter();
  hammerFilter.type = 'bandpass';
  hammerFilter.frequency.value = freqHz * 2.2;
  hammerFilter.Q.value = 0.8;
  const hammerGain = ctx.createGain();
  hammerGain.gain.setValueAtTime(0.05, startTime);
  hammerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.06);
  hammer.connect(hammerFilter).connect(hammerGain).connect(compressor);
  hammer.start(startTime);
}

// Renders a chord to a plain audio buffer offline (not in real time), so
// playback is a single cheap AudioBufferSourceNode instead of ~20 live
// oscillator/convolver nodes per tap. Live synthesis on every play was
// causing audio dropouts over Bluetooth - pre-rendering once and just
// streaming the result out fixes that regardless of output device.
async function renderChordBuffer(notes) {
  const duration = 3.0;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const offline = new OfflineCtx(2, Math.ceil(SAMPLE_RATE * duration), SAMPLE_RATE);

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;
  compressor.connect(offline.destination);

  const convolver = offline.createConvolver();
  convolver.buffer = buildImpulse(offline, 2.0, 3.0);
  const reverbSend = offline.createGain();
  reverbSend.gain.value = 0.55;
  reverbSend.connect(convolver);
  convolver.connect(compressor);

  const noiseBuffer = buildNoiseBuffer(offline, 0.08);

  buildVoicing(notes).forEach(({ note, octave }) => {
    scheduleNote(offline, compressor, reverbSend, noiseBuffer, 0.02, freq(note, octave), 2.4);
  });

  return offline.startRendering();
}

export class PianoEngine {
  constructor() {
    this.ctx = null;
    this.bufferCache = new Map();
    this.pendingRenders = new Map();
  }

  ensureAudio() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  getChordBuffer(notes) {
    const key = notes.join('');
    if (this.bufferCache.has(key)) return Promise.resolve(this.bufferCache.get(key));
    if (this.pendingRenders.has(key)) return this.pendingRenders.get(key);

    const promise = renderChordBuffer(notes).then((buffer) => {
      this.bufferCache.set(key, buffer);
      this.pendingRenders.delete(key);
      return buffer;
    });
    this.pendingRenders.set(key, promise);
    return promise;
  }

  // Renders every chord ahead of time (offline rendering needs no user
  // gesture) so the very first tap of each color is already cached.
  prewarm(notesLists) {
    notesLists.forEach((notes) => {
      this.getChordBuffer(notes);
    });
  }

  async playChord(notes) {
    const ctx = this.ensureAudio();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* ignore - will retry resuming on the next tap */
      }
    }
    const buffer = await this.getChordBuffer(notes);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }
}

let chimeCtx = null;

function ensureChimeAudio() {
  if (!chimeCtx) {
    chimeCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (chimeCtx.state === 'suspended') chimeCtx.resume();
  return chimeCtx;
}

function chimeTone(ctx, freqHz, startTime, duration, peak) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freqHz;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peak, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function playCorrectChime() {
  const ctx = ensureChimeAudio();
  const now = ctx.currentTime + 0.01;
  chimeTone(ctx, 523.25, now, 0.16, 0.18);
  chimeTone(ctx, 659.25, now + 0.09, 0.22, 0.18);
  chimeTone(ctx, 783.99, now + 0.18, 0.3, 0.18);
}

export function playWrongBuzz() {
  const ctx = ensureChimeAudio();
  const now = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(95, now + 0.26);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.1, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}
