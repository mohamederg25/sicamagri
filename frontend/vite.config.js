import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path: /sicam/ en production (sous Apache), / en développement (Vite)
  base: mode === 'production' ? '/sicam/' : '/',

  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    
    // Generate source maps only in development
    sourcemap: mode === 'development',

    // Chunk splitting strategy
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router/') || id.includes('/node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          // UI & charts
          if (id.includes('/node_modules/lucide-react/') || id.includes('/node_modules/recharts/') || id.includes('/node_modules/react-grid-layout/')) {
            return 'vendor-ui';
          }
          // Data export (heavy libraries)
          if (id.includes('/node_modules/exceljs/') || id.includes('/node_modules/xlsx/') || id.includes('/node_modules/jspdf/') || id.includes('/node_modules/html2canvas/')) {
            return 'vendor-export';
          }
          // Networking
          if (id.includes('/node_modules/axios/') || id.includes('/node_modules/socket.io-client/') || id.includes('/node_modules/engine.io-client/')) {
            return 'vendor-network';
          }
        },
      },
    },

    // CSS handling
    cssCodeSplit: false,

    // Reduce asset size warnings — our PDF/image assets are intentionally large
    chunkSizeWarningLimit: 500,
  },

  server: {
    // Hot-reload optimization
    watch: {
      usePolling: false,
    },
  },
}))
