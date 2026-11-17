/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// GitHub Pages serves the site from /<repo-name>/. The deploy workflow sets
// BASE_PATH; local dev and preview fall back to "/".
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  server: {
    // `npm run dev:phone` exposes the dev server on your Wi-Fi. Never serve
    // the private profile (or env files) to anyone on the network.
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/private/**'] },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      // "prompt" rather than "autoUpdate": a new version should never reload
      // the page in the middle of a session at the pitch.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Touchline: Winger Coach',
        short_name: 'Touchline',
        description: 'Your personal coach for the left wing.',
        lang: 'en',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0A1F44',
        background_color: '#0A1F44',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
