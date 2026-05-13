"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  Search, 
  Calculator, 
  TrendingUp, 
  ArrowRight, 
  Lock,
  BarChart3
} from "lucide-react";

const SERVICES = [
  {
    title: "적정 주가 분석",
    description: "알고리즘 기반 정밀 밸류에이션을 통해 기업의 본질 가치를 산출합니다.",
    icon: Search,
    link: "/search",
    highlight: true // 강조된 카드
  },
  {
    title: "수익률 계산기",
    description: "복리 및 거래 비용을 시뮬레이션하여 실제 순수익을 예측합니다.",
    icon: Calculator,
    link: "/calculator",
  },
  {
    title: "퀀트 종목 추천",
    description: "NCAV 전략과 마켓 데이터를 결합한 최적의 포트폴리오를 제공합니다.",
    icon: BarChart3,
    link: "/algorithm-trade",
    requiresAuth: true
  }
];

export default function ModernHomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans selection:bg-blue-500 selection:text-white">
      {/* [Hero Section] */}
      <header className="relative pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                Idiot Quant v3.0
              </span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
              Data-Driven<br />
              <span className="text-zinc-400 dark:text-zinc-600">Investment Intelligence.</span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-zinc-500 dark:text-zinc-400 text-xl font-medium leading-relaxed mb-10">
              복잡한 지표 속에서 명확한 투자 기회를 발견하세요. <br className="hidden md:block" />
              전문적인 퀀트 분석 도구가 직관적인 대시보드로 제공됩니다.
            </p>

            {/* <div className="flex flex-wrap justify-center gap-4">
              <Link href="/search" className="px-8 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold hover:scale-105 transition-transform">
                시작하기
              </Link>
              <Link href="/about" className="px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                서비스 소개
              </Link>
            </div> */}
          </motion.div>
        </div>

        {/* 배경 그라데이션 오로라 효과 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-500/10 blur-[120px] rounded-full" />
          <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
        </div>
      </header>

      {/* [Service Section] */}
      <main className="max-w-7xl mx-auto px-6 pb-40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
              >
                <Link href={service.link} className="group block h-full">
                  <div className={`relative h-full p-8 rounded-3xl border transition-all duration-300 ${
                    service.highlight 
                    ? "bg-white dark:bg-zinc-900 border-blue-500 shadow-2xl shadow-blue-500/10" 
                    : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 shadow-sm"
                  }`}>
                    
                    <div className="flex justify-between items-start mb-12">
                      <div className={`p-4 rounded-2xl ${
                        service.highlight ? "bg-blue-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      }`}>
                        <Icon size={24} strokeWidth={2} />
                      </div>
                      
                      {service.requiresAuth && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                          <Lock size={12} className="text-amber-600 dark:text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-tighter">Pro</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 group-hover:text-blue-500 transition-colors">
                      {service.title}
                      <ArrowRight size={20} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h3>
                    
                    <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                      {service.description}
                    </p>

                    {/* 하단 장식용 미니 차트 (옵션) */}
                    <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Efficiency 99%</span>
                      <TrendingUp size={16} className="text-zinc-300 dark:text-zinc-700" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* [Simple Footer] */}
      <footer className="py-20 border-t border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-black tracking-tighter">IDIOT QUANT</span>
            <p className="text-sm text-zinc-500 font-medium">데이터는 거짓말을 하지 않습니다.</p>
          </div>
          {/* <div className="flex gap-8 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Contact</Link>
          </div> */}
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.4em]">
            © 2026 IDIOT QUANT
          </p>
        </div>
      </footer>
    </div>
  );
}