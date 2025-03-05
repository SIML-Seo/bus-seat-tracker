/**
 * Vercel Cron 작업을 위한 API 라우트
 * 버스 위치 및 좌석 정보 수집을 위한 단일 실행 엔드포인트
 */
import { NextResponse } from 'next/server';
import { collectDataOnce, cleanupOldData } from '@/lib/api/cronCollector';
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
    // CRON_SECRET이 설정된 경우에만 인증 처리
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      
      if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
        logger.warn('데이터 수집 API 인증 실패');
        return new NextResponse(
          JSON.stringify({ error: '인증 실패' }),
          { status: 401 }
        );
      }
    }
    
    logger.info('Cron 작업: 데이터 수집 시작');
    
    // 데이터 수집 실행
    const collectResult = await collectDataOnce();
    
    // 30% 확률로 오래된 데이터 정리 수행
    // 모든 요청마다 정리하지 않고 확률적으로 수행하여 부하 분산
    if (Math.random() < 0.3) {
      logger.info('오래된 데이터 정리 시작');
      const cleanupResult = await cleanupOldData();
      
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
    
    return new NextResponse(
      JSON.stringify({ error: '데이터 수집 중 오류 발생', details: String(error) }),
      { status: 500 }
    );
  }
} 