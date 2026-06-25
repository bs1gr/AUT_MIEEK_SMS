
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { readFileSync } from 'fs'

// Inject version from package.json (strip 'v' prefix if present)
let version = 'dev';
try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  version = (pkg.version || 'dev').replace(/^v/, '');
} catch {}

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || 'http://127.0.0.1:8000';

export default defineConfig(({ mode }) => {
  // Capacitor serves from file:// — relative base required for Android builds
  const isAndroid = mode === 'android';
  return {
  base: isAndroid ? './' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Student Management System',
        short_name: 'SMS',
        description: 'Comprehensive student management and grading platform',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        categories: ['education', 'productivity'],
        screenshots: [
          {
            src: 'screenshot-540x720.png',
            sizes: '540x720',
            type: 'image/png',
            form_factor: 'narrow',
          },
          {
            src: 'screenshot-1280x720.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/node_modules/**/*', './**/*.map'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB max per file
        // IMPORTANT: Never cache API responses - always fetch fresh data
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          // Skip API caching entirely - let browser handle it naturally
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fonts-cache',
              expiration: {
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
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
  optimizeDeps: {
    // Restrict the dep scanner to the actual source tree. Without this Vite
    // scans the entire project, including android/app/build/ artifacts, and
    // chokes on bundled chunks that reference peer deps not in node_modules.
    entries: ['./src/main.tsx'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173, // Standard Vite dev port for local development
    strictPort: true, // Fail if port is in use (prevents silent port changes)
    watch: {
      // Ignore Android Gradle build output and dist to prevent spurious FS events
      ignored: ['**/android/**', '**/dist/**'],
    },
    proxy: {
      '/api': {
        target: devProxyTarget,
        changeOrigin: true,
      },
      '/control': {
        target: devProxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: devProxyTarget,
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
        passes: 2, // Multiple passes for better compression
      },
      mangle: {
        safari10: true, // Ensure Safari 10+ compatibility
      },
    },
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better caching
        manualChunks(id) {
          // App code is NOT manually chunked — routes.ts uses lazy() dynamic imports
          // which create natural split boundaries without circular dependencies.
          // Per-feature named chunks caused circular chunk deps (dashboard ↔ students
          // ↔ attendance ↔ grading), making Rollup emit a TDZ that prevented React
          // from mounting ("Cannot access 'l' before initialization").
          if (!id.includes('node_modules')) {
            return undefined;
          }

          // Vendor chunk splitting for optimal caching
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
          if (id.includes('framer-motion')) {
            return 'animation-vendors';
          }
          if (id.includes('zustand')) {
            return 'state-vendors';
          }
          if (id.includes('zod')) {
            return 'validation-vendors';
          }
          if (id.includes('axios')) {
            return 'http-vendors';
          }
          if (id.includes('@radix-ui')) {
            return 'ui-vendors';
          }
          return 'vendor';
        },
        // Optimize asset file names for better caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.');
          const extType = info?.[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(extType || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Source maps for production debugging (can be disabled for smaller bundles)
    sourcemap: false,
    // Optimize module preloading
    modulePreload: {
      polyfill: true,
    },
  },
  }; // end return
})
