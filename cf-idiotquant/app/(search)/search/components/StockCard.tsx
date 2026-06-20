"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react";
import LineChart from "@/components/LineChart";

// =========================================================================
// 등급별 스타일 설정
// =========================================================================
const GRADE_CONFIG = {
  SSS: {
    border:     "#a855f7",
    topBarCls:  "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400",
    badgeCls:   "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white",
    labelCls:   "text-purple-600 dark:text-purple-400",
    tintCls:    "from-purple-50/50 via-pink-50/20 dark:from-purple-950/15 dark:via-pink-950/8",
    dotCls:     "bg-gradient-to-r from-pink-500 to-purple-500",
    label:      "PREMIUM NET-NET",
    desc:       "업사이드 ≥ +200% — 그레이엄 최고 등급",
    chartColor: "#a855f7",
    ncavPosCls: "text-purple-600 dark:text-purple-400",
  },
  SS: {
    border:     "#f59e0b",
    topBarCls:  "bg-gradient-to-r from-amber-400 to-yellow-300",
    badgeCls:   "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950",
    labelCls:   "text-amber-600 dark:text-amber-400",
    tintCls:    "from-amber-50/50 via-yellow-50/20 dark:from-amber-950/15 dark:via-yellow-950/8",
    dotCls:     "bg-amber-500",
    label:      "DEEP VALUE ALPHA",
    desc:       "업사이드 ≥ +150% — 강력한 안전마진",
    chartColor: "#f59e0b",
    ncavPosCls: "text-amber-600 dark:text-amber-400",
  },
  S: {
    border:     "#16a34a",
    topBarCls:  "bg-gradient-to-r from-emerald-500 to-teal-400",
    badgeCls:   "bg-gradient-to-r from-[#16a34a] to-teal-500 text-white",
    labelCls:   "text-[#16a34a] dark:text-emerald-400",
    tintCls:    "from-green-50/50 via-emerald-50/20 dark:from-green-950/15 dark:via-emerald-950/8",
    dotCls:     "bg-[#16a34a]",
    label:      "DEEP VALUE",
    desc:       "업사이드 ≥ +100% — 그레이엄 기준 충족",
    chartColor: "#16a34a",
    ncavPosCls: "text-[#16a34a] dark:text-emerald-400",
  },
  A: {
    border:     "#64748b",
    topBarCls:  "bg-gradient-to-r from-slate-400 to-slate-500",
    badgeCls:   "bg-gradient-to-r from-slate-500 to-slate-400 text-white",
    labelCls:   "text-slate-600 dark:text-slate-400",
    tintCls:    "from-slate-50/40 dark:from-slate-950/10",
    dotCls:     "bg-slate-400",
    label:      "STABLE ASSET",
    desc:       "업사이드 ≥ +50% — 안전마진 존재",
    chartColor: "#64748b",
    ncavPosCls: "text-[#16a34a] dark:text-[#16a34a]",
  },
  B: {
    border:     "#a1a1aa",
    topBarCls:  "bg-gradient-to-r from-neutral-400 to-neutral-300",
    badgeCls:   "bg-neutral-200 text-neutral-700 dark:bg-[#4a4641] dark:text-neutral-200",
    labelCls:   "text-neutral-500 dark:text-neutral-400",
    tintCls:    "from-neutral-50/30 dark:from-neutral-900/10",
    dotCls:     "bg-neutral-400",
    label:      "FAIR VALUE",
    desc:       "업사이드 ≥ 0% — 공정 가치 구간",
    chartColor: "#a1a1aa",
    ncavPosCls: "text-[#16a34a] dark:text-[#16a34a]",
  },
  F: {
    border:     "#ef4444",
    topBarCls:  "bg-gradient-to-r from-red-500 to-rose-400",
    badgeCls:   "bg-gradient-to-r from-red-500 to-rose-400 text-white",
    labelCls:   "text-red-600 dark:text-red-400",
    tintCls:    "from-red-50/40 dark:from-red-950/12",
    dotCls:     "bg-red-500",
    label:      "OVERVALUED",
    desc:       "업사이드 < 0% — 고평가 가능성",
    chartColor: "#ef4444",
    ncavPosCls: "text-red-600 dark:text-red-400",
  },
} as const;

type GradeKey = keyof typeof GRADE_CONFIG;
const DEFAULT_CFG = GRADE_CONFIG.B;

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
  chartNotice?: 'suspended' | 'delisted';
  rawData?: any;
  isCompact?: boolean;
  stockXpProfile?: StockXpProfile;
}

// =========================================================================
// StockCard
// =========================================================================
export const StockCard = ({ stock, chartConfig, chartNotice }: StockCardProps) => {
  const [imgError, setImgError] = useState(false);

  const gradeRaw  = stock?.grade;
  const grade     = (gradeRaw && typeof gradeRaw === "object"
    ? String((gradeRaw as any).grade || "B")
    : String(gradeRaw || "B")) as GradeKey;
  const cfg       = GRADE_CONFIG[grade] ?? DEFAULT_CFG;

  const ncavUpside  = Number(stock?.ncavScore ?? 0);
  const isUp        = ncavUpside >= 0;
  const currency    = stock?.isUs ? "$" : "₩";
  const market      = stock?.market || (stock?.isUs ? "NYSE/NASDAQ" : "KRX");
  const sector      = !stock?.isUs && stock?.sector && stock.sector !== "DEFAULT" ? stock.sector : null;

  const logoUrl = stock?.isUs
    ? `https://img.logo.dev/ticker/${stock.ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
    : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${stock.ticker}`;

  const hasChart = chartConfig?.data?.length > 0;

  const statsRow = [
    {
      label: "PER",
      value: stock?.per ? `${stock.per}x` : "—",
      colorCls: "",
    },
    {
      label: "PBR",
      value: stock?.pbr ? `${stock.pbr}x` : "—",
      colorCls: "",
    },
    {
      label: "NCAV",
      value: `${isUp ? "+" : ""}${ncavUpside.toFixed(1)}%`,
      colorCls: isUp ? cfg.ncavPosCls : "text-red-600 dark:text-red-400",
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden shadow-sm">

      {/* ── 등급 컬러 상단 바 (3px) ── */}
      <div className={cn("h-[3px] w-full", cfg.topBarCls)} />

      {/* ── 메인 정보 ── */}
      <div className={cn("p-5 bg-gradient-to-br to-transparent", cfg.tintCls)}>

        {/* 로고 + 종목명 + 등급 */}
        <div className="flex items-center gap-4">
          {/* 로고 */}
          <div className="relative w-[56px] h-[56px] rounded-2xl border border-neutral-100 dark:border-[#35332e] bg-white dark:bg-white shrink-0 flex items-center justify-center overflow-hidden">
            {!imgError ? (
              <Image
                key={stock?.ticker}
                src={logoUrl}
                alt={stock?.name ?? "logo"}
                fill
                className="object-contain p-2"
                unoptimized
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-[18px] font-black text-neutral-600 dark:text-neutral-300 leading-none">
                {(stock?.name ?? stock?.ticker ?? "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* 텍스트 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-black text-neutral-900 dark:text-white text-[15px] leading-snug line-clamp-2">
                  {stock?.name}
                </h2>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <p className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 truncate">
                    {stock?.ticker} · {market}
                  </p>
                  {sector && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-100 text-neutral-600 dark:bg-[#35332e] dark:text-neutral-300">
                      {sector}
                    </span>
                  )}
                </div>
              </div>
              {/* 등급 배지 */}
              <span className={cn(
                "px-2.5 py-1 rounded-lg text-[13px] font-black font-mono shrink-0 shadow-sm",
                cfg.badgeCls
              )}>
                {grade}
              </span>
            </div>

            {/* 가격 + 업사이드 */}
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-xl font-black font-mono tabular-nums text-neutral-900 dark:text-white leading-none">
                {currency}{String(stock?.curPrice ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border",
                isUp
                  ? "bg-green-50 dark:bg-[#052e16]/30 border-green-200 dark:border-[#16a34a]/20 text-[#15803d] dark:text-[#16a34a]"
                  : "bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40 text-red-600 dark:text-red-400"
              )}>
                {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                {isUp ? "+" : ""}{ncavUpside.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* ── 등급 레이블 스트립 ── */}
        <div className="mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-neutral-200/70 dark:border-[#35332e]/70 bg-white/60 dark:bg-[#1a1915]/50">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotCls)} />
          <span className={cn("text-[9px] font-black uppercase tracking-[0.15em] font-mono shrink-0", cfg.labelCls)}>
            {cfg.label}
          </span>
          <span className="text-neutral-300 dark:text-[#35332e] shrink-0">·</span>
          <span className="text-[9px] text-neutral-500 dark:text-neutral-400 leading-tight">
            {cfg.desc}
          </span>
        </div>
      </div>

      {/* ── 미니 차트 ── */}
      {hasChart ? (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity size={9} className="text-neutral-400" />
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">가격 추이</p>
          </div>
          <div className="h-[68px] rounded-xl overflow-hidden border border-neutral-100 dark:border-[#35332e] bg-[#faf9f7] dark:bg-[#1a1915]">
            <LineChart
              data_array={[{ name: "P", data: chartConfig.data, color: cfg.chartColor }]}
              category_array={chartConfig.categories}
              height={68}
              show_yaxis_label={false}
              legend_disable
            />
          </div>
        </div>
      ) : chartNotice ? (
        <div className="px-5 pb-4">
          <div className={cn(
            "flex items-start gap-2 px-3 py-2.5 rounded-xl border",
            chartNotice === 'delisted'
              ? "border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20"
              : "border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20"
          )}>
            <AlertTriangle size={12} className={cn("shrink-0 mt-0.5", chartNotice === 'delisted' ? "text-red-500" : "text-amber-500")} />
            <p className={cn("text-[10px] font-medium leading-relaxed", chartNotice === 'delisted' ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
              {chartNotice === 'suspended'
                ? "거래정지된 종목입니다. 가격 추이를 제공할 수 없습니다."
                : "상장폐지된 종목입니다. 가격 추이를 제공할 수 없습니다."}
            </p>
          </div>
        </div>
      ) : null}

      {/* ── 통계 행 ── */}
      <div className="border-t border-neutral-100 dark:border-[#35332e] grid grid-cols-3 divide-x divide-neutral-100 dark:divide-[#35332e]">
        {statsRow.map(({ label, value, colorCls }) => (
          <div key={label} className="py-3 flex flex-col items-center gap-0.5">
            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
            <p className={cn(
              "text-[13px] font-black font-mono tabular-nums",
              colorCls || "text-neutral-800 dark:text-neutral-200"
            )}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
