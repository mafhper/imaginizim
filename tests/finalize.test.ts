import { describe, it, expect } from 'vitest';
import { finalizeArtifact, readFindings } from '../src/worker/metadata/finalize';

/**
 * `finalizeArtifact` is the seam where the metadata policy is applied to the
 * artifact. It used to live inside the worker entry, untestable; here it is
 * exercised against real PNG bytes (the Blob API round-trips them).
 */

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

function u16le(value: number): number[] {
  return [value & 255, (value >> 8) & 255];
}

function u32le(value: number): number[] {
  return [value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255];
}

function pngChunk(type: string, data: number[]): number[] {
  const length = data.length;
  return [
    (length >>> 24) & 255,
    (length >>> 16) & 255,
    (length >>> 8) & 255,
    length & 255,
    ...ascii(type),
    ...data,
    0,
    0,
    0,
    0
  ];
}

function png(...chunks: number[][]): Uint8Array {
  return new Uint8Array([...PNG_SIG, ...chunks.flat()]);
}

function tiff(orientation: number): number[] {
  return [
    ...ascii('II'),
    0x2a,
    0x00,
    ...u32le(8),
    ...u16le(1),
    0x12,
    0x01,
    3,
    0,
    ...u32le(1),
    ...u16le(orientation),
    0,
    0,
    ...u32le(0)
  ];
}

function blobOf(bytes: Uint8Array, type = 'image/png'): Blob {
  return new Blob([bytes.slice()], { type });
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer());
}

const IHDR = pngChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
const IDAT = pngChunk('IDAT', [1, 2, 3]);
const IEND = pngChunk('IEND', []);

describe('finalizeArtifact', () => {
  it('strips privacy metadata from the artifact and keeps ICC', async () => {
    const source = png(
      IHDR,
      pngChunk('tEXt', [...ascii('Comment'), 0, ...ascii('hello')]),
      pngChunk('iCCP', [...ascii('icc'), 0, 0, 1, 2, 3]),
      IDAT,
      IEND
    );

    const result = await finalizeArtifact(blobOf(source));

    expect(result.artifactFindings?.text).toBe(false);
    expect(result.artifactFindings?.icc).toBe(true);
    expect(result.exifKeptForOrientation).toBe(false);
    expect((await bytesOf(result.blob)).length).toBeLessThan(source.length);
  });

  it('keeps EXIF when it carries a real orientation, and reports it', async () => {
    const source = png(IHDR, pngChunk('eXIf', tiff(6)), IDAT, IEND);

    const result = await finalizeArtifact(blobOf(source));

    expect(result.exifKeptForOrientation).toBe(true);
    expect(result.artifactFindings?.exif).toBe(true);
    expect(result.artifactFindings?.orientation).toBe(6);
  });

  it('returns unknown bytes untouched', async () => {
    const source = new Uint8Array([9, 9, 9, 9]);
    const input = blobOf(source);

    const result = await finalizeArtifact(input);

    expect(result.blob).toBe(input);
    expect(result.artifactFindings).toBeNull();
  });
});

describe('readFindings', () => {
  it('reads what the original carries', async () => {
    const source = png(
      IHDR,
      pngChunk('tEXt', [...ascii('Comment'), 0, ...ascii('hello')]),
      IDAT,
      IEND
    );

    const findings = await readFindings(blobOf(source));

    expect(findings?.text).toBe(true);
  });

  it('returns null for a format it cannot read', async () => {
    expect(await readFindings(blobOf(new Uint8Array([1, 2, 3, 4])))).toBeNull();
  });
});
