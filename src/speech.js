import { playBuffer } from './soundBus.js';

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

let voicesPromise = null;

// Voice lists load asynchronously on most browsers - calling getVoices()
// right away often returns [] and silently falls back to the flattest
// default voice. Wait for the real list (via voiceschanged, with a
// timeout fallback) before picking one.
function loadVoices() {
  if (!('speechSynthesis' in window)) return Promise.resolve([]);
  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);
  if (voicesPromise) return voicesPromise;

  voicesPromise = new Promise((resolve) => {
    const finish = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', finish);
    setTimeout(finish, 1000);
  });
  return voicesPromise;
}

// The Web Speech API has no true "ChatGPT-style" neural voice - browsers
// only expose whatever voices the OS ships, for free. Edge's
// "Online (Natural)" voices are real cloud neural voices (Azure) and
// sound best by far; macOS Enhanced/Premium voices are next; flat
// compact/default voices are last. This is only the fallback path now:
// the recorded clips below are what normally plays.
const PREFERRED_NAME_HINTS = [
  'siri',
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'aria',
  'zira',
  'susan',
  'jenny',
  'sonia',
  'ava',
  'allison',
  'zoe',
  'noelle',
  'isha',
  'natasha',
  'google us english',
];

function scoreVoice(voice) {
  const name = voice.name.toLowerCase();
  const uri = (voice.voiceURI || '').toLowerCase();
  const text = `${name} ${uri}`;
  const isEnglish = voice.lang.toLowerCase().startsWith('en');
  const soundsMale = /\bmale\b/.test(name) && !/\bfemale\b/.test(name);

  let score = 0;
  if (!isEnglish) score -= 10;
  if (soundsMale) score -= 10;
  if (text.includes('online')) score += 3;
  if (text.includes('natural')) score += 4;
  if (text.includes('neural')) score += 6;
  if (/premium|enhanced/.test(text)) score += 4;
  if (text.includes('siri')) score += 3;
  if (/female/.test(name)) score += 2;
  if (PREFERRED_NAME_HINTS.some((hint) => text.includes(hint))) score += 2;
  if (voice.localService === false) score += 2;
  if (/compact|espeak|robot/.test(text)) score -= 4;
  return score;
}

async function pickVoice() {
  const voices = await loadVoices();
  if (voices.length === 0) return null;
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

async function speakWithWebSpeechAPI(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.97;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  const voice = await pickVoice();
  if (voice) utterance.voice = voice;
  await new Promise((resolve) => {
    utterance.onend = resolve;
    utterance.onerror = resolve;
    window.speechSynthesis.speak(utterance);
  });
}

// Everything PitchPop says is a short clip recorded by a real person (in
// public/voice/): the nine color names, the seven note letters, and the
// end-of-round results. Clips are fetched and decoded once, then played
// through the shared AudioContext. If a clip can't load, the device's
// built-in voice says the same words instead.
const VOICE_BASE = `${import.meta.env.BASE_URL}voice/`;
const clipCache = new Map();

function loadClip(name) {
  if (!clipCache.has(name)) {
    const promise = fetch(`${VOICE_BASE}${name}.mp3`)
      .then((res) => {
        if (!res.ok) throw new Error(`Voice clip ${name}: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((data) => ensureAudio().decodeAudioData(data));
    // A failed load isn't cached, so a later try can succeed (e.g. back online).
    promise.catch(() => clipCache.delete(name));
    clipCache.set(name, promise);
  }
  return clipCache.get(name);
}

// Mobile browsers only let audio start playing when it's tied to a real
// user gesture, and a clip may still be loading when it's needed - by the
// time it's ready, the original tap no longer counts. Resuming the shared
// AudioContext synchronously on the very first tap anywhere "spends" that
// gesture; once resumed, the same context keeps working from async code
// and timers for the rest of the page session. This also matters on iOS
// specifically: clips play through this AudioContext rather than an
// <audio> element, which is the playback path iOS is willing to mix with
// other apps' audio (e.g. Spotify over CarPlay) instead of muting it -
// speechSynthesis, by contrast, always takes exclusive control there.
export function unlockAudio() {
  ensureAudio();
}

const COLOR_NAMES = ['red', 'yellow', 'blue', 'black', 'green', 'orange', 'purple', 'pink', 'brown'];

// Loads the color clips ahead of time so the first answer speaks at once;
// the rest load on first use.
export function prewarmVoices() {
  loadVoices();
  COLOR_NAMES.forEach((name) => loadClip(`color-${name}`).catch(() => {}));
}

// Resolves once playback actually finishes (or is cut off by a newer
// sound), so callers can chain something after the spoken words end (e.g.
// playing the real notes right after the color name, so "Blue" is followed
// by the actual B-D-G pitches instead of spoken letters with no real
// connection to the chord's pitch).
async function speakClip(name, fallbackText) {
  try {
    const buffer = await loadClip(name);
    await playBuffer(ensureAudio(), buffer);
  } catch (err) {
    console.warn('Voice clip unavailable, using the built-in voice', err);
    await speakWithWebSpeechAPI(fallbackText);
  }
}

export async function speakColorName(name) {
  await speakClip(`color-${name}`, name.charAt(0).toUpperCase() + name.slice(1));
}

// Spelled out for the built-in voice, which can read a lone "A" as the
// word "a".
const LETTER_SOUNDS = { A: 'Ay', B: 'Bee', C: 'See', D: 'Dee', E: 'Ee', F: 'Eff', G: 'Gee' };

export async function speakNoteName(letter) {
  await speakClip(`note-${letter.toLowerCase()}`, `${LETTER_SOUNDS[letter] || letter}.`);
}

// Recorded for rounds of 10 (both games' rounds are 10 long).
export async function speakResults(correct, total) {
  const wrong = total - correct;
  const text = correct === total ? `Perfect! You got all ${total} correct!` : `You got ${correct} correct and ${wrong} wrong.`;
  if (total === 10) speakClip(`result-${correct}`, text);
  else speakWithWebSpeechAPI(text);
}
