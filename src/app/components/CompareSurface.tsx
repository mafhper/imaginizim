import { useCallback, useEffect, useMemo, useRef } from 'react';
import { t } from '../../i18n';
import { cn } from '../utils/ui';

/**
 * The before/after surface, shared by the studio (inline, the flow) and the
 * modal (takeover). Extracted from the modal so both use the same classes and
 * the same drag logic — the studio is not a second implementation.
 */

export type CompareMode = 'split' | 'overlay';
export type CompareZoom = 'fit' | '1' | '1.5' | '2';

interface CompareSurfaceProps {
  originalUrl: string;
  optimizedUrl: string;
  mode: CompareMode;
  slider: number;
  zoom: CompareZoom;
  onSliderChange: (value: number) => void;
  className?: string;
}

export function CompareSurface(props: CompareSurfaceProps) {
  const { originalUrl, optimizedUrl, mode, slider, zoom, onSliderChange, className } = props;

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
  }, [updateSliderFromClientX]);

  const style = useMemo(() => {
    const zoomValue = zoom === 'fit' ? 1 : Number(zoom);
    return {
      ['--compare-slider' as string]: `${slider}%`,
      ['--compare-zoom' as string]: String(zoomValue)
    };
  }, [slider, zoom]);

  const startDrag = (clientX: number) => {
    draggingRef.current = true;
    updateSliderFromClientX(clientX);
  };

  const original = t('preview.original');
  const optimized = t('preview.optimized');

  return (
    <div
      ref={viewportRef}
      className={cn('compare-viewport', className)}
      data-mode={mode}
      style={style}
      onPointerDown={(event) => startDrag(event.clientX)}
    >
      <span className="compare-legend compare-legend-left">{original}</span>
      <span className="compare-legend compare-legend-right">{optimized}</span>
      <img src={originalUrl} alt={original} className="compare-image" />
      <div
        className="compare-overlay-wrap"
        style={mode === 'split' ? { clipPath: `inset(0 0 0 ${slider}%)` } : undefined}
      >
        <img
          src={optimizedUrl}
          alt={optimized}
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
            startDrag(event.clientX);
          }}
        >
          <span className="compare-handle-grip" />
        </button>
      ) : (
        <div className="compare-overlay-control">
          <span className="compare-overlay-text">{original}</span>
          <div
            className="compare-overlay-track"
            onPointerDown={(event) => {
              event.stopPropagation();
              startDrag(event.clientX);
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
                startDrag(event.clientX);
              }}
            >
              <span className="compare-handle-grip" />
            </button>
          </div>
          <span className="compare-overlay-text">{optimized}</span>
        </div>
      )}
    </div>
  );
}
