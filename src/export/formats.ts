import type { ProcessedFileRecord } from '../types';

const EXTENSION_BY_MIME = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/svg+xml', 'svg']
]);

const IMAGE_EXTENSION_PATTERN = /\.(?:avif|jpe?g|png|svg|webp)$/i;

export function extensionForMimeType(mimeType: string): string | null {
  return EXTENSION_BY_MIME.get(mimeType.toLowerCase()) ?? null;
}

export function exportFileName(
  originalName: string,
  mimeType: string,
  prefix = 'optimized-'
): string {
  const extension = extensionForMimeType(mimeType);
  const baseName = originalName.replace(IMAGE_EXTENSION_PATTERN, '') || 'image';

  if (!extension) {
    return `${prefix}${originalName}`;
  }

  return `${prefix}${baseName}.${extension}`;
}

export function exportFileNameForRecord(record: ProcessedFileRecord): string {
  return exportFileName(record.file.name, record.blob?.type || record.chosenFormat);
}

export async function detectImageFormat(blob: Blob): Promise<string | null> {
  const bytes = new Uint8Array(await blob.slice(0, 32).arrayBuffer());

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    return 'image/webp';
  }

  if (bytes.length >= 12 && ascii(bytes, 4, 4) === 'ftyp') {
    const brands = ascii(bytes, 8, Math.min(bytes.length - 8, 24));
    if (brands.includes('avif') || brands.includes('avis')) {
      return 'image/avif';
    }
  }

  if (blob.type === 'image/svg+xml') {
    return 'image/svg+xml';
  }

  return null;
}

export async function blobMatchesFormat(blob: Blob, expectedFormat: string): Promise<boolean> {
  const normalizedExpected = normalizeMimeType(expectedFormat);
  const normalizedBlobType = blob.type ? normalizeMimeType(blob.type) : '';
  const detectedFormat = await detectImageFormat(blob);

  return (
    (!normalizedBlobType || normalizedBlobType === normalizedExpected) &&
    detectedFormat === normalizedExpected
  );
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.toLowerCase() === 'image/jpg' ? 'image/jpeg' : mimeType.toLowerCase();
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}
