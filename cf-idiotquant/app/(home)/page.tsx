"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Icon,
  H2,
  Intent,
  Tag
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

// BlueprintJS CSS
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

const SERVICE_CARDS = [
  {
    title: "적정 주가 분석",
    description: "기업의 재무제표를 바탕으로 알고리즘이 계산한 본질 가치를 확인하세요.",
    icon: IconNames.SEARCH,
    theme: "from-blue-400 to-indigo-500",
    innerBg: "bg-blue-50",
    border: "border-blue-200",
    tag: "WATER TYPE",
    hp: "900",
    link: "/search"
  },
  {
    title: "수익률 계산기",
    description: "복리 효과와 수수료를 고려하여 실제 내 자산이 얼마나 불어날지 시뮬레이션합니다.",
    icon: IconNames.CALCULATOR,
    theme: "from-emerald-400 to-teal-500",
    innerBg: "bg-emerald-50",
    border: "border-emerald-200",
    tag: "GRASS TYPE",
    hp: "750",
    link: "/calculator"
  },
  {
    title: "종목 추천",
    description: "NCAV 전략을 기반으로 현재 시장에서 가장 안전마진이 높은 종목을 추천합니다.",
    icon: IconNames.FILTER_LIST,
    theme: "from-amber-300 via-yellow-400 to-orange-500",
    innerBg: "bg-amber-50",
    border: "border-amber-300",
    tag: "GOLD RARE",
    hp: "MAX",
    link: "/algorithm-trade",
    requiresAuth: true
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#0c0c0e] text-zinc-900 dark:text-zinc-100 font-sans">
      {/* [Hero Section] */}
      <header className="relative pt-24 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <Tag large minimal round intent={Intent.PRIMARY} className="mb-8 !px-8 py-2 font-black tracking-[0.4em] shadow-sm">
              IDIOT QUANT v3.0
            </Tag>
            <H2 className="!text-6xl md:!text-8xl !font-black !tracking-tighter mb-8 dark:!text-white">
              Gotta Catch All<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-yellow-400 dark:to-orange-500 italic">
                The Alpha.
              </span>
            </H2>
            <p className="max-w-2xl mx-auto text-zinc-500 dark:text-zinc-400 text-xl font-bold leading-relaxed">
              복잡한 데이터의 숲에서 전설의 종목을 찾아내세요.<br />
              감정 없는 알고리즘이 당신의 마스터볼이 되어줍니다.
            </p>
          </motion.div>
        </div>

        {/* 배경 장식: 에너지 볼 느낌 */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full blur-[160px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-400 rounded-full blur-[160px] animate-pulse delay-700" />
        </div>
      </header>

      {/* [Pokemon Card Grid] */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {SERVICE_CARDS.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              whileHover={{ y: -20 }}
            >
              <Link href={service.link} className="no-underline hover:no-underline group">
                {/* 카드 외곽 프레임 (금색/테마색 테두리) */}
                <div className={`relative p-3 rounded-[2rem] bg-gradient-to-br ${service.theme} shadow-xl transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] overflow-hidden`}>

                  {/* 홀로그램 광택 레이어 */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10 pointer-events-none bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.4)_40%,transparent_60%)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]" />

                  {/* 카드 내부 본체 */}
                  <div className={`relative bg-white dark:bg-zinc-900 rounded-[1.2rem] border-[4px] border-black/10 flex flex-col h-[450px] overflow-hidden`}>

                    {/* 카드 헤더 (이름 & HP) */}
                    <div className="flex justify-between items-center px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">Basic Service</span>
                        <h3 className="text-xl font-black text-zinc-800 dark:text-zinc-100 leading-none">{service.title}</h3>
                      </div>
                      <div className="flex items-center gap-1 text-red-600 font-black">
                        <span className="text-[10px]">HP</span>
                        <span className="text-xl tracking-tighter">{service.hp}</span>
                      </div>
                    </div>

                    {/* 일러스트레이션 박스 (아이콘) */}
                    <div className={`mx-3 relative h-48 rounded border-[4px] border-[#d1d1d1] dark:border-zinc-700 ${service.innerBg} dark:bg-zinc-800 flex items-center justify-center overflow-hidden`}>
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        className="relative z-20"
                      >
                        <Icon icon={service.icon} size={80} className={`${service.theme.split(' ')[2]} drop-shadow-lg`} />
                      </motion.div>

                      {/* 배경 무늬 */}
                      <div className="absolute inset-0 opacity-10 flex flex-wrap gap-4 p-2">
                        {Array(20).fill(0).map((_, i) => (
                          <Icon key={i} icon={service.icon} size={16} />
                        ))}
                      </div>

                      <div className="absolute bottom-0 w-full bg-black/5 dark:bg-white/5 py-1 text-center">
                        <p className="text-[8px] font-bold text-zinc-500 italic">No. 00{index + 1} | IQ-System Concept</p>
                      </div>
                    </div>

                    {/* 설명 및 데이터 영역 */}
                    <div className="p-5 flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-4 h-4 rounded-full bg-zinc-800 dark:bg-zinc-100" />
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-500">{service.tag}</span>
                      </div>
                      <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 leading-snug">
                        {service.description}
                      </p>
                    </div>

                    {/* 하단 바 (로그인 정보 등) */}
                    <div className="mt-auto p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <div className="flex justify-between items-center">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-zinc-300" />
                          <div className="w-2 h-2 rounded-full bg-zinc-300" />
                        </div>
                        {service.requiresAuth ? (
                          <div className="flex items-center gap-1">
                            <Icon icon={IconNames.LOCK} size={12} className="text-amber-600" />
                            <span className="text-[9px] font-black text-amber-600 uppercase">Premium Member Only</span>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest italic">Free Access</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="py-16 border-t border-zinc-200 dark:border-zinc-800/50 text-center">
        <p className="text-[10px] font-black tracking-[0.5em] text-zinc-400 uppercase">
          © 2026 IDIOT QUANT • ALL RIGHTS RESERVED
        </p>
      </footer>

      {/* 테일윈드 애니메이션 커스텀 */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}