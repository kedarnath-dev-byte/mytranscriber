/**
 * vite.config.js — Vite Build Configuration
 *
 * Builds the React frontend for Electron renderer process.
 *
 * Dev mode: runs on http://localhost:5173
 * Build output: ./dist/ folder (loaded by Electron in production)
 *
 * 🤗 HF_DEPLOY — for web deployment, change base to '/'
 * and deploy the dist/ folder to HuggingFace Spaces
 *
 * 📱 MOBILE_HOOK — for Capacitor mobile, run:
 * npx cap add android / npx cap add ios
 * then copy dist/ to Capacitor web dir
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'src',
  plugins: [react()],

  // 🤗 HF_DEPLOY — change './' to '/' for web deployment
  base: './',

  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    // Proxy API calls to backend during development
    proxy: {
      '/auth': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
    },
  },
});