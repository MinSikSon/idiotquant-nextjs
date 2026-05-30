"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { TrendingUp, ShieldCheck, Award, DollarSign, Coins } from "lucide-react";
import LineChart from "@/components/LineChart";

// =========================================================================
// 스파클 위치 (결정론적 — 리렌더마다 변하지 않음)
// =========================================================================
const SPARKLES = [
  { x: 12, y: 18, size: 3, delay: 0.0 }, { x: 42, y: 8,  size: 4, delay: 0.4 },
  { x: 73, y: 22, size: 3, delay: 0.8 }, { x: 88, y: 58, size: 5, delay: 0.2 },
  { x: 62, y: 78, size: 3, delay: 0.6 }, { x: 22, y: 82, size: 4, delay: 1.0 },
  { x: 50, y: 42, size: 3, delay: 0.3 }, { x: 92, y: 14, size: 4, delay: 0.7 },
  { x:  8, y: 52, size: 3, delay: 0.1 }, { x: 35, y: 65, size: 5, delay: 0.9 },
  { x: 78, y: 38, size: 3, delay: 0.5 }, { x: 18, y: 35, size: 4, delay: 1.1 },
  { x: 58, y: 15, size: 3, delay: 0.35 },{ x: 82, y: 85, size: 4, delay: 0.65 },
  { x: 28, y: 55, size: 3, delay: 0.85 },
];

// =========================================================================
// 등급별 TCG 설정
// =========================================================================
const GRADE_CONFIG = {
  SSS: {
    frameGradient: "linear-gradient(135deg,#f472b6 0%,#a855f7 30%,#22d3ee 55%,#a855f7 80%,#f472b6 100%)",
    glow: "shadow-[0_0_55px_rgba(219,39,119,0.55),0_0_110px_rgba(168,85,247,0.25),0_0_200px_rgba(6,182,212,0.1)]",
    darkCard: true,
    cardBodyCls: "bg-[#0d0d1a]",
    label: "PREMIUM NET-NET",
    labelColor: "text-pink-400",
    badgeGradient: "linear-gradient(90deg,#ec4899,#a855f7,#22d3ee)",
    badgeText: "text-white",
    nameColor: "text-white",
    tickerColor: "text-pink-400/60",
    artBg: "from-purple-950 via-[#08080f] to-pink-950",
    artBorder: "border-pink-500/40",
    artShadow: "shadow-[inset_0_0_40px_rgba(168,85,247,0.25),inset_0_0_80px_rgba(219,39,119,0.1)]",
    typeGradient: "linear-gradient(90deg,rgba(236,72,153,0.14),rgba(168,85,247,0.14),rgba(6,182,212,0.14))",
    typeBorder: "border-pink-500/20",
    typeText: "text-pink-300",
    statBg: "bg-white/[0.04] border-white/[0.08]",
    statDivide: "divide-white/[0.06]",
    statLabel: "text-slate-500",
    statValue: "text-white",
    xpTrack: "bg-white/10",
    xpFrom: "from-pink-500", xpTo: "to-purple-500",
    tierColor: "text-pink-400/50",
    xpPctColor: "text-pink-400/50",
    holo: true, holoType: "rainbow" as const,
    rarity: "◆◆◆", rarityColor: "text-pink-400",
    cornerColor: "rgba(219,39,119,0.7)",
    priceColor: "text-white",
    priceCurrencyColor: "text-white/35",
    priceLabelColor: "text-white/30",
    upBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    downBg: "bg-red-500/10 border-red-500/25 text-red-400",
  },
  SS: {
    frameGradient: "linear-gradient(135deg,#fde68a 0%,#f59e0b 30%,#fbbf24 60%,#f59e0b 85%,#fde68a 100%)",
    glow: "shadow-[0_0_42px_rgba(245,158,11,0.5),0_0_90px_rgba(251,191,36,0.2)]",
    darkCard: true,
    cardBodyCls: "bg-[#100e00]",
    label: "DEEP VALUE ALPHA",
    labelColor: "text-amber-400",
    badgeGradient: "linear-gradient(90deg,#d97706,#fbbf24,#d97706)",
    badgeText: "text-amber-950 font-black",
    nameColor: "text-white",
    tickerColor: "text-amber-400/60",
    artBg: "from-amber-950 via-[#0f0a00] to-yellow-950",
    artBorder: "border-amber-500/40",
    artShadow: "shadow-[inset_0_0_36px_rgba(245,158,11,0.2)]",
    typeGradient: "linear-gradient(90deg,rgba(245,158,11,0.16),rgba(251,191,36,0.16),rgba(245,158,11,0.16))",
    typeBorder: "border-amber-500/20",
    typeText: "text-amber-300",
    statBg: "bg-white/[0.04] border-white/[0.08]",
    statDivide: "divide-white/[0.06]",
    statLabel: "text-slate-500",
    statValue: "text-white",
    xpTrack: "bg-white/10",
    xpFrom: "from-amber-400", xpTo: "to-yellow-500",
    tierColor: "text-amber-400/50",
    xpPctColor: "text-amber-400/50",
    holo: true, holoType: "gold" as const,
    rarity: "◆◆", rarityColor: "text-amber-400",
    cornerColor: "rgba(245,158,11,0.7)",
    priceColor: "text-white",
    priceCurrencyColor: "text-white/35",
    priceLabelColor: "text-white/30",
    upBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    downBg: "bg-red-500/10 border-red-500/25 text-red-400",
  },
  S: {
    frameGradient: "linear-gradient(135deg,#34d399 0%,#06b6d4 50%,#34d399 100%)",
    glow: "shadow-[0_0_32px_rgba(16,185,129,0.4),0_0_70px_rgba(6,182,212,0.2)]",
    darkCard: true,
    cardBodyCls: "bg-[#000f0e]",
    label: "DEEP VALUE",
    labelColor: "text-emerald-400",
    badgeGradient: "linear-gradient(90deg,#059669,#0891b2)",
    badgeText: "text-white",
    nameColor: "text-white",
    tickerColor: "text-emerald-400/60",
    artBg: "from-emerald-950 via-[#001412] to-teal-950",
    artBorder: "border-emerald-500/40",
    artShadow: "shadow-[inset_0_0_30px_rgba(16,185,129,0.2)]",
    typeGradient: "linear-gradient(90deg,rgba(16,185,129,0.16),rgba(6,182,212,0.16),rgba(16,185,129,0.16))",
    typeBorder: "border-emerald-500/20",
    typeText: "text-emerald-300",
    statBg: "bg-white/[0.04] border-white/[0.08]",
    statDivide: "divide-white/[0.06]",
    statLabel: "text-slate-500",
    statValue: "text-white",
    xpTrack: "bg-white/10",
    xpFrom: "from-emerald-400", xpTo: "to-teal-400",
    tierColor: "text-emerald-400/50",
    xpPctColor: "text-emerald-400/50",
    holo: true, holoType: "silver" as const,
    rarity: "◆", rarityColor: "text-emerald-400",
    cornerColor: "rgba(16,185,129,0.7)",
    priceColor: "text-white",
    priceCurrencyColor: "text-white/35",
    priceLabelColor: "text-white/30",
    upBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    downBg: "bg-red-500/10 border-red-500/25 text-red-400",
  },
  A: {
    frameGradient: "linear-gradient(135deg,#94a3b8,#cbd5e1,#94a3b8)",
    glow: "shadow-[0_0_16px_rgba(148,163,184,0.15)]",
    darkCard: false,
    cardBodyCls: "bg-white dark:bg-zinc-950",
    label: "STABLE ASSET",
    labelColor: "text-slate-500 dark:text-slate-400",
    badgeGradient: "linear-gradient(90deg,#475569,#94a3b8)",
    badgeText: "text-white",
    nameColor: "text-zinc-900 dark:text-zinc-100",
    tickerColor: "text-zinc-400",
    artBg: "from-slate-100 to-slate-200 dark:from-slate-900 dark:to-zinc-950",
    artBorder: "border-slate-300/60 dark:border-slate-700/40",
    artShadow: "",
    typeGradient: "linear-gradient(90deg,rgba(100,116,139,0.07),rgba(148,163,184,0.07))",
    typeBorder: "border-slate-300/50 dark:border-slate-700/40",
    typeText: "text-slate-500 dark:text-slate-400",
    statBg: "bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/40",
    statDivide: "divide-zinc-100 dark:divide-zinc-800/60",
    statLabel: "text-zinc-400 dark:text-zinc-500",
    statValue: "text-zinc-700 dark:text-zinc-300",
    xpTrack: "bg-zinc-100 dark:bg-zinc-800",
    xpFrom: "from-slate-400", xpTo: "to-slate-500",
    tierColor: "text-zinc-400",
    xpPctColor: "text-zinc-400",
    holo: false, holoType: "none" as const,
    rarity: "○", rarityColor: "text-slate-400",
    cornerColor: "rgba(100,116,139,0.3)",
    priceColor: "text-zinc-900 dark:text-white",
    priceCurrencyColor: "text-zinc-400",
    priceLabelColor: "text-zinc-400",
    upBg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    downBg: "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400",
  },
  B: {
    frameGradient: "linear-gradient(135deg,#71717a,#a1a1aa,#71717a)",
    glow: "shadow-md",
    darkCard: false,
    cardBodyCls: "bg-white dark:bg-zinc-950",
    label: "FAIR VALUE",
    labelColor: "text-zinc-500 dark:text-zinc-400",
    badgeGradient: "linear-gradient(90deg,#3f3f46,#71717a)",
    badgeText: "text-zinc-100",
    nameColor: "text-zinc-900 dark:text-zinc-100",
    tickerColor: "text-zinc-400",
    artBg: "from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-950",
    artBorder: "border-zinc-300/50 dark:border-zinc-700/40",
    artShadow: "",
    typeGradient: "linear-gradient(90deg,rgba(113,113,122,0.07),rgba(161,161,170,0.07))",
    typeBorder: "border-zinc-300/50 dark:border-zinc-700/40",
    typeText: "text-zinc-500 dark:text-zinc-400",
    statBg: "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/60 dark:border-zinc-700/40",
    statDivide: "divide-zinc-100 dark:divide-zinc-800/60",
    statLabel: "text-zinc-400 dark:text-zinc-500",
    statValue: "text-zinc-700 dark:text-zinc-300",
    xpTrack: "bg-zinc-100 dark:bg-zinc-800",
    xpFrom: "from-zinc-400", xpTo: "to-zinc-500",
    tierColor: "text-zinc-400",
    xpPctColor: "text-zinc-400",
    holo: false, holoType: "none" as const,
    rarity: "○", rarityColor: "text-zinc-500",
    cornerColor: "rgba(113,113,122,0.3)",
    priceColor: "text-zinc-900 dark:text-white",
    priceCurrencyColor: "text-zinc-400",
    priceLabelColor: "text-zinc-400",
    upBg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    downBg: "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400",
  },
  F: {
    frameGradient: "linear-gradient(135deg,#ef4444,#f87171,#ef4444)",
    glow: "shadow-[0_0_22px_rgba(239,68,68,0.25)]",
    darkCard: false,
    cardBodyCls: "bg-white dark:bg-zinc-950",
    label: "OVERVALUED",
    labelColor: "text-red-500 dark:text-red-400",
    badgeGradient: "linear-gradient(90deg,#b91c1c,#ef4444)",
    badgeText: "text-white",
    nameColor: "text-zinc-900 dark:text-zinc-100",
    tickerColor: "text-zinc-400",
    artBg: "from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-950",
    artBorder: "border-red-300/50 dark:border-red-700/40",
    artShadow: "",
    typeGradient: "linear-gradient(90deg,rgba(239,68,68,0.07),rgba(244,63,94,0.07))",
    typeBorder: "border-red-200/50 dark:border-red-800/30",
    typeText: "text-red-500 dark:text-red-400",
    statBg: "bg-red-50/50 dark:bg-red-950/20 border-red-100/60 dark:border-red-900/30",
    statDivide: "divide-red-100/50 dark:divide-red-900/30",
    statLabel: "text-red-300 dark:text-red-500",
    statValue: "text-zinc-700 dark:text-zinc-300",
    xpTrack: "bg-zinc-100 dark:bg-zinc-800",
    xpFrom: "from-red-400", xpTo: "to-rose-500",
    tierColor: "text-zinc-400",
    xpPctColor: "text-zinc-400",
    holo: false, holoType: "none" as const,
    rarity: "○", rarityColor: "text-red-500",
    cornerColor: "rgba(239,68,68,0.35)",
    priceColor: "text-zinc-900 dark:text-white",
    priceCurrencyColor: "text-zinc-400",
    priceLabelColor: "text-zinc-400",
    upBg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    downBg: "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400",
  },
} as const;

const DEFAULT_GRADE_CONFIG = GRADE_CONFIG.B;

// =========================================================================
// 등급 메타 (뒷면 설명용)
// =========================================================================
const GRADE_META: Record<string, { criteria: string; desc: string; dotColor: string }> = {
  SSS: { criteria: "업사이드 ≥ +200%", desc: "청산가치 대비 극도의 저평가. 그레이엄 최고 등급 기준 충족.", dotColor: "bg-pink-500" },
  SS:  { criteria: "업사이드 ≥ +150%", desc: "강력한 안전마진 확보. 심층 가치 투자의 핵심 후보.", dotColor: "bg-amber-500" },
  S:   { criteria: "업사이드 ≥ +100%", desc: "그레이엄 기준 충족. 청산가치 대비 유의한 저평가.", dotColor: "bg-emerald-500" },
  A:   { criteria: "업사이드 ≥  +50%", desc: "안전마진 존재. 추가 분석 후 진입 검토 가능.", dotColor: "bg-slate-400" },
  B:   { criteria: "업사이드 ≥    0%", desc: "공정 가치 구간. 모멘텀 등 다른 지표 병행 필요.", dotColor: "bg-zinc-400" },
  F:   { criteria: "업사이드 <    0%", desc: "고평가 가능성. 청산가치 미달. 투자 시 주의.", dotColor: "bg-red-500" },
};

// 등급 전체 표 (뒷면 미니 테이블)
const GRADE_TABLE = [
  { g: "SSS", crit: "≥ +200%", color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
  { g: "SS",  crit: "≥ +150%", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  { g: "S",   crit: "≥ +100%", color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20" },
  { g: "A",   crit: "≥  +50%", color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20" },
  { g: "B",   crit: "≥   +0%", color: "text-zinc-400",   bg: "bg-zinc-500/10 border-zinc-500/20" },
  { g: "F",   crit: "<   +0%", color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
];

// =========================================================================
// 레벨 티어
// =========================================================================
const getLevelTier = (level: number) => {
  if (level >= 15) return {
    title: "SIGNATURE", from: "from-cyan-400", to: "to-indigo-400",
    badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    desc: "최고 관심 종목. 핵심 투자 후보로 분류됩니다.",
    next: null as string | null, nextLevel: null as number | null,
  };
  if (level >= 8) return {
    title: "HIGH CONVICTION", from: "from-emerald-400", to: "to-teal-400",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    desc: "높은 확신 형성 단계. 포트폴리오 편입 후보.",
    next: "SIGNATURE" as string | null, nextLevel: 15 as number | null,
  };
  if (level >= 4) return {
    title: "WATCHLIST", from: "from-sky-400", to: "to-blue-400",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    desc: "꾸준한 모니터링 중. 관심도를 쌓고 있습니다.",
    next: "HIGH CONVICTION" as string | null, nextLevel: 8 as number | null,
  };
  return {
    title: "BEGINNER", from: "from-zinc-300", to: "to-zinc-400",
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
    desc: "관심을 막 시작한 단계. 조회할수록 XP가 누적됩니다.",
    next: "WATCHLIST" as string | null, nextLevel: 4 as number | null,
  };
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
// 홀로그래픽 오버레이
// =========================================================================
const HoloOverlay = ({
  type, mouseX, mouseY, isHovering,
}: {
  type: "rainbow" | "gold" | "silver" | "none";
  mouseX: ReturnType<typeof useMotionValue<number>>;
  mouseY: ReturnType<typeof useMotionValue<number>>;
  isHovering: boolean;
}) => {
  // 세 가지 타입의 그라디언트 — 훅 순서 고정
  const rainbowBg = useTransform(
    [mouseX, mouseY] as ReturnType<typeof useMotionValue<number>>[],
    (latest: number[]) => {
      const [mx] = latest;
      const angle = 105 + mx * 90;
      const h = mx * 300;
      return [
        `linear-gradient(${angle}deg,`,
        `hsl(${h}deg 90% 65%/0.55) 0%,`,
        `hsl(${h + 55}deg 90% 65%/0.55) 16%,`,
        `hsl(${h + 110}deg 90% 65%/0.55) 33%,`,
        `hsl(${h + 165}deg 90% 65%/0.55) 50%,`,
        `hsl(${h + 220}deg 90% 65%/0.55) 67%,`,
        `hsl(${h + 275}deg 90% 65%/0.55) 83%,`,
        `hsl(${h + 330}deg 90% 65%/0.55) 100%)`,
      ].join(" ");
    }
  );

  const goldBg = useTransform(
    [mouseX, mouseY] as ReturnType<typeof useMotionValue<number>>[],
    (latest: number[]) => {
      const [mx, my] = latest;
      const angle = 70 + mx * 70 + my * 40;
      return `linear-gradient(${angle}deg,rgba(253,224,71,0)/20%,rgba(253,224,71,0.65) 44%,rgba(255,255,255,0.9) 50%,rgba(253,224,71,0.65) 56%,rgba(253,224,71,0)/80%)`;
    }
  );

  const silverBg = useTransform(
    [mouseX, mouseY] as ReturnType<typeof useMotionValue<number>>[],
    (latest: number[]) => {
      const [mx, my] = latest;
      const angle = 70 + mx * 70 + my * 40;
      return `linear-gradient(${angle}deg,rgba(52,211,153,0)/20%,rgba(52,211,153,0.55) 42%,rgba(255,255,255,0.8) 50%,rgba(6,182,212,0.55) 58%,rgba(52,211,153,0)/80%)`;
    }
  );

  if (type === "none") return null;

  const bg = type === "rainbow" ? rainbowBg : type === "gold" ? goldBg : silverBg;
  const baseOpacity = type === "rainbow" ? 0.35 : 0.12;
  const hoverOpacity = 1;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-20 rounded-[1.45rem]"
      style={{ background: bg, mixBlendMode: "hard-light" }}
      animate={{ opacity: isHovering ? hoverOpacity : baseOpacity }}
      transition={{ duration: 0.25 }}
    />
  );
};

// =========================================================================
// 스파클 레이어 (SSS 전용)
// =========================================================================
const SparkleLayer = ({ isHovering }: { isHovering: boolean }) => (
  <div className="absolute inset-0 pointer-events-none z-[25] overflow-hidden rounded-[1.45rem]">
    {SPARKLES.map((s, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size * 2, height: s.size * 2 }}
        animate={{
          opacity: isHovering ? [0, 1, 0] : [0, 0.35, 0],
          scale:   isHovering ? [0, 1.3, 0] : [0, 0.5, 0],
        }}
        transition={{ repeat: Infinity, duration: 1.3, delay: s.delay, ease: "easeInOut" }}
      >
        {/* 4-point star shape */}
        <div className="absolute inset-0 rounded-full bg-white blur-[1px]" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white -translate-y-1/2" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white -translate-x-1/2" />
      </motion.div>
    ))}
  </div>
);

// =========================================================================
// 코너 장식
// =========================================================================
const CornerOrnament = ({ pos, color }: { pos: "tl"|"tr"|"bl"|"br"; color: string }) => {
  const style: React.CSSProperties = {
    position: "absolute",
    width: 16, height: 16,
    top:    pos.startsWith("t") ? 10 : undefined,
    bottom: pos.startsWith("b") ? 10 : undefined,
    left:   pos.endsWith("l")   ? 10 : undefined,
    right:  pos.endsWith("r")   ? 10 : undefined,
    transform: { tl: "rotate(0deg)", tr: "rotate(90deg)", br: "rotate(180deg)", bl: "rotate(270deg)" }[pos],
    pointerEvents: "none",
    zIndex: 10,
  };
  return (
    <div style={style}>
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 15 L1 1 L15 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="1" cy="1" r="1.8" fill={color} />
      </svg>
    </div>
  );
};

// =========================================================================
// StockCard
// =========================================================================
export const StockCard = ({ stock, chartConfig, isCompact = false, stockXpProfile }: StockCardProps) => {
  const [isFlipped, setIsFlipped]         = useState(false);
  const [imgError, setImgError]           = useState(false);
  const [isHovering, setIsHovering]       = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const nextId     = useRef<number>(0);
  const prevAward  = useRef<number>(stockXpProfile?.awardCount ?? 0);
  const clearTimer = useRef<number | null>(null);
  const cardRef    = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const rotateX = useTransform(mouseY, [0, 1], [10, -10]);
  const rotateY = useTransform(mouseX, [0, 1], [-10, 10]);

  const level = stockXpProfile?.level  ?? 1;
  const xp    = stockXpProfile?.xp     ?? 0;
  const maxXp = Math.max(1, stockXpProfile?.maxXp ?? 100);
  const tier  = useMemo(() => getLevelTier(level), [level]);

  const gradeRaw = stock?.grade;
  const grade = gradeRaw && typeof gradeRaw === "object"
    ? String((gradeRaw as any).grade || "B")
    : String(gradeRaw || "B");
  const cfg = (GRADE_CONFIG as any)[grade] ?? DEFAULT_GRADE_CONFIG;

  const ncavUpside = Number(stock?.ncavScore ?? 0);
  const isUp       = ncavUpside >= 0;

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

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    setIsHovering(false);
  }, [mouseX, mouseY]);

  const logoUrl = stock?.isUs
    ? `https://img.logo.dev/ticker/${stock.ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}`;

  const W = isCompact ? "w-[16rem]"   : "w-[18rem]";
  const H = isCompact ? "h-[22.5rem]" : "h-[25.2rem]";
  const artH = isCompact ? "h-[7.8rem]" : "h-[9rem]";

  return (
    <div
      ref={cardRef}
      className={cn("relative select-none cursor-pointer transform-gpu group", W, H)}
      style={{ perspective: "1800px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
          className={cn("absolute inset-0 rounded-[1.75rem] p-[3px]", cfg.glow)}
          style={{
            background: cfg.frameGradient,
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            transform: "rotateY(0deg)",
            pointerEvents: isFlipped ? "none" : "auto",
          }}
        >
          {/* 카드 몸체 */}
          <div className={cn("w-full h-full rounded-[1.5rem] flex flex-col relative overflow-hidden", cfg.cardBodyCls)}>

            {/* 홀로그래픽 오버레이 */}
            {cfg.holo && (
              <HoloOverlay type={cfg.holoType} mouseX={mouseX} mouseY={mouseY} isHovering={isHovering} />
            )}

            {/* 스파클 (SSS) */}
            {grade === "SSS" && <SparkleLayer isHovering={isHovering} />}

            {/* 코너 장식 */}
            {(["tl", "tr", "bl", "br"] as const).map(pos => (
              <CornerOrnament key={pos} pos={pos} color={cfg.cornerColor} />
            ))}

            {/* ── 헤더 ── */}
            <div className="relative z-10 px-4 pt-4 pb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className={cn("font-black text-sm tracking-tight leading-tight truncate", cfg.nameColor)}>
                  {stock?.name}
                </h3>
                <p className={cn("text-[8px] font-mono font-bold mt-0.5 tracking-wider uppercase", cfg.tickerColor)}>
                  {stock?.ticker} · {stock?.isUs ? "NASDAQ/NYSE" : "KRX"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span
                  className={cn("px-2.5 py-0.5 rounded-lg text-sm font-black font-mono shadow-lg leading-snug", cfg.badgeText)}
                  style={{ background: cfg.badgeGradient }}
                >
                  {grade}
                </span>
                {chartConfig?.data?.length > 0 && (
                  <div className="w-14 h-[18px] opacity-50">
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
            <div className={cn(
              "relative z-10 mx-3.5 rounded-xl overflow-hidden border flex items-center justify-center group/art shrink-0",
              `bg-gradient-to-br ${cfg.artBg}`,
              cfg.artBorder,
              cfg.artShadow,
              artH,
            )}>
              {/* 내부 이중 테두리 */}
              <div className="absolute inset-[3px] rounded-lg border border-white/[0.06] pointer-events-none z-10" />

              {/* 격자 패턴 */}
              <div className={cn(
                "absolute inset-0 bg-[size:12px_12px]",
                cfg.darkCard
                  ? "bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)]"
                  : "bg-[linear-gradient(to_right,rgba(0,0,0,0.007)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.007)_1px,transparent_1px)]"
              )} />

              {/* 로고 */}
              {!imgError ? (
                <Image
                  key={stock?.ticker} src={logoUrl} alt="logo" fill
                  className={cn(
                    "object-contain p-6 transition-transform duration-300 group-hover/art:scale-[1.08]",
                    cfg.darkCard ? "brightness-110 drop-shadow-[0_0_16px_rgba(255,255,255,0.2)]" : ""
                  )}
                  unoptimized onError={() => setImgError(true)}
                />
              ) : (
                <span className={cn(
                  "text-4xl font-black font-mono tracking-tighter",
                  cfg.darkCard ? "text-white/30" : "text-zinc-400 dark:text-zinc-500"
                )}>
                  {(stock?.ticker ?? "??").substring(0, 2)}
                </span>
              )}

              {/* Lv 배지 */}
              <div className={cn(
                "absolute top-2 left-2 px-1.5 py-[2px] rounded text-[8px] font-black font-mono italic border shadow-sm z-20",
                tier.badge,
                cfg.darkCard ? "border-white/10" : "border-black/5"
              )}>
                Lv.{level}
              </div>

              {/* 희귀도 */}
              <div className={cn(
                "absolute bottom-2 right-2 z-20 text-[9px] font-black font-mono tracking-widest",
                cfg.rarityColor
              )}>
                {cfg.rarity}
              </div>
            </div>

            {/* ── 타입 스트립 ── */}
            <div
              className={cn("relative z-10 mx-3.5 mt-1.5 px-3 py-[5px] rounded-lg flex items-center justify-between border", cfg.typeBorder)}
              style={{ background: cfg.typeGradient }}
            >
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.darkCard ? "bg-white/30" : "bg-zinc-400/60")} />
                <span className={cn("text-[8px] font-black uppercase tracking-[0.15em] font-mono", cfg.typeText)}>
                  {cfg.label}
                </span>
              </div>
              <span className={cn("text-[7px] font-bold font-mono uppercase tracking-wider", cfg.darkCard ? "text-white/25" : "text-zinc-400")}>
                {stock?.isUs ? "SEC" : "FSS"}
              </span>
            </div>

            {/* ── 가격 + NCAV 업사이드 ── */}
            <div className="relative z-10 px-4 mt-2.5 flex items-center justify-between gap-2">
              <div>
                <p className={cn("text-[7px] font-black uppercase tracking-widest font-mono leading-none mb-0.5", cfg.priceLabelColor)}>Price</p>
                <p className={cn("text-xl font-black tabular-nums tracking-tight font-mono leading-tight", cfg.priceColor)}>
                  <span className={cn("text-[10px] font-bold mr-0.5", cfg.priceCurrencyColor)}>
                    {stock?.isUs ? "$" : "₩"}
                  </span>
                  {String(stock?.curPrice ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                </p>
              </div>
              <div className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[13px] font-black font-mono",
                isUp ? cfg.upBg : cfg.downBg
              )}>
                <TrendingUp size={11} className={cn(isUp ? "text-emerald-500" : "text-red-500 rotate-180")} />
                {isUp ? "+" : ""}{ncavUpside.toFixed(1)}%
              </div>
            </div>

            {/* ── 스탯 박스 ── */}
            <div className="relative z-10 px-3.5 mt-2 mb-auto">
              <div className={cn(
                "grid grid-cols-3 rounded-xl overflow-hidden divide-x border",
                cfg.statBg, cfg.statDivide
              )}>
                {[
                  { label: "PER",  value: `${stock?.per ?? "—"}x`, color: "" },
                  { label: "PBR",  value: `${stock?.pbr ?? "—"}x`, color: "" },
                  { label: "NCAV", value: `${isUp ? "+" : ""}${ncavUpside.toFixed(1)}%`,
                    color: isUp ? "text-emerald-400" : "text-red-400" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center py-2">
                    <span className={cn("text-[7px] font-black uppercase tracking-wider font-mono mb-0.5", cfg.statLabel)}>{label}</span>
                    <span className={cn("text-[10px] font-black font-mono leading-tight", color || cfg.statValue)}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── XP 바 ── */}
            <div className="relative z-10 px-4 pb-3.5 mt-2.5">
              <div className="flex items-center gap-1 mb-1">
                <span className={cn("text-[7px] font-black font-mono uppercase tracking-wider", cfg.tierColor)}>
                  {tier.title}
                </span>
                <span className="flex-1" />
                <span className={cn("text-[7px] font-black font-mono tabular-nums", cfg.xpPctColor)}>
                  {Math.floor((xp / maxXp) * 100)}%
                </span>
              </div>
              <div className={cn("w-full h-[4px] rounded-full overflow-hidden", cfg.xpTrack)}>
                <motion.div
                  className={cn("h-full bg-gradient-to-r rounded-full", cfg.xpFrom, cfg.xpTo)}
                  animate={{ width: `${(xp / maxXp) * 100}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════ BACK ════════════════ */}
        <div
          className="absolute inset-0 rounded-[1.75rem] bg-white dark:bg-zinc-950 flex flex-col shadow-xl overflow-hidden"
          style={{
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            pointerEvents: isFlipped ? "auto" : "none",
          }}
        >
          {/* 배경 도트 패턴 */}
          <div className="absolute inset-0 opacity-[0.025] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />
          {/* 등급 컬러 헤더 글로우 */}
          <div className="absolute inset-x-0 top-0 h-32 opacity-[0.08] pointer-events-none" style={{ background: cfg.frameGradient }} />
          {/* 테두리 */}
          <div className="absolute inset-0 rounded-[1.75rem] border-2 border-zinc-200 dark:border-zinc-800 pointer-events-none" />

          <div className="relative flex flex-col gap-2.5 p-3.5 h-full overflow-y-auto">

            {/* ── 등급 섹션 ── */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck size={10} className="text-zinc-400" />
                <span className="text-[8px] font-black uppercase tracking-widest font-mono text-zinc-400">등급 분석</span>
              </div>

              {/* 현재 등급 설명 박스 */}
              {(() => {
                const meta = GRADE_META[grade] ?? GRADE_META.B;
                return (
                  <div className="flex gap-2.5 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800/70 mb-2">
                    <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5">
                      <span
                        className={cn("text-xl font-black font-mono leading-none", cfg.labelColor)}
                        style={{ textShadow: cfg.darkCard ? "none" : undefined }}
                      >
                        {grade}
                      </span>
                      <div className={cn("w-1.5 h-1.5 rounded-full", meta.dotColor)} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-[8px] font-black font-mono mb-0.5", cfg.labelColor)}>{meta.criteria}</p>
                      <p className="text-[8.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed">{meta.desc}</p>
                    </div>
                  </div>
                );
              })()}

              {/* 전체 등급 미니 테이블 */}
              <div className="grid grid-cols-3 gap-1">
                {GRADE_TABLE.map(({ g, crit, color, bg }) => (
                  <div
                    key={g}
                    className={cn(
                      "flex flex-col items-center py-1 px-1 rounded-lg border",
                      bg,
                      grade === g ? "ring-1 ring-inset ring-white/30 dark:ring-white/20" : "opacity-60"
                    )}
                  >
                    <span className={cn("text-[9px] font-black font-mono leading-none", color)}>{g}</span>
                    <span className="text-[6.5px] font-mono font-bold text-zinc-500 mt-0.5 tabular-nums">{crit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-zinc-200 dark:border-zinc-800" />

            {/* ── 레벨 섹션 ── */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Award size={10} className="text-zinc-400" />
                <span className="text-[8px] font-black uppercase tracking-widest font-mono text-zinc-400">카드 레벨</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-950 border border-zinc-800">
                {/* 레벨 헤더 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[8px] font-black font-mono px-1.5 py-0.5 rounded border", tier.badge)}>
                      {tier.title}
                    </span>
                  </div>
                  <span className="text-[11px] font-black font-mono text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                    Lv.{level}
                  </span>
                </div>

                {/* 티어 설명 */}
                <p className="text-[8.5px] text-zinc-400 leading-relaxed mb-2">{tier.desc}</p>

                {/* XP 바 */}
                <div className="flex justify-between text-[7px] font-mono font-bold text-zinc-600 mb-1">
                  <span>XP 진행도</span>
                  <span className="tabular-nums">{xp} / {maxXp}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50 mb-2">
                  <motion.div
                    className={cn("h-full bg-gradient-to-r rounded-full", cfg.xpFrom, cfg.xpTo)}
                    animate={{ width: `${(xp / maxXp) * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                {/* 다음 티어 */}
                {tier.next ? (
                  <div className="flex items-center gap-1 pt-1.5 border-t border-zinc-800">
                    <TrendingUp size={8} className="text-zinc-600 shrink-0" />
                    <p className="text-[7px] text-zinc-600 font-mono">
                      <span className="text-zinc-500 font-bold">Lv.{tier.nextLevel}</span> 도달 시{" "}
                      <span className="text-zinc-400 font-bold">{tier.next}</span> 승격
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 pt-1.5 border-t border-zinc-800">
                    <span className="text-[7px] text-zinc-600 font-mono">✦ 최고 티어 달성</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 푸터 ── */}
            <div className="mt-auto pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 shrink-0">
              {stock?.isUs ? <DollarSign size={9} className="text-blue-400" /> : <Coins size={9} className="text-indigo-400" />}
              <span className="text-[7px] font-black text-zinc-300 dark:text-zinc-700 tracking-[0.2em] uppercase font-mono">
                {stock?.isUs ? "Finnhub · IdiotQuant" : "Korea Investment · IdiotQuant"}
              </span>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
};
