import type { QueueDensity } from '../types';

const STORAGE_KEY = 'imaginizim.queueDensity';
const DENSITIES: readonly QueueDensity[] = ['comfort', 'compact'];

interface DensityElements {
  app: HTMLElement;
  comfortButton: HTMLButtonElement;
  compactButton: HTMLButtonElement;
}

function isQueueDensity(value: string | null): value is QueueDensity {
  return Boolean(value && DENSITIES.includes(value as QueueDensity));
}

export function getStoredQueueDensity(): QueueDensity {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (isQueueDensity(value)) {
      return value;
    }
  } catch {
    // Ignore persistence errors.
  }

  return 'comfort';
}

export function persistQueueDensity(density: QueueDensity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, density);
  } catch {
    // Ignore persistence errors.
  }
}

export function applyQueueDensityUi(elements: DensityElements, density: QueueDensity): void {
  elements.app.classList.toggle('queue-compact', density === 'compact');
  elements.comfortButton.classList.toggle('active', density === 'comfort');
  elements.compactButton.classList.toggle('active', density === 'compact');
  elements.comfortButton.setAttribute('aria-pressed', String(density === 'comfort'));
  elements.compactButton.setAttribute('aria-pressed', String(density === 'compact'));
}
