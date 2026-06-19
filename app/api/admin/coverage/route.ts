/**
 * 관리자 통계 데이터 품질/커버리지 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyAdminToken } from '@/lib/utils/adminAuth';

export async function GET(request: NextRequest) {
  // 인증 확인
  if (!verifyAdminToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  
  try {
    // 전체 노선 수
    const totalRoutes = await prisma.busRoute.count();
    
    // 통계가 있는 노선 수 (BusStopSeats에 데이터가 있는 노선)
    const routesWithStatsResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "busRouteId") as count FROM "BusStopSeats"
    `;
    const routesWithStatsCount = Number(routesWithStatsResult[0].count);
    
    // 노선별 커버리지: 서브쿼리로 분리하여 성능 개선
    const routeCoverage = await prisma.$queryRaw<Array<{
      busRouteId: string;
      routeName: string;
      totalStops: bigint;
      stopsWithStats: bigint;
      coveragePercent: string;
    }>>`
      SELECT
        r.id as "busRouteId",
        r."routeName",
        COALESCE(stop_counts."totalStops", 0) as "totalStops",
        COALESCE(seat_counts."stopsWithStats", 0) as "stopsWithStats",
        CASE
          WHEN COALESCE(stop_counts."totalStops", 0) = 0 THEN 0
          ELSE ROUND(COALESCE(seat_counts."stopsWithStats", 0)::numeric / stop_counts."totalStops"::numeric * 100, 1)
        END as "coveragePercent"
      FROM "BusRoute" r
      LEFT JOIN (
        SELECT "busRouteId", COUNT(DISTINCT "stationId") as "totalStops"
        FROM "BusStop"
        GROUP BY "busRouteId"
      ) stop_counts ON r.id = stop_counts."busRouteId"
      LEFT JOIN (
        SELECT "busRouteId", COUNT(DISTINCT "stopId") as "stopsWithStats"
        FROM "BusStopSeats"
        GROUP BY "busRouteId"
      ) seat_counts ON r.id = seat_counts."busRouteId"
      ORDER BY "coveragePercent" DESC, "totalStops" DESC
      LIMIT 20
    `;

    // 샘플 수가 부족한 노선 목록 (샘플 < 10)
    const lowSampleRoutes = await prisma.$queryRaw<Array<{
      busRouteId: string;
      routeName: string;
      avgSamples: string;
    }>>`
      SELECT
        ss."busRouteId",
        r."routeName",
        AVG(ss."samplesCount")::numeric as "avgSamples"
      FROM "BusStopSeats" ss
      JOIN "BusRoute" r ON ss."busRouteId" = r.id
      GROUP BY ss."busRouteId", r."routeName"
      HAVING AVG(ss."samplesCount") < 10
      ORDER BY AVG(ss."samplesCount") ASC
      LIMIT 10
    `;
    
    // 요일별 데이터 분포
    const dayOfWeekDistribution = await prisma.busStopSeats.groupBy({
      by: ['dayOfWeek'],
      _count: { _all: true },
      _avg: { samplesCount: true }
    });
    
    // 시간대별 데이터 분포
    const hourDistribution = await prisma.busStopSeats.groupBy({
      by: ['hourOfDay'],
      _count: { _all: true },
      _avg: { samplesCount: true }
    });
    
    return NextResponse.json({
      totalRoutes,
      routesWithStats: routesWithStatsCount,
      coveragePercent: totalRoutes > 0 
        ? Math.round(routesWithStatsCount / totalRoutes * 100) 
        : 0,
      routeCoverage: routeCoverage.map(r => ({
        busRouteId: r.busRouteId,
        routeName: r.routeName,
        totalStops: Number(r.totalStops),
        stopsWithStats: Number(r.stopsWithStats),
        coveragePercent: Number(r.coveragePercent)
      })),
      lowSampleRoutes: lowSampleRoutes.map(r => ({
        busRouteId: r.busRouteId,
        routeName: r.routeName,
        avgSamples: Number(r.avgSamples)
      })),
      dayOfWeekDistribution: dayOfWeekDistribution.map(d => ({
        dayOfWeek: d.dayOfWeek,
        count: d._count._all,
        avgSamples: d._avg.samplesCount
      })),
      hourDistribution: hourDistribution.map(h => ({
        hour: h.hourOfDay,
        count: h._count._all,
        avgSamples: h._avg.samplesCount
      }))
    });
    
  } catch (error) {
    console.error('커버리지 조회 오류:', error);
    return NextResponse.json(
      { error: '커버리지 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
