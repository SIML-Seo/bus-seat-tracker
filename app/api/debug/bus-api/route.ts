/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { testApiKey, testApiParams } from '@/lib/api/apiDebug';

// API 테스트 엔드포인트
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'key';
    
    // 결과 저장 객체
    let results: any = {};
    
    // API 키 테스트
    if (testType === 'key') {
      results = await testApiKey();
    } 
    // 버스 노선 검색 테스트
    else if (testType === 'routes') {
      const keyword = searchParams.get('keyword') || '3201';
      results = await testApiParams('routes', { keyword });
    }
    // 노선 정보 테스트
    else if (testType === 'routeInfo') {
      const routeId = searchParams.get('routeId');
      if (!routeId) {
        return NextResponse.json({ error: 'routeId 파라미터가 필요합니다' }, { status: 400 });
      }
      results = await testApiParams('routeInfo', { routeId });
    }
    // 정류장 목록 테스트
    else if (testType === 'stations') {
      const routeId = searchParams.get('routeId');
      if (!routeId) {
        return NextResponse.json({ error: 'routeId 파라미터가 필요합니다' }, { status: 400 });
      }
      results = await testApiParams('stations', { routeId });
    }
    // 버스 위치 테스트
    else if (testType === 'locations') {
      const routeId = searchParams.get('routeId');
      if (!routeId) {
        return NextResponse.json({ error: 'routeId 파라미터가 필요합니다' }, { status: 400 });
      }
      results = await testApiParams('locations', { routeId });
    }
    // 정류장 도착 정보 테스트
    else if (testType === 'arrivals') {
      const stationId = searchParams.get('stationId');
      if (!stationId) {
        return NextResponse.json({ error: 'stationId 파라미터가 필요합니다' }, { status: 400 });
      }
      results = await testApiParams('arrivals', { stationId });
    }
    
    // 결과 반환
    return NextResponse.json(results);
  } catch (error: any) {
    console.error('API 디버깅 오류:', error);
    return NextResponse.json(
      { 
        error: '디버깅 중 오류가 발생했습니다', 
        message: error.message 
      }, 
      { status: 500 }
    );
  }
} 