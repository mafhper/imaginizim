import { scanMetadata, stripPrivacyMetadata, type MetadataFindings } from './metadata';

export interface FinalizedArtifact {
  blob: Blob;
  exifKeptForOrientation: boolean;
  artifactFindings: MetadataFindings | null;
}

/** What the original carries. `null` when the format is not PNG/JPEG. */
export async function readFindings(blob: Blob): Promise<MetadataFindings | null> {
  try {
    const scan = scanMetadata(new Uint8Array(await blob.arrayBuffer()));
    return scan.format === 'unknown' ? null : scan.findings;
  } catch {
    return null;
  }
}

/**
 * Applies the metadata policy to whichever artifact was chosen: privacy out
 * (EXIF/XMP/text/comments), ICC and a real EXIF orientation in.
 *
 * It runs on every raster artifact, so the guarantee does not depend on which
 * path produced it — the re-encode path is already clean, and the
 * retained-original path is the one that would otherwise keep everything.
 */
export async function finalizeArtifact(blob: Blob): Promise<FinalizedArtifact> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const scan = scanMetadata(bytes);
    if (scan.format === 'unknown') {
      return { blob, exifKeptForOrientation: false, artifactFindings: null };
    }

    const strip = stripPrivacyMetadata(bytes);
    if (strip.removed === 0) {
      return {
        blob,
        exifKeptForOrientation: strip.exifKeptForOrientation,
        artifactFindings: scan.findings
      };
    }

    return {
      blob: new Blob([strip.bytes.slice()], { type: blob.type }),
      exifKeptForOrientation: strip.exifKeptForOrientation,
      artifactFindings: scanMetadata(strip.bytes).findings
    };
  } catch {
    return { blob, exifKeptForOrientation: false, artifactFindings: null };
  }
}
