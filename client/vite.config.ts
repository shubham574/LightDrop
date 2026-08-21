import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false,
      },
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'OpticalDrop',
        short_name: 'OpticalDrop',
        description: 'Send files through light - offline optical file transfer',
        theme_color: '#070a11',
        background_color: '#070a11',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/receive',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['utilities', 'productivity'],
        shortcuts: [
          {
            name: 'Receive File',
            short_name: 'Receive',
            description: 'Open camera to receive file',
            url: '/receive',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Send File',
            short_name: 'Send',
            description: 'Select file to transmit',
            url: '/send',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@optical-drop/shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-progress'],
          qr: ['qrcode', 'jsqr'],
        },
      },
    },
  },
});