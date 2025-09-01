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
      '/api/config': {
        target: process.env.VITE_CONFIG_API_URL || process.env.VITE_CONFIG_API_BASE_URL || 'https://kk0z1vq9tf.execute-api.us-east-1.amazonaws.com/prod',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/config/, ''),
      },
      // Add waitlist API proxy with a fallback URL to prevent errors
      '/api/waitlist': {
        target: process.env.VITE_WAITLIST_API_URL || process.env.VITE_WAITLIST_API_BASE_URL || 'https://gqnlet2yol.execute-api.us-east-1.amazonaws.com/prod/waitlist',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const newPath = path.replace(/^\/api\/waitlist/, '');
          console.log(`Rewriting waitlist path ${path} to ${newPath}`);
          return newPath;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('waitlist proxy error', err);
          });
        }
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-toastify'],
          'aws-vendor': ['@aws-sdk/client-cognito-identity-provider'],
          'date-vendor': ['date-fns', 'react-datepicker']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});