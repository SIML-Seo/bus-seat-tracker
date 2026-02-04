/**
 * 관리자 수동 정리 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyAdminToken } from '@/lib/utils/adminAuth';
import { logger } from '@/lib/logging';

export async function POST(request: NextRequest) {
  // 인증 확인
  if (!verifyAdminToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { action = 'cleanup-location', hours = 6 } = body;

    // 전체 초기화 (FK 순서: BusLocation → BusStopSeats → BusStop → BusRoute → Contact)
    if (action === 'reset-all') {
      // 비밀번호 재확인
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!body.password || body.password !== adminPassword) {
        return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 403 });
      }

      logger.info('관리자 전체 데이터 초기화 시작...');

      const counts = {
        busLocation: await prisma.busLocation.count(),
        busStopSeats: await prisma.busStopSeats.count(),
        busStop: await prisma.busStop.count(),
        busRoute: await prisma.busRoute.count(),
        contact: await prisma.contact.count(),
      };

      // FK 순서대로 삭제
      const deleted = {
        busLocation: (await prisma.busLocation.deleteMany({})).count,
        busStopSeats: (await prisma.busStopSeats.deleteMany({})).count,
        busStop: (await prisma.busStop.deleteMany({})).count,
        busRoute: (await prisma.busRoute.deleteMany({})).count,
        contact: (await prisma.contact.deleteMany({})).count,
      };

      logger.info(`전체 초기화 완료: BusLocation ${deleted.busLocation}, BusStopSeats ${deleted.busStopSeats}, BusStop ${deleted.busStop}, BusRoute ${deleted.busRoute}, Contact ${deleted.contact}`);
      await logger.flushLogs();

      return NextResponse.json({
        success: true,
        message: '전체 데이터 초기화 완료',
        deleted,
        beforeCounts: counts
      });
    }

    // BusStopSeats 초기화
    if (action === 'reset-seats') {
      logger.info('관리자 BusStopSeats 초기화 시작...');

      const beforeCount = await prisma.busStopSeats.count();
      const result = await prisma.busStopSeats.deleteMany({});

      logger.info(`BusStopSeats 초기화 완료: ${result.count}개 삭제`);
      await logger.flushLogs();

      return NextResponse.json({
        success: true,
        message: `BusStopSeats 초기화 완료`,
        deleted: result.count,
        remaining: 0,
        beforeCount
      });
    }

    // BusLocation 정리 (기본 동작)
    const retentionHours = Math.min(Math.max(hours, 1), 48);

    logger.info(`관리자 수동 정리 시작: ${retentionHours}시간 이상 된 데이터 삭제`);

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - retentionHours);

    const toDeleteCount = await prisma.busLocation.count({
      where: {
        updatedAt: { lt: cutoffTime }
      }
    });

    if (toDeleteCount === 0) {
      return NextResponse.json({
        success: true,
        message: '삭제할 데이터가 없습니다.',
        deleted: 0
      });
    }

    let totalDeleted = 0;

    while (totalDeleted < toDeleteCount) {
      const result = await prisma.busLocation.deleteMany({
        where: {
          updatedAt: { lt: cutoffTime }
        }
      });

      totalDeleted += result.count;

      if (result.count === 0) break;

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info(`관리자 수동 정리 완료: ${totalDeleted}개 데이터 삭제`);
    await logger.flushLogs();

    const remainingCount = await prisma.busLocation.count();

    return NextResponse.json({
      success: true,
      message: `${retentionHours}시간 이상 된 데이터 정리 완료`,
      deleted: totalDeleted,
      remaining: remainingCount
    });
    
  } catch (error) {
    logger.error('수동 정리 오류:', error);
    return NextResponse.json(
      { error: '정리 작업 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
