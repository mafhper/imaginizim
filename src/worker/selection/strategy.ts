import type { CompressionCandidate, ImageProfile, OptimizationMode, OutputFormat } from '../types';

const STRATEGY_BY_MODE: Record<
  OptimizationMode,
  { threshold: number; screenshotThreshold: number }
> = {
  balanced: { threshold: 0.87, screenshotThreshold: 0.82 },
  'max-compression': { threshold: 0.8, screenshotThreshold: 0.76 },
  'max-speed': { threshold: 0.91, screenshotThreshold: 0.88 }
};

function normalizeFormat(format: OutputFormat, originalType: string): string {
  if (format === 'original') return originalType;
  if (format === 'auto') return originalType;
  return format;
}

function addCandidate(target: Set<string>, value: string): void {
  if (!value) return;
  target.add(value);
}

export function getQualityThreshold(
  mode: OptimizationMode,
  profileKind?: ImageProfile['kind']
): number {
  if (profileKind === 'ui-screenshot') {
    return STRATEGY_BY_MODE[mode].screenshotThreshold;
  }
  return STRATEGY_BY_MODE[mode].threshold;
}

export function buildCandidates(
  originalType: string,
  outputFormat: OutputFormat,
  profile: ImageProfile,
  mode: OptimizationMode
): CompressionCandidate[] {
  if (outputFormat !== 'auto') {
    return [
      {
        format: normalizeFormat(outputFormat, originalType),
        strategyUsed: `manual-${mode}`
      }
    ];
  }

  if (originalType === 'image/svg+xml') {
    return [
      {
        format: 'image/svg+xml',
        strategyUsed: 'auto-vector'
      }
    ];
  }

  const candidates = new Set<string>();

  switch (profile.kind) {
    case 'photo':
      addCandidate(candidates, 'image/avif');
      addCandidate(candidates, 'image/webp');
      addCandidate(candidates, 'image/jpeg');
      break;
    case 'transparent-graphic':
      addCandidate(candidates, 'image/webp');
      addCandidate(candidates, 'image/png');
      addCandidate(candidates, 'image/avif');
      break;
    case 'ui-screenshot':
      addCandidate(candidates, 'image/webp');
      addCandidate(candidates, 'image/avif');
      addCandidate(candidates, 'image/png');
      break;
    case 'graphic':
      addCandidate(candidates, 'image/webp');
      addCandidate(candidates, 'image/png');
      addCandidate(candidates, 'image/avif');
      break;
    default:
      addCandidate(candidates, 'image/webp');
      addCandidate(candidates, 'image/jpeg');
      break;
  }

  return Array.from(candidates).map((format) => ({
    format,
    strategyUsed: `auto-${profile.kind}-${mode}`
  }));
}
