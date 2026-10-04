// A real grand piano for the Piano, Scales and Hanon screens (and
// NoteSpeller): recordings of a Yamaha C5 grand - the Salamander Grand
// Piano by Alexander Holm, CC BY 3.0 (public/piano/CREDITS.txt) - one
// every three semitones, the notes between played slightly faster or
// slower. Until they've loaded (or if they can't be), PitchPop's own
// synthesized piano plays instead.
const SAMPLE_MIDIS = Array.from({ length: 30 }, (_, i) => 21 + i * 3); // A0 ... C8

let buffers = null;
let loading = null;

export function loadPianoSamples(ctx) {
  if (!loading) {
    const base = `${import.meta.env.BASE_URL}piano/`;
    loading = Promise.all(
      SAMPLE_MIDIS.map(async (midi) => {
        const response = await fetch(`${base}${midi}.mp3`);
        if (!response.ok) throw new Error(`piano sample ${midi}: ${response.status}`);
        const data = await response.arrayBuffer();
        return [midi, await ctx.decodeAudioData(data)];
      }),
    )
      .then((list) => {
        buffers = new Map(list);
      })
      .catch((err) => {
        // Keep the synthesized piano; try again next time.
        console.error('PitchPop is using its built-in piano sound', err);
        loading = null;
      });
  }
  return loading;
}

// The recording nearest a pitch (a MIDI number, may be fractional) and the
// playback rate that tunes it, or null while not loaded.
export function pianoSample(midi) {
  if (!buffers) return null;
  const nearest = SAMPLE_MIDIS.reduce((a, b) => (Math.abs(b - midi) < Math.abs(a - midi) ? b : a));
  return { buffer: buffers.get(nearest), rate: 2 ** ((midi - nearest) / 12) };
}

export function freqMidi(freq) {
  return 69 + 12 * Math.log2(freq / 440);
}
