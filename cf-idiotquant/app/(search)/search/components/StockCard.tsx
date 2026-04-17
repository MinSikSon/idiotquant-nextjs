"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import LineChart from "@/components/LineChart";
import { StockScoreGauge } from "./StockScoreGauge";

export const ModernTiltCard = ({ stock, chartConfig }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isError, setIsError] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });

    // 로고 URL 생성 로직
    const logoUrl = useMemo(() => {
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(stock.name);
        if (!isError) {
            if (stock.isUs && stock.name && !hasKorean) {
                return `https://img.logo.dev/ticker/${stock.name.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true&size=200`;
            }
            else if (stock.ticker) {
                return `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}?size=200`
            }
        }
        return "";
    }, [stock.name, stock.ticker, stock.isUs, isError]);

    useEffect(() => {
        setIsError(false);
    }, [stock.ticker]);

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
    const formattedFairValue = useMemo(() => {
        if (stock.isGuide) return stock.fairValue;
        const value = typeof stock.fairValue === 'string' 
            ? parseFloat(stock.fairValue.replace(/[^0-9.-]+/g, "")) 
            : stock.fairValue;
        return stock.isUs ? value : Math.round(value).toLocaleString();
    }, [stock.fairValue, stock.isUs, stock.isGuide]);

    const formattedPer = useMemo(() => stock.isGuide ? stock.per : parseFloat(stock.per).toFixed(1), [stock.per, stock.isGuide]);
    const formattedPbr = useMemo(() => stock.isGuide ? stock.pbr : parseFloat(stock.pbr).toFixed(1), [stock.pbr, stock.isGuide]);

    return (
        <div 
            ref={cardRef}
            className="group/card relative w-[20rem] h-[35rem] transition-transform duration-100 ease-out select-none cursor-pointer"
            style={{ 
                perspective: '1000px', 
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)` 
            }}
        >
            {/* 카드 본체: 다크모드 배경 및 보더 적용 */}
            <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-[10px] border-zinc-50 dark:border-zinc-800 overflow-hidden flex flex-col p-8 z-10 relative transition-all duration-500 group-hover/card:shadow-[0_25px_60px_rgba(59,130,246,0.2)]">
                
                {/* 배경 차트: 다크모드에서 투명도 조정 */}
                <div className="absolute bottom-0 left-0 w-full h-32 opacity-[0.03] dark:opacity-[0.07] pointer-events-none z-0">
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

                {/* Header */}
                <div className="flex justify-between items-center mb-4 z-10">
                    <h3 className="text-zinc-900 dark:text-zinc-50 font-black text-4xl uppercase tracking-tighter leading-none">
                        {stock.name}
                    </h3>
                    {/* 등급 배지: 다크모드 대비 조정 */}
                    <div className="w-14 h-14 rounded-full bg-white dark:bg-zinc-800 shadow-xl border-4 border-zinc-50 dark:border-zinc-700 flex items-center justify-center">
                        <span className={`font-black text-2xl ${stock?.grade?.color || 'text-red-500'}`}>
                            {stock?.grade?.grade || 'F'}
                        </span>
                    </div>
                </div>

                {/* 로고 영역 */}
                <div className="w-full h-44 bg-zinc-50 dark:bg-zinc-800/50 mb-4 overflow-hidden relative z-10 rounded-2xl">
                     {logoUrl && !isError ? (
                        <>
                            <img
                                src={logoUrl}
                                alt={stock.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                                onError={() => setIsError(true)}
                            />
                            {stock.isUs && (
                                <div className="absolute bottom-2 right-3 opacity-30 group-hover/card:opacity-100 transition-opacity duration-300">
                                    <a
                                        href="https://logo.dev"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 no-underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Logos by Logo.dev
                                    </a>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <span className="text-6xl font-black text-zinc-200 dark:text-zinc-700 uppercase">
                                {stock.name.substring(0, 1)}
                            </span>
                        </div>
                    )}
                </div>

                {/* 정보 섹션 */}
                <div className="space-y-6 mt-auto z-10">
                    {/* 적정 주가 */}
                    <div className="flex justify-between items-baseline px-1 border-b border-zinc-50 dark:border-zinc-800 pb-2">
                        <span className="text-zinc-400 dark:text-zinc-500 text-[11px] font-bold uppercase tracking-wider">적정 주가</span>
                        <div className="flex items-baseline gap-1 text-green-600 dark:text-green-500">
                            <span className="text-lg font-bold">{stock.isUs? "$":"₩"}</span>
                            <span className="font-mono text-4xl font-black tracking-tighter">
                                {formattedFairValue}
                            </span>
                        </div>
                    </div>

                    {/* 게이지 바 (내부 컴포넌트에도 dark 클래스가 적용되어 있어야 합니다) */}
                    <div className="space-y-2 px-1">
                        <StockScoreGauge stock={stock} />
                    </div>

                    {/* 지표 섹션 */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="bg-zinc-50/50 dark:bg-zinc-800/30 py-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 text-center transition-colors">
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mb-1">PER</p>
                            <p className="text-blue-600 dark:text-blue-400 font-black text-2xl">{formattedPer}</p>
                        </div>
                        <div className="bg-zinc-50/50 dark:bg-zinc-800/30 py-4 rounded-2xl border-2 border-zinc-100 dark:border-zinc-800 text-center transition-colors">
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold uppercase mb-1">PBR</p>
                            <p className="text-pink-500 dark:text-pink-400 font-black text-2xl">{formattedPbr}</p>
                        </div>
                    </div>
                </div>

                {/* 후광 효과 (다크모드에서는 블루 광택을 좀 더 강조) */}
                <div className="absolute -inset-10 bg-gradient-to-tr from-blue-100/30 dark:from-blue-900/20 via-white/0 to-blue-100/30 dark:to-blue-900/20 opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 blur-3xl z-0" />
            </div>
        </div>
    );
};