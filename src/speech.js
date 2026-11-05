import { audioContext, currentSound, isCurrent, isMuted } from './soundBus.js';

const ensureAudio = audioContext;

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
// compact/default voices are last. (Used where there's no Samantha.)
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

// Samantha: the iPhone's own US English voice (on every iPhone, and fine
// in a paid app). Elsewhere (no Samantha), the best English voice there is.
async function pickVoice() {
  const voices = await loadVoices();
  if (voices.length === 0) return null;
  const samantha = voices.find((v) => /samantha/i.test(v.name) && v.lang.toLowerCase().startsWith('en'));
  return samantha || [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
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
    // Never wait forever if the voice doesn't answer.
    setTimeout(resolve, 4000);
    window.speechSynthesis.speak(utterance);
  });
}

// Mobile browsers only let sound start when it's tied to a real tap.
// Resuming the shared AudioContext on the very first tap anywhere "spends"
// that tap, so chords and notes can play from timers after it.
export function unlockAudio() {
  ensureAudio();
}

export function prewarmVoices() {
  loadVoices();
}

// Resolves once the words have been said (or cut off by a newer sound), so
// callers can chain something after them (e.g. playing the real notes
// right after the color name). If something newer started meanwhile
// (soundBus), they aren't said at all. `fallbackText` is kept for callers
// that spell some words out for the built-in voice (see speakNoteName).
async function speak(text, fallbackText = text) {
  // Muted with the speaker button: no voice either.
  if (isMuted()) return;
  const soundId = currentSound();
  await loadVoices();
  if (!isCurrent(soundId)) return;
  await speakWithWebSpeechAPI(fallbackText);
}

// The language PitchPop speaks in for whoever is playing: 'en', or 'ja'
// (the phone's own Japanese voice - colors, ドレミ and results).
let lang = 'en';
export function setSpeechLanguage(next) {
  lang = next === 'ja' ? 'ja' : 'en';
}
export const speechLanguage = () => lang;

const JA_COLORS = {
  red: 'あか',
  yellow: 'きいろ',
  blue: 'あお',
  black: 'くろ',
  green: 'みどり',
  orange: 'オレンジ',
  purple: 'むらさき',
  pink: 'ピンク',
  brown: 'ちゃいろ',
  'light green': 'きみどり',
  beige: 'ベージュ',
};
const JA_NOTES = { C: 'ド', D: 'レ', E: 'ミ', F: 'ファ', G: 'ソ', A: 'ラ', B: 'シ' };

function japaneseVoice(voices) {
  const ja = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('ja'));
  const score = (v) => {
    const t = `${v.name} ${v.voiceURI || ''}`.toLowerCase();
    return (/premium|enhanced|siri/.test(t) ? 4 : 0) + (/kyoko|o-ren/.test(t) ? 2 : 0);
  };
  return ja.sort((a, b) => score(b) - score(a))[0] || null;
}

// The phone's Japanese voice (on iPhones: Kyoko).
async function speakJapanese(text) {
  if (isMuted() || !('speechSynthesis' in window)) return;
  const soundId = currentSound();
  const voices = await loadVoices();
  if (!isCurrent(soundId)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.95;
  const voice = japaneseVoice(voices);
  if (voice) utterance.voice = voice;
  await new Promise((resolve) => {
    utterance.onend = resolve;
    utterance.onerror = resolve;
    // Never wait forever if the voice doesn't answer.
    setTimeout(resolve, 4000);
    window.speechSynthesis.speak(utterance);
  });
}

export async function speakColorName(name) {
  if (lang === 'ja') return speakJapanese(JA_COLORS[name] || name);
  await speak(name.charAt(0).toUpperCase() + name.slice(1));
}

// Spelled-out names, so the built-in voice says the letter, not a word.
// Except A: "Ay" came out as "aye" (it sounded like "I"); the capital
// letter on its own, ending the sentence ("A."), is read as the letter.
const LETTER_SOUNDS = { A: 'A', B: 'Bee', C: 'See', D: 'Dee', E: 'Ee', F: 'Eff', G: 'Gee' };

export async function speakNoteName(letter) {
  if (lang === 'ja') return speakJapanese(JA_NOTES[letter] || letter);
  await speak(`${letter}.`, `${LETTER_SOUNDS[letter] || letter}.`);
}

// Any English words, e.g. the Theory quiz reading its question out loud.
export function speakWords(text) {
  return speak(text);
}

// Resolves once the voice is ready to talk, or after `ms` at most.
export function voiceReady(ms = 6000) {
  return Promise.race([loadVoices(), new Promise((resolve) => setTimeout(resolve, ms))]);
}

export async function speakResults(correct, total) {
  const wrong = total - correct;
  if (lang === 'ja') {
    speakJapanese(correct === total ? `すごい！${total}もん ぜんぶ せいかい！` : `${correct}もん せいかい、${wrong}もん まちがい。`);
    return;
  }
  const text = correct === total ? `Perfect! You got all ${total} correct!` : `You got ${correct} correct and ${wrong} wrong.`;
  speak(text);
}
