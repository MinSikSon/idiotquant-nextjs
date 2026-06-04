"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Calculator, BarChart3, Lock, ArrowRight,
  TrendingUp, ChevronRight, Loader2, LayoutGrid,
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
  low_pbr:        "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60",
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
    icon: LayoutGrid,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    title: "종목 발굴",
    desc: "9가지 퀀트 전략으로 KOSPI·KOSDAQ 전 종목을 매일 자동 스캔.",
    link: "/screener",
    linkLabel: "스크리너 열기",
  },
  {
    icon: Search,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    title: "적정주가 분석",
    desc: "NCAV·S-RIM·PBR·PER 4개 모델로 적정 주가와 괴리율 즉시 계산.",
    link: "/analyze",
    linkLabel: "종목 분석하기",
  },
  {
    icon: Calculator,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "수익 계산기",
    desc: "거래세·수수료 포함 세후 순수익과 연환산 수익률을 즉시 산출.",
    link: "/calculator",
    linkLabel: "계산해보기",
  },
];

function StockPreviewRow({ item, index }: { item: PreviewStock; index: number }) {
  const ncav = item.ncav_ratio;
  const strategies = item.strategies?.slice(0, 2) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.04 * index }}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 active:bg-zinc-50 dark:active:bg-zinc-800/30 transition-colors"
    >
      <span className="w-4 text-[10px] font-black text-zinc-300 dark:text-zinc-600 tabular-nums shrink-0">{index + 1}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <p className="font-bold text-sm text-zinc-900 dark:text-white truncate leading-tight">{item.name}</p>
          {strategies.map(s => (
            <span key={s} className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded border leading-none",
              STRATEGY_BADGE_CLS[s] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
            )}>
              {STRATEGY_LABEL[s] ?? s}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-zinc-400 font-mono">{item.ticker}</p>
      </div>

      <div className={cn(
        "shrink-0 text-right min-w-[52px]",
      )}>
        <p className={cn(
          "text-sm font-black font-mono tabular-nums",
          ncav >= 1 ? "text-emerald-600 dark:text-emerald-400" :
          ncav >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"
        )}>
          {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
        </p>
        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">NCAV</p>
      </div>
    </motion.div>
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
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">

      {/* ── 히어로 ── */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/70 via-white to-white dark:from-blue-950/20 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[400px] bg-blue-400/8 dark:bg-blue-600/8 blur-[90px] rounded-full" />
        </div>

        <div className="max-w-lg mx-auto px-5 pt-10 pb-8 sm:pt-16 sm:pb-12 text-center">
          {/* Live 뱃지 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm mb-5"
          >
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              매일 자동 스캔 · KOSPI · KOSDAQ
            </span>
          </motion.div>

          {/* 헤드라인 */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.07 }}
            className="text-[2.2rem] sm:text-[3.2rem] font-black leading-[1.06] tracking-tight mb-4"
          >
            <span className="block text-zinc-900 dark:text-white">저평가 국내 주식,</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-600 to-violet-600">
              데이터가 찾아드립니다.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.13 }}
            className="text-sm sm:text-base text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-7"
          >
            9가지 퀀트 전략으로 매일 저평가 종목을 발굴하고<br className="hidden sm:block" />
            적정 주가까지 즉시 확인하세요.
          </motion.p>

          {/* CTA 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="flex flex-col sm:flex-row justify-center gap-2.5"
          >
            {!sessionLoading && (isLoggedIn ? (
              <Link href="/screener"
                className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all"
              >
                <TrendingUp size={15} strokeWidth={2.5} />
                종목 발굴하기
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link href="/login"
                className="group inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all"
              >
                카카오로 무료 시작
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
            <Link href="/analyze"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-700 dark:text-zinc-300 text-sm font-bold transition-all"
            >
              종목 직접 분석하기
            </Link>
          </motion.div>
        </div>

        {/* 스탯 스트립 */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm">
          <div className="max-w-lg mx-auto px-5 py-3">
            {preview.loading ? (
              <div className="flex items-center justify-center gap-2 text-zinc-400 py-2">
                <Loader2 size={12} className="animate-spin" />
                <span className="text-xs">집계 중...</span>
              </div>
            ) : preview.total > 0 ? (
              <div className="grid grid-cols-3 gap-0">
                <div className="text-center py-1">
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none">
                    {preview.total.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-1">오늘 발굴 종목</p>
                </div>
                <div className="text-center py-1 border-x border-zinc-100 dark:border-zinc-800">
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                    {preview.filteredTotal.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-1">시총 500억+</p>
                </div>
                <div className="text-center py-1">
                  <p className="text-xl font-black text-zinc-700 dark:text-zinc-200 tabular-nums leading-none">
                    {formattedDate ?? "—"}
                  </p>
                  <p className="text-[10px] text-zinc-400 font-medium mt-1">업데이트</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ── 오늘의 발굴 종목 ── */}
      <section className="py-8 px-5 bg-white dark:bg-zinc-950">
        <div className="max-w-lg mx-auto">
          {/* 섹션 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-zinc-900 dark:text-white">오늘의 발굴 종목</h2>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  500억+
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {isLoggedIn ? `NCAV 비율 순 · 전체 ${preview.filteredTotal}개` : "상위 3개 공개 · 전체는 로그인 후"}
              </p>
            </div>
            <Link
              href={isLoggedIn ? "/screener?mincap=500" : "/login"}
              className="flex items-center gap-0.5 text-xs font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap"
            >
              전체 보기 <ChevronRight size={13} />
            </Link>
          </div>

          {/* 종목 리스트 카드 */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
            {/* 헤더 */}
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">종목</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NCAV 비율</span>
            </div>

            {preview.loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">불러오는 중...</span>
              </div>
            ) : preview.items.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 size={24} className="text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">스캔 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {publicItems.map((item, i) => (
                  <StockPreviewRow key={item.ticker} item={item} index={i} />
                ))}

                {/* 잠긴 항목 */}
                {lockedItems.length > 0 && (
                  <div className="relative">
                    {lockedItems.map((item, i) => (
                      <div
                        key={item.ticker}
                        className={cn(!isLoggedIn && "blur-sm select-none pointer-events-none")}
                      >
                        <StockPreviewRow item={item} index={publicItems.length + i} />
                      </div>
                    ))}

                    {!isLoggedIn && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/50 to-white/95 dark:from-zinc-900/50 dark:to-zinc-900/95">
                        <Link
                          href="/login"
                          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all"
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
                  <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-3">
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                      전체 <span className="font-black">{preview.filteredTotal}개</span> 종목을 필터·정렬로 탐색하세요.
                    </p>
                    <Link
                      href="/screener?mincap=500"
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
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

      {/* ── 기능 카드 (수평 스크롤) ── */}
      <section className="py-8 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-lg mx-auto">
          <div className="px-5 mb-4">
            <h2 className="text-base font-black text-zinc-900 dark:text-white">주요 기능</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">발굴 → 분석 → 계산</p>
          </div>

          {/* 모바일: 수평 스크롤, 데스크탑: 3열 */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="shrink-0 w-52 sm:w-auto bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col gap-3"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", f.bg)}>
                    <Icon size={16} className={f.color} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-zinc-900 dark:text-white mb-1">{f.title}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">{f.desc}</p>
                  </div>
                  <Link href={f.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400"
                  >
                    {f.linkLabel} <ChevronRight size={11} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="max-w-lg mx-auto px-5 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-600 shrink-0" strokeWidth={2.5} />
            <span className="text-xs font-black tracking-tight text-zinc-700 dark:text-zinc-200">IDIOT QUANT</span>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "발굴", href: isLoggedIn ? "/screener" : "/login" },
              { label: "분석", href: "/analyze" },
              { label: "계산기", href: "/calculator" },
            ].map(l => (
              <Link key={l.label} href={l.href}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors font-medium"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="border-t border-zinc-100 dark:border-zinc-800/40">
          <p className="px-5 py-2.5 text-[10px] text-zinc-400 dark:text-zinc-600 text-center">
            본 서비스는 투자 참고 목적이며 투자 결과에 대한 책임을 지지 않습니다. © 2026 IDIOT QUANT
          </p>
        </div>
      </footer>

    </div>
  );
}
