"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { motion } from "framer-motion";

// Blueprintjs Components
import {
    Spinner,
    NonIdealState,
    Icon,
    Intent,
    Divider,
    Tag
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

// Redux
import {
    selectStrategyNcavLatest,
    reqGetNcavLatest,
    StrategyNcavLatestType
} from "@/lib/features/backtest/backtestSlice";

// 개편된 하위 컴포넌트
import ResponsiveNCAV from "./table";

export default function AlgorithmTrade() {
    const dispatch = useAppDispatch();
    const strategyNcavLatest: StrategyNcavLatestType = useAppSelector(selectStrategyNcavLatest);

    useEffect(() => {
        dispatch(reqGetNcavLatest());
    }, [dispatch]);

    // 로딩 상태 확인
    const isLoading = !strategyNcavLatest?.list;
    const hasData = strategyNcavLatest?.list && Object.keys(strategyNcavLatest.list).length > 0;

    return (
        <div className="flex flex-col w-full min-h-screen !bg-[#f8f9fa] dark:!bg-[#08080a]">
            {/* [Header] Justinmind Style: High Contrast & Clean Spacing */}
            <header className="pt-10 pb-6 px-6 md:pt-16 md:pb-12 max-w-[1400px] mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center md:items-start text-center md:text-left"
                >
                    <Tag large minimal round intent={Intent.WARNING} className="mb-4 !px-4 !py-1 font-black tracking-widest text-[10px]">
                        PREMIUM QUANT ALGORITHM
                    </Tag>
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter dark:text-white mb-4">
                        종목 <span className="text-blue-600 dark:text-yellow-500 italic">추천</span>
                    </h2>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm md:text-lg font-medium max-w-2xl leading-relaxed">
                        이디어트 퀀트 엔진이 분석한 <span className="text-gray-900 dark:text-zinc-200 font-bold underline decoration-blue-500/30">NCAV 저평가 종목</span> 리스트입니다.
                        청산 가치 대비 시가총액이 낮은 안정적인 종목을 제안합니다.
                    </p>
                </motion.div>
            </header>

            <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-6">
                {isLoading ? (
                    <div className="py-40">
                        <NonIdealState
                            icon={<Spinner intent={Intent.PRIMARY} size={50} />}
                            title={<span className="font-black tracking-tight">데이터 동기화 중</span>}
                            description="최신 마켓 데이터를 분석하여 리스트를 생성하고 있습니다."
                        />
                    </div>
                ) : hasData ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <ResponsiveNCAV strategies={strategyNcavLatest?.list as any} />
                    </motion.div>
                ) : (
                    <div className="py-20">
                        <NonIdealState
                            icon={IconNames.SEARCH_TEMPLATE}
                            title="분석 결과 없음"
                            description="현재 필터 조건에 부합하는 종목이 시장에 존재하지 않습니다."
                            action={<button onClick={() => dispatch(reqGetNcavLatest())} className="bp5-button bp5-intent-primary bp5-large bp5-minimal">다시 분석하기</button>}
                        />
                    </div>
                )}
            </main>

            <footer className="py-12 mt-20 border-t border-gray-200 dark:border-white/5 opacity-30 text-center">
                <p className="text-[10px] font-black tracking-[0.5em] uppercase dark:text-white">
                    © 2026 IDIOT QUANT • FINANCIAL INTELLIGENCE UNIT
                </p>
            </footer>
        </div>
    );
}