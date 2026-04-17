"use client";

import React from "react";
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { ModernTiltCard } from "./StockCard";

export const SearchGuide = () => {
    // 실제 서비스의 분석 로직을 상징하는 가이드 데이터
    const guides = [
        {
            stock: {
                isUs: false,
                name: "삼성전자",
                ticker: "005930",
                grade: { grade: "S", color: "text-blue-500" },
                fairValue: "78,500",
                undervaluedScore: 85,
                per: "12.5",
                pbr: "1.4",
                isGuide: true
            },
            badge: "KOSPI 분석",
            title: "정밀한 내재가치 산출",
            desc: "NCAV와 S-RIM 알고리즘을 통해 시장의 소음에서 벗어난 기업의 진짜 가치를 계산합니다."
        },
        {
            stock: {
                isUs: true,
                name: "AAPL",
                ticker: "AAPL",
                grade: { grade: "AA", color: "text-indigo-500" },
                fairValue: "215.4",
                undervaluedScore: 92,
                per: "28.4",
                pbr: "35.2",
                isGuide: true
            },
            badge: "NASDAQ 실시간",
            title: "글로벌 마켓 통합",
            desc: "미국 주요 티커를 실시간으로 분석하여 한국 주식과 동일한 잣대로 투자 기회를 발굴합니다."
        },
        {
            stock: {
                isUs: false,
                name: "NCAV 전략",
                ticker: "LIQUIDATION",
                grade: { grade: "SSS", color: "text-amber-500" },
                fairValue: "청산 가치",
                undervaluedScore: 99,
                per: "순유동",
                pbr: "자산",
                isGuide: true
            },
            badge: "Deep Value",
            title: "NCAV 청산가치 산출",
            desc: "벤자민 그레이엄의 방식대로 기업이 당장 문을 닫아도 주주에게 돌아갈 현금 가치를 계산하여 절대적 저평가를 발굴합니다."
        },
        {
            stock: {
                isUs: false,
                name: "S-RIM 전략",
                ticker: "INTRINSIC",
                grade: { grade: "AA", color: "text-blue-500" },
                fairValue: "적정 주가",
                undervaluedScore: 88,
                per: "자기자본",
                pbr: "이익률",
                isGuide: true
            },
            badge: "Growth Value",
            title: "S-RIM 초과이익 평가",
            desc: "기업의 자본비용과 미래 기대 수익을 결합하여, 향후 지속 가능한 이익을 바탕으로 한 합리적인 적정 주가 범위를 제시합니다."
        },
    ];

    return (
        <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-16 md:py-28 animate-in fade-in slide-in-from-bottom-10 duration-1000">

            {/* 1. Hero Section: 서비스의 정체성 */}
            <header className="flex flex-col items-center text-center mb-24 space-y-8">
                <div className="group inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:border-blue-500/50">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                    </span>
                    <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.3em]">
                        IdiotQuant Engine v3.0 Active
                    </span>
                </div>

                <h1 className="text-[2.6rem] md:text-7xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-[1.1] md:leading-[1.05] break-keep">
                    {/* 모바일에서는 줄바꿈을 제거하거나 조절하여 시각적 균형을 맞춤 */}
                    <span className="block md:inline">투자의 확신을 더하는</span>

                    <span className="mt-2 md:mt-0 block md:ml-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 dark:from-blue-400 dark:via-indigo-300 dark:to-emerald-300">
                        데이터 사이언스
                    </span>
                </h1>

                <p className="text-zinc-500 dark:text-zinc-400 text-lg md:text-2xl max-w-2xl break-keep font-medium leading-relaxed">
                    상단 검색창에 종목명이나 티커를 입력해보세요.<br className="hidden md:block" />
                    당신의 종목을 분석하여 인텔리전트 카드로 요약합니다.
                </p>
            </header>

            {/* 2. Feature Section: 카드 쇼케이스 */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 w-full">
                {guides.map((item, i) => (
                    <div key={i} className="flex flex-col items-center group">
                        {/* 카드 영역 */}
                        <div className="relative transform transition-all duration-700 group-hover:-translate-y-6 group-hover:rotate-1">
                            <ModernTiltCard stock={item.stock} />
                            {/* 카드 후광 효과 */}
                            <div className="absolute -z-10 inset-0 bg-blue-500/10 dark:bg-blue-400/5 blur-[120px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        </div>

                        {/* 가이드 텍스트 */}
                        <div className="mt-14 w-full max-w-[300px] text-center lg:text-left space-y-4">
                            <div className="inline-block px-3 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                                {item.badge}
                            </div>
                            <h3 className="text-zinc-900 dark:text-zinc-100 font-black text-2xl tracking-tight leading-tight">
                                {item.title}
                            </h3>
                            <p className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep font-medium opacity-80">
                                {item.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </section>

            {/* 3. Social Proof & Footer: 신뢰도 제공 */}
            <footer className="mt-32 w-full flex flex-col items-center space-y-10">
                <div className="flex items-center gap-4 w-full max-w-xs">
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex gap-6 text-zinc-300 dark:text-zinc-700">
                        <Icon icon={IconNames.CHART} size={20} />
                        <Icon icon={IconNames.DATABASE} size={20} />
                        <Icon icon={IconNames.PULSE} size={20} />
                    </div>
                    <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                </div>

                <div className="text-center space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.4em]">
                        Standardized Quant Analysis Platform
                    </p>
                    <p className="text-zinc-400 dark:text-zinc-500 text-xs font-medium">
                        © 2026 IdiotQuant. All Rights Reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};