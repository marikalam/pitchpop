import { useEffect, useState } from 'react';
import { newSound } from './soundBus.js';
import Icon from './Icon.jsx';

// "Try the iPhone voices" (in Players & colors, under the Sound test): the
// English voices this phone has, each one able to say a few of PitchPop's
// words, so a grown-up can hear them before choosing one. Better
// ("Enhanced" or "Premium") voices can be downloaded in the iPhone's
// Settings; they show up here once they're on the phone.
const SAMPLE = 'Red. Yellow. Blue. Light green. Beige. C. D. E. Great job!';

const quality = (v) => {
  const id = `${v.name} ${v.voiceURI}`.toLowerCase();
  if (id.includes('premium')) return 'Premium';
  if (id.includes('enhanced')) return 'Enhanced';
  return '';
};

export default function VoiceTry() {
  const [open, setOpen] = useState(false);
  const [voices, setVoices] = useState([]);
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    if (!open || !('speechSynthesis' in window)) return undefined;
    const load = () => {
      const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
      // The better voices first, then by name.
      const rank = (v) => ({ Premium: 0, Enhanced: 1 })[quality(v)] ?? 2;
      setVoices([...all].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)));
    };
    load();
    window.speechSynthesis.addEventListener?.('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', load);
  }, [open]);

  function hear(v) {
    newSound();
    const u = new SpeechSynthesisUtterance(SAMPLE);
    u.lang = v.lang;
    try {
      u.voice = v;
    } catch {
      /* not a voice this browser can use: its default for the language */
    }
    u.rate = 0.95;
    u.onend = () => setPlaying(null);
    u.onerror = () => setPlaying(null);
    setPlaying(v.voiceURI);
    window.speechSynthesis.speak(u);
  }

  if (!open) {
    return (
      <button className="back-link back-link-center sound-test-open" onClick={() => setOpen(true)}>
        <Icon name="speech" /> Try the iPhone voices
      </button>
    );
  }

  return (
    <section className="sound-test voice-try" aria-label="Try the iPhone voices">
      <h4 className="ps-section-title">
        <Icon name="speech" /> Try the iPhone voices
      </h4>
      <p className="ps-hint">
        Tap a voice to hear it say a few PitchPop words. For nicer voices, download one in the iPhone's Settings →
        Accessibility → Spoken Content → Voices → English (Enhanced or Premium), then come back.
      </p>
      {voices.length === 0 ? (
        <p className="ps-hint">No English voices found on this phone yet.</p>
      ) : (
        <ul className="voice-try-list">
          {voices.map((v) => (
            <li key={v.voiceURI}>
              <button
                className={`voice-try-item${playing === v.voiceURI ? ' voice-try-on' : ''}`}
                onClick={() => hear(v)}
              >
                <Icon name="speaker" />
                <span className="voice-try-name">{v.name.replace(/\s*\((Enhanced|Premium)\)/i, '')}</span>
                {quality(v) && <span className="voice-try-tag">{quality(v)}</span>}
                <span className="voice-try-lang">{v.lang}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
