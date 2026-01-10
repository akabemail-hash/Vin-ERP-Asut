
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This is crucial for Electron: it ensures assets are loaded via './' instead of '/'
  // because Electron loads files from the file system, not a web root.
  base: './', 
});
