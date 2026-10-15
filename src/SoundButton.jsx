import { useEffect, useRef, useState } from 'react';
import { isMuted, setMuted, soundState, wakeAudio } from './soundBus.js';
import { LOW_VOLUME, playSoundCheck, watchVolume } from './soundCheck.js';

// PitchPop always plays sound (even with the iPhone on silent, like
// Instagram); there's no mute button, so a stray tap can't leave it quiet.
// Whenever there's still a reason it can't be heard - the volume is all
// the way down, or the phone has paused sound - a pill under the header
// says what to do (SoundNotice).
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
