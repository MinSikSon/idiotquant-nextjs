"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { TrendingUp, ShieldCheck, Award, RotateCcw, DollarSign, Coins } from "lucide-react";
import LineChart from "@/components/LineChart";

// =========================================================================
// 등급 설정
// =========================================================================
const GRADE_CONFIG: Record<string, {
  frameFrom: string; frameTo: string;
  border: string; glow: string;
  label: string; labelColor: string;
  badgeBg: string; badgeText: string;
  typeStripBg: string; typeStripText: string;
  holo?: string;
}> = {
  SSS: {
    frameFrom: "from-pink-400", frameTo: "to-violet-500",
    border:    "border-pink-300/50 dark:border-pink-700/40",
    glow:      "shadow-[0_0_28px_rgba(219,39,119,0.25)] dark:shadow-[0_0_36px_rgba(168,85,247,0.35)]",
    label: "PREMIUM NET-NET", labelColor: "text-pink-500 dark:text-pink-400",
    badgeBg:  "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500",
    badgeText: "text-white",
    typeStripBg: "bg-pink-50 dark:bg-pink-950/20 border-pink-200/50 dark:border-pink-800/30",
    typeStripText: "text-pink-600 dark:text-pink-400",
    holo: "linear-gradient(125deg, rgba(255,0,128,0.18) 0%, rgba(0,255,255,0.18) 30%, rgba(255,255,0,0.18) 60%, rgba(128,0,255,0.18) 100%)",
  },
  SS: {
    frameFrom: "from-amber-400", frameTo: "to-orange-500",
    border:    "border-amber-300/50 dark:border-amber-700/40",
    glow:      "shadow-[0_0_22px_rgba(245,158,11,0.2)] dark:shadow-[0_0_30px_rgba(234,88,12,0.3)]",
    label: "DEEP VALUE ALPHA", labelColor: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500", badgeText: "text-white",
    typeStripBg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30",
    typeStripText: "text-amber-700 dark:text-amber-400",
    holo: "linear-gradient(115deg, rgba(245,158,11,0.18) 10%, rgba(255,255,255,0.22) 45%, rgba(234,88,12,0.18) 80%)",
  },
  S: {
    frameFrom: "from-emerald-400", frameTo: "to-teal-500",
    border:    "border-emerald-300/50 dark:border-emerald-700/40",
    glow:      "shadow-[0_0_18px_rgba(16,185,129,0.15)] dark:shadow-[0_0_26px_rgba(6,182,212,0.22)]",
    label: "DEEP VALUE", labelColor: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500", badgeText: "text-white",
    typeStripBg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30",
    typeStripText: "text-emerald-700 dark:text-emerald-400",
  },
  A: {
    frameFrom: "from-slate-300", frameTo: "to-slate-400",
    border: "border-zinc-200 dark:border-zinc-700/60",
    glow: "shadow-sm",
    label: "STABLE ASSET", labelColor: "text-slate-500 dark:text-slate-400",
    badgeBg: "bg-slate-500", badgeText: "text-white",
    typeStripBg: "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/40",
    typeStripText: "text-zinc-500 dark:text-zinc-400",
  },
  B: {
    frameFrom: "from-zinc-300", frameTo: "to-zinc-400",
    border: "border-zinc-200 dark:border-zinc-700/60",
    glow: "shadow-sm",
    label: "FAIR VALUE", labelColor: "text-zinc-500 dark:text-zinc-400",
    badgeBg: "bg-zinc-200 dark:bg-zinc-700", badgeText: "text-zinc-800 dark:text-zinc-200",
    typeStripBg: "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/40",
    typeStripText: "text-zinc-500 dark:text-zinc-400",
  },
  F: {
    frameFrom: "from-red-400", frameTo: "to-rose-500",
    border: "border-red-200/60 dark:border-red-800/40",
    glow: "shadow-sm",
    label: "OVERVALUED", labelColor: "text-red-500 dark:text-red-400",
    badgeBg: "bg-red-500", badgeText: "text-white",
    typeStripBg: "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30",
    typeStripText: "text-red-600 dark:text-red-400",
  },
};

const DEFAULT_GRADE_CONFIG = GRADE_CONFIG.B;

// =========================================================================
// 레벨 티어
// =========================================================================
const getLevelTier = (level: number) => {
  if (level >= 15) return { title: "SIGNATURE",       barFrom: "from-cyan-400",    barTo: "to-indigo-400",  badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300" };
  if (level >= 8)  return { title: "HIGH CONVICTION", barFrom: "from-emerald-400", barTo: "to-teal-400",    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" };
  if (level >= 4)  return { title: "WATCHLIST",       barFrom: "from-sky-400",     barTo: "to-blue-400",    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" };
  return               { title: "BEGINNER",          barFrom: "from-zinc-300",    barTo: "to-zinc-400",    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400" };
};

// =========================================================================
// 타입
// =========================================================================
interface StockXpProfile {
  level: number; xp: number; maxXp: number;
  totalXp: number; lastGain: number; awardCount: number;
}

interface StockCardProps {
  stock: any;
  chartConfig: { data: number[]; categories: string[]; color: string };
  rawData?: any;
  isCompact?: boolean;
  stockXpProfile?: StockXpProfile;
}

interface FloatingText { id: number; text: string }

// =========================================================================
// StockCard
// =========================================================================
export const StockCard = ({ stock, chartConfig, isCompact = false, stockXpProfile }: StockCardProps) => {
  const [isFlipped, setIsFlipped]     = useState(false);
  const [imgError, setImgError]       = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const nextId      = useRef<number>(0);
  const prevAward   = useRef<number>(stockXpProfile?.awardCount ?? 0);
  const clearTimer  = useRef<number | null>(null);
  const cardRef     = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useTransform(mouseY, [0, 1], [8, -8]);
  const rotateY = useTransform(mouseX, [0, 1], [-8, 8]);
  const holoX        = useTransform(mouseX, [0, 1], ["0%", "100%"]);
  const holoY        = useTransform(mouseY, [0, 1], ["0%", "100%"]);
  const holoPosition = useTransform([holoX, holoY], ([x, y]) => `${x} ${y}`);

  const level  = stockXpProfile?.level  ?? 1;
  const xp     = stockXpProfile?.xp     ?? 0;
  const maxXp  = Math.max(1, stockXpProfile?.maxXp ?? 100);
  const tier   = useMemo(() => getLevelTier(level), [level]);

  // grade 정규화 — getUsNcavGrade 가 객체를 반환할 수 있음
  const gradeRaw = stock?.grade;
  const grade = gradeRaw && typeof gradeRaw === "object"
    ? String((gradeRaw as any).grade || "B")
    : String(gradeRaw || "B");
  const cfg = GRADE_CONFIG[grade] ?? DEFAULT_GRADE_CONFIG;

  const ncavUpside = Number(stock?.ncavScore ?? 0);
  const isUp       = ncavUpside >= 0;
  const showHolo   = Boolean(cfg.holo);

  useEffect(() => {
    setImgError(false);
    setIsFlipped(false);
    prevAward.current = stockXpProfile?.awardCount ?? 0;
  }, [stock?.ticker]);

  useEffect(() => {
    if (!stockXpProfile || stockXpProfile.awardCount <= prevAward.current) return;
    prevAward.current = stockXpProfile.awardCount;
    const id = nextId.current++;
    setFloatingTexts(prev => [...prev, { id, text: `+${stockXpProfile.lastGain} XP` }]);
    if (clearTimer.current) window.clearTimeout(clearTimer.current);
    clearTimer.current = window.setTimeout(() => setFloatingTexts([]), 3000);
    const t = window.setTimeout(() => setFloatingTexts(p => p.filter(f => f.id !== id)), 900);
    return () => window.clearTimeout(t);
  }, [stockXpProfile]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFlipped) return;
    const r = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top)  / r.height);
  }, [mouseX, mouseY, isFlipped]);

  const resetMouse = useCallback(() => { mouseX.set(0.5); mouseY.set(0.5); }, [mouseX, mouseY]);

  const logoUrl = stock?.isUs
    ? `https://img.logo.dev/ticker/${stock.ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}`;

  // TCG 비율: 2.5 × 3.5" ≈ 0.714
  const W = isCompact ? "w-[16rem]"  : "w-[18rem]";
  const H = isCompact ? "h-[22.5rem]": "h-[25.2rem]";

  return (
    <div
      ref={cardRef}
      className={cn("relative select-none cursor-pointer group transform-gpu", W, H)}
      style={{ perspective: "1800px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetMouse}
      onClick={() => setIsFlipped(p => !p)}
    >
      {/* XP 플로팅 텍스트 */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 overflow-visible">
        <AnimatePresence>
          {floatingTexts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: -50, scale: 1.0 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="font-mono font-black text-xs px-3 py-1 rounded-full shadow-lg bg-zinc-900/90 text-emerald-400 border border-white/10 backdrop-blur-sm whitespace-nowrap"
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <motion.div
        style={{ rotateX: isFlipped ? 0 : rotateX, rotateY: isFlipped ? 180 : rotateY, transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 24, mass: 1.0 }}
        className="w-full h-full relative transform-gpu"
      >

        {/* ════════════════ FRONT ════════════════ */}
        <div
          className={cn(
            "absolute inset-0 rounded-[1.6rem] p-[3px] bg-gradient-to-br",
            cfg.frameFrom, cfg.frameTo, cfg.glow
          )}
          style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden", transform: "rotateY(0deg)", pointerEvents: isFlipped ? "none" : "auto" }}
        >
          <div className={cn(
            "w-full h-full rounded-[1.4rem] bg-white dark:bg-zinc-950 flex flex-col relative overflow-hidden border",
            cfg.border
          )}>
            {/* 배경 래디얼 */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-50/70 via-transparent to-transparent dark:from-zinc-900/25 pointer-events-none z-0" />

            {/* 홀로그래픽 오버레이 (SSS·SS 전용) */}
            {showHolo && (
              <motion.div
                className="absolute inset-0 mix-blend-color-dodge pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[1.4rem]"
                style={{
                  background: cfg.holo,
                  backgroundPosition: holoPosition,
                  backgroundSize: "160% 160%",
                }}
              />
            )}

            {/* ── 헤더: 이름 + 등급 배지 ── */}
            <div className="relative z-10 px-3.5 pt-3 pb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-sm text-zinc-900 dark:text-white tracking-tight leading-tight truncate">
                  {stock?.name}
                </h3>
                <p className="text-[8px] font-mono font-bold text-zinc-400 mt-0.5 tracking-wide">
                  {stock?.ticker} · {stock?.isUs ? "NASDAQ/NYSE" : "KRX"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={cn("px-2.5 py-0.5 rounded-lg text-sm font-black font-mono shadow-sm leading-snug", cfg.badgeBg, cfg.badgeText)}>
                  {grade}
                </span>
                {chartConfig?.data?.length > 0 && (
                  <div className="w-14 h-[18px] opacity-60 mt-0.5">
                    <LineChart
                      data_array={[{ name: "T", data: chartConfig.data, color: chartConfig.color }]}
                      category_array={chartConfig.categories}
                      height={18} show_yaxis_label={false} legend_disable
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── 아트 영역 ── */}
            <div className="relative z-10 mx-3 h-[8.5rem] rounded-xl overflow-hidden bg-gradient-to-b from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-950/80 border border-zinc-200/60 dark:border-zinc-800/40 flex items-center justify-center group/art shrink-0">
              {/* 격자 패턴 */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.008)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.008)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:10px_10px]" />
              {/* 호버 반짝임 */}
              <div className="absolute inset-0 opacity-0 group-hover/art:opacity-100 transition-opacity duration-500 pointer-events-none bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.18)_45%,transparent_65%)] animate-[art-shine_3.5s_ease_infinite]" />

              {!imgError ? (
                <Image
                  key={stock?.ticker} src={logoUrl} alt="logo" fill
                  className="object-contain p-7 transition-transform duration-400 group-hover/art:scale-[1.06]"
                  unoptimized onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-4xl font-black text-zinc-400 dark:text-zinc-500 font-mono tracking-tighter">
                  {(stock?.ticker ?? "??").substring(0, 2)}
                </span>
              )}

              {/* Lv 배지 */}
              <div className={cn("absolute top-1.5 left-1.5 px-1.5 py-[1px] rounded text-[8px] font-black font-mono italic border border-black/5 dark:border-white/10 shadow-sm", tier.badge)}>
                Lv.{level}
              </div>
              {/* 티커 라벨 */}
              <div className="absolute bottom-1.5 right-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-1.5 py-[1px] rounded border border-black/5 dark:border-white/10">
                <span className="text-[7px] font-mono font-black text-zinc-500 dark:text-zinc-400 tracking-wider">{stock?.ticker}</span>
              </div>
            </div>

            {/* ── 타입 스트립 (TCG 카드 타입 바) ── */}
            <div className={cn(
              "relative z-10 mx-3 mt-1.5 px-3 py-[5px] rounded-lg flex items-center justify-between border",
              cfg.typeStripBg
            )}>
              <span className={cn("text-[8px] font-black uppercase tracking-[0.15em] font-mono", cfg.typeStripText)}>
                {cfg.label}
              </span>
              <span className="text-[7px] font-bold text-zinc-400 font-mono uppercase tracking-wider">
                {stock?.isUs ? "SEC ASSET" : "FSS ASSET"}
              </span>
            </div>

            {/* ── 현재가 + NCAV 업사이드 ── */}
            <div className="relative z-10 px-3.5 mt-2.5 flex items-center justify-between gap-2">
              <div>
                <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest font-mono leading-none mb-0.5">Price</p>
                <p className="text-xl font-black tabular-nums tracking-tight text-zinc-900 dark:text-white font-mono leading-tight">
                  <span className="text-[10px] font-bold text-zinc-400 mr-0.5">{stock?.isUs ? "$" : "₩"}</span>
                  {String(stock?.curPrice ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[13px] font-black font-mono",
                isUp
                  ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400"
              )}>
                <TrendingUp size={11} className={cn(isUp ? "text-emerald-500" : "text-red-500 rotate-180")} />
                {isUp ? "+" : ""}{ncavUpside.toFixed(1)}%
              </div>
            </div>

            {/* ── 하단 스탯 박스 (TCG 능력치 칸) ── */}
            <div className="relative z-10 px-3 mt-2 mb-auto">
              <div className="grid grid-cols-3 border border-zinc-100 dark:border-zinc-800/60 rounded-xl overflow-hidden divide-x divide-zinc-100 dark:divide-zinc-800/60">
                {[
                  { label: "PER",  value: `${stock?.per ?? "—"}x`,            color: "" },
                  { label: "PBR",  value: `${stock?.pbr ?? "—"}x`,            color: "" },
                  { label: "NCAV", value: `${isUp ? "+" : ""}${ncavUpside.toFixed(1)}%`,
                    color: isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center py-2 bg-zinc-50/80 dark:bg-zinc-900/50">
                    <span className="text-[7px] font-black text-zinc-400 uppercase tracking-wider font-mono mb-0.5">{label}</span>
                    <span className={cn("text-[10px] font-black font-mono leading-tight", color || "text-zinc-700 dark:text-zinc-300")}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── XP 바 ── */}
            <div className="relative z-10 px-3.5 pb-3 mt-2.5">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-[5px] bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full bg-gradient-to-r rounded-full", tier.barFrom, tier.barTo)}
                    animate={{ width: `${(xp / maxXp) * 100}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
                <span className="text-[7px] font-black font-mono text-zinc-400 tabular-nums shrink-0">
                  {Math.floor((xp / maxXp) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ BACK ════════════════ */}
        <div
          className="absolute inset-0 rounded-[1.6rem] bg-white dark:bg-zinc-950 border-2 border-zinc-200 dark:border-zinc-800 flex flex-col p-4 shadow-xl overflow-hidden"
          style={{ WebkitBackfaceVisibility: "hidden", backfaceVisibility: "hidden", transform: "rotateY(180deg)", pointerEvents: isFlipped ? "auto" : "none" }}
        >
          <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

          {/* XP 패널 */}
          <div className="relative bg-zinc-900 dark:bg-zinc-950 text-white p-3.5 rounded-xl border border-zinc-800 mb-3 shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 shrink-0">
                  <Award size={12} />
                </div>
                <div>
                  <p className="text-[9px] font-black font-mono tracking-wider text-zinc-100">종목 관심도 XP</p>
                  <p className="text-[7px] font-bold text-zinc-500 font-mono uppercase tracking-widest">{tier.title}</p>
                </div>
              </div>
              <span className="text-[9px] font-black font-mono bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded-lg">Lv.{level}</span>
            </div>
            <div className="flex justify-between text-[8px] font-mono font-bold text-zinc-500 mb-1">
              <span>진행도</span>
              <span className="tabular-nums">{xp} / {maxXp}</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
              <motion.div className={cn("h-full bg-gradient-to-r rounded-full", tier.barFrom, tier.barTo)}
                animate={{ width: `${(xp / maxXp) * 100}%` }} transition={{ duration: 0.2 }} />
            </div>
            <p className="mt-2 text-[8px] font-bold text-zinc-500 leading-relaxed border-t border-zinc-800 pt-2">
              조회할 때마다 XP 누적 · 레벨업 시 카드 프레임 강화
            </p>
          </div>

          {/* 분석 룰 */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            <div className="flex items-center gap-1.5 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
              <RotateCcw size={10} className="text-zinc-400" />
              <span className="text-[8px] text-zinc-400 font-black uppercase tracking-widest font-mono">Quant Rules</span>
            </div>
            {[
              { icon: <TrendingUp size={11} />, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-100 dark:border-emerald-900/30",
                title: "NCAV 업사이드", desc: "순유동자산(유동자산 − 총부채)이 시가총액을 초과하는 비율. 양수일수록 그레이엄 기준 저평가." },
              { icon: <ShieldCheck size={11} />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-100 dark:border-blue-900/30",
                title: "안전마진 기준", desc: "시가총액 < NCAV × 0.67 → S등급 이상. 청산가치 대비 충분한 하방 보호 확보." },
            ].map((item, i) => (
              <div key={i} className={cn("p-2.5 rounded-xl border", item.bg, item.border)}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={item.color}>{item.icon}</span>
                  <span className={cn("text-[8px] font-black uppercase tracking-tight font-mono", item.color)}>{item.title}</span>
                </div>
                <p className="text-[9px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* 푸터 */}
          <div className="mt-auto pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 shrink-0">
            {stock?.isUs ? <DollarSign size={9} className="text-blue-400" /> : <Coins size={9} className="text-indigo-400" />}
            <span className="text-[7px] font-black text-zinc-300 dark:text-zinc-700 tracking-[0.2em] uppercase font-mono">
              {stock?.isUs ? "Finnhub · IdiotQuant" : "Korea Investment · IdiotQuant"}
            </span>
          </div>
        </div>
      </motion.div>

      <style jsx global>{`
        @keyframes art-shine {
          0%   { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
};
