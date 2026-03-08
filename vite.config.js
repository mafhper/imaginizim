import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react-swc';

function readGitValue(command, fallback) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

export default defineConfig({
  base: '/imaginizim/',
  plugins: [react()],
  define: {
    __APP_COMMIT_HASH__: JSON.stringify(readGitValue('git rev-parse --short HEAD', 'unknown')),
    __APP_COMMIT_MESSAGE__: JSON.stringify(readGitValue('git log -1 --pretty=%s', 'No message')),
    __APP_REPO_URL__: JSON.stringify(
      readGitValue('git remote get-url origin', 'https://github.com/mafhper/imaginizim')
    )
  },

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
