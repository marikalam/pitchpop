// Copies the speech engine into the iOS build so the app never has to
// download it: the onnxruntime and phonemizer WASM files come from
// node_modules, and the ~63MB Piper voice model is downloaded once into
// .ios-assets-cache/ (gitignored) and reused on every later build.
// src/piper.js points at these copies when running inside the native app.
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DIST = 'dist/speech';
const CACHE = '.ios-assets-cache';
const VOICE_PATH = 'en/en_US/hfc_female/medium/en_US-hfc_female-medium.onnx';
const HF_BASE = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main';

const LOCAL_FILES = [
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', 'ort/ort-wasm-simd-threaded.wasm'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs', 'ort/ort-wasm-simd-threaded.mjs'],
  ['node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.wasm', 'piper_phonemize.wasm'],
  ['node_modules/@diffusionstudio/piper-wasm/build/piper_phonemize.data', 'piper_phonemize.data'],
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await exists(dest)) return;
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

for (const [from, to] of LOCAL_FILES) {
  const dest = join(DIST, to);
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(from, dest);
}

for (const suffix of ['', '.json']) {
  const cached = join(CACHE, VOICE_PATH + suffix);
  await download(`${HF_BASE}/${VOICE_PATH}${suffix}`, cached);
  const dest = join(DIST, 'voices', VOICE_PATH + suffix);
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(cached, dest);
}

console.log('Copied speech assets into dist/speech');
