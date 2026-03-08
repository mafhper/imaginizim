import './styles/index.css';
import { initI18n, t } from './i18n';
import { setupNavigation } from './navigation/navigation';
import { setupUpload } from './upload/upload';
import { setupPreview } from './preview/preview';
import { downloadZip } from './download/download';
import { createCompressionController } from './compression/controller';
import { byId } from './utils/dom';
import {
  clearFiles,
  files,
  getUiState,
  globalSettings,
  setQueueDensity,
  setMobileNavOpen
} from './state/appState';
import { downloadBlob } from './utils/downloadBlob';
import { applyProjectMeta } from './utils/projectMeta';
import {
  applyQueueDensityUi,
  getStoredQueueDensity,
  persistQueueDensity
} from './utils/queueDensity';
import type { QueueDensity } from './types';

await initI18n();

const app = byId<HTMLElement>('app');
const dropzone = byId<HTMLElement>('dropzone');
const fileInput = byId<HTMLInputElement>('fileInput');
const fileList = byId<HTMLElement>('fileList');
const queueCount = byId<HTMLElement>('queueCount');
const studioControls = byId<HTMLElement>('studioControls');
const actionsBar = byId<HTMLElement>('actionsBar');
const totalSavedEl = byId<HTMLElement>('totalSaved');

const qualityRange = byId<HTMLInputElement>('qualityRange');
const qualityValue = byId<HTMLElement>('qualityValue');
const scaleSelect = byId<HTMLSelectElement>('scaleSelect');
const outputFormatSelect = byId<HTMLSelectElement>('outputFormatSelect');
const optimizationModeSelect = byId<HTMLSelectElement>('optimizationModeSelect');

const optimizeSelectedBtn = byId<HTMLButtonElement>('optimizeSelectedBtn');
const optimizeQueueBtn = byId<HTMLButtonElement>('optimizeQueueBtn');
const downloadAllBtn = byId<HTMLButtonElement>('downloadAllBtn');
const resetSessionBtn = byId<HTMLButtonElement>('resetSessionBtn');

const comparisonModal = byId<HTMLElement>('comparisonModal');
const comparisonBackdrop = byId<HTMLElement>('comparisonBackdrop');
const comparisonTitle = byId<HTMLElement>('comparisonTitle');
const comparisonFileName = byId<HTMLElement>('comparisonFileName');
const comparisonBeforeImage = byId<HTMLImageElement>('comparisonBeforeImage');
const comparisonAfterWrap = byId<HTMLElement>('comparisonAfterWrap');
const comparisonAfterImage = byId<HTMLImageElement>('comparisonAfterImage');
const comparisonSlider = byId<HTMLInputElement>('comparisonSlider');
const comparisonMeta = byId<HTMLElement>('comparisonMeta');
const comparisonViewport = byId<HTMLElement>('comparisonViewport');
const modeSplitBtn = byId<HTMLButtonElement>('modeSplitBtn');
const modeOverlayBtn = byId<HTMLButtonElement>('modeOverlayBtn');
const comparePrevBtn = byId<HTMLButtonElement>('comparePrevBtn');
const compareNextBtn = byId<HTMLButtonElement>('compareNextBtn');
const comparisonZoom = byId<HTMLSelectElement>('comparisonZoom');
const downloadComparedBtn = byId<HTMLButtonElement>('downloadComparedBtn');
const closeComparisonBtn = byId<HTMLButtonElement>('closeComparisonBtn');

const mobileNavToggle = byId<HTMLButtonElement>('mobileNavToggle');
const mobileNavBackdrop = byId<HTMLElement>('mobileNavBackdrop');
const mobileNavSheet = byId<HTMLElement>('mobileNavSheet');
const mobileNavClose = byId<HTMLButtonElement>('mobileNavClose');

const footerCommitLink = byId<HTMLAnchorElement>('footerCommitLink');
const footerRepoLink = byId<HTMLAnchorElement>('footerRepoLink');
const faqRepoIssuesLink = byId<HTMLAnchorElement>('faqRepoIssuesLink');
const queueDensityComfortBtn = byId<HTMLButtonElement>('queueDensityComfortBtn');
const queueDensityCompactBtn = byId<HTMLButtonElement>('queueDensityCompactBtn');

const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-link');
const routeViews = document.querySelectorAll<HTMLElement>('[data-route-view]');

let mobileNavKeydownHandler: ((event: KeyboardEvent) => void) | null = null;
let mobileNavReturnFocus: HTMLElement | null = null;

function setHasFilesClass(): void {
  app.classList.toggle('has-files', files.size > 0);
}

function trapMobileNavFocus(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeMobileNav();
    return;
  }

  if (event.key !== 'Tab') return;

  const focusables = mobileNavSheet.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
  );

  if (focusables.length === 0) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const activeElement = document.activeElement as HTMLElement | null;

  if (event.shiftKey && activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openMobileNav(): void {
  mobileNavReturnFocus = document.activeElement as HTMLElement;
  mobileNavSheet.classList.remove('hidden');
  mobileNavBackdrop.classList.remove('hidden');
  mobileNavSheet.classList.add('active');
  mobileNavBackdrop.classList.add('active');
  document.body.classList.add('nav-sheet-open');

  setMobileNavOpen(true);
  mobileNavToggle.setAttribute('aria-expanded', 'true');

  mobileNavKeydownHandler = (event: KeyboardEvent) => trapMobileNavFocus(event);
  document.addEventListener('keydown', mobileNavKeydownHandler);

  const firstLink = mobileNavSheet.querySelector<HTMLElement>('.nav-link');
  firstLink?.focus();
}

function closeMobileNav(): void {
  mobileNavSheet.classList.remove('active');
  mobileNavBackdrop.classList.remove('active');
  mobileNavSheet.classList.add('hidden');
  mobileNavBackdrop.classList.add('hidden');
  document.body.classList.remove('nav-sheet-open');

  setMobileNavOpen(false);
  mobileNavToggle.setAttribute('aria-expanded', 'false');

  if (mobileNavKeydownHandler) {
    document.removeEventListener('keydown', mobileNavKeydownHandler);
    mobileNavKeydownHandler = null;
  }

  mobileNavReturnFocus?.focus();
}

let previewController: ReturnType<typeof setupPreview>;

const compression = createCompressionController({
  fileList,
  queueCountEl: queueCount,
  totalSavedEl,
  actionsBar,
  studioControls,
  onOpenComparison: (id) => previewController.open(id),
  onSelectionChanged: () => {
    // Selection updates remain internal to the list/inspector flow.
  },
  onProcessingCompleted: () => {
    previewController.rerenderIfOpen();
  },
  t
});

previewController = setupPreview({
  modal: comparisonModal,
  backdrop: comparisonBackdrop,
  closeButton: closeComparisonBtn,
  title: comparisonTitle,
  fileName: comparisonFileName,
  beforeImage: comparisonBeforeImage,
  afterWrap: comparisonAfterWrap,
  afterImage: comparisonAfterImage,
  slider: comparisonSlider,
  meta: comparisonMeta,
  viewport: comparisonViewport,
  modeSplitButton: modeSplitBtn,
  modeOverlayButton: modeOverlayBtn,
  previousButton: comparePrevBtn,
  nextButton: compareNextBtn,
  zoomSelect: comparisonZoom,
  downloadButton: downloadComparedBtn,
  getComparableRecords: () => compression.getComparableRecords(),
  onDownload: (record) => {
    if (!record.blob) return;
    downloadBlob(record.blob, `optimized-${record.file.name}`);
  }
});

setupNavigation({
  navLinks,
  views: routeViews,
  defaultRoute: 'home',
  onRouteChange: () => {
    if (getUiState().isMobileNavOpen) {
      closeMobileNav();
    }
  }
});

setupUpload({
  dropzone,
  input: fileInput,
  onFiles: (incoming) => {
    compression.queueFiles(incoming);
    setHasFilesClass();
  }
});

fileList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const downloadButton = target.closest<HTMLButtonElement>('[data-file-download]');

  if (!downloadButton) return;

  const id = downloadButton.dataset.fileDownload;
  if (!id) return;

  const record = compression.getRecord(id);
  if (!record?.blob) return;

  downloadBlob(record.blob, `optimized-${record.file.name}`);
});

qualityRange.addEventListener('input', () => {
  const value = Number(qualityRange.value);
  globalSettings.quality = value / 100;
  qualityValue.textContent = `${value}%`;
});

scaleSelect.addEventListener('change', () => {
  globalSettings.scale = Number(scaleSelect.value);
});

outputFormatSelect.addEventListener('change', () => {
  globalSettings.outputFormat = outputFormatSelect.value as typeof globalSettings.outputFormat;
});

optimizationModeSelect.addEventListener('change', () => {
  globalSettings.optimizationMode =
    optimizationModeSelect.value as typeof globalSettings.optimizationMode;
});

optimizeSelectedBtn.addEventListener('click', () => {
  compression.optimizeSelected();
});

optimizeQueueBtn.addEventListener('click', () => {
  compression.optimizeQueue();
});

downloadAllBtn.addEventListener('click', async () => {
  await downloadZip(Array.from(files.values()));
});

resetSessionBtn.addEventListener('click', () => {
  clearFiles();
  compression.clearList();
  previewController.close();

  setHasFilesClass();
});

mobileNavToggle.addEventListener('click', () => {
  if (getUiState().isMobileNavOpen) {
    closeMobileNav();
    return;
  }

  openMobileNav();
});

mobileNavClose.addEventListener('click', closeMobileNav);
mobileNavBackdrop.addEventListener('click', closeMobileNav);

function setQueueDensityPreference(density: QueueDensity): void {
  setQueueDensity(density);
  persistQueueDensity(density);
  applyQueueDensityUi(
    {
      app,
      comfortButton: queueDensityComfortBtn,
      compactButton: queueDensityCompactBtn
    },
    density
  );
}

queueDensityComfortBtn.addEventListener('click', () => {
  setQueueDensityPreference('comfort');
});

queueDensityCompactBtn.addEventListener('click', () => {
  setQueueDensityPreference('compact');
});

setQueueDensityPreference(getStoredQueueDensity());
applyProjectMeta({
  commitLink: footerCommitLink,
  repositoryLink: footerRepoLink,
  issuesLink: faqRepoIssuesLink
});

qualityValue.textContent = `${Math.round(globalSettings.quality * 100)}%`;
qualityRange.value = String(Math.round(globalSettings.quality * 100));
scaleSelect.value = String(globalSettings.scale);
outputFormatSelect.value = globalSettings.outputFormat;
optimizationModeSelect.value = globalSettings.optimizationMode;
comparisonViewport.style.setProperty(
  '--comparison-viewport-height',
  getUiState().comparisonViewportHeight
);

compression.refreshShell();
setHasFilesClass();
