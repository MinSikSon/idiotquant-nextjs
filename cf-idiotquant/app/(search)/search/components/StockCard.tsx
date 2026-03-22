"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import LineChart from "@/components/LineChart";
import { StockScoreGauge } from "./StockScoreGauge";

export const ModernTiltCard = ({ stock, chartConfig }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isError, setIsError] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    // 로고 URL 생성
    const logoUrl = useMemo(() => {
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(stock.name);
        if (stock.name && !hasKorean && !isError) {
            return `https://img.logo.dev/ticker/${stock.name.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true&size=200`;
        }
        return "";
    }, [stock.name, isError]);

    // 3D 기울기 효과
    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (centerY - y) / centerY * 10; 
            const rotateY = (x - centerX) / centerX * 10;
            setRotation({ x: rotateX, y: rotateY });
        };

        const handleMouseLeave = () => setRotation({ x: 0, y: 0 });

        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            card.removeEventListener('mousemove', handleMouseMove);
            card.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    // 수치 정돈 로직
    // 1. 내재가치는 원화 단위이므로 소수점 제거 및 콤마 추가
    const formattedFairValue = useMemo(() => {
        if (stock.isGuide) return stock.fairValue;
        const value = typeof stock.fairValue === 'string' 
            ? parseFloat(stock.fairValue.replace(/[^0-9.-]+/g, "")) 
            : stock.fairValue;
        // return stock.isUs ? value : Math.round(value).toLocaleString();
        return stock.isUs ? value : Math.round(value).toLocaleString();
    }, [stock.fairValue]);

    // 2. PER/PBR은 소수점 첫째 자리까지만 표기하여 가독성 확보
    const formattedPer = useMemo(() => stock.isGuide ? stock.per : parseFloat(stock.per).toFixed(1), [stock.per]);
    const formattedPbr = useMemo(() => stock.isGuide ? stock.pbr : parseFloat(stock.pbr).toFixed(1), [stock.pbr]);

    return (
        <div 
            ref={cardRef}
            className="group/card relative w-[20rem] h-[35rem] transition-transform duration-100 ease-out select-none cursor-pointer"
            style={{ 
                perspective: '1000px', 
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` 
            }}
        >
            <div className="w-full h-full bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[10px] border-zinc-50 overflow-hidden flex flex-col p-8 z-10 relative transition-shadow duration-500 group-hover/card:shadow-[0_25px_60px_rgba(59,130,246,0.2)]">
                
                {/* 배경 차트 */}
                <div className="absolute bottom-0 left-0 w-full h-32 opacity-[0.03] pointer-events-none z-0">
                    {chartConfig?.data && (
                        <LineChart
                            data_array={[{ name: "Price", data: chartConfig.data, color: "#3b82f6" }]}
                            category_array={chartConfig.categories}
                            height={120}
                            show_yaxis_label={false}
                            legend_disable
                            grid_disable
                        />
                    )}
                </div>

                {/* Header: 불필요한 서브타이틀 삭제 */}
                <div className="flex justify-between items-center mb-8 z-10">
                    <h3 className="text-zinc-900 font-black text-4xl uppercase tracking-tighter leading-none">
                        {stock.name}
                    </h3>
                    <div className="w-14 h-14 rounded-full bg-white shadow-xl border-4 border-zinc-50 flex items-center justify-center">
                        <span className={`font-black text-2xl ${stock?.grade?.color || 'text-red-500'}`}>
                            {stock?.grade?.grade || 'F'}
                        </span>
                    </div>
                </div>

                {/* 로고 영역: 배경 워터마크 삭제하여 깔끔하게 유지 */}
                <div className="w-full h-44 bg-zinc-50 rounded-3xl border-2 border-zinc-100 mb-8 overflow-hidden relative shadow-inner z-10">
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
                </div>

                {/* 정보 섹션 */}
                <div className="space-y-6 mt-auto z-10">
                    {/* 내재가치: 소수점 제거 및 단위 명확화 */}
                    <div className="flex justify-between items-baseline px-1 border-b border-zinc-50 pb-2">
                        <span className="text-zinc-400 text-[11px] font-bold uppercase tracking-wider">Intrinsic Value</span>
                        <div className="flex items-baseline gap-1 text-green-600">
                            <span className="text-lg font-bold">{stock.isUs? "$":"₩"}</span>
                            <span className="font-mono text-4xl font-black tracking-tighter">
                                {formattedFairValue}
                            </span>
                        </div>
                    </div>

                    {/* 게이지: 하단 중복 텍스트(Price Attractiveness 등) 제거 */}
                    <div className="space-y-2 px-1">
                        <StockScoreGauge stock={stock} />
                    </div>

                    {/* 지표: (Power), (Defense) 등 보조 설명 삭제 및 수치 정돈 */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-zinc-50/50 py-4 rounded-2xl border-2 border-zinc-100 text-center">
                            <p className="text-[11px] text-zinc-400 font-bold uppercase mb-1">PER</p>
                            <p className="text-blue-600 font-black text-2xl">{formattedPer}</p>
                        </div>
                        <div className="bg-zinc-50/50 py-4 rounded-2xl border-2 border-zinc-100 text-center">
                            <p className="text-[11px] text-zinc-400 font-bold uppercase mb-1">PBR</p>
                            <p className="text-pink-500 font-black text-2xl">{formattedPbr}</p>
                        </div>
                    </div>
                </div>

                {/* 후광 효과 */}
                <div className="absolute -inset-10 bg-gradient-to-tr from-blue-100/30 via-white/0 to-blue-100/30 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 blur-3xl z-0" />
            </div>
        </div>
    );
};