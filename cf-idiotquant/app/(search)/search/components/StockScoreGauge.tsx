"use client";

import React from "react";

interface StockScoreProps {
    stock: {
        name: string;
        undervaluedScore: number;
    };
}

export const StockScoreGauge = ({ stock }: StockScoreProps) => {
    const isNegative = stock.undervaluedScore < 0;

    // 마이너스일 때는 0%로 고정, 양수일 때만 최대 100%까지 표시
    const gaugeWidth = isNegative ? 0 : Math.min(100, stock.undervaluedScore);

    return (
        <div className="w-full">
            {/* 라벨 영역 */}
            <div className="flex justify-between items-end mb-1.5 text-xs">
                <span className="font-bold text-zinc-500 dark:text-zinc-300 uppercase tracking-tighter">
                    가격 매력도
                </span>
                <span className={`font-mono font-black ${isNegative ? "text-red-500 animate-pulse" : "text-green-500"}`}>
                    {isNegative ? `⚠️ ${stock.undervaluedScore}%` : `${stock.undervaluedScore}%`}
                </span>
            </div>

            {/* 게이지 컨테이너 (h-2 기준 유지) */}
            <div className={`w-full h-2 rounded-full overflow-hidden ${isNegative ? "bg-red-100 dark:bg-red-900/30 ring-1 ring-red-500/50" : "bg-zinc-200 dark:bg-zinc-700"}`}>
                {/* 실제 게이지 바 */}
                <div
                    className={`h-full transition-all duration-700 ease-out-back ${isNegative ? "w-0" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"}`}
                    style={{ width: `${gaugeWidth}%` }}
                />
            </div>

            {/* 마이너스일 때만 노출되는 하단 텍스트 */}
            {isNegative && (
                <p className="text-[9px] text-red-500 font-bold mt-1 text-right italic uppercase tracking-widest">
                    Value at Risk
                </p>
            )}
        </div>
    );
};