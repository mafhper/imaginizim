import { lazy, Suspense, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RouteFallback } from '../components/RouteFallback';
import { useCompressionApp } from '../providers/CompressionProvider';
import { BrowserIcon, DownloadIcon, GithubIcon, ImageIcon } from '../components/icons/AppIcons';
import { Button } from '../components/ui/Button';

const ComparisonModal = lazy(() =>
  import('../components/ComparisonModal').then((module) => ({ default: module.ComparisonModal }))
);
const CompressorView = lazy(() =>
  import('../components/home/CompressorView').then((module) => ({ default: module.CompressorView }))
);

export function HomePage() {
  const app = useCompressionApp();
  const [isDragging, setIsDragging] = useState(false);
  const comparisonFile = useMemo(
    () => app.files.find((record) => record.id === app.comparison.fileId) ?? null,
    [app.comparison.fileId, app.files]
  );
  const comparedFiles = useMemo(
    () => app.files.filter((record) => record.status === 'done'),
    [app.files]
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    app.addFiles(Array.from(fileList));
  };

  if (app.files.length > 0) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <>
          <CompressorView
            files={app.files}
            selectedId={app.selectedId}
            quality={app.settings.quality}
            scale={app.settings.scale}
            outputFormat={app.settings.outputFormat}
            optimizationMode={app.settings.optimizationMode}
            density={app.density}
            doneCount={app.doneCount}
            totalSavedBytes={app.totalSavedBytes}
            hasProcessedOnce={app.hasProcessedOnce}
            onBack={app.resetSession}
            onFiles={app.addFiles}
            onSelectFile={app.selectFile}
            onRemoveFile={app.removeFile}
            onOpenComparison={app.openComparison}
            onDownloadFile={app.downloadFile}
            onReprocessFile={app.reprocessFile}
            onSetDensity={app.setDensity}
            onSettingsChange={app.setSettings}
            onReprocessSelected={app.reprocessSelected}
            onReprocessAll={app.reprocessAll}
            onDownloadAll={app.downloadAll}
          />
          <ComparisonModal
            open={app.comparison.open}
            file={comparisonFile}
            hasPrevNext={comparedFiles.length > 1}
            mode={app.comparison.mode}
            slider={app.comparison.slider}
            zoom={app.comparison.zoom}
            onClose={app.closeComparison}
            onModeChange={app.setComparisonMode}
            onSliderChange={app.setComparisonSlider}
            onZoomChange={app.setComparisonZoom}
            onPrev={app.previousComparedFile}
            onNext={app.nextComparedFile}
            onDownload={() => {
              if (comparisonFile) app.downloadFile(comparisonFile.id);
            }}
          />
        </>
      </Suspense>
    );
  }

  return (
    <div
      data-page="home"
      className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-[460px] w-[460px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(94,234,212,0.08),transparent_62%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.08))]" />
      </div>

      <div className="relative z-10 mb-10 max-w-2xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5">
          <BrowserIcon className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Compressão 100% no navegador</span>
        </div>
        <h1 className="font-display mb-5 text-4xl font-bold leading-tight text-foreground md:text-6xl">
          Otimize suas imagens <span className="text-gradient">sem sair do browser</span>
        </h1>
        <p className="mx-auto max-w-lg text-lg text-muted-foreground">
          Comprima, compare e exporte mais rápido sem abrir mão do controle do asset. Tudo roda no
          navegador, sem etapas extras.
        </p>
      </div>

      <div
        className="relative z-10 w-full max-w-2xl"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
      >
        <label className="block cursor-pointer">
          <input
            id="fileInput"
            data-testid="file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <div
            data-testid="home-dropzone"
            className={`home-dropzone glass-card relative overflow-hidden p-12 text-center transition-all duration-500 md:p-16 ${
              isDragging ? 'scale-[1.02] border-primary/60 bg-primary/5' : 'hover:border-primary/40'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-[hsl(280,60%,50%)]/5 opacity-60" />
            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 transition-all duration-300">
                <ImageIcon className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display mb-2 text-xl font-semibold text-foreground md:text-2xl">
                {isDragging
                  ? 'Solte para comprimir'
                  : 'Solte imagens aqui ou clique para selecionar'}
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Compatível com PNG, JPG, SVG, WebP e AVIF.
              </p>
              <p className="mb-8 text-xs text-muted-foreground/70">
                Monte o lote, ajuste o que precisa e processe quando o resultado fizer sentido para
                esse arquivo.
              </p>
              <div className="flex items-center justify-center gap-2">
                {['PNG', 'JPG', 'SVG', 'WebP', 'AVIF'].map((format) => (
                  <span
                    key={format}
                    className="rounded-md border border-border/50 bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </label>
      </div>

      <div className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <BrowserIcon className="h-4 w-4 text-primary" />
          <span>Processamento local</span>
        </div>
        <div className="flex items-center gap-2">
          <DownloadIcon className="h-4 w-4 text-[hsl(280,60%,65%)]" />
          <span>Download em ZIP</span>
        </div>
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[hsl(330,60%,60%)]" />
          <span>Comparação sob demanda</span>
        </div>
      </div>

      <div className="relative z-10 mt-12 flex flex-wrap items-center justify-center gap-3">
        <Link to="/sobre">
          <Button variant="hero-outline" size="sm">
            Entender a ferramenta
          </Button>
        </Link>
        <a href="https://github.com/mafhper/imaginizim" target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <GithubIcon className="h-3.5 w-3.5" /> GitHub
          </Button>
        </a>
      </div>
    </div>
  );
}
