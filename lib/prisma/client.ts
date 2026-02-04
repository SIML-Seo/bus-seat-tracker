import { PrismaClient } from '@prisma/client';

// 싱글톤 패턴으로 Prisma 클라이언트 생성
// 서버리스 환경에서도 연결 풀을 효율적으로 관리
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// PrismaClient에는 연결 풀 설정을 직접적으로 지정할 수 없음
// log 옵션만 설정하고, 실제 연결 풀은 .env나 schema.prisma에서 관리
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.DEBUG?.includes('prisma') 
    ? ['query', 'error', 'warn'] 
    : ['error'],
});

// 프로덕션에서도 싱글톤 적용 (이전에는 개발 환경에서만 적용)
// 서버리스 환경에서 연결 관리 개선
globalForPrisma.prisma = prisma;

// Prisma 클라이언트 종료 함수 (필요시 사용)
// Node.js 프로세스 종료 전에 호출하면 좋음
export const disconnectPrisma = async () => {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }
};

export default prisma;
