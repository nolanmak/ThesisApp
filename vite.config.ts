import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  define: {
    'process.env': process.env
  },
  server: {
    port: 5173,
    // Handle client-side routing
    historyApiFallback: true,
    // Proxy API requests to avoid CORS issues during development
    proxy: {
      // Proxy historical API requests - this is the only one we really need to proxy due to CORS
      '/api/historical': {
        target: process.env.VITE_HISTORICAL_API_URL || process.env.VITE_HISTORICAL_API_BASE_URL || 'https://rjuc6cu3d0.execute-api.us-east-1.amazonaws.com/prod',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          // Log and rewrite the path for debugging
          const newPath = path.replace(/^\/api\/historical/, '');
          console.log(`Rewriting path ${path} to ${newPath}`);
          return newPath;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Log the full request for debugging
            console.log(`Proxying ${req.method} request to: ${req.url}`);
            console.log('Headers:', req.headers);
          });
        }
      },
      // Update earnings API proxy to use the correct URL and add debugging
      '/api/earnings': {
        target: process.env.VITE_EARNINGS_API_URL || process.env.VITE_EARNINGS_API_BASE_URL || 'https://iyeq9eqgnb.execute-api.us-east-1.amazonaws.com/prod',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const newPath = path.replace(/^\/api\/earnings/, '');
          console.log(`Rewriting earnings path ${path} to ${newPath}`);
          return newPath;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('earnings proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`Proxying earnings ${req.method} request to: ${req.url}`);
            console.log('Earnings Headers:', req.headers);
          });
        }
      },
      '/api/messages': {
        target: process.env.VITE_MESSAGES_API_URL || process.env.VITE_MESSAGES_API_BASE_URL || 'https://kk0z1vq9tf.execute-api.us-east-1.amazonaws.com/prod',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/messages/, ''),
      },
      '/api/config': {
        target: process.env.VITE_CONFIG_API_URL || process.env.VITE_CONFIG_API_BASE_URL || 'https://kk0z1vq9tf.execute-api.us-east-1.amazonaws.com/prod',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/config/, ''),
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
  }
});