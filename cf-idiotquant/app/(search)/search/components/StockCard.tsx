"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { Activity, Info, Sparkles, Shield, Swords, DollarSign, Coins } from "lucide-react";

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
    SSS: { frame: "from-pink-500 via-purple-600 to-cyan-400", label: "ULTRA RARE", glow: "shadow-[0_0_30px_rgba(219,39,119,0.35)] dark:shadow-[0_0_40px_rgba(219,39,119,0.55)]", animate: true },
    SS: { frame: "from-amber-400 via-orange-500 to-yellow-500", label: "SUPER RARE", glow: "shadow-[0_0_20px_rgba(245,158,11,0.25)] dark:shadow-[0_0_30px_rgba(245,158,11,0.45)]", animate: false },
    S: { frame: "from-emerald-400 via-teal-500 to-cyan-500", label: "RARE", glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)] dark:shadow-[0_0_25px_rgba(16,185,129,0.35)]", animate: false },
    A: { frame: "from-slate-300 to-slate-500 dark:from-slate-600 dark:to-slate-800", label: "COMMON", glow: "shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_0_20px_rgba(0,0,0,0.3)]", animate: false },
};

export const StockCard = ({ stock, isCompact = false }: any) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [imgError, setImgError] = useState(false);

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
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setRotation({ x: -y * 18, y: x * 18 });
    }, []);

    const resetRotation = useCallback(() => setRotation({ x: 0, y: 0 }), []);

    const logoUrl = stock?.isUs 
        ? `https://img.logo.dev/ticker/${stock.ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}` 
        : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}`;

    return (
        <div
            className={cn(
                "relative transition-all duration-500 select-none cursor-pointer group transform-gpu",
                isCompact ? "w-64 h-[25rem]" : "w-[22.5rem] h-[33rem]"
            )}
            style={{ perspective: '2500px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetRotation}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                animate={{ rotateX: rotation.x, rotateY: isFlipped ? 180 : rotation.y }}
                transition={{ type: "spring", stiffness: 180, damping: 22 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-full h-full relative"
            >
                {/* ================= FRONT CARD ================= */}
                <div 
                    className={cn(
                        "absolute inset-0 backface-hidden rounded-[1.75rem] p-[5px] bg-gradient-to-br transition-all duration-300",
                        gradeTheme.frame,
                        gradeTheme.glow,
                        gradeTheme.animate && "bg-[length:200%_200%] animate-[gradient-xy_6s_ease_infinite]"
                    )}
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden',
                        zIndex: isFlipped ? 0 : 1,
                        transform: 'rotateY(0deg)'
                    }}
                >
                    {/* Inner Container */}
                    <div className="w-full h-full rounded-[1.5rem] bg-white dark:bg-zinc-950 flex flex-col relative overflow-hidden border border-black/5 dark:border-white/10 text-zinc-900 dark:text-white transition-colors duration-300">
                        
                        {/* 디테일 백그라운드 데코레이션 */}
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100/50 via-white to-zinc-50 dark:from-zinc-900/40 dark:via-zinc-950 dark:to-black pointer-events-none z-0" />
                        
                        {/* Top Bar */}
                        <div className="p-4 flex justify-between items-center bg-zinc-50/80 dark:bg-zinc-900/60 backdrop-blur-md border-b border-black/[0.06] dark:border-white/5 z-10">
                            <div className="flex flex-col">
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
                                <h3 className="font-black text-xl text-zinc-900 dark:text-white tracking-tight drop-shadow-sm dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] truncate max-w-[190px]">
                                    {stock?.name}
                                </h3>
                            </div>
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border bg-white dark:bg-zinc-900 shadow-sm dark:shadow-xl transform group-hover:rotate-12 transition-transform duration-300", theme.border)}>
                                <span className="text-xl filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{theme.icon}</span>
                            </div>
                        </div>

                        {/* Card Image Area */}
                        <div className="mx-3.5 mt-2 relative h-48 rounded-xl bg-gradient-to-b from-zinc-50 to-zinc-100/60 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center overflow-hidden group/logo z-10">
                            {/* Holographic Flash Effect */}
                            <div className="absolute inset-0 opacity-15 dark:opacity-25 bg-[linear-gradient(110deg,rgba(255,255,255,0)_30%,rgba(255,255,255,0.4)_45%,rgba(255,255,255,0)_60%)] animate-[shine_4s_infinite] pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-rose-500/5 dark:from-blue-500/10 dark:to-rose-500/10" />
                            
                            {/* Grid overlay for TCG vibe */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:12px_12px]" />

                            {!imgError ? (
                                <div className="relative w-full h-full p-10 flex items-center justify-center">
                                    <Image
                                        key={stock?.ticker}
                                        src={logoUrl} alt="logo" fill 
                                        className="object-contain p-10 drop-shadow-md dark:drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-500 group-hover/logo:scale-110 group-hover/logo:rotate-1" unoptimized
                                        onError={() => setImgError(true)}
                                    />
                                </div>
                            ) : (
                                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-black italic border-2 shadow-xl transform tracking-tighter", theme.bg, theme.border)}>
                                    {stock?.ticker?.substring(0, 2)}
                                </div>
                            )}

                            {/* Rarity Tag */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border border-black/5 dark:border-white/10 px-2.5 py-1 rounded-md shadow-sm dark:shadow-lg">
                                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400 animate-pulse" />
                                <span className="text-[9px] font-black tracking-widest text-zinc-700 dark:text-zinc-200">{gradeTheme.label}</span>
                            </div>

                            {/* Ticker Floating Tag */}
                            <div className="absolute bottom-2.5 right-2.5 bg-white/75 dark:bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-black/5 dark:border-white/5">
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
                        transform: 'rotateY(180deg) translateZ(1px)',
                        zIndex: isFlipped ? 1 : 0 
                    }}
                >
                    {/* Geometric background for card back */}
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

            {/* Optimized Animation Utilities via Tailwind/Global Style */}
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