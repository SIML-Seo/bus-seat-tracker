import { startOptimizedDataCollection } from "@/lib/api/busDataCollector";

console.log("최적화된 버스 데이터 수집 스크립트 시작...");

startOptimizedDataCollection()
  .then(() => {
    console.log("최적화된 데이터 수집 서비스가 백그라운드에서 실행 중입니다.");
  })

  .catch((error) => {
    console.error("데이터 수집 시작 오류:", error);

    process.exit(1);
  });
  
// 프로세스 종료 방지

process.stdin.resume();

// 종료 신호 처리

process.on("SIGINT", async () => {
  console.log("데이터 수집 종료 중...");

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("데이터 수집 종료 중...");

  process.exit(0);
});
