import { useEffect, useState } from 'react';
import { audioContext, newSound } from './soundBus.js';
import { pianoSample } from './pianoSamples.js';
import { activateNativeAudio, audioInfo } from './soundCheck.js';
import { speakWords } from './speech.js';

// Sound test (bottom of Players & colors): for a phone that plays no sound,
// each button tries one way of making sound, and the box shows what the
// phone reports - so a screenshot says where the sound stops.
const errors = [];
if (typeof window !== 'undefined') {
  const note = (msg) => {
    errors.push(String(msg).slice(0, 140));
    if (errors.length > 4) errors.shift();
  };
  window.addEventListener('error', (e) => note(e.message));
  window.addEventListener('unhandledrejection', (e) => note(e.reason?.message || e.reason));
}

// A 0.6 s 440 Hz beep as a WAV file, for the plain <audio> test.
function beepWav() {
  const rate = 22050;
  const n = Math.floor(rate * 0.6);
  const bytes = new Uint8Array(44 + n * 2);
  const view = new DataView(bytes.buffer);
  const text = (at, str) => [...str].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  text(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const fade = Math.min(1, i / 400, (n - i) / 400);
    view.setInt16(44 + i * 2, Math.sin((2 * Math.PI * 440 * i) / rate) * 12000 * fade, true);
  }
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export default function SoundTest() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const [result, setResult] = useState('');
  const [, refresh] = useState(0);

  const read = () => audioInfo().then(setInfo);
  useEffect(() => {
    if (!open) return undefined;
    read();
    const id = setInterval(() => refresh((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open]);

  const tests = [
    [
      '1. Beep (web sound)',
      () => {
        newSound();
        const ctx = audioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.3;
        osc.frequency.value = 660;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
        return `played on a "${ctx.state}" context`;
      },
    ],
    [
      '2. Beep (iPhone audio player)',
      () => {
        const el = new Audio(beepWav());
        el.setAttribute('playsinline', '');
        el.play()
          .then(() => setResult('2. Beep (iPhone audio player): playing'))
          .catch((e) => setResult(`2. Beep (iPhone audio player): refused - ${e.message}`));
        return 'starting…';
      },
    ],
    [
      '3. Piano note',
      () => {
        newSound();
        const ctx = audioContext();
        const sample = pianoSample(60);
        if (!sample) return 'piano sounds not loaded yet';
        const src = ctx.createBufferSource();
        src.buffer = sample.buffer;
        src.connect(ctx.destination);
        src.start();
        return `played on a "${ctx.state}" context`;
      },
    ],
    [
      '4. Voice',
      () => {
        speakWords('Hello! Can you hear me?');
        return 'speaking…';
      },
    ],
    [
      '5. Wake up iPhone sound',
      () => {
        activateNativeAudio().then((r) => {
          setResult(`5. Wake up iPhone sound: ${r ? (r.ok ? 'done - try 1 and 3 again' : `failed - ${r.error}`) : 'app only'}`);
          read();
        });
        return 'waking…';
      },
    ],
  ];

  if (!open) {
    return (
      <button className="back-link back-link-center sound-test-open" onClick={() => setOpen(true)}>
        🔧 Can't hear anything? Sound test
      </button>
    );
  }

  let ctx = null;
  try {
    ctx = audioContext();
  } catch (e) {
    errors.push(`AudioContext: ${e.message}`);
  }
  return (
    <section className="sound-test" aria-label="Sound test">
      <h4 className="ps-section-title">🔧 Sound test</h4>
      <p className="ps-hint">Tap each one and listen. Then take a screenshot of this box and send it.</p>
      <div className="sound-test-buttons">
        {tests.map(([label, run]) => (
          <button
            key={label}
            className="pill-btn-secondary"
            onClick={() => {
              try {
                setResult(`${label}: ${run()}`);
              } catch (e) {
                setResult(`${label}: error - ${e.message}`);
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <pre className="sound-test-info">
        {[
          result && `Last: ${result}`,
          `Web sound: ${ctx ? `${ctx.state}, ${ctx.sampleRate} Hz, clock ${ctx.currentTime.toFixed(1)} s` : 'none'}`,
          `Piano sounds: ${pianoSample(60) ? 'loaded' : 'not loaded'}`,
          info &&
            !info.error &&
            `iPhone: iOS ${info.ios}, ${info.category}${info.mixes ? ' (mixes)' : ''}, volume ${Math.round(info.volume * 100)}%, out: ${info.output?.kind} ${info.output?.name || ''}${info.otherAudio ? ', other app playing' : ''}`,
          info?.error && `iPhone: ${info.error}`,
          `Browser: ${navigator.userAgent.replace(/^.*?\(/, '(').slice(0, 90)}`,
          ...errors.map((e) => `Error: ${e}`),
        ]
          .filter(Boolean)
          .join('\n')}
      </pre>
    </section>
  );
}
