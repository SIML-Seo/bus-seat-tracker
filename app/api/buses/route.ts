import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { fetchBusRoutes, fetchRouteStations, fetchRouteDetail } from '@/lib/api/publicDataApi';
import { BusRouteInfo, BusRouteList, BusStation } from '@/lib/api/types';

// 개발 환경인지 확인
const isDevelopment = process.env.NODE_ENV === 'development';

// GET 요청 처리: 버스 노선 검색
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const busNumber = searchParams.get('keyword');

    if (!busNumber) {
      return NextResponse.json({ error: '버스 번호가 필요합니다' }, { status: 400 });
    }

    // DB에서 검색
    let busRoutes = await prisma.busRoute.findMany({
      where: {
        routeName: {
          contains: busNumber
        }
      }
    });

    // DB에 없는 경우 API에서 검색 (개발 환경에서만)
    if (busRoutes.length === 0) {
      if (isDevelopment) {
        console.log('개발 환경: API에서 버스 노선 검색');
        const routesFromApi = await fetchBusRoutes(busNumber);
        
        if (routesFromApi && routesFromApi.length > 0) {
          // 모든 버스 노선에 대해 상세 정보 조회
          const routeDetails = await Promise.all(
            routesFromApi.map(async (route: BusRouteList) => {
              try {
                // 상세 정보 조회
                const detailInfo = await fetchRouteDetail(route.routeId.toString());
                return {
                  ...route,
                  ...(detailInfo || {}) // 상세 정보 병합 (detailInfo가 null일 수 있으므로 기본값 설정)
                };
              } catch (error) {
                console.error(`Failed to fetch route detail for ${route.routeId}:`, error);
                return route; // 상세 정보 조회 실패시 기본 정보만 반환
              }
            })
          ) as (BusRouteList & BusRouteInfo)[];

          // 버스 노선 정보 저장
          const createdRoutes = await Promise.all(
            routeDetails.map(async (route) => {
              try {
                // 노선 기본 정보 저장
                const busRoute = await prisma.busRoute.create({
                  data: {
                    id: route.routeId.toString(),
                    routeName: route.routeName.toString(),
                    type: route.routeTypeCd?.toString() || '',
                    routeTypeName: route.routeTypeName || '',
                    startStopName: route.startStationName || '',
                    endStopName: route.endStationName || '',
                    // 회차 정류장 정보는 상세 정보에서 가져옴 (없을 수 있음)
                    turnStationId: route.turnStID?.toString() || '',
                    turnStationName: route.turnStNm || '', 
                    company: route.adminName || '',
                  }
                });

                // 버스 노선의 정류장 목록을 가져와서 저장
                try {
                  const stops = await fetchRouteStations(route.routeId.toString());
                  if (stops && stops.length > 0) {
                    await Promise.all(stops.map(async (stop: BusStation) => {
                      return prisma.busStop.create({
                        data: {
                          busRouteId: busRoute.id,
                          stationId: stop.stationId.toString(),
                          stationName: stop.stationName,
                          stationSeq: stop.stationSeq,
                          x: stop.x,
                          y: stop.y,
                        }
                      });
                    }));
                  }
                } catch (stopsError) {
                  console.error(`Failed to fetch or save stops for route ${route.routeId}:`, stopsError);
                }

                return busRoute;
              } catch (routeError) {
                console.error(`Failed to save route ${route.routeId}:`, routeError);
                return null;
              }
            })
          );

          busRoutes = createdRoutes.filter(route => route !== null);
        }
      } else {
        // 프로덕션 환경에서는 API 호출 없이 안내 메시지만 반환
        console.log('프로덕션 환경: API 호출 없이 DB 결과만 반환');
        return NextResponse.json({ 
          busRoutes: [], 
          message: "검색 결과가 없습니다. 데이터 수집 중일 수 있으니 나중에 다시 시도해주세요." 
        });
      }
    }

    return NextResponse.json({ busRoutes });
  } catch (error) {
    console.error('Error in bus search API:', error);
    return NextResponse.json({ error: '버스 검색 중 오류가 발생했습니다.' }, { status: 500 });
  }
} 