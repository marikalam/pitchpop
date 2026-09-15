function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => /natural|premium|enhanced|neural/i.test(v.name) && v.lang.startsWith('en'));
  return preferred || voices.find((v) => v.lang.startsWith('en')) || voices[0] || null;
}

export function speakColorName(name) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(name);
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}
