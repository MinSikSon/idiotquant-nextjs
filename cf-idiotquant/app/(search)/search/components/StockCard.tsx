"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import LineChart from "@/components/LineChart";

// 등급별 디자인 설정
const GRADE_CONFIG: Record<string, any> = {
    SSS: { frame: "bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400", inner: "bg-white/90", text: "text-purple-600", sparkle: true, label: "HYPER RARE" },
    SS: { frame: "bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-200", inner: "bg-amber-50/90", text: "text-amber-700", sparkle: true, label: "SUPER RARE" },
    S: { frame: "bg-[#ffd700]", inner: "bg-amber-50", text: "text-amber-600", sparkle: true, label: "RARE" },
    A: { frame: "bg-[#c0c0c0]", inner: "bg-slate-50", text: "text-slate-700", sparkle: false, label: "UNCOMMON" },
    B: { frame: "bg-[#cd7f32]", inner: "bg-orange-50", text: "text-orange-800", sparkle: false, label: "COMMON" },
    C: { frame: "bg-blue-400", inner: "bg-blue-50", text: "text-blue-700", sparkle: false, label: "COMMON" },
    D: { frame: "bg-green-400", inner: "bg-green-50", text: "text-green-700", sparkle: false, label: "COMMON" },
    E: { frame: "bg-gray-400", inner: "bg-gray-50", text: "text-gray-700", sparkle: false, label: "COMMON" },
    F: { frame: "bg-zinc-500", inner: "bg-zinc-100", text: "text-zinc-800", sparkle: false, label: "BASIC" },
};

export const StockCard = ({ stock, chartConfig }: any) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [isError, setIsError] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

    const grade = stock?.grade?.grade?.toUpperCase() || 'F';
    const config = GRADE_CONFIG[grade] || GRADE_CONFIG['F'];

    const logoUrl = useMemo(() => {
        const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(stock.name);
        if (!isError) {
            if (stock.isUs && stock.name && !hasKorean) {
                return `https://img.logo.dev/ticker/${stock.name.toUpperCase()}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&retina=true&size=200`;
            } else if (stock.ticker) {
                return `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}?size=200`
            }
        }
        return "";
    }, [stock.name, stock.ticker, stock.isUs, isError]);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            setRotation({ x: (centerY - y) / centerY * 15, y: (x - centerX) / centerX * 15 });
            setGlare({ x: (x / rect.width) * 100, y: (y / rect.height) * 100, opacity: grade.includes('S') ? 0.8 : 0.4 });
        };

        const handleMouseLeave = () => {
            setRotation({ x: 0, y: 0 });
            setGlare(prev => ({ ...prev, opacity: 0 }));
        };

        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);
        return () => {
            card.removeEventListener('mousemove', handleMouseMove);
            card.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [grade]);

    return (
        <div
            ref={cardRef}
            className="group/card relative w-[22rem] h-[32rem] transition-transform duration-150 ease-out select-none cursor-pointer"
            style={{
                perspective: '1200px',
                transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
            }}
        >
            {/* 1. 등급별 외곽 프레임 */}
            <div className={`w-full h-full p-[12px] rounded-[1.5rem] ${config.frame} shadow-2xl relative overflow-hidden flex flex-col border-2 border-black/20 transition-colors duration-500`}>

                {/* 2. 등급별 특수 홀로그램 효과 */}
                <div
                    className="absolute inset-0 z-30 pointer-events-none transition-opacity duration-300"
                    style={{
                        background: grade.startsWith('S')
                            ? `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 40%), linear-gradient(${glare.x}deg, rgba(255,255,255,0.1), rgba(255,255,255,0.4), rgba(255,255,255,0.1))`
                            : `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 60%)`,
                        opacity: glare.opacity,
                        mixBlendMode: 'overlay'
                    }}
                />

                {/* 3. 내부 메인 박스 */}
                <div className={`relative w-full h-full ${config.inner} dark:bg-zinc-900 rounded-[0.5rem] border-[4px] border-black/5 flex flex-col overflow-hidden transition-colors duration-500`}>

                    {/* Header */}
                    <div className="flex justify-between items-start px-4 pt-3 pb-1">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{config.label}</span>
                            <h3 className="text-zinc-900 dark:text-zinc-100 font-bold text-2xl tracking-tight leading-none drop-shadow-sm">
                                {stock.name}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-red-600 drop-shadow-sm">TICKER {stock.ticker?.substring(0, 4)}</span>
                            <div className={`w-9 h-9 rounded-full shadow-lg border-2 border-white flex items-center justify-center ${config.frame} group-hover/card:scale-110 transition-transform`}>
                                <span className="text-white font-black text-base drop-shadow-md">{grade}</span>
                            </div>
                        </div>
                    </div>

                    {/* 일러스트 영역 */}
                    <div className={`mx-3 mt-1 relative h-44 border-[5px] border-black/10 shadow-inner bg-white overflow-hidden`}>
                        {logoUrl && !isError ? (
                            <img
                                src={logoUrl}
                                alt={stock.name}
                                className="w-full h-full object-contain p-4 group-hover/card:scale-110 transition-transform duration-500"
                                onError={() => setIsError(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                                <span className="text-6xl font-black text-zinc-200">{stock.name[0]}</span>
                            </div>
                        )}
                        {/* 등급이 높을 때 하단에 반짝이는 띠 추가 */}
                        {config.sparkle && (
                            <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
                        )}
                    </div>

                    {/* 기술/데이터 영역 */}
                    <div className="flex-1 px-4 py-4 flex flex-col gap-3">
                        <div className="relative">
                            <div className="flex justify-between items-center border-b-2 border-dotted border-zinc-300 pb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">💰</span>
                                    <span className="font-bold text-sm dark:text-zinc-300 uppercase">Fair Value</span>
                                </div>
                                <div className={`font-black text-xl ${config.text}`}>
                                    {stock.isUs ? "$" : "₩"}{typeof stock.fairValue === 'number' ? stock.fairValue.toLocaleString() : stock.fairValue}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/50 dark:bg-zinc-800/50 p-2 rounded border border-black/5 flex flex-col items-center">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">PER Ratio</span>
                                <span className="font-black text-lg text-blue-600">{stock.per}</span>
                            </div>
                            <div className="bg-white/50 dark:bg-zinc-800/50 p-2 rounded border border-black/5 flex flex-col items-center">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase">PBR Ratio</span>
                                <span className="font-black text-lg text-pink-500">{stock.pbr}</span>
                            </div>
                        </div>
                    </div>

                    {/* 하단 플레이버 텍스트 (도감 설명) */}
                    <div className="mt-auto px-4 pb-4">
                        <div className={`p-2 rounded italic text-[9px] leading-tight transition-colors ${grade.startsWith('S') ? 'bg-amber-100/50 text-amber-900' : 'bg-zinc-100 text-zinc-600'}`}>
                            {grade === 'SSS'
                                ? "전설 속의 우량주. 이 카드를 손에 넣는 자는 시장의 지배자가 된다고 전해진다."
                                : `${stock.name}(은)는 ${grade} 등급의 에너지를 지닌 종목이다. 현재 지표는 시장 평균 대비 ${parseFloat(stock.per) > 15 ? '높은' : '안정적인'} 흐름을 보인다.`}
                        </div>
                    </div>

                    {/* 배경 차트 (미세하게) */}
                    <div className="absolute bottom-0 left-0 w-full h-12 opacity-[0.05] pointer-events-none">
                        {chartConfig?.data && (
                            <LineChart
                                data_array={[{ name: "Price", data: chartConfig.data, color: "#000" }]}
                                category_array={chartConfig.categories}
                                height={48}
                                show_yaxis_label={false}
                                legend_disable
                                grid_disable
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};