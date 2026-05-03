"use client";

import React from "react";
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { StockCard } from "./StockCard";

export const SearchGuide = () => {
    const guides = [
        {
            stock: {
                isUs: false,
                name: "삼성전자",
                sector: "전기·전자",
                ticker: "005930",
                grade: { grade: "S", color: "text-blue-500" },
                fairValue: "78,500",
                undervaluedScore: 85,
                per: "12.5",
                pbr: "1.4",
                isGuide: true
            },
            badge: "KOSPI TYPE",
            title: "정밀한 내재가치 산출",
            desc: "NCAV와 S-RIM 알고리즘을 통해 시장의 소음에서 벗어난 기업의 진짜 가치를 계산합니다."
        },
        {
            stock: {
                isUs: true,
                name: "AAPL",
                sector: "컴퓨터전자장비/기기",
                ticker: "AAPL",
                grade: { grade: "SS", color: "text-indigo-500" },
                fairValue: "215.4",
                undervaluedScore: 92,
                per: "28.4",
                pbr: "35.2",
                isGuide: true
            },
            badge: "NASDAQ TYPE",
            title: "글로벌 마켓 통합",
            desc: "미국 주요 티커를 실시간으로 분석하여 한국 주식과 동일한 잣대로 투자 기회를 발굴합니다."
        },
        {
            stock: {
                isUs: false,
                name: "NCAV 전략",
                ticker: "NCAV",
                grade: { grade: "SSS", color: "text-amber-500" },
                fairValue: "청산 가치",
                undervaluedScore: 99,
                per: "순유동",
                pbr: "자산",
                isGuide: true
            },
            badge: "ULTRA RARE",
            title: "NCAV 청산가치 산출",
            desc: "벤자민 그레이엄의 방식대로 기업이 당장 문을 닫아도 주주에게 돌아갈 현금 가치를 계산하여 절대적 저평가를 발굴합니다."
        },
    ];

    return (
        <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-6 py-16 md:py-28 animate-in fade-in slide-in-from-bottom-10 duration-1000 overflow-hidden">

            {/* 1. Hero Section: 퀀트덱 로딩 애니메이션 느낌 */}
            <header className="flex flex-col items-center text-center mb-24 space-y-8 relative">
                <div className="absolute -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] -z-10 animate-pulse" />

                <div className="group inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white dark:bg-zinc-900 border-2 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all hover:scale-105">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-[11px] font-black text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.4em]">
                        QUANTDEX System v3.0 Online
                    </span>
                </div>

                <h1 className="text-[2.6rem] md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-none break-keep">
                    <span className="block md:inline">가장 강력한 종목을</span>
                    <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 drop-shadow-sm">
                        수집(Collect) 하세요
                    </span>
                </h1>

                <p className="text-zinc-500 dark:text-zinc-400 text-lg md:text-2xl max-w-2xl break-keep font-bold leading-relaxed">
                    상단 검색창에 종목을 입력해 보세요.<br className="hidden md:block" />
                    당신의 포트폴리오를 채울 전설적인 카드가 나타납니다.
                </p>
            </header>

            {/* 2. Feature Section: 카드 쇼케이스 (배틀 스타디움 느낌) */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-10 w-full relative">
                {/* 배경 장식 선 */}
                <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent -z-10 hidden lg:block" />

                {guides.map((item, i) => (
                    <div key={i} className="flex flex-col items-center group">
                        {/* 카드 영역: 호버 시 공중 부양 효과 */}
                        <div className="relative transform transition-all duration-500 group-hover:-translate-y-10 group-hover:scale-105 group-hover:rotate-2">
                            <StockCard stock={item.stock} />

                            {/* 등급별 오라(Aura) 효과 */}
                            <div className={`absolute -z-10 inset-0 blur-[80px] rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-700 
                                ${item.stock.grade.grade === 'SSS' ? 'bg-amber-400' : 'bg-blue-400'}`}
                            />
                        </div>

                        {/* 가이드 텍스트: 카드 설명창 느낌 */}
                        <div className="mt-12 w-full max-w-[320px] p-6 rounded-2xl bg-white dark:bg-zinc-900 border-b-4 border-zinc-200 dark:border-zinc-800 shadow-lg group-hover:border-blue-500 transition-colors">
                            <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 
                                ${item.stock.isUs ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                                {item.badge}
                            </div>
                            <h3 className="text-zinc-900 dark:text-zinc-100 font-black text-xl mb-2 italic">
                                {item.title}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep font-medium opacity-90">
                                {item.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </section>

            {/* 3. Footer: 공식 라이선스(?) 느낌의 디자인 */}
            <footer className="mt-40 w-full flex flex-col items-center space-y-10">
                <div className="flex items-center justify-center gap-8 w-full">
                    <div className="h-px w-24 bg-gradient-to-l from-zinc-300 dark:from-zinc-700 to-transparent" />
                    <div className="flex gap-4">
                        {[1, 2, 3].map((n) => (
                            <div key={n} className="w-3 h-3 rounded-full border-2 border-zinc-300 dark:border-zinc-700" />
                        ))}
                    </div>
                    <div className="h-px w-24 bg-gradient-to-r from-zinc-300 dark:from-zinc-700 to-transparent" />
                </div>

                <div className="text-center space-y-4 bg-zinc-100 dark:bg-zinc-900/50 px-10 py-6 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800">
                    <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.5em]">
                        Official QuantDex Analysis Platform
                    </p>
                    <div className="flex items-center justify-center gap-6">
                        <Icon icon={IconNames.GLOBE_NETWORK} size={16} className="text-zinc-300" />
                        <p className="text-zinc-400 dark:text-zinc-500 text-xs font-bold italic">
                            © 2026 IDIOTQUANT • MASTERING THE ALPHA
                        </p>
                        <Icon icon={IconNames.SHIELD} size={16} className="text-zinc-300" />
                    </div>
                </div>
            </footer>
        </div>
    );
};