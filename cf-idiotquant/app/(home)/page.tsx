"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search, Calculator, Filter, Lock, ArrowRight,
  TrendingUp, ChevronRight, Loader2, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  low_pbr:        "bg-[#fff8f5] dark:bg-[#3d1f10]/40 text-[#bf6644] dark:text-[#d97757] border-[#f9c9b0] dark:border-[#a05438]/60",
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
    iconCls: "text-[#d97757] dark:text-[#d97757]",
    bgCls: "bg-[#fff8f5] dark:bg-[#3d1f10]/30",
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

function StockRow({ item, index }: { item: PreviewStock; index: number }) {
  const ncav = item.ncav_ratio;
  const strategies = item.strategies?.slice(0, 2) ?? [];

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-neutral-100 dark:border-[#35332e] last:border-0 transition-colors">
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
    fetch("/api/proxy/scan/daily?strategy=all&limit=200&sort=ncav_ratio&order=desc")
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

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-[#1f1e1b] border-b border-neutral-200/70 dark:border-[#3a3834]">
        <div className="max-w-lg mx-auto px-5 pt-10 pb-8 sm:pt-14 sm:pb-10">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf9f7] dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] mb-5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            매일 자동 스캔 · KOSPI · KOSDAQ
          </div>

          {/* Headline */}
          <h1 className="text-[2.1rem] sm:text-[3rem] font-black leading-[1.08] tracking-tight mb-4 text-neutral-900 dark:text-neutral-50">
            저평가 국내 주식,<br />
            <span className="text-[#d97757] dark:text-[#d97757]">데이터가 찾아드립니다.</span>
          </h1>

          <p className="text-sm sm:text-[15px] text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mb-7">
            9가지 퀀트 전략으로 매일 저평가 종목을 발굴하고<br className="hidden sm:block" />
            적정 주가까지 즉시 확인하세요.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            {!sessionLoading && (isLoggedIn ? (
              <Link href="/screener"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#d97757] hover:bg-[#bf6644] active:bg-[#a05438] text-white text-sm font-bold shadow-md shadow-[#d97757]/20 transition-all"
              >
                <TrendingUp size={15} strokeWidth={2.5} />
                종목 발굴하기
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-[#d97757] hover:bg-[#bf6644] active:bg-[#a05438] text-white text-sm font-bold shadow-md shadow-[#d97757]/20 transition-all"
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
          <div className="border-t border-neutral-100 dark:border-[#2c2b27]">
            <div className="max-w-lg mx-auto px-5 py-3 grid grid-cols-3 gap-0">
              <div className="text-center py-1">
                <p className="text-xl font-black text-[#d97757] dark:text-[#d97757] tabular-nums leading-none">
                  {preview.total.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1">오늘 발굴 종목</p>
              </div>
              <div className="text-center py-1 border-x border-neutral-100 dark:border-[#2c2b27]">
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                  {preview.filteredTotal.toLocaleString()}
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
      <section className="py-6 px-5">
        <div className="max-w-lg mx-auto">

          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                  오늘의 발굴 종목
                </h2>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#d97757] text-white">
                  500억+
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {isLoggedIn
                  ? `NCAV 비율 순 · 전체 ${preview.filteredTotal}개`
                  : "상위 3개 공개 · 전체는 로그인 후"}
              </p>
            </div>
            <Link
              href={isLoggedIn ? "/screener?mincap=500" : "/login"}
              className="flex items-center gap-0.5 text-xs font-bold text-[#d97757] dark:text-[#d97757] whitespace-nowrap"
            >
              전체 보기 <ChevronRight size={13} />
            </Link>
          </div>

          {/* Stock list card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden bg-white dark:bg-[#242320] shadow-sm">
            {/* Column headers */}
            <div className="px-4 py-2 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">종목</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">NCAV 비율</span>
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
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d97757] hover:bg-[#bf6644] text-white text-sm font-bold shadow-md shadow-[#d97757]/20 transition-all"
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
                  <div className="px-4 py-3 bg-[#fff8f5] dark:bg-[#3d1f10]/20 border-t border-[#fde8de] dark:border-[#7d3f27]/40 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#bf6644] dark:text-[#d97757] font-medium">
                      전체 <span className="font-black">{preview.filteredTotal}개</span> 종목을 필터·정렬로 탐색하세요.
                    </p>
                    <Link
                      href="/screener?mincap=500"
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#d97757] text-white text-xs font-bold hover:bg-[#bf6644] transition-colors whitespace-nowrap"
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

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-6 px-5 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-lg mx-auto">
          <div className="mb-4">
            <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">주요 기능</h2>
            <p className="text-[11px] text-neutral-400 mt-0.5">발굴 → 분석 → 계산</p>
          </div>

          {/* Mobile: horizontal scroll, Desktop: 3-col grid */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="shrink-0 w-52 sm:w-auto bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-4 flex flex-col gap-3"
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
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#d97757] dark:text-[#d97757]"
                  >
                    {f.linkLabel} <ChevronRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 dark:border-[#3a3834] bg-white dark:bg-[#1f1e1b]">
        <div className="max-w-lg mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#d97757] shrink-0" strokeWidth={2.5} />
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
