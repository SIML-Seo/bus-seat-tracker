import { NextResponse } from 'next/server';
import { logger } from '@/lib/logging';

/**
 * API 에러 응답을 생성합니다.
 * 프로덕션 환경에서는 일반화된 에러 메시지만 반환하고,
 * 상세 에러는 서버 로그에만 기록합니다.
 */
export function createErrorResponse(
  error: unknown,
  userMessage: string = '요청 처리 중 오류가 발생했습니다.',
  statusCode: number = 500
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 상세 에러는 항상 서버 로그에 기록
  logger.error(`API Error: ${userMessage}`, error);
  
  // 프로덕션에서는 일반화된 메시지만 반환
  if (isProduction) {
    return NextResponse.json(
      { error: userMessage },
      { status: statusCode }
    );
  }
  
  // 개발 환경에서는 상세 정보 포함
  const errorDetails = error instanceof Error 
    ? { message: error.message, stack: error.stack }
    : { details: String(error) };
    
  return NextResponse.json(
    { error: userMessage, ...errorDetails },
    { status: statusCode }
  );
}

/**
 * 입력 검증 에러 응답을 생성합니다.
 */
export function createValidationErrorResponse(
  message: string,
  field?: string
): NextResponse {
  return NextResponse.json(
    { 
      error: message,
      ...(field ? { field } : {})
    },
    { status: 400 }
  );
}

/**
 * 인증 에러 응답을 생성합니다.
 */
export function createAuthErrorResponse(
  message: string = '인증이 필요합니다.'
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * 권한 에러 응답을 생성합니다.
 */
export function createForbiddenResponse(
  message: string = '접근 권한이 없습니다.'
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Not Found 응답을 생성합니다.
 */
export function createNotFoundResponse(
  message: string = '요청한 리소스를 찾을 수 없습니다.'
): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 404 }
  );
}
