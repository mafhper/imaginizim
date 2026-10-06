import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompressorView } from '../src/app/components/home/CompressorView';
import type { QueueRecord, RecordSettings } from '../src/app/types';

/**
 * The density toggle existed in the provider for months with no way to reach
 * it: `CompressorView` declared `density` and `onSetDensity` and never
 * destructured them. This is the regression test for that — the props being
 * declared is not the same as the props being used.
 */
function record(overrides: Partial<QueueRecord> = {}): QueueRecord {
  const settings: RecordSettings = {
    quality: 0.78,
    scale: 1,
    outputFormat: 'original',
    optimizationMode: 'balanced'
  };

  return {
    id: 'a1',
    file: new File(['image'], 'photo.png', { type: 'image/png' }),
    status: 'done',
    selected: true,
    blob: new Blob(['x']),
    originalSize: 1000,
    newSize: 400,
    chosenFormat: 'image/webp',
    qualityScore: null,
    strategyUsed: 'manual-balanced',
    sourceObjectUrl: 'blob:source',
    optimizedObjectUrl: 'blob:optimized',
    previewUrl: 'blob:preview',
    compressedPreviewUrl: 'blob:compressed',
    statusLabel: 'Pronto',
    errorMessage: null,
    progress: 100,
    settings,
    ...overrides
  };
}

function renderView(overrides: Partial<Parameters<typeof CompressorView>[0]> = {}) {
  const props = {
    files: [record()],
    selectedId: 'a1',
    quality: 0.78,
    scale: 1,
    outputFormat: 'original' as const,
    optimizationMode: 'balanced' as const,
    density: 'comfort' as const,
    doneCount: 1,
    totalSavedBytes: 600,
    hasProcessedOnce: true,
    onBack: vi.fn(),
    onFiles: vi.fn(),
    onSelectFile: vi.fn(),
    onRemoveFile: vi.fn(),
    onOpenComparison: vi.fn(),
    onDownloadFile: vi.fn(),
    onReprocessFile: vi.fn(),
    onSetDensity: vi.fn(),
    onSettingsChange: vi.fn(),
    onReprocessSelected: vi.fn(),
    onReprocessAll: vi.fn(),
    onDownloadAll: vi.fn()
  };

  return { props, ...render(<CompressorView {...props} {...overrides} />) };
}

function comfortButton() {
  return document.querySelector<HTMLButtonElement>('#queueDensityComfortBtn')!;
}

function compactButton() {
  return document.querySelector<HTMLButtonElement>('#queueDensityCompactBtn')!;
}

describe('compressor view', () => {
  it('renders the queue with the file it was given', () => {
    renderView();
    expect(screen.getByText('photo.png')).toBeInTheDocument();
  });

  it('offers the density toggle only when there is something in the queue', () => {
    const { unmount } = renderView();
    expect(screen.getByRole('group')).toBeVisible();
    unmount();

    renderView({ files: [] });
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('marks the current density as pressed', () => {
    renderView({ density: 'comfort' });
    expect(comfortButton()).toHaveAttribute('aria-pressed', 'true');
    expect(compactButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the compact density as pressed', () => {
    renderView({ density: 'compact' });
    expect(compactButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onSetDensity when the toggle is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderView({ density: 'comfort' });

    await user.click(compactButton());

    expect(props.onSetDensity).toHaveBeenCalledWith('compact');
  });

  it('changes the queue layout between the two densities', () => {
    const { unmount } = renderView({ density: 'comfort' });
    const comfortClasses = document.querySelector('article')?.className ?? '';
    unmount();

    renderView({ density: 'compact' });
    const compactClasses = document.querySelector('article')?.className ?? '';

    // A toggle that changes no class would be a button that lies.
    expect(comfortClasses).not.toEqual(compactClasses);
    expect(compactClasses).toContain('p-2');
    expect(comfortClasses).toContain('p-3');
  });

  it('keeps the file input reachable', () => {
    renderView();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
  });
});
