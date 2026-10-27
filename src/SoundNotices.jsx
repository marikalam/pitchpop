import { useEffect, useState } from 'react';
import { isIPhoneWebsite } from './soundCheck.js';
import Icon from './Icon.jsx';

// Small notes at the bottom of the screen about hearing PitchPop:
// - after "Sound check": "Can you hear the chime?" with what to do if not;
// - on the iPhone website, the first time a sound plays: the silent
//   switch mutes websites, so flip it off. Shown once per device.
const HINT_KEY = 'pitchpop-silent-hint-seen-v1';

function hintSeen() {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true;
  }
}

function markHintSeen() {
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* ignore */
  }
}

const IF_NOT = isIPhoneWebsite
  ? 'No? Turn the volume up, and flip off silent mode (the switch on the side of the phone).'
  : 'No? Turn the volume up.';

export default function SoundNotices() {
  const [notice, setNotice] = useState(null); // 'check' | 'silent' | null

  useEffect(() => {
    let timer;
    const showCheck = () => {
      // Its note covers the silent switch on the iPhone website too.
      if (isIPhoneWebsite) markHintSeen();
      setNotice('check');
      clearTimeout(timer);
      timer = setTimeout(() => setNotice((n) => (n === 'check' ? null : n)), 6000);
    };
    window.addEventListener('pitchpop-sound-check', showCheck);
    return () => {
      window.removeEventListener('pitchpop-sound-check', showCheck);
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isIPhoneWebsite || hintSeen()) return undefined;
    const showHint = () => {
      window.removeEventListener('pitchpop-sound-start', showHint);
      if (!hintSeen()) setNotice((n) => n || 'silent');
    };
    window.addEventListener('pitchpop-sound-start', showHint);
    return () => window.removeEventListener('pitchpop-sound-start', showHint);
  }, []);

  function dismiss() {
    if (notice === 'silent') markHintSeen();
    // "Got it": they can hear, so the "Turn the volume up" pill goes too.
    window.dispatchEvent(new Event('pitchpop-can-hear'));
    setNotice(null);
  }

  if (!notice) return null;
  return (
    <div className="sound-notice" role="status">
      <span className="sound-notice-icon" aria-hidden="true">
        <Icon name={notice === 'check' ? 'speaker' : 'mute'} />
      </span>
      <span className="sound-notice-text">
        {notice === 'check' ? (
          <>
            <strong>Can you hear the chime?</strong> {IF_NOT}
          </>
        ) : (
          <>
            <strong>Can’t hear anything?</strong> Flip off silent mode (the switch on the side of the phone) and turn
            the volume up.
          </>
        )}
      </span>
      <button className="sound-notice-ok" onClick={dismiss}>
        Got it
      </button>
    </div>
  );
}
