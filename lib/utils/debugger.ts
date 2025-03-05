/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 서버 디버깅을 위한 유틸리티 함수
 */

// API 요청 디버깅 로그
export function logApiRequest(req: Request, endpoint: string) {
  const { method, url } = req;
  const searchParams = new URL(url).searchParams;
  
  console.log(`[서버] ${method} 요청: ${endpoint}`);
  console.log('[서버] 쿼리 파라미터:', Object.fromEntries(searchParams.entries()));
  
  try {
    // Request 복제 (body를 두 번 읽을 수 없기 때문)
    const clonedReq = req.clone();
    clonedReq.json()
      .then(body => console.log('[서버] 요청 바디:', body))
      .catch(() => console.log('[서버] 요청 바디: 없음'));
  } catch (error) {
    console.log('[서버] 요청 바디를 파싱할 수 없음');
  }
}

// API 응답 디버깅 로그
export function logApiResponse(data: any, endpoint: string) {
  console.log(`[서버] 응답: ${endpoint}`);
  console.log('[서버] 응답 데이터:', data);
  return data; // 데이터를 그대로 반환
}

// 에러 디버깅 로그
export function logError(error: any, context: string) {
  console.error(`[서버 에러: ${context}]`, error);
  console.error('스택 트레이스:', error.stack);
  
  // 디버깅을 위한 에러 객체 생성
  return {
    message: error.message || '알 수 없는 에러',
    status: error.status || 500,
    code: error.code || 'UNKNOWN_ERROR',
    context,
    timestamp: new Date().toISOString()
  };
}

// 체인으로 사용 가능한 디버그 래퍼
export function debug<T>(data: T, label: string): T {
  console.log(`[디버그: ${label}]`, data);
  return data;
}