import { TtsSession } from '@mintplex-labs/piper-tts-web';

// A fast, genuinely natural-sounding local voice. "medium" quality is the
// same download size as "low" for this voice, so there's no reason to use
// the lower tier. Inference is sub-second once the session is warm.
const VOICE_ID = 'en_US-hfc_female-medium';

// onnxruntime-web's own WASM runtime, pinned to the exact version this app
// installed so the JS glue and the WASM binary never drift apart. The
// package's built-in defaults for the phonemizer's own wasm/data files
// point at a real but non-functional path (locateFile resolves undefined
// inside the Emscripten loader), so those are pinned explicitly too.
const ONNX_WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
const PHONEMIZER_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';

let sessionPromise = null;

export function loadPiper() {
  if (!sessionPromise) {
    sessionPromise = TtsSession.create({
      voiceId: VOICE_ID,
      wasmPaths: {
        onnxWasm: ONNX_WASM_BASE,
        piperData: `${PHONEMIZER_BASE}.data`,
        piperWasm: `${PHONEMIZER_BASE}.wasm`,
      },
    }).catch((err) => {
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

export async function synthesizeSpeech(text) {
  const session = await loadPiper();
  return session.predict(text);
}
