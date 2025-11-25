// app/api/users/route.ts

// 1번 파일에서 만든 DB 연결 객체(prisma)를 불러옵니다.
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server"; // Next.js에서 응답을 생성하는 객체

// POST 요청 처리 함수 (사용자 생성)
export async function POST(request: Request) {
  try {
    // 1. 요청 본문(Body)에서 데이터 추출
    const body = await request.json();
    // 이메일과 이름을 body에서 구조 분해 할당
    const { email, name } = body; 

    if (!email) {
      // 이메일이 없을 경우 400 Bad Request 에러 응답
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
  }
}