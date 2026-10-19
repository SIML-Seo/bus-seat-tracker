/**
 * 관리자 인증 유틸리티
 */
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

/**
 * 토큰 서명 생성
 * 만료 시각까지 서명에 포함해 클라이언트가 만료 시각을 바꿀 수 없도록 함
 */
function signToken(token: string, expiry: string): string {
  return crypto
    .createHmac('sha256', ADMIN_PASSWORD)
    .update(`${token}.${expiry}`)
    .digest('hex');
}

/**
 * 토큰 검증 함수
 */
export function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  if (!ADMIN_PASSWORD) {
    return false;
  }
  
  const tokenParts = authHeader.substring(7).split('.');
  if (tokenParts.length !== 3) {
    return false;
  }
  
  const [token, expiry, providedHash] = tokenParts;
  
  // 만료 확인 (숫자가 아니면 parseInt가 NaN이 되어 만료 검사를 통과하므로 거부)
  if (!/^\d+$/.test(expiry) || Date.now() > Number(expiry)) {
    return false;
  }

  // 해시 검증 (타이밍 공격 방지를 위해 고정 시간 비교)
  const expectedHash = Buffer.from(signToken(token, expiry));
  const providedHashBuffer = Buffer.from(providedHash);

  return providedHashBuffer.length === expectedHash.length &&
    crypto.timingSafeEqual(providedHashBuffer, expectedHash);
}

/**
 * 관리자 토큰 생성
 */
export function createAdminToken(): string {
  if (!ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD가 설정되지 않았습니다.');
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = String(Date.now() + 24 * 60 * 60 * 1000); // 24시간 유효

  return `${token}.${expiry}.${signToken(token, expiry)}`;
}
