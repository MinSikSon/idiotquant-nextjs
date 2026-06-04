"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Calculator, BarChart3, Lock, ArrowRight,
  TrendingUp, ChevronRight, CheckCircle2, Loader2, Activity,
  Zap, ShieldCheck, LayoutGrid,
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
    title: "9가지 퀀트 전략",
    desc: "NCAV·저PBR·저PER·S-RIM·그레이엄·마법공식 등 검증된 전략으로 KOSPI·KOSDAQ 전 종목을 매일 자동 스캔합니다.",
    link: "/screener",
    linkLabel: "종목 발굴하기",
  },
  {
    icon: Search,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    title: "멀티 모델 밸류에이션",
    desc: "종목 검색 한 번으로 NCAV·S-RIM·PBR·PER 4개 모델의 적정 주가와 현재 주가 괴리율을 즉시 확인합니다.",
    link: "/analyze",
    linkLabel: "종목 분석하기",
  },
  {
    icon: Calculator,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "세후 수익 계산기",
    desc: "거래세·수수료를 반영한 세후 순수익과 연환산 수익률을 시나리오별로 즉시 계산합니다.",
    link: "/calculator",
    linkLabel: "계산해보기",
  },
];

function NcavBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio * 100, 200);
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          ratio >= 1 ? "bg-emerald-500" : ratio >= 0.7 ? "bg-amber-400" : "bg-zinc-300 dark:bg-zinc-600"
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function StockPreviewRow({ item, index }: { item: PreviewStock; index: number }) {
  const ncav = item.ncav_ratio;
  const strategies = item.strategies?.slice(0, 2) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.04 * index }}
      className="group flex items-center gap-4 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0 hover:bg-blue-50/40 dark:hover:bg-zinc-800/30 transition-colors"
    >
      {/* 순위 */}
      <span className="w-5 text-[11px] font-black text-zinc-300 dark:text-zinc-600 tabular-nums shrink-0">
        {index + 1}
      </span>

      {/* 종목 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className="font-bold text-[13px] text-zinc-900 dark:text-white truncate leading-tight">{item.name}</p>
          {strategies.map(s => (
            <span key={s} className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border leading-none",
              STRATEGY_BADGE_CLS[s] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
            )}>
              {STRATEGY_LABEL[s] ?? s}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-zinc-400 font-mono">{item.ticker}</p>
      </div>

      {/* 지표 */}
      <div className="hidden sm:flex items-center gap-5 shrink-0">
        <div className="text-right">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">PBR</p>
          <p className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-300">
            {item.pbr > 0 ? `${item.pbr.toFixed(2)}` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">PER</p>
          <p className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-300">
            {item.per > 0 ? `${item.per.toFixed(1)}` : "—"}
          </p>
        </div>
      </div>

      {/* NCAV 비율 + 바 */}
      <div className="shrink-0 w-20 text-right">
        <p className={cn(
          "text-sm font-black font-mono tabular-nums",
          ncav >= 1 ? "text-emerald-600 dark:text-emerald-400" :
          ncav >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"
        )}>
          {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
        </p>
        <NcavBar ratio={ncav} />
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
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
      <header ref={heroRef} className="relative overflow-hidden">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white dark:from-blue-950/20 dark:via-zinc-950 dark:to-zinc-950" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-blue-400/8 dark:bg-blue-600/8 blur-[100px] rounded-full" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-violet-400/6 dark:bg-violet-600/6 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          {/* 뱃지 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm mb-7"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
              매일 자동 스캔 &nbsp;·&nbsp; KOSPI · KOSDAQ 전 종목
            </span>
          </motion.div>

          {/* 헤드라인 */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="text-[clamp(2.4rem,7vw,5rem)] font-black leading-[1.04] tracking-tight mb-5"
          >
            <span className="block text-zinc-900 dark:text-white">저평가 국내 주식,</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-blue-600 to-violet-600">
              데이터가 먼저 찾아드립니다.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-zinc-500 dark:text-zinc-400 text-base md:text-lg font-medium leading-relaxed mb-8 max-w-xl mx-auto"
          >
            벤자민 그레이엄의 NCAV 원칙을 포함한 9가지 퀀트 전략으로
            감이 아닌 데이터 기반의 종목 발굴을 시작하세요.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="flex flex-wrap justify-center gap-3 mb-8"
          >
            {!sessionLoading && (isLoggedIn ? (
              <Link href="/screener"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all duration-200"
              >
                <TrendingUp size={16} strokeWidth={2.5} />
                종목 발굴하기
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link href="/login"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all duration-200"
              >
                카카오로 무료 시작
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ))}
            <Link href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-700 dark:text-zinc-300 text-sm font-bold transition-all shadow-sm"
            >
              종목 직접 분석하기
            </Link>
          </motion.div>

          {/* 신뢰 지표 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs text-zinc-400 dark:text-zinc-500"
          >
            {[
              "카카오 로그인 30초",
              "무료 플랜 영구 제공",
              "한국투자증권 API 연동",
              "9가지 퀀트 전략",
            ].map(t => (
              <span key={t} className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* 라이브 스탯 스트립 */}
        <div className="border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/50 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {preview.loading ? (
              <div className="flex items-center gap-2 text-zinc-400 py-1">
                <Loader2 size={13} className="animate-spin" />
                <span className="text-xs">데이터 집계 중...</span>
              </div>
            ) : preview.total > 0 ? (
              <>
                <Stat
                  value={preview.total}
                  label="오늘 발굴된 저평가 종목"
                  color="text-blue-600 dark:text-blue-400"
                />
                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                <Stat
                  value={preview.filteredTotal}
                  label="시가총액 500억+ 종목"
                  color="text-emerald-600 dark:text-emerald-400"
                />
                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                <div className="text-center">
                  <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider mb-0.5">업데이트</p>
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-200">
                    {formattedDate ?? "—"}
                  </p>
                </div>
                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                <div className="text-center">
                  <p className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider mb-0.5">스캔 전략</p>
                  <p className="text-sm font-black text-zinc-700 dark:text-zinc-200">9가지</p>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                <Activity size={13} className="text-zinc-300" />
                스캔 데이터를 불러오는 중입니다.
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── 오늘의 발굴 종목 미리보기 ── */}
      <section className="py-16 px-6 bg-white dark:bg-zinc-950">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-end justify-between gap-4 mb-5"
          >
            <div>
              <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.18em] mb-2">Today&apos;s Picks</p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">오늘의 발굴 종목</h2>
                <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-600 text-white">
                  시가총액 500억+
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1.5">
                {isLoggedIn
                  ? `NCAV 비율 높은 순 · 전체 ${preview.filteredTotal}개는 스크리너에서`
                  : "상위 3개 무료 공개 · 전체 목록은 로그인 후 확인 가능"}
              </p>
            </div>
            <Link
              href={isLoggedIn ? "/screener?mincap=500" : "/login"}
              className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors whitespace-nowrap"
            >
              전체 {preview.filteredTotal > 0 ? `${preview.filteredTotal}개` : ""} 보기
              <ChevronRight size={13} />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-md"
          >
            {/* 컬럼 헤더 */}
            <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-800/70 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">종목</span>
              <div className="flex items-center gap-5">
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider hidden sm:block">PBR</span>
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider hidden sm:block">PER</span>
                <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">NCAV 비율</span>
              </div>
            </div>

            {preview.loading ? (
              <div className="flex items-center justify-center py-16 gap-2.5 text-zinc-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm font-medium">종목 불러오는 중...</span>
              </div>
            ) : preview.items.length === 0 ? (
              <div className="py-14 text-center">
                <BarChart3 size={28} className="text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">스캔 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {/* 공개 항목 */}
                {publicItems.map((item, i) => (
                  <StockPreviewRow key={item.ticker} item={item} index={i} />
                ))}

                {/* 잠긴 항목 */}
                {lockedItems.length > 0 && (
                  <div className="relative">
                    {lockedItems.map((item, i) => (
                      <div
                        key={item.ticker}
                        className={cn(
                          "transition-all duration-300",
                          !isLoggedIn && "blur-sm select-none pointer-events-none"
                        )}
                      >
                        <StockPreviewRow item={item} index={publicItems.length + i} />
                      </div>
                    ))}

                    {!isLoggedIn && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/60 to-white/90 dark:from-zinc-900/60 dark:to-zinc-900/90">
                        <Link
                          href="/login"
                          className="group flex items-center gap-2.5 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-xl shadow-blue-600/25 transition-all"
                        >
                          <Lock size={14} />
                          로그인하여 전체 종목 확인
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* 로그인 후 CTA */}
                {isLoggedIn && (
                  <div className="px-5 py-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-4">
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                      시가총액 500억+ 기준 <span className="font-black">{preview.filteredTotal}개</span> 종목 · 전략 필터·정렬로 더 정밀하게 탐색하세요.
                    </p>
                    <Link
                      href="/screener?mincap=500"
                      className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      스크리너 열기 <ChevronRight size={11} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── 기능 카드 ── */}
      <section className="py-16 px-6 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-3">Features</p>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">투자 결정을 위한 3단계</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">발굴 → 분석 → 계산, 투자 판단에 필요한 모든 도구.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", f.bg)}>
                    <Icon size={20} className={f.color} strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-black mb-2 text-zinc-900 dark:text-white">{f.title}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4 break-keep">{f.desc}</p>
                  <Link href={f.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:gap-1.5 transition-all group-hover:text-blue-700 dark:group-hover:text-blue-300"
                  >
                    {f.linkLabel} <ChevronRight size={12} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 보증 스트립 ── */}
      <section className="py-12 px-6 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/60">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Zap, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", title: "5분마다 자동 업데이트", desc: "KIS(한국투자증권) API로 실시간 재무 데이터와 시세를 반영해 전 종목을 롤링 스캔합니다." },
              { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", title: "검증된 퀀트 전략", desc: "벤자민 그레이엄·그린블라트·워렌 버핏의 투자 철학을 알고리즘으로 구현한 9가지 전략을 제공합니다." },
              { icon: Activity, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", title: "국내 전 종목 커버", desc: "KOSPI·KOSDAQ 상장 2,000여 종목을 매일 스캔하여 오늘 기준 저평가 후보 종목 목록을 제공합니다." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-4 p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", item.bg)}>
                    <Icon size={17} className={item.color} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold mb-1 text-zinc-900 dark:text-white">{item.title}</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 최종 CTA ── */}
      {!isLoggedIn && !sessionLoading && (
        <section className="py-16 px-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 dark:from-blue-700 dark:via-blue-800 dark:to-indigo-800">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto text-center"
          >
            <h2 className="text-2xl font-black text-white mb-3">지금 바로 시작하세요</h2>
            <p className="text-sm text-blue-200 mb-7 leading-relaxed">
              카카오 로그인 30초 · 무료 · 신용카드 불필요
            </p>
            <Link href="/login"
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-white text-blue-700 text-sm font-extrabold shadow-lg hover:bg-blue-50 transition-all"
            >
              카카오로 무료 시작
              <ArrowRight size={15} />
            </Link>
          </motion.div>
        </section>
      )}

      {/* ── 푸터 ── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2.5">
            <TrendingUp size={16} className="text-blue-600" strokeWidth={2.5} />
            <span className="text-sm font-black tracking-tight">IDIOT QUANT</span>
            <span className="text-xs text-zinc-400 font-medium">KOSPI · KOSDAQ 퀀트 스크리너</span>
          </div>
          <div className="flex items-center gap-5">
            {[
              { label: "종목 발굴", href: isLoggedIn ? "/screener" : "/login" },
              { label: "종목 분석", href: "/analyze" },
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
        <div className="border-t border-zinc-100 dark:border-zinc-800/60">
          <div className="max-w-4xl mx-auto px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-1">
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500">© 2026 IDIOT QUANT · Powered by 한국투자증권 API</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center sm:text-right">
              본 서비스는 투자 참고 목적으로 제공되며, 투자 결과에 대한 책임을 지지 않습니다.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-black tabular-nums", color)}>{value.toLocaleString()}</p>
      <p className="text-[11px] font-medium text-zinc-400 mt-0.5">{label}</p>
    </div>
  );
}
