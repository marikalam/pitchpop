import { useEffect, useRef, useState } from 'react';
import { isMuted, playOutLoud, setMuted, soundState, wakeAudio } from './soundBus.js';
import { LOW_VOLUME, pickOutput, playSoundCheck, watchOutput, watchVolume } from './soundCheck.js';
import Icon from './Icon.jsx';

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
        // Volume turned up: sound back on, and awake to be heard right away.
        if (lastVolume.current !== null && v > lastVolume.current) {
          if (isMuted()) setMuted(false);
          playOutLoud();
          wakeAudio();
        }
        lastVolume.current = v;
        setVolume(v);
      }),
    [],
  );
  // "Got it" on "Can you hear the chime?" hides the volume pill, until the
  // volume goes down again.
  const [heardAt, setHeardAt] = useState(null);
  useEffect(() => {
    const heard = () => setHeardAt(lastVolume.current ?? 0);
    window.addEventListener('pitchpop-can-hear', heard);
    return () => window.removeEventListener('pitchpop-can-hear', heard);
  }, []);
  const low = volume !== null && volume <= LOW_VOLUME && !(heardAt !== null && volume >= heardAt);
  return { state, low };
}

// Bluetooth devices the family said to keep playing on (✕ on the pill),
// e.g. their headphones, so the pill doesn't keep asking.
const KEEP_KEY = 'pitchpop-keep-output-v1';
function keptOutputs() {
  try {
    return JSON.parse(localStorage.getItem(KEEP_KEY)) || [];
  } catch {
    return [];
  }
}

// In the iPhone app, where the sound is going when it's the car or a
// Bluetooth speaker (anywhere other than the phone or wired headphones).
function useAwayOutput() {
  const [output, setOutput] = useState(null);
  const [kept, setKept] = useState(keptOutputs);
  useEffect(() => watchOutput(setOutput), []);
  const away = output && (output.kind === 'car' || output.kind === 'bluetooth') && !kept.includes(output.name);
  const keep = () => {
    const next = [...kept, output.name];
    setKept(next);
    try {
      localStorage.setItem(KEEP_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  return { away: away ? output : null, keep };
}

function turnOn() {
  setMuted(false);
  wakeAudio();
  playSoundCheck();
}

export function SoundNotice() {
  const { state, low } = useSound();
  const { away, keep } = useAwayOutput();
  let text = null;
  if (state === 'muted') text = 'Sound is off · tap to turn on';
  else if (low) text = 'Turn the volume up';
  else if (state === 'blocked') text = 'Tap for sound';
  if (!text && away)
    return (
      <span className="output-pill">
        <button className="volume-warning" onClick={pickOutput}>
          <span aria-hidden="true">
            <Icon name={away.kind === 'car' ? 'car' : 'headphones'} />
          </span>{' '}
          Play on iPhone
        </button>
        <button className="output-pill-keep" onClick={keep} aria-label={`Keep playing on ${away.name}`}>
          ✕
        </button>
      </span>
    );
  if (!text) return null;
  return (
    <button className="volume-warning" onClick={turnOn}>
      <span aria-hidden="true">
        <Icon name="mute" />
      </span>{' '}
      {text}
    </button>
  );
}
