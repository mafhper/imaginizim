import { Download, Eye, RefreshCcw, Trash2 } from 'lucide-react';
import { useMemo, useState, type MouseEventHandler, type ReactNode } from 'react';
import { t } from '../../../i18n';
import { formatBytes } from '../../../utils/bytes';
import type { QueueRecord } from '../../types';
import { cn } from '../../utils/ui';

interface QueuePanelProps {
  files: QueueRecord[];
  selectedId: string | null;
  density: 'comfort' | 'compact';
  setDensity: (density: 'comfort' | 'compact') => void;
  selectFile: (id: string) => void;
  removeFile: (id: string) => void;
  openComparison: (id: string) => void;
  downloadFile: (id: string) => void;
  reprocessFile: (id: string) => void;
}

export function QueuePanel(props: QueuePanelProps) {
  const {
    files,
    selectedId,
    density,
    setDensity,
    selectFile,
    removeFile,
    openComparison,
    downloadFile,
    reprocessFile
  } = props;
  const [dragging, setDragging] = useState<string | null>(null);
  const totalSaved = useMemo(
    () =>
      files.reduce(
        (sum, record) =>
          sum + Math.max(0, record.originalSize - (record.newSize ?? record.originalSize)),
        0
      ),
    [files]
  );

  return (
    <aside className="panel-shell h-full min-h-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">{t('app.queue')}</h2>
          <p className="mt-2 max-w-[24ch] text-sm leading-6 text-muted-foreground">
            {t('app.queue_hint')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {files.length > 0 ? (
            <div className="rounded-full border border-white/8 bg-card/60 p-1 text-xs text-muted-foreground">
              <button
                id="queueDensityComfortBtn"
                type="button"
                onClick={() => setDensity('comfort')}
                className={cn(
                  'rounded-full px-3 py-1',
                  density === 'comfort' && 'bg-white/8 text-foreground'
                )}
              >
                {t('app.density_comfort')}
              </button>
              <button
                id="queueDensityCompactBtn"
                type="button"
                onClick={() => setDensity('compact')}
                className={cn(
                  'rounded-full px-3 py-1',
                  density === 'compact' && 'bg-white/8 text-foreground'
                )}
              >
                {t('app.density_compact')}
              </button>
            </div>
          ) : null}
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/8 bg-card/60 px-2 text-xs text-muted-foreground">
            {files.length}
          </span>
        </div>
      </div>

      <div className="app-scrollbar flex max-h-[calc(100vh-20rem)] min-h-[12rem] flex-col gap-3 overflow-auto pr-1">
        {files.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-white/10 bg-card/40 px-4 py-10 text-sm text-muted-foreground">
            {t('app.queue_hint')}
          </div>
        ) : null}

        {files.map((record) => {
          const savedBytes = Math.max(
            0,
            record.originalSize - (record.newSize ?? record.originalSize)
          );
          const isDone = record.status === 'done';
          const isCompact = density === 'compact';
          return (
            <article
              key={record.id}
              onClick={() => selectFile(record.id)}
              onMouseDown={() => setDragging(record.id)}
              onMouseUp={() => setDragging(null)}
              className={cn(
                'group grid cursor-pointer gap-3 rounded-[8px] border px-3 py-3 transition-colors',
                selectedId === record.id
                  ? 'border-primary/28 bg-card/75'
                  : 'border-white/6 bg-card/45 hover:border-white/10 hover:bg-card/60',
                isCompact
                  ? 'grid-cols-[minmax(0,1fr)_auto]'
                  : 'grid-cols-[68px_minmax(0,1fr)_auto]',
                dragging === record.id && 'scale-[0.998]'
              )}
            >
              {!isCompact ? (
                <button
                  type="button"
                  className="overflow-hidden rounded-[8px] border border-white/8 bg-background/60"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isDone) openComparison(record.id);
                  }}
                >
                  <img
                    src={record.compressedPreviewUrl ?? record.previewUrl}
                    alt={record.file.name}
                    className="h-[68px] w-[68px] object-cover"
                  />
                </button>
              ) : null}

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{record.file.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatBytes(record.originalSize)}</span>
                  {isDone ? (
                    <span>→ {formatBytes(record.newSize ?? record.originalSize)}</span>
                  ) : null}
                  {savedBytes > 0 ? (
                    <span className="text-primary">-{formatBytes(savedBytes)}</span>
                  ) : null}
                  <span>{isDone ? outputTag(record.chosenFormat) : record.statusLabel}</span>
                </div>
                {record.errorMessage ? (
                  <p className="mt-2 text-xs text-red-300">{record.errorMessage}</p>
                ) : null}
                {record.status === 'processing' ? (
                  <div className="mt-3 h-1.5 rounded-full bg-white/6">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-primary/80 to-cyan-300/80 transition-all duration-200"
                      style={{ width: `${record.progress}%` }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap justify-end gap-2">
                  <IconAction
                    testId={`file-compare-${record.id}`}
                    icon={<Eye className="h-4 w-4" />}
                    label={t('preview.open_compare')}
                    onClick={(event) => {
                      event.stopPropagation();
                      openComparison(record.id);
                    }}
                    disabled={!isDone}
                  />
                  <IconAction
                    testId={`file-download-${record.id}`}
                    icon={<Download className="h-4 w-4" />}
                    label={t('preview.download')}
                    onClick={(event) => {
                      event.stopPropagation();
                      downloadFile(record.id);
                    }}
                    disabled={!isDone}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2 opacity-75 transition-opacity group-hover:opacity-100">
                  <IconAction
                    testId={`file-reprocess-${record.id}`}
                    icon={<RefreshCcw className="h-4 w-4" />}
                    label={t('actions.optimize_selected')}
                    onClick={(event) => {
                      event.stopPropagation();
                      reprocessFile(record.id);
                    }}
                  />
                  <IconAction
                    testId={`file-remove-${record.id}`}
                    icon={<Trash2 className="h-4 w-4" />}
                    label={t('actions.reset')}
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFile(record.id);
                    }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-5 border-t border-white/6 pt-4 text-sm text-muted-foreground">
        {t('actions.total_saved')}{' '}
        <span className="font-medium text-foreground">{formatBytes(totalSaved)}</span>
      </div>
    </aside>
  );
}

function outputTag(format: string) {
  if (format === 'image/svg+xml') return 'SVG';
  return format.replace('image/', '').toUpperCase();
}

function IconAction({
  icon,
  label,
  onClick,
  disabled = false,
  testId
}: {
  icon: ReactNode;
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-[8px] border px-3 text-xs transition-colors',
        disabled
          ? 'cursor-not-allowed border-white/6 bg-white/[0.03] text-muted-foreground/50'
          : 'border-white/8 bg-white/[0.03] text-muted-foreground hover:border-white/12 hover:bg-white/[0.06] hover:text-foreground'
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
