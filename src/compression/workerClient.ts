import type { WorkerCompressionRequest, WorkerCompressionResponse } from '../types';

export interface WorkerClient {
  process: (payload: WorkerCompressionRequest) => void;
  onMessage: (handler: (response: WorkerCompressionResponse) => void) => void;
  onError: (handler: (message: string) => void) => void;
  terminate: () => void;
}

export function createWorkerClient(): WorkerClient {
  const worker = new Worker(new URL('../worker/index.ts', import.meta.url), {
    type: 'module'
  });

  let messageHandler: ((response: WorkerCompressionResponse) => void) | null = null;
  let errorHandler: ((message: string) => void) | null = null;

  worker.onmessage = (event: MessageEvent<WorkerCompressionResponse>) => {
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
    process(payload: WorkerCompressionRequest) {
      worker.postMessage(payload);
    },
    onMessage(handler: (response: WorkerCompressionResponse) => void) {
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
