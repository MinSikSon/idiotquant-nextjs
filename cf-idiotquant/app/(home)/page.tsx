"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    Card,
    Elevation,
    Icon,
    H2,
    H5,
    Button,
    Intent,
    Tag
} from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

// BlueprintJS CSS
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

export default function HomePage() {
    const services = [
        {
            title: "적정 주가 분석",
            description: "기업의 재무제표를 바탕으로 알고리즘이 계산한 본질 가치를 확인하세요.",
            icon: IconNames.SEARCH,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            link: "/search", // 실제 경로에 맞춰 수정하세요
            tag: "VALUATION"
        },
        {
            title: "수익률 계산기",
            description: "복리 효과와 수수료를 고려하여 실제 내 자산이 얼마나 불어날지 시뮬레이션합니다.",
            icon: IconNames.CALCULATOR,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            link: "/calculator",
            tag: "PLANNER"
        },
        {
            title: "종목 추천",
            description: "NCAV 전략을 기반으로 현재 시장에서 가장 안전마진이 높은 종목을 추천합니다.",
            icon: IconNames.FILTER_LIST,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            link: "/algorithm-trade",
            tag: "ALGORITHM"
        }
    ];

    return (
        <div className="min-h-screen bg-[#f9fafb] dark:bg-[#08080a] text-zinc-900 dark:text-zinc-100">
            {/* [Hero Section] */}
            <header className="relative pt-20 pb-16 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <Tag large minimal round intent={Intent.PRIMARY} className="mb-6 !px-6 py-2 font-black tracking-[0.3em]">
                            IDIOT QUANT SYSTEM v3.0
                        </Tag>
                        <H2 className="!text-5xl md:!text-7xl !font-black !tracking-tighter mb-6 dark:!text-white">
                            Smart Investing,<br />
                            <span className="text-blue-600 dark:text-yellow-500 italic">Data-Driven Decisions.</span>
                        </H2>
                        <p className="max-w-2xl mx-auto text-gray-500 dark:text-zinc-400 text-lg md:text-xl font-medium leading-relaxed">
                            복잡한 시장 지표를 단순화합니다. 감정에 흔들리지 않는 퀀트 투자 알고리즘으로 당신의 자산을 지키고 키우세요.
                        </p>
                    </motion.div>
                </div>

                {/* 배경 장식 요소 */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-[120px]" />
                    <div className="absolute bottom-0 right-10 w-96 h-96 bg-purple-500 rounded-full blur-[150px]" />
                </div>
            </header>

            {/* [Main Services Grid] */}
            <main className="max-w-7xl mx-auto px-6 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                        >
                            <Link href={service.link} className="no-underline hover:no-underline">
                                <Card
                                    elevation={Elevation.TWO}
                                    interactive={true}
                                    className="!p-0 !rounded-3xl border-none overflow-hidden h-full flex flex-col group transition-all duration-300 hover:shadow-2xl dark:!bg-[#121216]"
                                >
                                    <div className="p-8 flex-1">
                                        <div className={`w-14 h-14 ${service.bg} ${service.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                                            <Icon icon={service.icon} size={28} />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] font-black tracking-widest uppercase ${service.color}`}>
                                                    {service.tag}
                                                </span>
                                                <Icon icon={IconNames.ARROW_RIGHT} size={14} className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" />
                                            </div>
                                            <H5 className="!text-2xl !font-black dark:!text-white">
                                                {service.title}
                                            </H5>
                                            <p className="text-gray-500 dark:text-zinc-400 font-medium leading-relaxed">
                                                {service.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* 하단 데코레이션 바 */}
                                    <div className="h-2 w-0 group-hover:w-full bg-current transition-all duration-500 opacity-50" style={{ color: `var(--${service.color.split('-')[1]}-color)` }} />
                                    <div className={`h-1 w-full opacity-10 ${service.bg}`} />
                                </Card>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* [Quick Support / Callout] */}
                {/* <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-20 p-8 md:p-12 rounded-[2.5rem] bg-zinc-900 text-white relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8"
                >
                    <div className="relative z-10 text-center md:text-left">
                        <H2 className="!text-white !font-black !m-0 mb-2">시작할 준비가 되셨나요?</H2>
                        <p className="text-zinc-400 font-medium">모든 데이터는 매일 자정 최신 재무제표를 바탕으로 업데이트됩니다.</p>
                    </div>
                    <Button
                        large
                        intent={Intent.PRIMARY}
                        className="relative z-10 !px-10 !py-4 !rounded-full font-black tracking-tight"
                    >
                        데이터 동기화 확인
                    </Button>

                    <div className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #333 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                </motion.div> */}
            </main>

            {/* [Footer] */}
            <footer className="py-12 border-t border-gray-200 dark:border-white/5 text-center opacity-40">
                <p className="text-xs font-bold tracking-[0.4em] uppercase">
                    © 2026 IDIOT QUANT • INTELLIGENT INVESTMENT HUB
                </p>
            </footer>
        </div>
    );
}