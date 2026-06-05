"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from 'framer-motion';
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
    holo: true, holoType: "aurora" as const,
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
    cardBodyCls: "bg-white dark:bg-[#1a1915]",
    label: "STABLE ASSET",
    labelColor: "text-slate-500 dark:text-slate-400",
    badgeGradient: "linear-gradient(90deg,#475569,#94a3b8)",
    badgeText: "text-white",
    nameColor: "text-neutral-900 dark:text-neutral-100",
    tickerColor: "text-neutral-400",
    artBg: "from-slate-100 to-slate-200 dark:from-slate-900 dark:to-neutral-950",
    artBorder: "border-slate-300/60 dark:border-slate-700/40",
    artShadow: "",
    typeGradient: "linear-gradient(90deg,rgba(100,116,139,0.07),rgba(148,163,184,0.07))",
    typeBorder: "border-slate-300/50 dark:border-slate-700/40",
    typeText: "text-slate-500 dark:text-slate-400",
    statBg: "bg-slate-50 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-700/40",
    statDivide: "divide-neutral-100 dark:divide-[#35332e]/60",
    statLabel: "text-neutral-400 dark:text-neutral-500",
    statValue: "text-neutral-700 dark:text-neutral-300",
    xpTrack: "bg-[#faf9f7] dark:bg-[#242320]",
    xpFrom: "from-slate-400", xpTo: "to-slate-500",
    tierColor: "text-neutral-400",
    xpPctColor: "text-neutral-400",
    holo: false, holoType: "none" as const,
    rarity: "○", rarityColor: "text-slate-400",
    cornerColor: "rgba(100,116,139,0.3)",
    priceColor: "text-neutral-900 dark:text-white",
    priceCurrencyColor: "text-neutral-400",
    priceLabelColor: "text-neutral-400",
    upBg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    downBg: "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400",
  },
  B: {
    frameGradient: "linear-gradient(135deg,#71717a,#a1a1aa,#71717a)",
    glow: "shadow-md",
    darkCard: false,
    cardBodyCls: "bg-white dark:bg-[#1a1915]",
    label: "FAIR VALUE",
    labelColor: "text-neutral-500 dark:text-neutral-400",
    badgeGradient: "linear-gradient(90deg,#3f3f46,#71717a)",
    badgeText: "text-neutral-100",
    nameColor: "text-neutral-900 dark:text-neutral-100",
    tickerColor: "text-neutral-400",
    artBg: "from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950",
    artBorder: "border-neutral-300/50 dark:border-[#3a3834]/40",
    artShadow: "",
    typeGradient: "linear-gradient(90deg,rgba(113,113,122,0.07),rgba(161,161,170,0.07))",
    typeBorder: "border-neutral-300/50 dark:border-[#3a3834]/40",
    typeText: "text-neutral-500 dark:text-neutral-400",
    statBg: "bg-[#faf9f7] dark:bg-[#242320]/50 border-neutral-200/60 dark:border-[#3a3834]/40",
    statDivide: "divide-neutral-100 dark:divide-[#35332e]/60",
    statLabel: "text-neutral-400 dark:text-neutral-500",
    statValue: "text-neutral-700 dark:text-neutral-300",
    xpTrack: "bg-[#faf9f7] dark:bg-[#242320]",
    xpFrom: "from-neutral-400", xpTo: "to-neutral-500",
    tierColor: "text-neutral-400",
    xpPctColor: "text-neutral-400",
    holo: false, holoType: "none" as const,
    rarity: "○", rarityColor: "text-neutral-500",
    cornerColor: "rgba(113,113,122,0.3)",
    priceColor: "text-neutral-900 dark:text-white",
    priceCurrencyColor: "text-neutral-400",
    priceLabelColor: "text-neutral-400",
    upBg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    downBg: "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400",
  },
  F: {
    frameGradient: "linear-gradient(135deg,#ef4444,#f87171,#ef4444)",
    glow: "shadow-[0_0_22px_rgba(239,68,68,0.25)]",
    darkCard: false,
    cardBodyCls: "bg-white dark:bg-[#1a1915]",
    label: "OVERVALUED",
    labelColor: "text-red-500 dark:text-red-400",
    badgeGradient: "linear-gradient(90deg,#b91c1c,#ef4444)",
    badgeText: "text-white",
    nameColor: "text-neutral-900 dark:text-neutral-100",
    tickerColor: "text-neutral-400",
    artBg: "from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-950",
    artBorder: "border-red-300/50 dark:border-red-700/40",
    artShadow: "",
    typeGradient: "linear-gradient(90deg,rgba(239,68,68,0.07),rgba(244,63,94,0.07))",
    typeBorder: "border-red-200/50 dark:border-red-800/30",
    typeText: "text-red-500 dark:text-red-400",
    statBg: "bg-red-50/50 dark:bg-red-950/20 border-red-100/60 dark:border-red-900/30",
    statDivide: "divide-red-100/50 dark:divide-red-900/30",
    statLabel: "text-red-300 dark:text-red-500",
    statValue: "text-neutral-700 dark:text-neutral-300",
    xpTrack: "bg-[#faf9f7] dark:bg-[#242320]",
    xpFrom: "from-red-400", xpTo: "to-rose-500",
    tierColor: "text-neutral-400",
    xpPctColor: "text-neutral-400",
    holo: false, holoType: "none" as const,
    rarity: "○", rarityColor: "text-red-500",
    cornerColor: "rgba(239,68,68,0.35)",
    priceColor: "text-neutral-900 dark:text-white",
    priceCurrencyColor: "text-neutral-400",
    priceLabelColor: "text-neutral-400",
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
  B:   { criteria: "업사이드 ≥    0%", desc: "공정 가치 구간. 모멘텀 등 다른 지표 병행 필요.", dotColor: "bg-neutral-400" },
  F:   { criteria: "업사이드 <    0%", desc: "고평가 가능성. 청산가치 미달. 투자 시 주의.", dotColor: "bg-red-500" },
};

// 등급 전체 표 (뒷면 미니 테이블)
const GRADE_TABLE = [
  { g: "SSS", crit: "≥ +200%", color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
  { g: "SS",  crit: "≥ +150%", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  { g: "S",   crit: "≥ +100%", color: "text-emerald-400",bg: "bg-emerald-500/10 border-emerald-500/20" },
  { g: "A",   crit: "≥  +50%", color: "text-slate-400",  bg: "bg-slate-500/10 border-slate-500/20" },
  { g: "B",   crit: "≥   +0%", color: "text-neutral-400",   bg: "bg-neutral-500/10 border-neutral-500/20" },
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
    title: "WATCHLIST", from: "from-sky-400", to: "to-sky-600",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    desc: "꾸준한 모니터링 중. 관심도를 쌓고 있습니다.",
    next: "HIGH CONVICTION" as string | null, nextLevel: 8 as number | null,
  };
  return {
    title: "BEGINNER", from: "from-neutral-300", to: "to-neutral-400",
    badge: "bg-[#faf9f7] text-neutral-600 dark:bg-[#242320] dark:text-neutral-400",
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
// 홀로그래픽 오버레이 — 기울임 시에만 은은하게 출현
// =========================================================================
const HoloOverlay = ({
  type, mouseX, mouseY,
}: {
  type: "rainbow" | "gold" | "aurora" | "none";
  mouseX: ReturnType<typeof useMotionValue<number>>;
  mouseY: ReturnType<typeof useMotionValue<number>>;
}) => {
  type MV = ReturnType<typeof useMotionValue<number>>;
  const inputs = [mouseX, mouseY] as MV[];

  // 훅 순서 고정 — 세 그라디언트 항상 계산
  // SSS: 프리즘 포일 — 30° 간격 촘촘한 밴드, 넓은 각도 스윕
  const rainbowBg = useTransform(inputs, (latest: number[]) => {
    const [mx, my] = latest;
    const angle = 110 + mx * 180 + my * 60;
    const h = mx * 360;
    return [
      `linear-gradient(${angle}deg,`,
      `hsl(${h % 360}deg 100% 60%) 0%,`,
      `hsl(${(h + 30)  % 360}deg 100% 60%) 10%,`,
      `hsl(${(h + 60)  % 360}deg 100% 62%) 20%,`,
      `hsl(${(h + 90)  % 360}deg 100% 58%) 32%,`,
      `hsl(${(h + 140) % 360}deg 100% 60%) 44%,`,
      `hsl(${(h + 190) % 360}deg 100% 62%) 56%,`,
      `hsl(${(h + 240) % 360}deg 100% 60%) 68%,`,
      `hsl(${(h + 290) % 360}deg 100% 58%) 80%,`,
      `hsl(${(h + 330) % 360}deg 100% 60%) 90%,`,
      `hsl(${h % 360}deg 100% 60%) 100%)`,
    ].join(" ");
  });

  // SS: 듀오크롬 골드 — 골드 피크 + 로즈골드 오프셋으로 이색 시머
  const goldBg = useTransform(inputs, (latest: number[]) => {
    const [mx, my] = latest;
    const angle = 55 + mx * 150 + my * 75;
    return [
      `linear-gradient(${angle}deg,`,
      `rgba(101,63,0,0) 0%,`,
      `rgba(212,148,20,0.7) 20%,`,
      `rgba(255,220,100,0.95) 38%,`,
      `rgba(255,248,200,1.0) 50%,`,
      `rgba(255,200,160,0.9) 62%,`,
      `rgba(220,150,60,0.7) 78%,`,
      `rgba(101,63,0,0) 100%)`,
    ].join(" ");
  });

  // S: 오로라 보레알리스 — Y축 중심 스윕, 파랑-청록-초록-보라 5색
  const auroraBg = useTransform(inputs, (latest: number[]) => {
    const [mx, my] = latest;
    const angle = 160 + my * 120 + mx * 40;
    return [
      `linear-gradient(${angle}deg,`,
      `rgba(0,20,80,0) 0%,`,
      `rgba(30,100,200,0.7) 15%,`,
      `rgba(20,200,180,0.85) 30%,`,
      `rgba(80,220,130,0.9) 45%,`,
      `rgba(180,255,200,1.0) 52%,`,
      `rgba(120,200,240,0.85) 62%,`,
      `rgba(140,80,220,0.7) 78%,`,
      `rgba(20,0,60,0) 100%)`,
    ].join(" ");
  });

  // smoothstep: 살짝 기울이면 은은하게, 많이 기울이면 뚜렷하게
  const holoOpacity = useTransform(inputs, (latest: number[]) => {
    const [mx, my] = latest;
    const dx = mx - 0.5;
    const dy = my - 0.5;
    const tilt = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2.0);
    const smoothTilt = tilt * tilt * (3 - 2 * tilt);
    const maxOpacity = type === "rainbow" ? 0.52 : type === "gold" ? 0.48 : 0.45;
    return smoothTilt * maxOpacity;
  });

  if (type === "none") return null;

  const bg = type === "rainbow" ? rainbowBg : type === "gold" ? goldBg : auroraBg;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-[20] rounded-[1.45rem]"
      style={{ background: bg, mixBlendMode: "screen", opacity: holoOpacity }}
    />
  );
};

// =========================================================================
// 홀로 광택 스팟 — 마우스 위치에 따른 빛 반사 (기울임 연동)
// =========================================================================
const HoloShine = ({
  mouseX, mouseY,
}: {
  mouseX: ReturnType<typeof useMotionValue<number>>;
  mouseY: ReturnType<typeof useMotionValue<number>>;
}) => {
  type MV = ReturnType<typeof useMotionValue<number>>;
  const inputs = [mouseX, mouseY] as MV[];

  const shineBg = useTransform(inputs, (latest: number[]) => {
    const [mx, my] = latest;
    const px = mx * 100;
    const py = my * 100;
    return `radial-gradient(ellipse 55% 38% at ${px}% ${py}%, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.1) 35%, transparent 65%)`;
  });

  const shineOpacity = useTransform(inputs, (latest: number[]) => {
    const [mx, my] = latest;
    const dx = mx - 0.5;
    const dy = my - 0.5;
    const tilt = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2.0);
    const smoothTilt = tilt * tilt * (3 - 2 * tilt);
    return Math.min(0.6, smoothTilt * 0.8);
  });

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-[22] rounded-[1.45rem]"
      style={{ background: shineBg, opacity: shineOpacity, mixBlendMode: "screen" }}
    />
  );
};

// =========================================================================
// 포일 텍스처 — 등급별 상이한 패턴, 항상 은은하게 깔림
// =========================================================================
const FoilTexture = ({ type }: { type: "prismatic" | "brushed" | "crystal" }) => {
  const patternStyle: React.CSSProperties = (() => {
    if (type === "prismatic") {
      // SSS: 양방향 교차 대각선 → 다이아몬드 격자
      return {
        backgroundImage: [
          "repeating-linear-gradient(-45deg, transparent 0px, transparent 2px, rgba(255,255,255,0.028) 2px, rgba(255,255,255,0.028) 3px)",
          "repeating-linear-gradient(45deg,  transparent 0px, transparent 2px, rgba(255,255,255,0.018) 2px, rgba(255,255,255,0.018) 3px)",
        ].join(", "),
      };
    }
    if (type === "brushed") {
      // SS: 넓은 대각선 → 브러쉬드 금속 질감
      return {
        backgroundImage: "repeating-linear-gradient(-45deg, transparent 0px, transparent 5px, rgba(255,255,255,0.032) 5px, rgba(255,255,255,0.032) 8px)",
      };
    }
    // S: 수평선 → 오로라/크리스탈 수평 밴딩
    return {
      backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.025) 3px, rgba(255,255,255,0.025) 4px)",
    };
  })();

  return (
    <div
      className="absolute inset-0 pointer-events-none z-[18] rounded-[1.45rem]"
      style={{ ...patternStyle, mixBlendMode: "screen" }}
    />
  );
};

// =========================================================================
// 등급별 홀로 문양 — 기울임 연동, 등급 전용 기하 패턴
// =========================================================================
const HoloPattern = ({
  type, mouseX, mouseY,
}: {
  type: "stars" | "diamonds" | "waves";
  mouseX: ReturnType<typeof useMotionValue<number>>;
  mouseY: ReturnType<typeof useMotionValue<number>>;
}) => {
  type MV = ReturnType<typeof useMotionValue<number>>;
  const inputs = [mouseX, mouseY] as MV[];

  const patternOpacity = useTransform(inputs, (latest: number[]) => {
    const [mx, my] = latest;
    const dx = mx - 0.5;
    const dy = my - 0.5;
    const tilt = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2.0);
    const smoothTilt = tilt * tilt * (3 - 2 * tilt);
    return smoothTilt * 0.35;
  });

  const patternStyle: React.CSSProperties = (() => {
    if (type === "stars") {
      // SSS: 점 격자 — 성운/별자리 느낌
      return {
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
      };
    }
    if (type === "diamonds") {
      // SS: 다이아몬드 격자 — 보석/골드 느낌
      return {
        backgroundImage: [
          "linear-gradient(45deg,  rgba(255,220,80,0.4) 25%, transparent 25%)",
          "linear-gradient(-45deg, rgba(255,220,80,0.4) 25%, transparent 25%)",
          "linear-gradient(45deg,  transparent 75%, rgba(255,220,80,0.4) 75%)",
          "linear-gradient(-45deg, transparent 75%, rgba(255,220,80,0.4) 75%)",
        ].join(", "),
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
      };
    }
    // S: 이중 수평 물결선 — 오로라 파동 느낌
    return {
      backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 6px, rgba(80,220,180,0.3) 6px, rgba(80,220,180,0.3) 7px, transparent 7px, transparent 14px, rgba(120,180,255,0.2) 14px, rgba(120,180,255,0.2) 15px)",
    };
  })();

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-[19] rounded-[1.45rem]"
      style={{ ...patternStyle, opacity: patternOpacity, mixBlendMode: "screen" }}
    />
  );
};

// =========================================================================
// 스파클 레이어 (SSS 전용) — 항상 애니메이션, 자이로·마우스 무관
// =========================================================================
const SparkleLayer = () => (
  <div className="absolute inset-0 pointer-events-none z-[25] overflow-hidden rounded-[1.45rem]">
    {SPARKLES.map((s, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size * 2, height: s.size * 2 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0] }}
        transition={{ repeat: Infinity, duration: 1.2 + s.delay * 0.4, delay: s.delay, ease: "easeInOut" }}
      >
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
    width: 22, height: 22,
    top:    pos.startsWith("t") ? 9 : undefined,
    bottom: pos.startsWith("b") ? 9 : undefined,
    left:   pos.endsWith("l")   ? 9 : undefined,
    right:  pos.endsWith("r")   ? 9 : undefined,
    transform: { tl: "rotate(0deg)", tr: "rotate(90deg)", br: "rotate(180deg)", bl: "rotate(270deg)" }[pos],
    pointerEvents: "none",
    zIndex: 10,
  };
  return (
    <div style={style}>
      <svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 20 L2 2 L20 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="2" cy="2" r="2.2" fill={color} />
        <circle cx="20" cy="2" r="1.1" fill={color} opacity="0.45" />
        <circle cx="2" cy="20" r="1.1" fill={color} opacity="0.45" />
        <path d="M7 2 L2 2 L2 7" stroke={color} strokeWidth="0.6" opacity="0.35" strokeLinecap="round" />
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
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const nextId     = useRef<number>(0);
  const prevAward  = useRef<number>(stockXpProfile?.awardCount ?? 0);
  const clearTimer = useRef<number | null>(null);
  const cardRef    = useRef<HTMLDivElement>(null);

  // gyro 상태 — ref 로 관리해 handler 재생성 없이 참조
  const isFlippedRef  = useRef(false);
  const gyroActiveRef = useRef(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  // 자이로 jitter 완화를 위해 spring 적용
  const rawRotX = useTransform(mouseY, [0, 1], [12, -12]);
  const rawRotY = useTransform(mouseX, [0, 1], [-12, 12]);
  const rotateX = useSpring(rawRotX, { stiffness: 150, damping: 28 });
  const rotateY = useSpring(rawRotY, { stiffness: 150, damping: 28 });

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

  // isFlippedRef 동기화 — 자이로 핸들러에서 클로저 없이 참조
  useEffect(() => { isFlippedRef.current = isFlipped; }, [isFlipped]);

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

  // ── 자이로스코프 핸들러 공유 ref ──
  const gyroHandlerRef = useRef<(e: DeviceOrientationEvent) => void>(() => {});
  useEffect(() => {
    gyroHandlerRef.current = (e: DeviceOrientationEvent) => {
      if (isFlippedRef.current) return;
      const gamma = e.gamma ?? 0; // 좌우 기울기 -90~90
      const beta  = e.beta  ?? 0; // 앞뒤 기울기 -180~180
      // gamma: ±25° 범위, beta: 40~90° 범위를 0~1 로 정규화
      mouseX.set(Math.max(0, Math.min(1, (gamma + 25) / 50)));
      mouseY.set(Math.max(0, Math.min(1, (beta  - 40) / 50)));
      gyroActiveRef.current = true;
    };
  }, [mouseX, mouseY]);

  // Android / 비iOS: 마운트 시 바로 등록
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const needsPermission =
      typeof (DeviceOrientationEvent as any).requestPermission === 'function';
    if (needsPermission) return; // iOS는 handleCardClick 에서 처리
    const handler = (e: DeviceOrientationEvent) => gyroHandlerRef.current(e);
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
  }, []);

  // 카드 클릭 — iOS 권한 요청 + 뒤집기
  const handleCardClick = useCallback(async () => {
    if (
      typeof window !== 'undefined' &&
      typeof (DeviceOrientationEvent as any).requestPermission === 'function' &&
      !gyroActiveRef.current
    ) {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          const handler = (e: DeviceOrientationEvent) => gyroHandlerRef.current(e);
          window.addEventListener('deviceorientation', handler, true);
        }
      } catch (_) { /* 사용자가 거부하거나 비지원 */ }
    }
    // 플립 전 틸트를 센터로 리셋 — 뒷면이 기울어진 채로 나타나지 않도록
    mouseX.set(0.5);
    mouseY.set(0.5);
    setIsFlipped(p => !p);
  }, [mouseX, mouseY]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // 자이로가 활성화된 기기에서는 마우스 이벤트 무시
    if (!cardRef.current || isFlipped || gyroActiveRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - r.left) / r.width);
    mouseY.set((e.clientY - r.top)  / r.height);
  }, [mouseX, mouseY, isFlipped]);

  const handleMouseLeave = useCallback(() => {
    // 자이로 활성 시 센터 리셋 생략 (기울기가 계속 구동)
    if (!gyroActiveRef.current) {
      mouseX.set(0.5);
      mouseY.set(0.5);
    }
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
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
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
              className="font-mono font-black text-xs px-3 py-1 rounded-full shadow-lg bg-neutral-900/90 text-emerald-400 border border-white/10 backdrop-blur-sm whitespace-nowrap"
            >
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 틸트 래퍼 — 마우스(데스크톱) / 자이로(모바일) 기반 3D 기울기 */}
      <motion.div
        className="w-full h-full"
        style={{
          rotateX: isFlipped ? 0 : rotateX,
          rotateY: isFlipped ? 0 : rotateY,
          transformStyle: "preserve-3d",
        }}
      >
      {/* 플립 래퍼 — animate 로만 Y 회전 제어 (틸트와 충돌 없음) */}
      <motion.div
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 24, mass: 1.0 }}
        className="w-full h-full relative transform-gpu"
      >

        {/* ════════════════ FRONT ════════════════ */}
        <div
          className={cn("absolute inset-0 rounded-[1.75rem] p-[4px]", cfg.glow)}
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

            {/* 홀로그래픽 레이어 (포일 텍스처 + 등급 문양 + 그라디언트 + 광택 스팟) */}
            {cfg.holo && (
              <>
                <FoilTexture
                  type={cfg.holoType === "rainbow" ? "prismatic" : cfg.holoType === "gold" ? "brushed" : "crystal"}
                />
                <HoloPattern
                  type={cfg.holoType === "rainbow" ? "stars" : cfg.holoType === "gold" ? "diamonds" : "waves"}
                  mouseX={mouseX}
                  mouseY={mouseY}
                />
                <HoloOverlay type={cfg.holoType} mouseX={mouseX} mouseY={mouseY} />
                <HoloShine mouseX={mouseX} mouseY={mouseY} />
              </>
            )}

            {/* 스파클 (SSS) */}
            {grade === "SSS" && <SparkleLayer />}

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
                  cfg.darkCard ? "text-white/30" : "text-neutral-400 dark:text-neutral-500"
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

              {/* 카드 번호 */}
              <div className={cn(
                "absolute bottom-2 left-2 z-20 text-[7px] font-mono font-bold tracking-wider",
                cfg.darkCard ? "text-white/20" : "text-black/20"
              )}>
                IDQ·{stock?.ticker}
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
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.darkCard ? "bg-white/30" : "bg-neutral-400/60")} />
                <span className={cn("text-[8px] font-black uppercase tracking-[0.15em] font-mono", cfg.typeText)}>
                  {cfg.label}
                </span>
              </div>
              <span className={cn("text-[7px] font-bold font-mono uppercase tracking-wider", cfg.darkCard ? "text-white/25" : "text-neutral-400")}>
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
          className="absolute inset-0 rounded-[1.75rem] bg-white dark:bg-[#1a1915] flex flex-col shadow-xl overflow-hidden"
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
          <div className="absolute inset-0 rounded-[1.75rem] border-2 border-neutral-200 dark:border-[#35332e] pointer-events-none" />

          <div className="relative flex flex-col gap-2.5 p-3.5 h-full overflow-y-auto">

            {/* ── 등급 섹션 ── */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck size={10} className="text-neutral-400" />
                <span className="text-[8px] font-black uppercase tracking-widest font-mono text-neutral-400">등급 분석</span>
              </div>

              {/* 현재 등급 설명 박스 */}
              {(() => {
                const meta = GRADE_META[grade] ?? GRADE_META.B;
                return (
                  <div className="flex gap-2.5 p-2.5 rounded-xl bg-[#faf9f7] dark:bg-[#242320]/60 border border-neutral-200/70 dark:border-[#35332e]/70 mb-2">
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
                      <p className="text-[8.5px] text-neutral-600 dark:text-neutral-400 leading-relaxed">{meta.desc}</p>
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
                    <span className="text-[6.5px] font-mono font-bold text-neutral-500 mt-0.5 tabular-nums">{crit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-neutral-200 dark:border-[#35332e]" />

            {/* ── 레벨 섹션 ── */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Award size={10} className="text-neutral-400" />
                <span className="text-[8px] font-black uppercase tracking-widest font-mono text-neutral-400">카드 레벨</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-900 dark:bg-[#1a1915] border border-neutral-800">
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
                <p className="text-[8.5px] text-neutral-400 leading-relaxed mb-2">{tier.desc}</p>

                {/* XP 바 */}
                <div className="flex justify-between text-[7px] font-mono font-bold text-neutral-600 mb-1">
                  <span>XP 진행도</span>
                  <span className="tabular-nums">{xp} / {maxXp}</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50 mb-2">
                  <motion.div
                    className={cn("h-full bg-gradient-to-r rounded-full", cfg.xpFrom, cfg.xpTo)}
                    animate={{ width: `${(xp / maxXp) * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>

                {/* 다음 티어 */}
                {tier.next ? (
                  <div className="flex items-center gap-1 pt-1.5 border-t border-neutral-800">
                    <TrendingUp size={8} className="text-neutral-600 shrink-0" />
                    <p className="text-[7px] text-neutral-600 font-mono">
                      <span className="text-neutral-500 font-bold">Lv.{tier.nextLevel}</span> 도달 시{" "}
                      <span className="text-neutral-400 font-bold">{tier.next}</span> 승격
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 pt-1.5 border-t border-neutral-800">
                    <span className="text-[7px] text-neutral-600 font-mono">✦ 최고 티어 달성</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 푸터 ── */}
            <div className="mt-auto pt-2 border-t border-neutral-200 dark:border-[#35332e] flex items-center justify-center gap-1.5 shrink-0">
              {stock?.isUs ? <DollarSign size={9} className="text-sky-400" /> : <Coins size={9} className="text-indigo-400" />}
              <span className="text-[7px] font-black text-neutral-300 dark:text-neutral-700 tracking-[0.2em] uppercase font-mono">
                {stock?.isUs ? "Finnhub · IdiotQuant" : "Korea Investment · IdiotQuant"}
              </span>
            </div>

          </div>
        </div>
      </motion.div>
      </motion.div>
    </div>
  );
};
