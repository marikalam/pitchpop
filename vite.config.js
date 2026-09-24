import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/apps/pitchpop/',
  plugins: [react()],
  optimizeDeps: {
    // These Emscripten-based WASM loaders resolve their own asset URLs via
    // import.meta.url at load time; Vite's dev-time pre-bundling rewrites
    // that in a way that breaks path resolution, so leave them unbundled.
    exclude: ['@mintplex-labs/piper-tts-web', 'onnxruntime-web'],
  },
});
