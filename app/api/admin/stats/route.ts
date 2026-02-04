/**
 * 관리자 데이터 수집 통계 API
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { verifyAdminToken } from '@/lib/utils/adminAuth';
import { getTodaysFocusGroup, isTodayHoliday, getTodayHolidayName, updateHolidayInfo } from '@/lib/api/busDataService';

export async function GET(request: NextRequest) {
  // 인증 확인
  if (!verifyAdminToken(request.headers.get('authorization'))) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
  }
  
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 오늘 수집된 BusLocation 레코드 수
    const todayCollected = await prisma.busLocation.count({
      where: {
        updatedAt: { gte: todayStart }
      }
    });
    
    // 마지막 수집 시간
    const lastCollection = await prisma.busLocation.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });
    
    // 최근 24시간 시간대별 수집량
    const hourlyStats: { hour: number; count: number }[] = [];
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date(now.getTime() - (24 - i) * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const count = await prisma.busLocation.count({
        where: {
          updatedAt: {
            gte: hourStart,
            lt: hourEnd
          }
        }
      });
      
      hourlyStats.push({
        hour: hourStart.getHours(),
        count
      });
    }
    
    // 공휴일 정보 업데이트
    await updateHolidayInfo(now);
    
    // 오늘의 집중 수집 그룹
    const focusGroup = getTodaysFocusGroup();
    
    // 공휴일 여부
    const isHoliday = isTodayHoliday(now);
    const holidayName = getTodayHolidayName(now);
    
    return NextResponse.json({
      todayCollected,
      lastCollectionTime: lastCollection?.updatedAt?.toISOString() || null,
      hourlyStats,
      focusGroup,
      isHoliday,
      holidayName,
      dayOfWeek: now.getDay(),
      currentHour: now.getHours()
    });
    
  } catch (error) {
    console.error('통계 조회 오류:', error);
    return NextResponse.json(
      { error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
