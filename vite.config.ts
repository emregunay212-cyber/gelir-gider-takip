import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'notification-handler.js'],
      workbox: {
        // Yeni service worker yüklenir yüklenmez devralır,
        // mevcut tab'lar agresif şekilde yeni sürüme geçer.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Custom SW kodu — notification click handler
        importScripts: ['/notification-handler.js'],
      },
      manifest: {
        name: 'Aile Bütçe',
        short_name: 'Bütçe',
        description: 'Emre & Sıla aile gelir-gider takip uygulaması',
        lang: 'tr',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'react';
          }
          if (
            id.includes('node_modules/react-hook-form') ||
            id.includes('node_modules/@hookform') ||
            id.includes('node_modules/zod')
          ) {
            return 'form';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          return undefined;
        },
      },
    },
  },
});
