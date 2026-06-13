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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-slot", "@radix-ui/react-tooltip", "@radix-ui/react-dropdown-menu", "lucide-react", "framer-motion"],
          query: ["@tanstack/react-query"],
          charts: ["recharts"]
        }
      }
    }
  }
}));
