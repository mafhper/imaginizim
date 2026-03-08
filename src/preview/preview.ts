import {
  getComparisonState,
  setActivePreviewFileId,
  setActivePreviewMode,
  setComparisonOpen,
  setPreviewIndex
} from '../state/appState';
import type { PreviewMode, ProcessedFileRecord } from '../types';
import { formatBytes } from '../utils/bytes';

interface ComparisonModalSetup {
  modal: HTMLElement;
  backdrop: HTMLElement;
  closeButton: HTMLButtonElement;
  title: HTMLElement;
  fileName: HTMLElement;
  beforeImage: HTMLImageElement;
  afterWrap: HTMLElement;
  afterImage: HTMLImageElement;
  slider: HTMLInputElement;
  meta: HTMLElement;
  viewport: HTMLElement;
  modeSplitButton: HTMLButtonElement;
  modeOverlayButton: HTMLButtonElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  zoomSelect: HTMLSelectElement;
  downloadButton: HTMLButtonElement;
  getComparableRecords: () => ProcessedFileRecord[];
  onDownload: (record: ProcessedFileRecord) => void;
}

function calculateSavedPercent(record: ProcessedFileRecord): number {
  if (!record.newSize || record.originalSize <= 0) return 0;
  return Math.max(
    0,
    Math.round(((record.originalSize - record.newSize) / record.originalSize) * 100)
  );
}

export function setupPreview(setup: ComparisonModalSetup) {
  const {
    modal,
    backdrop,
    closeButton,
    title,
    fileName,
    beforeImage,
    afterWrap,
    afterImage,
    slider,
    meta,
    viewport,
    modeSplitButton,
    modeOverlayButton,
    previousButton,
    nextButton,
    zoomSelect,
    downloadButton,
    getComparableRecords,
    onDownload
  } = setup;

  let keyboardBound = false;

  function getCurrentRecords(): ProcessedFileRecord[] {
    return getComparableRecords();
  }

  function getCurrentRecord(): ProcessedFileRecord | null {
    const records = getCurrentRecords();
    if (records.length === 0) return null;

    const state = getComparisonState();
    if (state.previewIndex < 0 || state.previewIndex >= records.length) {
      setPreviewIndex(0);
      return records[0];
    }

    return records[state.previewIndex] ?? records[0];
  }

  function applyMode(mode: PreviewMode): void {
    viewport.classList.toggle('mode-split', mode === 'split');
    viewport.classList.toggle('mode-overlay', mode === 'overlay');

    modeSplitButton.classList.toggle('active', mode === 'split');
    modeOverlayButton.classList.toggle('active', mode === 'overlay');

    setActivePreviewMode(mode);
    applySlider(Number(slider.value));
  }

  function applySlider(value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    const mode = getComparisonState().activePreviewMode;
    viewport.style.setProperty('--comparison-handle-position', `${clamped}%`);

    if (mode === 'split') {
      afterWrap.style.clipPath = `inset(0 0 0 ${clamped}%)`;
      afterImage.style.opacity = '1';
      return;
    }

    afterWrap.style.clipPath = 'inset(0 0 0 0)';
    afterImage.style.opacity = `${clamped / 100}`;
  }

  function applyZoom(value: string): void {
    const normalized = value === 'fit' ? 'fit' : value;
    if (normalized === 'fit') {
      viewport.style.setProperty('--compare-zoom', '1');
      viewport.classList.remove('is-zoomed');
      return;
    }

    const zoom = Number(normalized);
    const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
    viewport.style.setProperty('--compare-zoom', String(safeZoom));
    viewport.classList.add('is-zoomed');
  }

  function refreshNavButtons(): void {
    const records = getCurrentRecords();
    const disabled = records.length < 2;
    previousButton.disabled = disabled;
    nextButton.disabled = disabled;
  }

  function render(): void {
    const record = getCurrentRecord();
    if (!record) {
      close();
      return;
    }

    const optimizedSrc = record.optimizedObjectUrl ?? record.sourceObjectUrl;

    setActivePreviewFileId(record.id);

    title.textContent = title.textContent || 'Image comparison';
    fileName.textContent = record.file.name;
    beforeImage.src = record.sourceObjectUrl;
    afterImage.src = optimizedSrc;

    const savedPercent = calculateSavedPercent(record);
    meta.textContent = `${formatBytes(record.originalSize)} -> ${formatBytes(record.newSize ?? record.originalSize)} (${savedPercent}% saved)`;

    downloadButton.disabled = !record.blob;
    downloadButton.onclick = () => onDownload(record);

    const mode = getComparisonState().activePreviewMode;
    applyMode(mode);
    applySlider(Number(slider.value));
    refreshNavButtons();
  }

  function navigate(step: -1 | 1): void {
    const records = getCurrentRecords();
    if (records.length === 0) return;

    const state = getComparisonState();
    const nextIndex = (state.previewIndex + step + records.length) % records.length;
    setPreviewIndex(nextIndex);
    render();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!getComparisonState().isComparisonModalOpen) return;

    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(-1);
    }
  }

  function bindKeyboard(): void {
    if (keyboardBound) return;
    document.addEventListener('keydown', onKeydown);
    keyboardBound = true;
  }

  function unbindKeyboard(): void {
    if (!keyboardBound) return;
    document.removeEventListener('keydown', onKeydown);
    keyboardBound = false;
  }

  function open(id: string): void {
    const records = getCurrentRecords();
    if (records.length === 0) return;

    const targetIndex = records.findIndex((record) => record.id === id);
    setPreviewIndex(targetIndex >= 0 ? targetIndex : 0);

    modal.classList.remove('hidden');
    setComparisonOpen(true);
    bindKeyboard();
    render();
  }

  function close(): void {
    modal.classList.add('hidden');
    setComparisonOpen(false);
    setActivePreviewFileId(null);
    beforeImage.removeAttribute('src');
    afterImage.removeAttribute('src');
    unbindKeyboard();
  }

  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  slider.addEventListener('input', () => {
    applySlider(Number(slider.value));
  });

  modeSplitButton.addEventListener('click', () => applyMode('split'));
  modeOverlayButton.addEventListener('click', () => applyMode('overlay'));

  previousButton.addEventListener('click', () => navigate(-1));
  nextButton.addEventListener('click', () => navigate(1));

  zoomSelect.addEventListener('change', () => applyZoom(zoomSelect.value));
  applyZoom(zoomSelect.value);

  return {
    open,
    close,
    rerenderIfOpen() {
      if (!getComparisonState().isComparisonModalOpen) return;
      render();
    },
    nextComparedFile() {
      navigate(1);
    },
    previousComparedFile() {
      navigate(-1);
    },
    setPreviewMode(mode: PreviewMode) {
      applyMode(mode);
    }
  };
}
