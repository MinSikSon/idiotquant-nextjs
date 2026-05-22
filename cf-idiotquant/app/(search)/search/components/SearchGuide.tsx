"use client";

import React from "react";
import { 
  Globe, 
  Shield, 
  Zap, 
  Layers, 
  Trophy,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { StockCard } from "./StockCard";
import { cn } from "@/lib/utils";

export const SearchGuide = () => {
  const guides = [
    {
      stock: {
        isUs: false,
        name: "삼성전자",
        sector: "CHIP",
        ticker: "005930",
        grade: "S",
        curPrice: 78500,
        per: 12.5,
        pbr: 1.4,
        ncavScore: 0.85,
        debtRatio: 15.2,
        isGuide: true
      },
      chartConfig: {
        data: [72000, 73500, 75000, 74200, 76500, 78500],
        categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
        color: "#3b82f6"
      },
      badge: "KOSPI BLUE-CHIP",
      title: "정밀한 내재가치 산출",
      desc: "NCAV와 S-RIM 알고리즘을 유기적으로 결합하여, 시장의 단기적 소음과 왜곡에서 완전히 벗어난 기업의 진짜 물리적 가치를 계산합니다.",
      icon: <Layers className="w-3.5 h-3.5" />
    },
    {
      stock: {
        isUs: true,
        name: "Apple Inc.",
        sector: "CHIP",
        ticker: "AAPL",
        grade: "SS",
        curPrice: 195.2,
        per: 28.4,
        pbr: 35.2,
        ncavScore: 0.92,
        debtRatio: 8.5,
        isGuide: true
      },
      chartConfig: {
        data: [175.5, 182.1, 180.4, 189.9, 192.3, 195.2],
        categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
        color: "#818cf8"
      },
      badge: "NASDAQ PRESTIGE",
      title: "글로벌 마켓 통합 스크리닝",
      desc: "미국 시장의 주요 티커를 실시간 데이터 파이프라인으로 분석하여, 환율과 회계 기준을 보정한 동일한 계량 잣대로 투자 기회를 발굴합니다.",
      icon: <Globe className="w-3.5 h-3.5" />
    },
    {
      stock: {
        isUs: false,
        name: "NCAV 절대 전략",
        sector: "FLOW",
        ticker: "QUANT",
        grade: "SSS",
        curPrice: 999999,
        per: 3.2,
        pbr: 0.4,
        ncavScore: 0.99,
        debtRatio: 0.1,
        isGuide: true
      },
      chartConfig: {
        data: [100000, 250000, 430000, 610000, 850000, 999999],
        categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
        color: "#ec4899"
      },
      badge: "ULTRA RARE TARGET",
      title: "청산가치 절대 저평가",
      desc: "벤자민 그레이엄의 정통 원칙 그대로, 기업이 당장 영업을 중단하고 문을 닫아도 주주에게 돌아갈 순현금 가치를 추산하여 승률을 극대화합니다.",
      icon: <Trophy className="w-3.5 h-3.5" />
    },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 md:pt-24 md:pb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 overflow-hidden selection:bg-blue-500/20">
      
      {/* 1. Hero Section */}
      <header className="flex flex-col items-center text-center mb-28 space-y-6 relative w-full">
        {/* 뒤쪽 무드 라이트 이펙트 */}
        <div className="absolute -top-32 w-72 h-72 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full blur-[120px] -z-10 animate-pulse" />
        <div className="absolute top-12 w-96 h-32 bg-indigo-500/5 rounded-full blur-[100px] -z-10" />

        {/* 시스템 상태 칩 배지 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm backdrop-blur-md transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em] font-mono">
            IDIOTQUANT Engine v1.0 Live
          </span>
        </div>

        {/* 메인 헤드라인 메세지 */}
        {/* <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-[1.05] font-sans">
          <span className="block text-xl sm:text-2xl md:text-3xl font-serif italic text-zinc-400 dark:text-zinc-500 tracking-normal font-normal mb-2 md:mb-4">
            The Algorithmic Art of
          </span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-500 dark:from-white dark:via-zinc-200 dark:to-zinc-500 drop-shadow-xs">
            Value Collecting
          </span>
        </h1> */}
        <h1 className="text-[2.6rem] md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-tight break-keep">
          <span className="block md:inline font-serif italic">The Algorithmic Art of</span>
          <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 drop-shadow-sm">
            Value Collecting
          </span>
        </h1>

        {/* 서브 설명 메세지 */}
        <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg md:text-xl max-w-2xl break-keep font-medium leading-relaxed pt-2">
          상단 검색창에 종목명이나 티커를 입력해 보세요. <br className="hidden sm:block" />
          당신의 포트폴리오를 철통방어할 전설적인 
          <span className="mx-1.5 text-zinc-900 dark:text-white font-bold underline decoration-blue-500 decoration-2 underline-offset-4 bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
            퀀트 카드 <Sparkles className="w-3 h-3 text-blue-500 fill-blue-500" />
          </span>
          를 실시간으로 수집할 수 있습니다.
        </p>
      </header>

      {/* 2. Feature Section (Grid Stage) */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-8 w-full relative px-2">
        {/* 가로 지평선 테두리 디자인 데코 */}
        <div className="absolute top-[180px] left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800/80 to-transparent -z-20 hidden lg:block" />

        {guides.map((item, i) => (
          <div key={i} className="flex flex-col items-center group relative">
            
            {/* 카드 배치 스테이지 영역 */}
            <div className="relative w-full flex justify-center transform transition-all duration-500 ease-out group-hover:-translate-y-8 group-hover:scale-[1.03] z-10">
              <StockCard stock={item.stock} chartConfig={item.chartConfig} />

              {/* 등급 오라 백라이트 인텐시티 강화 */}
              <div className={cn(
                "absolute -z-10 inset-0 blur-[90px] rounded-full opacity-0 group-hover:opacity-35 transition-opacity duration-700 pointer-events-none scale-75",
                item.stock.grade === 'SSS' ? 'bg-gradient-to-tr from-pink-500 to-purple-600' : 
                item.stock.grade === 'SS' ? 'bg-gradient-to-tr from-amber-400 to-orange-500' : 'bg-gradient-to-tr from-blue-400 to-cyan-500'
              )} />
            </div>

            {/* 카드 설명 상세 컴포넌트 팩 */}
            <div className="mt-10 w-full max-w-[325px] p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 border-b-4 border-b-zinc-300 dark:border-b-zinc-800 shadow-xl group-hover:border-zinc-300 dark:group-hover:border-zinc-700 group-hover:border-b-blue-500 dark:group-hover:border-b-indigo-500 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-blue-500/5">
              
              {/* 메타 배지 */}
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-4 font-mono",
                item.stock.isUs 
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30' 
                  : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30'
              )}>
                {item.icon}
                {item.badge}
              </div>

              {/* 기능 타이틀 */}
              <h3 className="text-zinc-900 dark:text-zinc-100 font-extrabold text-xl mb-2 tracking-tight flex items-center justify-between group-hover:text-blue-500 dark:group-hover:text-indigo-400 transition-colors">
                {item.title}
                <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-zinc-400" />
              </h3>

              {/* 기능 디스크립션 */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep font-medium tracking-wide">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Footer Section */}
      <footer className="mt-44 w-full flex flex-col items-center space-y-8">
        
        {/* 데코레이션 디바이더 라인 */}
        <div className="flex items-center justify-center gap-6 w-full opacity-60">
          <div className="h-px w-20 bg-gradient-to-l from-zinc-300 dark:from-zinc-800 to-transparent" />
          <div className="flex gap-2.5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-800" />
            ))}
          </div>
          <div className="h-px w-20 bg-gradient-to-r from-zinc-300 dark:from-zinc-800 to-transparent" />
        </div>

        {/* 시스템 저작권 푸터 보드 */}
        <div className="text-center space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-xs px-10 py-6 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700/80 group">
          <p className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.4em] flex items-center justify-center gap-1.5 group-hover:text-blue-500 dark:group-hover:text-indigo-400 transition-colors">
            <Zap className="w-3 h-3 fill-current text-amber-500" />
            Quant Intelligence Platform
          </p>
          
          <div className="flex items-center justify-center gap-4 text-[11px] text-zinc-400 dark:text-zinc-600">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <p className="font-bold font-mono tracking-tighter opacity-80">
              © 2026 IDIOTQUANT • NO RISK NO ALPHA
            </p>
            <Layers className="w-3.5 h-3.5 shrink-0" />
          </div>
        </div>
      </footer>
    </div>
  );
};