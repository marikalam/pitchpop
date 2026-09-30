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

// A short wood-block style click.
function scheduleClick(ctx, time) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1600, time);
  osc.frequency.exponentialRampToValueAtTime(800, time + 0.03);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.6, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.07);
}

export default function Metronome() {
  const [bpm, setBpm] = useState(loadBpm);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0); // bumps on every click, for the flash
  const ctxRef = useRef(null);
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
        scheduleClick(ctx, at);
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
    setRunning(true);
  }

  const change = (delta) => setBpm((b) => clampBpm(b + delta));

  return (
    <section className="practice-card" aria-label="Metronome">
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
        {running ? '■ Stop' : '▶ Start metronome'}
      </button>
    </section>
  );
}
