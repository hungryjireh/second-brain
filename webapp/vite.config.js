import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    port: 5173,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), '..'],
    },
    // Proxy `/api` to backend during local dev. `vercel dev` already handles /api routing,
    // but when running `npm run dev` this ensures API calls reach the backend.
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
