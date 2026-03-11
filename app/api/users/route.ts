// app/api/users/route.ts

// [수정 1] lib/prisma.ts에서 Named Export로 바뀐 prisma 객체와 disconnectPrisma 함수를 불러옵니다.
import { prisma, disconnectPrisma } from "@/lib/prisma"; 
import { NextResponse } from "next/server"; 

// POST 요청 처리 함수 (사용자 생성)
export async function POST(request: Request) {
  try {
    // 1. 요청 본문(Body)에서 데이터 추출
    const body = await request.json();
    const { email, name } = body; 

    if (!email) {
      return NextResponse.json(
        { message: "Email is required." },
        { status: 400 }
      );
    }

    // 2. Prisma를 사용하여 DB에 새로운 사용자 레코드를 생성
    const newUser = await prisma.user.create({
      data: {
        email: email,
        name: name,
      },
    });

    // 3. 성공 응답 반환 (201 Created)
    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("User creation failed:", error);
    // 4. 오류 발생 시 500 Internal Server Error 응답
    return NextResponse.json(
      { message: "Failed to create user." },
      { status: 500 }
    );
  } finally {
      // [수정 2] 작업이 끝나면 DB 연결을 강제로 끊어줍니다. (앱 500 에러 해결의 핵심)
      await disconnectPrisma(); 
  }
}

// GET 요청 처리 함수 (사용자 목록 조회용)
export async function GET() {
  try {
    const users = await prisma.user.findMany();
    return NextResponse.json(users, { status: 200 }); 
  } catch (error) {
    console.error("User fetching failed:", error);
    return NextResponse.json(
      { message: "Failed to fetch users." },
      { status: 500 }
    );
  } finally {
      // GET 요청도 끝나면 연결을 끊어줍니다.
      await disconnectPrisma(); 
  }
}