"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import { ShieldCheck, TrendingUp, Activity, Info, Link as LinkIcon } from "lucide-react";

const SECTOR_THEMES: Record<string, any> = {
    IRON: { bg: "bg-zinc-700", icon: "⚙️", label: "기계/제조", desc: "경기 민감주: 인프라 투자 수혜" },
    CHIP: { bg: "bg-blue-700", icon: "💾", label: "반도체", desc: "성장 주도주: 기술 혁신 및 사이클" },
    NET: { bg: "bg-indigo-700", icon: "🌐", label: "플랫폼", desc: "네트워크 효과: 높은 무형자산 가치" },
    BIO: { bg: "bg-emerald-700", icon: "🧬", label: "바이오", desc: "고위험 고수익: R&D 파이프라인 가치" },
    FUEL: { bg: "bg-orange-700", icon: "🔋", label: "에너지", desc: "원자재 연동: 인플레이션 헤지 성격" },
    FLOW: { bg: "bg-cyan-700", icon: "💸", label: "금융", desc: "금리 민감주: 안정적 배당 및 현금흐름" },
    BASE: { bg: "bg-stone-800", icon: "🏗️", label: "인프라", desc: "방어적 자산: 안정적인 공공 수요" },
    STAR: { bg: "bg-rose-600", icon: "✨", label: "엔터/미디어", desc: "콘텐츠 파워: 글로벌 IP 확장성" },
    LIFE: { bg: "bg-lime-600", icon: "🍎", label: "소비재", desc: "필수 소비재: 안정적인 이익 방어력" }
};

const GRADE_THEMES: Record<string, any> = {
    SSS: { frame: "from-pink-500 via-purple-600 to-cyan-500", label: "GOD-TIER VALUE", animate: true },
    SS: { frame: "from-yellow-400 via-amber-500 to-orange-400", label: "SUPERIOR", animate: false },
    S: { frame: "from-emerald-400 to-cyan-500", label: "EXCELLENT", animate: false },
    A: { frame: "from-slate-300 to-slate-500", label: "FAIR", animate: false },
    // DEFAULT(OBSERVE) 제거: 데이터가 있는 경우만 표시하도록 로직 변경
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

    // 등급 정보가 있을 때만 테마 적용
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

    const logoSourceUrl = stock?.isUs ? "https://logo.dev" : "https://logo.idiotquant.com";
    const logoSourceLabel = stock?.isUs ? "logo.dev" : "logo.idiotquant.com";

    return (
        <div
            className={cn(
                "relative transition-all duration-300 select-none cursor-pointer group",
                isCompact ? "w-64 h-[24rem]" : "w-[22rem] h-[32rem]"
            )}
            style={{ perspective: '2000px' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={resetRotation}
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <motion.div
                animate={{ rotateX: rotation.x, rotateY: isFlipped ? 180 : rotation.y }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-full h-full relative"
            >
                {/* --- FRONT --- */}
                <div 
                    className={cn(
                        "absolute inset-0 backface-hidden rounded-[2.5rem] p-[12px] bg-gradient-to-br shadow-2xl overflow-hidden border-t-2 border-white/20",
                        gradeTheme ? gradeTheme.frame : "from-zinc-800 to-zinc-900", // 등급 없을 시 기본 차분한 배경
                        gradeTheme?.animate && "animate-gradient-xy bg-[length:200%_200%]"
                    )}
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden',
                        zIndex: isFlipped ? 0 : 1,
                        transform: 'rotateY(0deg)'
                    }}
                >
                    <div className="w-full h-full rounded-[2rem] bg-zinc-950 flex flex-col relative overflow-hidden border border-white/10">
                        {/* Header */}
                        <div className="p-5 flex justify-between items-start z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn("px-2 py-0.5 rounded text-[9px] font-black text-white uppercase tracking-tighter", theme.bg)}>
                                        {theme.label}
                                    </span>
                                    <span className="text-zinc-500 font-bold text-[10px] tracking-widest">#{stock?.ticker}</span>
                                </div>
                                <h3 className="font-black text-2xl text-white tracking-tighter truncate max-w-[180px]">{stock?.name}</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase leading-none mb-1">Current Price</p>
                                <p className="text-lg font-black text-white italic tabular-nums">
                                    {stock?.isUs ? "$" : "₩"}{stock?.curPrice?.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Logo Area */}
                        <div className="mx-4 relative h-40 rounded-3xl bg-zinc-900 border border-white/5 flex items-center justify-center overflow-hidden group/logo">
                            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                            {!imgError ? (
                                <Image
                                    key={stock?.ticker}
                                    src={logoUrl} alt="logo" fill 
                                    className="object-contain p-10 drop-shadow-2xl transition-transform group-hover/logo:scale-110" unoptimized
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className={cn("w-20 h-20 rounded-full flex items-center justify-center text-white text-4xl font-black", theme.bg)}>
                                    {stock?.ticker?.substring(0, 1)}
                                </div>
                            )}
                            
                            {/* Source Link (Clickable) */}
                            <a 
                                href={logoSourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // 카드 뒤집힘 방지
                                className="absolute bottom-2 right-3 flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity z-20"
                            >
                                <LinkIcon className="w-2 h-2 text-zinc-500" />
                                <span className="text-[7px] font-medium text-zinc-500 tracking-tighter uppercase underline decoration-zinc-500/30">Source: {logoSourceLabel}</span>
                            </a>

                            {/* Grade Badge (등급이 있을 때만 표시) */}
                            {gradeTheme && (
                                <div className="absolute top-3 right-3 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
                                    <span className="text-[10px] font-black text-white tracking-widest leading-none">{gradeTheme.label}</span>
                                </div>
                            )}
                        </div>

                        {/* Main Stats 영역 (기존과 동일) */}
                        <div className="px-5 py-4 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-rose-500">
                                    <TrendingUp className="w-3 h-3" />
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Upside Potential</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-rose-500 italic tracking-tighter">{(stockStats?.upside ?? 0) > 0 ? "+" : ""}{stockStats.upside}</span>
                                    <span className="text-sm font-black text-rose-500/60">%</span>
                                </div>
                            </div>
                            <div className="space-y-1 text-right flex flex-col items-end">
                                <div className="flex items-center gap-1.5 text-blue-500">
                                    <span className="text-[9px] font-black uppercase tracking-tighter">Safety Margin</span>
                                    <ShieldCheck className="w-3 h-3" />
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-blue-500 italic tracking-tighter">{stockStats.safety.toFixed(0)}</span>
                                    <span className="text-sm font-black text-blue-500/60">/99</span>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Stats 영역 (기존과 동일) */}
                        <div className="px-5 pb-6 mt-auto">
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 flex justify-between items-center">
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-zinc-500 uppercase mb-1">PER</span>
                                    <span className="text-xs font-black text-zinc-200 leading-none">{stockStats.per}x</span>
                                </div>
                                <div className="w-[1px] h-6 bg-white/10" />
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-zinc-500 uppercase mb-1">PBR</span>
                                    <span className="text-xs font-black text-zinc-200 leading-none">{stockStats.pbr}x</span>
                                </div>
                                <div className="w-[1px] h-6 bg-white/10" />
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-zinc-500 uppercase mb-1">NCAV Score</span>
                                    <div className="flex items-center gap-1">
                                        <Activity className="w-2.5 h-2.5 text-emerald-400" />
                                        <span className="text-xs font-black text-emerald-400 leading-none">{stockStats.ncav.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- BACK: 상세 설명 (기존 보강된 버전 유지) --- */}
                <div 
                    className="absolute inset-0 rounded-[2.5rem] bg-zinc-950 border-[6px] border-zinc-800 flex flex-col p-7 shadow-2xl overflow-hidden"
                    style={{ 
                        WebkitBackfaceVisibility: 'hidden', 
                        backfaceVisibility: 'hidden', 
                        transform: 'rotateY(180deg) translateZ(1px)',
                        zIndex: isFlipped ? 1 : 0 
                    }}
                >
                    <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
                        <Info className="w-5 h-5 text-blue-500" />
                        <h4 className="text-white font-black text-sm tracking-widest italic uppercase">Algorithm Detail Guide</h4>
                    </div>

                    <div className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                                <span className="text-[11px] font-black text-rose-500 uppercase">상승 잠재력 (Upside)</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                                <span className="text-zinc-100">순유동자산(NCAV)</span>에서 부채를 차감한 금액이 현재 시가총액보다 얼마나 높은지를 나타냅니다. 
                                자산 가치 대비 주가가 극도로 저렴한 상태를 의미합니다.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-[11px] font-black text-blue-500 uppercase">재무 안전성 (Safety)</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                                부채비율을 기반으로 산출된 방어력 점수입니다. 99점에 가까울수록 재무구조가 탄탄하며, 시장 급락기에도 <span className="text-zinc-100">심리적/실질적 안전마진</span>을 제공합니다.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[11px] font-black text-emerald-500 uppercase">NCAV 스코어</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                                벤자민 그레이엄의 정통 가치투자 공식인 <span className="text-zinc-100">(순유동자산 / 시가총액)</span>의 결과값입니다. 
                                1.0 이상은 시가총액보다 순현금성 자산이 많다는 파격적인 저평가 상태를 뜻합니다.
                            </p>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-800 flex flex-col items-center">
                        <div className="text-[10px] font-black text-zinc-600 tracking-[0.3em] italic mb-1 uppercase">IdiotQuant Algorithm Series</div>
                        <div className="text-[8px] text-zinc-700 font-bold">© 2026 VALUE INVESTING PROTOCOL</div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};