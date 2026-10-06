import type { Artifact, DeliveryMode, DeliveryPlan } from './types';

/**
 * Delivery is a strategy, not a property of compression.
 *
 * One artifact downloads directly; several are offered as a directory (individual
 * files) with ZIP as an **explicit** choice. ZIP is never mandatory — that is the
 * rule the old `download all → ZIP` conflated.
 */
export function planDelivery(
  artifacts: Pick<Artifact, 'id'>[],
  requested?: DeliveryMode
): DeliveryPlan {
  const artifactIds = artifacts.map((artifact) => artifact.id);
  if (artifactIds.length <= 1) return { mode: 'single', artifactIds };
  return { mode: requested === 'zip' ? 'zip' : 'directory', artifactIds };
}
