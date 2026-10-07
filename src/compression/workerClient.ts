import type { WorkerJobRequest, WorkerJobResponse } from '../types';

export interface WorkerClient {
  processJob: (payload: WorkerJobRequest) => void;
  onMessage: (handler: (response: WorkerJobResponse) => void) => void;
  onError: (handler: (message: string) => void) => void;
  terminate: () => void;
}

export function createWorkerClient(): WorkerClient {
  const worker = new Worker(new URL('../worker/index.ts', import.meta.url), {
    type: 'module'
  });

  let messageHandler: ((response: WorkerJobResponse) => void) | null = null;
  let errorHandler: ((message: string) => void) | null = null;

  worker.onmessage = (event: MessageEvent<WorkerJobResponse>) => {
    if (!messageHandler) return;
    messageHandler(event.data);
  };

  worker.onerror = (event) => {
    console.error('Worker runtime error:', event.message);
    errorHandler?.(event.message || 'Worker runtime error');
  };

  worker.onmessageerror = () => {
    console.error('Worker message error.');
    errorHandler?.('Worker message error');
  };

  return {
    processJob(payload: WorkerJobRequest) {
      worker.postMessage(payload);
    },
    onMessage(handler: (response: WorkerJobResponse) => void) {
      messageHandler = handler;
    },
    onError(handler: (message: string) => void) {
      errorHandler = handler;
    },
    terminate() {
      worker.terminate();
      messageHandler = null;
      errorHandler = null;
    }
  };
}
