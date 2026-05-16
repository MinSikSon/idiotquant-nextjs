"use client";

import React from "react";
import { 
  Globe, 
  Shield, 
  Zap, 
  Layers, 
  Trophy 
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
      // 🔥 StockCard 고도화에 대응하는 가이드 전용 시뮬레이션 차트 데이터
      chartConfig: {
        data: [72000, 73500, 75000, 74200, 76500, 78500],
        categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
        color: "#6366f1"
      },
      badge: "KOSPI TYPE",
      title: "정밀한 내재가치 산출",
      desc: "NCAV와 S-RIM 알고리즘을 통해 시장의 소음에서 벗어난 기업의 진짜 가치를 계산합니다.",
      icon: <Layers className="w-4 h-4" />
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
      // 🔥 StockCard 고도화에 대응하는 가이드 전용 시뮬레이션 차트 데이터
      chartConfig: {
        data: [175.5, 182.1, 180.4, 189.9, 192.3, 195.2],
        categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
        color: "#818cf8"
      },
      badge: "NASDAQ TYPE",
      title: "글로벌 마켓 통합",
      desc: "미국 주요 티커를 실시간으로 분석하여 한국 주식과 동일한 잣대로 투자 기회를 발굴합니다.",
      icon: <Globe className="w-4 h-4" />
    },
    {
      stock: {
        isUs: false,
        name: "NCAV 전략",
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
      // 🔥 StockCard 고도화에 대응하는 가이드 전용 시뮬레이션 차트 데이터
      chartConfig: {
        data: [100000, 250000, 430000, 610000, 850000, 999999],
        categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
        color: "#6366f1"
      },
      badge: "ULTRA RARE",
      title: "청산가치 절대 저평가",
      desc: "벤자민 그레이엄의 방식대로 기업이 당장 문을 닫아도 주주에게 돌아갈 현금 가치를 계산하여 승률을 극대화합니다.",
      icon: <Trophy className="w-4 h-4" />
    },
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-4 md:pt-16 md:pb-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 overflow-hidden">

      {/* 1. Hero Section */}
      <header className="flex flex-col items-center text-center mb-24 space-y-8 relative">
        <div className="absolute -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -z-10 animate-pulse" />

        <div className="group inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white dark:bg-zinc-900 border-2 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all hover:scale-105">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.4em]">
            IDIOTQUANT System v1.0 Online
          </span>
        </div>

        <h1 className="text-[2.6rem] md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-tight break-keep">
          <span className="block md:inline font-serif italic">The Art of</span>
          <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 drop-shadow-sm">
            Value Collecting
          </span>
        </h1>

        <p className="text-zinc-500 dark:text-zinc-400 text-lg md:text-2xl max-w-2xl break-keep font-bold leading-relaxed">
          종목명을 검색하여 당신의 포트폴리오를 구성할<br className="hidden md:block" />
          전설적인 <span className="text-zinc-900 dark:text-white underline decoration-blue-500 underline-offset-4">퀀트 카드</span>를 수집해 보세요.
        </p>
      </header>

      {/* 2. Feature Section */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-10 w-full relative">
        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent -z-10 hidden lg:block" />

        {guides.map((item, i) => (
          <div key={i} className="flex flex-col items-center group">
            <div className="relative transform transition-all duration-700 group-hover:-translate-y-10 group-hover:scale-105">
              {/* 🔥 최신 StockCard 규격에 맞춰 chartConfig 주입 */}
              <StockCard stock={item.stock} chartConfig={item.chartConfig} />

              {/* Grade Aura Effect: 등급별 색상 대응 */}
              <div className={cn(
                "absolute -z-10 inset-0 blur-[100px] rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-1000",
                item.stock.grade === 'SSS' ? 'bg-pink-500' : 
                item.stock.grade === 'SS' ? 'bg-yellow-400' : 'bg-cyan-400'
              )} />
            </div>

            <div className="mt-12 w-full max-w-[320px] p-7 rounded-[2rem] bg-white dark:bg-zinc-900 border-b-8 border-zinc-200 dark:border-zinc-800 shadow-2xl group-hover:border-blue-500 transition-all duration-500 group-hover:shadow-blue-500/10">
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4",
                item.stock.isUs ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
              )}>
                {item.icon}
                {item.badge}
              </div>
              <h3 className="text-zinc-900 dark:text-zinc-100 font-black text-2xl mb-3 italic tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep font-medium">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* 3. Footer Section */}
      <footer className="mt-40 w-full flex flex-col items-center space-y-10">
        <div className="flex items-center justify-center gap-8 w-full">
          <div className="h-px w-24 bg-gradient-to-l from-zinc-300 dark:from-zinc-700 to-transparent" />
          <div className="flex gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            ))}
          </div>
          <div className="h-px w-24 bg-gradient-to-r from-zinc-300 dark:from-zinc-700 to-transparent" />
        </div>

        <div className="text-center space-y-4 bg-zinc-50 dark:bg-zinc-900/50 px-12 py-10 rounded-[3rem] border border-zinc-200 dark:border-zinc-800 transition-all hover:border-blue-500/50 group">
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.5em] flex items-center justify-center gap-2 group-hover:text-blue-500 transition-colors">
            <Zap className="w-3 h-3 fill-current" />
            Quant Intelligence Platform
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 opacity-60">
            <Globe className="w-4 h-4 text-zinc-400" />
            <p className="text-zinc-500 text-xs font-black italic tracking-tighter">
              © 2026 IDIOTQUANT • NO RISK NO ALPHA
            </p>
            <Shield className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      </footer>
    </div>
  );
};