import { resolveCollision, type CollisionAction } from './collision';
import { extensionForMimeType, shortFormatName } from './format';
import { resolveNaming, type NamingContext } from './naming';
import { DEFAULT_NAMING, type Artifact, type OutputSpec } from './types';

/**
 * A job is a source and the outputs it should produce. Planning is pure: it
 * resolves the **names** and the **collisions** without encoding anything, which
 * is the dry run the composer shows before the user commits.
 */

export type JobStatus = 'queued' | 'processing' | 'done' | 'partial' | 'error';

export interface JobSourceDescriptor {
  name: string;
  width?: number;
  height?: number;
}

export interface PlannedArtifact {
  output: OutputSpec;
  name: string;
  collision: CollisionAction;
}

export function jobStatusFromArtifacts(artifacts: Pick<Artifact, 'status'>[]): JobStatus {
  if (artifacts.length === 0) return 'queued';
  if (
    artifacts.some((artifact) => artifact.status === 'pending' || artifact.status === 'processing')
  ) {
    return 'processing';
  }

  const done = artifacts.filter((artifact) => artifact.status === 'done').length;
  if (done === artifacts.length) return 'done';
  if (done === 0) return 'error';
  // Some succeeded and some did not: multi-output must be able to say "partial".
  return 'partial';
}

function splitName(name: string): { basename: string; extension: string } {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return { basename: name, extension: '' };
  return { basename: name.slice(0, dot), extension: name.slice(dot + 1) };
}

export function planJob(source: JobSourceDescriptor, outputs: OutputSpec[]): PlannedArtifact[] {
  const { basename, extension: sourceExtension } = splitName(source.name);
  const taken = new Set<string>();

  return outputs.map((output) => {
    const isSourceFormat = output.format === 'auto' || output.format === 'original';
    const extension = isSourceFormat
      ? sourceExtension
      : (extensionForMimeType(output.format) ?? sourceExtension);

    const context: NamingContext = {
      basename,
      extension,
      format: shortFormatName(output.format),
      width: source.width,
      height: source.height,
      scale: output.scale,
      quality: output.quality
    };

    const pattern = output.naming?.pattern ?? DEFAULT_NAMING.pattern;
    const policy = output.destination?.collisionPolicy ?? 'suffix';
    const resolution = resolveCollision(resolveNaming(pattern, context), taken, policy);
    taken.add(resolution.name);

    return { output, name: resolution.name, collision: resolution.action };
  });
}
