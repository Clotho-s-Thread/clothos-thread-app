import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse'; 
import { TarotCard } from "@prisma/client"; // Prisma가 생성한 타입 사용

// 1. 데이터 타입 정의
interface SelectedCardInput {
  number: number;
  isReversed: boolean;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  selectedCards?: (number | SelectedCardInput)[];
}

type TrainingExample = {
  text_input: string;
  output: string;
};

// ------------------------------------------------------------------
// [1] CSV 데이터 로딩 함수
// ------------------------------------------------------------------
let cachedExamples: TrainingExample[] | null = null;

function getRandomExamples(examples: TrainingExample[], count: number): string {
  if (!examples || examples.length === 0) return "";
  const shuffled = [...examples].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map((ex, i) => 
    `예시 ${i + 1})\n사용자: "${ex.text_input}"\n클로토: "${ex.output}"`
  ).join("\n\n");
}

function getFewShotExamples(): string {
  try {
    if (cachedExamples) {
      return getRandomExamples(cachedExamples, 5); 
    }

    const csvPath = path.join(process.cwd(), 'data.csv');
    if (!fs.existsSync(csvPath)) return "";

    const csvFile = fs.readFileSync(csvPath, 'utf8');
    const parsed = Papa.parse<TrainingExample>(csvFile, {
      header: true,
      skipEmptyLines: true,
    });

    cachedExamples = parsed.data;
    return getRandomExamples(cachedExamples, 5); 

  } catch (error) {
    console.error("❌ CSV 로딩 실패:", error);
    return "";
  }
}

// ------------------------------------------------------------------
// [2] API 핸들러
// ------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    const { messages, selectedCards } = body;
    const lastMessage = messages[messages.length - 1]?.content || "";
    
    const apiKey = process.env.GOOGLE_API_KEY!;
    if (!apiKey) throw new Error("GOOGLE_API_KEY가 설정되지 않았습니다.");
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const fewShotExamples = getFewShotExamples();

    const CLOTHO_PERSONA = `
[Role]
당신은 운명의 실을 잣는 신비로운 타로 마스터 '클로토(Clotho)'입니다... (중략)
[Learning Examples]
${fewShotExamples}
`;

    const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", // 최신 모델 권장
        systemInstruction: CLOTHO_PERSONA, 
        generationConfig: { temperature: 0.8, maxOutputTokens: 2000 }
    });

    // 유저 확인 및 생성
    let testUser = await prisma.user.findFirst({ where: { name: "TestGuest" } });
    if (!testUser) {
        testUser = await prisma.user.create({ data: { name: "TestGuest", email: "guest@example.com" } });
    }
    const currentUserId = testUser.id;

    let userContextPrompt = "";
    let cardsFromDB: TarotCard[] = []; 
    
    if (selectedCards && selectedCards.length > 0) {
        const cardNumbers = selectedCards.map(c => typeof c === 'number' ? c : c.number);
        
        cardsFromDB = await prisma.tarotCard.findMany({
            where: { number: { in: cardNumbers } }
        });

        const cardInfoText = selectedCards.map((selectedCard, index) => {
            const cardNumber = typeof selectedCard === 'number' ? selectedCard : selectedCard.number;
            const isReversed = typeof selectedCard === 'number' ? false : selectedCard.isReversed;

            const cardData = cardsFromDB.find(c => c.number === cardNumber);
            if (!cardData) return "";

            const directionStr = isReversed ? "역방향 (Reversed)" : "정방향 (Upright)";
            const meaningText = isReversed ? cardData.meaningRev : cardData.meaningUp;

            return `## ${index + 1}번째 카드: ${cardData.nameKo} (${cardData.name}) - [${directionStr}]\n- 적용될 의미: ${meaningText}\n- 이미지 묘사: ${cardData.imageUrl}`;
        }).join("\n\n");

        userContextPrompt = `
        [상황 정보]
        사용자가 뽑은 카드 정보는 아래와 같습니다. 카드의 방향에 맞는 의미를 중심으로 해석하세요.
        ${cardInfoText}
        [사용자 질문] "${lastMessage}"
        `;
    } else {
        userContextPrompt = `[상황] 사용자와의 일반적인 대화 상황입니다.`;
    }

    // 채팅 세션 시작
    const chatSession = model.startChat({
        history: [
            { role: "user", parts: [{ text: "SYSTEM_CONTEXT: " + userContextPrompt }] },
            { role: "model", parts: [{ text: "네, 운명의 흐름을 읽을 준비가 되었습니다." }] },
            ...messages.slice(0, -1).map(m => ({
                role: m.role === 'user' ? ('user' as const) : ('model' as const),
                parts: [{ text: m.content }]
            }))
        ]
    });
    
    const result = await chatSession.sendMessage(lastMessage);
    const aiResponse = result.response.text();

    // DB 저장 로직 (질문자님의 ReadingCard 구조 반영)
    if (selectedCards && selectedCards.length > 0 && cardsFromDB.length > 0) {
        await prisma.reading.create({
    data: {
        userId: currentUserId,
        question: lastMessage,
        fullAnswer: aiResponse,
        spreadType: "three-card",
        cards: {
            create: selectedCards.map((selectedCard, idx) => {
                const cardNumber = typeof selectedCard === 'number' ? selectedCard : selectedCard.number;
                const isReversed = typeof selectedCard === 'number' ? false : selectedCard.isReversed;
                const cardData = cardsFromDB.find(c => c.number === cardNumber);
                
                    return {
                        position: idx + 1,
                        orientation: isReversed ? "reversed" : "upright",
                            card: {
                                connect: { 
                                // 에러 메시지에 따라 id와 number를 모두 제공합니다.
                                id: cardData?.id ?? 0, 
                                number: cardNumber 
                                }
                            }
                        };
                    })
                }
            }
        });
    }

    return NextResponse.json({ text: aiResponse });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "알 수 없는 서버 오류";
    console.error("Critical Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}