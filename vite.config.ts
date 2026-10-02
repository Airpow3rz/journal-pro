import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

// base: './' → l'app fonctionne quel que soit le nom du dépôt GitHub Pages
// (https://<utilisateur>.github.io/<depot>/). La navigation passe par un HashRouter.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Journal Pro',
        short_name: 'Journal Pro',
        description: 'Journal de travail professionnel, 100 % local.',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6f5f2',
        theme_color: '#2f5d50',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tout le code (y compris le module PDF, volumineux) est mis en cache pour le hors-ligne.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
