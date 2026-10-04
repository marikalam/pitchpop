import { useEffect, useRef, useState } from 'react';

// A basic metronome: one click per quarter note. Clicks are scheduled a
// little ahead on the Web Audio clock (the usual "lookahead" approach), so
// the beat stays steady even when the page is busy; a timer only decides
// which clicks to schedule next. The tempo is remembered on this device.
const BPM_KEY = 'pitchpop-metronome-bpm-v1';
const MIN_BPM = 40;
const MAX_BPM = 208;
const DEFAULT_BPM = 80;
const LOOKAHEAD_S = 0.1; // schedule clicks this far ahead
const TICK_MS = 25; // how often to check for clicks to schedule

const clampBpm = (n) => Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(n)));

function loadBpm() {
  try {
    const saved = Number(localStorage.getItem(BPM_KEY));
    if (saved) return clampBpm(saved);
  } catch {
    /* ignore */
  }
  return DEFAULT_BPM;
}

// One tick, like a mechanical metronome: a very short burst of noise
// through a band-pass filter gives the woody "tok", and a short sine under
// it gives it a clear pitch. Both are kept fairly low (around 1 kHz and
// below) so the click isn't shrill, and die away within about 40 ms.
function noiseBuffer(ctx) {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function scheduleClick(ctx, time, noise) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1100;
  band.Q.value = 4;
  const body = ctx.createGain();
  body.gain.setValueAtTime(0.0001, time);
  body.gain.exponentialRampToValueAtTime(3, time + 0.001);
  body.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  src.connect(band).connect(body).connect(ctx.destination);
  src.start(time);
  src.stop(time + 0.05);

  const edge = ctx.createOscillator();
  edge.type = 'sine';
  edge.frequency.value = 800;
  const edgeGain = ctx.createGain();
  edgeGain.gain.setValueAtTime(0.0001, time);
  edgeGain.gain.exponentialRampToValueAtTime(0.4, time + 0.002);
  edgeGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
  edge.connect(edgeGain).connect(ctx.destination);
  edge.start(time);
  edge.stop(time + 0.045);
}

export default function Metronome({ hidden = false }) {
  const [bpm, setBpm] = useState(loadBpm);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0); // bumps on every click, for the flash
  const ctxRef = useRef(null);
  const noiseRef = useRef(null);
  const bpmRef = useRef(bpm);
  const nextRef = useRef(0);
  const flashTimers = useRef([]);

  useEffect(() => {
    bpmRef.current = bpm;
    try {
      localStorage.setItem(BPM_KEY, String(bpm));
    } catch {
      /* ignore */
    }
  }, [bpm]);

  useEffect(() => {
    if (!running) return undefined;
    const ctx = ctxRef.current;
    nextRef.current = ctx.currentTime + 0.05;
    const id = setInterval(() => {
      while (nextRef.current < ctx.currentTime + LOOKAHEAD_S) {
        const at = nextRef.current;
        scheduleClick(ctx, at, noiseRef.current);
        const delay = Math.max(0, (at - ctx.currentTime) * 1000);
        flashTimers.current.push(setTimeout(() => setBeat((b) => b + 1), delay));
        // A tempo change takes effect from the next click.
        nextRef.current += 60 / bpmRef.current;
      }
    }, TICK_MS);
    return () => {
      clearInterval(id);
      flashTimers.current.forEach(clearTimeout);
      flashTimers.current = [];
    };
  }, [running]);

  // Stop when leaving Practice Mode.
  useEffect(
    () => () => {
      ctxRef.current?.close?.();
    },
    [],
  );

  async function toggle() {
    if (running) {
      setRunning(false);
      return;
    }
    // Created on the tap itself: phones only allow audio started by a tap.
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (ctxRef.current.state === 'suspended') await ctxRef.current.resume();
    if (!noiseRef.current) noiseRef.current = noiseBuffer(ctxRef.current);
    setRunning(true);
  }

  const change = (delta) => setBpm((b) => clampBpm(b + delta));

  return (
    <section className="practice-card" aria-label="Metronome" hidden={hidden}>
      <div className="practice-card-title">🎵 Metronome</div>
      <div className="metronome-row">
        <button className="practice-step" onClick={() => change(-1)} disabled={bpm <= MIN_BPM} aria-label="Slower">
          −
        </button>
        <div className="metronome-tempo">
          <span
            key={beat}
            className={`metronome-dot${running && beat > 0 ? ' metronome-dot-flash' : ''}`}
            aria-hidden="true"
          />
          <span className="metronome-bpm" aria-live="polite">
            {bpm}
          </span>
          <span className="metronome-unit">beats per minute</span>
        </div>
        <button className="practice-step" onClick={() => change(1)} disabled={bpm >= MAX_BPM} aria-label="Faster">
          +
        </button>
      </div>
      <input
        className="metronome-slider"
        type="range"
        min={MIN_BPM}
        max={MAX_BPM}
        value={bpm}
        onChange={(e) => setBpm(clampBpm(Number(e.target.value)))}
        aria-label="Tempo"
      />
      <button className={running ? 'pill-btn-secondary pill-btn-full' : 'pill-btn-primary pill-btn-full'} onClick={toggle}>
        {running ? '■ Stop' : '▶\uFE0E Start metronome'}
      </button>
    </section>
  );
}
