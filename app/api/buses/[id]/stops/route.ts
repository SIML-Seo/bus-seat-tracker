import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { fetchRouteStations } from '@/lib/api/publicDataApi';
import { BusStop } from '@prisma/client';

// 개발 환경인지 확인
const isDevelopment = process.env.NODE_ENV === 'development';

// GET 요청 처리: 특정 버스 노선의 정류장 목록 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const busRouteId = params.id;
    
    // 버스 노선 정보 조회
    const busRoute = await prisma.busRoute.findUnique({
      where: {
        id: busRouteId,
      },
    });
    
    if (!busRoute) {
      return NextResponse.json(
        { error: '해당 버스 노선을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 버스 정류장 목록 조회
    let stops = await prisma.busStop.findMany({
      where: {
        busRouteId,
      },
      orderBy: {
        stationSeq: 'asc', // 순서대로 정렬
      },
    });
    
    // DB에 정류장 정보가 없는 경우
    if (stops.length === 0) {
      if (isDevelopment) {
        // 개발 환경에서는 API에서 데이터 가져오기
        console.log(`개발 환경: API에서 정류장 정보 가져오기. 버스 노선 ID: ${busRouteId}`);
        
        // 공공 API에서 정류장 정보 가져오기
        const apiStops = await fetchRouteStations(busRouteId);
        
        if (apiStops.length > 0) {
          // 가져온 정보를 DB에 저장
          const createdStops = await Promise.all(
            apiStops.map(async (stop) => {
              try {
                // stationId를 문자열로 변환
                const stationId = String(stop.stationId);
                
                return await prisma.busStop.create({
                  data: {
                    busRouteId: busRouteId,
                    stationId: stationId,
                    stationName: stop.stationName,
                    stationSeq: stop.stationSeq, // 이미 숫자로 제공됨
                    x: stop.x, // 이미 숫자로 제공됨
                    y: stop.y, // 이미 숫자로 제공됨
                  },
                });
              } catch (error) {
                console.error(`정류장 저장 중 오류 발생: ${error}`);
                return null;
              }
            })
          );
          
          // null이 아닌 값만 필터링
          stops = createdStops.filter((stop): stop is BusStop => stop !== null);
          console.log(`API에서 ${stops.length}개의 정류장 정보를 가져와 DB에 저장했습니다.`);
        }
      } else {
        // 프로덕션 환경에서는 안내 메시지만 반환
        console.log('프로덕션 환경: API 호출 없이 DB 결과만 반환');
        return NextResponse.json({
          busRoute,
          stops: [],
          message: '정류장 정보가 아직 수집되지 않았습니다. 잠시 후 다시 시도해주세요.'
        });
      }
    }
    
    // 결과 반환
    return NextResponse.json({
      busRoute,
      stops,
    });
  } catch (error) {
    console.error('버스 정류장 목록 조회 에러:', error);
    return NextResponse.json(
      { error: '버스 정류장 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 