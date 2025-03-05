/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import { prisma } from '@/lib/prisma/client';
import { fetchBusBaseInfo, fetchBusLocationAndSeats, fetchRouteDetail, fetchBusStationInfo } from './publicDataApi';
import { BusLocation } from './types';
import { logger } from '@/lib/logging';

// 좌석버스 타입코드 (잔여석 정보를 제공하는 버스 유형)
const SEAT_BUS_TYPE_CODES = [11, 12, 14, 16, 17, 21, 22];

// 파싱된 버스 노선 정보 타입 정의
interface ParsedBusRoute {
  routeId: number;
  adminName: string;
  endStationId: number;
  endStationName: string;
  regionName: string;
  routeName: string;
  routeTypeCd: number;
  startStationId: number;
  startStationName: string;
  turnSeq: number;
  companyId: number;
  companyName: string;
  companyTel: string;
  [key: string]: string | number; // 기타 추가 필드
}

// 텍스트 파일 파싱
async function parseBusRoutes(fileUrl: string): Promise<ParsedBusRoute[]> {
  try {
    // 텍스트 파일 다운로드
    const response = await axios.get(fileUrl);
    const data = response.data as string;
    
    // 텍스트 파일 파싱
    const lines = data.split('^').filter(line => line.trim() !== '');
    const header = lines[0].split('|');
    
    // 나머지 행을 파싱하여 객체 배열로 변환
    const routes = lines.slice(1).map(line => {
      const values = line.split('|');
      const route: Record<string, string | number> = {};
      
      header.forEach((key, index) => {
        // 숫자로 변환 가능한 값들은 숫자로 변환
        const value = values[index];
        route[key] = /^\d+$/.test(value) ? parseInt(value, 10) : value;
      });
      
      return route as ParsedBusRoute;
    });
    
    // 좌석버스만 필터링
    return routes.filter(route => 
      SEAT_BUS_TYPE_CODES.includes(route.routeTypeCd)
    );
  } catch (error) {
    logger.error('버스 노선 텍스트 파일 파싱 오류:', error);
    return [];
  }
}

// 모든 좌석버스 정보 가져오기 및 DB 저장
export async function collectAllSeatBusRoutes(): Promise<void> {
  try {
    logger.info('모든 좌석버스 정보 수집 시작...');
    
    // 1. 기본 정보 조회하여 노선 정보 텍스트 파일 URL 얻기
    const baseInfo = await fetchBusBaseInfo();
    if (!baseInfo || baseInfo.length === 0) {
      logger.error('버스 기본 정보를 가져올 수 없습니다.');
      return;
    }
    
    const routeDownloadUrl = baseInfo[0].routeDownloadUrl;
    if (!routeDownloadUrl) {
      logger.error('노선 정보 다운로드 URL을 찾을 수 없습니다.');
      return;
    }
    
    // 2. 텍스트 파일 다운로드 및 파싱
    logger.info(`노선 정보 텍스트 파일 다운로드 중: ${routeDownloadUrl}`);
    const busRoutes = await parseBusRoutes(routeDownloadUrl);
    logger.info(`좌석버스 ${busRoutes.length}개를 찾았습니다.`);
    
    // 3. 각 버스 노선에 대해 상세 정보 조회 및 DB 저장
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const route of busRoutes) {
      try {
        // 이미 DB에 있는지 확인
        const existingRoute = await prisma.busRoute.findUnique({
          where: { id: String(route.routeId) }
        });
        
        // 회차 정류장 정보를 얻기 위해 상세 정보 조회
        const detailInfo = await fetchRouteDetail(String(route.routeId));
        
        const routeData = {
          id: String(route.routeId),
          routeName: route.routeName.toString(),
          type: String(route.routeTypeCd),
          routeTypeName: getRouteTypeName(route.routeTypeCd),
          startStopName: route.startStationName.toString(),
          endStopName: route.endStationName.toString(),
          turnStationName: detailInfo?.turnStNm || '',
          turnStationId: detailInfo?.turnStID ? String(detailInfo.turnStID) : '',
          company: route.companyName.toString(),
        };
        
        if (existingRoute) {
          // 업데이트
          await prisma.busRoute.update({
            where: { id: routeData.id },
            data: routeData
          });
          updatedCount++;
        } else {
          // 새로 생성
          await prisma.busRoute.create({
            data: routeData
          });
          createdCount++;
        }
      } catch (error) {
        logger.error(`버스 노선 저장 오류 (ID: ${route.routeId}):`, error);
      }
    }
    
    logger.info(`작업 완료: ${createdCount}개 노선 생성, ${updatedCount}개 노선 업데이트`);
  } catch (error) {
    logger.error('좌석버스 정보 수집 오류:', error);
  }
}

// 버스 타입 코드에 따른 이름 반환
function getRouteTypeName(routeTypeCd: number): string {
  const routeTypes: Record<number, string> = {
    11: '직행좌석형시내버스',
    12: '좌석형시내버스',
    14: '광역급행형시내버스',
    16: '경기순환버스',
    17: '준공영제직행좌석시내버스',
    21: '직행좌석형농어촌버스',
    22: '좌석형농어촌버스'
  };
  
  return routeTypes[routeTypeCd] || '좌석버스';
}

// 버스 잔여석 통계 업데이트
async function updateSeatStats(statsByStopRoute: Map<string, { seats: number[]; busRouteId: string; stopName: string }>, dayOfWeek: number, hourOfDay: number) {
  try {
    const now = new Date();
    
    // 배치 처리를 위한 설정
    const batchSize = 20; // 한 번에 처리할 배치 크기
    const batches: any[][] = [];
    let currentBatch: any[] = [];
    
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
        
        // 트랜잭션 기반 처리로 변경
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
              }
            });

            if (existingStat) {
              // 2. 기존 데이터가 있으면 업데이트
              const newAverage = (existingStat.averageSeats * existingStat.samplesCount + averageSeats * trimmedSeats.length) / 
                              (existingStat.samplesCount + trimmedSeats.length);
              
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
                  samplesCount: existingStat.samplesCount + trimmedSeats.length,
                  updatedAt: now
                }
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
                }
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
        // 여러 작업을 개별적으로 실행 (트랜잭션 보다 더 안정적)
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

// 버스 노선을 5개 그룹으로 나누는 함수
function groupBusRoutesByDigit(busRoutes: { id: string }[]): { [group: string]: string[] } {
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

// 오늘의 집중 수집 그룹 결정
function getTodaysFocusGroup(): string {
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

// 현재 시간이 출퇴근 시간인지 확인
function isRushHour(): boolean {
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

// 그룹별 수집 간격 결정 (분 단위)
function getCollectionInterval(): number {
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

// 버스별 마지막 위치를 저장할 캐시 추가 (함수 외부에서 모듈 레벨로 선언)
// key: `${busRouteId}_${busId}`, value: { stopId: string, timestamp: Date }
const lastBusPositionCache = new Map<string, { stopId: string, timestamp: Date, remainingSeats: number }>();

// 집중 그룹의 버스 위치 정보 수집
async function collectBusLocationsForGroup(groupName: string, routeIds: string[]): Promise<void> {
  const now = new Date();
  
  logger.info(`${groupName} 그룹 (${routeIds.length}개 노선) 데이터 수집 시작...`);
  logger.info(`현재 시간: ${now.toLocaleTimeString()}, 출퇴근시간: ${isRushHour() ? 'O' : 'X'}, 수집간격: ${getCollectionInterval()}분`);
  
  // 운영 시간 체크 (6시~22시)
  const hour = now.getHours();
  if (hour < 6 || hour >= 22) {
    logger.info('운영 시간(06:00~22:00) 외 시간대는 데이터 수집을 중단합니다.');
    return;
  }
  
  let totalBusLocations = 0;
  let apiCallCount = 0;
  
  // 각 노선에 대해 버스 위치 및 잔여석 정보 조회
  for (const routeId of routeIds) {
    try {
      apiCallCount++; // API 호출 카운트
      const busLocations = await fetchBusLocationAndSeats(routeId);

      // 새 버스 위치 필터링 (정류장이 변경된 경우만)
      const filteredLocations: BusLocation[] = [];
      
      for (const location of busLocations) {
        // 버스 식별자
        const busKey = `${routeId}_${location.vehId}`;
        const currentStopId = location.stationId ? String(location.stationId) : null;
        
        // 이전 위치 정보 가져오기
        const lastPosition = lastBusPositionCache.get(busKey);
        
        // 위치 업데이트 여부 결정
        let shouldUpdate = true;
        
        if (lastPosition && currentStopId) {
          // 같은 정류장이고 마지막 업데이트 후 짧은 시간(예: 10분)이 지나지 않았으면 중복으로 간주
          const timeSinceLastUpdate = new Date().getTime() - lastPosition.timestamp.getTime();
          const isRecentUpdate = timeSinceLastUpdate < 10 * 60 * 1000; // 10분 이내
          
          if (lastPosition.stopId === currentStopId && isRecentUpdate) {
            // 잔여석 수가 달라졌으면 업데이트 (승하차 반영)
            if (Math.abs(lastPosition.remainingSeats - location.remainSeatCnt) <= 2) {
              // 잔여석이 2석 이하로 변동 시 동일 위치로 간주하고 업데이트 안 함
              shouldUpdate = false;
            }
          }
        }
        
        // 위치가 변경되었거나 처음 수집된 버스면 추가
        if (shouldUpdate) {
          filteredLocations.push(location);
          
          // 캐시 업데이트
          if (currentStopId) {
            lastBusPositionCache.set(busKey, {
              stopId: currentStopId,
              timestamp: new Date(),
              remainingSeats: location.remainSeatCnt
            });
          }
        }
      }
      
      // 필터링된 위치만 DB에 저장
      await Promise.all(filteredLocations.map(async (location: BusLocation) => {
        try {
          // 정류장 ID가 있을 경우 BusStop에서 정류장 이름 조회
          let stopName: string | null = null;
          
          if (location.stationId) {
            const stopId = String(location.stationId);
            
            // 먼저 DB에서 정류장 정보 검색
            const busStop = await prisma.busStop.findFirst({
              where: {
                busRouteId: routeId,
                stationId: stopId
              },
              select: {
                stationName: true
              }
            });
            
            if (busStop?.stationName) {
              stopName = busStop.stationName;
            }
          }
          
          await prisma.busLocation.create({
            data: {
              busRouteId: routeId,
              busId: String(location.vehId),
              stopId: location.stationId ? String(location.stationId) : null, 
              stopName,  // 찾은 정류장 이름 또는 null
              remainingSeats: location.remainSeatCnt,
              updatedAt: new Date(),
            }
          });
          
          totalBusLocations++;
        } catch (error) {
          logger.error(`버스 위치 정보 저장 오류 (노선ID: ${routeId}, 버스ID: ${location.vehId}):`, error);
        }
      }));
      
      if (busLocations.length !== filteredLocations.length) {
        logger.info(`노선 ${routeId}: ${busLocations.length}개 중 ${filteredLocations.length}개 버스 위치 정보 저장 (중복 제외)`);
      } else {
        logger.info(`노선 ${routeId}: ${busLocations.length}개 중 ${filteredLocations.length}개 버스 위치 정보 저장`);
      }
    } catch (error) {
      logger.error(`노선 ${routeId}의 버스 위치 정보 조회 오류:`, error);
    }
  }
  
  logger.info(`${groupName} 작업 완료: 총 ${apiCallCount}개 API 호출, ${totalBusLocations}개 버스 위치 정보 저장`);
  
  // 시간대별 평균 잔여석 통계 업데이트
  // 현재 날짜와 시간 정보로 통계 업데이트
  const dayOfWeek = now.getDay(); 
  const hourOfDay = now.getHours();
  
  // 수집 간격에 따라 cutoffTime 설정 (현재 간격의 2배로 설정하여 충분한 데이터 확보)
  const interval = getCollectionInterval();
  // 최소 5분, 최대 60분의 범위 내에서 수집 간격의 2배를 cutoff로 설정
  const cutoffMinutes = Math.min(Math.max(interval * 2, 5), 60);
  const cutoffTime = new Date(now.getTime() - cutoffMinutes * 60 * 1000);
  
  logger.info(`통계 계산 기준 시간: 최근 ${cutoffMinutes}분 이내 데이터`);
  
  try {
    // 1. 최근 버스 위치 정보 가져오기
    const recentLocations = await prisma.busLocation.findMany({
      where: {
        updatedAt: {
          gte: cutoffTime
        }
      },
      include: {
        busRoute: {
          select: {
            busStops: true
          }
        }
      }
    });
    
    if (recentLocations.length === 0) {
      logger.info('최근 수집된 버스 위치 정보가 없습니다.');
      return;
    }
    
    logger.info(`최근 ${recentLocations.length}개의 버스 위치 데이터로 통계 계산 중...`);
    
    // 정류장 정보 캐시 (API 호출 최소화를 위해)
    const stationInfoCache = new Map<string, string>();
    
    // 2. 정류장별로 그룹화
    const statsByStopRoute = new Map<string, { seats: number[], busRouteId: string, stopName: string }>();
    
    // 정류장 정보 가져오기 (API 호출 필요시)
    const fetchStationNameIfNeeded = async (stopId: string, busRouteId?: string): Promise<string> => {
      // 이미 캐시에 있는 경우
      if (stationInfoCache.has(stopId)) {
        return stationInfoCache.get(stopId) || '';
      }
      
      try {
        // 1. 먼저 DB에서 정류장 정보 조회 시도
        if (busRouteId) {
          const busStop = await prisma.busStop.findFirst({
            where: {
              busRouteId,
              stationId: stopId
            },
            select: {
              stationName: true
            }
          });
          
          // DB에서 정보를 찾았으면 캐시에 저장하고 반환
          if (busStop?.stationName) {
            const stationName = busStop.stationName;
            stationInfoCache.set(stopId, stationName);
            return stationName;
          }
        }
        
        // 2. DB에서 찾지 못했으면 API에서 정류장 정보 가져오기
        const stationInfo = await fetchBusStationInfo(stopId);
        if (stationInfo && stationInfo.length > 0) {
          const stationName = stationInfo[0].stationName || '';
          stationInfoCache.set(stopId, stationName);
          return stationName;
        }
      } catch (error) {
        logger.error(`정류장 정보 조회 오류 (정류장 ID: ${stopId}):`, error);
      }
      
      return '';
    };
    
    // 모든 위치 데이터 처리
    for (const location of recentLocations) {
      // 유효한 데이터만 사용 (stopId가 있고, 잔여석이 0-48 범위 내인 경우만)
      if (location.stopId && location.remainingSeats >= 0 && location.remainingSeats <= 48) {
        const key = `${location.busRouteId}_${location.stopId}`;
        
        if (!statsByStopRoute.has(key)) {
          // 정류장 이름 찾기
          let stopName = location.stopName || '';
          
          if (!stopName && location.busRoute?.busStops) {
            const stop = location.busRoute.busStops.find(s => s.stationId === location.stopId);
            stopName = stop?.stationName || '';
          }
          
          // 여전히 stopName이 없는 경우 API에서 가져오기
          if (!stopName && location.stopId) {
            stopName = await fetchStationNameIfNeeded(location.stopId, location.busRouteId);
            
            // 정류장 이름을 찾았으면 DB 업데이트
            if (stopName) {
              try {
                // 해당 위치 레코드 업데이트
                await prisma.busLocation.update({
                  where: { id: location.id },
                  data: { stopName }
                });
                logger.info(`정류장 이름 업데이트: ${location.stopId} -> ${stopName}`);
              } catch (error) {
                logger.error(`버스 위치 정보 업데이트 오류 (ID: ${location.id}):`, error);
              }
            }
          }
          
          statsByStopRoute.set(key, {
            seats: [],
            busRouteId: location.busRouteId,
            stopName
          });
        }
        
        statsByStopRoute.get(key)!.seats.push(location.remainingSeats);
      } else {
        logger.info(`유효하지 않은 데이터 건너뜀: 노선(${location.busRouteId}), 정류장(${location.stopId}), 잔여석(${location.remainingSeats})`);
      }
    }
    
    // 3. 통계 데이터 업데이트
    await updateSeatStats(statsByStopRoute, dayOfWeek, hourOfDay);
  } catch (error) {
    logger.error('버스 위치 데이터 처리 및 통계 업데이트 오류:', error);
  }
}

// 최적화된 데이터 수집 메인 함수
export async function startOptimizedDataCollection(): Promise<void> {
  logger.info('최적화된 버스 데이터 수집 서비스 시작...');
  logger.info('- 운영시간: 06:00 ~ 22:00');
  logger.info('- 출퇴근시간(07:00-09:00, 17:30-19:30): 3분 간격 수집');
  logger.info('- 일반시간: 18분 간격 수집');
  logger.info('- 매 평일 하나의 집중 그룹만 수집 (5주 주기 순환)');
  logger.info('- 오래된 데이터 자동 정리: 6시간 간격, 7일 이상 데이터 삭제');

  // 모든 좌석버스 정보 수집 (처음 한 번만)
  // await collectAllSeatBusRoutes();
  
  // DB에서 모든 좌석버스 노선 가져오기
  const busRoutes = await prisma.busRoute.findMany({
    select: { id: true }
  });
  
  if (busRoutes.length === 0) {
    logger.error('저장된 버스 노선이 없습니다.');
    return;
  }
  
  // 노선 그룹화
  const routeGroups = groupBusRoutesByDigit(busRoutes);
  
  // 각 그룹별 노선 수 출력
  Object.entries(routeGroups).forEach(([groupName, routes]) => {
    logger.info(`- ${groupName}: ${routes.length}개 노선`);
  });
  
  // 그룹별 마지막 수집 시간 초기화
  const lastCollectionTime: Record<string, Date> = {};
  Object.keys(routeGroups).forEach(group => {
    lastCollectionTime[group] = new Date(0); // 바로 수집 시작되도록 초기화
  });
  
  // 하루 API 호출 횟수 카운터
  let dailyApiCallCount = 0;
  // 마지막 API 호출 카운트 초기화 날짜 저장
  let lastResetDate = new Date().toDateString();
  
  // 매 분마다 체크하여 수집 여부 결정
  const checkInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // 날짜가 바뀌었는지 확인하여 API 호출 카운트 초기화
    const currentDateString = now.toDateString();
    if (currentDateString !== lastResetDate) {
      logger.info(`날짜가 변경되어 API 호출 카운트 초기화. 이전: ${dailyApiCallCount}`);
      dailyApiCallCount = 0;
      lastResetDate = currentDateString;
      
      // 날짜가 바뀔 때 캐시 전체 초기화
      const cacheSize = lastBusPositionCache.size;
      lastBusPositionCache.clear();
      logger.info(`날짜 변경으로 버스 위치 캐시 초기화: ${cacheSize}개 항목 제거`);
    }
    
    // 운영 시간 외에는 체크하지 않음
    if (hour < 6 || hour >= 22) {
      return;
    }
    
    // 평일 - 집중 그룹만 수집
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const focusGroup = getTodaysFocusGroup();
      logger.info(`현재 시간: ${now.toLocaleTimeString()}, 평일 집중 그룹: ${focusGroup}, 오늘 API 호출: ${dailyApiCallCount}`);
      
      // 집중 그룹의 마지막 수집 시간 및 간격 확인
      const lastTime = lastCollectionTime[focusGroup] || new Date(0);
      const interval = getCollectionInterval();
      const minutesSinceLastCollection = (now.getTime() - lastTime.getTime()) / (60 * 1000);
      
      // 설정된 간격보다 더 시간이 지났으면 수집
      if (minutesSinceLastCollection >= interval) {
        const routeIds = routeGroups[focusGroup] || [];
        if (routeIds.length > 0) {
          // API 호출 횟수 확인 및 데이터 수집
          const expectedCalls = routeIds.length;
          if (dailyApiCallCount + expectedCalls <= 10000) {
            logger.info(`${focusGroup} 그룹 데이터 수집 시작 (마지막 수집 후 ${Math.round(minutesSinceLastCollection)}분 경과)`);
            lastCollectionTime[focusGroup] = now;
            dailyApiCallCount += expectedCalls;
            collectBusLocationsForGroup(focusGroup, routeIds)
              .catch(error => logger.error(`${focusGroup} 그룹 데이터 수집 오류:`, error));
          } else {
            logger.error(`경고: 일일 API 호출 한도(10,000)에 근접했습니다. 오늘 호출: ${dailyApiCallCount}`);
          }
        }
      }
    } 
    // 주말 - 모든 그룹 수집 (40분 간격)
    else {
      logger.info(`현재 시간: ${now.toLocaleTimeString()}, 주말 - 모든 그룹 40분 간격 수집`);
      
      // 각 그룹별로 확인
      for (const [groupName, routeIds] of Object.entries(routeGroups)) {
        const lastTime = lastCollectionTime[groupName] || new Date(0);
        const interval = getCollectionInterval(); // 주말은 40분 간격
        const minutesSinceLastCollection = (now.getTime() - lastTime.getTime()) / (60 * 1000);
        
        // 설정된 간격보다 더 시간이 지났으면 수집
        if (minutesSinceLastCollection >= interval) {
          // API 호출 횟수 확인
          const expectedCalls = routeIds.length;
          
          // 남은 API 호출 수가 충분한지 확인
          if (dailyApiCallCount + expectedCalls <= 10000) {
            logger.info(`주말 - ${groupName} 그룹 데이터 수집 시작 (마지막 수집 후 ${Math.round(minutesSinceLastCollection)}분 경과)`);
            
            // 마지막 수집 시간 업데이트
            lastCollectionTime[groupName] = now;
            
            // API 호출 카운트 미리 증가
            dailyApiCallCount += expectedCalls;
            
            // 데이터 수집 시작
            collectBusLocationsForGroup(groupName, routeIds)
              .catch(error => logger.error(`${groupName} 그룹 데이터 수집 오류:`, error));
          } else {
            logger.error(`경고: 일일 API 호출 한도(10,000)에 근접했습니다. 오늘 호출: ${dailyApiCallCount}. 그룹 ${groupName} 수집 건너뜀.`);
          }
        }
      }
    }
  }, 60 * 1000);  // 1분마다 체크
  
  // 하루에 한 번 버스 노선 정보 갱신 (새벽 5시)
  const dailyUpdateInterval = setInterval(async () => {
    const now = new Date();
    // 일요일(0)이고 오전 3시(3)일 때만 실행
    if (now.getDay() === 0 && now.getHours() === 3 && now.getMinutes() === 0) {
      logger.info('매주 일요일 오전 3시 버스 노선 정보 갱신 시작...');
      await collectAllSeatBusRoutes();
    }
  }, 60 * 60 * 1000); // 1시간마다 체크
  
  // 6시간마다 오래된 버스 위치 데이터 정리
  const cleanupInterval = setInterval(async () => {
    logger.info('오래된 버스 위치 데이터 정리 작업 시작...');
    await cleanupOldBusLocationData();
  }, 6 * 60 * 60 * 1000); // 6시간마다 실행
  
  // 시작 즉시 한 번 정리 작업 실행
  cleanupOldBusLocationData().catch(error => {
    logger.error('초기 데이터 정리 작업 오류:', error);
  });
  
  // 캐시 정리 인터벌 (1시간마다)
  const cacheCleanupInterval = setInterval(() => {
    cleanupPositionCache();
  }, 60 * 60 * 1000); // 1시간마다
  
  // 기존 에러 처리에 새 인터벌 정리 추가
  process.on('uncaughtException', (error) => {
    logger.error('예상치 못한 오류:', error);
    clearInterval(checkInterval);
    clearInterval(dailyUpdateInterval);
    clearInterval(cleanupInterval);
    clearInterval(cacheCleanupInterval); // 새로 추가
  });
}

async function cleanupOldBusLocationData(): Promise<void> {
  try {
    // 1. 완전히 삭제할 오래된 데이터 (24시간 이상)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const oldDataResult = await prisma.busLocation.deleteMany({
      where: {
        updatedAt: {
          lt: oneDayAgo
        }
      }
    });
    
    logger.info(`24시간 이상 된 데이터 정리 완료: ${oldDataResult.count}개 레코드 삭제됨`);
    
    // 2. 12~24시간 사이의 데이터는 샘플링 (80% 삭제, 20%만 유지)
    // 통계 목적으로 일부 데이터 유지
    const twelveHoursAgo = new Date();
    twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);
    
    // 12~24시간 사이의 데이터 조회
    const mediumAgedRecords = await prisma.busLocation.findMany({
      where: {
        updatedAt: {
          gte: oneDayAgo,
          lt: twelveHoursAgo
        }
      },
      select: {
        id: true
      }
    });
    
    if (mediumAgedRecords.length > 0) {
      // 80%를 삭제하기 위한 처리
      const recordsToDelete = mediumAgedRecords
        .sort(() => Math.random() - 0.5) // 무작위로 섞기
        .slice(0, Math.floor(mediumAgedRecords.length * 0.8)) // 80% 선택
        .map(record => record.id);
      
      const samplingResult = await prisma.busLocation.deleteMany({
        where: {
          id: {
            in: recordsToDelete
          }
        }
      });
      
      logger.info(`12~24시간 데이터 샘플링 완료: ${samplingResult.count}개 삭제 (전체 ${mediumAgedRecords.length}개 중 80%)`);
    }
    
    // 전체 데이터 카운트 로깅
    const totalCount = await prisma.busLocation.count();
    logger.info(`현재 총 ${totalCount}개의 버스 위치 데이터가 DB에 저장되어 있습니다.`);
  } catch (error) {
    logger.error('데이터 정리 중 오류 발생:', error);
  }
}

// 캐시 정리 함수 추가
function cleanupPositionCache(): void {
  const now = new Date();
  const cacheSize = lastBusPositionCache.size;
  
  // 2시간 이상 지난 캐시 항목 제거
  const expireTime = 2 * 60 * 60 * 1000; // 2시간(밀리초)
  let removedCount = 0;
  
  lastBusPositionCache.forEach((value, key) => {
    const age = now.getTime() - value.timestamp.getTime();
    if (age > expireTime) {
      lastBusPositionCache.delete(key);
      removedCount++;
    }
  });
  
  if (removedCount > 0) {
    logger.info(`버스 위치 캐시 정리: ${removedCount}개 항목 제거 (전체 ${cacheSize}개 중)`);
  }
}

/**
 * BusStopSeats 테이블의 모든 데이터를 삭제합니다.
 * 주의: 이 작업은 되돌릴 수 없으며, 모든 좌석 통계 데이터가 영구적으로 삭제됩니다.
 */
export async function clearAllBusStopSeatsData(): Promise<void> {
  try {
    logger.info('BusStopSeats 테이블 데이터 삭제 시작...');
    
    const startTime = Date.now();
    
    // 삭제 전 총 레코드 수 확인
    const totalRecords = await prisma.busStopSeats.count();
    logger.info(`삭제 전 BusStopSeats 레코드 수: ${totalRecords}`);
    
    // 모든 레코드 삭제
    const result = await prisma.busStopSeats.deleteMany({});
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`BusStopSeats 테이블 데이터 삭제 완료: ${result.count}개 레코드 삭제됨 (소요시간: ${duration}초)`);
    
    return;
  } catch (error) {
    logger.error('BusStopSeats 테이블 데이터 삭제 중 오류 발생:', error);
    throw error;
  }
} 