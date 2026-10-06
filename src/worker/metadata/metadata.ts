/**
 * Image metadata: what an image carries, and what we remove before delivering.
 *
 * This is a byte-layout problem, not a codec problem, so it lives as pure
 * functions over `Uint8Array`. That keeps it testable with hand-built bytes and
 * keeps the worker's codec path unchanged.
 *
 * Two "keep" decisions are deliberate, and they are the difference between
 * privacy and vandalism:
 *
 *   - **ICC is kept.** It is colour management, not personal data. Removing it
 *     would shift colours on any image that is not sRGB.
 *   - **EXIF orientation is kept** (when it is not 1). It decides how the image
 *     displays; dropping it would rotate the picture. The privacy tags it also
 *     carries are reported instead of silently destroyed.
 *
 * Everything else that is personal — EXIF (camera/GPS/timestamps), XMP, text
 * chunks, JPEG comments and IPTC — is removable.
 */

export interface MetadataFindings {
  exif: boolean;
  gps: boolean;
  icc: boolean;
  xmp: boolean;
  text: boolean;
  /** EXIF orientation, or `null` when absent/unknown. */
  orientation: number | null;
}

export type MetadataFormat = 'png' | 'jpeg' | 'unknown';

export interface MetadataScan {
  format: MetadataFormat;
  findings: MetadataFindings;
  /** How many privacy chunks/segments could be removed. */
  removable: number;
}

export interface StripResult {
  bytes: Uint8Array;
  removed: number;
  /** EXIF was kept because removing it would drop a real orientation. */
  exifKeptForOrientation: boolean;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_PRIVACY_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf']);
const XMP_KEYWORD = 'XML:com.adobe.xmp';
const XMP_JPEG_HEADER = 'http://ns.adobe.com/xap/1.0/';
const ICC_JPEG_HEADER = 'ICC_PROFILE';
const MAX_IFD_ENTRIES = 4096;

function emptyFindings(): MetadataFindings {
  return { exif: false, gps: false, icc: false, xmp: false, text: false, orientation: null };
}

function readAscii(bytes: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

function startsWith(bytes: Uint8Array, start: number, end: number, text: string): boolean {
  if (end - start < text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[start + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

/** Minimal EXIF/TIFF reader: orientation (0x0112) and the GPS IFD pointer (0x8825). */
function parseTiff(
  bytes: Uint8Array,
  start: number,
  end: number
): { orientation: number | null; gps: boolean } {
  if (end - start < 8) return { orientation: null, gps: false };

  const little = bytes[start] === 0x49 && bytes[start + 1] === 0x49;
  const big = bytes[start] === 0x4d && bytes[start + 1] === 0x4d;
  if (!little && !big) return { orientation: null, gps: false };

  const u16 = (offset: number) =>
    little ? bytes[offset] | (bytes[offset + 1] << 8) : (bytes[offset] << 8) | bytes[offset + 1];
  const u32 = (offset: number) =>
    little
      ? (bytes[offset] |
          (bytes[offset + 1] << 8) |
          (bytes[offset + 2] << 16) |
          (bytes[offset + 3] << 24)) >>>
        0
      : ((bytes[offset] << 24) |
          (bytes[offset + 1] << 16) |
          (bytes[offset + 2] << 8) |
          bytes[offset + 3]) >>>
        0;

  if (u16(start + 2) !== 42) return { orientation: null, gps: false };

  const ifd = start + u32(start + 4);
  if (ifd < start || ifd + 2 > end) return { orientation: null, gps: false };

  const count = Math.min(u16(ifd), MAX_IFD_ENTRIES);
  let orientation: number | null = null;
  let gps = false;

  for (let i = 0; i < count; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) break;
    const tag = u16(entry);
    if (tag === 0x0112) orientation = u16(entry + 8);
    else if (tag === 0x8825) gps = true;
  }

  return { orientation, gps };
}

interface PngChunk {
  type: string;
  start: number;
  end: number;
  dataStart: number;
  dataEnd: number;
}

function parsePngChunks(bytes: Uint8Array): PngChunk[] | null {
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }

  const chunks: PngChunk[] = [];
  let offset = PNG_SIGNATURE.length;

  while (offset + 12 <= bytes.length) {
    const length =
      ((bytes[offset] << 24) |
        (bytes[offset + 1] << 16) |
        (bytes[offset + 2] << 8) |
        bytes[offset + 3]) >>>
      0;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const end = dataEnd + 4; // CRC
    if (dataEnd > bytes.length || end > bytes.length) break;

    chunks.push({
      type: readAscii(bytes, offset + 4, offset + 8),
      start: offset,
      end,
      dataStart,
      dataEnd
    });
    offset = end;
  }

  return chunks;
}

function pngChunkIsXmp(bytes: Uint8Array, chunk: PngChunk): boolean {
  if (chunk.type !== 'tEXt' && chunk.type !== 'iTXt') return false;
  const limit = Math.min(chunk.dataEnd, chunk.dataStart + XMP_KEYWORD.length);
  return readAscii(bytes, chunk.dataStart, limit) === XMP_KEYWORD;
}

function scanPng(bytes: Uint8Array, chunks: PngChunk[]): MetadataScan {
  const findings = emptyFindings();

  let removable = 0;
  for (const chunk of chunks) {
    if (chunk.type === 'iCCP') {
      findings.icc = true;
    } else if (chunk.type === 'eXIf') {
      findings.exif = true;
      const tiff = parseTiff(bytes, chunk.dataStart, chunk.dataEnd);
      if (tiff.gps) findings.gps = true;
      if (tiff.orientation !== null) findings.orientation = tiff.orientation;
      // Matches the stripper: EXIF kept for its orientation is not removable.
      if (tiff.orientation === null || tiff.orientation === 1) removable += 1;
    } else if (chunk.type === 'tEXt' || chunk.type === 'zTXt' || chunk.type === 'iTXt') {
      findings.text = true;
      if (pngChunkIsXmp(bytes, chunk)) findings.xmp = true;
      removable += 1;
    }
  }

  return { format: 'png', findings, removable };
}

interface JpegSegment {
  marker: number;
  start: number;
  end: number;
  dataStart: number;
  dataEnd: number;
}

function parseJpegSegments(bytes: Uint8Array): { segments: JpegSegment[]; tail: number } | null {
  if (bytes.length < 2 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const segments: JpegSegment[] = [];
  let offset = 2;

  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];

    if (marker === 0xda || marker === 0xd9) {
      return { segments, tail: offset };
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) break;
    const dataStart = offset + 4;
    const end = offset + 2 + length;
    if (end > bytes.length) break;

    segments.push({ marker, start: offset, end, dataStart, dataEnd: end });
    offset = end;
  }

  return { segments, tail: bytes.length };
}

interface JpegClassified {
  segment: JpegSegment;
  exif: boolean;
  xmp: boolean;
  icc: boolean;
  text: boolean;
  orientation: number | null;
  gps: boolean;
}

function classifyJpeg(bytes: Uint8Array, segment: JpegSegment): JpegClassified {
  const result: JpegClassified = {
    segment,
    exif: false,
    xmp: false,
    icc: false,
    text: false,
    orientation: null,
    gps: false
  };

  if (segment.marker === 0xfe) {
    result.text = true;
  } else if (segment.marker === 0xed) {
    result.text = true; // Photoshop / IPTC
  } else if (segment.marker === 0xe1) {
    if (startsWith(bytes, segment.dataStart, segment.dataEnd, 'Exif\0\0')) {
      result.exif = true;
      const tiff = parseTiff(bytes, segment.dataStart + 6, segment.dataEnd);
      result.gps = tiff.gps;
      result.orientation = tiff.orientation;
    } else if (startsWith(bytes, segment.dataStart, segment.dataEnd, XMP_JPEG_HEADER)) {
      result.xmp = true;
    }
  } else if (segment.marker === 0xe2) {
    if (startsWith(bytes, segment.dataStart, segment.dataEnd, ICC_JPEG_HEADER)) {
      result.icc = true;
    }
  }

  return result;
}

function scanJpeg(
  bytes: Uint8Array,
  parsed: { segments: JpegSegment[]; tail: number }
): MetadataScan {
  const findings = emptyFindings();

  let removable = 0;
  for (const segment of parsed.segments) {
    const classified = classifyJpeg(bytes, segment);
    if (classified.icc) findings.icc = true;
    if (classified.exif) {
      findings.exif = true;
      if (classified.gps) findings.gps = true;
      if (classified.orientation !== null) findings.orientation = classified.orientation;
      if (classified.orientation === null || classified.orientation === 1) removable += 1;
    } else if (classified.xmp) {
      findings.xmp = true;
      removable += 1;
    } else if (classified.text) {
      findings.text = true;
      removable += 1;
    }
  }

  return { format: 'jpeg', findings, removable };
}

export function scanMetadata(bytes: Uint8Array): MetadataScan {
  const chunks = parsePngChunks(bytes);
  if (chunks) return scanPng(bytes, chunks);

  const parsed = parseJpegSegments(bytes);
  if (parsed) return scanJpeg(bytes, parsed);

  return { format: 'unknown', findings: emptyFindings(), removable: 0 };
}

export function stripPrivacyMetadata(bytes: Uint8Array): StripResult {
  const chunks = parsePngChunks(bytes);
  if (chunks) {
    const kept: Uint8Array[] = [new Uint8Array(PNG_SIGNATURE)];
    let removed = 0;
    let exifKeptForOrientation = false;

    for (const chunk of chunks) {
      const isPrivacy = PNG_PRIVACY_CHUNKS.has(chunk.type);
      if (!isPrivacy) {
        kept.push(bytes.subarray(chunk.start, chunk.end));
        continue;
      }
      if (chunk.type === 'eXIf') {
        const tiff = parseTiff(bytes, chunk.dataStart, chunk.dataEnd);
        if (tiff.orientation !== null && tiff.orientation !== 1) {
          kept.push(bytes.subarray(chunk.start, chunk.end));
          exifKeptForOrientation = true;
          continue;
        }
      }
      removed += 1;
    }

    return { bytes: concat(kept), removed, exifKeptForOrientation };
  }

  const parsed = parseJpegSegments(bytes);
  if (parsed) {
    const kept: Uint8Array[] = [bytes.subarray(0, 2)]; // SOI
    let removed = 0;
    let exifKeptForOrientation = false;

    for (const segment of parsed.segments) {
      const classified = classifyJpeg(bytes, segment);
      const isPrivacy = classified.exif || classified.xmp || classified.text;
      if (!isPrivacy) {
        kept.push(bytes.subarray(segment.start, segment.end));
        continue;
      }
      if (classified.exif && classified.orientation !== null && classified.orientation !== 1) {
        kept.push(bytes.subarray(segment.start, segment.end));
        exifKeptForOrientation = true;
        continue;
      }
      removed += 1;
    }

    kept.push(bytes.subarray(parsed.tail));
    return { bytes: concat(kept), removed, exifKeptForOrientation };
  }

  return { bytes, removed: 0, exifKeptForOrientation: false };
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}
