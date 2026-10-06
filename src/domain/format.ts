/**
 * The format vocabulary: mime type → file extension.
 *
 * It lives in the domain because it is pure vocabulary, not UI. `src/export`
 * re-exports it so the existing callers keep working — one owner, no copy.
 */

const EXTENSION_BY_MIME = new Map<string, string>([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['image/svg+xml', 'svg']
]);

export function extensionForMimeType(mimeType: string): string | null {
  return EXTENSION_BY_MIME.get(mimeType.toLowerCase()) ?? null;
}

/** A short, filename-friendly name for a format: `image/webp` → `webp`. */
export function shortFormatName(format: string): string {
  if (format === 'auto' || format === 'original') return format;
  return format.replace('image/', '').replace('jpeg', 'jpg');
}
