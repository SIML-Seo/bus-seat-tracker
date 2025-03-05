import { NextResponse } from 'next/server';
import { fetchBusRoutes, fetchBusLocationAndSeats, fetchRouteStations } from '@/lib/api/publicDataApi';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'routes';
    const routeId = url.searchParams.get('routeId') || '';
    const keyword = url.searchParams.get('keyword') || '3201';
    
    console.log(`[DEBUG API] 요청: action=${action}, routeId=${routeId}, keyword=${keyword}`);
    
    const startTime = Date.now();
    let result = null;
    let error = null;
    
    switch (action) {
      case 'routes':
        try {
          result = await fetchBusRoutes(keyword);
          console.log(`[DEBUG API] 노선 데이터 조회 결과: ${result?.length || 0}개 항목`);
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
          console.error(`[DEBUG API] 노선 데이터 조회 오류:`, err);
        }
        break;
        
      case 'locations':
        if (!routeId) {
          return NextResponse.json({ 
            error: 'routeId 파라미터가 필요합니다.'
          }, { status: 400 });
        }
        
        try {
          result = await fetchBusLocationAndSeats(routeId);
          console.log(`[DEBUG API] 위치 데이터 조회 결과: ${result?.length || 0}개 항목`);
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
          console.error(`[DEBUG API] 위치 데이터 조회 오류:`, err);
        }
        break;
        
      case 'stations':
        if (!routeId) {
          return NextResponse.json({ 
            error: 'routeId 파라미터가 필요합니다.'
          }, { status: 400 });
        }
        
        try {
          result = await fetchRouteStations(routeId);
          console.log(`[DEBUG API] 정류장 데이터 조회 결과: ${result?.length || 0}개 항목`);
        } catch (err) {
          error = err instanceof Error ? err.message : String(err);
          console.error(`[DEBUG API] 정류장 데이터 조회 오류:`, err);
        }
        break;
        
      default:
        return NextResponse.json({ 
          error: '지원하지 않는 액션입니다. (routes, locations, stations 중 하나를 선택하세요)'
        }, { status: 400 });
    }
    
    const endTime = Date.now();
    
    return NextResponse.json({
      action,
      routeId: routeId || null,
      keyword: keyword || null,
      result,
      error,
      executionTime: `${endTime - startTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DEBUG API] 처리 중 오류:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 