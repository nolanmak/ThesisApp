import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  define: {
    'process.env': process.env
  },
  server: {
    // Handle client-side routing
    historyApiFallback: true,
    // Proxy API requests to avoid CORS issues during development
  },
  proxy: {
    proxy: {
      '/historical': {
        target: process.env.VITE_HISTORICAL_API_BASE_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/historical/, '')
      },
      '/earnings': {
        target: process.env.VITE_EARNINGS_API_BASE_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/earnings/, '')
      },
      '/config': {
        target: process.env.VITE_CONFIG_API_BASE_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/config/, '')
      },
      '/messages': {
        target: process.env.VITE_MESSAGES_API_BASE_URL,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/messages/, '')
      },
    }
  },
  build: {
    // Generate a _redirects file for Netlify or similar hosting
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});