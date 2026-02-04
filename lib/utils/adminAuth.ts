/**
 * 관리자 인증 유틸리티
 */
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

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
  
  // 만료 확인
  if (Date.now() > parseInt(expiry)) {
    return false;
  }
  
  // 해시 검증
  const expectedHash = crypto
    .createHmac('sha256', ADMIN_PASSWORD)
    .update(token)
    .digest('hex');
  
  return providedHash === expectedHash;
}

/**
 * 관리자 토큰 생성
 */
export function createAdminToken(): string {
  if (!ADMIN_PASSWORD) {
    throw new Error('ADMIN_PASSWORD가 설정되지 않았습니다.');
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24시간 유효
  
  const tokenHash = crypto
    .createHmac('sha256', ADMIN_PASSWORD)
    .update(token)
    .digest('hex');
  
  return `${token}.${expiry}.${tokenHash}`;
}
