import { NextResponse } from 'next/server';
import { logApiRequest, logApiResponse, logError } from '@/lib/utils/debugger';
import prisma from '@/lib/prisma/client';
import { getSupabase } from '@/lib/supabase/client';

// 디버깅 테스트용 API 엔드포인트
export async function GET(request: Request) {
  try {
    // 요청 디버깅
    logApiRequest(request, '/api/debug');
    
    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'all';
    
    // 디버깅 결과 객체
    const debugResults: Record<string, unknown> = {};
    
    // 환경 변수 테스트
    if (testType === 'env' || testType === 'all') {
      debugResults.env = {
        SUPABASE_URL: process.env.SUPABASE_URL ? '설정됨' : '없음',
        SUPABASE_KEY: process.env.SUPABASE_ANON_KEY ? '설정됨' : '없음',
        DATABASE_URL: process.env.DATABASE_URL ? '설정됨' : '없음',
        API_KEY: process.env.PUBLIC_DATA_API_KEY ? '설정됨' : '없음',
      };
    }
    
    // Prisma 테스트
    if (testType === 'prisma' || testType === 'all') {
      try {
        // 간단한 쿼리 실행
        const busRoutesCount = await prisma.busRoute.count();
        debugResults.prisma = {
          connection: '성공',
          busRoutesCount,
        };
      } catch (error) {
        const err = error as Error;
        debugResults.prisma = {
          connection: '실패',
          error: err.message,
        };
      }
    }
    
    // Supabase 테스트
    if (testType === 'supabase' || testType === 'all') {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('bus_route')
          .select('*', { count: 'exact', head: true });
        
        debugResults.supabase = {
          connection: error ? '실패' : '성공',
          count: data ? data.length : 0,
          error: error?.message || null,
        };
      } catch (error) {
        const err = error as Error;
        debugResults.supabase = {
          connection: '실패',
          error: err.message,
        };
      }
    }
    
    // 응답 디버깅 및 반환
    return NextResponse.json(
      logApiResponse(debugResults, '/api/debug')
    );
  } catch (error) {
    // 에러 디버깅
    const err = error as Error;
    const errorDetails = logError(err, '/api/debug');
    return NextResponse.json(errorDetails, { status: 500 });
  }
} 