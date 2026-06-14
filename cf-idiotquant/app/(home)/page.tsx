"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search, Calculator, Filter, Lock, ArrowRight,
  TrendingUp, ChevronRight, Loader2, BarChart3, Zap, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STRATEGY_PRESETS_CLIENT, STRATEGY_BADGE } from "@/lib/constants/strategies";

interface PreviewStock {
  ticker: string;
  name: string;
  ncav_ratio: number;
  pbr: number;
  per: number;
  strategies: string[];
  market_cap?: number;
}

const HOME_MKTCAP_MIN = 500;

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
    desc: "9가지 퀀트 전략으로 KOSPI·KOSDAQ 전 종목을 매일 자동 스캔합니다.",
    link: "/screener",
    linkLabel: "스크리너 열기",
  },
  {
    icon: Search,
    iconCls: "text-violet-600 dark:text-violet-400",
    bgCls: "bg-violet-50 dark:bg-violet-950/30",
    title: "적정주가 분석",
    desc: "NCAV·S-RIM·PBR·PER 4개 모델로 적정 주가와 괴리율을 즉시 계산합니다.",
    link: "/analyze",
    linkLabel: "종목 분석하기",
  },
  {
    icon: Calculator,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    bgCls: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "수익 계산기",
    desc: "거래세·수수료 포함 세후 순수익과 연환산 수익률을 즉시 산출합니다.",
    link: "/calculator",
    linkLabel: "계산해보기",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "매일 자동 스캔",
    desc: "KIS API로 KOSPI·KOSDAQ 전 종목의 재무 데이터를 매일 수집합니다.",
    accent: "text-[#16a34a]",
  },
  {
    step: "02",
    title: "저평가 종목 발굴",
    desc: "NCAV·PBR·그레이엄 등 9가지 전략으로 저평가 후보를 자동 선별합니다.",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    step: "03",
    title: "적정주가 즉시 확인",
    desc: "종목 코드 하나로 4가지 모델 기반 적정주가와 괴리율을 즉시 산출합니다.",
    accent: "text-violet-600 dark:text-violet-400",
  },
];

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

function StockRow({ item, index }: { item: PreviewStock; index: number }) {
  const ncav = item.ncav_ratio;
  const strategies = item.strategies?.slice(0, 2) ?? [];

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

      {/* PBR · PER — sm 이상에서만 노출 (모바일은 NCAV에 집중) */}
      <div className="hidden sm:flex items-center gap-4 shrink-0">
        <div className="text-right min-w-[40px]">
          <p className="text-xs font-bold font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
            {item.pbr > 0 ? item.pbr.toFixed(2) : "—"}
          </p>
          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">PBR</p>
        </div>
        <div className="text-right min-w-[40px]">
          <p className="text-xs font-bold font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
            {item.per > 0 ? item.per.toFixed(1) : "—"}
          </p>
          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">PER</p>
        </div>
      </div>

      <div className="shrink-0 text-right min-w-[52px]">
        <p className={cn(
          "text-sm font-black font-mono tabular-nums",
          ncav >= 1 ? "text-emerald-600 dark:text-emerald-400" :
          ncav >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-neutral-400"
        )}>
          {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
        </p>
        <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">NCAV</p>
      </div>
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
    fetch("/api/proxy/scan/daily?strategy=all&limit=2000&sort=ncav_ratio&order=desc")
      .then(r => r.json())
      .then((data: any) => {
        if (data.success) {
          const all: PreviewStock[] = data.data;
          const filtered = all.filter(item => (item.market_cap ?? 0) >= HOME_MKTCAP_MIN);
          setPreview({
            items: filtered.slice(0, 5),
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

  const publicItems = preview.items.slice(0, 3);
  const lockedItems = preview.items.slice(3);
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

          <p className="text-sm sm:text-[15px] text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mb-7">
            9가지 가치투자 전략으로 매일 2,000여 종목을<br className="hidden sm:block" />
            알고리즘이 대신 분석합니다.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {!sessionLoading && (isLoggedIn ? (
              <Link href="/screener"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white text-sm font-bold shadow-md shadow-[#16a34a]/20 transition-all"
              >
                <TrendingUp size={15} strokeWidth={2.5} />
                종목 발굴하기
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white text-sm font-bold shadow-md shadow-[#16a34a]/20 transition-all"
              >
                카카오로 무료 시작
                <ArrowRight size={14} />
              </Link>
            ))}
            <Link href="/analyze"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#faf9f7] dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] hover:border-neutral-400 dark:hover:border-[#4a4641] text-neutral-700 dark:text-neutral-300 text-sm font-bold transition-all"
            >
              종목 직접 분석하기
            </Link>
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
                <p className="text-[10px] text-neutral-400 font-medium mt-1">오늘 발굴 종목</p>
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
          <div className="border-t border-neutral-100 dark:border-[#2c2b27] flex items-center justify-center gap-2 py-3 text-neutral-400">
            <Loader2 size={11} className="animate-spin" />
            <span className="text-xs">집계 중...</span>
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
                  오늘의 발굴 종목
                </h2>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#16a34a] text-white">
                  500억+
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {isLoggedIn
                  ? `NCAV 비율 순 · 전체 ${preview.filteredTotal}개`
                  : "상위 3개 미리 보기 · 전체 목록은 로그인 후"}
              </p>
            </div>
            <Link
              href={isLoggedIn ? "/screener?mincap=500" : "/login"}
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
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                <span className="hidden sm:inline">PBR · PER · </span>NCAV
              </span>
            </div>

            {preview.loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-neutral-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">불러오는 중...</span>
              </div>
            ) : preview.items.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 size={24} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">스캔 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {publicItems.map((item, i) => (
                  <StockRow key={item.ticker} item={item} index={i} />
                ))}

                {/* Locked rows */}
                {lockedItems.length > 0 && (
                  <div className="relative">
                    {lockedItems.map((item, i) => (
                      <div
                        key={item.ticker}
                        className={cn(!isLoggedIn && "blur-sm select-none pointer-events-none")}
                      >
                        <StockRow item={item} index={publicItems.length + i} />
                      </div>
                    ))}

                    {!isLoggedIn && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 to-white/90 dark:from-[#242320]/40 dark:to-[#242320]/95">
                        <Link
                          href="/login"
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold shadow-md shadow-[#16a34a]/20 transition-all"
                        >
                          <Lock size={13} />
                          로그인하여 전체 확인
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    )}
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
              <div className="flex items-center gap-2 mb-1">
                <Layers size={13} className="text-[#16a34a]" strokeWidth={2.5} />
                <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">9가지 퀀트 전략</h2>
              </div>
              <p className="text-[11px] text-neutral-400 break-keep">
                검증된 가치투자 전략으로 매일 종목을 선별합니다. 카드를 눌러 바로 탐색하세요.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STRATEGY_PRESETS_CLIENT.map(s => (
              <Link
                key={s.id}
                href={isLoggedIn ? `/screener?strategies=${s.id}&mincap=500` : "/login"}
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
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep">
                  {s.hint}
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
            <div className="flex items-center gap-2 mb-1">
              <Zap size={13} className="text-[#16a34a]" strokeWidth={2.5} />
              <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">이렇게 씁니다</h2>
            </div>
            <p className="text-[11px] text-neutral-400">3단계로 저평가 종목을 발굴합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e]">
                <span className={cn("text-xs font-black tabular-nums shrink-0 mt-0.5", step.accent)}>
                  {step.step}
                </span>
                <div>
                  <p className="text-sm font-black text-neutral-900 dark:text-neutral-50 mb-0.5">{step.title}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">주요 기능</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">발굴 → 분석 → 계산</p>
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
                    <p className="text-sm font-black text-neutral-900 dark:text-neutral-50 mb-1">{f.title}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep">
                      {f.desc}
                    </p>
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
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 mb-2 tracking-tight leading-tight">
              지금 바로 저평가 종목을<br />찾아보세요
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              카카오 계정으로 즉시 시작. 별도 가입 없이 전체 기능을 이용할 수 있습니다.
            </p>
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
              { label: "발굴", href: isLoggedIn ? "/screener" : "/login" },
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
