import { useEffect, useState } from 'react';
import { LOW_VOLUME, playSoundCheck, watchVolume } from './soundCheck.js';

// In the iPhone app, a pill in the header while the phone's volume is off
// or nearly off, so nobody wonders why there's no sound. It goes away as
// soon as the volume goes up; tapping it plays the sound check.
export default function VolumeWarning() {
  const [volume, setVolume] = useState(null);

  useEffect(() => watchVolume(setVolume), []);

  if (volume === null || volume > LOW_VOLUME) return null;
  return (
    <button className="volume-warning" onClick={playSoundCheck}>
      <span aria-hidden="true">🔇</span> Turn the volume up
    </button>
  );
}
