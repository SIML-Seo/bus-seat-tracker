import assert from 'node:assert/strict';
import { test } from 'node:test';

// adminAuth는 모듈 로드 시점에 ADMIN_PASSWORD를 읽으므로 import 전에 설정한다.
process.env.ADMIN_PASSWORD = 'test-admin-password';

const loadAdminAuth = () => import('./adminAuth');

test('accepts a freshly created token', async () => {
  const { createAdminToken, verifyAdminToken } = await loadAdminAuth();

  assert.equal(verifyAdminToken(`Bearer ${createAdminToken()}`), true);
});

test('rejects a token whose expiry was extended', async () => {
  const { createAdminToken, verifyAdminToken } = await loadAdminAuth();
  const [token, , hash] = createAdminToken().split('.');
  const farFuture = String(Date.now() + 365 * 24 * 60 * 60 * 1000);

  assert.equal(verifyAdminToken(`Bearer ${token}.${farFuture}.${hash}`), false);
});

test('rejects a token with a non-numeric expiry', async () => {
  const { createAdminToken, verifyAdminToken } = await loadAdminAuth();
  const [token, , hash] = createAdminToken().split('.');

  assert.equal(verifyAdminToken(`Bearer ${token}.never.${hash}`), false);
});

test('rejects a token after it expires', async () => {
  const { createAdminToken, verifyAdminToken } = await loadAdminAuth();
  const header = `Bearer ${createAdminToken()}`;
  const originalNow = Date.now;

  try {
    Date.now = () => originalNow() + 25 * 60 * 60 * 1000;
    assert.equal(verifyAdminToken(header), false);
  } finally {
    Date.now = originalNow;
  }
});

test('rejects malformed tokens and tampered hashes', async () => {
  const { createAdminToken, verifyAdminToken } = await loadAdminAuth();
  const [token, expiry] = createAdminToken().split('.');

  assert.equal(verifyAdminToken(null), false);
  assert.equal(verifyAdminToken(`Bearer ${token}.${expiry}`), false);
  assert.equal(verifyAdminToken(`Bearer ${token}.${expiry}.short`), false);
  assert.equal(verifyAdminToken(`Bearer ${token}.${expiry}.${'0'.repeat(64)}`), false);
});
