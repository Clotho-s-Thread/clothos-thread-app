'use server'

import { prisma } from "@/lib/prisma";

// 1. 인터페이스 정의 - API(route.ts)와 속성명을 'number'로 통일
interface SelectedCardInput {
  number: number;      // cardNumber 대신 number 사용
  position: number;
  isReversed: boolean;
}

interface SaveAiReadingParams {
  userId: string;
  question: string;
  selectedCards: SelectedCardInput[];
}

interface SaveAiReadingResponse {
  success: boolean;
  answer?: string;
  error?: string;
}

export async function saveAiReading({
  userId,
  question,
  selectedCards
}: SaveAiReadingParams): Promise<SaveAiReadingResponse> {
  try {
    // 2. AI API 호출 (API 내부에서 DB 저장이 수행됨)
    const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/tarot/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: "user", content: question }],
        selectedCards: selectedCards // page.tsx에서 이미 형식을 맞춰서 보냄
      }),
    });

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      throw new Error(errorData.error || 'AI 서버 응답 오류가 발생했습니다.');
    }

    const aiData = await aiResponse.json();
    
    // 3. 중복 저장 방지: 여기서 prisma.reading.create를 중복으로 호출하지 않습니다.
    // 결과값(answer)만 추출하여 클라이언트에 전달합니다.
    return { 
      success: true, 
      answer: aiData.text 
    };

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    console.error("최종 처리 오류:", errorMessage);
    return { success: false, error: errorMessage };
  }
}