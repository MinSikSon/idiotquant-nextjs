"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Activity, Info, Sparkles, Shield, Swords, DollarSign, Coins } from "lucide-react";
import LineChart from "@/components/LineChart";

const SECTOR_THEMES: Record<string, any> = {
    IRON: { bg: "bg-zinc-100 dark:bg-zinc-900", border: "border-zinc-300 dark:border-zinc-600/50", icon: "⚙️", label: "MECH", color: "text-zinc-600 dark:text-zinc-400" },
    CHIP: { bg: "bg-blue-50 dark:bg-blue-950/50", border: "border-blue-200 dark:border-blue-500/50", icon: "💾", label: "CHIP", color: "text-blue-600 dark:text-blue-400" },
    NET: { bg: "bg-indigo-50 dark:bg-indigo-950/50", border: "border-indigo-200 dark:border-indigo-500/50", icon: "🌐", label: "WEB", color: "text-indigo-600 dark:text-indigo-400" },
    BIO: { bg: "bg-emerald-50 dark:bg-emerald-950/50", border: "border-emerald-200 dark:border-emerald-500/50", icon: "🧬", label: "BIO", color: "text-emerald-600 dark:text-emerald-400" },
    FUEL: { bg: "bg-amber-50 dark:bg-amber-950/50", border: "border-amber-200 dark:border-amber-500/50", icon: "🔋", label: "FUEL", color: "text-amber-600 dark:text-amber-400" },
    FLOW: { bg: "bg-cyan-50 dark:bg-cyan-950/50", border: "border-cyan-200 dark:border-cyan-500/50", icon: "💸", label: "FLOW", color: "text-cyan-600 dark:text-cyan-400" },
    BASE: { bg: "bg-stone-100 dark:bg-stone-900", border: "border-stone-300 dark:border-stone-600/50", icon: "🏗️", label: "BASE", color: "text-stone-600 dark:text-stone-400" },
    STAR: { bg: "bg-rose-50 dark:bg-rose-950/50", border: "border-rose-200 dark:border-rose-500/50", icon: "✨", label: "STAR", color: "text-rose-600 dark:text-rose-400" },
    LIFE: { bg: "bg-lime-50 dark:bg-lime-950/50", border: "border-lime-200 dark:border-lime-500/50", icon: "🍎", label: "LIFE", color: "text-lime-600 dark:text-lime-400" }
};

const GRADE_THEMES: Record<string, any> = {
    SSS: { 
        frame: "from-pink-500 via-purple-600 via-cyan-400 to-pink-500", 
        label: "ULTRA RARE", 
        glow: "shadow-[0_0_35px_rgba(219,39,119,0.45)] dark:shadow-[0_0_50px_rgba(168,85,247,0.65)]", 
        animate: true,
        textClass: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent dark:drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]",
        holoStyle: "linear-gradient(125deg, rgba(255,0,128,0.2) 0%, rgba(0,255,255,0.2) 30%, rgba(255,255,0,0.2) 60%, rgba(128,0,255,0.2) 100%)"
    },
    SS: { 
        frame: "from-amber-400 via-orange-500 to-yellow-500", 
        label: "SUPER RARE", 
        glow: "shadow-[0_0_25px_rgba(245,158,11,0.35)] dark:shadow-[0_0_40px_rgba(234,88,12,0.55)]", 
        animate: true,
        textClass: "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent",
        holoStyle: "linear-gradient(115deg, rgba(245,158,11,0.25) 10%, rgba(255,255,255,0.3) 45%, rgba(234,88,12,0.25) 80%)"
    },
    S: { 
        frame: "from-emerald-400 via-teal-500 to-cyan-500", 
        label: "RARE", 
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)] dark:shadow-[0_0_30px_rgba(6,182,212,0.45)]", 
        animate: false,
        textClass: "bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent",
        holoStyle: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,182,212,0.15) 100%)"
    },
    A: { 
        frame: "from-slate-300 to-slate-500 dark:from-slate-600 dark:to-slate-800", 
        label: "COMMON", 
        glow: "shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.3)]", 
        animate: false,
        textClass: "text-slate-600 dark:text-slate-300",
        holoStyle: "none"
    },
};

interface StockCardProps {
    stock: any;
    chartConfig: {
        data: number[];
        categories: string[];
        color: string;
    };
    rawData?: any;
    isCompact?: boolean;
}

export const StockCard = ({ stock, chartConfig, rawData, isCompact = false }: StockCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [imgError, setImgError] = useState(false);
    
    // 마우스 물리 무브먼트를 위한 Framer-motion MotionValue 정의
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    // 정면 상태일 때 마우스 트래킹 틸트 계산 (뒤집혔을 때는 트래킹을 잠그거나 0으로 수렴하게 유도)
    const rotateX = useTransform(mouseY, [0, 1], [15, -15]);
    const rotateY = useTransform(mouseX, [0, 1], [-15, 15]);

    // 실시간 홀로그램 위치 반사 매핑 (카드가 기울어지는 각도에 부합하도록 배경 그라데이션 중심 변경)
    const holoX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
    const holoY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
    const holoOpacity = useTransform(mouseX, [0, 0.5, 1], [0.4, 0.1, 0.4]);

    useEffect(() => {
        setImgError(false);
        setIsFlipped(false);
    }, [stock?.ticker]);

    const theme = useMemo(() => {
        const s = (stock?.sector || "").toUpperCase();
        const found = Object.keys(SECTOR_THEMES).find(key => 
            s.includes(key) || 
            (key === 'IRON' && (s.includes("자동차") || s.includes("운수"))) ||
            (key === 'CHIP' && (s.includes("전자") || s.includes("IT")))
        );
        return SECTOR_THEMES[found || 'LIFE'];
    }, [stock?.sector]);

    const gradeTheme = useMemo(() => GRADE_THEMES[stock?.grade] || GRADE_THEMES.A, [stock?.grade]);

    const stockStats = useMemo(() => {
        if (!stock) return { upside: 0, safety: 0, per: 0, ncav: 0, pbr: 0 };
        const upside = Math.min(150, Math.floor(Number(stock?.ncavScore || 0) * 120));
        const safety = Math.max(0, Math.min(99, 100 - (Number(stock?.debtRatio || 0) / 2)));
        return { upside, safety, per: stock?.per || 0, ncav: stock?.ncavScore || 0, pbr: stock?.pbr || 0 };
    }, [stock]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current || isFlipped) return; // 뒤집힌 상태에서는 틸트 효과 무시
        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const x = (e.clientX - rect.left) / width;
        const y = (e.clientY - rect.top) / height;
        
        mouseX.set(x);
        mouseY.set(y);
    }, [mouseX, mouseY, isFlipped]);

    const resetRotation = useCallback(() => {
        mouseX.set(0.5);
        mouseY.set(0.5);
    }, [mouseX, mouseY]);

    const logoUrl = stock?.isUs 
        ? `https://img.logo.dev/ticker/${stock.ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}` 
        : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}`;

    return (
        <div
            ref={cardRef}
            className={cn(
                "relative select-none cursor-pointer group transform-gpu",
                isCompact ? "w-64 h-[25rem]" : "w-[22.5rem] h-[33rem]"
            )}
            style={{ perspective: '2000px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetRotation}
            onClick={() => setIsFlipped(prev => !prev)}
        >
            <motion.div
                style={{ 
                    // 정면일 때는 마우스 인터렉션 틸트 적용, 뒤집히는 순간 180도 Y축 회전 고정
                    rotateX: isFlipped ? 0 : rotateX, 
                    rotateY: isFlipped ? 180 : rotateY,
                    transformStyle: 'preserve-3d' 
                }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 160, damping: 22, mass: 1.2 }}
                className="w-full h-full relative transform-gpu"
            >
                {/* ================= FRONT CARD ================= */}
                <div 
                    className={cn(
                        "absolute inset-0 rounded-[1.75rem] p-[5px] bg-gradient-to-br transition-all duration-300",
                        gradeTheme.frame,
                        gradeTheme.glow,
                        gradeTheme.animate && "bg-[length:200%_200%] animate-[gradient-xy_4s_ease_infinite]"
                    )}
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(0deg)',
                        pointerEvents: isFlipped ? 'none' : 'auto'
                    }}
                >
                    {/* Inner Container */}
                    <div className="w-full h-full rounded-[1.5rem] bg-white dark:bg-zinc-950 flex flex-col relative overflow-hidden border border-black/5 dark:border-white/10 text-zinc-900 dark:text-white transition-colors duration-300">
                        
                        {/* TCG 3D 홀로그램 무빙 플래시 레이어 (SSS, SS, S 등급만 작동) */}
                        {stock?.grade !== 'A' && (
                            <motion.div 
                                className="absolute inset-0 mix-blend-color-dodge pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                    background: gradeTheme.holoStyle,
                                    backgroundPosition: useTransform(
                                        [holoX, holoY],
                                        (values) => `${values[0]} ${values[1]}`
                                    ),
                                    backgroundSize: '175% 175%',
                                    opacity: holoOpacity
                                }}
                            />
                        )}

                        {/* 디테일 백그라운드 데코레이션 */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100/50 via-white to-zinc-50 dark:from-zinc-900/40 dark:via-zinc-950 dark:to-black pointer-events-none z-0" />
                        
                        {/* Top Bar */}
                        <div className="p-4 flex justify-between items-center bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-md border-b border-black/[0.06] dark:border-white/5 z-10 gap-3">
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-zinc-400 dark:text-zinc-500 font-black text-[9px] tracking-[0.2em] leading-none mb-1.5 uppercase italic flex items-center gap-1">
                                    {stock?.isUs ? (
                                        <>
                                            <DollarSign className="w-2.5 h-2.5 text-amber-500" />
                                            Overseas Asset
                                        </>
                                    ) : (
                                        <>
                                            <Coins className="w-2.5 h-2.5 text-emerald-500" />
                                            Domestic Asset
                                        </>
                                    )}
                                </span>
                                <div className="flex items-center justify-between w-full gap-2">
                                    <h3 className="font-black text-xl text-zinc-900 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate flex-1 min-w-0">
                                        {stock?.name}
                                    </h3>
                                    
                                    {/* 차트 영역 */}
                                    {chartConfig && chartConfig.data && chartConfig.data.length > 0 && (
                                        <div className="w-20 h-7 flex items-center justify-center opacity-80 dark:opacity-90 shrink-0 ml-auto transform translate-y-0.5">
                                            <LineChart
                                                data_array={[{ name: "Trend", data: chartConfig.data, color: chartConfig.color }]}
                                                category_array={chartConfig.categories}
                                                height={28}
                                                show_yaxis_label={false}
                                                legend_disable
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border bg-white dark:bg-zinc-900 shadow-sm dark:shadow-xl transform group-hover:rotate-12 transition-transform duration-300 shrink-0", theme.border)}>
                                <span className="text-xl filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{theme.icon}</span>
                            </div>
                        </div>

                        {/* Card Image Area */}
                        <div className="mx-3.5 mt-2 relative h-48 rounded-xl bg-gradient-to-b from-zinc-50 to-zinc-100/60 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center overflow-hidden group/logo z-10">
                            {/* Holographic Flash Effect */}
                            <div className="absolute inset-0 opacity-15 dark:opacity-25 bg-[linear-gradient(110deg,rgba(255,255,255,0)_30%,rgba(255,255,255,0.4)_45%,rgba(255,255,255,0)_60%)] animate-[shine_4s_infinite] pointer-events-none z-10" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-rose-500/5 dark:from-blue-500/10 dark:to-rose-500/10 z-0" />
                            
                            {/* TCG 격자 패턴 오버레이 */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:12px_12px] z-0" />

                            {!imgError ? (
                                <div className="relative w-full h-full p-10 flex items-center justify-center z-10">
                                    <Image
                                        key={stock?.ticker}
                                        src={logoUrl} alt="logo" fill 
                                        className="object-contain p-10 drop-shadow-md dark:drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-500 group-hover/logo:scale-110 group-hover/logo:rotate-1" unoptimized
                                        onError={() => setImgError(true)}
                                    />
                                </div>
                            ) : (
                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic border-2 shadow-xl transform tracking-tighter z-10", theme.bg, theme.border)}>
                                    {stock?.ticker?.substring(0, 2)}
                                </div>
                            )}

                            {/* Rarity Tag */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-black/5 dark:border-white/10 px-2.5 py-1 rounded-md shadow-sm dark:shadow-lg z-20">
                                <Sparkles className={cn("w-3 h-3 animate-pulse", stock?.grade === 'SSS' ? "text-pink-500" : "text-amber-500")} />
                                <span className={cn("text-[9px] font-black tracking-widest", gradeTheme.textClass)}>{gradeTheme.label}</span>
                            </div>

                            {/* Ticker Floating Tag */}
                            <div className="absolute bottom-2.5 right-2.5 bg-white/75 dark:bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-black/5 dark:border-white/5 z-20">
                                <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 tracking-wider">{stock?.ticker}</span>
                            </div>
                        </div>

                        {/* Mid Section: Class & Price */}
                        <div className="px-4 pt-3.5 flex justify-between items-end z-10">
                            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/80 px-2.5 py-1 rounded-full border border-black/[0.03] dark:border-white/5">
                                <div className={cn("w-2 h-2 rounded-full animate-pulse", stock?.isUs ? "bg-amber-500" : "bg-emerald-500")} />
                                <span className={cn("font-black text-[10px] tracking-wider uppercase font-mono", theme.color)}>{theme.label}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 leading-none mb-1 uppercase tracking-wider italic">Market Value</div>
                                <div className="text-2xl font-black italic tabular-nums tracking-tight bg-clip-text bg-gradient-to-b from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300">
                                    <span className="text-xs mr-0.5 font-sans not-italic text-zinc-400 dark:text-zinc-500">{stock?.isUs ? "$" : "₩"}</span>
                                    {stock?.curPrice?.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Core Stats: ATK / DEF Display */}
                        <div className="px-4 py-3 grid grid-cols-2 gap-2.5 z-10">
                            {/* Potential ATK */}
                            <div className="bg-rose-50/60 dark:bg-gradient-to-br dark:from-rose-950/40 dark:to-rose-950/10 border border-rose-200 dark:border-rose-500/30 p-2.5 rounded-xl flex items-center justify-between group/atk hover:border-rose-400 dark:hover:border-rose-500/60 transition-colors">
                                <div className="flex flex-col">
                                    <div className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                                        <Swords className="w-2.5 h-2.5 text-rose-500" />
                                        POTENTIAL ATK
                                    </div>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-2xl font-black text-rose-600 dark:text-rose-400 italic tracking-tighter">
                                            {(stockStats?.upside ?? 0) > 0 ? "+" : ""}{stockStats.upside}
                                        </span>
                                        <span className="text-[10px] font-black text-rose-500/80 uppercase font-mono">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Defense DEF */}
                            <div className="bg-blue-50/60 dark:bg-gradient-to-br dark:from-blue-950/40 dark:to-blue-950/10 border border-blue-200 dark:border-blue-500/30 p-2.5 rounded-xl flex items-center justify-between text-right group/def hover:border-blue-400 dark:hover:border-blue-500/60 transition-colors">
                                <div className="w-full flex flex-col items-end">
                                    <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-0.5 flex items-center gap-1 justify-end">
                                        DEFENSE DEF
                                        <Shield className="w-2.5 h-2.5 text-blue-500" />
                                    </div>
                                    <div className="flex items-baseline gap-0.5 justify-end">
                                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 italic tracking-tighter">
                                            {stockStats.safety.toFixed(0)}
                                        </span>
                                        <span className="text-[10px] font-black text-blue-500/80 uppercase font-mono">PTS</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Sub-stats Row */}
                        <div className="px-3.5 pb-4 mt-auto z-10">
                            <div className="grid grid-cols-3 gap-1.5 bg-zinc-50 dark:bg-zinc-900/60 backdrop-blur-md border border-black/[0.05] dark:border-white/5 rounded-xl p-2.5 shadow-sm dark:shadow-md">
                                <div className="flex flex-col items-center py-0.5">
                                    <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-1 tracking-wider italic font-mono">PER Rate</span>
                                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-200 italic font-mono">{stockStats.per}x</span>
                                </div>
                                <div className="flex flex-col items-center py-0.5 border-x border-black/[0.05] dark:border-white/5">
                                    <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-1 tracking-wider italic font-mono">PBR Rate</span>
                                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-200 italic font-mono">{stockStats.pbr}x</span>
                                </div>
                                <div className="flex flex-col items-center py-0.5">
                                    <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-1 tracking-wider italic font-mono">NCAV Index</span>
                                    <div className="flex items-center gap-0.5">
                                        <Activity className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 italic font-mono">{stockStats.ncav.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= BACK CARD ================= */}
                <div 
                    className="absolute inset-0 rounded-[1.75rem] bg-white dark:bg-zinc-950 border-[5px] border-zinc-200 dark:border-zinc-800 flex flex-col p-6 shadow-xl dark:shadow-2xl overflow-hidden text-left"
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden', 
                        transform: 'rotateY(180deg)',
                        pointerEvents: isFlipped ? 'auto' : 'none'
                    }}
                >
                    <div className="absolute inset-0 opacity-5 dark:opacity-10 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black z-0" />

                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4 z-10">
                        <div className="w-9 h-9 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-black rounded-xl flex items-center justify-center shadow-sm dark:shadow-lg border border-black/5 dark:border-white/10">
                            <Info className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-zinc-900 dark:text-white font-black text-xs tracking-[0.15em] italic uppercase">Algorithm Rule Book</h4>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider font-mono">NCAV Quantification</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-5 overflow-y-auto no-scrollbar z-10">
                        {[
                            { title: "상승 잠재력 (Potential ATK)", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50/40 dark:bg-zinc-900/40", border: "border-rose-100 dark:border-zinc-800/60", desc: "순유동자산(Current Assets - Total Liabilities)이 현재 시가총액을 얼마나 초과하는지 나타내는 본질적인 자산 가치의 공격력 지표입니다." },
                            { title: "재무 안전성 (Defense DEF)", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/40 dark:bg-zinc-900/40", border: "border-blue-100 dark:border-zinc-800/60", desc: "피해야 할 고위험 카드를 필터링하기 위해 부채비율을 엄격하게 계량화하여 리스크 매니지먼트를 강화한 방어 수치입니다." },
                            { title: "NCAV Index", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/40 dark:bg-zinc-900/40", border: "border-emerald-100 dark:border-zinc-800/60", desc: "가치투자의 거장 벤자민 그레이엄의 보수적 저평가 청산 가치 공식입니다. 1.0 점수가 상회할수록 절대적인 안전마진이 확보되었음을 의미합니다." }
                        ].map((item, i) => (
                            <div key={i} className={cn("space-y-1.5 p-2.5 rounded-xl border", item.bg, item.border)}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", item.color.replace('text', 'bg'))} />
                                    <span className={cn("text-[11px] font-black uppercase tracking-tight italic", item.color)}>{item.title}</span>
                                </div>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium pl-3 border-l border-zinc-200 dark:border-zinc-800">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-center z-10">
                        <div className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 tracking-[0.4em] italic mb-1 uppercase text-center">IdiotQuant Engine v2.5</div>
                        <div className="text-[7px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest italic font-mono">NEXT.js 15 EDGE RUNTIME READY</div>
                    </div>
                </div>
            </motion.div>

            {/* CSS 최적화 애니메이션 */}
            <style jsx global>{`
                @keyframes shine {
                    0% { transform: translateX(-200%) skewX(-35deg); }
                    100% { transform: translateX(200%) skewX(-35deg); }
                }
                @keyframes gradient-xy {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};