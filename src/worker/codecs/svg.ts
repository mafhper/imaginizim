import type { OptimizationMode } from '../types';

const svgoUrl = `${import.meta.env.BASE_URL}svgo.browser.js`;

let optimizeSvg: ((input: string, options?: object) => { data: string }) | null = null;
let svgoInitialized = false;

async function initSvgo(): Promise<void> {
  if (svgoInitialized) return;

  const svgoModule = await new Function('url', 'return import(url)')(svgoUrl);
  optimizeSvg = svgoModule.optimize;
  svgoInitialized = true;
}

function getSvgOptions(mode: OptimizationMode): object {
  const floatPrecision = mode === 'max-compression' ? 2 : 3;

  return {
    multipass: true,
    js2svg: {
      indent: 0,
      pretty: false
    },
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupNumericValues: {
              floatPrecision
            },
            convertPathData: {
              floatPrecision
            }
          }
        }
      },
      'removeDimensions',
      'sortAttrs'
    ]
  };
}

export async function optimizeSvgBlob(file: Blob, mode: OptimizationMode): Promise<Blob> {
  await initSvgo();

  if (!optimizeSvg) {
    throw new Error('SVGO failed to initialize.');
  }

  const text = await file.text();
  const result = optimizeSvg(text, getSvgOptions(mode));
  return new Blob([result.data], { type: 'image/svg+xml' });
}
