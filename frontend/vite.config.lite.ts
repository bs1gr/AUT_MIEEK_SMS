/**
 * Vite config for Native Lite build
 * Key differences from vite.config.ts:
 * - base: './' (relative paths for file:// protocol)
 * - output to dist_lite/
 * - VITE_API_URL set to localhost:8765
 * - no dev proxy (static build only)
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'

let version = 'dev'
try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
  version = (pkg.version || 'dev').replace(/^v/, '')
} catch {}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Student Management System - Native Lite',
        short_name: 'SMS Lite',
        description: 'Student management system (offline)',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        scope: './',
      },
    }),
  ],

  define: {
    'import.meta.env.VITE_VERSION': JSON.stringify(version),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:8765/api/v1'),
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    outDir: 'dist_lite',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendors': ['react', 'react-dom', 'react-router-dom'],
          'http-vendors': ['axios', '@tanstack/react-query'],
          'ui-vendors': ['clsx', 'zustand'],
          'features-students': ['./src/features/students'],
          'features-courses': ['./src/features/courses'],
          'features-grades': ['./src/features/grades'],
          'features-attendance': ['./src/features/attendance'],
          'features-analytics': ['./src/features/analytics'],
          'features-auth': ['./src/features/auth'],
        },
      },
    },
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
