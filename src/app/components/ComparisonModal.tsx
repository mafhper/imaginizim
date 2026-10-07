import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { useEffect } from 'react';
import { t } from '../../i18n';
import { formatBytes } from '../../utils/bytes';
import type { QueueRecord } from '../types';
import { cn } from '../utils/ui';
import { CompareSurface } from './CompareSurface';
import { Button } from './ui/Button';

interface ComparisonModalProps {
  open: boolean;
  file: QueueRecord | null;
  hasPrevNext: boolean;
  mode: 'split' | 'overlay';
  slider: number;
  zoom: 'fit' | '1' | '1.5' | '2';
  onClose: () => void;
  onModeChange: (mode: 'split' | 'overlay') => void;
  onSliderChange: (value: number) => void;
  onZoomChange: (value: 'fit' | '1' | '1.5' | '2') => void;
  onPrev: () => void;
  onNext: () => void;
  onDownload: () => void;
}

/**
 * The takeover view. The studio shows the comparison inline; the modal remains
 * for full-screen inspection and for stepping through the done files.
 */
export function ComparisonModal(props: ComparisonModalProps) {
  const {
    open,
    file,
    hasPrevNext,
    mode,
    slider,
    zoom,
    onClose,
    onModeChange,
    onSliderChange,
    onZoomChange,
    onPrev,
    onNext,
    onDownload
  } = props;

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, onNext, onPrev, open]);

  if (!open || !file) return null;

  const finalSize = file.newSize ?? file.originalSize;
  const savingsPercent = Math.max(
    0,
    Math.round(((file.originalSize - finalSize) / file.originalSize) * 100)
  );

  return (
    <div
      data-testid="comparison-modal"
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 md:p-5"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/76 backdrop-blur-md"
        aria-label={t('preview.close_compare')}
        onClick={onClose}
      />

      <div className="glass-panel relative z-[1] w-full max-w-6xl overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="section-label mb-2">{t('preview.compare_title')}</p>
            <h2 className="font-display truncate text-2xl font-semibold text-foreground">
              {file.file.name}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="metric-chip">{formatBytes(file.originalSize)}</span>
              <span className="metric-chip">{formatBytes(finalSize)}</span>
              <span className="metric-chip text-primary">
                {savingsPercent}% {t('preview.saved')}
              </span>
            </div>
          </div>
          <Button
            id="closeComparisonBtn"
            data-testid="closeComparisonBtn"
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="border border-border bg-background/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 md:px-6">
          <div className="space-y-2">
            <div className="inline-flex rounded-[8px] border border-border bg-background/50 p-1">
              <button
                id="modeSplitBtn"
                type="button"
                className={cn(
                  'rounded-[8px] px-4 py-2 text-sm transition-colors',
                  mode === 'split' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                )}
                onClick={() => onModeChange('split')}
              >
                {t('preview.mode_split')}
              </button>
              <button
                id="modeOverlayBtn"
                type="button"
                className={cn(
                  'rounded-[8px] px-4 py-2 text-sm transition-colors',
                  mode === 'overlay' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                )}
                onClick={() => onModeChange('overlay')}
              >
                {t('preview.mode_overlay')}
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {mode === 'split' ? t('preview.help_split') : t('preview.help_overlay')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              {t('preview.zoom')}
              <select
                value={zoom}
                onChange={(event) => onZoomChange(event.target.value as 'fit' | '1' | '1.5' | '2')}
                className="field-input min-w-[96px]"
              >
                <option value="fit">{t('preview.zoom_fit')}</option>
                <option value="1">100%</option>
                <option value="1.5">150%</option>
                <option value="2">200%</option>
              </select>
            </label>
            <button
              data-testid="comparisonPrevBtn"
              type="button"
              onClick={onPrev}
              disabled={!hasPrevNext}
              className="modal-nav-btn"
            >
              <ChevronLeft className="h-4 w-4" /> {t('preview.prev')}
            </button>
            <button
              data-testid="comparisonNextBtn"
              type="button"
              onClick={onNext}
              disabled={!hasPrevNext}
              className="modal-nav-btn"
            >
              {t('preview.next')} <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <CompareSurface
          originalUrl={file.previewUrl}
          optimizedUrl={file.compressedPreviewUrl ?? file.previewUrl}
          mode={mode}
          slider={slider}
          zoom={zoom}
          onSliderChange={onSliderChange}
        />

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-5 py-4 md:px-6">
          <p className="text-sm text-muted-foreground">
            {formatBytes(file.originalSize)} → {formatBytes(finalSize)} ({savingsPercent}%{' '}
            {t('preview.saved')})
          </p>
          <Button type="button" variant="hero" size="md" onClick={onDownload}>
            <Download className="h-4 w-4" /> {t('preview.download')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
