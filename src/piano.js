const NOTE_SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

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

export class PianoEngine {
  constructor() {
    this.ctx = null;
  }

  ensureAudio() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);
    this.compressor = compressor;

    const convolver = ctx.createConvolver();
    convolver.buffer = buildImpulse(ctx, 2.0, 3.0);
    const reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.55;
    reverbSend.connect(convolver);
    convolver.connect(compressor);
    this.reverbSend = reverbSend;

    const noiseLen = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
    }
    this.noiseBuffer = noiseBuffer;
  }

  playNote(startTime, freqHz, duration) {
    const { ctx, compressor, reverbSend, noiseBuffer } = this;
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

  playChord(notes) {
    this.ensureAudio();
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const now = this.ctx.currentTime + 0.02;
    const duration = 2.4;
    buildVoicing(notes).forEach(({ note, octave }) => {
      this.playNote(now, freq(note, octave), duration);
    });
  }
}
