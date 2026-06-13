import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
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
  },
  plugins: [
    react(),
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
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
            if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion')) return 'ui';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('recharts')) return 'charts';
            return 'modules';
          }
        }
      }
    }
  }
}));
