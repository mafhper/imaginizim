import {
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  Plus,
  RefreshCcw,
  Shapes,
  ShieldCheck,
  Trash2,
  Wand2
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { formatBytes } from '../../../utils/bytes';
import type { OptimizationMode, OutputFormat, WorkerMetadataReport } from '../../../types';
import type { SvgAnalysis, SvgComposition } from '../../../domain/svg';
import { t } from '../../../i18n';
import type { QueueRecord } from '../../types';
import { cn } from '../../utils/ui';
import { Button } from '../ui/Button';

interface CompressorViewProps {
  files: QueueRecord[];
  selectedId: string | null;
  quality: number;
  scale: number;
  outputFormat: OutputFormat;
  optimizationMode: OptimizationMode;
  targetBytes?: number | null;
  density: 'comfort' | 'compact';
  doneCount: number;
  totalSavedBytes: number;
  hasProcessedOnce: boolean;
  onBack: () => void;
  onFiles: (files: File[]) => void;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onOpenComparison: (id: string) => void;
  onDownloadFile: (id: string) => void;
  onReprocessFile: (id: string) => void;
  onSetDensity: (density: 'comfort' | 'compact') => void;
  onSettingsChange: (patch: {
    quality?: number;
    scale?: number;
    outputFormat?: OutputFormat;
    optimizationMode?: OptimizationMode;
    targetBytes?: number | null;
  }) => void;
  onReprocessSelected: () => void;
  onReprocessAll: () => void;
  onDownloadAll: () => Promise<void>;
}

export function CompressorView(props: CompressorViewProps) {
  const {
    files,
    selectedId,
    quality,
    scale,
    outputFormat,
    optimizationMode,
    targetBytes = null,
    density,
    doneCount,
    totalSavedBytes,
    hasProcessedOnce,
    onBack,
    onFiles,
    onSelectFile,
    onRemoveFile,
    onOpenComparison,
    onDownloadFile,
    onReprocessFile,
    onSetDensity,
    onSettingsChange,
    onReprocessAll,
    onDownloadAll
  } = props;

  const totalOriginal = useMemo(
    () => files.reduce((sum, file) => sum + file.originalSize, 0),
    [files]
  );
  const savingsPercent = totalOriginal > 0 ? (totalSavedBytes / totalOriginal) * 100 : 0;
  const processingCount = files.filter((file) => file.status === 'processing').length;
  const isCompact = density === 'compact';

  const primaryActionLabel =
    processingCount > 0
      ? t('actions.processing_queue')
      : hasProcessedOnce
        ? t('actions.reprocess_queue')
        : t('actions.process_queue');

  const handleMoreFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onFiles(Array.from(fileList));
  };

  return (
    <div data-page="home" className="min-h-screen pt-24 pb-12 md:pt-32">
      <div className="container max-w-6xl space-y-4">
        {/* Compact Header */}
        <section className="flex items-center justify-between glass-panel p-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm text-foreground">
              <span className="font-medium">
                {files.length}{' '}
                {files.length === 1 ? t('app.file_count_one') : t('app.file_count_other')}
              </span>
              <span className="text-muted-foreground mx-2">•</span>
              <span className="text-muted-foreground">
                {doneCount} {t('app.done_count')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {files.length > 0 ? (
              <div
                role="group"
                aria-label={t('app.queue')}
                className="rounded-full border border-border/60 bg-muted/20 p-1 text-xs text-muted-foreground"
              >
                <button
                  id="queueDensityComfortBtn"
                  type="button"
                  aria-pressed={density === 'comfort'}
                  onClick={() => onSetDensity('comfort')}
                  className={cn(
                    'rounded-full px-3 py-1 transition-colors',
                    density === 'comfort' && 'bg-secondary text-foreground'
                  )}
                >
                  {t('app.density_comfort')}
                </button>
                <button
                  id="queueDensityCompactBtn"
                  type="button"
                  aria-pressed={density === 'compact'}
                  onClick={() => onSetDensity('compact')}
                  className={cn(
                    'rounded-full px-3 py-1 transition-colors',
                    density === 'compact' && 'bg-secondary text-foreground'
                  )}
                >
                  {t('app.density_compact')}
                </button>
              </div>
            ) : null}
            <label className="cursor-pointer">
              <input
                id="fileInput"
                data-testid="file-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handleMoreFiles(event.target.files)}
              />
              <span>
                <Button variant="outline" size="sm" className="h-8">
                  <Plus className="h-4 w-4 mr-1.5" /> {t('actions.add_files')}
                </Button>
              </span>
            </label>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          {/* Main List Area */}
          <section className="flex flex-col min-h-[600px] glass-panel p-4">
            <div
              className={cn(
                'app-scrollbar flex-1 overflow-auto pr-1',
                isCompact ? 'space-y-1' : 'space-y-2'
              )}
            >
              {files.map((item) => {
                const savedBytes = Math.max(
                  0,
                  item.originalSize - (item.newSize ?? item.originalSize)
                );
                const isDone = item.status === 'done';
                const isSelected = selectedId === item.id;

                return (
                  <article
                    key={item.id}
                    className={cn(
                      'group rounded-[8px] border border-border bg-card transition-colors flex',
                      isCompact ? 'gap-3 p-2' : 'gap-4 p-3',
                      isSelected && 'border-primary/40 bg-secondary/30'
                    )}
                    onClick={() => onSelectFile(item.id)}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 overflow-hidden rounded-[6px] border border-border bg-secondary',
                        isCompact ? 'h-9 w-9' : 'h-12 w-12'
                      )}
                    >
                      <img
                        src={item.compressedPreviewUrl ?? item.previewUrl}
                        alt={item.file.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-110"
                      />
                    </div>

                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {item.file.name}
                          </p>
                          <div
                            className={cn(
                              'mt-0.5 flex flex-wrap items-center gap-2 text-muted-foreground',
                              isCompact && 'hidden'
                            )}
                          >
                            <span>{formatBytes(item.originalSize)}</span>
                            {item.newSize ? <span>→ {formatBytes(item.newSize)}</span> : null}
                            {savedBytes > 0 ? (
                              <span className="text-primary">-{formatBytes(savedBytes)}</span>
                            ) : null}
                            <span className="rounded-full border border-white/8 px-1.5 py-px">
                              {isDone ? formatTag(item.chosenFormat) : item.statusLabel}
                            </span>
                            {isDone && item.metTarget === false ? (
                              <span className="rounded-full border border-destructive/40 px-1.5 py-px text-destructive">
                                {t('engine.target_missed')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <IconButton
                            label={t('preview.open_compare')}
                            disabled={!isDone}
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenComparison(item.id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            label={t('preview.download')}
                            disabled={!isDone}
                            onClick={(event) => {
                              event.stopPropagation();
                              onDownloadFile(item.id);
                            }}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            label={t('actions.reprocess')}
                            onClick={(event) => {
                              event.stopPropagation();
                              onReprocessFile(item.id);
                            }}
                          >
                            <RefreshCcw className="h-3.5 w-3.5" />
                          </IconButton>
                          <IconButton
                            label={t('actions.remove')}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemoveFile(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconButton>
                        </div>
                      </div>
                      {item.status === 'processing' ? (
                        <div className="mt-2 h-1 rounded-full bg-border/60 w-full max-w-[200px]">
                          <div
                            className="h-1 rounded-full bg-primary transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      ) : null}
                      {item.status === 'error' ? (
                        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
                          <AlertCircle className="h-3 w-3" />{' '}
                          {item.errorMessage ?? t('engine.status_error')}
                        </p>
                      ) : null}
                      {isDone && item.metadata ? <MetadataLine report={item.metadata} /> : null}
                      {isDone && item.svg ? <SvgLine analysis={item.svg} /> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Unified Sidebar */}
          <aside className="space-y-4">
            <div className="glass-panel p-5 space-y-5">
              <div>
                <h3 className="font-display text-lg font-medium text-foreground">
                  {t('engine.params_title')}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                    <span>{t('engine.quality')}</span>
                    <span>{Math.round(quality * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="35"
                    max="100"
                    value={Math.round(quality * 100)}
                    onChange={(event) =>
                      onSettingsChange({ quality: Number(event.target.value) / 100 })
                    }
                    className="range-input"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t('engine.scale')}
                  </label>
                  <select
                    value={String(scale)}
                    onChange={(event) => onSettingsChange({ scale: Number(event.target.value) })}
                    className="field-input h-9 text-xs"
                  >
                    <option value="0.5">50%</option>
                    <option value="0.75">75%</option>
                    <option value="1">100%</option>
                    <option value="1.5">150%</option>
                    <option value="2">200%</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t('engine.output_format')}
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(event) =>
                      onSettingsChange({ outputFormat: event.target.value as OutputFormat })
                    }
                    className="field-input h-9 text-xs"
                  >
                    <option value="auto">{t('engine.output_auto')}</option>
                    <option value="original">{t('engine.output_original')}</option>
                    <option value="image/jpeg">JPEG</option>
                    <option value="image/png">PNG</option>
                    <option value="image/webp">WebP</option>
                    <option value="image/avif">AVIF</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t('engine.mode')}
                  </label>
                  <select
                    value={optimizationMode}
                    onChange={(event) =>
                      onSettingsChange({ optimizationMode: event.target.value as OptimizationMode })
                    }
                    className="field-input h-9 text-xs"
                  >
                    <option value="balanced">{t('engine.mode_balanced')}</option>
                    <option value="max-compression">{t('engine.mode_compression')}</option>
                    <option value="max-speed">{t('engine.mode_speed')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t('engine.target_size')}
                  </label>
                  <select
                    id="targetSizeSelect"
                    data-testid="target-size"
                    value={targetBytes == null ? '' : String(targetBytes)}
                    onChange={(event) =>
                      onSettingsChange({
                        targetBytes: event.target.value === '' ? null : Number(event.target.value)
                      })
                    }
                    className="field-input h-9 text-xs"
                  >
                    <option value="">{t('engine.target_none')}</option>
                    <option value={String(100 * 1024)}>{t('engine.target_100kb')}</option>
                    <option value={String(200 * 1024)}>{t('engine.target_200kb')}</option>
                    <option value={String(500 * 1024)}>{t('engine.target_500kb')}</option>
                    <option value={String(1024 * 1024)}>{t('engine.target_1mb')}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-border/70">
                <Button
                  id="optimizeQueueBtn"
                  variant="hero"
                  className="w-full font-medium"
                  onClick={onReprocessAll}
                  disabled={processingCount > 0}
                >
                  <Wand2 className="h-4 w-4 mr-1.5" /> {primaryActionLabel}
                </Button>
                {totalSavedBytes > 0 && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    {t('actions.total_saved')}{' '}
                    <span className="text-primary font-medium">
                      {formatBytes(totalSavedBytes)} ({savingsPercent.toFixed(1)}%)
                    </span>
                  </p>
                )}
              </div>

              {doneCount > 0 && (
                <Button
                  id="downloadAllBtn"
                  variant="outline"
                  className="w-full text-sm"
                  onClick={() => void onDownloadAll()}
                >
                  <Download className="h-4 w-4 mr-1.5" /> {t('actions.download_done')} ({doneCount})
                </Button>
              )}

              <div className="pt-1">
                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={onBack}
                >
                  {t('actions.reset_session')}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function formatTag(format: string) {
  if (format === 'image/svg+xml') return 'SVG';
  if (format === 'auto' || format === 'original') return format.toUpperCase();
  return format.replace('image/', '').toUpperCase();
}

function metadataLabels(report: WorkerMetadataReport): string[] {
  const labels: string[] = [];
  if (report.source.gps) labels.push(t('engine.meta_gps'));
  if (report.source.exif) labels.push(t('engine.meta_exif'));
  if (report.source.xmp) labels.push(t('engine.meta_xmp'));
  if (report.source.text) labels.push(t('engine.meta_text'));
  return labels;
}

function MetadataLine({ report }: { report: WorkerMetadataReport }) {
  const labels = metadataLabels(report);
  if (labels.length === 0) return null;

  const joined = labels.join(', ');
  return (
    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
      <ShieldCheck className="h-3 w-3 text-primary" />
      {report.clean
        ? `${t('engine.meta_removed')}: ${joined}`
        : `${joined} · ${t('engine.meta_kept_orientation')}`}
    </p>
  );
}

function compositionKey(composition: SvgComposition): string {
  return `engine.svg_${composition.replaceAll('-', '_')}`;
}

function SvgLine({ analysis }: { analysis: SvgAnalysis }) {
  if (!analysis.parse.valid) {
    return (
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-destructive">
        <AlertCircle className="h-3 w-3" /> {t('engine.svg_invalid')}
      </p>
    );
  }

  const label = t(compositionKey(analysis.composition));
  const risks = analysis.risks.length;

  return (
    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
      <Shapes className="h-3 w-3 text-primary" />
      {risks > 0 ? `${label} · ${risks} ${t('engine.svg_attention')}` : label}
    </p>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled = false,
  dataTestId
}: {
  children: ReactNode;
  label: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  dataTestId?: string;
}) {
  return (
    <button
      data-testid={dataTestId}
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-[6px] border transition-colors',
        disabled
          ? 'cursor-not-allowed border-transparent bg-muted/10 text-muted-foreground/30'
          : 'border-transparent bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
