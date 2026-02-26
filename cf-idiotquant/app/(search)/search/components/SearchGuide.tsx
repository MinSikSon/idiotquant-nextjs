"use client";

import React from "react";
import { Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";
import { StockCard } from "./StockCard"; // StockCard 컴포넌트 경로

export const SearchGuide = () => {
    // 가이드용 더미 데이터 (실제 StockCard가 받는 stock 객체 구조와 동일하게 설정)
    const guides = [
        {
            stock: {
                isUs: true,
                id: "guide1",
                name: "가치 평가",
                grade: { grade: "SSS", color: "text-yellow-500", cardGradeColor: "from-yellow-500/30 via-amber-500/10 to-transparent" },
                fairValue: "NCAV",
                undervaluedScore: 777,
                per: "정밀",
                pbr: "계산",
                isGuide: true
            },
            desc: "순유동자산 기반 정밀한 적정 주가 산출 로직을 제공합니다."
        },
        {
            stock: {
                isUs: true,
                id: "guide2",
                name: "재무 건전성",
                grade: { grade: "AA", color: "text-blue-400", cardGradeColor: "from-blue-500/20 via-indigo-500/10 to-transparent" },
                fairValue: "Safety",
                undervaluedScore: 95,
                per: "부채율",
                pbr: "유동비",
                isGuide: true
            },
            desc: "부채비율, 유동비율 등 지표를 분석하여 기업의 파산 위험을 진단합니다."
        },
        {
            stock: {
                isUs: true,
                id: "guide3",
                name: "실시간 데이터",
                grade: { grade: "S", color: "text-orange-500", cardGradeColor: "from-orange-500/20 to-transparent" },
                fairValue: "KR / US",
                undervaluedScore: 90,
                per: "통합",
                pbr: "시세",
                isGuide: true
            },
            desc: "한국과 미국 시장의 재무제표 및 시세를 실시간으로 연동하여 분석합니다."
        },
        // {
        //     stock: {
        //         isUs: true,
        //         id: "guide4",
        //         name: "배당 수익률",
        //         grade: { grade: "A+", color: "text-emerald-400", cardGradeColor: "from-emerald-500/20 via-teal-500/10 to-transparent" },
        //         fairValue: "Dividend",
        //         undervaluedScore: 82,
        //         per: "배당성향",
        //         pbr: "수익률",
        //         isGuide: true
        //     },
        //     desc: "연간 배당금과 배당 성향을 분석하여 지속 가능한 현금 흐름을 평가합니다."
        // },
        // {
        //     stock: {
        //         isUs: true,
        //         id: "guide5",
        //         name: "업종 내 순위",
        //         grade: { grade: "TOP", color: "text-purple-400", cardGradeColor: "from-purple-500/20 via-fuchsia-500/10 to-transparent" },
        //         fairValue: "Sector",
        //         undervaluedScore: 88,
        //         per: "동종",
        //         pbr: "비교",
        //         isGuide: true
        //     },
        //     desc: "동일 섹터 내 다른 기업들과 비교하여 현재 종목의 상대적 위치를 파악합니다."
        // }
    ];

    return (
        <div className="flex flex-col items-center justify-center px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* 상단 헤더 */}
            <div className="flex flex-col items-center gap-2 mb-10">
                <h1 className="text-4xl font-black tracking-tighter text-zinc-900 dark:text-white">
                    퀀트 분석의 <span className="text-blue-500">새로운 기준</span>
                </h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-4 max-w-md break-keep">
                    종목명 또는 티커를 입력하시면, <br />
                    아래와 같은 <strong>프리미엄 분석 카드</strong>를 즉시 생성해 드립니다.
                </p>
            </div>

            {/* 실제 StockCard 컴포넌트를 가이드로 활용 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-7xl justify-items-center">
                {guides.map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-6">
                        {/* 실제 StockCard 사용 */}
                        <StockCard stock={item.stock} />

                        {/* 가이드 설명글 */}
                        <div className="max-w-[280px]">
                            <h4 className="text-zinc-800 dark:text-zinc-200 font-bold mb-2">{item.stock.name}</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">
                                {item.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 하단 데코레이션 */}
            <div className="mt-20 opacity-30 grayscale pointer-events-none">
                <div className="flex gap-4">
                    <Icon icon={IconNames.CHART} size={40} />
                    <Icon icon={IconNames.DATABASE} size={40} />
                    <Icon icon={IconNames.PULSE} size={40} />
                </div>
            </div>
        </div>
    );
};