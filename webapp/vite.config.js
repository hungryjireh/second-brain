import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy `/api` to backend during local dev. `vercel dev` already handles /api routing,
    // but when running `npm run dev` this ensures API calls reach the backend.
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5173',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
