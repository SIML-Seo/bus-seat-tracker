export interface AsyncRunResult {
  started: boolean;
  promise: Promise<void>;
}

export interface AsyncRunGuard {
  isRunning: (key: string) => boolean;
  start: (key: string, task: () => Promise<void>) => AsyncRunResult;
}

export function createAsyncRunGuard(): AsyncRunGuard {
  const runningKeys = new Set<string>();
  const skippedPromise = Promise.resolve();

  return {
    isRunning(key: string): boolean {
      return runningKeys.has(key);
    },

    start(key: string, task: () => Promise<void>): AsyncRunResult {
      if (runningKeys.has(key)) {
        return {
          started: false,
          promise: skippedPromise,
        };
      }

      runningKeys.add(key);

      const promise = (async () => {
        await task();
      })().finally(() => {
        runningKeys.delete(key);
      });

      return {
        started: true,
        promise,
      };
    },
  };
}
