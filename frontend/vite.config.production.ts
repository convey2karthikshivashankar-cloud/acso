import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
    },
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'd3-vendor': ['d3'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'yup'],
          'date-vendor': ['date-fns'],
          
          // Feature chunks
          'dashboard': [
            './src/components/dashboard',
            './src/pages/Dashboard.tsx'
          ],
          'agents': [
            './src/components/agents',
            './src/pages/AgentsPage.tsx'
          ],
          'incidents': [
            './src/components/incidents',
            './src/pages/IncidentsPage.tsx'
          ],
          'financial': [
            './src/components/financial',
            './src/pages/FinancialPage.tsx'
          ],
          'workflows': [
            './src/components/workflow',
            './src/pages/WorkflowsPage.tsx'
          ],
        },
        
        // Asset naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return `fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@types': resolve(__dirname, 'src/types'),
      '@store': resolve(__dirname, 'src/store'),
    },
  },
  
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.REACT_APP_BUILD_VERSION': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'process.env.REACT_APP_BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
  
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  
  preview: {
    port: 3000,
    host: true,
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@reduxjs/toolkit',
      'react-redux',
      'chart.js',
      'react-chartjs-2',
      'd3',
      'react-hook-form',
      'date-fns',
    ],
  },
});