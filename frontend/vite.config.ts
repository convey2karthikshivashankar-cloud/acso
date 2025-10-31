import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    // Enable code splitting and chunk optimization
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@mui/lab'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-charts': ['recharts', 'd3'],
          
          // Feature-based chunks
          'dashboard': [
            './src/components/dashboard/DashboardLayoutEngine.tsx',
            './src/components/dashboard/RoleBasedDashboard.tsx',
            './src/components/dashboard/EnhancedDashboard.tsx',
          ],
          'agents': [
            './src/components/agents/AgentOverview.tsx',
            './src/components/agents/AgentConfigurationManager.tsx',
            './src/components/agents/AgentLogViewer.tsx',
            './src/components/agents/AgentDiagnostics.tsx',
          ],
          'workflow': [
            './src/components/workflow/WorkflowDesigner.tsx',
            './src/components/workflow/WorkflowExecutionMonitor.tsx',
            './src/components/workflow/WorkflowTemplateManager.tsx',
          ],
          'incidents': [
            './src/components/incidents/IncidentManagementDashboard.tsx',
          ],
          'charts': [
            './src/components/charts/TimeSeriesChart.tsx',
            './src/components/charts/NetworkTopology.tsx',
            './src/components/charts/HeatMap.tsx',
            './src/components/charts/InteractiveChart.tsx',
            './src/components/charts/RealTimeChart.tsx',
          ],
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    // Optimize build settings
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Enable source maps for production debugging
    sourcemap: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Development server configuration
  server: {
    port: 3000,
    open: true,
    cors: true,
  },
  // Preview server configuration
  preview: {
    port: 3000,
    open: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@reduxjs/toolkit',
      'react-redux',
    ],
    exclude: [
      // Exclude large dependencies that should be loaded on demand
      'recharts',
      'd3',
    ],
  },
  // Define environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});