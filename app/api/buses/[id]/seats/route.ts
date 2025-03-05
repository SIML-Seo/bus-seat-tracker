import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { fetchBusLocationAndSeats, fetchRouteStations, fetchBusStationInfo } from '@/lib/api/publicDataApi';
import { BusStop } from '@prisma/client';

// 개발 환경인지 확인
const isDevelopment = process.env.NODE_ENV === 'development';

// GET 요청 처리: 특정 버스 노선의 시간대별 좌석 정보 조회
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const busRouteId = params.id;
    
    // 쿼리 파라미터에서 요일, 시간대, 정류장 필터 가져오기
    const { searchParams } = new URL(request.url);
    const dayOfWeekParams = searchParams.getAll('dayOfWeek');
    const hourOfDayParam = searchParams.get('hourOfDay');
    const stopIdParam = searchParams.get('stopId');
    
    // 필터 조건 객체 생성
    const whereCondition: Record<string, unknown> = {
      busRouteId,
    };
    
    // 요일 필터 추가
    if (dayOfWeekParams.length > 0) {
      const dayOfWeeks = dayOfWeekParams.map(day => parseInt(day)).filter(day => !isNaN(day) && day >= 0 && day <= 6);
      if (dayOfWeeks.length > 0) {
        whereCondition.dayOfWeek = {
          in: dayOfWeeks
        };
      }
    }
    
    // 시간대 필터 추가
    if (hourOfDayParam !== null) {
      const hourOfDay = parseInt(hourOfDayParam);
      if (!isNaN(hourOfDay) && hourOfDay >= 0 && hourOfDay <= 23) {
        whereCondition.hourOfDay = hourOfDay;
      }
    }
    
    // 정류장 필터 추가
    if (stopIdParam !== null) {
      whereCondition.stopId = stopIdParam;
    }
    
    // 버스 노선 정보와 정류장별 좌석 데이터 조회
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
    
    // 정류장별 좌석 데이터 조회
    let seatData = await prisma.busStopSeats.findMany({
      where: whereCondition,
      orderBy: [
        { dayOfWeek: 'asc' },
        { hourOfDay: 'asc' },
        { stopName: 'asc' },
      ],
    });
    
    // 정류장 이름이 없는 항목 찾기 및 업데이트
    const stationInfoCache = new Map<string, string>();
    
    if (seatData.length > 0) {
      const missingNameItems = seatData.filter(item => !item.stopName);
      
      if (missingNameItems.length > 0) {
        console.log(`정류장 이름이 없는 ${missingNameItems.length}개 항목 업데이트 중...`);
        
        // 정류장 이름 가져오기 및 업데이트
        for (const item of missingNameItems) {
          // 이미 캐시에 있는지 확인
          if (!stationInfoCache.has(item.stopId)) {
            try {
              const stationInfo = await fetchBusStationInfo(item.stopId);
              if (stationInfo && stationInfo.length > 0) {
                stationInfoCache.set(item.stopId, stationInfo[0].stationName);
              }
            } catch (error) {
              console.error(`정류장 정보 조회 오류 (정류장 ID: ${item.stopId}):`, error);
            }
          }
          
          // 캐시에서 정류장 이름 가져오기
          const stopName = stationInfoCache.get(item.stopId);
          
          if (stopName) {
            // DB 업데이트
            await prisma.busStopSeats.update({
              where: {
                busRouteId_stopId_dayOfWeek_hourOfDay: {
                  busRouteId: item.busRouteId,
                  stopId: item.stopId,
                  dayOfWeek: item.dayOfWeek,
                  hourOfDay: item.hourOfDay
                }
              },
              data: { stopName }
            });
            
            // 메모리 내 데이터도 업데이트
            item.stopName = stopName;
          }
        }
      }
    }
    
    // DB에 좌석 데이터가 없는 경우
    if (seatData.length === 0) {
      if (isDevelopment) {
        // 개발 환경에서만 API에서 데이터 수집
        console.log(`개발 환경: API에서 좌석 정보 가져오기. 버스 노선 ID: ${busRouteId}`);
        
        try {
          // 1. 먼저 해당 노선의 정류장 목록을 가져옴
          let stops = await prisma.busStop.findMany({
            where: { busRouteId },
            orderBy: { stationSeq: 'asc' },
          });
          
          // 정류장 정보가 없으면 API에서 가져옴
          if (stops.length === 0) {
            const apiStops = await fetchRouteStations(busRouteId);
            
            if (apiStops.length > 0) {
              const createdStops = await Promise.all(
                apiStops.map(async (stop) => {
                  try {
                    const stationId = String(stop.stationId);
                    
                    return await prisma.busStop.create({
                      data: {
                        busRouteId: busRouteId,
                        stationId: stationId,
                        stationName: stop.stationName,
                        stationSeq: stop.stationSeq,
                        x: stop.x,
                        y: stop.y,
                      },
                    });
                  } catch (error) {
                    console.error(`정류장 저장 중 오류 발생: ${error}`);
                    return null;
                  }
                })
              );
              
              stops = createdStops.filter((stop): stop is BusStop => stop !== null);
              console.log(`API에서 ${stops.length}개의 정류장 정보를 가져와 DB에 저장했습니다.`);
            }
          }
          
          // 2. 버스 위치 및 좌석 정보 가져오기
          const busLocations = await fetchBusLocationAndSeats(busRouteId);
          
          if (busLocations.length > 0) {
            // 버스 위치 정보를 DB에 저장
            await Promise.all(
              busLocations.map(async (location) => {
                try {
                  // 해당 정류장 정보 찾기
                  const stopInfo = stops.find(stop => String(stop.stationId) === String(location.stationId));
                  
                  if (stopInfo) {
                    await prisma.busLocation.create({
                      data: {
                        busRouteId: busRouteId,
                        busId: String(location.vehId),
                        stopId: String(location.stationId),
                        stopName: stopInfo.stationName,
                        remainingSeats: location.remainSeatCnt,
                        updatedAt: new Date(),
                      },
                    });
                  }
                } catch (error) {
                  console.error(`버스 위치 정보 저장 중 오류 발생: ${error}`);
                }
              })
            );
            
            // 3. 실시간 데이터를 기반으로 샘플 통계 생성
            // 현재 요일 및 시간 
            const now = new Date();
            const currentDayOfWeek = now.getDay(); // 0=일요일, 6=토요일
            const currentHour = now.getHours();
            
            // 각 정류장별 평균 좌석 계산
            const stationSeats = new Map<string, { seats: number[], stopInfo: BusStop | undefined }>();
            
            // 정류장별로 좌석 정보 그룹화
            busLocations.forEach(location => {
              const stationId = String(location.stationId);
              const seats = location.remainSeatCnt;
              
              if (!stationSeats.has(stationId)) {
                stationSeats.set(stationId, {
                  seats: [],
                  stopInfo: stops.find(stop => String(stop.stationId) === stationId),
                });
              }
              
              stationSeats.get(stationId)!.seats.push(seats);
            });
            
            // 각 정류장별 평균 좌석 데이터 생성
            const seatsDataPromises = Array.from(stationSeats.entries()).map(async ([stationId, data]) => {
              const { seats, stopInfo } = data;
              
              if (stopInfo && seats.length > 0) {
                const averageSeats = seats.reduce((sum, seat) => sum + seat, 0) / seats.length;
                
                try {
                  return await prisma.busStopSeats.create({
                    data: {
                      busRouteId: busRouteId,
                      stopId: stationId,
                      stopName: stopInfo.stationName,
                      averageSeats: averageSeats,
                      dayOfWeek: currentDayOfWeek,
                      hourOfDay: currentHour,
                      samplesCount: seats.length,
                      updatedAt: new Date(),
                    },
                  });
                } catch (error) {
                  console.error(`좌석 통계 저장 중 오류 발생: ${error}`);
                  return null;
                }
              }
              return null;
            });
            
            const createdSeats = await Promise.all(seatsDataPromises);
            const validSeats = createdSeats.filter(seat => seat !== null);
            
            console.log(`API 데이터를 기반으로 ${validSeats.length}개 정류장의 좌석 통계를 생성했습니다.`);
            
            // 다시 조회하여 결과 반환
            seatData = await prisma.busStopSeats.findMany({
              where: whereCondition,
              orderBy: [
                { dayOfWeek: 'asc' },
                { hourOfDay: 'asc' },
                { stopName: 'asc' },
              ],
            });
          }
        } catch (error) {
          console.error('API에서 버스 좌석 정보 가져오기 오류:', error);
        }
      } else {
        // 프로덕션 환경에서는 안내 메시지만 반환
        console.log('프로덕션 환경: API 호출 없이 DB 결과만 반환');
        return NextResponse.json({
          busRoute,
          seatData: [],
          message: '좌석 정보가 아직 수집되지 않았습니다. 잠시 후 다시 시도해주세요.'
        });
      }
    }
    
    // 결과 반환
    return NextResponse.json({
      busRoute,
      seatData,
    });
  } catch (error) {
    console.error('버스 좌석 정보 조회 에러:', error);
    return NextResponse.json(
      { error: '버스 좌석 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 