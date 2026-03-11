'use client'

import React, { ReactNode } from 'react';
import { Star } from 'lucide-react';

// Props 타입을 정의하여 'any' 에러를 방지합니다.
interface CelestialFrameProps {
  children: ReactNode;
  className?: string;
}

export const CelestialBackground: React.FC = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0d0b1a]">
    <div className="geometric-bg absolute inset-0 opacity-40" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[800px] h-[800px] border border-[#c58e711a] rounded-full animate-orbit flex items-center justify-center">
         <div className="w-[600px] h-[600px] border border-[#c58e712a] rounded-full" />
      </div>
    </div>
  </div>
);

export const CelestialFrame: React.FC<CelestialFrameProps> = ({ children, className = "" }) => (
  <div className={`relative border border-[#c58e7133] m-1 p-6 ${className}`}>
    <Star className="absolute -top-1 -left-1 w-2 h-2 text-[#c58e71] animate-pulse" />
    <Star className="absolute -top-1 -right-1 w-2 h-2 text-[#c58e71] animate-pulse" />
    {children}
  </div>
);