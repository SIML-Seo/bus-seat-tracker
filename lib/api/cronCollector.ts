/**
 * 단일 실행용 버스 데이터 수집기
 * Vercel Cron 작업에 최적화된 버전
 */
import { prisma } from '@/lib/prisma/client';
import { fetchBusLocationAndSeats } from './publicDataApi';
import { logger } from '@/lib/logging';

/**
 * 버스 노선을 첫 자릿수 기준으로 그룹화
 */
function groupBusRoutesByDigit(busRoutes: { id: string }[]): { [group: string]: string[] } {
  const groups: { [group: string]: string[] } = {};
  
  // 버스 노선 ID를 첫 자릿수로 그룹화
  busRoutes.forEach(route => {
    // 노선 ID에서 숫자만 추출
    const routeId = route.id;
    const firstDigit = routeId.charAt(0);
    
    // 첫 자릿수 기준 그룹화
    if (!groups[firstDigit]) {
      groups[firstDigit] = [];
    }
    groups[firstDigit].push(routeId);
  });
  
  return groups;
}

/**
 * 오늘의 집중 수집 그룹 결정
 * 평일 기준으로 특정 그룹을 순환하며 집중 수집
 */
function getTodaysFocusGroup(): string {
  const date = new Date();
  const dayOfWeek = date.getDay(); // 0(일) ~ 6(토)
  
  // 평일(1~5)인 경우만 집중 그룹 할당
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    // 요일 기준으로 집중 그룹 결정 (월=1, 화=2, 수=3, 목=4, 금=5, 1~9 사이클)
    const weekInMonth = Math.floor(date.getDate() / 7) + 1; // 이번 달의 몇 번째 주인지
    const focusIndex = ((dayOfWeek - 1) + (weekInMonth - 1)) % 9 + 1; // 1~9 사이의 값
    return focusIndex.toString();
  }
  
  // 주말은 0 그룹 (집중 수집 없음)
  return '0';
}

/**
 * 현재 시간이 출퇴근 시간인지 확인
 */
function isRushHour(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeValue = hour * 100 + minute; // 시간을 숫자로 변환 (예: 7:30 -> 730)
  
  // 출근 시간 (07:00-09:00)
  const isMorningRush = timeValue >= 700 && timeValue <= 900;
  // 퇴근 시간 (17:30-19:30)
  const isEveningRush = timeValue >= 1730 && timeValue <= 1930;
  
  return isMorningRush || isEveningRush;
}

/**
 * 특정 그룹의 버스 위치와 좌석 정보 수집
 */
async function collectBusLocationsForGroup(groupName: string, routeIds: string[]): Promise<void> {
  logger.info(`'${groupName}' 그룹(${routeIds.length}개 노선)의 버스 위치 및 좌석 정보 수집 시작`);
  
  // 각 노선별로 데이터 수집
  for (const routeId of routeIds) {
    try {
      // 버스 위치 및 좌석 정보 가져오기
      const locations = await fetchBusLocationAndSeats(routeId);
      
      if (locations.length === 0) {
        logger.info(`노선 ${routeId}: 현재 운행 중인 버스 없음`);
        continue;
      }
      
      logger.info(`노선 ${routeId}: ${locations.length}대 버스 위치 및 좌석 정보 수집 완료`);
      
      // DB에 위치 정보 저장
      for (const location of locations) {
        try {
          await prisma.busLocation.create({
            data: {
              id: `${routeId}_${location.vehId}_${Date.now()}`,
              busRouteId: routeId,
              busId: location.vehId.toString(),
              stopId: location.stationId?.toString(),
              stopName: '',
              remainingSeats: location.remainSeatCnt || 0,
              updatedAt: new Date()
            }
          });
        } catch (error) {
          logger.error(`버스 위치 정보 저장 오류 (노선: ${routeId}, 버스: ${location.vehId}):`, error);
        }
      }
      
      // 통계 업데이트 로직 구현 가능 (필요 시)
      // 현재는 원시 데이터만 저장
      
    } catch (error) {
      logger.error(`노선 ${routeId} 데이터 수집 오류:`, error);
    }
  }
  
  logger.info(`'${groupName}' 그룹 데이터 수집 완료`);
}

/**
 * 단일 실행용 데이터 수집 함수
 * Vercel Cron에서 호출하기에 적합한 방식으로 구현
 */
export async function collectDataOnce(): Promise<{
  success: boolean;
  message: string;
  collected?: number;
}> {
  try {
    logger.info('단일 실행 데이터 수집 시작');
    
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0(일)~6(토)
    
    // 운영 시간 외 (오전 6시 ~ 오후 10시)
    if (hour < 6 || hour >= 22) {
      logger.info('운영 시간 외 - 데이터 수집 건너뜀');
      return {
        success: true,
        message: '운영 시간 외 - 데이터 수집 건너뜀',
        collected: 0
      };
    }
    
    // DB에서 모든 좌석버스 노선 가져오기
    const busRoutes = await prisma.busRoute.findMany({
      select: { id: true }
    });
    
    if (busRoutes.length === 0) {
      logger.error('저장된 버스 노선이 없습니다.');
      return {
        success: false,
        message: '저장된 버스 노선이 없습니다.',
        collected: 0
      };
    }
    
    // 노선 그룹화
    const routeGroups = groupBusRoutesByDigit(busRoutes);
    
    // 수집할 그룹 선택 로직
    let groupsToCollect: { [key: string]: string[] } = {};
    
    // 주말이면 전체 그룹 수집, 평일이면 집중 그룹 수집
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // 평일 - 출퇴근 시간이면 더 많은 그룹 수집
      if (isRushHour()) {
        // 출퇴근 시간에는 두 개의 그룹 수집
        const focusGroup = getTodaysFocusGroup();
        const secondaryGroup = ((parseInt(focusGroup) % 9) + 1).toString(); // 다음 그룹도 수집
        
        logger.info(`출퇴근 시간 - 집중 그룹: ${focusGroup}, 보조 그룹: ${secondaryGroup}`);
        
        if (routeGroups[focusGroup]) {
          groupsToCollect[focusGroup] = routeGroups[focusGroup];
        }
        if (routeGroups[secondaryGroup]) {
          groupsToCollect[secondaryGroup] = routeGroups[secondaryGroup];
        }
      } else {
        // 일반 시간대 - 집중 그룹만 수집
        const focusGroup = getTodaysFocusGroup();
        logger.info(`평일 일반 시간대 - 집중 그룹: ${focusGroup}`);
        
        if (routeGroups[focusGroup]) {
          groupsToCollect[focusGroup] = routeGroups[focusGroup];
        }
      }
    }
    // 주말 - 모든 그룹 수집
    else {
      logger.info('주말 - 모든 그룹 수집');
      groupsToCollect = routeGroups;
    }
    
    // 수집할 데이터가 없는 경우
    if (Object.keys(groupsToCollect).length === 0) {
      logger.info('수집할 그룹이 없습니다.');
      return {
        success: true,
        message: '수집할 그룹이 없습니다.',
        collected: 0
      };
    }
    
    // 데이터 수집 실행
    let totalCollected = 0;
    for (const [groupName, routeIds] of Object.entries(groupsToCollect)) {
      await collectBusLocationsForGroup(groupName, routeIds);
      totalCollected += routeIds.length;
    }
    
    logger.info(`데이터 수집 완료. 총 ${totalCollected}개 노선 처리됨.`);
    return {
      success: true,
      message: `데이터 수집 완료`,
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
 * 오래된 버스 위치 데이터 정리
 * 24시간 이상 된 데이터 삭제
 */
export async function cleanupOldData(): Promise<{
  success: boolean;
  message: string;
  deleted?: number;
}> {
  try {
    logger.info('오래된 데이터 정리 작업 시작');
    
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // 24시간 이상 된 데이터 삭제
    const { count } = await prisma.busLocation.deleteMany({
      where: {
        updatedAt: {
          lt: oneDayAgo
        }
      }
    });
    
    logger.info(`${count}개의 오래된 데이터 삭제 완료`);
    return {
      success: true,
      message: `${count}개의 오래된 데이터 삭제 완료`,
      deleted: count
    };
    
  } catch (error) {
    logger.error('데이터 정리 중 오류 발생:', error);
    return {
      success: false,
      message: `데이터 정리 중 오류 발생: ${error}`
    };
  }
} 