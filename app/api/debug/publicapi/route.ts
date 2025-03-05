import { NextResponse } from 'next/server';
import { fetchBusRoutes, fetchBusLocationAndSeats, fetchRouteStations } from '@/lib/api/publicDataApi';
import type { BusRouteList, BusStation, BusLocation } from '@/lib/api/types';

// 결과 타입 정의
interface ApiTestResult<T> {
  success: boolean;
  count: number;
  data: T[];
  error: string | null;
  time: string;
}

// 공공 데이터 API 디버깅
export async function GET(request: Request) {
  try {
    // 쿼리 파라미터 확인
    const { searchParams } = new URL(request.url);
    const route = searchParams.get('route') || '7770';
    
    console.log(`[디버그] 노선 ${route} 데이터 테스트 시작`);
    
    // API 키 정보 출력
    const apiKeyInfo = {
      encoded: process.env.PUBLIC_DATA_API_KEY ? '설정됨' : '없음',
      decoded: process.env.PUBLIC_DATA_BUS_API_KEY_DEC ? '설정됨' : '없음',
      encoded2: process.env.PUBLIC_DATA_BUS_API_KEY_INC ? '설정됨' : '없음',
    };
    
    // 1. 버스 노선 정보 조회
    const startTime1 = Date.now();
    let routesResult: ApiTestResult<BusRouteList>;
    try {
      const routes = await fetchBusRoutes(route);
      routesResult = {
        success: true,
        count: routes.length,
        data: routes.slice(0, 3),
        error: null,
        time: `${Date.now() - startTime1}ms`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      routesResult = {
        success: false,
        count: 0,
        data: [],
        error: errorMessage,
        time: `${Date.now() - startTime1}ms`,
      };
    }
    
    // 선택한 노선 ID
    const routeId = routesResult.data?.[0]?.routeId.toString() || '';
    
    // 2. 버스 노선 정류장 정보 조회
    let stationsResult: ApiTestResult<BusStation> = { 
      success: false, 
      count: 0, 
      data: [], 
      error: null, 
      time: '0ms'
    };
    
    if (routeId) {
      const startTime2 = Date.now();
      try {
        const stations = await fetchRouteStations(routeId);
        stationsResult = {
          success: true,
          count: stations.length,
          data: stations.slice(0, 3),
          error: null,
          time: `${Date.now() - startTime2}ms`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        stationsResult = {
          success: false,
          count: 0,
          data: [],
          error: errorMessage,
          time: `${Date.now() - startTime2}ms`,
        };
      }
    }
    
    // 3. 버스 위치 및 좌석 정보 조회
    let locationsResult: ApiTestResult<BusLocation> = { 
      success: false, 
      count: 0, 
      data: [], 
      error: null, 
      time: '0ms'
    };
    
    if (routeId) {
      const startTime3 = Date.now();
      try {
        const locations = await fetchBusLocationAndSeats(routeId);
        locationsResult = {
          success: true,
          count: locations.length,
          data: locations.slice(0, 3),
          error: null,
          time: `${Date.now() - startTime3}ms`,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        locationsResult = {
          success: false,
          count: 0,
          data: [],
          error: errorMessage,
          time: `${Date.now() - startTime3}ms`,
        };
      }
    }
    
    // 결과 종합
    const result = {
      timestamp: new Date().toISOString(),
      apiKeys: apiKeyInfo,
      searchQuery: route,
      selectedRouteId: routeId,
      busRoutes: routesResult,
      busStations: stationsResult,
      busLocations: locationsResult,
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API 디버그 에러]', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: '공공 데이터 API 테스트 중 오류가 발생했습니다.',
        message: errorMessage
      },
      { status: 500 }
    );
  }
} 