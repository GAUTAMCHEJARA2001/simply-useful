import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

/**
 * VITE STABLE CONFIGURATION (BATTLE-TESTED)
 * Features: 
 * - Standard React Plugin (Stable & Reliable)
 * - Hardened Dependency Pre-Bundling
 * - Absolute Path Aliasing (@)
 */
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        importScripts: ['notification-sw.js'],
        maximumFileSizeToCacheInBytes: 5000000,
      },
      manifest: {
        name: 'Kamla OTS',
        short_name: 'Kamla OTS',
        description: 'Kamla OTS - Order Tracking System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/login?source=pwa',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: "buffer",
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    include: ["buffer"],
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
            if (
              id.includes('@radix-ui') ||
              id.includes('lucide-react') ||
              id.includes('framer-motion') ||
              id.includes('cmdk') ||
              id.includes('vaul') ||
              id.includes('embla-carousel') ||
              id.includes('react-day-picker')
            ) return 'ui';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('axios')) return 'network';
            if (id.includes('date-fns')) return 'date';
            if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform')) return 'forms';
            if (id.includes('@react-pdf') || id.includes('pdf-lib') || id.includes('pdfkit') || id.includes('fontkit')) return 'pdf';
            if (id.includes('html2pdf') || id.includes('html2canvas') || id.includes('jspdf')) return 'html2pdf';
            if (id.includes('buffer') || id.includes('process')) return 'polyfills';
            return 'modules';
          }
        }
      }
    }
  }
}));
