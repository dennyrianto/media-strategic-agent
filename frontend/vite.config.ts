import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Python (FastAPI) backend listens here during development.
// Override with:  VITE_API_TARGET=http://127.0.0.1:9000 npm run dev
const apiTarget = process.env.VITE_API_TARGET || 'http://127.0.0.1:8000';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      // All UI -> server calls are relative (/api/gemini/...), so the UI code
      // never needs to know where the backend runs.
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
