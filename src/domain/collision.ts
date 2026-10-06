/**
 * Filename collision handling.
 *
 * Pure and policy-driven: the function reports what it decided (`action`) and
 * the name to use, and never touches a filesystem. `suffix` finds the first free
 * `-N` before the extension, so a batch of the same source can land side by side.
 */

import type { CollisionPolicy } from './types';

export type CollisionAction = 'keep' | 'ask' | 'skip' | 'overwrite' | 'suffix';

export interface CollisionResolution {
  name: string;
  action: CollisionAction;
}

function splitExtension(name: string): { stem: string; extension: string } {
  const dot = name.lastIndexOf('.');
  // A leading dot (`.gitignore`) is part of the name, not an extension.
  if (dot <= 0) return { stem: name, extension: '' };
  return { stem: name.slice(0, dot), extension: name.slice(dot) };
}

export function resolveCollision(
  name: string,
  taken: Iterable<string>,
  policy: CollisionPolicy
): CollisionResolution {
  const existing = taken instanceof Set ? taken : new Set(taken);
  if (!existing.has(name)) return { name, action: 'keep' };

  if (policy === 'overwrite') return { name, action: 'overwrite' };
  if (policy === 'skip') return { name, action: 'skip' };
  if (policy === 'ask') return { name, action: 'ask' };

  const { stem, extension } = splitExtension(name);
  let index = 1;
  let candidate = `${stem}-${index}${extension}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${stem}-${index}${extension}`;
  }
  return { name: candidate, action: 'suffix' };
}
