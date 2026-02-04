/**
 * 관리자 시스템 상태 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/utils/adminAuth';
import { 
  getTodaysFocusGroup, 
  isTodayHoliday, 
  getTodayHolidayName, 
  updateHolidayInfo,
  getCurrentMonthHolidays,
  isRushHour,
  getCollectionInterval,
  groupBusRoutesByDigit
} from '@/lib/api/busDataService';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  // 인증 확인
  if (!verifyAdminToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  
  try {
    const now = new Date();
    
    // 공휴일 정보 업데이트
    await updateHolidayInfo(now);
    
    // 노선 그룹 정보
    const busRoutes = await prisma.busRoute.findMany({
      select: { id: true }
    });
    const routeGroups = groupBusRoutesByDigit(busRoutes);
    
    // 현재 시스템 상태
    const systemStatus = {
      currentTime: now.toISOString(),
      localTime: now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      dayOfWeek: now.getDay(),
      dayOfWeekName: ['일', '월', '화', '수', '목', '금', '토'][now.getDay()],
      hour: now.getHours(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isRushHour: isRushHour(),
      collectionInterval: getCollectionInterval(),
      isOperatingHours: now.getHours() >= 6 && now.getHours() < 22
    };
    
    // 공휴일 정보
    const holidayInfo = {
      isHoliday: isTodayHoliday(now),
      holidayName: getTodayHolidayName(now),
      monthHolidays: getCurrentMonthHolidays().map(h => ({
        date: h.locdate,
        name: h.dateName,
        isHoliday: h.isHoliday === 'Y'
      }))
    };
    
    // 집중 수집 그룹 정보
    const focusGroupInfo = {
      todaysFocusGroup: getTodaysFocusGroup(),
      groups: Object.entries(routeGroups).map(([name, routes]) => ({
        name,
        routeCount: routes.length,
        isFocusToday: name === getTodaysFocusGroup()
      }))
    };
    
    // 환경 정보
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasPublicDataApiKey: !!process.env.PUBLIC_DATA_API_KEY,
      hasCronSecret: !!process.env.CRON_SECRET,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    };
    
    return NextResponse.json({
      system: systemStatus,
      holiday: holidayInfo,
      focusGroup: focusGroupInfo,
      environment: envInfo
    });
    
  } catch (error) {
    console.error('시스템 상태 조회 오류:', error);
    return NextResponse.json(
      { error: '시스템 상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
