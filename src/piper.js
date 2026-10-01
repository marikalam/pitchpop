import { Capacitor } from '@capacitor/core';
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
const WEB_ONNX_WASM_BASE = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/';
const WEB_PHONEMIZER_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';

// The iOS app ships all of this inside the app bundle (see
// scripts/copy-ios-assets.mjs), so speech works offline from the first
// launch and nothing is downloaded over cellular.
const IS_NATIVE = Capacitor.isNativePlatform();
const LOCAL_SPEECH_BASE = new URL('speech/', window.location.href).href;
const ONNX_WASM_BASE = IS_NATIVE ? `${LOCAL_SPEECH_BASE}ort/` : WEB_ONNX_WASM_BASE;
const PHONEMIZER_BASE = IS_NATIVE ? `${LOCAL_SPEECH_BASE}piper_phonemize` : WEB_PHONEMIZER_BASE;

// piper-tts-web hardcodes Hugging Face as the voice model's home and keeps a
// second copy of the model in the browser's private file storage (OPFS).
// Inside the app the model is already on disk, so voice downloads are
// pointed at the bundled copy and the extra 63MB cache copy is skipped
// (the library treats a missing OPFS as "no cache" and carries on).
const HF_VOICES_BASE = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main/';
if (IS_NATIVE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url && url.startsWith(HF_VOICES_BASE)) {
      return originalFetch(`${LOCAL_SPEECH_BASE}voices/${url.slice(HF_VOICES_BASE.length)}`, init);
    }
    return originalFetch(input, init);
  };
  if (navigator.storage) {
    navigator.storage.getDirectory = () => Promise.reject(new Error('Voice cache disabled in the app'));
  }
}

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
