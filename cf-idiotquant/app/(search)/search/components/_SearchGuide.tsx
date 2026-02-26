"use client";

import React from "react";
import { Card, Elevation, Icon } from "@blueprintjs/core";
import { IconNames } from "@blueprintjs/icons";

export const SearchGuide = () => (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-700">
        <div className="flex items-center justify-center gap-3 mb-4">
            <Icon icon={IconNames.TRENDING_DOWN} size={24} className="text-red-400" />
            <h2 className="text-3xl font-black !text-zinc-800 dark:!text-zinc-100">
                스마트한 주식 분석의 시작
            </h2>
            <Icon icon={IconNames.TRENDING_UP} size={24} className="text-blue-400" />
        </div>
        <p className="!text-zinc-500 dark:!text-zinc-400 max-w-md mb-10 leading-relaxed">
            <span className="font-bold text-zinc-700 dark:text-zinc-200">국내 종목명</span> 또는 <span className="font-bold text-zinc-700 dark:text-zinc-200">미국 티커(Ticker)</span>를 입력하세요. <br />
            AI 리서치 리포트와 <span className="!text-blue-600 font-bold">NCAV / S-RIM 전략</span> 기반의 적정 주가를 즉시 계산해 드립니다.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl">
            {[
                { icon: IconNames.CALCULATOR, title: "가치 평가", desc: "NCAV/S-RIM 모델링" },
                { icon: IconNames.LIGHTBULB, title: "AI 인사이트", desc: "LLM 기반 기업 분석 리포트" },
                { icon: IconNames.CHART, title: "실시간 시세", desc: "KR/US 시장 데이터 통합" }
            ].map((item, i) => (
                <Card key={i} elevation={Elevation.ZERO} className="dark:!bg-zinc-900 border-none !px-6 py-8 rounded-2xl shadow-sm">
                    <Icon icon={item.icon} size={30} className="mb-4 !text-blue-500" />
                    <div className="font-bold text-base mb-2 dark:!text-zinc-200">{item.title}</div>
                    <div className="text-xs !text-zinc-500 leading-snug">{item.desc}</div>
                </Card>
            ))}
        </div>
    </div>
);