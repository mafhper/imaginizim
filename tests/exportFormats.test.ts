import { describe, expect, it } from 'vitest';
import { blobMatchesFormat, detectImageFormat, exportFileName } from '../src/export/formats';

describe('export format helpers', () => {
  it('replaces original extension with the selected webp extension', () => {
    expect(exportFileName('foto.png', 'image/webp')).toBe('optimized-foto.webp');
  });

  it('replaces jpeg extension with png extension', () => {
    expect(exportFileName('foto.jpeg', 'image/png')).toBe('optimized-foto.png');
  });

  it('adds jpg extension to names without an image extension', () => {
    expect(exportFileName('nome', 'image/jpeg')).toBe('optimized-nome.jpg');
  });

  it('preserves svg extension when the effective format is svg', () => {
    expect(exportFileName('icone.png', 'image/svg+xml')).toBe('optimized-icone.svg');
  });
});

describe('image format detection', () => {
  it('detects png bytes', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
      type: 'image/png'
    });

    await expect(detectImageFormat(blob)).resolves.toBe('image/png');
    await expect(blobMatchesFormat(blob, 'image/png')).resolves.toBe(true);
  });

  it('detects jpeg bytes', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], {
      type: 'image/jpeg'
    });

    await expect(detectImageFormat(blob)).resolves.toBe('image/jpeg');
    await expect(blobMatchesFormat(blob, 'image/jpeg')).resolves.toBe(true);
  });

  it('detects webp bytes', async () => {
    const blob = new Blob([new Uint8Array(riffWebpBytes())], {
      type: 'image/webp'
    });

    await expect(detectImageFormat(blob)).resolves.toBe('image/webp');
    await expect(blobMatchesFormat(blob, 'image/webp')).resolves.toBe(true);
  });

  it('detects avif bytes', async () => {
    const blob = new Blob([new Uint8Array(avifBytes())], {
      type: 'image/avif'
    });

    await expect(detectImageFormat(blob)).resolves.toBe('image/avif');
    await expect(blobMatchesFormat(blob, 'image/avif')).resolves.toBe(true);
  });

  it('rejects a blob whose declared type does not match its encoded bytes', async () => {
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
      type: 'image/webp'
    });

    await expect(blobMatchesFormat(blob, 'image/webp')).resolves.toBe(false);
    await expect(blobMatchesFormat(blob, 'image/png')).resolves.toBe(false);
  });
});

function riffWebpBytes(): number[] {
  return [...ascii('RIFF'), 0x04, 0x00, 0x00, 0x00, ...ascii('WEBP'), ...ascii('VP8 ')];
}

function avifBytes(): number[] {
  return [0x00, 0x00, 0x00, 0x18, ...ascii('ftyp'), ...ascii('avif'), 0x00, 0x00, 0x00, 0x00];
}

function ascii(value: string): number[] {
  return Array.from(value, (char) => char.charCodeAt(0));
}
