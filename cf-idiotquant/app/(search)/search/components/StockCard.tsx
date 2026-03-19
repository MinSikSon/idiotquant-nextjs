"use client";

import React, { useState, useEffect, useMemo } from 'react';
import LineChart from "@/components/LineChart";
import { StockScoreGauge } from "./StockScoreGauge";

export const StockCard = ({ stock, chartConfig }: any) => {
    const [isError, setIsError] = useState(false);

    const logoUrl = useMemo(() => {
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(stock.name);
        if (stock.name && !hasKorean && !isError) {
            return `https://img.logo.dev/ticker/${stock.name.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true&size=200`;
        }
        return "";
    }, [stock.name, isError]);

    useEffect(() => {
        setIsError(false);
    }, [stock.name]);

    return (
        <div className="group/card relative w-[20rem] h-[35rem] bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[10px] border-zinc-100 overflow-hidden transition-all duration-500 hover:-translate-y-2">
            {/* 배경 차트 (은은하게 유지) */}
            <div className="absolute bottom-0 left-0 w-full h-40 opacity-[0.05] pointer-events-none z-0">
                {chartConfig?.data && chartConfig.data.length > 0 && (
                    <div className="w-full h-full scale-110 translate-y-4">
                        <LineChart
                            data_array={[{ name: "Price", data: chartConfig.data, color: "#3b82f6" }]}
                            category_array={chartConfig.categories}
                            height={150}
                            show_yaxis_label={false}
                            legend_disable
                            grid_disable
                            chart_type="area"
                        />
                    </div>
                )}
            </div>

            <div className="w-full h-full p-8 flex flex-col z-10 relative">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col">
                        <h3 className="text-zinc-900 font-black text-3xl uppercase tracking-tighter leading-none">{stock.name}</h3>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-2">Quantitative Analysis</p>
                    </div>
                    <div className={`w-12 h-12 rounded-full border-4 ${stock?.grade?.color.replace('text-', 'border-')}/30 flex items-center justify-center bg-white shadow-md`}>
                        <span className={`${stock?.grade?.color} font-black text-2xl`}>{stock?.grade?.grade}</span>
                    </div>
                </div>

                {/* 🔴 요청하신 부분: 로고 감싸는 칸에 로고가 꽉 차도록 수정 */}
                <div className="w-full h-48 bg-zinc-50 rounded-3xl border-4 border-zinc-100 mb-6 overflow-hidden relative shadow-inner">
                    {logoUrl && !isError ? (
                        <img
                            src={logoUrl}
                            alt={stock.name}
                            /* p-0으로 여백을 없애고 w-full h-full + object-cover로 칸을 꽉 채움 */
                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                            onError={() => setIsError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl font-black text-zinc-200 uppercase">{stock.name.substring(0, 1)}</span>
                        </div>
                    )}
                    {/* 미세한 광택 효과만 덧씌움 */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                </div>

                {/* 정보 섹션 */}
                <div className="space-y-5 mt-auto">
                    <div className="flex justify-between items-end px-1">
                        <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Intrinsic Value</span>
                        <span className="text-green-600 font-mono text-3xl font-black tracking-tighter">{stock.fairValue}</span>
                    </div>

                    <div className="space-y-1.5 px-1">
                        <StockScoreGauge stock={stock} />
                        <div className="flex justify-between text-[10px] font-black uppercase italic tracking-tighter">
                            <span className="text-zinc-400">Price Attractiveness</span>
                            <span className="text-red-500/80">Value at Risk</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-zinc-50/80 py-3 rounded-2xl border-2 border-zinc-100 text-center">
                            <p className="text-[9px] text-zinc-400 font-bold uppercase mb-0.5">PER (Power)</p>
                            <p className="text-blue-500 font-black text-lg">{stock.per}</p>
                        </div>
                        <div className="bg-zinc-50/80 py-3 rounded-2xl border-2 border-zinc-100 text-center">
                            <p className="text-[9px] text-zinc-400 font-bold uppercase mb-0.5">PBR (Defense)</p>
                            <p className="text-pink-500 font-black text-lg">{stock.pbr}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};