import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RouteFallback } from '../components/RouteFallback';
import { useCompressionApp } from '../providers/CompressionProvider';
import { ImageIcon } from '../components/icons/AppIcons';
import { LiquidMeshBackdrop } from '../components/home/LiquidMeshBackdrop';

const ComparisonModal = lazy(() =>
  import('../components/ComparisonModal').then((module) => ({ default: module.ComparisonModal }))
);
const CompressorView = lazy(() =>
  import('../components/home/CompressorView').then((module) => ({ default: module.CompressorView }))
);

export function HomePage() {
  const { t } = useTranslation();
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
      className="home-hero relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-x-hidden px-4 py-12 md:py-0"
    >
      <LiquidMeshBackdrop />

      <div className="home-hero__copy relative z-10 mb-10 max-w-3xl text-center">
        <h1 className="font-display mb-5 text-4xl font-normal tracking-[-0.03em] leading-tight text-foreground md:text-[3.4rem]">
          {t('hero.title')}
        </h1>
        <p className="mx-auto max-w-[58ch] text-lg leading-8 text-foreground/80">
          {t('hero.subtitle')}
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
              isDragging
                ? 'scale-[1.02] border-primary/40 bg-background/80'
                : 'hover:border-white/20'
            }`}
          >
            <div className="relative z-10">
              <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-background/60 transition-all duration-300">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="font-display mb-2 text-xl font-normal tracking-tight text-foreground md:text-2xl">
                {isDragging ? t('engine.status_processing') : t('engine.init_title')}
              </h2>
              <p className="mb-8 text-[13px] text-muted-foreground">{t('engine.init_desc')}</p>
              <div className="flex items-center justify-center gap-6 text-xs font-mono tracking-widest text-muted-foreground font-medium uppercase">
                {['PNG', 'JPG', 'SVG', 'WebP', 'AVIF'].map((format) => (
                  <span key={format} className="opacity-80 hover:opacity-100 transition-opacity">
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </label>
      </div>

      <div className="home-hero__proof relative z-10 mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <span>{t('hero.tag1')}</span>
        <span className="w-1 h-1 rounded-full bg-border"></span>
        <span>{t('hero.tag2')}</span>
        <span className="w-1 h-1 rounded-full bg-border"></span>
        <span>{t('hero.tag3')}</span>
      </div>

    </div>
  );
}
