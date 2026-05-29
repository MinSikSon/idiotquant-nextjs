"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Activity, Info, Sparkles, ShieldCheck, TrendingUp, DollarSign, Coins, Award } from "lucide-react";
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

const LEVEL_THEMES = [
    {
        minLevel: 1,
        title: "WATCHLIST",

        // 기본 카드
        frame:
            "border rounded-[1.75rem] border-zinc-200/70 dark:border-zinc-800 " +
            "bg-white dark:bg-zinc-950 " +
            "shadow-sm",

        badge:
            "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",

        bar:
            "from-zinc-400 to-zinc-300",

        aura:
            "from-transparent via-transparent to-transparent",

        overlay:
            "",
    },

    {
        minLevel: 3,
        title: "FREQUENT VIEW",

        // 은은한 푸른 기운
        frame:
            "border rounded-[1.75rem] border-sky-200/70 dark:border-sky-900/70 " +
            "bg-gradient-to-br from-white to-sky-50/40 " +
            "dark:from-zinc-950 dark:to-sky-950/10 " +
            "shadow-[0_2px_12px_rgba(56,189,248,0.08)]",

        badge:
            "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",

        bar:
            "from-sky-400 to-cyan-400",

        aura:
            "from-sky-400/10 via-transparent to-transparent",

        overlay:
            "before:absolute before:inset-0 before:rounded-[inherit] " +
            "before:bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.04)_30%,transparent_60%)]",
    },

    {
        minLevel: 6,
        title: "HIGH CONVICTION",

        // 살짝 premium glass
        frame:
            "border rounded-[1.75rem] border-emerald-200/80 dark:border-emerald-900/60 " +
            "bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 " +
            "dark:from-zinc-950 dark:via-emerald-950/10 dark:to-teal-950/10 " +
            "backdrop-blur-sm " +
            "shadow-[0_4px_18px_rgba(16,185,129,0.10)]",

        badge:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",

        bar:
            "from-emerald-400 via-teal-400 to-cyan-400",

        aura:
            "from-emerald-400/15 via-transparent to-cyan-400/10",

        overlay:
            "before:absolute before:inset-0 before:rounded-[inherit] " +
            "before:bg-[linear-gradient(130deg,transparent_0%,rgba(255,255,255,0.05)_28%,transparent_55%)]",
    },

    {
        minLevel: 10,
        title: "CORE POSITION",

        // 여기부터 subtle hologram
        frame:
            "border rounded-[1.75rem] border-violet-200/80 dark:border-violet-900/60 " +
            "bg-gradient-to-br from-white via-violet-50/25 to-fuchsia-50/15 " +
            "dark:from-zinc-950 dark:via-violet-950/12 dark:to-fuchsia-950/10 " +
            "backdrop-blur-md " +
            "shadow-[0_6px_24px_rgba(139,92,246,0.12)]",

        badge:
            "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",

        bar:
            "from-violet-400 via-purple-400 to-fuchsia-400",

        aura:
            "from-violet-400/15 via-transparent to-fuchsia-400/12",

        overlay:
            "before:absolute before:inset-0 before:rounded-[inherit] " +
            "before:bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.07)_22%,rgba(192,132,252,0.04)_36%,transparent_58%)]",
    },

    {
        minLevel: 15,
        title: "PRIORITY ASSET",

        // premium metallic
        frame:
            "border rounded-[1.75rem] border-amber-200/80 dark:border-amber-800/60 " +
            "bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 " +
            "dark:from-zinc-950 dark:via-amber-950/12 dark:to-orange-950/10 " +
            "backdrop-blur-md " +
            "shadow-[0_8px_30px_rgba(245,158,11,0.14)]",

        badge:
            "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 font-medium",

        bar:
            "from-amber-300 via-orange-400 to-rose-400",

        aura:
            "from-amber-400/18 via-orange-400/10 to-transparent",

        overlay:
            "before:absolute before:inset-0 before:rounded-[inherit] " +
            "before:bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.10)_18%,rgba(251,191,36,0.05)_28%,transparent_48%)]",
    },

    {
        minLevel: 25,
        title: "SIGNATURE HOLDING",

        // 최고 레벨도 절제된 luxury
        frame:
            "border rounded-[1.75rem] border-cyan-200/80 dark:border-cyan-800/60 " +
            "bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(240,249,255,0.9),rgba(236,254,255,0.85))] " +
            "dark:bg-[linear-gradient(135deg,rgba(9,9,11,1),rgba(8,47,73,0.28),rgba(30,41,59,0.95))] " +
            "backdrop-blur-lg " +
            "shadow-[0_10px_36px_rgba(34,211,238,0.16)]",

        badge:
            "bg-gradient-to-r from-cyan-100 to-sky-100 " +
            "text-cyan-900 dark:from-cyan-950 dark:to-sky-950 dark:text-cyan-200 " +
            "font-semibold",

        bar:
            "from-cyan-300 via-sky-400 to-indigo-400",

        aura:
            "from-cyan-400/18 via-sky-400/10 to-indigo-400/14",

        overlay:
            "before:absolute before:inset-0 before:rounded-[inherit] " +
            "before:bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.12)_14%,rgba(125,211,252,0.05)_24%,transparent_42%)]",
    },
] as const;

interface StockXpProfile {
    level: number;
    xp: number;
    maxXp: number;
    totalXp: number;
    lastGain: number;
    awardCount: number;
}

interface StockCardProps {
    stock: any;
    chartConfig: {
        data: number[];
        categories: string[];
        color: string;
    };
    rawData?: any;
    isCompact?: boolean;
    stockXpProfile?: StockXpProfile;
}

interface FloatingText {
    id: number;
    text: string;
}

const getLevelTheme = (level: number) => {
    return [...LEVEL_THEMES].reverse().find((theme) => level >= theme.minLevel) ?? LEVEL_THEMES[0];
};

export const StockCard = ({ stock, chartConfig, rawData, isCompact = false, stockXpProfile }: StockCardProps) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [imgError, setImgError] = useState(false);
    
    const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
    const nextTextId = useRef<number>(0);
    const previousAwardCountRef = useRef<number>(stockXpProfile?.awardCount ?? 0);
    
    const cardRef = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    const rotateX = useTransform(mouseY, [0, 1], [12, -12]);
    const rotateY = useTransform(mouseX, [0, 1], [-12, 12]);

    const holoX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
    const holoY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
    const holoOpacity = useTransform(mouseX, [0, 0.5, 1], [0.35, 0.08, 0.35]);

    const level = stockXpProfile?.level ?? 1;
    const exp = stockXpProfile?.xp ?? 0;
    const maxExp = Math.max(1, stockXpProfile?.maxXp ?? 100);
    const levelTheme = useMemo(() => getLevelTheme(level), [level]);

    // 초기 데이터 로드 (Hydration 매칭을 위해 useEffect 안에서 실행)
    useEffect(() => {
        setImgError(false);
        setIsFlipped(false);
        previousAwardCountRef.current = stockXpProfile?.awardCount ?? 0;
    }, [stock?.ticker]);

    const clearTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!stockXpProfile || stockXpProfile.awardCount <= previousAwardCountRef.current) return;

        previousAwardCountRef.current = stockXpProfile.awardCount;
        const expId = nextTextId.current++;

        // 1. 새로운 텍스트 추가
        // setFloatingTexts(prev => [...prev, { id: expId, text: `+${stockXpProfile.lastGain} STOCK XP` }]);

        // 2. 기존의 전체 초기화 타이머가 있다면 삭제 (새로운 활동이 있을 때마다 시간 연장)
        if (clearTimerRef.current) {
            window.clearTimeout(clearTimerRef.current);
        }

        // 3. 마지막 활동으로부터 3초(3000ms) 뒤에 모든 목록을 비움
        clearTimerRef.current = window.setTimeout(() => {
            setFloatingTexts([]);
        }, 3000);

        // 4. 개별 텍스트 삭제 타이머 (기존 유지)
        const expTimer = window.setTimeout(() => {
            setFloatingTexts(prev => prev.filter(t => t.id !== expId));
        }, 900);

        return () => {
            window.clearTimeout(expTimer);
            // 클린업 함수에서 전체 초기화 타이머는 남겨두거나 상황에 맞게 제어
        };
    }, [stockXpProfile]);

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

    // 성장 시스템 보너스가 연산된 주식 능력치 산출
    const stockStats = useMemo(() => {
        if (!stock) return { upside: 0, safety: 0, per: 0, ncav: 0, pbr: 0 };
        const baseUpside = Math.min(150, Math.floor(Number(stock?.ncavScore || 0) * 120));
        const baseSafety = Math.max(0, Math.min(99, 100 - (Number(stock?.debtRatio || 0) / 2)));
        
        // 검색 숙련도 레벨이 높을수록 카드의 리서치 보정치를 시각적으로 가산합니다.
        const levelBonusAtk = (level - 1) * 1.2;
        const levelBonusDef = (level - 1) * 0.6;

        return { 
            upside: baseUpside + levelBonusAtk, 
            safety: baseSafety + levelBonusDef, 
            per: stock?.per || 0, 
            ncav: stock?.ncavScore || 0, 
            pbr: stock?.pbr || 0 
        };
    }, [stock, level]);

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
        ? `https://img.logo.dev/ticker/${stock.ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200` 
        : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}`;

    return (
        <div
            ref={cardRef}
            className={cn(
                "relative select-none cursor-pointer group transform-gpu",
                "rounded-3xl",

                levelTheme.frame,
                isCompact ? "w-64 h-[25rem]" : "w-[22.5rem] h-[33rem]"
            )}
            style={{ perspective: '2000px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetRotation}
            onClick={() => setIsFlipped(prev => !prev)}
        >
            {/* 경험치 획득 플로팅 텍스트 애니메이션 레이어 */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 overflow-visible">
                <AnimatePresence>
                    {floatingTexts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 20, scale: 0.8 }}
                            animate={{ opacity: 1, y: -60, scale: 1.1 }}
                            exit={{ opacity: 0, scale: 1.3 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={cn(
                                "font-mono font-black text-lg px-4 py-1.5 rounded-full shadow-lg text-white backdrop-blur-md",
                                t.text.includes("LEVEL") 
                                    ? "bg-gradient-to-r from-amber-500 to-rose-500 text-yellow-100 animate-bounce text-xl" 
                                    : "bg-zinc-900/80 border border-white/20 text-emerald-400"
                            )}
                        >
                            {t.text}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

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
                        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none z-[1]", levelTheme.aura)} />
                        
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
                                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                                        {/* 카드 겉면에 표시되는 성장 레벨 */}
                                        <div className={cn("font-mono font-black text-[10px] px-1.5 py-0.5 rounded italic shrink-0 shadow-sm border border-black/5 dark:border-white/10", levelTheme.badge)}>
                                            LV.{level}
                                        </div>
                                        <h3 className="font-black text-xl text-zinc-900 dark:text-white tracking-tight truncate">
                                            {stock?.name}
                                        </h3>
                                    </div>
                                    
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
                        <div className="mx-3.5 mt-2 relative h-40 rounded-xl bg-gradient-to-b from-zinc-50 to-zinc-100/40 dark:from-zinc-900 dark:to-zinc-950/60 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center overflow-hidden group/logo z-10">
                            <div className="absolute inset-0 opacity-10 dark:opacity-25 bg-[linear-gradient(110deg,rgba(255,255,255,0)_30%,rgba(255,255,255,0.3)_45%,rgba(255,255,255,0)_60%)] animate-[shine_4s_infinite] pointer-events-none z-10" />
                            
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:10px_10px] z-0" />

                            {!imgError ? (
                                <div className="relative w-full h-full p-10 flex items-center justify-center z-10">
                                    <Image
                                        key={stock?.ticker}
                                        src={logoUrl} alt="logo" fill 
                                        className="object-contain p-4 drop-shadow-sm transition-all duration-500 group-hover/logo:scale-105" unoptimized
                                        onError={() => setImgError(true)}
                                    />
                                </div>
                            ) : (
                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic border-2 shadow-sm tracking-tighter z-10", theme.bg, theme.border)}>
                                    {stock?.ticker?.substring(0, 2)}
                                </div>
                            )}

                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-black/5 dark:border-white/10 px-2.5 py-1 rounded-md shadow-sm z-20">
                                <Sparkles className={cn("w-3 h-3", stock?.grade === 'SSS' ? "text-pink-500" : "text-amber-500")} />
                                <span className={cn("text-[8px] font-black tracking-widest font-mono", gradeTheme.textClass)}>{gradeTheme.label}</span>
                            </div>

                            <div className="absolute bottom-2.5 right-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-2 py-0.5 rounded border border-black/5 dark:border-white/10 z-20">
                                <span className="text-[9px] font-mono font-black text-zinc-500 dark:text-zinc-400 tracking-wider">{stock?.ticker}</span>
                            </div>
                        </div>

                        {/* 카드 전면부 전용 경험치 미니 바 게이지 */}
                        <div className="px-4 mt-2 z-10 flex items-center gap-2">
                            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-black/[0.03] dark:border-white/5">
                                <motion.div 
                                    className={cn("h-full bg-gradient-to-r rounded-full", levelTheme.bar)}
                                    animate={{ width: `${(exp / maxExp) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <span className="font-mono text-[8px] font-bold text-zinc-400 shrink-0 tabular-nums">
                                {`${Math.floor((exp / maxExp) * 100)}%`}
                            </span>
                        </div>

                        {/* Mid Section: Sector & Price */}
                        <div className="px-4 pt-3 flex justify-between items-end z-10">
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

                        {/* Core Stats */}
                        <div className="px-4 py-3 grid grid-cols-2 gap-2.5 z-10">
                            {/* 상승 여력 (Upside) */}
                            <div className="bg-rose-50/40 dark:bg-gradient-to-br dark:from-rose-950/20 dark:to-rose-950/5 border border-rose-100 dark:border-rose-500/20 p-2.5 rounded-xl flex items-center justify-between group/atk transition-colors">
                                <div className="flex flex-col">
                                    <div className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1 font-mono">
                                        <TrendingUp className="w-2.5 h-2.5 text-rose-500" />
                                        UPSIDE ATK
                                    </div>
                                    <div className="flex items-baseline gap-0.5">
                                        <span className="text-2xl font-black text-rose-600 dark:text-rose-400 italic tracking-tighter font-mono transition-all">
                                            {(stockStats?.upside ?? 0) > 0 ? "+" : ""}{stockStats.upside}
                                        </span>
                                        <span className="text-[9px] font-black text-rose-500/80 font-mono">%</span>
                                    </div>
                                </div>
                            </div>

                            {/* 안전마진 (Safety) */}
                            <div className="bg-blue-50/40 dark:bg-gradient-to-br dark:from-blue-950/20 dark:to-blue-950/5 border border-blue-100 dark:border-blue-500/20 p-2.5 rounded-xl flex items-center justify-between text-right group/def transition-colors">
                                <div className="w-full flex flex-col items-end">
                                    <div className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1 justify-end font-mono">
                                        MARGIN DEF
                                        <ShieldCheck className="w-2.5 h-2.5 text-blue-500" />
                                    </div>
                                    <div className="flex items-baseline gap-0.5 justify-end">
                                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400 italic tracking-tighter font-mono transition-all">
                                            {stockStats.safety.toFixed(1)}
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

                {/* ================= BACK CARD (Analyst Intelligence Rule Book & Grow System) ================= */}
                <div 
                    className="absolute inset-0 rounded-[1.75rem] bg-white dark:bg-zinc-950 border-[4px] border-zinc-200 dark:border-zinc-800 flex flex-col p-5 shadow-xl overflow-hidden text-left"
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden', 
                        transform: 'rotateY(180deg)',
                        pointerEvents: isFlipped ? 'auto' : 'none'
                    }}
                >
                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#000000_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black z-0" />

                    {/* 카드 키우기 시스템 대시보드 인터페이스 */}
                    <div className="relative bg-gradient-to-br from-zinc-900 to-black text-white p-3.5 rounded-2xl border border-zinc-800 shadow-inner z-10 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                                    <Award className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px] font-black font-mono tracking-widest text-zinc-100">종목 관심도 XP</span>
                            </div>
                            <span className="text-[10px] font-black font-mono bg-amber-500 text-zinc-950 px-2 py-0.5 rounded italic">
                                Lv.{level}
                            </span>
                        </div>

                        <div className="space-y-1.5 mt-2.5">
                            <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-400">
                                <span>{levelTheme.title}</span>
                                <span className="tabular-nums">{exp} / {maxExp}</span>
                            </div>
                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden p-[1px] border border-zinc-700/50">
                                <motion.div 
                                    className={cn("h-full bg-gradient-to-r rounded-full", levelTheme.bar)}
                                    animate={{ width: `${(exp / maxExp) * 100}%` }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>
                        </div>

                        <div className="mt-3 rounded-xl border border-zinc-700/70 bg-zinc-900/80 px-3 py-2 text-[10px] font-bold leading-relaxed text-zinc-300">
                            종목을 조회할 때마다 XP가 누적되며, 레벨에 따라 카드 프레임과 분석 보정치가 강화됩니다.
                        </div>
                    </div>

                    <div className="flex-1 space-y-3.5 overflow-y-auto no-scrollbar z-10">
                        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                            <Info className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Quant Valuation Rules</span>
                        </div>

                        {[
                            { title: "상승 여력 (Upside ATK)", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50/30 dark:bg-zinc-900/40", border: "border-rose-100/60 dark:border-zinc-800/60", desc: "순유동자산(유동자산 - 총부채)이 현재 시가총액을 얼마나 초과하는지 계량화한 NCAV 업사이드 지표입니다. 조회 레벨에 따라 보정치가 가산됩니다." },
                            { title: "안전마진 (Margin DEF)", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50/30 dark:bg-zinc-900/40", border: "border-blue-100/60 dark:border-zinc-800/60", desc: "재무 리스크에 대한 하방 방어 점수입니다. 부채비율을 보수적으로 역산하여 위험 노출도가 높은 종목을 식별합니다." }
                        ].map((item, i) => (
                            <div key={i} className={cn("space-y-1 p-2.5 rounded-xl border", item.bg, item.border)}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", item.color.replace('text', 'bg'))} />
                                    <span className={cn("text-[9px] font-black uppercase tracking-tight italic", item.color)}>{item.title}</span>
                                </div>
                                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium pl-2.5 border-l border-zinc-200 dark:border-zinc-800">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col items-center z-10">
                        <div className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 tracking-[0.3em] italic mb-0.5 uppercase text-center font-mono">IdiotQuant Engine v2.5</div>
                        <div className="text-[7px] text-zinc-400 dark:text-zinc-600 font-bold uppercase tracking-widest italic font-mono">POWERED BY KOREA INVESTMENT API</div>
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
