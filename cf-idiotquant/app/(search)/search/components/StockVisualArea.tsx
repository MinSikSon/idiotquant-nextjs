"use client";

import React, { useState, useEffect } from 'react';
import LineChart from "@/components/LineChart";

export const StockVisualArea = ({ stockName, chartConfig }: any) => {
    const [isError, setIsError] = useState(false);

    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(stockName);
    const logoUrl = (stockName && !hasKorean && !isError)
        ? `https://img.logo.dev/ticker/${stockName.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true`
        : "";

    useEffect(() => {
        setIsError(false);
    }, [stockName]);

    return (
        <div className="relative w-full h-[14rem] flex items-center justify-center bg-zinc-50/50 dark:bg-zinc-800/30 rounded-[2.5rem] overflow-hidden border border-zinc-100 dark:border-white/5 shadow-inner group">
            
            {/* [Layer 1] 배경 차트: 중앙 영역 위로 살짝 올려 하단 축 노출 */}
            <div className="absolute inset-0 z-0 opacity-30 group-hover:opacity-50 transition-all duration-500 pb-8 flex items-end"> 
                {chartConfig?.data && chartConfig.data.length > 0 && (
                    <div className="w-full h-[80%] scale-x-105"> 
                        <LineChart
                            data_array={[{
                                name: "Price",
                                data: chartConfig.data,
                                color: chartConfig.color || "#6366f1"
                            }]}
                            category_array={chartConfig.categories}
                            height={160} 
                            show_yaxis_label={false}
                            legend_disable
                            grid_disable
                        />
                    </div>
                )}
            </div>

            {/* [Layer 2] 중앙 로고: 칸 내부에 가득 차도록 여백 제거 및 object-cover 적용 */}
            <div className="relative z-10 flex items-center justify-center">
                {logoUrl && !hasKorean && !isError ? (
                    /* 1. p-0으로 여백 완전 제거, 2. object-cover를 위해 w-20 h-20 고정, 3. overflow-hidden 추가 */
                    <div className="w-20 h-20 bg-white dark:bg-zinc-900 rounded-[1.2rem] shadow-2xl border border-zinc-100 dark:border-zinc-800 transition-transform duration-500 group-hover:scale-105 overflow-hidden flex items-center justify-center p-0">
                        <img
                            src={logoUrl}
                            alt={stockName}
                            /* 4. object-cover 속성으로 곡선 내부에 가득 차게 설정 */
                            className="w-full h-full object-cover rounded-[1.2rem]" 
                            onError={() => setIsError(true)}
                        />
                    </div>
                ) : (
                    <div className="w-20 h-20 rounded-[1.2rem] bg-white dark:bg-zinc-800 shadow-xl flex items-center justify-center border border-zinc-100 dark:border-zinc-700">
                        <span className="text-4xl font-black text-zinc-800 dark:text-zinc-100 tracking-tighter">
                            {stockName ? stockName.substring(0, 1) : "?"}
                        </span>
                    </div>
                )}
            </div>

            {/* 하단 그라데이션 강도 조절 (축이 더 잘 보이게) */}
            <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-white/40 dark:from-zinc-900/40 to-transparent z-[5]" />
        </div>
    );
};