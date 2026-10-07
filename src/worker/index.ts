import { realCodecs } from './job/bindCodecs';
import { runJob } from './job/runJob';
import type { WorkerJobRequest, WorkerJobResponse } from './types';

/**
 * The worker speaks one protocol: `WorkerJob v2`. The old single-output path was
 * contracted away once the app migrated — the engine was already shared, so
 * there was nothing left for it to do.
 */
self.onmessage = async (event: MessageEvent<WorkerJobRequest>) => {
  const payload = event.data;

  try {
    const { jobId, file, type, outputs, profileHint } = payload;

    const { source, artifacts } = await runJob(
      { file, type, outputs, profileHint },
      realCodecs,
      (progressEvent) => {
        self.postMessage({
          version: 2,
          jobId,
          kind: 'progress',
          progress: progressEvent.progress,
          stage: progressEvent.stage,
          artifactId: progressEvent.artifactId
        } satisfies WorkerJobResponse);
      }
    );

    self.postMessage({
      version: 2,
      jobId,
      kind: 'result',
      source,
      artifacts
    } satisfies WorkerJobResponse);
  } catch (error) {
    self.postMessage({
      version: 2,
      jobId: payload.jobId,
      kind: 'result',
      error: error instanceof Error ? error.message : 'Unexpected worker error.'
    } satisfies WorkerJobResponse);
  }
};
