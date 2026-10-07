import { useEffect, useRef, useState } from 'react';
import { isMuted, setMuted, soundState, wakeAudio } from './soundBus.js';
import { LOW_VOLUME, playSoundCheck, watchVolume } from './soundCheck.js';

// Sound on or off at a glance, like Instagram: a round speaker button in
// the header - 🔊 on, an orange 🔇 when muted - that switches it. Turning
// the phone's volume up switches it back on (in the iPhone app, which can
// see the volume). Whenever there's a reason PitchPop can't be heard, a
// pill under the header says what to do (SoundNotice).
function useSound() {
  const [state, setState] = useState(soundState);
  const [volume, setVolume] = useState(null);
  const lastVolume = useRef(null);
  useEffect(() => {
    const update = () => setState(soundState());
    window.addEventListener('pitchpop-sound-state', update);
    return () => window.removeEventListener('pitchpop-sound-state', update);
  }, []);
  useEffect(
    () =>
      watchVolume((v) => {
        if (lastVolume.current !== null && v > lastVolume.current && isMuted()) setMuted(false);
        lastVolume.current = v;
        setVolume(v);
      }),
    [],
  );
  return { state, low: volume !== null && volume <= LOW_VOLUME };
}

function turnOn() {
  setMuted(false);
  wakeAudio();
  playSoundCheck();
}

export default function SoundButton() {
  const { state } = useSound();
  const off = state === 'muted';
  return (
    <button
      className={`sound-btn${off ? ' sound-btn-off' : ''}`}
      onClick={() => (off ? turnOn() : setMuted(true))}
      aria-label={off ? 'Sound is off. Turn sound on' : 'Sound is on. Turn sound off'}
      aria-pressed={!off}
    >
      <span aria-hidden="true">{off ? '🔇' : '🔊'}</span>
    </button>
  );
}

export function SoundNotice() {
  const { state, low } = useSound();
  let text = null;
  if (state === 'muted') text = 'Sound is off · tap to turn on';
  else if (low) text = 'Turn the volume up';
  else if (state === 'blocked') text = 'Tap for sound';
  if (!text) return null;
  return (
    <button className="volume-warning" onClick={turnOn}>
      <span aria-hidden="true">🔇</span> {text}
    </button>
  );
}
