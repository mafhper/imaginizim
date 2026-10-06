import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import { findSafePort, formatPortFallback } from './scripts/sonda-porta.mjs';

// Portas nomeadas, fora das faixas de incremento automatico do Vite:
// 5173-5175 (dev) e 4173-4175 (preview). O numero saiu do script npm para ca
// porque `--port` na linha de comando PREVALECE sobre o config -- ou seja,
// enquanto o script mandasse a porta, a sonda deste arquivo nunca rodava.
const DEV_PORT = Number(process.env.PORT) || 5190;
const PREVIEW_PORT = Number(process.env.PREVIEW_PORT) || 4190;

function readGitValue(command, fallback) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
}

// Vite 8 passa UM argumento: o proprio env, com `mode`, `command`, `isSsrBuild`
// e `isPreview`. A assinatura `(config, env)` e' do Vite 5/6 -- aqui `env` seria
// `undefined`. Medido em 2026-10-01, nao assumido.
export default defineConfig(async (env) => {
  // `command` e' 'serve' tanto no dev quanto no preview, entao nao serve para
  // escolher. `isPreview` separa os dois. Em `build` nao ha servidor, e a CI
  // roda build -- sondar ai seria trabalho puro.
  const isPreview = Boolean(env.isPreview);
  const isServe = env.command === 'serve';

  let devPort = DEV_PORT;
  let previewPort = PREVIEW_PORT;

  if (isServe) {
    if (isPreview) {
      previewPort = await findSafePort(PREVIEW_PORT, { rotulo: 'imaginizim preview' });
      if (previewPort !== PREVIEW_PORT) {
        console.warn(formatPortFallback(PREVIEW_PORT, previewPort, 'imaginizim preview'));
      }
    } else {
      devPort = await findSafePort(DEV_PORT, { rotulo: 'imaginizim' });
      if (devPort !== DEV_PORT) {
        console.warn(formatPortFallback(DEV_PORT, devPort, 'imaginizim'));
      }
    }
  }

  return {
    base: '/imaginizim/',
    plugins: [tailwindcss(), react()],
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
      port: devPort,
      // A sonda e a corrida entre ela e o bind nao sao removiveis. Com
      // strictPort a corrida falha alto e diz qual numero esta ocupada; sem
      // ele, o Vite incrementa em silencio -- que e o defeito que a sonda da
      // frota existe para nao deixar passar.
      strictPort: true,
      fs: {
        strict: false
      }
    },

    preview: {
      port: previewPort,
      strictPort: true
    },

    worker: {
      format: 'es'
    }
  };
});
