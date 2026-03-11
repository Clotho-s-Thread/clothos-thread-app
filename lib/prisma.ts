// lib/prisma.ts

// 아래 경로 중 하나를 시도해 보세요. (보통 첫 번째가 Next.js에서 잘 됩니다.)
import { PrismaClient } from "@prisma/client";

// 만약 위 코드가 안 되면 상대 경로로 적어야 합니다.
// import { PrismaClient } from "../app/generated/prisma";

// Next.js 개발 환경에서 Hot Reloading 시 여러 PrismaClient 인스턴스가 
// 생성되는 것을 방지하기 위해 글로벌 객체에 저장하여 재사용합니다.
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// [수정] export default로 내보내던 방식 대신 named export를 유지하고,
// Next.js API의 import 방식에 맞게 'prisma' 객체를 내보냅니다.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // DB 쿼리가 실행될 때 콘솔에 로그를 출력하여 확인하기 위해 설정합니다.
    log: ["query", "error", "warn"], 
  });


// [추가] 연결 끊기 함수 정의: API 요청 처리가 완료된 후 DB 연결을 명시적으로 끊어줍니다.
// 이 함수가 POST/GET 요청의 finally 블록에서 호출되어 500 에러를 방지합니다.
export async function disconnectPrisma() {
    if (globalForPrisma.prisma) {
        await globalForPrisma.prisma.$disconnect();
        // 연결이 끊어진 후 다시 연결될 수 있도록 객체를 undefined로 설정합니다.
        globalForPrisma.prisma = undefined;
    }
}


if (process.env.NODE_ENV !== "production") {
    // 개발 환경에서는 글로벌 객체에 prisma 객체를 할당하여 재사용합니다.
    globalForPrisma.prisma = prisma;
}