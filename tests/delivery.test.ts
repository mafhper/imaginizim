import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  downloadBlob: vi.fn(),
  downloadZip: vi.fn()
}));

vi.mock('../src/utils/downloadBlob', () => ({ downloadBlob: mocks.downloadBlob }));
vi.mock('../src/download/download', () => ({ downloadZip: mocks.downloadZip }));

import { deliverArtifacts, type DeliveredArtifact } from '../src/download/delivery';

function artifacts(count: number): DeliveredArtifact[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `a${index}`,
    name: `a${index}.webp`,
    blob: new Blob([new Uint8Array(1)])
  }));
}

describe('deliverArtifacts', () => {
  beforeEach(() => {
    mocks.downloadBlob.mockClear();
    mocks.downloadZip.mockClear();
    mocks.downloadZip.mockResolvedValue(true);
  });

  it('downloads a single artifact directly, without a ZIP', async () => {
    await deliverArtifacts(artifacts(1));

    expect(mocks.downloadBlob).toHaveBeenCalledTimes(1);
    expect(mocks.downloadZip).not.toHaveBeenCalled();
  });

  it('zips only when the ZIP mode is asked for', async () => {
    await deliverArtifacts(artifacts(3), 'zip');

    expect(mocks.downloadZip).toHaveBeenCalledTimes(1);
    expect(mocks.downloadBlob).not.toHaveBeenCalled();
  });

  it('writes several individually and offers a ZIP by default', async () => {
    await deliverArtifacts(artifacts(3));

    expect(mocks.downloadBlob).toHaveBeenCalledTimes(3);
    expect(mocks.downloadZip).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is nothing to deliver', async () => {
    expect(await deliverArtifacts([])).toBe(false);
    expect(mocks.downloadBlob).not.toHaveBeenCalled();
    expect(mocks.downloadZip).not.toHaveBeenCalled();
  });
});
