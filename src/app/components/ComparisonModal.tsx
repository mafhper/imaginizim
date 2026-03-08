import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { t } from '../../i18n';
import { formatBytes } from '../../utils/bytes';
import type { QueueRecord } from '../types';
import { cn } from '../utils/ui';
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

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const updateSliderFromClientX = useCallback(
    (clientX: number) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect || rect.width <= 0) return;
      const next = ((clientX - rect.left) / rect.width) * 100;
      onSliderChange(Math.max(0, Math.min(100, Math.round(next))));
    },
    [onSliderChange]
  );

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

  useEffect(() => {
    if (!open) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      updateSliderFromClientX(event.clientX);
    };

    const handlePointerUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [open, updateSliderFromClientX]);

  const viewportStyle = useMemo(() => {
    const zoomValue = zoom === 'fit' ? 1 : Number(zoom);
    return {
      ['--compare-slider' as string]: `${slider}%`,
      ['--compare-zoom' as string]: String(zoomValue)
    };
  }, [slider, zoom]);

  if (!open || !file) return null;

  const finalSize = file.newSize ?? file.originalSize;
  const savingsPercent = Math.max(
    0,
    Math.round(((file.originalSize - finalSize) / file.originalSize) * 100)
  );

  const handleViewportPointerDown = (clientX: number) => {
    draggingRef.current = true;
    updateSliderFromClientX(clientX);
  };

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
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/8 px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="section-label mb-2">Comparação</p>
            <h2 className="font-display truncate text-2xl font-semibold text-foreground">
              {file.file.name}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="metric-chip">{formatBytes(file.originalSize)}</span>
              <span className="metric-chip">{formatBytes(finalSize)}</span>
              <span className="metric-chip text-primary">{savingsPercent}% economizado</span>
            </div>
          </div>
          <Button
            id="closeComparisonBtn"
            data-testid="closeComparisonBtn"
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="border border-white/8 bg-background/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4 md:px-6">
          <div className="space-y-2">
            <div className="inline-flex rounded-[8px] border border-white/8 bg-background/58 p-1">
              <button
                id="modeSplitBtn"
                type="button"
                className={cn(
                  'rounded-[8px] px-4 py-2 text-sm transition-colors',
                  mode === 'split' ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground'
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
                  mode === 'overlay' ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground'
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

        <div
          ref={viewportRef}
          className="compare-viewport"
          data-mode={mode}
          style={viewportStyle}
          onPointerDown={(event) => handleViewportPointerDown(event.clientX)}
        >
          <span className="compare-legend compare-legend-left">{t('preview.original')}</span>
          <span className="compare-legend compare-legend-right">{t('preview.optimized')}</span>
          <img src={file.previewUrl} alt={t('preview.original')} className="compare-image" />
          <div
            className="compare-overlay-wrap"
            style={mode === 'split' ? { clipPath: `inset(0 0 0 ${slider}%)` } : undefined}
          >
            <img
              src={file.compressedPreviewUrl ?? file.previewUrl}
              alt={t('preview.optimized')}
              className="compare-image compare-image-top"
              style={mode === 'overlay' ? { opacity: slider / 100 } : undefined}
            />
          </div>

          {mode === 'split' ? (
            <button
              type="button"
              className="compare-handle compare-handle-split"
              style={{ left: `${slider}%` }}
              aria-label={t('preview.slider')}
              onPointerDown={(event) => {
                event.stopPropagation();
                handleViewportPointerDown(event.clientX);
              }}
            >
              <span className="compare-handle-grip" />
            </button>
          ) : (
            <div className="compare-overlay-control">
              <span className="compare-overlay-text">{t('preview.original')}</span>
              <div
                className="compare-overlay-track"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  handleViewportPointerDown(event.clientX);
                }}
              >
                <div className="compare-overlay-fill" style={{ width: `${slider}%` }} />
                <button
                  type="button"
                  className="compare-handle compare-handle-overlay"
                  style={{ left: `${slider}%` }}
                  aria-label={t('preview.slider')}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    handleViewportPointerDown(event.clientX);
                  }}
                >
                  <span className="compare-handle-grip" />
                </button>
              </div>
              <span className="compare-overlay-text">{t('preview.optimized')}</span>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/8 px-5 py-4 md:px-6">
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
