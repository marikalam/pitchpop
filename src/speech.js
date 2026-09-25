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
// compact/default voices are last. This is only the fallback path now —
// speak() below tries a real local neural voice (Piper) first.
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
  window.speechSynthesis.speak(utterance);
}

// piper-tts-web pulls in onnxruntime-web (a sizeable WASM runtime), so it's
// dynamically imported rather than bundled into the main chunk — nobody
// pays for it until speech is actually requested. The voice model itself
// (~60MB) downloads once and is cached by the browser after that.
let piperModulePromise = null;
function getPiperModule() {
  if (!piperModulePromise) piperModulePromise = import('./piper.js');
  return piperModulePromise;
}

// Mobile browsers only let audio start playing when it's tied to a real
// user gesture, and speech goes through an async pipeline (model load +
// inference) before it has anything to play — by the time it's ready, the
// original tap no longer counts. Resuming the shared AudioContext
// synchronously on the very first tap anywhere "spends" that gesture; once
// resumed, the same context keeps working from async code and timers for
// the rest of the page session. This also matters on iOS specifically:
// speech plays through this AudioContext rather than an <audio> element,
// which is the playback path iOS is willing to mix with other apps' audio
// (e.g. Spotify over CarPlay) instead of muting it — speechSynthesis, by
// contrast, always takes exclusive control there.
export function unlockAudio() {
  ensureAudio();
}

export function prewarmVoices() {
  loadVoices();
  getPiperModule()
    .then((m) => m.loadPiper())
    .catch(() => {
      /* Piper couldn't load (unsupported browser, offline on first-ever use, etc.) — speak() falls back to the OS voice */
    });
}

let currentSource = null;

async function speak(text) {
  try {
    const { synthesizeSpeech } = await getPiperModule();
    const blob = await synthesizeSpeech(text);
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = ensureAudio();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    if (currentSource) {
      try {
        currentSource.stop();
      } catch {
        /* already stopped */
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    currentSource = source;
    source.start();
  } catch (err) {
    console.warn('Piper TTS unavailable, falling back to the built-in voice', err);
    speakWithWebSpeechAPI(text);
  }
}

export async function speakColorName(name, notes) {
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  if (!notes || !Array.isArray(notes) || notes.length === 0) {
    speak(capitalized);
    return;
  }
  // A bare run of letters ("C E G") gets slurred together or misread - "A"
  // in particular comes out as the word "a" instead of the letter name. A
  // trailing period per letter forces TTS engines to read each one as a
  // spelled-out letter, with a clear pause between them.
  const spelled = notes.map((n) => `${n}.`).join(' ');
  speak(`${capitalized} is ${spelled}`);
}

export async function speakResults(correct, total) {
  const wrong = total - correct;
  const text = correct === total ? `Perfect! You got all ${total} correct!` : `You got ${correct} correct and ${wrong} wrong.`;
  speak(text);
}
