import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'

// ESM-only config to eliminate CJS deprecation warnings
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11']
    }),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/renderer/components'),
      '@lib': path.resolve(__dirname, './src/renderer/lib'),
      '@main': path.resolve(__dirname, './src/main'),
      '@types': path.resolve(__dirname, './src/types')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separate node_modules into vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('axios') || id.includes('dompurify')) {
              return 'utils';
            }
            if (id.includes('@testing-library') || id.includes('jest')) {
              return null; // Exclude test libraries from production
            }
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  server: {
    port: 5173,
    host: true, // Allow external access for testing
    cors: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios']
  },
  define: {
    // Ensure process is available for compatibility
    global: 'globalThis',
    'process.env': {}
  },
  // Force ESM to eliminate CJS deprecation warnings
  ssr: {
    format: 'esm'
  },
  esbuild: {
    format: 'esm'
  }
})