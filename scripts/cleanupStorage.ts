/**
 * Supabase Storage 및 DB 용량 관리 스크립트
 *
 * 사용법:
 *   npx tsx scripts/cleanupStorage.ts
 *
 * 또는 package.json에 추가 후:
 *   npm run cleanup
 */

import { prisma } from '@/lib/prisma/client';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 (Service Role 키 필요)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 설정값
const CONFIG = {
  // BusLocation 보관 기간 (시간) - 24시간에서 6시간으로 변경
  BUS_LOCATION_RETENTION_HOURS: 6,

  // 로그 파일 보관 기간 (일)
  LOG_RETENTION_DAYS: 7,

  // Storage 버킷 이름
  LOG_BUCKET: 'bus-logs',
};

async function main() {
  console.log('🧹 Supabase 용량 정리 시작...\n');

  // 1. 현재 상태 확인
  await checkCurrentStatus();

  // 2. BusLocation 테이블 정리
  await cleanupBusLocations();

  // 3. Supabase Storage 로그 정리
  await cleanupStorageLogs();

  // 4. 정리 후 상태 확인
  console.log('\n📊 정리 후 상태:');
  await checkCurrentStatus();

  // Prisma 연결 종료
  await prisma.$disconnect();
}

/**
 * 현재 DB 상태 확인
 */
async function checkCurrentStatus() {
  console.log('📊 현재 DB 상태 확인 중...');

  // 각 테이블 레코드 수
  const busLocationCount = await prisma.busLocation.count();
  const busStopSeatsCount = await prisma.busStopSeats.count();
  const busRouteCount = await prisma.busRoute.count();
  const busStopCount = await prisma.busStop.count();
  const contactCount = await prisma.contact.count();

  console.log(`
┌─────────────────────────────────────────┐
│  테이블별 레코드 수                      │
├─────────────────────────────────────────┤
│  BusLocation    : ${String(busLocationCount).padStart(10)} 개     │
│  BusStopSeats   : ${String(busStopSeatsCount).padStart(10)} 개     │
│  BusRoute       : ${String(busRouteCount).padStart(10)} 개     │
│  BusStop        : ${String(busStopCount).padStart(10)} 개     │
│  Contact        : ${String(contactCount).padStart(10)} 개     │
└─────────────────────────────────────────┘
  `);

  // BusLocation 테이블 날짜별 분포
  const oldestLocation = await prisma.busLocation.findFirst({
    orderBy: { updatedAt: 'asc' },
    select: { updatedAt: true }
  });

  const newestLocation = await prisma.busLocation.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true }
  });

  if (oldestLocation && newestLocation) {
    console.log(`📅 BusLocation 데이터 범위:`);
    console.log(`   가장 오래된: ${oldestLocation.updatedAt.toLocaleString('ko-KR')}`);
    console.log(`   가장 최근:   ${newestLocation.updatedAt.toLocaleString('ko-KR')}`);
  }

  // Storage 용량 확인 (가능하면)
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (buckets) {
      console.log(`\n📦 Storage 버킷: ${buckets.map(b => b.name).join(', ')}`);
    }
  } catch {
    console.log('⚠️ Storage 정보를 가져올 수 없습니다.');
  }
}

/**
 * BusLocation 테이블 정리
 * 6시간 이상 된 데이터 삭제 (샘플링 로직 제거, 단순화)
 */
async function cleanupBusLocations() {
  console.log('\n🗑️ BusLocation 테이블 정리 중...');

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - CONFIG.BUS_LOCATION_RETENTION_HOURS);

  console.log(`   ${CONFIG.BUS_LOCATION_RETENTION_HOURS}시간 이상 된 데이터 삭제`);
  console.log(`   기준 시간: ${cutoffTime.toLocaleString('ko-KR')}`);

  // 삭제 대상 수 확인
  const toDeleteCount = await prisma.busLocation.count({
    where: {
      updatedAt: { lt: cutoffTime }
    }
  });

  console.log(`   삭제 대상: ${toDeleteCount}개`);

  if (toDeleteCount > 0) {
    // 배치 삭제 (한 번에 너무 많이 삭제하면 타임아웃 발생 가능)
    const batchSize = 10000;
    let totalDeleted = 0;

    while (totalDeleted < toDeleteCount) {
      const result = await prisma.busLocation.deleteMany({
        where: {
          updatedAt: { lt: cutoffTime }
        }
      });

      totalDeleted += result.count;
      console.log(`   진행: ${totalDeleted}/${toDeleteCount} 삭제됨`);

      if (result.count === 0) break;

      // 잠시 대기 (DB 부하 방지)
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`   ✅ 총 ${totalDeleted}개 삭제 완료`);
  } else {
    console.log('   ✅ 삭제할 데이터 없음');
  }
}

/**
 * Supabase Storage 로그 파일 정리
 */
async function cleanupStorageLogs() {
  console.log('\n🗑️ Storage 로그 파일 정리 중...');

  try {
    // 버킷의 폴더 목록 가져오기 (날짜별 폴더)
    const { data: folders, error } = await supabase.storage
      .from(CONFIG.LOG_BUCKET)
      .list('', { limit: 100 });

    if (error) {
      console.log(`   ⚠️ 로그 폴더 목록 조회 실패: ${error.message}`);
      return;
    }

    if (!folders || folders.length === 0) {
      console.log('   ✅ 로그 폴더 없음');
      return;
    }

    console.log(`   로그 폴더 수: ${folders.length}개`);

    // 보관 기간 기준 날짜
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.LOG_RETENTION_DAYS);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`   ${CONFIG.LOG_RETENTION_DAYS}일 이상 된 로그 삭제`);
    console.log(`   기준 날짜: ${cutoffDateStr}`);

    let deletedCount = 0;

    for (const folder of folders) {
      // 폴더 이름이 날짜 형식인 경우 (예: 2025-03-01)
      if (folder.name && folder.name < cutoffDateStr) {
        console.log(`   삭제 중: ${folder.name}/`);

        // 폴더 내 파일 목록
        const { data: files } = await supabase.storage
          .from(CONFIG.LOG_BUCKET)
          .list(folder.name);

        if (files && files.length > 0) {
          const filePaths = files.map(f => `${folder.name}/${f.name}`);

          const { error: deleteError } = await supabase.storage
            .from(CONFIG.LOG_BUCKET)
            .remove(filePaths);

          if (deleteError) {
            console.log(`   ⚠️ 삭제 실패: ${deleteError.message}`);
          } else {
            deletedCount += files.length;
          }
        }
      }
    }

    console.log(`   ✅ ${deletedCount}개 로그 파일 삭제 완료`);
  } catch (error) {
    console.log(`   ⚠️ Storage 정리 중 오류: ${error}`);
  }
}

// 실행
main().catch(console.error);
