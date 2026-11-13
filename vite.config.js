import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The website lives under /apps/pitchpop/; the iOS app (built with
// `--mode ios`) serves the same files from its own root.
export default defineConfig(({ mode }) => ({
  base: mode === 'ios' ? '/' : '/apps/pitchpop/',
  plugins: [react()],
  // Also runs in older Safari, on iPhones that can't update past iOS 12
  // (the iPhone 6); src/oldPhones.js fills in what that Safari lacks.
  build: { target: ['es2017', 'safari12'] },
}));
