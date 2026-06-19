import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAsyncRunGuard } from './asyncRunGuard';

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

test('skips a duplicate key while the first task is still running', async () => {
  const guard = createAsyncRunGuard();
  const deferred = createDeferred();
  let runCount = 0;

  const first = guard.start('group4_9', async () => {
    runCount++;
    await deferred.promise;
  });
  const duplicate = guard.start('group4_9', async () => {
    runCount++;
  });

  assert.equal(first.started, true);
  assert.equal(duplicate.started, false);
  assert.equal(runCount, 1);
  assert.equal(guard.isRunning('group4_9'), true);

  deferred.resolve();
  await first.promise;

  assert.equal(guard.isRunning('group4_9'), false);
});

test('allows the same key to run again after completion', async () => {
  const guard = createAsyncRunGuard();

  const first = guard.start('group4_9', async () => {});
  assert.equal(first.started, true);
  await first.promise;

  const second = guard.start('group4_9', async () => {});
  assert.equal(second.started, true);
  await second.promise;
});

test('releases the key when a task fails', async () => {
  const guard = createAsyncRunGuard();

  const failed = guard.start('group4_9', async () => {
    throw new Error('boom');
  });

  assert.equal(failed.started, true);
  await assert.rejects(failed.promise, /boom/);
  assert.equal(guard.isRunning('group4_9'), false);

  const retry = guard.start('group4_9', async () => {});
  assert.equal(retry.started, true);
  await retry.promise;
});
