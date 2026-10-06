import { describe, it, expect } from 'vitest';
import { scanMetadata, stripPrivacyMetadata } from '../src/worker/metadata/metadata';

/**
 * Metadata handling is a byte-layout problem, so the tests build the bytes by
 * hand instead of relying on a fixture whose chunks nobody can see. The
 * assertions are the contract: what is *found*, what is *removed*, and what is
 * *kept on purpose*.
 *
 * The two "keep" decisions are the whole point of the feature:
 *   - ICC is colour management, not personal data → kept.
 *   - EXIF orientation, when not 1, decides how the image displays → kept,
 *     even though it also carries the privacy tags. Reported, not silently lost.
 */

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
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
    0 // CRC intentionally zero: the parser must not depend on it
  ];
}

function png(...chunks: number[][]): Uint8Array {
  return new Uint8Array([...PNG_SIG, ...chunks.flat()]);
}

function u16le(value: number): number[] {
  return [value & 255, (value >> 8) & 255];
}

function u32le(value: number): number[] {
  return [value & 255, (value >> 8) & 255, (value >> 16) & 255, (value >> 24) & 255];
}

/** TIFF (little-endian) with an optional orientation tag and a GPS IFD pointer. */
function tiff({ orientation, hasGps }: { orientation?: number; hasGps?: boolean }): number[] {
  const entries: number[] = [];
  if (orientation !== undefined) {
    entries.push(0x12, 0x01, 3, 0, ...u32le(1), ...u16le(orientation), 0, 0);
  }
  if (hasGps) {
    entries.push(0x25, 0x88, 4, 0, ...u32le(1), ...u32le(0));
  }

  return [
    ...ascii('II'),
    0x2a,
    0x00, // 42, little-endian
    ...u32le(8), // IFD0 at offset 8
    ...u16le(entries.length / 12),
    ...entries,
    ...u32le(0) // no next IFD
  ];
}

function jpegSegment(marker: number, data: number[]): number[] {
  const length = data.length + 2;
  return [0xff, marker, (length >> 8) & 255, length & 255, ...data];
}

function jpeg(...segments: number[][]): Uint8Array {
  return new Uint8Array([0xff, 0xd8, ...segments.flat(), 0xff, 0xda, 0x00, 0x02, 0xff, 0xd9]);
}

const EXIF_APP1 = (orientation?: number, hasGps = false) =>
  jpegSegment(0xe1, [...ascii('Exif'), 0, 0, ...tiff({ orientation, hasGps })]);
const XMP_APP1 = () =>
  jpegSegment(0xe1, [...ascii('http://ns.adobe.com/xap/1.0/'), 0, ...ascii('<x:xmpmeta/>')]);
const ICC_APP2 = () => jpegSegment(0xe2, [...ascii('ICC_PROFILE'), 0, 1, 1, 9, 9, 9]);
const APP0 = () => jpegSegment(0xe0, [...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
const COM = (text: string) => jpegSegment(0xfe, ascii(text));
const APP13 = () => jpegSegment(0xed, [...ascii('Photoshop 3.0'), 0]);

describe('scanMetadata', () => {
  it('reads PNG text, ICC and EXIF/GPS without trusting the CRC', () => {
    const bytes = png(
      pngChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
      pngChunk('tEXt', [...ascii('Comment'), 0, ...ascii('hello')]),
      pngChunk('iCCP', [...ascii('icc'), 0, 0, 1, 2, 3]),
      pngChunk('eXIf', tiff({ hasGps: true })),
      pngChunk('IDAT', [1, 2, 3]),
      pngChunk('IEND', [])
    );

    const scan = scanMetadata(bytes);

    expect(scan.format).toBe('png');
    expect(scan.findings.text).toBe(true);
    expect(scan.findings.icc).toBe(true);
    expect(scan.findings.exif).toBe(true);
    expect(scan.findings.gps).toBe(true);
    expect(scan.removable).toBe(2); // tEXt + eXIf
  });

  it('reads JPEG EXIF orientation, GPS, XMP, ICC and comments', () => {
    const bytes = jpeg(APP0(), EXIF_APP1(6, true), XMP_APP1(), ICC_APP2(), COM('secret'), APP13());

    const scan = scanMetadata(bytes);

    expect(scan.format).toBe('jpeg');
    expect(scan.findings.exif).toBe(true);
    expect(scan.findings.gps).toBe(true);
    expect(scan.findings.xmp).toBe(true);
    expect(scan.findings.icc).toBe(true);
    expect(scan.findings.text).toBe(true);
    expect(scan.findings.orientation).toBe(6);
  });

  it('returns "unknown" for bytes that are neither PNG nor JPEG', () => {
    const scan = scanMetadata(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));

    expect(scan.format).toBe('unknown');
    expect(scan.removable).toBe(0);
    expect(scan.findings.exif).toBe(false);
  });
});

describe('stripPrivacyMetadata', () => {
  it('removes PNG text and EXIF but keeps ICC and the pixel chunks', () => {
    const bytes = png(
      pngChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]),
      pngChunk('tEXt', [...ascii('Comment'), 0, ...ascii('hello')]),
      pngChunk('iCCP', [...ascii('icc'), 0, 0, 1, 2, 3]),
      pngChunk('IDAT', [1, 2, 3]),
      pngChunk('IEND', [])
    );

    const result = stripPrivacyMetadata(bytes);
    const after = scanMetadata(result.bytes);

    expect(result.removed).toBe(1);
    expect(after.findings.text).toBe(false);
    expect(after.findings.icc).toBe(true);
    // The image still decodes: IHDR/IDAT/IEND survive.
    expect(after.format).toBe('png');
  });

  it('keeps JPEG EXIF when it carries an orientation other than 1', () => {
    const bytes = jpeg(APP0(), EXIF_APP1(6, true), XMP_APP1(), ICC_APP2(), COM('secret'));

    const result = stripPrivacyMetadata(bytes);
    const after = scanMetadata(result.bytes);

    expect(result.exifKeptForOrientation).toBe(true);
    expect(after.findings.exif).toBe(true); // orientation preserved
    expect(after.findings.gps).toBe(true); // ...and so is what it carries, reported
    expect(after.findings.xmp).toBe(false);
    expect(after.findings.icc).toBe(true);
    expect(after.findings.text).toBe(false);
    expect(result.removed).toBe(2); // XMP + COM
  });

  it('removes JPEG EXIF when the orientation is 1 (or absent)', () => {
    const bytes = jpeg(APP0(), EXIF_APP1(1, true), ICC_APP2(), COM('secret'));

    const result = stripPrivacyMetadata(bytes);
    const after = scanMetadata(result.bytes);

    expect(result.exifKeptForOrientation).toBe(false);
    expect(after.findings.exif).toBe(false);
    expect(after.findings.gps).toBe(false);
    expect(after.findings.icc).toBe(true);
    expect(result.removed).toBe(2); // EXIF + COM
  });

  it('leaves bytes it cannot parse untouched', () => {
    const bytes = new Uint8Array([9, 9, 9, 9]);

    const result = stripPrivacyMetadata(bytes);

    expect(result.removed).toBe(0);
    expect([...result.bytes]).toEqual([9, 9, 9, 9]);
  });
});
