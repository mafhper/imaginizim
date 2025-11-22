import { defineConfig } from 'vite';

export default defineConfig({
  base: '/imaginizim/',
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 1000
  },
  
  server: {
    fs: {
      strict: false
    }
  },
  
  worker: {
    format: 'es'
  }
});
