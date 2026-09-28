import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The website lives under /apps/pitchpop/; the iOS app (built with
// `--mode ios`) serves the same files from its own root.
export default defineConfig(({ mode }) => ({
  base: mode === 'ios' ? '/' : '/apps/pitchpop/',
  plugins: [react()],
  optimizeDeps: {
    // These Emscripten-based WASM loaders resolve their own asset URLs via
    // import.meta.url at load time; Vite's dev-time pre-bundling rewrites
    // that in a way that breaks path resolution, so leave them unbundled.
    exclude: ['@mintplex-labs/piper-tts-web', 'onnxruntime-web'],
  },
}));
