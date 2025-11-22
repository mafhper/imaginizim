import './style.css';
import JSZip from 'jszip';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const actionsBar = document.getElementById('actionsBar');
const totalSavedEl = document.getElementById('totalSaved');
const downloadAllBtn = document.getElementById('downloadAllBtn');

const previewModal = document.getElementById('previewModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const previewImage = document.getElementById('previewImage');
const previewOriginalSize = document.getElementById('previewOriginalSize');
const previewNewSize = document.getElementById('previewNewSize');
const downloadPreviewBtn = document.getElementById('downloadPreviewBtn');

let worker;
try {
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
} catch (error) {
  console.error('Failed to create worker:', error);
}

const files = new Map();
let totalSavedBytes = 0;
let currentPreviewId = null;

worker.onmessage = (e) => {
  const { id, success, blob, originalSize, newSize, error } = e.data;
  
  if (success) {
    const fileData = files.get(id);
    if (fileData) {
      fileData.blob = blob;
      fileData.status = 'done';
      fileData.newSize = newSize;
      
      updateFileItemUI(id, fileData);
      updateGlobalStats(originalSize - newSize);
    }
  } else {
    const fileData = files.get(id);
    if (fileData) {
      fileData.status = 'error';
      updateFileItemUI(id, fileData);
    }
  }
};

worker.onerror = (error) => {
  console.error('Worker error:', error.message);
};

worker.onmessageerror = (error) => {
  console.error('Worker message error:', error);
};

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function updateGlobalStats(savedBytes) {
  totalSavedBytes += savedBytes;
  totalSavedEl.textContent = formatBytes(totalSavedBytes);
  if (files.size > 0) {
    actionsBar.classList.remove('hidden');
  }
}

function createFileItemUI(id, file) {
  const item = document.createElement('div');
  item.className = 'file-item';
  item.id = `file-${id}`;
  
  const objectUrl = URL.createObjectURL(file);
  
  const thumb = document.createElement('img');
  thumb.src = objectUrl;
  thumb.className = 'file-thumb';
  thumb.alt = file.name;
  thumb.title = 'Click to preview';
  thumb.onclick = () => openPreview(id);
  
  const fileInfo = document.createElement('div');
  fileInfo.className = 'file-info';
  fileInfo.innerHTML = `
    <div class="file-name" title="${file.name}">${file.name}</div>
    <div class="file-meta">
      <span class="original-size">${formatBytes(file.size)}</span>
      <span class="arrow">→</span>
      <span class="status">Processing...</span>
    </div>
  `;
  
  const fileActions = document.createElement('div');
  fileActions.className = 'file-actions';
  
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'btn-icon download-btn';
  downloadBtn.disabled = true;
  downloadBtn.title = 'Download';
  downloadBtn.textContent = '↓';
  downloadBtn.style.fontSize = '24px';
  downloadBtn.style.fontWeight = 'bold';
  
  downloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadFile(id);
  });
  
  fileActions.appendChild(downloadBtn);
  
  item.appendChild(thumb);
  item.appendChild(fileInfo);
  item.appendChild(fileActions);
  
  fileList.appendChild(item);
}

function updateFileItemUI(id, data) {
  const item = document.getElementById(`file-${id}`);
  if (!item) return;

  const statusEl = item.querySelector('.status');
  const downloadBtn = item.querySelector('.download-btn');
  
  if (data.status === 'done') {
    const savedPercent = Math.round(((data.originalSize - data.newSize) / data.originalSize) * 100);
    statusEl.innerHTML = `
      <span class="new-size">${formatBytes(data.newSize)}</span>
      <span class="badge-saved">-${savedPercent}%</span>
    `;
    downloadBtn.disabled = false;
    downloadBtn.style.color = 'var(--color-secondary)';
    
    if (currentPreviewId === id) {
      updatePreviewModal(id);
    }
  } else if (data.status === 'error') {
    statusEl.textContent = 'Error';
    statusEl.classList.add('error');
  }
}

function processFile(file) {
  const id = Math.random().toString(36).substr(2, 9);
  
  files.set(id, { file, status: 'processing', originalSize: file.size });
  
  createFileItemUI(id, file);
  worker.postMessage({ file, id, type: file.type });
}

function downloadFile(id) {
  const data = files.get(id);
  
  if (data && data.blob) {
    const url = URL.createObjectURL(data.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-${data.file.name}`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function openPreview(id) {
  const data = files.get(id);
  if (!data) return;
  
  currentPreviewId = id;
  previewModal.classList.remove('hidden');
  updatePreviewModal(id);
}

function updatePreviewModal(id) {
  const data = files.get(id);
  if (!data) return;
  
  const blobToShow = data.blob || data.file;
  previewImage.src = URL.createObjectURL(blobToShow);
  
  previewOriginalSize.textContent = formatBytes(data.originalSize);
  
  if (data.status === 'done') {
    previewNewSize.textContent = formatBytes(data.newSize);
    downloadPreviewBtn.disabled = false;
  } else {
    previewNewSize.textContent = '...';
    downloadPreviewBtn.disabled = true;
  }
}

function closePreview() {
  previewModal.classList.add('hidden');
  currentPreviewId = null;
  previewImage.src = '';
}

closeModalBtn.onclick = closePreview;
previewModal.onclick = (e) => {
  if (e.target === previewModal || e.target.classList.contains('modal-backdrop')) {
    closePreview();
  }
};

downloadPreviewBtn.onclick = () => {
  if (currentPreviewId) {
    downloadFile(currentPreviewId);
  }
};

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const droppedFiles = Array.from(e.dataTransfer.files);
  droppedFiles.forEach(processFile);
});

dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  const selectedFiles = Array.from(e.target.files);
  selectedFiles.forEach(processFile);
  fileInput.value = '';
});

downloadAllBtn.addEventListener('click', async () => {
  const zip = new JSZip();
  let count = 0;
  
  for (const [id, data] of files) {
    if (data.status === 'done' && data.blob) {
      zip.file(`optimized-${data.file.name}`, data.blob);
      count++;
    }
  }
  
  if (count > 0) {
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imaginizim-optimized.zip';
    a.click();
    URL.revokeObjectURL(url);
  }
});
