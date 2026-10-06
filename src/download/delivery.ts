import { planDelivery } from '../domain/delivery';
import type { DeliveryMode } from '../domain/types';
import { downloadBlob } from '../utils/downloadBlob';
import { downloadZip } from './download';

/**
 * Executes a `DeliveryPlan`.
 *
 * One artifact downloads directly; several are written individually and a ZIP is
 * offered as a convenience. ZIP is never the only way out — that is the whole
 * point of decoupling delivery from the engine.
 */

export interface DeliveredArtifact {
  id: string;
  name: string;
  blob: Blob;
}

export async function deliverArtifacts(
  artifacts: DeliveredArtifact[],
  requested?: DeliveryMode,
  zipName = 'imaginizim-optimized-images.zip'
): Promise<boolean> {
  if (artifacts.length === 0) return false;

  const plan = planDelivery(artifacts, requested);
  const entries = artifacts.map((artifact) => ({ name: artifact.name, blob: artifact.blob }));

  if (plan.mode === 'single') {
    downloadBlob(artifacts[0].blob, artifacts[0].name);
    return true;
  }

  if (plan.mode === 'zip') {
    await downloadZip(entries, zipName);
    return true;
  }

  artifacts.forEach((artifact) => downloadBlob(artifact.blob, artifact.name));
  await downloadZip(entries, zipName);
  return true;
}
