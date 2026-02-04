/**
 * 관리자 저장소 관리 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyAdminToken } from '@/lib/utils/adminAuth';

// 테이블별 평균 레코드 크기 (대략적인 추정치, bytes)
const ESTIMATED_ROW_SIZES = {
  BusLocation: 200,    // id, routeId, busId, stopId, stopName, remainingSeats, updatedAt
  BusStopSeats: 150,   // id, routeId, stopId, stopName, averageSeats, dayOfWeek, hourOfDay, samplesCount, updatedAt
  BusRoute: 300,       // id, routeName, type, typeName, startStop, endStop, turnStation, company
  BusStop: 200,        // id, routeId, stationId, stationName, stationSeq, x, y
  Contact: 500,        // id, name, email, message, createdAt
};

// Supabase Free 한도 (MB)
const SUPABASE_FREE_LIMIT_MB = 500;

export async function GET(request: NextRequest) {
  // 인증 확인
  if (!verifyAdminToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  
  try {
    // 테이블별 레코드 수
    const [
      busLocationCount,
      busStopSeatsCount,
      busRouteCount,
      busStopCount,
      contactCount
    ] = await Promise.all([
      prisma.busLocation.count(),
      prisma.busStopSeats.count(),
      prisma.busRoute.count(),
      prisma.busStop.count(),
      prisma.contact.count()
    ]);
    
    // 추정 용량 계산 (MB)
    const estimatedSizes = {
      BusLocation: (busLocationCount * ESTIMATED_ROW_SIZES.BusLocation) / (1024 * 1024),
      BusStopSeats: (busStopSeatsCount * ESTIMATED_ROW_SIZES.BusStopSeats) / (1024 * 1024),
      BusRoute: (busRouteCount * ESTIMATED_ROW_SIZES.BusRoute) / (1024 * 1024),
      BusStop: (busStopCount * ESTIMATED_ROW_SIZES.BusStop) / (1024 * 1024),
      Contact: (contactCount * ESTIMATED_ROW_SIZES.Contact) / (1024 * 1024)
    };
    
    const totalEstimatedMB = Object.values(estimatedSizes).reduce((a, b) => a + b, 0);
    const usagePercent = (totalEstimatedMB / SUPABASE_FREE_LIMIT_MB) * 100;
    
    // 6시간 이상 된 BusLocation 데이터 수
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
    
    const oldBusLocationCount = await prisma.busLocation.count({
      where: {
        updatedAt: { lt: sixHoursAgo }
      }
    });
    
    // 12시간 이상 된 BusLocation 데이터 수
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    
    const veryOldBusLocationCount = await prisma.busLocation.count({
      where: {
        updatedAt: { lt: twelveHoursAgo }
      }
    });
    
    return NextResponse.json({
      tables: {
        BusLocation: {
          count: busLocationCount,
          estimatedMB: Math.round(estimatedSizes.BusLocation * 100) / 100
        },
        BusStopSeats: {
          count: busStopSeatsCount,
          estimatedMB: Math.round(estimatedSizes.BusStopSeats * 100) / 100
        },
        BusRoute: {
          count: busRouteCount,
          estimatedMB: Math.round(estimatedSizes.BusRoute * 100) / 100
        },
        BusStop: {
          count: busStopCount,
          estimatedMB: Math.round(estimatedSizes.BusStop * 100) / 100
        },
        Contact: {
          count: contactCount,
          estimatedMB: Math.round(estimatedSizes.Contact * 100) / 100
        }
      },
      total: {
        estimatedMB: Math.round(totalEstimatedMB * 100) / 100,
        limitMB: SUPABASE_FREE_LIMIT_MB,
        usagePercent: Math.round(usagePercent * 10) / 10
      },
      cleanup: {
        oldBusLocationCount,     // 6시간 이상
        veryOldBusLocationCount, // 12시간 이상
        potentialSavingsMB: Math.round(
          (oldBusLocationCount * ESTIMATED_ROW_SIZES.BusLocation) / (1024 * 1024) * 100
        ) / 100
      }
    });
    
  } catch (error) {
    console.error('저장소 조회 오류:', error);
    return NextResponse.json(
      { error: '저장소 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
