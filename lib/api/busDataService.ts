/**
 * 버스 데이터 서비스
 * busDataCollector에서 비즈니스 로직을 분리하여 GitHub Actions에서 사용 가능하도록 함
 */
import { prisma } from '@/lib/prisma/client';
import { fetchBusLocationAndSeats, fetchHollydayInfo, fetchRouteStations } from './publicDataApi';
import { collectAllSeatBusRoutes } from './busDataCollector';
import { HolidayItem } from './types';
import { logger } from '@/lib/logging';
import { dedupeRouteStationsByStationId } from '@/lib/utils/routeStationDedup';

// 월별 공휴일 정보 캐시
let currentMonthHolidays: HolidayItem[] = [];
let lastHolidayFetchDate = ''; // 마지막으로 공휴일 정보를 가져온 날짜 (YYYY-MM-DD)

/**
 * 공휴일 정보 업데이트
 */
export async function updateHolidayInfo(now: Date): Promise<void> {
  const currentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // 날짜가 바뀌었으면 공휴일 정보 업데이트
  if (currentDateStr !== lastHolidayFetchDate) {
    logger.info(`날짜 변경 (${currentDateStr}), ${now.getFullYear()}년 ${now.getMonth() + 1}월 공휴일 정보 업데이트 시도...`);
    try {
      const holidays = await fetchHollydayInfo(now.getFullYear(), now.getMonth() + 1);
      currentMonthHolidays = holidays;
      lastHolidayFetchDate = currentDateStr;
      logger.info(`공휴일 정보 업데이트 완료: ${holidays.length}개`);
      if (holidays.length > 0) {
        logger.info(`이번 달 공휴일: ${holidays.map(h => `${h.locdate}(${h.dateName})`).join(', ')}`);
      }
    } catch (error) {
      logger.error('공휴일 정보 업데이트 중 오류 발생:', error);
    }
  }
}

/**
 * 오늘이 공휴일인지 확인
 */
export function isTodayHoliday(now: Date): boolean {
  const todayYYYYMMDD = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return currentMonthHolidays.some(holiday => holiday.locdate.toString() === todayYYYYMMDD && holiday.isHoliday === 'Y');
}

/**
 * 오늘의 공휴일 이름 반환
 */
export function getTodayHolidayName(now: Date): string | null {
  const todayYYYYMMDD = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const holiday = currentMonthHolidays.find(h => h.locdate.toString() === todayYYYYMMDD);
  return holiday?.dateName || null;
}

/**
 * 버스 노선을 5개 그룹으로 나누는 함수
 */
export function groupBusRoutesByDigit(busRoutes: { id: string }[]): { [group: string]: string[] } {
  const groups: { [group: string]: string[] } = {
    'group1_6': [], // 끝자리 1, 6
    'group2_7': [], // 끝자리 2, 7
    'group3_8': [], // 끝자리 3, 8
    'group4_9': [], // 끝자리 4, 9
    'group5_0': []  // 끝자리 5, 0
  };
  
  busRoutes.forEach(route => {
    const lastDigit = parseInt(route.id.slice(-1));
    
    if (lastDigit === 1 || lastDigit === 6) {
      groups['group1_6'].push(route.id);
    } else if (lastDigit === 2 || lastDigit === 7) {
      groups['group2_7'].push(route.id);
    } else if (lastDigit === 3 || lastDigit === 8) {
      groups['group3_8'].push(route.id);
    } else if (lastDigit === 4 || lastDigit === 9) {
      groups['group4_9'].push(route.id);
    } else { // 0, 5
      groups['group5_0'].push(route.id);
    }
  });
  
  return groups;
}

/**
 * 오늘의 집중 수집 그룹 결정
 */
export function getTodaysFocusGroup(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
  
  // 주말은 집중 수집 없음
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'none';
  }
  
  // 현재 주차 계산 (1년을 52주로 가정)
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7);
  
  // 주차 모듈로 5로 나눠서 0-4 값 구하기 (5주 주기)
  const weekMod5 = (weekNumber - 1) % 5;
  
  // 각 주차별로 요일마다 다른 그룹 할당 (5주 순환)
  const focusGroups: { [key: string]: string } = {
    // 첫 주차 (mod 0)
    '0_1': 'group1_6', // 월요일 - 그룹 1,6
    '0_2': 'group2_7', // 화요일 - 그룹 2,7
    '0_3': 'group3_8', // 수요일 - 그룹 3,8
    '0_4': 'group4_9', // 목요일 - 그룹 4,9
    '0_5': 'group5_0', // 금요일 - 그룹 5,0
    
    // 둘째 주차부터 순환...
    '1_1': 'group2_7', '1_2': 'group3_8', '1_3': 'group4_9', '1_4': 'group5_0', '1_5': 'group1_6',
    '2_1': 'group3_8', '2_2': 'group4_9', '2_3': 'group5_0', '2_4': 'group1_6', '2_5': 'group2_7',
    '3_1': 'group4_9', '3_2': 'group5_0', '3_3': 'group1_6', '3_4': 'group2_7', '3_5': 'group3_8',
    '4_1': 'group5_0', '4_2': 'group1_6', '4_3': 'group2_7', '4_4': 'group3_8', '4_5': 'group4_9',
  };
  
  const key = `${weekMod5}_${dayOfWeek}`;
  return focusGroups[key] || 'none';
}

/**
 * 현재 시간이 출퇴근 시간인지 확인
 */
export function isRushHour(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // 오전 출근 시간 (7-9시)
  if (hour >= 7 && hour < 9) {
    return true;
  }
  
  // 오후 퇴근 시간 (17:30-19:30)
  if (hour === 17 && minute >= 30) {
    return true;
  }
  if (hour === 19 && minute <= 30) {
    return true;
  }
  if (hour === 18) {
    return true;
  }
  
  return false;
}

/**
 * 그룹별 수집 간격 결정 (분 단위)
 */
export function getCollectionInterval(): number {
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  
  // 운영 시간 외 (22시 이후 또는 6시 이전)
  if (hour < 6 || hour >= 22) {
    return 999; // 수집 중단
  }
  
  // 주말인 경우 40분 간격으로 수집
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 40;
  }
  
  // 출퇴근 시간 - 3분 간격
  if (isRushHour()) {
    return 3;
  }
  
  // 일반 시간대 - 18분 간격
  return 18;
}

/**
 * 버스 잔여석 통계 업데이트
 */
export async function updateSeatStats(
  statsByStopRoute: Map<string, { seats: number[]; busRouteId: string; stopName: string }>,
  dayOfWeek: number,
  hourOfDay: number
): Promise<void> {
  try {
    const now = new Date();
    
    // 배치 처리를 위한 설정
    const batchSize = 20; // 한 번에 처리할 배치 크기
    const batches: Array<() => Promise<unknown>>[] = [];
    let currentBatch: Array<() => Promise<unknown>> = [];
    
    // 각 정류장별 처리
    for (const [key, data] of statsByStopRoute.entries()) {
      if (data.seats.length > 0) {
        const [busRouteId, stopId] = key.split('_');
        
        // 데이터 수에 따라 다르게 처리
        let trimmedSeats = [...data.seats];
        
        // 데이터가 충분히 많을 때만 이상치 제거 적용 (10개 이상)
        if (data.seats.length >= 10) {
          // 이상치 제거 (상위/하위 10% 제거)
          const sortedSeats = [...data.seats].sort((a, b) => a - b);
          const trimStart = Math.floor(sortedSeats.length * 0.1);
          const trimEnd = Math.ceil(sortedSeats.length * 0.9);
          trimmedSeats = sortedSeats.slice(trimStart, trimEnd);
        }
        
        // 평균 좌석 계산
        const averageSeats = trimmedSeats.reduce((sum, val) => sum + val, 0) / trimmedSeats.length;
        
        // 트랜잭션 기반 처리
        const operation = async () => {
          return prisma.$transaction(async (tx) => {
            // 1. 기존 데이터 조회
            const existingStat = await tx.busStopSeats.findUnique({
              where: {
                busRouteId_stopId_dayOfWeek_hourOfDay: {
                  busRouteId,
                  stopId,
                  dayOfWeek,
                  hourOfDay
                }
              },
              select: {
                averageSeats: true,
                samplesCount: true,
              }
            });

            if (existingStat) {
              // 2. 기존 데이터가 있으면 업데이트
              const MAX_EFFECTIVE_SAMPLES = 200;
              const effectiveOldCount = Math.min(existingStat.samplesCount, MAX_EFFECTIVE_SAMPLES);
              const newAverage = (existingStat.averageSeats * effectiveOldCount + averageSeats * trimmedSeats.length) /
                              (effectiveOldCount + trimmedSeats.length);

              return tx.busStopSeats.update({
                where: {
                  busRouteId_stopId_dayOfWeek_hourOfDay: {
                    busRouteId,
                    stopId,
                    dayOfWeek,
                    hourOfDay
                  }
                },
                data: {
                  averageSeats: newAverage,
                  samplesCount: Math.min(effectiveOldCount + trimmedSeats.length, MAX_EFFECTIVE_SAMPLES),
                  updatedAt: now
                },
                select: { busRouteId: true },
              });
            } else {
              // 3. 기존 데이터가 없으면 생성
              return tx.busStopSeats.create({
                data: {
                  busRouteId,
                  stopId,
                  stopName: data.stopName,
                  averageSeats,
                  dayOfWeek,
                  hourOfDay,
                  samplesCount: trimmedSeats.length,
                  updatedAt: now
                },
                select: { busRouteId: true },
              });
            }
          });
        };
        
        // 배치에 추가
        currentBatch.push(operation);
        
        // 배치 크기에 도달하면 새 배치 시작
        if (currentBatch.length >= batchSize) {
          batches.push([...currentBatch]);
          currentBatch = [];
        }
      }
    }
    
    // 마지막 배치가 남아있으면 추가
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    // 배치별로 처리
    let processedCount = 0;
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        // 여러 작업을 개별적으로 실행
        const results = await Promise.allSettled(batch.map(operation => operation()));
        
        // 결과 처리
        processedCount += results.filter(r => r.status === 'fulfilled').length;
        
        // 실패한 항목 로깅
        const failedCount = results.filter(r => r.status === 'rejected').length;
        if (failedCount > 0) {
          logger.warn(`배치 ${i+1}/${batches.length}: ${failedCount}개 항목 처리 실패`);
        }
        
        logger.info(`배치 ${i+1}/${batches.length} 처리 완료: ${batch.length}개 항목 중 ${batch.length - failedCount}개 성공`);
        
        // 배치 사이에 짧은 대기 시간
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        logger.error(`배치 ${i+1}/${batches.length} 처리 중 오류:`, error);
      }
    }
    
    logger.info(`통계 업데이트 완료: 총 ${processedCount}개 정류장`);
  } catch (error) {
    logger.error('잔여석 통계 업데이트 오류:', error);
  }
}

/**
 * 오래된 BusLocation 데이터 정리
 */
export async function cleanupOldData(retentionHours: number = 6): Promise<{ deleted: number }> {
  try {
    logger.info(`${retentionHours}시간 이상 된 BusLocation 데이터 정리 시작...`);
    
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - retentionHours);
    
    const result = await prisma.busLocation.deleteMany({
      where: {
        updatedAt: {
          lt: cutoffTime
        }
      }
    });
    
    logger.info(`${result.count}개의 오래된 BusLocation 데이터 삭제 완료`);

    // 전체 데이터 카운트 로깅
    const totalCount = await prisma.busLocation.count();
    logger.info(`현재 총 ${totalCount}개의 버스 위치 데이터가 DB에 저장되어 있습니다.`);

    return { deleted: result.count };
  } catch (error) {
    logger.error('데이터 정리 중 오류 발생:', error);
    return { deleted: 0 };
  }
}

/**
 * 단일 실행용 데이터 수집 함수 (GitHub Actions용)
 */
export async function collectBusLocationsOnce(): Promise<{
  success: boolean;
  message: string;
  collected?: number;
  skipped?: string;
}> {
  try {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    logger.info('단일 실행 데이터 수집 시작...');
    
    // 1. 공휴일 정보 로딩
    await updateHolidayInfo(now);
    
    // 2. 공휴일이면 즉시 종료
    if (isTodayHoliday(now)) {
      const holidayName = getTodayHolidayName(now);
      logger.info(`오늘은 공휴일(${holidayName || '정보 없음'})입니다. 수집을 건너뜁니다.`);
      return {
        success: true,
        message: `공휴일(${holidayName})로 인해 수집 건너뜀`,
        collected: 0,
        skipped: 'holiday'
      };
    }
    
    // 3. 운영 시간 체크 (06:00~22:00)
    if (hour < 6 || hour >= 22) {
      logger.info('운영 시간(06:00~22:00) 외 시간대는 데이터 수집을 중단합니다.');
      return {
        success: true,
        message: '운영 시간 외',
        collected: 0,
        skipped: 'outside_operating_hours'
      };
    }
    
    // 4. DB에서 모든 좌석버스 노선 가져오기
    let busRoutes = await prisma.busRoute.findMany({
      select: { id: true }
    });

    // 노선 데이터가 없으면 자동으로 수집 (전체 초기화 후 첫 실행 시)
    if (busRoutes.length === 0) {
      logger.info('저장된 버스 노선이 없습니다. 노선 정보를 수집합니다...');
      await collectAllSeatBusRoutes();

      busRoutes = await prisma.busRoute.findMany({
        select: { id: true }
      });
    }

    if (busRoutes.length === 0) {
      logger.error('노선 정보 수집에 실패했습니다.');
      return {
        success: false,
        message: '노선 정보 수집에 실패했습니다.',
        collected: 0
      };
    }
    
    // 5. 노선 그룹화
    const routeGroups = groupBusRoutesByDigit(busRoutes);
    
    // 6. 수집할 그룹 결정
    let groupsToCollect: { [key: string]: string[] } = {};
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 평일 - 집중 그룹만 수집
      const focusGroup = getTodaysFocusGroup();
      logger.info(`평일 - 집중 그룹: ${focusGroup}`);
      
      if (routeGroups[focusGroup]) {
        groupsToCollect[focusGroup] = routeGroups[focusGroup];
      }
    } else {
      // 주말 - 모든 그룹 수집
      logger.info('주말 - 모든 그룹 수집');
      groupsToCollect = routeGroups;
    }
    
    // 7. 데이터 수집 실행
    let totalCollected = 0;
    
    for (const [groupName, routeIds] of Object.entries(groupsToCollect)) {
      logger.info(`${groupName} 그룹 (${routeIds.length}개 노선) 데이터 수집 시작...`);
      
      // 정류장 정보 미리 로드 (N+1 쿼리 방지)
      const allStops = await prisma.busStop.findMany({
        where: {
          busRouteId: { in: routeIds }
        },
        select: {
          busRouteId: true,
          stationId: true,
          stationName: true
        }
      });
      
      // 정류장 정보 맵 생성
      const stopMap = new Map<string, string>();
      allStops.forEach(stop => {
        stopMap.set(`${stop.busRouteId}_${stop.stationId}`, stop.stationName);
      });
      
      for (const routeId of routeIds) {
        try {
          // 정류장 정보가 DB에 없으면 API에서 가져와 저장 (동적 조회)
          const existingStopsCount = await prisma.busStop.count({
            where: { busRouteId: routeId }
          });

          if (existingStopsCount === 0) {
            logger.info(`노선 ${routeId}의 정류장 정보가 없습니다. API에서 정보를 가져옵니다.`);
            try {
              const stops = await fetchRouteStations(routeId);

              if (stops.length > 0) {
                const uniqueStops = dedupeRouteStationsByStationId(stops);

                if (uniqueStops.length !== stops.length) {
                  logger.warn(`노선 ${routeId}의 정류장 정보에서 중복 stationId ${stops.length - uniqueStops.length}개를 제거했습니다.`);
                }

                // 정류장 정보 DB에 저장
                await prisma.busStop.createMany({
                  data: uniqueStops.map(stop => ({
                    busRouteId: routeId,
                    stationId: String(stop.stationId),
                    stationName: stop.stationName,
                    stationSeq: stop.stationSeq,
                    x: stop.x,
                    y: stop.y,
                  })),
                  skipDuplicates: true,
                });

                for (const stop of uniqueStops) {
                  stopMap.set(`${routeId}_${stop.stationId}`, stop.stationName);
                }
                logger.info(`노선 ${routeId}의 정류장 ${uniqueStops.length}/${stops.length}개를 DB에 저장했습니다.`);
              }
            } catch (error) {
              logger.error(`노선 ${routeId}의 정류장 정보 조회 실패:`, error);
            }
          }

          const busLocations = await fetchBusLocationAndSeats(routeId);

          if (busLocations.length === 0) {
            continue;
          }
          
          // 버스 위치 정보 저장 (중복 체크 포함)
          let savedCount = 0;
          let skippedCount = 0;

          for (const location of busLocations) {
            try {
              const stopId = location.stationId ? String(location.stationId) : null;
              const busId = String(location.vehId);

              // 중복 체크: 같은 버스가 같은 정류장에 최근 10분 이내에 기록이 있는지 확인
              let shouldSave = true;

              if (stopId) {
                const existingLocation = await prisma.busLocation.findFirst({
                  where: {
                    busRouteId: routeId,
                    busId: busId,
                    stopId: stopId,
                    updatedAt: {
                      gte: new Date(Date.now() - 10 * 60 * 1000) // 10분 이내
                    }
                  },
                  orderBy: {
                    updatedAt: 'desc'
                  },
                  select: {
                    remainingSeats: true
                  }
                });

                // 같은 위치에 최근 기록이 있고, 잔여석 변동이 2석 이하면 중복으로 간주
                if (existingLocation && Math.abs(existingLocation.remainingSeats - location.remainSeatCnt) <= 2) {
                  shouldSave = false;
                  skippedCount++;
                }
              }

              if (shouldSave) {
                const stopName = stopId ? (stopMap.get(`${routeId}_${stopId}`) || null) : null;

                await prisma.busLocation.create({
                  data: {
                    busRouteId: routeId,
                    busId: busId,
                    stopId,
                    stopName,
                    remainingSeats: location.remainSeatCnt,
                    updatedAt: new Date(),
                  },
                  select: { id: true },
                });

                savedCount++;
                totalCollected++;
              }
            } catch (error) {
              logger.error(`버스 위치 정보 저장 오류 (노선ID: ${routeId}, 버스ID: ${location.vehId}):`, error);
            }
          }
          
          if (skippedCount > 0) {
            logger.info(`노선 ${routeId}: ${busLocations.length}개 중 ${savedCount}개 저장 (${skippedCount}개 중복 제외)`);
          } else {
            logger.info(`노선 ${routeId}: ${savedCount}개 버스 위치 정보 저장`);
          }
        } catch (error) {
          logger.error(`노선 ${routeId}의 버스 위치 정보 조회 오류:`, error);
        }
      }
      
      logger.info(`${groupName} 그룹 수집 완료`);
    }
    
    // 8. 통계 업데이트
    const statsByStopRoute = new Map<string, { seats: number[]; busRouteId: string; stopName: string }>();
    
    // 이번 수집에서 저장한 데이터만 통계에 반영 (now 이후에 저장된 BusLocation만 대상)
    const recentLocations = await prisma.busLocation.findMany({
      where: {
        updatedAt: { gte: now }
      },
      select: {
        busRouteId: true,
        stopId: true,
        stopName: true,
        remainingSeats: true,
      }
    });
    
    for (const location of recentLocations) {
      if (location.stopId && location.remainingSeats >= 0 && location.remainingSeats <= 48) {
        const key = `${location.busRouteId}_${location.stopId}`;
        
        if (!statsByStopRoute.has(key)) {
          statsByStopRoute.set(key, {
            seats: [],
            busRouteId: location.busRouteId,
            stopName: location.stopName || ''
          });
        }
        
        statsByStopRoute.get(key)!.seats.push(location.remainingSeats);
      }
    }
    
    await updateSeatStats(statsByStopRoute, dayOfWeek, hour);
    
    logger.info(`데이터 수집 완료: 총 ${totalCollected}개 버스 위치 정보 저장`);
    
    return {
      success: true,
      message: '데이터 수집 완료',
      collected: totalCollected
    };
    
  } catch (error) {
    logger.error('데이터 수집 중 오류 발생:', error);
    return {
      success: false,
      message: `데이터 수집 중 오류 발생: ${error}`,
      collected: 0
    };
  }
}

/**
 * 현재 공휴일 정보 반환 (관리자 페이지용)
 */
export function getCurrentMonthHolidays(): HolidayItem[] {
  return currentMonthHolidays;
}
