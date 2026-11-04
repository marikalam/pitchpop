import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The website lives under /apps/pitchpop/; the iOS app (built with
// `--mode ios`) serves the same files from its own root.
export default defineConfig(({ mode }) => ({
  base: mode === 'ios' ? '/' : '/apps/pitchpop/',
  plugins: [react()],
}));
