import { downloadBlob } from '../utils/downloadBlob';

export interface ZipEntry {
  name: string;
  blob: Blob;
}

/**
 * Builds and downloads a ZIP from named blobs.
 *
 * It no longer knows about records or compression — it only knows entries. ZIP
 * is one delivery strategy, not a property of the compressor.
 */
export async function downloadZip(
  entries: ZipEntry[],
  zipName = 'imaginizim-optimized-images.zip'
): Promise<boolean> {
  if (entries.length === 0) return false;

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  entries.forEach((entry) => {
    zip.file(entry.name, entry.blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  downloadBlob(content, zipName);

  return true;
}
