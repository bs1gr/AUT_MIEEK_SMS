
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

// Inject version from package.json
let version = 'dev';
try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  version = pkg.version || 'dev';
} catch {}

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/api': path.resolve(__dirname, './src/api'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/stores': path.resolve(__dirname, './src/stores'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/control': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendors';
          }
          if (id.includes('@tanstack')) {
            return 'query-vendors';
          }
          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'i18n-vendors';
          }
          if (id.includes('lucide-react')) {
            return 'icons-vendors';
          }
          if (id.includes('zustand')) {
            return 'state-vendors';
          }
          if (id.includes('zod')) {
            return 'validation-vendors';
          }
          return 'vendor';
        },
      },
    },
  },
})
