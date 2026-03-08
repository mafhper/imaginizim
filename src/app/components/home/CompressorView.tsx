import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  Eye,
  Plus,
  RefreshCcw,
  Trash2,
  Wand2
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { formatBytes } from '../../../utils/bytes';
import type { OptimizationMode, OutputFormat } from '../../../types';
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
    onReprocessSelected,
    onReprocessAll,
    onDownloadAll
  } = props;

  const totalOriginal = useMemo(
    () => files.reduce((sum, file) => sum + file.originalSize, 0),
    [files]
  );
  const totalCompressed = useMemo(
    () => files.reduce((sum, file) => sum + (file.newSize ?? file.originalSize), 0),
    [files]
  );
  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedId) ?? null,
    [files, selectedId]
  );
  const allDone =
    files.length > 0 && files.every((file) => file.status === 'done' || file.status === 'error');
  const savingsPercent = totalOriginal > 0 ? (totalSavedBytes / totalOriginal) * 100 : 0;
  const processingCount = files.filter((file) => file.status === 'processing').length;
  const errorCount = files.filter((file) => file.status === 'error').length;
  const shouldSuggestModernFormat =
    optimizationMode === 'max-compression' && outputFormat === 'original';

  const handleMoreFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    onFiles(Array.from(fileList));
  };

  return (
    <div data-page="home" className="min-h-[calc(100vh-4rem)] py-6 md:py-8">
      <div className="container max-w-7xl space-y-6">
        <section className="glass-panel p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="metric-chip">
                  <span className="glow-dot" /> {files.length}{' '}
                  {files.length === 1 ? 'arquivo' : 'arquivos'}
                </span>
                <span className="metric-chip">
                  <span className="glow-dot" /> {doneCount} concluídos
                </span>
                {processingCount > 0 ? (
                  <span className="metric-chip">{processingCount} processando</span>
                ) : null}
                {errorCount > 0 ? <span className="metric-chip">{errorCount} com erro</span> : null}
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Workspace de compressão
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground md:text-base">
                Adicione o lote, ajuste os parâmetros e dispare o processamento quando estiver
                pronto. Depois disso, reprocessar volta a ser uma decisão consciente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>
              <div className="rounded-[8px] border border-white/8 bg-secondary/55 p-1">
                <button
                  id="queueDensityComfortBtn"
                  type="button"
                  onClick={() => onSetDensity('comfort')}
                  className={cn(
                    'rounded-[8px] px-3 py-1.5 text-xs transition-colors',
                    density === 'comfort'
                      ? 'bg-white/[0.08] text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  Confortável
                </button>
                <button
                  id="queueDensityCompactBtn"
                  type="button"
                  onClick={() => onSetDensity('compact')}
                  className={cn(
                    'rounded-[8px] px-3 py-1.5 text-xs transition-colors',
                    density === 'compact'
                      ? 'bg-white/[0.08] text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  Compacta
                </button>
              </div>
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
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </span>
              </label>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <section className="glass-panel flex min-h-[640px] flex-col p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-border/70 pb-4">
              <div>
                <p className="section-label mb-2">Fila ativa</p>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Arquivos em processamento
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Compare, baixe ou reprocesse cada item quando fizer sentido.
                </p>
              </div>
              {allDone ? (
                <span className="metric-chip text-primary">
                  <Check className="h-3.5 w-3.5" /> processamento concluído
                </span>
              ) : null}
            </div>

            {selectedFile ? (
              <div className="mb-4 rounded-[8px] border border-white/8 bg-background/60 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="section-label mb-1">Arquivo em foco</p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedFile.file.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedFile.status === 'done'
                        ? 'Use comparar para revisar e download para fechar esse item.'
                        : selectedFile.status === 'processing'
                          ? `${selectedFile.statusLabel} • ${selectedFile.progress}%`
                          : 'Acompanhe o progresso ou ajuste depois via reprocessamento explícito.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="hero-outline"
                      size="sm"
                      disabled={selectedFile.status !== 'done'}
                      onClick={() => onOpenComparison(selectedFile.id)}
                    >
                      <Eye className="h-4 w-4" /> Comparar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedFile.status !== 'done'}
                      onClick={() => onDownloadFile(selectedFile.id)}
                    >
                      <Download className="h-4 w-4" /> Baixar
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="app-scrollbar flex-1 space-y-3 overflow-auto pr-1">
              {files.map((item) => {
                const savedBytes = Math.max(
                  0,
                  item.originalSize - (item.newSize ?? item.originalSize)
                );
                const isDone = item.status === 'done';
                const isCompact = density === 'compact';
                const isSelected = selectedId === item.id;
                return (
                  <article
                    key={item.id}
                    className={cn(
                      'group rounded-[8px] border border-white/8 bg-background/52 transition-colors',
                      isCompact ? 'p-3' : 'p-4',
                      selectedId === item.id && 'border-primary/25 bg-background/72'
                    )}
                    onClick={() => onSelectFile(item.id)}
                  >
                    <div className="flex gap-4">
                      {!isCompact ? (
                        <button
                          data-testid={`file-preview-${item.id}`}
                          type="button"
                          className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[8px] border border-white/8 bg-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (isDone) onOpenComparison(item.id);
                          }}
                        >
                          <img
                            src={item.compressedPreviewUrl ?? item.previewUrl}
                            alt={item.file.name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground md:text-base">
                              {item.file.name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{formatBytes(item.originalSize)}</span>
                              {item.newSize ? <span>→ {formatBytes(item.newSize)}</span> : null}
                              {savedBytes > 0 ? (
                                <span className="text-primary">-{formatBytes(savedBytes)}</span>
                              ) : null}
                              <span className="rounded-full border border-white/8 px-2 py-0.5">
                                {isDone ? formatTag(item.chosenFormat) : item.statusLabel}
                              </span>
                            </div>
                            {isSelected && !isCompact ? (
                              <p className="mt-2 text-xs text-muted-foreground">
                                {isDone
                                  ? 'Pronto para comparar ou baixar.'
                                  : item.status === 'processing'
                                    ? `${item.statusLabel} • ${item.progress}%`
                                    : 'Esse item aguarda o comando de processamento.'}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <IconButton
                              dataTestId={`file-compare-${item.id}`}
                              label="Comparar"
                              disabled={!isDone}
                              onClick={(event) => {
                                event.stopPropagation();
                                onOpenComparison(item.id);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </IconButton>
                            <IconButton
                              dataTestId={`file-download-${item.id}`}
                              label="Baixar"
                              disabled={!isDone}
                              onClick={(event) => {
                                event.stopPropagation();
                                onDownloadFile(item.id);
                              }}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </IconButton>
                            {isSelected ? (
                              <>
                                <IconButton
                                  dataTestId={`file-reprocess-${item.id}`}
                                  label={hasProcessedOnce ? 'Reprocessar' : 'Processar'}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onReprocessFile(item.id);
                                  }}
                                >
                                  <RefreshCcw className="h-3.5 w-3.5" />
                                </IconButton>
                                <IconButton
                                  dataTestId={`file-remove-${item.id}`}
                                  label="Remover"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onRemoveFile(item.id);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </IconButton>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {item.status === 'processing' ? (
                          <div className="mt-3 h-1.5 rounded-full bg-border/60">
                            <div
                              className="h-1.5 rounded-full bg-primary transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        ) : null}
                        {item.status === 'error' ? (
                          <p className="mt-3 flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" />{' '}
                            {item.errorMessage ?? 'Erro ao comprimir'}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 rounded-[8px] border border-dashed border-white/10 bg-background/45 p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Adicionar mais arquivos</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Novos itens entram na fila com os parâmetros atuais e aguardam seu comando.
                  </p>
                </div>
                <span>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4" /> Inserir lote
                  </Button>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleMoreFiles(event.target.files)}
                />
              </label>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="glass-panel p-5 space-y-5">
              <div>
                <p className="section-label mb-2">Inspector</p>
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Parâmetros globais
                </h3>
              </div>
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">
                  Qualidade — {Math.round(quality * 100)}%
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
                <label className="mb-2 block text-xs text-muted-foreground">Escala</label>
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
              </div>
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">Formato de saída</label>
                <select
                  value={outputFormat}
                  onChange={(event) =>
                    onSettingsChange({ outputFormat: event.target.value as OutputFormat })
                  }
                  className="field-input"
                >
                  <option value="auto">{t('engine.output_auto')}</option>
                  <option value="original">{t('engine.output_original')}</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                  <option value="image/avif">AVIF</option>
                </select>
                {shouldSuggestModernFormat ? (
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {t('engine.format_hint_max_compression')}
                  </p>
                ) : null}
              </div>
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">
                  Modo de otimização
                </label>
                <select
                  value={optimizationMode}
                  onChange={(event) =>
                    onSettingsChange({ optimizationMode: event.target.value as OptimizationMode })
                  }
                  className="field-input"
                >
                  <option value="balanced">Balanceado</option>
                  <option value="max-compression">Compressão máxima</option>
                  <option value="max-speed">Velocidade máxima</option>
                </select>
              </div>
            </div>

            <div className="glass-panel space-y-3 p-5">
              <Button
                id="optimizeQueueBtn"
                variant="hero"
                className="w-full"
                onClick={onReprocessAll}
              >
                <Wand2 className="h-4 w-4" />{' '}
                {hasProcessedOnce ? 'Reprocessar fila' : 'Processar fila'}
              </Button>
              <Button
                id="optimizeSelectedBtn"
                variant="hero-outline"
                className="w-full"
                onClick={onReprocessSelected}
                disabled={
                  !selectedFile ||
                  (!hasProcessedOnce &&
                    selectedFile.status !== 'done' &&
                    selectedFile.status !== 'error' &&
                    selectedFile.status !== 'queued')
                }
              >
                {hasProcessedOnce ? 'Reprocessar selecionado' : 'Processar selecionado'}
              </Button>
              <Button
                id="downloadAllBtn"
                variant="outline"
                className="w-full"
                onClick={() => void onDownloadAll()}
              >
                Download todos ({doneCount})
              </Button>
              <Button id="resetSessionBtn" variant="ghost" className="w-full" onClick={onBack}>
                Limpar sessão
              </Button>
            </div>

            <div className="glass-panel p-5">
              <p className="section-label mb-2">Resumo</p>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Original</span>
                  <span className="text-foreground">{formatBytes(totalOriginal)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Comprimido</span>
                  <span className="text-foreground">{formatBytes(totalCompressed)}</span>
                </div>
                <div className="h-px bg-border/70" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Economizado</span>
                  <span className="font-semibold text-primary">
                    {formatBytes(totalSavedBytes)} ({savingsPercent.toFixed(1)}%)
                  </span>
                </div>
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
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-[8px] border px-3 text-xs transition-colors',
        disabled
          ? 'cursor-not-allowed border-border/40 bg-white/[0.02] text-muted-foreground/50'
          : 'border-border/70 bg-white/[0.03] text-muted-foreground hover:border-primary/25 hover:text-foreground'
      )}
    >
      {children}
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}
