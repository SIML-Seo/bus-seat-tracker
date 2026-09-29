import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma/client';
import { createErrorResponse } from '@/lib/utils/errorHandler';
import { DAY_GROUPS, HOUR_OPTIONS, getDayGroupDays, type DayGroup } from '@/app/bus/[id]/_lib/bus-detail';
import { buildRouteSummary, type HourAggregate, type StopAggregate } from '@/app/_shared/route-summary';

// GET /api/buses/[id]/summary?day=weekday|sat|sun|all&hour=6~21|all
// 홈 '내 노선' 카드용 요약.
// 좌석 API는 노선 하나에 DB 기준 약 400KB(정류장명 포함 전체 행)라 홈에서 여러 노선을 부르면 egress 부담이 크다.
// 여기서는 SQL로 정류장별·시간대별 합계(수십 행)만 가져와 서버에서 요약하고, 응답(약 1KB)을 CDN에 1시간 캐시한다.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: busRouteId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dayParam = searchParams.get('day');
    const hourParam = searchParams.get('hour');

    if (!DAY_GROUPS.some(group => group.key === dayParam)) {
      return NextResponse.json({ error: 'day는 weekday, sat, sun, all 중 하나여야 합니다.' }, { status: 400 });
    }
    const hour = hourParam === 'all' ? null : Number(hourParam);
    if (hour !== null && !HOUR_OPTIONS.includes(hour)) {
      return NextResponse.json({ error: `hour는 ${HOUR_OPTIONS[0]}~${HOUR_OPTIONS[HOUR_OPTIONS.length - 1]} 또는 all이어야 합니다.` }, { status: 400 });
    }
    const dayGroup = dayParam as DayGroup;
    const days = getDayGroupDays(dayGroup);

    const [busRoute, busStops] = await Promise.all([
      prisma.busRoute.findUnique({
        where: { id: busRouteId },
        select: {
          id: true,
          routeName: true,
          type: true,
          routeTypeName: true,
          startStopName: true,
          endStopName: true,
          company: true,
          turnStationId: true,
          turnStationName: true,
        },
      }),
      prisma.busStop.findMany({
        where: { busRouteId },
        select: { busRouteId: true, stationId: true, stationName: true, stationSeq: true },
        orderBy: { stationSeq: 'asc' },
      }),
    ]);

    if (!busRoute) {
      return NextResponse.json({ error: '버스 노선을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 가중 평균의 분자·분모만 합산해 가져온다. (행 수: 정류장 수 / 시간대 수)
    const hourCondition = hour === null ? Prisma.empty : Prisma.sql`AND "hourOfDay" = ${hour}`;
    const [stopAggregates, hourAggregates] = await Promise.all([
      prisma.$queryRaw<StopAggregate[]>`
        SELECT "stopId",
               SUM("averageSeats" * "samplesCount")::float8 AS "weightedSum",
               SUM("samplesCount")::int AS "samples"
        FROM "BusStopSeats"
        WHERE "busRouteId" = ${busRouteId}
          AND "dayOfWeek" IN (${Prisma.join(days)})
          ${hourCondition}
        GROUP BY "stopId"
      `,
      prisma.$queryRaw<HourAggregate[]>`
        SELECT "hourOfDay" AS "hour",
               SUM("averageSeats" * "samplesCount")::float8 AS "weightedSum",
               SUM("samplesCount")::int AS "samples"
        FROM "BusStopSeats"
        WHERE "busRouteId" = ${busRouteId}
          AND "dayOfWeek" IN (${Prisma.join(days)})
        GROUP BY "hourOfDay"
      `,
    ]);

    const summary = buildRouteSummary({ busRoute, busStops, stopAggregates, hourAggregates, dayGroup, hour });

    return NextResponse.json(summary, {
      headers: {
        // 통계는 수집 주기(3~40분)마다 조금씩 바뀌므로 1시간 캐시로 충분하다.
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    return createErrorResponse(error, '노선 요약을 불러오지 못했습니다.');
  }
}
