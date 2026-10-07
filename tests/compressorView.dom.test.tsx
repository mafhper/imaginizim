import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompressorView } from '../src/app/components/home/CompressorView';
import type { QueueRecord, RecordSettings } from '../src/app/types';
import type { OutputSpec } from '../src/domain/types';

/**
 * The density toggle existed in the provider for months with no way to reach
 * it: `CompressorView` declared `density` and `onSetDensity` and never
 * destructured them. This is the regression test for that — the props being
 * declared is not the same as the props being used.
 */
function output(overrides: Partial<OutputSpec> = {}): OutputSpec {
  return {
    id: 'output-1',
    format: 'original',
    quality: 0.78,
    scale: 1,
    optimizationMode: 'balanced',
    targetBytes: null,
    ...overrides
  };
}

function record(overrides: Partial<QueueRecord> = {}): QueueRecord {
  const settings: RecordSettings = { outputs: [output()] };

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
    outputs: [output()],
    density: 'comfort' as const,
    doneCount: 1,
    totalSavedBytes: 600,
    hasProcessedOnce: true,
    compareMode: 'split' as const,
    compareSlider: 50,
    onCompareModeChange: vi.fn(),
    onCompareSliderChange: vi.fn(),
    onBack: vi.fn(),
    onFiles: vi.fn(),
    onSelectFile: vi.fn(),
    onRemoveFile: vi.fn(),
    onOpenComparison: vi.fn(),
    onDownloadFile: vi.fn(),
    onReprocessFile: vi.fn(),
    onSetDensity: vi.fn(),
    onOutputsChange: vi.fn(),
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
    const card = document.querySelector('article')!;
    expect(within(card).getByText('photo.png')).toBeInTheDocument();
  });

  it('offers the density toggle only when there is something in the queue', () => {
    const { unmount } = renderView();
    expect(screen.getByRole('group', { name: 'Images in queue' })).toBeVisible();
    unmount();

    renderView({ files: [] });
    expect(screen.queryByRole('group', { name: 'Images in queue' })).not.toBeInTheDocument();
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

describe('treatment composer', () => {
  it('shows one output card by default, with the resolved name', () => {
    renderView();

    expect(screen.getAllByTestId('output-card')).toHaveLength(1);
    expect(screen.getByTestId('output-name')).toHaveTextContent('photo.png');
  });

  it('adds an output when the button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderView();

    await user.click(screen.getByTestId('add-output'));

    expect(props.onOutputsChange).toHaveBeenCalledTimes(1);
    const next = props.onOutputsChange.mock.calls[0][0] as OutputSpec[];
    expect(next).toHaveLength(2);
  });

  it('removes an output only when there is more than one', async () => {
    const user = userEvent.setup();
    const { props, unmount } = renderView({
      outputs: [output({ id: 'a' }), output({ id: 'b' })]
    });

    expect(screen.getAllByTestId('output-card')).toHaveLength(2);
    await user.click(screen.getAllByTestId('remove-output')[0]);
    expect(props.onOutputsChange).toHaveBeenCalledTimes(1);
    unmount();

    renderView();
    expect(screen.queryByTestId('remove-output')).not.toBeInTheDocument();
  });

  it('warns when two outputs resolve to the same name', () => {
    renderView({ outputs: [output({ id: 'a' }), output({ id: 'b' })] });

    expect(screen.getByTestId('output-collision')).toBeInTheDocument();
  });

  it('does not warn when the outputs resolve to distinct names', () => {
    renderView({
      outputs: [output({ id: 'a', format: 'image/webp' }), output({ id: 'b', format: 'image/png' })]
    });

    expect(screen.queryByTestId('output-collision')).not.toBeInTheDocument();
  });
});
