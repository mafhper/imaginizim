import { files, setSelectedFileId, setOptimizedBlob } from '../state/appState';
import type { ProcessedFileRecord, WorkerCompressionResponse } from '../types';
import { formatBytes } from '../utils/bytes';
import { renderButtonContent } from '../utils/icons';

interface ListSetup {
  fileList: HTMLElement;
  queueCountEl: HTMLElement;
  totalSavedEl: HTMLElement;
  actionsBar: HTMLElement;
  studioControls: HTMLElement;
  onOpenComparison: (id: string) => void;
  onSelectFile: (id: string) => void;
  t: (key: string) => string;
}

function getDoneFiles(): ProcessedFileRecord[] {
  return Array.from(files.values()).filter((record) => record.status === 'done');
}

function getQueuedCount(): number {
  return Array.from(files.values()).filter((record) => record.status === 'queued').length;
}

function computeSavedBytes(): number {
  return Array.from(files.values()).reduce((sum, record) => {
    if (!record.newSize) return sum;
    return sum + Math.max(0, record.originalSize - record.newSize);
  }, 0);
}

export function createFileListManager({
  fileList,
  queueCountEl,
  totalSavedEl,
  actionsBar,
  studioControls,
  onOpenComparison,
  onSelectFile,
  t
}: ListSetup) {
  function updateShellState(): void {
    queueCountEl.textContent = String(getQueuedCount());
    totalSavedEl.textContent = formatBytes(computeSavedBytes());

    if (files.size > 0) {
      studioControls.classList.remove('hidden');
    } else {
      studioControls.classList.add('hidden');
    }

    if (getDoneFiles().length > 0) {
      actionsBar.classList.remove('hidden');
    } else {
      actionsBar.classList.add('hidden');
    }
  }

  function updateSelectionState(): void {
    const allItems = fileList.querySelectorAll<HTMLElement>('.file-item');
    allItems.forEach((item) => {
      const id = item.dataset.fileId;
      if (!id) return;
      const record = files.get(id);
      const selected = Boolean(record?.selected);
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function statusText(record: ProcessedFileRecord): string {
    if (record.status === 'queued') {
      return t('engine.status_queued');
    }

    if (record.status === 'processing') {
      return t('engine.status_processing');
    }

    if (record.status === 'error') {
      return t('engine.status_error');
    }

    const savedPercent = record.newSize
      ? Math.max(
          0,
          Math.round(((record.originalSize - record.newSize) / record.originalSize) * 100)
        )
      : 0;

    return `${formatBytes(record.newSize ?? 0)} • ${savedPercent}%`;
  }

  function metadataText(record: ProcessedFileRecord): string {
    if (record.status === 'error') {
      return t('engine.error_fallback');
    }

    if (record.status === 'done') {
      const outputFormat = record.chosenFormat.replace('image/', '').toUpperCase();
      return `${formatBytes(record.originalSize)} → ${formatBytes(record.newSize ?? 0)} • ${outputFormat}`;
    }

    return `${formatBytes(record.originalSize)} • ${record.file.type.replace('image/', '').toUpperCase()}`;
  }

  function createItem(record: ProcessedFileRecord): void {
    const item = document.createElement('article');
    item.className = 'file-item';
    item.id = `file-${record.id}`;
    item.dataset.fileId = record.id;
    item.setAttribute('role', 'option');

    const thumbButton = document.createElement('button');
    thumbButton.className = 'file-thumb-wrap';
    thumbButton.type = 'button';
    thumbButton.dataset.fileSelect = record.id;
    thumbButton.setAttribute('aria-label', `${t('actions.select_file')}: ${record.file.name}`);

    const thumb = document.createElement('img');
    thumb.src = record.sourceObjectUrl;
    thumb.alt = record.file.name;
    thumb.className = 'file-thumb';
    thumbButton.appendChild(thumb);

    const details = document.createElement('div');
    details.className = 'file-info';

    const name = document.createElement('h4');
    name.className = 'file-name';
    name.textContent = record.file.name;

    const status = document.createElement('p');
    status.className = 'file-status';

    const metadata = document.createElement('p');
    metadata.className = 'file-meta';

    details.appendChild(name);
    details.appendChild(status);
    details.appendChild(metadata);

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const compareButton = document.createElement('button');
    compareButton.className = 'btn-tertiary btn-icon-leading';
    compareButton.type = 'button';
    compareButton.dataset.fileCompare = record.id;

    const downloadButton = document.createElement('button');
    downloadButton.className = 'btn-inline-primary btn-icon-leading';
    downloadButton.type = 'button';
    downloadButton.dataset.fileDownload = record.id;

    actions.appendChild(compareButton);
    actions.appendChild(downloadButton);

    item.appendChild(thumbButton);
    item.appendChild(details);
    item.appendChild(actions);

    item.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-file-download]') || target.closest('[data-file-compare]')) {
        return;
      }
      onSelectFile(record.id);
    });

    thumbButton.addEventListener('click', () => onSelectFile(record.id));

    fileList.appendChild(item);
    update(record);
  }

  function update(record: ProcessedFileRecord): void {
    const item = document.getElementById(`file-${record.id}`);
    if (!item) return;

    const status = item.querySelector<HTMLElement>('.file-status');
    const metadata = item.querySelector<HTMLElement>('.file-meta');
    const compareButton = item.querySelector<HTMLButtonElement>('[data-file-compare]');
    const downloadButton = item.querySelector<HTMLButtonElement>('[data-file-download]');

    if (!status || !metadata || !compareButton || !downloadButton) return;

    status.textContent = statusText(record);
    metadata.textContent = metadataText(record);
    metadata.title = record.status === 'done' ? record.strategyUsed : '';

    compareButton.innerHTML = renderButtonContent('compare', t('preview.open_compare'));
    compareButton.disabled = record.status !== 'done';
    compareButton.onclick = () => onOpenComparison(record.id);

    downloadButton.innerHTML = renderButtonContent('download', t('preview.download'));
    downloadButton.disabled = !record.blob;

    updateSelectionState();
    updateShellState();
  }

  function upsert(record: ProcessedFileRecord): void {
    if (document.getElementById(`file-${record.id}`)) {
      update(record);
      return;
    }

    createItem(record);
  }

  function setSelected(id: string): void {
    files.forEach((record) => {
      record.selected = record.id === id;
    });

    setSelectedFileId(id);
    updateSelectionState();
  }

  function applyWorkerResult(response: WorkerCompressionResponse): void {
    const record = files.get(response.id);
    if (!record) return;

    if (!response.success || !response.blob) {
      record.status = 'error';
      update(record);
      return;
    }

    record.status = 'done';
    record.newSize = response.newSize ?? response.blob.size;
    record.chosenFormat = response.chosenFormat ?? response.blob.type;
    record.qualityScore = response.qualityScore ?? 0.85;
    record.strategyUsed = response.strategyUsed ?? 'unknown';

    setOptimizedBlob(record, response.blob);
    update(record);
  }

  function clear(): void {
    fileList.innerHTML = '';
    updateShellState();
  }

  function refreshAllTexts(): void {
    files.forEach((record) => update(record));
  }

  return {
    upsert,
    update,
    setSelected,
    applyWorkerResult,
    clear,
    refreshAllTexts,
    updateShellState
  };
}
