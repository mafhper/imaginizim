import {
  AlertCircle,
  ArrowLeft,
  Download,
  Maximize2,
  Plus,
  RefreshCcw,
  Shapes,
  ShieldCheck,
  Trash2,
  Wand2
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { formatBytes } from '../../../utils/bytes';
import type { WorkerMetadataReport } from '../../../types';
import type { OutputSpec } from '../../../domain/types';
import { createOutput } from '../../../domain/adapters';
import { planJob } from '../../../domain/job';
import type { SvgAnalysis, SvgComposition } from '../../../domain/svg';
import { t } from '../../../i18n';
import { createId } from '../../../utils/id';
import type { QueueRecord } from '../../types';
import { cn } from '../../utils/ui';
import { CompareSurface } from '../CompareSurface';
import { Button } from '../ui/Button';

interface CompressorViewProps {
  files: QueueRecord[];
  selectedId: string | null;
  outputs: OutputSpec[];
  density: 'comfort' | 'compact';
  doneCount: number;
  totalSavedBytes: number;
  hasProcessedOnce: boolean;
  compareMode: 'split' | 'overlay';
  compareSlider: number;
  onCompareModeChange: (mode: 'split' | 'overlay') => void;
  onCompareSliderChange: (value: number) => void;
  onBack: () => void;
  onFiles: (files: File[]) => void;
  onSelectFile: (id: string) => void;
  onRemoveFile: (id: string) => void;
  onOpenComparison: (id: string) => void;
  onDownloadFile: (id: string) => void;
  onReprocessFile: (id: string) => void;
  onSetDensity: (density: 'comfort' | 'compact') => void;
  onOutputsChange: (outputs: OutputSpec[]) => void;
  onReprocessSelected: () => void;
  onReprocessAll: () => void;
  onDownloadAll: () => Promise<void>;
}

/**
 * The workbench. Three zones that use the whole viewport: the queue (visual
 * tiles), the studio (the selected file, before/after inline — the flow is not
 * hidden behind a modal) and the settings rail (the composer).
 *
 * The comparison surface is shared with the modal, so the studio is not a
 * second implementation of the same thing.
 */
export function CompressorView(props: CompressorViewProps) {
  const {
    files,
    selectedId,
    outputs,
    density,
    doneCount,
    totalSavedBytes,
    hasProcessedOnce,
    compareMode,
    compareSlider,
    onCompareModeChange,
    onCompareSliderChange,
    onBack,
    onFiles,
    onSelectFile,
    onRemoveFile,
    onOpenComparison,
    onDownloadFile,
    onReprocessFile,
    onSetDensity,
    onOutputsChange,
    onReprocessAll,
    onDownloadAll
  } = props;

  const selected = files.find((file) => file.id === selectedId) ?? files[0] ?? null;
  const previewName = selected?.file.name ?? 'image.png';
  const planned = useMemo(() => planJob({ name: previewName }, outputs), [previewName, outputs]);

  const updateOutput = (id: string, patch: Partial<OutputSpec>) => {
    onOutputsChange(outputs.map((output) => (output.id === id ? { ...output, ...patch } : output)));
  };
  const addOutput = () => {
    onOutputsChange([...outputs, createOutput(createId())]);
  };

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
    <div data-page="home" className="px-4 pb-4 pt-24 md:pt-28">
      <div className="mx-auto w-full max-w-[1600px] space-y-3">
        {/* Topbar: the flow's controls, never cut by a scroll */}
        <section className="glass-panel flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-3">
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
            {totalSavedBytes > 0 ? (
              <span className="metric-chip text-primary">
                {t('actions.total_saved')} {formatBytes(totalSavedBytes)} (
                {savingsPercent.toFixed(1)}%)
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <Button
              id="optimizeQueueBtn"
              variant="hero"
              size="sm"
              className="h-8"
              onClick={onReprocessAll}
              disabled={processingCount > 0}
            >
              <Wand2 className="h-4 w-4 mr-1.5" /> {primaryActionLabel}
            </Button>

            {doneCount > 0 ? (
              <Button
                id="downloadAllBtn"
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => void onDownloadAll()}
              >
                <Download className="h-4 w-4 mr-1.5" /> {t('actions.download_done')} ({doneCount})
              </Button>
            ) : null}

            <button
              type="button"
              className="px-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={onBack}
            >
              {t('actions.reset_session')}
            </button>
          </div>
        </section>

        {/* Body: queue · studio · settings */}
        <div className="grid min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_clamp(320px,30vw,380px)] xl:h-[calc(100dvh-13rem)] xl:grid-cols-[clamp(220px,18vw,280px)_minmax(0,1fr)_clamp(320px,24vw,380px)]">
          {/* Queue */}
          <section className="glass-panel order-2 flex min-h-0 flex-col overflow-hidden p-3 lg:order-1">
            <h2 className="section-label">{t('workbench.queue_title')}</h2>
            <p className="mb-2 text-xs text-muted-foreground">{t('workbench.queue_hint')}</p>
            <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              <div className={cn('grid gap-2', isCompact ? 'grid-cols-3' : 'grid-cols-2')}>
                {files.map((item) => {
                  const savedBytes = Math.max(
                    0,
                    item.originalSize - (item.newSize ?? item.originalSize)
                  );
                  const isDone = item.status === 'done';

                  return (
                    <article
                      key={item.id}
                      className={cn(
                        'rounded-[8px] border border-border bg-card transition-colors',
                        isCompact ? 'p-2' : 'p-3',
                        selectedId === item.id && 'border-primary/40 bg-secondary/30'
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={selectedId === item.id}
                        className="block w-full text-left"
                        onClick={() => onSelectFile(item.id)}
                      >
                        <span className="block overflow-hidden rounded-[6px] border border-border bg-secondary">
                          <img
                            src={item.compressedPreviewUrl ?? item.previewUrl}
                            alt={item.file.name}
                            className="aspect-square h-full w-full object-cover"
                          />
                        </span>
                        <span
                          className="mt-1.5 block truncate text-xs font-medium text-foreground"
                          title={item.file.name}
                        >
                          {item.file.name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                          <span>{formatBytes(item.originalSize)}</span>
                          {item.newSize ? <span>→ {formatBytes(item.newSize)}</span> : null}
                          {savedBytes > 0 ? (
                            <span className="text-primary">-{formatBytes(savedBytes)}</span>
                          ) : null}
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
                          <span className="rounded-full border border-white/8 px-1.5 py-px">
                            {isDone ? formatTag(item.chosenFormat) : item.statusLabel}
                          </span>
                          {isDone && item.metTarget === false ? (
                            <span className="rounded-full border border-destructive/40 px-1.5 py-px text-destructive">
                              {t('engine.target_missed')}
                            </span>
                          ) : null}
                        </span>
                        {item.status === 'processing' ? (
                          <span className="mt-1.5 block h-1 w-full rounded-full bg-border/60">
                            <span
                              className="block h-1 rounded-full bg-primary transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </span>
                        ) : null}
                        {item.status === 'error' ? (
                          <span className="mt-1 flex items-center gap-1 text-[11px] text-destructive">
                            <AlertCircle className="h-3 w-3" /> {item.errorMessage}
                          </span>
                        ) : null}
                      </button>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Studio */}
          <section
            data-testid="studio"
            className="glass-panel order-1 flex min-h-0 flex-col overflow-hidden lg:order-2"
          >
            {selected ? (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <h2 className="font-display truncate text-lg font-medium text-foreground">
                      {selected.file.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="metric-chip">{formatBytes(selected.originalSize)}</span>
                      {selected.newSize ? (
                        <span className="metric-chip">→ {formatBytes(selected.newSize)}</span>
                      ) : null}
                      {selected.newSize && selected.originalSize > selected.newSize ? (
                        <span className="metric-chip text-primary">
                          {Math.round(
                            ((selected.originalSize - selected.newSize) / selected.originalSize) *
                              100
                          )}
                          % {t('preview.saved')}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-white/8 px-1.5 py-px">
                        {selected.status === 'done'
                          ? formatTag(selected.chosenFormat)
                          : selected.statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {selected.status === 'done' ? (
                      <div className="inline-flex rounded-[8px] border border-border bg-background/50 p-0.5">
                        <button
                          type="button"
                          className={cn(
                            'rounded-[6px] px-2.5 py-1 text-xs transition-colors',
                            compareMode === 'split'
                              ? 'bg-secondary text-foreground'
                              : 'text-muted-foreground'
                          )}
                          onClick={() => onCompareModeChange('split')}
                        >
                          {t('preview.mode_split')}
                        </button>
                        <button
                          type="button"
                          className={cn(
                            'rounded-[6px] px-2.5 py-1 text-xs transition-colors',
                            compareMode === 'overlay'
                              ? 'bg-secondary text-foreground'
                              : 'text-muted-foreground'
                          )}
                          onClick={() => onCompareModeChange('overlay')}
                        >
                          {t('preview.mode_overlay')}
                        </button>
                      </div>
                    ) : null}

                    <div className="flex items-center gap-1">
                      <IconButton
                        label={t('workbench.expand')}
                        disabled={selected.status !== 'done'}
                        onClick={() => onOpenComparison(selected.id)}
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={t('preview.download')}
                        disabled={selected.status !== 'done'}
                        onClick={() => onDownloadFile(selected.id)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={t('actions.reprocess')}
                        onClick={() => onReprocessFile(selected.id)}
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label={t('actions.remove')}
                        onClick={() => onRemoveFile(selected.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </div>
                </header>

                <div className="relative min-h-[280px] flex-1">
                  {selected.status === 'done' ? (
                    <CompareSurface
                      className="compare-viewport--stage"
                      originalUrl={selected.previewUrl}
                      optimizedUrl={selected.compressedPreviewUrl ?? selected.previewUrl}
                      mode={compareMode}
                      slider={compareSlider}
                      zoom="fit"
                      onSliderChange={onCompareSliderChange}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6">
                      <img
                        src={selected.previewUrl}
                        alt={selected.file.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>

                <details open className="border-t border-border px-4 py-3">
                  <summary className="cursor-pointer select-none text-xs text-muted-foreground">
                    {t('workbench.details')}
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {selected.metadata ? <MetadataLine report={selected.metadata} /> : null}
                    {selected.svg ? <SvgLine analysis={selected.svg} /> : null}
                    {selected.artifacts && selected.artifacts.length > 0 ? (
                      <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{t('workbench.artifacts')}:</span>
                        {selected.artifacts
                          .filter((artifact) => artifact.status === 'done')
                          .map((artifact) => (
                            <span
                              key={artifact.id}
                              data-testid="artifact-badge"
                              className="rounded-full border border-white/8 px-1.5 py-px"
                            >
                              {formatTag(artifact.format)}
                              {artifact.newSize ? ` ${formatBytes(artifact.newSize)}` : ''}
                            </span>
                          ))}
                      </p>
                    ) : null}
                  </div>
                </details>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <h2 className="font-display text-lg font-medium text-foreground">
                  {t('workbench.empty_title')}
                </h2>
                <p className="max-w-[36ch] text-sm text-muted-foreground">
                  {t('workbench.empty_desc')}
                </p>
              </div>
            )}
          </section>

          {/* Settings */}
          <aside className="glass-panel order-3 flex min-h-0 flex-col overflow-hidden p-5">
            <h2 className="font-display text-lg font-medium text-foreground">
              {t('engine.params_title')}
            </h2>

            <div className="app-scrollbar mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {planned.map((item, index) => {
                const output = item.output;
                const formatId = `${output.id}-format`;
                const qualityId = `${output.id}-quality`;
                const scaleId = `${output.id}-scale`;
                const modeId = `${output.id}-mode`;
                const targetId = `${output.id}-target`;
                const chips = advancedChips(output);

                return (
                  <div
                    key={output.id}
                    data-testid="output-card"
                    className="space-y-3 rounded-[8px] border border-border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="pt-0.5 text-sm font-medium text-foreground">
                        {t('engine.output_label')} {index + 1}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {chips.map((chip) => (
                          <span
                            key={chip}
                            data-testid="output-advanced-chip"
                            className="rounded-full border border-white/8 px-1.5 py-px text-[11px] text-muted-foreground"
                          >
                            {chip}
                          </span>
                        ))}
                        {outputs.length > 1 ? (
                          <button
                            type="button"
                            aria-label={t('engine.output_remove')}
                            data-testid="remove-output"
                            className="text-muted-foreground transition-colors hover:text-destructive"
                            onClick={() =>
                              onOutputsChange(outputs.filter((o) => o.id !== output.id))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor={formatId}
                        className="mb-1.5 block text-xs text-muted-foreground"
                      >
                        {t('engine.output_format')}
                      </label>
                      <select
                        id={formatId}
                        value={output.format}
                        onChange={(event) =>
                          updateOutput(output.id, {
                            format: event.target.value as OutputSpec['format']
                          })
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
                      <label
                        htmlFor={qualityId}
                        className="mb-1.5 flex justify-between text-xs text-muted-foreground"
                      >
                        <span>{t('engine.quality')}</span>
                        <span>{Math.round((output.quality ?? 0.78) * 100)}%</span>
                      </label>
                      <input
                        id={qualityId}
                        type="range"
                        min="35"
                        max="100"
                        value={Math.round((output.quality ?? 0.78) * 100)}
                        onChange={(event) =>
                          updateOutput(output.id, { quality: Number(event.target.value) / 100 })
                        }
                        className="range-input"
                      />
                    </div>

                    <details>
                      <summary className="cursor-pointer select-none text-xs text-muted-foreground transition-colors hover:text-foreground">
                        {t('engine.advanced')}
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label
                            htmlFor={scaleId}
                            className="mb-1.5 block text-xs text-muted-foreground"
                          >
                            {t('engine.scale')}
                          </label>
                          <select
                            id={scaleId}
                            value={String(output.scale ?? 1)}
                            onChange={(event) =>
                              updateOutput(output.id, { scale: Number(event.target.value) })
                            }
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
                          <label
                            htmlFor={modeId}
                            className="mb-1.5 block text-xs text-muted-foreground"
                          >
                            {t('engine.mode')}
                          </label>
                          <select
                            id={modeId}
                            value={output.optimizationMode ?? 'balanced'}
                            onChange={(event) =>
                              updateOutput(output.id, {
                                optimizationMode: event.target
                                  .value as OutputSpec['optimizationMode']
                              })
                            }
                            className="field-input h-9 text-xs"
                          >
                            <option value="balanced">{t('engine.mode_balanced')}</option>
                            <option value="max-compression">{t('engine.mode_compression')}</option>
                            <option value="max-speed">{t('engine.mode_speed')}</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor={targetId}
                            className="mb-1.5 block text-xs text-muted-foreground"
                          >
                            {t('engine.target_size')}
                          </label>
                          <select
                            id={targetId}
                            data-testid={index === 0 ? 'target-size' : undefined}
                            value={output.targetBytes == null ? '' : String(output.targetBytes)}
                            onChange={(event) =>
                              updateOutput(output.id, {
                                targetBytes:
                                  event.target.value === '' ? null : Number(event.target.value)
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
                    </details>

                    <p
                      data-testid="output-name"
                      className="flex items-center gap-1 truncate text-[11px] text-muted-foreground"
                    >
                      {item.collision === 'suffix' ? (
                        <AlertCircle className="h-3 w-3 shrink-0 text-destructive" />
                      ) : null}
                      <span className="truncate">{item.name}</span>
                    </p>
                    {item.collision === 'suffix' ? (
                      <p data-testid="output-collision" className="text-[11px] text-destructive">
                        {t('engine.output_collision')}
                      </p>
                    ) : null}
                  </div>
                );
              })}

              <Button
                id="addOutputBtn"
                data-testid="add-output"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addOutput}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> {t('engine.output_add')}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function modeKey(mode: OutputSpec['optimizationMode']): string {
  if (mode === 'max-compression') return 'engine.mode_compression';
  if (mode === 'max-speed') return 'engine.mode_speed';
  return 'engine.mode_balanced';
}

/**
 * Advanced values that differ from the default, as chips on the card header.
 * A collapsed `Mais opções` must never hide state — the chip is the cue.
 */
function advancedChips(output: OutputSpec): string[] {
  const chips: string[] = [];

  const scale = output.scale ?? 1;
  if (scale !== 1) chips.push(`${t('engine.scale')} ${Math.round(scale * 100)}%`);

  const mode = output.optimizationMode ?? 'balanced';
  if (mode !== 'balanced') chips.push(`${t('engine.mode')} ${t(modeKey(mode))}`);

  if (output.targetBytes != null) {
    chips.push(`${t('engine.target_size')} ${formatBytes(output.targetBytes)}`);
  }

  return chips;
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
    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
      <p className="flex items-center gap-1 text-[11px] text-destructive">
        <AlertCircle className="h-3 w-3" /> {t('engine.svg_invalid')}
      </p>
    );
  }

  const label = t(compositionKey(analysis.composition));
  const risks = analysis.risks.length;

  return (
    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
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
