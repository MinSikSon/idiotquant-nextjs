"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search, Calculator, Filter, Lock, ArrowRight,
  TrendingUp, ChevronRight, BarChart3, Zap, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/utils/numbers";
import { STRATEGY_PRESETS_CLIENT, STRATEGY_BADGE, type StrategyPreset } from "@/lib/constants/strategies";

interface PreviewStock {
  ticker: string;
  name: string;
  ncav_ratio: number;
  pbr: number;
  per: number;
  eps: number;
  bps: number;
  strategies: string[];
  market_cap?: number;
}

// 전략별 "핵심 지표" — 그 전략이 보는 지표와 기준 충족 여부. 종목이 설명에 얼마나 부합하는지 표시.
interface StrategyMetric {
  label: string;
  get: (i: PreviewStock) => number;   // 표시값 (0 이하 = 데이터 없음)
  ok: (v: number) => boolean;         // 전략 기준 충족 여부
  fmt: (v: number) => string;
}

// ROE = EPS / BPS × 100 — 스크리너 전략 필터(clientFilter)와 동일한 계산식
const roePct = (i: PreviewStock) => safeNum(i.bps) > 0 ? safeNum(i.eps) / safeNum(i.bps) * 100 : 0;

const STRATEGY_METRICS: Record<string, StrategyMetric[]> = {
  ncav:           [{ label: "NCAV",    get: i => safeNum(i.ncav_ratio), ok: v => v >= 1.0,            fmt: v => `${v.toFixed(2)}x` }],
  near_ncav:      [{ label: "NCAV",    get: i => safeNum(i.ncav_ratio), ok: v => v >= 0.7 && v < 1.0, fmt: v => `${v.toFixed(2)}x` }],
  low_pbr:        [{ label: "PBR",     get: i => safeNum(i.pbr),        ok: v => v > 0 && v < 0.5,    fmt: v => v.toFixed(2) }],
  low_per:        [{ label: "PER",     get: i => safeNum(i.per),        ok: v => v > 0 && v < 10,     fmt: v => v.toFixed(1) }],
  graham_number:  [{ label: "PER×PBR", get: i => safeNum(i.per) > 0 && safeNum(i.pbr) > 0 ? safeNum(i.per) * safeNum(i.pbr) : 0, ok: v => v > 0 && v < 22.5, fmt: v => v.toFixed(1) }],
  s_rim:          [
    { label: "ROE", get: roePct,            ok: v => v > 8,            fmt: v => `${v.toFixed(1)}%` },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 1.0, fmt: v => v.toFixed(2) },
  ],
  magic_formula:  [
    { label: "PER", get: i => safeNum(i.per), ok: v => v > 0 && v < 15, fmt: v => v.toFixed(1) },
    { label: "ROE", get: roePct,            ok: v => v > 10,           fmt: v => `${v.toFixed(1)}%` },
  ],
  quality_value:  [
    { label: "ROE", get: roePct,            ok: v => v > 15,           fmt: v => `${v.toFixed(1)}%` },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 2.0, fmt: v => v.toFixed(2) },
  ],
  balanced_value: [
    { label: "PER", get: i => safeNum(i.per), ok: v => v > 5 && v < 15,  fmt: v => v.toFixed(1) },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 1.5, fmt: v => v.toFixed(2) },
  ],
};

const NCAV_METRIC: StrategyMetric[] = STRATEGY_METRICS.ncav;

const HOME_MKTCAP_MIN = 500;
const PER_STRATEGY = 2;    // 전략 그룹당 노출 종목 수
const GROUP_PUBLIC = 3;    // 비로그인 시 블러 없이 공개하는 전략 그룹 수

// 전략별 정렬 키 (값이 작을수록 상위). NCAV 계열은 비율이 높을수록 좋으므로 음수.
const STRATEGY_SORT: Record<string, (i: PreviewStock) => number> = {
  ncav:           i => -(i.ncav_ratio ?? 0),
  near_ncav:      i => -(i.ncav_ratio ?? 0),
  low_pbr:        i => i.pbr > 0 ? i.pbr : Infinity,
  s_rim:          i => i.pbr > 0 ? i.pbr : Infinity,
  quality_value:  i => i.pbr > 0 ? i.pbr : Infinity,
  balanced_value: i => i.pbr > 0 ? i.pbr : Infinity,
  graham_number:  i => (i.per > 0 && i.pbr > 0) ? i.per * i.pbr : Infinity,
  low_per:        i => i.per > 0 ? i.per : Infinity,
  magic_formula:  i => i.per > 0 ? i.per : Infinity,
};

const STRATEGY_LABEL: Record<string, string> = {
  ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
  graham_number: "그레이엄", magic_formula: "마법공식",
  quality_value: "퀄리티", near_ncav: "NCAV근접", balanced_value: "균형가치",
};

const STRATEGY_BADGE_CLS: Record<string, string> = {
  ncav:           "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  low_pbr:        "bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#15803d] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/60",
  low_per:        "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/60",
  s_rim:          "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/60",
  graham_number:  "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/60",
  magic_formula:  "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60",
  quality_value:  "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60",
  near_ncav:      "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60",
  balanced_value: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60",
};

const FEATURES = [
  {
    icon: Filter,
    iconCls: "text-[#16a34a] dark:text-[#16a34a]",
    bgCls: "bg-[#f0fdf4] dark:bg-[#052e16]/30",
    title: "종목 발굴",
    link: "/screener",
    linkLabel: "스크리너 열기",
  },
  {
    icon: Search,
    iconCls: "text-violet-600 dark:text-violet-400",
    bgCls: "bg-violet-50 dark:bg-violet-950/30",
    title: "적정주가 분석",
    link: "/analyze",
    linkLabel: "종목 분석하기",
  },
  {
    icon: Calculator,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    bgCls: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "수익 계산기",
    link: "/calculator",
    linkLabel: "계산해보기",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "매일 자동 스캔", accent: "text-[#16a34a]" },
  { step: "02", title: "저평가 종목 발굴", accent: "text-emerald-600 dark:text-emerald-400" },
  { step: "03", title: "적정주가 즉시 확인", accent: "text-violet-600 dark:text-violet-400" },
];

// =========================================================================
// 홈 일러스트 (자체 인라인 SVG · 외부 이미지/요청 없음 · 라이트/다크 대응)
// "투자가 쉽다"는 인상을 글자 대신 이미지로 전달한다.
// =========================================================================
const HERO_LINE = [[50, 150], [88, 133], [122, 139], [158, 108], [194, 119], [228, 83], [252, 71]];

function HeroArt() {
  return (
    <svg viewBox="0 0 340 210" fill="none"
      role="img" aria-label="알고리즘이 저평가 종목을 자동으로 찾아 체크해 주는 모습"
      className="w-full max-w-sm sm:max-w-md mx-auto h-auto text-neutral-300 dark:text-neutral-600">
      <ellipse cx="180" cy="120" rx="150" ry="72" fill="#16a34a" opacity="0.06" />
      <rect x="28" y="40" width="236" height="140" rx="18" fill="#16a34a" opacity="0.05" />
      <rect x="28" y="40" width="236" height="140" rx="18" stroke="currentColor" strokeWidth="2" />
      <path d="M50,150 L88,133 L122,139 L158,108 L194,119 L228,83 L252,71 L252,160 L50,160 Z" fill="#16a34a" opacity="0.12" />
      <path d="M50,150 L88,133 L122,139 L158,108 L194,119 L228,83 L252,71"
        stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {HERO_LINE.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.2" fill="#16a34a" />)}
      <circle cx="278" cy="58" r="30" fill="#16a34a" />
      <path d="M265,58 l9,9 l16,-19" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34,150 l0,-12 M28,144 l12,0" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M300,152 l0,-10 M295,147 l10,0" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="48" cy="58" r="3" fill="#16a34a" opacity="0.6" />
    </svg>
  );
}

// 1단계: 여러 종목 중 좋은 하나를 돋보기로 집어냄
function StepScanArt() {
  const dots = [[14, 14], [26, 14], [38, 14], [14, 26], [26, 26], [38, 26], [14, 38], [26, 38]];
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="currentColor" />)}
      <circle cx="40" cy="40" r="3.2" fill="#16a34a" />
      <circle cx="40" cy="40" r="13" stroke="#16a34a" strokeWidth="3.5" fill="none" />
      <line x1="49" y1="49" x2="57" y2="57" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// 2단계: 많은 후보를 걸러 좋은 종목만 통과 (깔때기 + 체크)
function StepFunnelArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      <circle cx="20" cy="12" r="3" fill="currentColor" />
      <circle cx="32" cy="12" r="3" fill="currentColor" />
      <circle cx="44" cy="12" r="3" fill="currentColor" />
      <path d="M14,22 H50 L38,38 V46 H26 V38 Z" stroke="#16a34a" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="54" r="8" fill="#16a34a" />
      <path d="M28,54 l3,3 l5,-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 3단계: 적정주가(₩) 확인 완료 (체크)
function StepTagArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      <circle cx="28" cy="30" r="16" stroke="currentColor" strokeWidth="2.5" />
      <text x="28" y="36" textAnchor="middle" fontSize="17" fontWeight="800" fill="#16a34a" fontFamily="sans-serif">₩</text>
      <circle cx="46" cy="44" r="9" fill="#16a34a" />
      <path d="M42,44 l3,3 l5,-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STEP_ARTS = [StepScanArt, StepFunnelArt, StepTagArt];

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * ease));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

function StockRow({ item, index, excludeStrategy, metrics }: { item: PreviewStock; index: number; excludeStrategy?: string; metrics: StrategyMetric[] }) {
  const strategies = (item.strategies ?? []).filter(s => s !== excludeStrategy).slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] last:border-0 transition-colors">
      <span className="w-4 text-[10px] font-black text-neutral-300 dark:text-neutral-600 tabular-nums shrink-0">
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <p className="font-semibold text-sm text-neutral-900 dark:text-neutral-50 truncate leading-tight">
            {item.name}
          </p>
          {strategies.map(s => (
            <span key={s} className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded border leading-none",
              STRATEGY_BADGE_CLS[s] ?? "bg-neutral-100 text-neutral-500 border-neutral-200"
            )}>
              {STRATEGY_LABEL[s] ?? s}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-neutral-400 font-mono">{item.ticker}</p>
      </div>

      {/* 전략 핵심 지표 — 기준 충족 시 초록, 미달 회색, 데이터 없으면 — */}
      <div className="shrink-0 flex items-center gap-3 sm:gap-4">
        {metrics.map(m => {
          const v = m.get(item);
          const has = v > 0;
          const ok = has && m.ok(v);
          return (
            <div key={m.label} className="text-right min-w-[48px]">
              <p className={cn(
                "text-sm font-black font-mono tabular-nums",
                !has ? "text-neutral-300 dark:text-neutral-600"
                  : ok ? "text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-500 dark:text-neutral-400"
              )}>
                {has ? m.fmt(v) : "—"}
              </p>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{m.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategyGroup({ preset, stocks }: { preset: StrategyPreset; stocks: PreviewStock[] }) {
  const metrics = STRATEGY_METRICS[preset.id] ?? NCAV_METRIC;
  return (
    <div className="border-b border-neutral-100 dark:border-[#35332e] last:border-0">
      <div className="px-4 py-2.5 bg-[#fcfaf7] dark:bg-[#1f1e1b] flex items-center gap-2">
        <span className={cn(
          "text-[11px] font-extrabold px-2 py-0.5 rounded shrink-0",
          STRATEGY_BADGE[preset.id] ?? "bg-neutral-100 text-neutral-500"
        )}>
          {preset.label}
        </span>
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate break-keep">
          {preset.plain}
        </span>
      </div>
      {stocks.map((item, i) => (
        <StockRow key={`${preset.id}-${item.ticker}`} item={item} index={i} excludeStrategy={preset.id} metrics={metrics} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;
  const sessionLoading = status === "loading";

  const [preview, setPreview] = useState<{
    items: PreviewStock[];
    total: number;
    filteredTotal: number;
    scanDate: string | null;
    loading: boolean;
  }>({ items: [], total: 0, filteredTotal: 0, scanDate: null, loading: true });

  useEffect(() => {
    fetch("/api/proxy/scan/daily?strategy=all&limit=2500&sort=ncav_ratio&order=desc")
      .then(r => r.json())
      .then((data: any) => {
        if (data.success) {
          const all: PreviewStock[] = data.data;
          const filtered = all.filter(item => (item.market_cap ?? 0) >= HOME_MKTCAP_MIN);
          setPreview({
            items: filtered,
            total: data.meta.total,
            filteredTotal: filtered.length,
            scanDate: data.meta.scanDate,
            loading: false,
          });
        } else {
          setPreview(p => ({ ...p, loading: false }));
        }
      })
      .catch(() => setPreview(p => ({ ...p, loading: false })));
  }, []);

  // 전략별 상위 PER_STRATEGY개 그룹 (종목 없는 전략은 제외)
  const groups = STRATEGY_PRESETS_CLIENT.map(preset => {
    const sortFn = STRATEGY_SORT[preset.id] ?? (i => -(i.ncav_ratio ?? 0));
    const stocks = preview.items
      .filter(it => it.strategies?.includes(preset.id))
      .sort((a, b) => sortFn(a) - sortFn(b))
      .slice(0, PER_STRATEGY);
    return { preset, stocks };
  }).filter(g => g.stocks.length > 0);

  const visibleGroups = isLoggedIn ? groups : groups.slice(0, GROUP_PUBLIC);
  const lockedGroups = isLoggedIn ? [] : groups.slice(GROUP_PUBLIC);

  const formattedDate = preview.scanDate
    ? `${preview.scanDate.slice(0, 4)}.${preview.scanDate.slice(4, 6)}.${preview.scanDate.slice(6, 8)}`
    : null;

  const animatedTotal = useCountUp(preview.loading ? 0 : preview.total);
  const animatedFiltered = useCountUp(preview.loading ? 0 : preview.filteredTotal);

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1f1e1b] border-b border-neutral-200/70 dark:border-[#3a3834] relative overflow-hidden">
        {/* Decorative radial accents */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-[#16a34a]/6 dark:bg-[#16a34a]/4 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-emerald-500/4 dark:bg-emerald-500/3 blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto px-5 pt-14 pb-12 sm:pt-20 sm:pb-14 md:pt-28 md:pb-20 relative">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf9f7] dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] mb-5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            매일 자동 스캔 · KOSPI · KOSDAQ
          </div>

          {/* Headline */}
          <h1 className="text-[2.1rem] sm:text-[3rem] md:text-[3.5rem] font-black leading-[1.08] tracking-tight mb-4 text-neutral-900 dark:text-neutral-50">
            퀀트 투자,<br />
            <span className="text-[#16a34a] dark:text-[#16a34a]">어렵지 않습니다.</span>
          </h1>

          {/* 히어로 일러스트 — "알고리즘이 알아서 골라준다"를 글자 대신 이미지로 */}
          <div className="mt-8 sm:mt-10">
            <HeroArt />
          </div>

        </div>

        {/* Stats strip */}
        {!preview.loading && preview.total > 0 && (
          <div className="border-t border-neutral-100 dark:border-[#2c2b27] relative">
            <div className="max-w-3xl mx-auto px-5 py-5 grid grid-cols-3 gap-0">
              <div className="text-center py-1">
                <p className="text-xl font-black text-[#16a34a] dark:text-[#16a34a] tabular-nums leading-none">
                  {animatedTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1">최근 발굴 종목</p>
              </div>
              <div className="text-center py-1 border-x border-neutral-100 dark:border-[#2c2b27]">
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                  {animatedFiltered.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1">시총 500억+</p>
              </div>
              <div className="text-center py-1">
                <p className="text-xl font-black text-neutral-700 dark:text-neutral-200 tabular-nums leading-none">
                  {formattedDate ?? "—"}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1">업데이트</p>
              </div>
            </div>
          </div>
        )}
        {preview.loading && (
          <div className="border-t border-neutral-100 dark:border-[#2c2b27] relative">
            <div className="max-w-3xl mx-auto px-5 py-5 grid grid-cols-3 gap-0">
              {[0, 1, 2].map(i => (
                <div key={i} className={cn(
                  "flex flex-col items-center py-1 gap-1.5",
                  i === 1 && "border-x border-neutral-100 dark:border-[#2c2b27]"
                )}>
                  <div className="h-5 w-14 rounded-md bg-neutral-200/80 dark:bg-[#35332e] animate-pulse" />
                  <div className="h-2.5 w-12 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── TODAY'S PICKS ─────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                  최근 발굴 종목
                </h2>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#16a34a] text-white">
                  500억+
                </span>
              </div>
            </div>
            <Link
              href="/screener?mincap=500"
              className="flex items-center gap-0.5 text-xs font-bold text-[#16a34a] dark:text-[#16a34a] whitespace-nowrap"
            >
              전체 보기 <ChevronRight size={13} />
            </Link>
          </div>

          {/* Stock list card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden bg-white dark:bg-[#242320] shadow-sm">
            {/* Column headers */}
            <div className="px-4 py-2 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">종목</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략 지표</span>
            </div>

            {preview.loading ? (
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] last:border-0">
                    <div className="w-4 h-3 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-neutral-200/80 dark:bg-[#35332e] animate-pulse" />
                      <div className="h-2.5 w-16 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse" />
                    </div>
                    <div className="h-7 w-12 rounded-md bg-neutral-200/80 dark:bg-[#35332e] animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 size={24} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">스캔 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {visibleGroups.map(g => (
                  <StrategyGroup key={g.preset.id} preset={g.preset} stocks={g.stocks} />
                ))}

                {/* Locked groups */}
                {lockedGroups.length > 0 && (
                  <div className="relative">
                    <div className="blur-sm select-none pointer-events-none">
                      {lockedGroups.map(g => (
                        <StrategyGroup key={g.preset.id} preset={g.preset} stocks={g.stocks} />
                      ))}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 to-white/90 dark:from-[#242320]/40 dark:to-[#242320]/95">
                      <Link
                        href="/login"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold shadow-md shadow-[#16a34a]/20 transition-all"
                      >
                        <Lock size={13} />
                        로그인하여 {groups.length}개 전략 전체 확인
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                )}

                {isLoggedIn && (
                  <div className="px-4 py-3 bg-[#f0fdf4] dark:bg-[#052e16]/20 border-t border-[#dcfce7] dark:border-[#14532d]/40 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#15803d] dark:text-[#16a34a] font-medium">
                      전체 <span className="font-black">{preview.filteredTotal}개</span> 종목을 필터·정렬로 탐색하세요.
                    </p>
                    <Link
                      href="/screener?mincap=500"
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16a34a] text-white text-xs font-bold hover:bg-[#15803d] transition-colors whitespace-nowrap"
                    >
                      스크리너 <ChevronRight size={10} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── STRATEGIES ───────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-[#16a34a]" strokeWidth={2.5} />
                <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">9가지 퀀트 전략</h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STRATEGY_PRESETS_CLIENT.map(s => (
              <Link
                key={s.id}
                href={`/screener?strategies=${s.id}&mincap=500`}
                className="group p-4 rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] hover:border-[#16a34a]/50 dark:hover:border-[#16a34a]/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-[11px] font-extrabold px-2 py-0.5 rounded",
                    STRATEGY_BADGE[s.id] ?? "bg-neutral-100 text-neutral-500"
                  )}>
                    {s.label}
                  </span>
                  <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600 group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-200 font-medium leading-relaxed break-keep">
                  {s.plain}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1917]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-7">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-[#16a34a]" strokeWidth={2.5} />
              <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">이렇게 씁니다</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => {
              const Art = STEP_ARTS[i];
              return (
                <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e]">
                  <div className="flex items-center gap-3 mb-3">
                    <Art />
                    <span className={cn("text-xs font-black tabular-nums", step.accent)}>{step.step}</span>
                  </div>
                  <p className="text-sm font-black text-neutral-900 dark:text-neutral-50">{step.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">주요 기능</h2>
          </div>

          {/* Mobile: horizontal scroll, Desktop: 3-col grid */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="shrink-0 w-56 sm:w-auto bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex flex-col gap-4"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", f.bgCls)}>
                    <Icon size={16} className={f.iconCls} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-neutral-900 dark:text-neutral-50">{f.title}</p>
                  </div>
                  <Link href={f.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a] dark:text-[#16a34a]"
                  >
                    {f.linkLabel} <ChevronRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONVERSION CTA (비로그인) ─────────────────────────────── */}
      {!isLoggedIn && !sessionLoading && (
        <section className="py-16 px-5 border-t border-neutral-100 dark:border-[#3a3834] bg-gradient-to-b from-[#faf9f7] to-white dark:from-[#1a1917] dark:to-[#1f1e1b] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-[#16a34a]/5 dark:bg-[#16a34a]/4 blur-3xl" />
          </div>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#dcfce7] dark:border-[#14532d]/60 mb-4 text-[11px] font-semibold text-[#15803d] dark:text-[#16a34a]">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#16a34a]" />
              </span>
              무료로 시작하세요
            </div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 mb-6 tracking-tight leading-tight">
              지금 바로 저평가 종목을<br />찾아보세요
            </h2>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold text-sm shadow-md shadow-[#16a34a]/20 transition-all"
            >
              카카오로 무료 시작
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 dark:border-[#3a3834] bg-white dark:bg-[#1f1e1b]">
        <div className="max-w-3xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#16a34a] shrink-0" strokeWidth={2.5} />
            <span className="text-xs font-black tracking-tight text-neutral-700 dark:text-neutral-200">
              IDIOT QUANT
            </span>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "발굴", href: "/screener" },
              { label: "분석", href: "/analyze" },
              { label: "계산기", href: "/calculator" },
            ].map(l => (
              <Link key={l.label} href={l.href}
                className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors font-medium"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-neutral-100 dark:border-[#2c2b27]">
          <p className="px-5 py-2.5 text-[10px] text-neutral-400 dark:text-neutral-600 text-center">
            본 서비스는 투자 참고 목적이며 투자 결과에 대한 책임을 지지 않습니다. © 2026 IDIOT QUANT
          </p>
        </div>
      </footer>

    </div>
  );
}
