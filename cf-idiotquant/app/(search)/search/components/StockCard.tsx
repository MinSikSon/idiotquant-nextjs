"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { ShieldCheck, TrendingUp, Activity, Info, Link as LinkIcon, Sparkles } from "lucide-react";

const SECTOR_THEMES: Record<string, any> = {
    IRON: { bg: "bg-zinc-700", border: "border-zinc-500", icon: "⚙️", label: "MECH", color: "text-zinc-600 dark:text-zinc-400" },
    CHIP: { bg: "bg-blue-600", border: "border-blue-400", icon: "💾", label: "CHIP", color: "text-blue-600 dark:text-blue-400" },
    NET: { bg: "bg-indigo-600", border: "border-indigo-400", icon: "🌐", label: "WEB", color: "text-indigo-600 dark:text-indigo-400" },
    BIO: { bg: "bg-emerald-600", border: "border-emerald-400", icon: "🧬", label: "BIO", color: "text-emerald-600 dark:text-emerald-400" },
    FUEL: { bg: "bg-orange-600", border: "border-orange-400", icon: "🔋", label: "FUEL", color: "text-orange-600 dark:text-orange-400" },
    FLOW: { bg: "bg-cyan-600", border: "border-cyan-400", icon: "💸", label: "FLOW", color: "text-cyan-600 dark:text-cyan-400" },
    BASE: { bg: "bg-stone-700", border: "border-stone-500", icon: "🏗️", label: "BASE", color: "text-stone-600 dark:text-stone-400" },
    STAR: { bg: "bg-rose-600", border: "border-rose-400", icon: "✨", label: "STAR", color: "text-rose-600 dark:text-rose-400" },
    LIFE: { bg: "bg-lime-600", border: "border-lime-400", icon: "🍎", label: "LIFE", color: "text-lime-600 dark:text-lime-400" }
};

const GRADE_THEMES: Record<string, any> = {
    SSS: { frame: "from-pink-500 via-purple-500 to-cyan-400", label: "ULTRA RARE", glow: "shadow-[0_0_30px_rgba(192,38,211,0.4)]", animate: true },
    SS: { frame: "from-amber-300 via-orange-400 to-yellow-500", label: "SUPER RARE", glow: "shadow-[0_0_20px_rgba(245,158,11,0.3)]", animate: false },
    S: { frame: "from-emerald-400 via-teal-400 to-cyan-400", label: "RARE", glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]", animate: false },
    A: { frame: "from-slate-300 to-slate-500 dark:from-slate-500 dark:to-slate-700", label: "COMMON", glow: "", animate: false },
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

    const gradeTheme = useMemo(() => GRADE_THEMES[stock?.grade] || null, [stock?.grade]);

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
        setRotation({ x: -y * 15, y: x * 15 });
    }, []);

    const resetRotation = useCallback(() => setRotation({ x: 0, y: 0 }), []);

    const logoUrl = stock?.isUs 
        ? `https://img.logo.dev/ticker/${stock.ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}` 
        : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}`;

    return (
        <div
            className={cn(
                "relative transition-all duration-500 select-none cursor-pointer group",
                isCompact ? "w-64 h-[24rem]" : "w-[22rem] h-[32rem]"
            )}
            style={{ perspective: '2000px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetRotation}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                animate={{ rotateX: rotation.x, rotateY: isFlipped ? 180 : rotation.y }}
                transition={{ type: "spring", stiffness: 150, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-full h-full relative"
            >
                {/* --- FRONT: TCG STYLE (DARK/LIGHT ADAPTIVE) --- */}
                <div 
                    className={cn(
                        "absolute inset-0 backface-hidden rounded-[1.5rem] p-[8px] bg-gradient-to-br shadow-2xl overflow-hidden",
                        gradeTheme ? gradeTheme.frame : "from-zinc-200 to-zinc-400 dark:from-zinc-700 dark:to-zinc-900",
                        gradeTheme?.animate && "animate-gradient-xy bg-[length:200%_200%]",
                        gradeTheme?.glow
                    )}
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden',
                        zIndex: isFlipped ? 0 : 1,
                        transform: 'rotateY(0deg)'
                    }}
                >
                    {/* 카드 내부 컨테이너 */}
                    <div className="w-full h-full rounded-[1.2rem] bg-white dark:bg-zinc-950 flex flex-col relative overflow-hidden border-[3px] border-black/5 dark:border-white/10">
                        
                        {/* 상단바 */}
                        <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/[0.02] dark:from-white/5 to-transparent border-b border-black/[0.05] dark:border-white/5">
                            <div className="flex flex-col">
                                <span className="text-zinc-400 dark:text-zinc-500 font-black text-[9px] tracking-widest leading-none mb-1 uppercase italic">
                                    {stock?.isUs ? "Overseas Asset" : "Domestic Asset"}
                                </span>
                                <h3 className="font-black text-xl text-zinc-900 dark:text-white tracking-tighter drop-shadow-sm">
                                    {stock?.name}
                                </h3>
                            </div>
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-inner", theme.bg, theme.border)}>
                                <span className="text-lg">{theme.icon}</span>
                            </div>
                        </div>

                        {/* 로고 및 홀로그램 영역 */}
                        <div className="mx-3 mt-1 relative h-48 rounded-xl bg-zinc-50 dark:bg-zinc-900 border-4 border-zinc-200 dark:border-zinc-800 flex items-center justify-center overflow-hidden group/logo">
                            {/* 홀로그램/샤인 효과 */}
                            <div className="absolute inset-0 opacity-20 dark:opacity-30 bg-[linear-gradient(110deg,#ffffff00_30%,#ffffff_45%,#ffffff00_60%)] animate-[shine_4s_infinite] pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-rose-500/5 dark:from-blue-500/10 dark:to-rose-500/10" />
                            
                            {!imgError ? (
                                <Image
                                    key={stock?.ticker}
                                    src={logoUrl} alt="logo" fill 
                                    className="object-contain p-12 drop-shadow-md dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-transform group-hover/logo:scale-105" unoptimized
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl font-black italic border-4 shadow-xl", theme.bg, theme.border)}>
                                    {stock?.ticker?.substring(0, 1)}
                                </div>
                            )}

                            {gradeTheme && (
                                <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/80 dark:bg-black/60 backdrop-blur-md border border-black/10 dark:border-white/20 px-2 py-1 rounded-md shadow-sm">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500 dark:text-yellow-400" />
                                    <span className="text-[8px] font-black text-zinc-800 dark:text-white tracking-widest">{gradeTheme.label}</span>
                                </div>
                            )}
                        </div>

                        {/* 중단: 가격 섹션 */}
                        <div className="px-4 pt-4 flex justify-between items-end">
                            <div className="flex items-center gap-1.5">
                                <div className={cn("w-2 h-2 rounded-full animate-pulse", theme.bg)} />
                                <span className={cn("font-black text-[10px] tracking-widest uppercase", theme.color)}>{theme.label}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 leading-none mb-1 uppercase tracking-tighter italic">Market Value</div>
                                <div className="text-2xl font-black text-zinc-900 dark:text-white italic tabular-nums tracking-tighter">
                                    <span className="text-sm mr-0.5">{stock?.isUs ? "$" : "₩"}</span>
                                    {stock?.curPrice?.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* 메인 스탯: ATK / DEF */}
                        <div className="px-3 py-3 grid grid-cols-2 gap-2">
                            <div className="bg-rose-50 dark:bg-rose-950/20 border-l-2 border-rose-500 p-2 rounded-r-lg">
                                <div className="text-[8px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-0.5">Potential ATK</div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-rose-700 dark:text-white italic tracking-tighter">{(stockStats?.upside ?? 0) > 0 ? "+" : ""}{stockStats.upside}</span>
                                    <span className="text-[10px] font-bold text-rose-600/80 uppercase">%</span>
                                </div>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 border-r-2 border-blue-500 p-2 rounded-l-lg text-right">
                                <div className="text-[8px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest mb-0.5">Defense DEF</div>
                                <div className="flex items-baseline gap-1 justify-end">
                                    <span className="text-2xl font-black text-blue-700 dark:text-white italic tracking-tighter">{stockStats.safety.toFixed(0)}</span>
                                    <span className="text-[10px] font-bold text-blue-600/80 uppercase">pts</span>
                                </div>
                            </div>
                        </div>

                        {/* 하단 스탯 박스 */}
                        <div className="px-3 pb-4 mt-auto">
                            <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-white/[0.03] border border-black/5 dark:border-white/10 rounded-xl p-2">
                                <div className="flex flex-col items-center py-1">
                                    <span className="text-[7px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 tracking-tighter italic">PER Rate</span>
                                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 italic">{stockStats.per}x</span>
                                </div>
                                <div className="flex flex-col items-center py-1 border-x border-black/[0.05] dark:border-white/5">
                                    <span className="text-[7px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 tracking-tighter italic">PBR Rate</span>
                                    <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 italic">{stockStats.pbr}x</span>
                                </div>
                                <div className="flex flex-col items-center py-1">
                                    <span className="text-[7px] font-black text-zinc-400 dark:text-zinc-500 uppercase mb-0.5 tracking-tighter italic">NCAV Index</span>
                                    <div className="flex items-center gap-0.5">
                                        <Activity className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400" />
                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 italic">{stockStats.ncav.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BACK: RULE BOOK (DARK/LIGHT ADAPTIVE) --- */}
                <div 
                    className="absolute inset-0 rounded-[1.5rem] bg-white dark:bg-zinc-950 border-[6px] border-zinc-200 dark:border-zinc-800 flex flex-col p-7 shadow-2xl overflow-hidden text-left"
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden', 
                        transform: 'rotateY(180deg) translateZ(1px)',
                        zIndex: isFlipped ? 1 : 0 
                    }}
                >
                    <div className="flex items-center gap-3 mb-6 border-b-2 border-zinc-100 dark:border-zinc-800 pb-4">
                        <div className="w-8 h-8 bg-zinc-900 dark:bg-blue-600 rounded flex items-center justify-center shadow-lg">
                            <Info className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="text-zinc-900 dark:text-white font-black text-sm tracking-widest italic uppercase">Algorithm Rule Book</h4>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                        {[
                            { title: "상승 잠재력 (Potential ATK)", color: "text-rose-600 dark:text-rose-500", desc: "순유동자산이 현재 시가총액을 얼마나 초과하는지 나타내는 공격력 수치입니다." },
                            { title: "재무 안전성 (Defense DEF)", color: "text-blue-600 dark:text-blue-500", desc: "낮은 부채비율과 자산 건전성을 점수화한 방어 지표입니다." },
                            { title: "NCAV Index", color: "text-emerald-600 dark:text-emerald-500", desc: "벤자민 그레이엄의 절대적 저평가 잣대로, 1.0 이상은 카드의 진정한 가치를 의미합니다." }
                        ].map((item, i) => (
                            <div key={i} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", item.color.replace('text', 'bg'))} />
                                    <span className={cn("text-[11px] font-black uppercase tracking-tighter italic", item.color)}>{item.title}</span>
                                </div>
                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium pl-3 border-l border-zinc-100 dark:border-zinc-800">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col items-center">
                        <div className="text-[8px] font-black text-zinc-400 dark:text-zinc-600 tracking-[0.4em] italic mb-1 uppercase text-center">IdiotQuant Card Series v2.1</div>
                        <div className="text-[7px] text-zinc-300 dark:text-zinc-700 font-bold uppercase tracking-widest italic">Adaptive Dark Mode Ready</div>
                    </div>
                </div>
            </motion.div>

            <style jsx global>{`
                @keyframes shine {
                    0% { transform: translateX(-200%) skewX(-30deg); }
                    100% { transform: translateX(200%) skewX(-30deg); }
                }
                @keyframes gradient-xy {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient-xy {
                    animation: gradient-xy 5s ease infinite;
                }
            `}</style>
        </div>
    );
};