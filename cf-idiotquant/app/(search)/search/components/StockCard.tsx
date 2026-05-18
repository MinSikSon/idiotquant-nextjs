"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Activity, Info, Sparkles, ShieldCheck, TrendingUp, DollarSign, Coins } from "lucide-react";
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

// TCG 등급 체계를 퀀트 투자 자산 분류 레이블로 현실성 있게 믹싱
const GRADE_THEMES: Record<string, any> = {
    SSS: { 
        frame: "from-pink-500 via-purple-600 via-cyan-400 to-pink-500", 
        label: "PREMIUM TIER", 
        glow: "shadow-[0_0_35px_rgba(219,39,119,0.35)] dark:shadow-[0_0_50px_rgba(168,85,247,0.55)]", 
        animate: true,
        textClass: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent dark:drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]",
        holoStyle: "linear-gradient(125deg, rgba(255,0,128,0.15) 0%, rgba(0,255,255,0.15) 30%, rgba(255,255,0,0.15) 60%, rgba(128,0,255,0.15) 100%)"
    },
    SS: { 
        frame: "from-amber-400 via-orange-500 to-yellow-500", 
        label: "GROWTH ALPHA", 
        glow: "shadow-[0_0_25px_rgba(245,158,11,0.25)] dark:shadow-[0_0_40px_rgba(234,88,12,0.45)]", 
        animate: true,
        textClass: "bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent",
        holoStyle: "linear-gradient(115deg, rgba(245,158,11,0.15) 10%, rgba(255,255,255,0.2) 45%, rgba(234,88,12,0.15) 80%)"
    },
    S: { 
        frame: "from-emerald-400 via-teal-500 to-cyan-500", 
        label: "DEEP VALUE", 
        glow: "shadow-[0_0_20px_rgba(16,185,129,0.2)] dark:shadow-[0_0_30px_rgba(6,182,212,0.35)]", 
        animate: false,
        textClass: "bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent",
        holoStyle: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.1) 100%)"
    },
    A: { 
        frame: "from-slate-300 to-slate-500 dark:from-slate-600 dark:to-slate-800", 
        label: "STABLE ASSET", 
        glow: "shadow-[0_4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_0_20px_rgba(0,0,0,0.2)]", 
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
    
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    const rotateX = useTransform(mouseY, [0, 1], [12, -12]);
    const rotateY = useTransform(mouseX, [0, 1], [-12, 12]);

    const holoX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
    const holoY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
    const holoOpacity = useTransform(mouseX, [0, 0.5, 1], [0.35, 0.08, 0.35]);

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
        if (!cardRef.current || isFlipped) return;
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
                    rotateX: isFlipped ? 0 : rotateX, 
                    rotateY: isFlipped ? 180 : rotateY,
                    transformStyle: 'preserve-3d' 
                }}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 160, damping: 22, mass: 1.2 }}
                className="w-full h-full relative transform-gpu"
            >
                {/* ================= FRONT CARD (Financial Intelligence Pack) ================= */}
                <div 
                    className={cn(
                        "absolute inset-0 rounded-[1.75rem] p-[4px] bg-gradient-to-br transition-all duration-300",
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
                    <div className="w-full h-full rounded-[1.5rem] bg-white dark:bg-zinc-950 flex flex-col relative overflow-hidden border border-black/5 dark:border-white/10 text-zinc-900 dark:text-white transition-colors duration-300">
                        
                        {/* 핀테크 코팅 느낌의 색 조합 필터 다이내믹 레이어 */}
                        {stock?.grade !== 'A' && (
                            <motion.div 
                                className="absolute inset-0 mix-blend-color-dodge pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{
                                    background: gradeTheme.holoStyle,
                                    backgroundPosition: useTransform(
                                        [holoX, holoY],
                                        (values) => `${values[0]} ${values[1]}`
                                    ),
                                    backgroundSize: '150% 150%',
                                    opacity: holoOpacity
                                }}
                            />
                        )}

                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-50 via-white to-zinc-100 dark:from-zinc-900/30 dark:via-zinc-950 dark:to-black pointer-events-none z-0" />
                        
                        {/* Top Bar */}
                        <div className="p-4 flex justify-between items-center bg-zinc-50/80 dark:bg-zinc-900/40 backdrop-blur-md border-b border-black/[0.06] dark:border-white/5 z-10 gap-3">
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-zinc-400 dark:text-zinc-500 font-black text-[8px] tracking-[0.25em] leading-none mb-1.5 uppercase italic flex items-center gap-1 font-mono">
                                    {stock?.isUs ? (
                                        <>
                                            <DollarSign className="w-2.5 h-2.5 text-amber-500" />
                                            SEC COMPLIANT ASSET
                                        </>
                                    ) : (
                                        <>
                                            <Coins className="w-2.5 h-2.5 text-emerald-500" />
                                            FSS COMPLIANT ASSET
                                        </>
                                    )}
                                </span>
                                <div className="flex items-center justify-between w-full gap-2">
                                    <h3 className="font-black text-xl text-zinc-900 dark:text-white tracking-tight truncate flex-1 min-w-0">
                                        {stock?.name}
                                    </h3>
                                    
                                    {chartConfig?.data?.length > 0 && (
                                        <div className="w-20 h-7 flex items-center justify-center opacity-75 dark:opacity-90 shrink-0 ml-auto transform translate-y-0.5">
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
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border bg-white dark:bg-zinc-900 shadow-sm transform group-hover:scale-105 transition-transform duration-300 shrink-0", theme.border)}>
                                <span className="text-xl filter drop-shadow-sm">{theme.icon}</span>
                            </div>
                        </div>

                        {/* Card Corporate Emblem Area */}
                        <div className="mx-3.5 mt-2 relative h-48 rounded-xl bg-gradient-to-b from-zinc-50 to-zinc-100/40 dark:from-zinc-900 dark:to-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center overflow-hidden group/logo z-10">
                            <div className="absolute inset-0 opacity-10 dark:opacity-25 bg-[linear-gradient(110deg,rgba(255,255,255,0)_30%,rgba(255,255,255,0.3)_45%,rgba(255,255,255,0)_60%)] animate-[shine_4s_infinite] pointer-events-none z-10" />
                            
                            {/* 리서치 페이퍼 느낌의 정밀 인덱스 격자망 오버레이 */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:10px_10px] z-0" />

                            {!imgError ? (
                                <div className="relative w-full h-full p-10 flex items-center justify-center z-10">
                                    <Image
                                        key={stock?.ticker}
                                        src={logoUrl} alt="logo" fill 
                                        className="object-contain p-12 drop-shadow-sm transition-all duration-500 group-hover/logo:scale-105" unoptimized
                                        onError={() => setImgError(true)}
                                    />
                                </div>
                            ) : (
                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic border-2 shadow-sm tracking-tighter z-10", theme.bg, theme.border)}>
                                    {stock?.ticker?.substring(0, 2)}
                                </div>
                            )}

                            {/* 자산 티어 정보 태그 */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-black/5 dark:border-white/10 px-2.5 py-1 rounded-md shadow-sm z-20">
                                <Sparkles className={cn("w-3 h-3", stock?.grade === 'SSS' ? "text-pink-500" : "text-amber-500")} />
                                <span className={cn("text-[8px] font-black tracking-widest font-mono", gradeTheme.textClass)}>{gradeTheme.label}</span>
                            </div>

                            <div className="absolute bottom-2.5 right-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-0.5 rounded border border-black/5 dark:border-white/10 z-20">
                                <span className="text-[9px] font-mono font-black text-zinc-500 dark:text-zinc-400 tracking-wider">{stock?.ticker}</span>
                            </div>
                        </div>

                        {/* Mid Section: Sector & Price */}
                        <div className="px-4 pt-4 flex justify-between items-end z-10">
                            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md border border-black/[0.03] dark:border-white/5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", stock?.isUs ? "bg-amber-500" : "bg-emerald-500")} />
                                <span className={cn("font-black text-[9px] tracking-wider uppercase font-mono", theme.color)}>{theme.label} INDEX</span>
                            </div>
                            <div className="text-right">
                                <div className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 leading-none mb-1 uppercase tracking-widest font-mono">Market Price</div>
                                <div className="text-2xl font-black italic tabular-nums tracking-tight bg-gradient-to-b from-zinc-950 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                                    <span className="text-sm mr-0.5 font-sans not-italic font-bold text-zinc-400 dark:text-zinc-500">{stock?.isUs ? "$" : "₩"}</span>
                                    {stock?.curPrice?.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Core Stats: TCG 배틀 느낌을 황소(상승)와 곰(하방방어) 구조의 주식 스탯으로 변경 */}
                        <div className="px-4 py-3.5 grid grid-cols-2 gap-2.5 z-10">
                            {/* 매수 추진력 (Bullpower ATK) */}
                            <div className="bg-rose-50/40 dark:bg-gradient-to-br dark:from-rose-950/20 dark:to-rose-950/5 border border-rose-100 dark:border-rose-500/20 p-2.5 rounded-xl flex items-center justify-between group/atk transition-colors">
                                <div className="flex flex-col">
                                    <div className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-mono">
                                        <TrendingUp className="w-2.5 h-2.5 text-rose-500" />
                                        BULLPOWER ATK
                                    </div>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-2xl font-black text-rose-600 dark:text-rose-400 italic tracking-tighter font-mono">
                                            {(stockStats?.upside ?? 0) > 0 ? "+" : ""}{stockStats.upside}
                                        </span>
                                        <span className="text-[9px] font-black text-rose-500/80 font-mono">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* 하방 방어력 (Bearshield DEF) */}
                            <div className="bg-blue-50/40 dark:bg-gradient-to-br dark:from-blue-950/20 dark:to-blue-950/5 border border-blue-100 dark:border-blue-500/20 p-2.5 rounded-xl flex items-center justify-between text-right group/def transition-colors">
                                <div className="w-full flex flex-col items-end">
                                    <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-end font-mono">
                                        BEARSHIELD DEF
                                        <ShieldCheck className="w-2.5 h-2.5 text-blue-500" />
                                    </div>
                                    <div className="flex items-baseline gap-0.5 justify-end">
                                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 italic tracking-tighter font-mono">
                                            {stockStats.safety.toFixed(0)}
                                        </span>
                                        <span className="text-[9px] font-black text-blue-500/80 font-mono">PTS</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Sub-stats Row */}
                        <div className="px-3.5 pb-4 mt-auto z-10">
                            <div className="grid grid-cols-3 gap-1.5 bg-zinc-50/80 dark:bg-zinc-900/40 backdrop-blur-md border border-black/[0.04] dark:border-white/5 rounded-xl p-2.5 shadow-sm">
                                <div className="flex flex-col items-center py-0.5">
                                    <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-1 tracking-wider font-mono">PER Multi</span>
                                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-200 italic font-mono">{stockStats.per}x</span>
                                </div>
                                <div className="flex flex-col items-center py-0.5 border-x border-black/[0.05] dark:border-white/5">
                                    <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-1 tracking-wider font-mono">PBR Multi</span>
                                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-200 italic font-mono">{stockStats.pbr}x</span>
                                </div>
                                <div className="flex flex-col items-center py-0.5">
                                    <span className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-1 tracking-wider font-mono">NCAV Index</span>
                                    <div className="flex items-center gap-0.5">
                                        <Activity className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 italic font-mono">{stockStats.ncav.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ================= BACK CARD (Analyst Intelligence Rule Book) ================= */}
                <div 
                    className="absolute inset-0 rounded-[1.75rem] bg-white dark:bg-zinc-950 border-[4px] border-zinc-200 dark:border-zinc-800 flex flex-col p-6 shadow-xl overflow-hidden text-left"
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden', 
                        transform: 'rotateY(180deg)',
                        pointerEvents: isFlipped ? 'auto' : 'none'
                    }}
                >
                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black z-0" />

                    <div className="flex items-center gap-3 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4 z-10">
                        <div className="w-9 h-9 bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-black rounded-xl flex items-center justify-center border border-black/5 dark:border-white/10">
                            <Info className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                        </div>
                        <div className="flex flex-col">
                            <h4 className="text-zinc-900 dark:text-white font-black text-xs tracking-[0.15em] italic uppercase">Quant Valuation Rules</h4>
                            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider font-mono">Benjamin Graham Formula</span>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar z-10">
                        {[
                            { title: "매수 상승 잠재력 (Bullpower ATK)", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50/30 dark:bg-zinc-900/40", border: "border-rose-100/60 dark:border-zinc-800/60", desc: "순유동자산(유동자산 - 총부채)이 현재 시가총액을 얼마나 초과하는지 계량화한 핵심 마진 수치입니다. 가격 괴리율이 클수록 강력한 매수 펌핑 추진력을 발휘합니다." },
                            { title: "하방 위험 방어력 (Bearshield DEF)", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/30 dark:bg-zinc-900/40", border: "border-blue-100/60 dark:border-zinc-800/60", desc: "시장 하방 압력 및 재무 리스크에 대한 안전망 점수입니다. 부채비율을 보수적으로 역산하여 고위험 한계 기업 카드를 철저하게 필터링합니다." },
                            { title: "NCAV 청산가치 지표", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/30 dark:bg-zinc-900/40", border: "border-emerald-100/60 dark:border-zinc-800/60", desc: "기업이 당장 영업을 중단하고 청산했을 때의 가치 대비 주가 비율입니다. 1.0을 상회하는 카드는 시장에 흔치 않은 절대적 안전마진 획득을 의미합니다." }
                        ].map((item, i) => (
                            <div key={i} className={cn("space-y-1.5 p-3 rounded-xl border", item.bg, item.border)}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", item.color.replace('text', 'bg'))} />
                                    <span className={cn("text-[10px] font-black uppercase tracking-tight italic", item.color)}>{item.title}</span>
                                </div>
                                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium pl-2.5 border-l border-zinc-200 dark:border-zinc-800">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-center z-10">
                        <div className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 tracking-[0.3em] italic mb-1 uppercase text-center font-mono">IdiotQuant Engine v2.5</div>
                        <div className="text-[7px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest italic font-mono">SYSTEM DATA FROM KOREA INVESTMENT HEDGE RUNTIME</div>
                    </div>
                </div>
            </motion.div>

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