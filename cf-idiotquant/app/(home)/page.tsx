"use client";

import { useRef, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Calculator, BarChart3, Lock, ArrowRight,
  TrendingUp, ChevronRight, CheckCircle2, Loader2, Activity, Sparkles,
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

const HOME_MKTCAP_MIN = 500; // 억원

const STRATEGY_LABEL: Record<string, string> = {
  ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
  graham_number: "그레이엄", magic_formula: "마법공식",
};

const STRATEGY_BADGE_CLS: Record<string, string> = {
  ncav: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/50",
  low_pbr: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/50",
  low_per: "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-800/50",
  s_rim: "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200/60 dark:border-violet-800/50",
  graham_number: "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border-teal-200/60 dark:border-teal-800/50",
  magic_formula: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/50",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: BarChart3,
    title: "종목 발굴",
    desc: "NCAV·저PBR·저PER 등 9가지 전략으로 매일 자동 스캔된 KOSPI·KOSDAQ 저평가 종목을 확인합니다.",
    link: "/screener",
  },
  {
    step: "02",
    icon: Search,
    title: "상세 분석",
    desc: "관심 종목을 클릭하면 NCAV·S-RIM·PBR·PER 등 복수 모델로 적정 주가와 안전마진을 즉시 산출합니다.",
    link: "/analyze",
  },
  {
    step: "03",
    icon: Calculator,
    title: "수익 시뮬레이션",
    desc: "매수 시나리오별 세후 순수익과 연환산 수익률을 거래세·수수료까지 반영해 계산합니다.",
    link: "/calculator",
  },
];

function StockPreviewRow({ item }: { item: PreviewStock }) {
  const ncav = item.ncav_ratio;
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/60 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.name}</p>
          {item.strategies.slice(0, 2).map(s => (
            <span key={s} className={cn(
              "text-[9px] font-extrabold px-1.5 py-0.5 rounded border",
              STRATEGY_BADGE_CLS[s] ?? "bg-zinc-100 text-zinc-500 border-zinc-200"
            )}>
              {STRATEGY_LABEL[s] ?? s}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.ticker}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">PBR</p>
          <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
            {item.pbr > 0 ? `${item.pbr.toFixed(2)}x` : "—"}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">PER</p>
          <p className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
            {item.per > 0 ? `${item.per.toFixed(1)}x` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">NCAV</p>
          <p className={cn(
            "text-sm font-black font-mono",
            ncav >= 1 ? "text-emerald-600 dark:text-emerald-400" :
            ncav >= 0.7 ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"
          )}>
            {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const isLoggedIn = !!session;

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
          // 시가총액 500억+ 필터 (단위: 억원)
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
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 antialiased">

      {/* ── 히어로 ── */}
      <header ref={heroRef} className="relative pt-24 pb-16 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="absolute -top-32 -left-16 w-[600px] h-[400px] bg-blue-500/6 blur-[140px] rounded-full -z-10" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/8 border border-blue-500/20 mb-6">
            <Activity size={11} className="text-blue-500 animate-pulse" />
            <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-[0.18em]">
              KOSPI · KOSDAQ &nbsp;·&nbsp; 매일 자동 스캔
            </span>
          </div>

          <h1 className="text-[clamp(2.2rem,6vw,4.5rem)] font-black leading-[1.06] tracking-tight mb-5">
            <span className="block text-zinc-900 dark:text-white">오늘 저평가된</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500">
              국내 주식을 찾아드립니다.
            </span>
          </h1>

          <p className="text-zinc-500 dark:text-zinc-400 text-base md:text-lg font-medium leading-relaxed mb-6 max-w-xl mx-auto">
            벤자민 그레이엄의 NCAV 원칙 기반 퀀트 스크리너.
            <br className="hidden md:block" />
            감이 아닌 데이터로 저평가 종목을 발굴하세요.
          </p>

          {/* 실시간 발굴 수 — 데이터 로드 후 등장 */}
          <div className="min-h-[36px] flex justify-center mb-6">
            {!preview.loading && preview.total > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50"
              >
                <Sparkles size={12} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  오늘 <span className="font-black text-emerald-800 dark:text-emerald-300">{preview.total}개</span> 저평가 종목 발견
                  {formattedDate && <span className="text-emerald-600/70 dark:text-emerald-500/70 font-medium ml-1.5">· {formattedDate}</span>}
                </span>
              </motion.div>
            )}
            {preview.loading && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <Loader2 size={12} className="animate-spin text-zinc-400" />
                <span className="text-sm text-zinc-400 font-medium">오늘의 종목 집계 중...</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-7">
            {isLoggedIn ? (
              <Link href="/screener"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all"
              >
                종목 발굴하기
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            ) : (
              <Link href="/login"
                className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all"
              >
                무료로 시작하기
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
            <Link href="/analyze"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-bold hover:border-zinc-400 dark:hover:border-zinc-500 transition-all"
            >
              종목 분석 해보기
            </Link>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            {["카카오 로그인 30초", "무료 플랜 영구 제공", "한국투자증권 API 연동"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                {t}
              </span>
            ))}
          </div>
        </motion.div>
      </header>

      {/* ── 오늘의 발굴 종목 미리보기 ── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 flex items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black tracking-tight">오늘의 발굴 종목</h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40">
                시가총액 500억+
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isLoggedIn ? "로그인 중 · 전체 목록은 스크리너에서 확인하세요" : "상위 3개 무료 공개 · 전체 목록은 로그인 후 확인 가능"}
            </p>
          </div>
          <Link
            href={isLoggedIn ? "/screener?mincap=500" : "/login"}
            className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors whitespace-nowrap"
          >
            전체 {preview.filteredTotal > 0 ? `${preview.filteredTotal}개` : ""} 보기
            <ChevronRight size={12} />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06 }}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm"
        >
          {/* 테이블 헤더 */}
          <div className="px-5 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 hidden sm:flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">종목</span>
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:block">PBR</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider hidden sm:block">PER</span>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NCAV 비율</span>
            </div>
          </div>

          {preview.loading ? (
            <div className="flex items-center justify-center py-14 gap-2 text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">불러오는 중...</span>
            </div>
          ) : preview.items.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">스캔 데이터가 없습니다.</div>
          ) : (
            <>
              {/* 공개 항목 (항상 표시) */}
              {publicItems.map(item => (
                <StockPreviewRow key={item.ticker} item={item} />
              ))}

              {/* 잠긴 항목 */}
              {lockedItems.length > 0 && (
                <div className="relative">
                  {lockedItems.map(item => (
                    <div
                      key={item.ticker}
                      className={cn(
                        "transition-all duration-300",
                        !isLoggedIn && "blur-sm select-none pointer-events-none"
                      )}
                    >
                      <StockPreviewRow item={item} />
                    </div>
                  ))}
                  {/* 비로그인 시 오버레이 */}
                  {!isLoggedIn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/75 dark:bg-zinc-900/75 backdrop-blur-[2px]">
                      <Link
                        href="/login"
                        className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-lg shadow-blue-600/20 transition-all"
                      >
                        <Lock size={13} />
                        로그인하여 전체 {preview.total}개 보기
                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* 로그인 후 스크리너 바로가기 CTA */}
              {isLoggedIn && (
                <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/20 border-t border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-4">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    시가총액 500억+ 기준 <span className="font-black">{preview.filteredTotal}개</span> 종목을 전략 필터와 함께 확인하세요.
                  </p>
                  <Link
                    href="/screener?mincap=500"
                    className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    스크리너 열기 <ChevronRight size={11} />
                  </Link>
                </div>
              )}
            </>
          )}
        </motion.div>
      </section>

      {/* ── 사용 방법 ── */}
      <section className="border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-zinc-900/40 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-10"
          >
            How it works
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-7 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-zinc-200 via-blue-300/50 to-zinc-200 dark:from-zinc-800 dark:via-blue-700/30 dark:to-zinc-800" />

            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className="flex flex-col items-center text-center"
                >
                  <Link href={item.link} className="group relative w-14 h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 flex items-center justify-center mb-4 z-10 transition-all shadow-sm">
                    <Icon size={22} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center">
                      {item.step}
                    </span>
                  </Link>
                  <h3 className="text-base font-black mb-1.5">{item.title}</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-600" strokeWidth={2.5} />
            <span className="text-sm font-black tracking-tight">IDIOT QUANT</span>
            <span className="text-xs text-zinc-400 font-medium ml-1">
              KOSPI·KOSDAQ 퀀트 스크리너
            </span>
          </div>

          <div className="flex items-center gap-4">
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
          <div className="max-w-3xl mx-auto px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-1">
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
