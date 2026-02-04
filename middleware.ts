import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 미들웨어
 * 프로덕션 환경에서 디버그 API 접근을 차단합니다.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProduction = process.env.NODE_ENV === 'production';

  // 프로덕션에서 디버그 경로 차단
  if (isProduction) {
    const debugPaths = ['/api/debug', '/api/debug-api', '/debug'];
    
    const isDebugPath = debugPaths.some(path => 
      pathname === path || pathname.startsWith(`${path}/`)
    );

    if (isDebugPath) {
      return new NextResponse(null, { status: 404 });
    }
  }

  return NextResponse.next();
}

// 미들웨어가 적용될 경로 설정
export const config = {
  matcher: [
    '/api/debug/:path*',
    '/api/debug-api/:path*',
    '/debug/:path*',
  ],
};
