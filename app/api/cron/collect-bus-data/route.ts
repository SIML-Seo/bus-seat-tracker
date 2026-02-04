/**
 * Vercel Cron 작업을 위한 API 라우트
 * 버스 위치 및 좌석 정보 수집을 위한 단일 실행 엔드포인트
 */
import { NextResponse } from 'next/server';
import { collectBusLocationsOnce, cleanupOldData } from '@/lib/api/busDataService';
import { logger } from '@/lib/logging';

// Vercel Cron에서 CRON 작업 수행 시 인증 처리
// 기본값은 비활성화
const CRON_SECRET = process.env.CRON_SECRET || '';

/**
 * 데이터 수집 API 핸들러
 * GET 요청으로 호출되며, 필요시 인증 처리
 */
export async function GET(request: Request) {
  try {
    // 프로덕션에서는 CRON_SECRET 필수
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && !CRON_SECRET) {
      logger.error('CRON_SECRET이 설정되지 않았습니다.');
      return new NextResponse(
        JSON.stringify({ error: '서버 설정 오류' }),
        { status: 500 }
      );
    }
    
    // 인증 검증: Authorization 헤더 또는 Vercel Cron Secret 헤더
    const authHeader = request.headers.get('authorization');
    const vercelCronSecret = request.headers.get('x-vercel-cron-secret');
    
    const isValidAuth = 
      (authHeader && authHeader === `Bearer ${CRON_SECRET}`) ||
      (vercelCronSecret && vercelCronSecret === CRON_SECRET);
    
    // 프로덕션에서는 항상 인증 필요
    if (isProduction && !isValidAuth) {
      logger.warn('데이터 수집 API 인증 실패');
      return new NextResponse(
        JSON.stringify({ error: '인증 실패' }),
        { status: 401 }
      );
    }
    
    // 개발 환경에서도 CRON_SECRET이 설정된 경우 인증 검증
    if (!isProduction && CRON_SECRET && !isValidAuth) {
      logger.warn('데이터 수집 API 인증 실패 (개발 환경)');
      return new NextResponse(
        JSON.stringify({ error: '인증 실패' }),
        { status: 401 }
      );
    }
    
    logger.info('Cron 작업: 데이터 수집 시작');
    
    // 데이터 수집 실행
    const collectResult = await collectBusLocationsOnce();
    
    // 30% 확률로 오래된 데이터 정리 수행
    // 모든 요청마다 정리하지 않고 확률적으로 수행하여 부하 분산
    if (Math.random() < 0.3) {
      logger.info('오래된 데이터 정리 시작');
      const cleanupResult = await cleanupOldData(6); // 6시간 보관
      
      return NextResponse.json({
        message: '데이터 수집 및 정리 완료',
        collect: collectResult,
        cleanup: cleanupResult
      });
    }
    
    return NextResponse.json({
      message: '데이터 수집 완료',
      collect: collectResult
    });
    
  } catch (error) {
    logger.error('데이터 수집 API 오류:', error);
    
    // 프로덕션에서는 상세 에러 정보 숨김
    const isProduction = process.env.NODE_ENV === 'production';
    return new NextResponse(
      JSON.stringify({ 
        error: '데이터 수집 중 오류 발생', 
        ...(isProduction ? {} : { details: String(error) })
      }),
      { status: 500 }
    );
  }
}
