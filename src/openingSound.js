// The little "pop + sparkle" PitchPop and Math Pop both play when they open:
// a bubble pop, then four quick bell notes rising up a C major chord
// (C E G C). The same file is in both apps, so they sound like a family.
// Built from plain tones - no sound file to download.
//
// The iPhone app is allowed to play sound without a tap, so it plays on
// every fresh start. A web browser usually isn't until the first tap; then
// it just doesn't play (a jingle on some later tap would be confusing).

const BELLS = [1046.5, 1318.5, 1568.0, 2093.0];

function pop(ctx, out, at) {
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, at);
  osc.frequency.exponentialRampToValueAtTime(1300, at + 0.06);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(0.5, at + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + 0.1);
}

// A soft bell: the note plus a quieter, faster-fading overtone.
function bell(ctx, out, freq, at, length, volume) {
  [
    [1, volume],
    [2.76, volume * 0.18],
  ].forEach(([ratio, peak]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq * ratio;
    const gain = ctx.createGain();
    const fade = ratio === 1 ? length : length * 0.35;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + fade);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + fade + 0.02);
  });
}

let played = false;

export function playOpeningSound() {
  if (played) return;
  played = true;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  let ctx;
  try {
    ctx = new AudioCtx();
  } catch {
    return;
  }
  const close = () => ctx.close().catch(() => {});
  const play = () => {
    if (ctx.state !== 'running') {
      close();
      return;
    }
    const out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(ctx.destination);
    const start = ctx.currentTime + 0.05;
    pop(ctx, out, start);
    BELLS.forEach((freq, i) => {
      const last = i === BELLS.length - 1;
      bell(ctx, out, freq, start + 0.1 + i * 0.075, last ? 0.9 : 0.45, last ? 0.22 : 0.17);
    });
    setTimeout(close, 1600);
  };
  if (ctx.state === 'running') {
    play();
    return;
  }
  // Give the phone a moment to say yes; a browser that wants a tap first
  // never answers, so stop waiting after half a second.
  Promise.race([ctx.resume().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 500))]).then(play);
}
