/**
 * 버스 데이터 수집 스크립트
 * 
 * 사용법:
 *   npx tsx scripts/collectBusData.ts           # 지속 실행 모드 (로컬 개발용)
 *   npx tsx scripts/collectBusData.ts --single-run  # 단일 실행 모드 (GitHub Actions용)
 */
import { startOptimizedDataCollection } from "@/lib/api/busDataCollector";
import { collectBusLocationsOnce, cleanupOldData } from "@/lib/api/busDataService";
import { disconnectPrisma } from "@/lib/prisma/client";

// 명령줄 인자 파싱
const args = process.argv.slice(2);
const isSingleRun = args.includes('--single-run');

async function runSingleMode() {
  console.log("단일 실행 모드 시작...");
  
  try {
    // 데이터 수집
    const result = await collectBusLocationsOnce();
    
    console.log("수집 결과:", result);
    
    if (result.skipped) {
      console.log(`수집 건너뜀: ${result.skipped}`);
    } else if (result.success) {
      console.log(`수집 완료: ${result.collected}개 데이터 저장`);
      
      // 30% 확률로 오래된 데이터 정리
      if (Math.random() < 0.3) {
        console.log("오래된 데이터 정리 시작...");
        const cleanupResult = await cleanupOldData(6); // 6시간 보관
        console.log(`정리 완료: ${cleanupResult.deleted}개 데이터 삭제`);
      }
    } else {
      console.error("수집 실패:", result.message);
      process.exit(1);
    }
    
  } catch (error) {
    console.error("단일 실행 중 오류 발생:", error);
    process.exit(1);
  } finally {
    // Prisma 연결 종료
    await disconnectPrisma();
  }
  
  console.log("단일 실행 완료");
  process.exit(0);
}

async function runContinuousMode() {
  console.log("최적화된 버스 데이터 수집 스크립트 시작...");
  
  try {
    await startOptimizedDataCollection();
    console.log("최적화된 데이터 수집 서비스가 백그라운드에서 실행 중입니다.");
  } catch (error) {
    console.error("데이터 수집 시작 오류:", error);
    process.exit(1);
  }
}

// 메인 실행
if (isSingleRun) {
  runSingleMode();
} else {
  runContinuousMode();
  
  // 프로세스 종료 방지 (지속 실행 모드)
  process.stdin.resume();
  
  // 종료 신호 처리
  process.on("SIGINT", async () => {
    console.log("데이터 수집 종료 중...");
    await disconnectPrisma();
    process.exit(0);
  });
  
  process.on("SIGTERM", async () => {
    console.log("데이터 수집 종료 중...");
    await disconnectPrisma();
    process.exit(0);
  });
}
