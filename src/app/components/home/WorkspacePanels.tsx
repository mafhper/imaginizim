import { Download, RefreshCcw, Scan, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { t } from '../../../i18n';
import type { OptimizationMode, OutputFormat } from '../../../types';
import { cn } from '../../utils/ui';

interface WorkspaceCenterProps {
  onFiles: (files: File[]) => void;
}

export function WorkspaceCenter({ onFiles }: WorkspaceCenterProps) {
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onFiles(Array.from(fileList));
  };

  return (
    <section className="relative min-h-0">
      <label
        data-testid="home-dropzone"
        className="dropzone-card group relative flex min-h-[420px] cursor-pointer items-center justify-center overflow-hidden rounded-[8px] border border-white/10 px-6 py-12 text-center shadow-rail"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          id="fileInput"
          data-testid="file-input"
          className="hidden"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp,image/avif"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <div className="dropzone-aurora pointer-events-none absolute inset-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="dropzone-fade pointer-events-none absolute inset-x-0 bottom-0 h-40" />
        <div className="relative z-[1] mx-auto max-w-[560px]">
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-[8px] border border-primary/20 bg-primary/10 text-primary shadow-glow">
            <Scan className="h-7 w-7" />
          </div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />
            {t('engine.local_badge')}
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-6xl">
            {t('engine.init_title')}
          </h1>
          <p className="mx-auto mt-5 max-w-[44ch] text-lg leading-8 text-muted-foreground">
            {t('engine.init_desc')}
          </p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm leading-7 text-muted-foreground/80">
            {t('engine.value_line')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {['PNG', 'JPG', 'SVG', 'WEBP', 'AVIF'].map((format) => (
              <span
                key={format}
                className="rounded-[8px] border border-white/8 bg-secondary/80 px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {format}
              </span>
            ))}
          </div>
        </div>
      </label>
    </section>
  );
}

interface InspectorPanelProps {
  quality: number;
  scale: number;
  outputFormat: OutputFormat;
  optimizationMode: OptimizationMode;
  hasFiles: boolean;
  onSettingsChange: (patch: {
    quality?: number;
    scale?: number;
    outputFormat?: OutputFormat;
    optimizationMode?: OptimizationMode;
  }) => void;
  onReprocessSelected: () => void;
  onReprocessAll: () => void;
  onDownloadAll: () => Promise<void>;
  onReset: () => void;
}

export function InspectorPanel(props: InspectorPanelProps) {
  const {
    quality,
    scale,
    outputFormat,
    optimizationMode,
    hasFiles,
    onSettingsChange,
    onReprocessSelected,
    onReprocessAll,
    onDownloadAll,
    onReset
  } = props;

  return (
    <aside className="panel-shell h-full min-h-0">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          {t('engine.params_title')}
        </h2>
      </div>
      <div className="space-y-5">
        <Control label={t('engine.quality')} value={`${Math.round(quality * 100)}%`}>
          <input
            type="range"
            min="35"
            max="100"
            value={Math.round(quality * 100)}
            onChange={(event) => onSettingsChange({ quality: Number(event.target.value) / 100 })}
            className="range-input"
          />
        </Control>
        <Control label={t('engine.scale')}>
          <select
            value={String(scale)}
            onChange={(event) => onSettingsChange({ scale: Number(event.target.value) })}
            className="field-input"
          >
            <option value="0.5">50%</option>
            <option value="0.75">75%</option>
            <option value="1">100%</option>
            <option value="1.5">150%</option>
            <option value="2">200%</option>
          </select>
        </Control>
        <Control label={t('engine.output_format')}>
          <select
            value={outputFormat}
            onChange={(event) =>
              onSettingsChange({ outputFormat: event.target.value as OutputFormat })
            }
            className="field-input"
          >
            <option value="auto">{t('engine.output_auto')}</option>
            <option value="original">{t('engine.origin')}</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
            <option value="image/avif">AVIF</option>
          </select>
        </Control>
        <Control label={t('engine.mode')}>
          <select
            value={optimizationMode}
            onChange={(event) =>
              onSettingsChange({ optimizationMode: event.target.value as OptimizationMode })
            }
            className="field-input"
          >
            <option value="balanced">{t('engine.mode_balanced')}</option>
            <option value="max-compression">{t('engine.mode_compression')}</option>
            <option value="max-speed">{t('engine.mode_speed')}</option>
          </select>
        </Control>
      </div>
      <div className="mt-8 grid gap-3">
        <ActionButton
          testId="optimizeSelectedBtn"
          icon={<Wand2 className="h-4 w-4" />}
          label={t('actions.optimize_selected')}
          onClick={onReprocessSelected}
          disabled={!hasFiles}
          primary
        />
        <ActionButton
          testId="optimizeQueueBtn"
          icon={<Scan className="h-4 w-4" />}
          label={t('actions.optimize_queue')}
          onClick={onReprocessAll}
          disabled={!hasFiles}
        />
        <ActionButton
          testId="downloadAllBtn"
          icon={<Download className="h-4 w-4" />}
          label={t('actions.download_all')}
          onClick={() => void onDownloadAll()}
          disabled={!hasFiles}
        />
        <ActionButton
          testId="resetSessionBtn"
          icon={<RefreshCcw className="h-4 w-4" />}
          label={t('actions.reset')}
          onClick={onReset}
          disabled={!hasFiles}
          subtle
        />
      </div>
    </aside>
  );
}

function Control({
  label,
  value,
  children
}: {
  label: string;
  value?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {value ? <strong className="text-foreground">{value}</strong> : null}
      </span>
      {children}
    </label>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled = false,
  primary = false,
  subtle = false,
  testId
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  subtle?: boolean;
  testId?: string;
}) {
  return (
    <button
      data-testid={testId}
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-medium transition-all',
        disabled && 'cursor-not-allowed opacity-50',
        primary
          ? 'border-primary/20 bg-primary/12 text-foreground shadow-glow'
          : subtle
            ? 'border-white/8 bg-white/[0.02] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground'
            : 'border-white/8 bg-card/70 text-muted-foreground hover:border-white/12 hover:bg-card hover:text-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
