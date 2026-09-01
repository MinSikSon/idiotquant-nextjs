"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, HelpCircle } from "lucide-react";
import LineChart from "@/components/LineChart";
import { CopyStockButtons } from "@/components/copyStockButtons";

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
    cut:        "≥ +200%",
    chartColor: "#a855f7",
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
    cut:        "≥ +150%",
    chartColor: "#f59e0b",
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
    cut:        "≥ +100%",
    chartColor: "#16a34a",
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
    cut:        "≥ +50%",
    chartColor: "#64748b",
  },
  B: {
    border:     "#a1a1aa",
    topBarCls:  "bg-gradient-to-r from-neutral-400 to-neutral-300",
    badgeCls:   "bg-neutral-200 text-neutral-700 dark:bg-surface-dark-elevated dark:text-neutral-200",
    labelCls:   "text-neutral-500 dark:text-neutral-400",
    tintCls:    "from-neutral-50/30 dark:from-neutral-900/10",
    dotCls:     "bg-neutral-400",
    label:      "FAIR VALUE",
    desc:       "업사이드 ≥ 0% — 공정 가치 구간",
    cut:        "≥ 0%",
    chartColor: "#a1a1aa",
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
    cut:        "< 0%",
    chartColor: "#ef4444",
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
  /** 등급 배지를 눌렀나. 이 등급이 **어떻게 나온 값인지**를 그 자리에서 펼친다. */
  const [gradeOpen, setGradeOpen] = useState(false);

  const gradeRaw  = stock?.grade;
  const grade     = (gradeRaw && typeof gradeRaw === "object"
    ? String((gradeRaw as any).grade || "B")
    : String(gradeRaw || "B")) as GradeKey;
  // 재무를 못 읽으면 등급이 "N/A" 로 온다. 그때 B 의 기준을 펼치면 거짓말이 된다.
  const gradeKnown = Object.prototype.hasOwnProperty.call(GRADE_CONFIG, grade);
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

  // 지표 설명에 계산식을 적는다 — 이름만으로는 초보자가 판단할 수 없다.
  // 색은 기준 충족 시에만 초록, 아니면 중립.
  // NCAV는 배수(순유동자산/시가총액)로 적는다. 업사이드 %는 위 가격 배지에 이미 있다.
  const NEUTRAL = "text-neutral-800 dark:text-neutral-200";
  const GOOD = "text-emerald-600 dark:text-emerald-400";
  const ncavMultiple = stock?.ncavMultiple ?? null;
  const roe = stock?.roe ?? null;
  const per = Number(stock?.per ?? 0);
  const pbr = Number(stock?.pbr ?? 0);

  const statsRow = [
    {
      label: "NCAV 배수",
      value: ncavMultiple !== null ? `${ncavMultiple.toFixed(2)}x` : "—",
      desc: "순유동자산 / 시가총액",
      colorCls: ncavMultiple !== null && ncavMultiple >= 1 ? GOOD : NEUTRAL,
    },
    {
      label: "PBR",
      value: pbr > 0 ? `${pbr.toFixed(2)}x` : "—",
      desc: "주가 / 순자산",
      colorCls: pbr > 0 && pbr < 1 ? GOOD : NEUTRAL,
    },
    {
      label: "PER",
      value: per > 0 ? `${per.toFixed(1)}x` : "—",
      desc: "주가 / 순이익",
      colorCls: per > 0 && per < 10 ? GOOD : NEUTRAL,
    },
    {
      label: "ROE",
      value: roe !== null ? `${roe.toFixed(1)}%` : "—",
      desc: "순이익 / 자본",
      colorCls: roe === null ? NEUTRAL : roe >= 10 ? GOOD : roe < 0 ? "text-rose-600 dark:text-rose-400" : NEUTRAL,
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden shadow-sm">

      {/* ── 등급 컬러 상단 바 (3px) ── */}
      <div className={cn("h-[3px] w-full", cfg.topBarCls)} />

      {/* ── 메인 정보 ── 좁은 화면에서는 카드 자신의 여백도 한 칸 줄인다. 페이지 여백과
           겹쳐 글이 시작되는 자리가 화면 폭의 10분의 1을 넘어가면 그만큼 값이 잘린다. */}
      <div className={cn("p-4 sm:p-5 bg-gradient-to-br to-transparent", cfg.tintCls)}>

        {/* 로고 + 종목명 + 등급 */}
        <div className="flex items-center gap-4">
          {/* 로고 */}
          <div className="relative w-[56px] h-[56px] rounded-2xl border border-neutral-100 dark:border-border-subtle-dark bg-white dark:bg-white shrink-0 flex items-center justify-center overflow-hidden">
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
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-100 text-neutral-600 dark:bg-surface-dark-muted dark:text-neutral-300">
                      {sector}
                    </span>
                  )}
                </div>
              </div>
              {/* 등급 배지 — **누르면 이 등급이 어떻게 나왔는지**가 아래에 펼쳐진다.
                  등급만 크게 띄워 놓고 기준을 어디에도 안 적으면, 읽는 사람은 그 글자를
                  믿거나 무시하거나 둘 중 하나만 할 수 있다. */}
              <button
                type="button"
                onClick={() => setGradeOpen(o => !o)}
                aria-expanded={gradeOpen}
                aria-label="등급 산정 기준 보기"
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] font-black font-mono shrink-0 shadow-sm transition-opacity hover:opacity-90",
                  cfg.badgeCls
                )}
              >
                {grade}
                <HelpCircle size={11} className="opacity-80" />
              </button>
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
        <div className="mt-4 flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-neutral-200/70 dark:border-border-subtle-dark/70 bg-white/60 dark:bg-surface-dark-canvas/50">
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dotCls)} />
          <span className={cn("text-[9px] font-black uppercase tracking-[0.15em] font-mono shrink-0", cfg.labelCls)}>
            {cfg.label}
          </span>
          <span className="text-neutral-300 dark:text-[#35332e] shrink-0">·</span>
          <span className="text-[9px] text-neutral-500 dark:text-neutral-400 leading-tight">
            {cfg.desc}
          </span>
        </div>

        {/* ── 등급 산정 기준 (배지를 눌렀을 때) ──
            등급은 **하나의 값**으로 정해진다: NCAV 업사이드. 그 계산식과 잘린 자리를
            같이 보여야 "왜 이 등급인가" 가 끝난다. 값을 여기서 다시 계산하지 않는다 —
            배지에 쓴 업사이드(ncavScore)를 그대로 견준다. */}
        {gradeOpen && (
          <div className="mt-2 rounded-xl border border-neutral-200/70 dark:border-border-subtle-dark/70 bg-white/70 dark:bg-surface-dark-canvas/60 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400 dark:text-neutral-500">
              등급 산정 기준
            </p>

            {gradeKnown ? (
              <>
                <p className="mt-1.5 text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed break-keep">
                  업사이드 = (순유동자산 − 총부채) ÷ 발행주식수 ÷ 현재가 − 1
                </p>
                <p className="mt-1 text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed break-keep">
                  이 종목은{" "}
                  <span className={cn("font-black font-mono tabular-nums", isUp ? "text-[#15803d] dark:text-[#16a34a]" : "text-red-600 dark:text-red-400")}>
                    {isUp ? "+" : ""}{ncavUpside.toFixed(1)}%
                  </span>
                  {" "}라서 <span className="font-black">{grade}</span> 입니다.
                </p>

                <div className="mt-2.5 flex flex-col gap-px overflow-hidden rounded-lg border border-neutral-200/70 dark:border-border-subtle-dark/70">
                  {(Object.keys(GRADE_CONFIG) as GradeKey[]).map(g => (
                    <div
                      key={g}
                      className={cn(
                        "flex items-center gap-2 px-2.5 py-1.5 text-[10.5px]",
                        g === grade
                          ? "bg-neutral-100 dark:bg-surface-dark-muted"
                          : "bg-white/70 dark:bg-surface-dark-card/50",
                      )}
                    >
                      <span className={cn(
                        "w-8 shrink-0 font-black font-mono",
                        g === grade ? "text-neutral-900 dark:text-white" : "text-neutral-400 dark:text-neutral-500",
                      )}>
                        {g}
                      </span>
                      <span className={cn(
                        "w-16 shrink-0 font-mono tabular-nums",
                        g === grade ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400 dark:text-neutral-500",
                      )}>
                        {GRADE_CONFIG[g].cut}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-neutral-400 dark:text-neutral-500">
                        {GRADE_CONFIG[g].label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 등급이 무엇을 안 보는지까지 적는다 — 안 적으면 "좋은 회사" 로 읽힌다 */}
                <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-500 leading-relaxed break-keep">
                  자산가치(그레이엄 NCAV) 하나만 봅니다. 수익성·성장·상장폐지 위험은 이 등급에
                  들어가지 않으니 아래 지표와 함께 보세요.
                </p>
              </>
            ) : (
              <p className="mt-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep">
                재무 데이터를 읽지 못해 등급을 매기지 못했습니다. 등급은 순유동자산 기준
                업사이드로 정해지는데, 그 값을 계산할 재무제표가 없습니다.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── 미니 차트 ── */}
      {hasChart ? (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity size={9} className="text-neutral-400" />
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">가격 추이</p>
          </div>
          <div className="h-[68px] rounded-xl overflow-hidden border border-neutral-100 dark:border-border-subtle-dark bg-surface-canvas dark:bg-surface-dark-canvas">
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

      {/* ── 핵심 지표 ── gap-px + 셀 배경으로 구분선을 그린다. 2열로 접혀도 선이 어긋나지 않는다. */}
      <div className="border-t border-neutral-100 dark:border-border-subtle-dark grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-100 dark:bg-surface-dark-muted">
        {statsRow.map(({ label, value, desc, colorCls }) => (
          <div key={label} className="bg-white dark:bg-surface-dark-card px-4 py-3.5 flex flex-col gap-1">
            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
            <p className={cn("text-[17px] font-black font-mono tabular-nums leading-none", colorCls)}>
              {value}
            </p>
            <p className="text-[9.5px] text-neutral-400">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── 복사 ── 카드가 이미 종목명·티커·지표를 다 들고 있어 복사 대상도 여기서 만든다 */}
      <div className="border-t border-neutral-100 dark:border-border-subtle-dark px-4 py-2 flex items-center justify-end gap-2">
        <span className="text-[11px] text-neutral-400 font-medium">복사</span>
        <CopyStockButtons rows={[{
          name: stock?.name,
          ticker: stock?.ticker || stock?.code,
          pbr: stock?.pbr,
          per: stock?.per,
        }]} />
      </div>
    </div>
  );
};
