'use client'

import React, { useState, ChangeEvent, useEffect } from 'react';
import { CelestialBackground, CelestialFrame } from '@/components/tarot/CelestialUI';
import { saveAiReading } from '@/app/actions/tarot';
import { Hexagon, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// 스텝 타입 정의
type Step = 'HOME' | 'QUESTION' | 'PICK' | 'RESULT';

// 로딩 문구 리스트
const LOADING_MESSAGES = [
  "밤하늘의 별들이 당신의 질문을 듣고 있습니다...",
  "운명의 실타래를 하나씩 풀고 있어요...",
  "클로토가 당신을 위한 조언을 준비 중입니다...",
  "행성의 정렬이 당신의 운명을 가리키고 있습니다...",
  "신비로운 카드의 목소리에 귀를 기울이는 중입니다..."
];

export default function TarotPage() {
  const [step, setStep] = useState<Step>('HOME'); 
  const [question, setQuestion] = useState<string>("");
  const [picked, setPicked] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [loadingIdx, setLoadingIdx] = useState(0);

  // 로딩 메시지 순환 효과
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      timer = setInterval(() => {
        setLoadingIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleQuestionChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setQuestion(e.target.value);
  };

  const handleFinalResult = async (): Promise<void> => {
    if (picked.length < 3) return;
    
    setIsLoading(true);
    try {
      const result = await saveAiReading({
        userId: "guest",
        question: question,
        selectedCards: picked.map((num, index) => ({
          number: num,
          position: index + 1,
          isReversed: Math.random() > 0.8 
        }))
      });

      if (result.success && result.answer) {
        setAiAnswer(result.answer);
        setStep('RESULT');
      } else {
        alert(result.error || "운명을 읽는 데 실패했습니다.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "알 수 없는 오류";
      console.error("처리 중 오류:", msg);
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0b1a] text-white relative font-sans overflow-x-hidden">
      {/* 배경 디자인 유지 */}
      <CelestialBackground />
      
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        <CelestialFrame className="w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl transition-all duration-700 border border-white/5">
          
          {/* [HOME STEP] */}
          {step === 'HOME' && (
            <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
              <Sparkles className="w-12 h-12 text-[#c58e71] mx-auto mb-6 opacity-80" />
              <h1 className="text-6xl font-extrabold mb-10 tracking-tighter bg-gradient-to-b from-[#c58e71] to-[#8a634f] bg-clip-text text-transparent">
                별의 목소리
              </h1>
              <p className="text-[#c58e7188] mb-12 tracking-[0.2em] font-light italic">VOICE OF THE CELESTIAL STARS</p>
              <button 
                onClick={() => setStep('QUESTION')} 
                className="px-12 py-4 bg-[#c58e71] text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#c58e7144]"
              >
                나의 운명 확인하기
              </button>
            </div>
          )}

          {/* [QUESTION STEP] */}
          {step === 'QUESTION' && (
            <div className="py-20 text-center space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-light text-[#c58e71]">어떤 고민이 당신을 찾아왔나요?</h2>
              <div className="max-w-lg mx-auto relative">
                <input 
                  value={question} 
                  onChange={handleQuestionChange}
                  className="w-full bg-transparent border-b-2 border-[#c58e7166] focus:border-[#c58e71] text-2xl p-3 outline-none text-center transition-all duration-500"
                  placeholder="고민을 여기에 적어주세요"
                  autoFocus
                />
              </div>
              <button 
                disabled={!question.trim()}
                onClick={() => setStep('PICK')} 
                className="mt-8 text-[#c58e71] hover:text-white transition-colors disabled:opacity-20 flex items-center mx-auto gap-2 group"
              >
                카드를 고르러 가기 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
              </button>
            </div>
          )}

          {/* [PICK STEP] */}
          {step === 'PICK' && (
            <div className="py-10 animate-in fade-in duration-700">
              <div className="text-center mb-12">
                <h2 className="text-2xl font-light text-[#c58e71] mb-2">
                  {isLoading ? "운명의 실타래를 푸는 중" : `카드를 3장 선택하세요 (${picked.length}/3)`}
                </h2>
                {isLoading && (
                  <p className="text-[#c58e7188] animate-pulse italic">
                    {LOADING_MESSAGES[loadingIdx]}
                  </p>
                )}
              </div>
              
              <div className={`flex gap-6 overflow-x-auto pb-12 no-scrollbar px-4 snap-x ${isLoading ? 'opacity-30 pointer-events-none scale-95 transition-all' : ''}`}>
                {Array.from({ length: 78 }).map((_, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      if (picked.length < 3 && !picked.includes(i)) {
                        setPicked([...picked, i]);
                      }
                    }}
                    className={`flex-shrink-0 w-32 h-56 border rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 snap-center
                      ${picked.includes(i) 
                        ? 'border-[#c58e71] bg-[#c58e7133] shadow-[0_0_20px_rgba(197,142,113,0.3)] -translate-y-6 scale-105' 
                        : 'border-[#c58e7122] bg-slate-800/20 hover:border-[#c58e7166] hover:-translate-y-2'}`}
                  >
                    {picked.includes(i) ? (
                      <div className="text-center">
                        <div className="text-4xl font-bold text-[#c58e71]">{picked.indexOf(i) + 1}</div>
                        <div className="text-[10px] uppercase tracking-widest text-[#c58e7188] mt-1">Chosen</div>
                      </div>
                    ) : (
                      <Hexagon className="w-8 h-8 opacity-20 text-[#c58e71]" />
                    )}
                  </div>
                ))}
              </div>

              <button 
                disabled={picked.length < 3 || isLoading}
                onClick={handleFinalResult} 
                className={`mt-10 block mx-auto px-12 py-4 border-2 border-[#c58e71] text-[#c58e71] rounded-full font-bold transition-all
                  ${(picked.length < 3 || isLoading) ? 'opacity-20 grayscale' : 'hover:bg-[#c58e71] hover:text-black shadow-lg shadow-[#c58e7122]'}`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> 운명을 읽는 중...
                  </span>
                ) : "결과 확인 및 운명 저장"}
              </button>
            </div>
          )}

          {/* [RESULT STEP] - 가독성 강화 버전 */}
          {step === 'RESULT' && (
            <div className="py-10 px-4 md:px-10 animate-in zoom-in-95 duration-700 w-full">
              <div className="text-center mb-10">
                <Sparkles className="w-8 h-8 text-[#c58e71] mx-auto mb-4 opacity-60" />
                <h2 className="text-[#c58e71] text-3xl font-bold italic tracking-wider">
                  별이 전하는 운명의 조언
                </h2>
                <div className="w-24 h-px bg-gradient-to-r from-transparent via-[#c58e7166] to-transparent mx-auto mt-4" />
              </div>

              {/* 가독성을 극대화한 결과 박스 */}
              <div className="bg-slate-900/40 border border-[#c58e7122] p-8 md:p-12 rounded-2xl shadow-inner backdrop-blur-md max-w-3xl mx-auto">
                <div className="prose prose-invert prose-p:leading-relaxed prose-p:text-gray-300 prose-headings:text-[#c58e71] prose-strong:text-white prose-li:text-gray-300 prose-headings:border-b prose-headings:border-[#c58e7122] prose-headings:pb-2 max-w-none">
                  <ReactMarkdown>
                    {aiAnswer}
                  </ReactMarkdown>
                </div>
              </div>

              {/* 하단 제어 영역 */}
              <div className="mt-12 flex flex-col items-center gap-6">
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-10 py-3 bg-gradient-to-r from-[#c58e7122] to-[#c58e7111] border border-[#c58e7166] rounded-full text-[#c58e71] hover:bg-[#c58e71] hover:text-black transition-all duration-500 font-bold"
                >
                  새로운 운명 물어보기
                </button>
                <p className="text-[#c58e7144] text-xs tracking-widest uppercase">
                  Your destiny is written in the stars
                </p>
              </div>
            </div>
          )}

        </CelestialFrame>
      </main>
    </div>
  );
}