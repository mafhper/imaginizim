import { downloadBlob } from '../utils/downloadBlob';
import { exportFileNameForRecord } from '../export/formats';
import type { ProcessedFileRecord } from '../types';

export async function downloadZip(files: ProcessedFileRecord[]): Promise<boolean> {
  const doneFiles = files.filter((record) => record.blob);
  if (doneFiles.length === 0) return false;

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  doneFiles.forEach((record) => {
    zip.file(exportFileNameForRecord(record), record.blob as Blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, 'imaginizim-optimized-images.zip');

  return true;
}
