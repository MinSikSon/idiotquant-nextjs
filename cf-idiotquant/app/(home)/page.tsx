"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Calculator, BarChart3, Lock, ArrowRight,
  TrendingUp, ChevronRight, CheckCircle2, Loader2, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewStock {
  ticker: string;
  name: string;
  ncav_ratio: number;
  pbr: number;
  per: number;
  strategies: string[];
}

const STRATEGY_LABEL: Record<string, string> = {
  ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
  graham_number: "그레이엄", magic_formula: "마법공식",
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

export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);

  const [preview, setPreview] = useState<{
    items: PreviewStock[];
    total: number;
    scanDate: string | null;
    loading: boolean;
  }>({ items: [], total: 0, scanDate: null, loading: true });

  useEffect(() => {
    fetch("/api/proxy/scan/daily?strategy=all&limit=5&sort=ncav_ratio&order=desc")
      .then(r => r.json())
      .then((data: any) => {
        if (data.success) {
          setPreview({ items: data.data, total: data.meta.total, scanDate: data.meta.scanDate, loading: false });
        } else {
          setPreview(p => ({ ...p, loading: false }));
        }
      })
      .catch(() => setPreview(p => ({ ...p, loading: false })));
  }, []);

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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/8 border border-blue-500/20 mb-8">
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

          <p className="text-zinc-500 dark:text-zinc-400 text-base md:text-lg font-medium leading-relaxed mb-8 max-w-xl mx-auto">
            벤자민 그레이엄의 NCAV 원칙 기반 퀀트 스크리너.
            <br className="hidden md:block" />
            감이 아닌 데이터로 저평가 종목을 발굴하세요.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-7">
            <Link href="/login"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-lg shadow-blue-600/25 transition-all"
            >
              무료로 시작하기
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
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
          className="mb-5 flex items-end justify-between gap-4"
        >
          <div>
            <h2 className="text-lg font-black tracking-tight">오늘의 발굴 종목</h2>
            {preview.scanDate && !preview.loading && (
              <p className="text-xs text-zinc-400 mt-0.5">
                {preview.scanDate.slice(0, 4)}.{preview.scanDate.slice(4, 6)}.{preview.scanDate.slice(6, 8)} 스캔 기준
                {preview.total > 0 && <> · 총 <span className="font-bold text-zinc-600 dark:text-zinc-300">{preview.total}개</span></>}
              </p>
            )}
          </div>
          <Link
            href="/login"
            className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors"
          >
            전체 보기 <ChevronRight size={12} />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.06 }}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 shadow-sm"
        >
          <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 hidden sm:grid grid-cols-[1fr_80px_60px_60px] gap-4">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">종목</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">NCAV 비율</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">PBR</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">PER</span>
          </div>

          {preview.loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">불러오는 중...</span>
            </div>
          ) : preview.items.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-sm">스캔 데이터가 없습니다.</div>
          ) : (
            <>
              {preview.items.slice(0, 3).map((item) => (
                <div
                  key={item.ticker}
                  className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60 flex sm:grid sm:grid-cols-[1fr_80px_60px_60px] gap-3 sm:gap-4 items-center"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-sm text-zinc-900 dark:text-white truncate">{item.name}</p>
                      {item.strategies.slice(0, 2).map(s => (
                        <span key={s} className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                          {STRATEGY_LABEL[s] ?? s}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.ticker}</p>
                  </div>
                  <span className="text-sm font-black tabular-nums text-blue-600 dark:text-blue-400 text-right">
                    {item.ncav_ratio != null ? `${item.ncav_ratio.toFixed(2)}x` : "-"}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-500 text-right hidden sm:block">
                    {item.pbr != null ? item.pbr.toFixed(2) : "-"}
                  </span>
                  <span className="text-sm tabular-nums text-zinc-500 text-right hidden sm:block">
                    {item.per != null && item.per > 0 ? item.per.toFixed(1) : "-"}
                  </span>
                </div>
              ))}

              {preview.items.length > 3 && (
                <div className="relative">
                  {preview.items.slice(3).map((item) => (
                    <div
                      key={item.ticker}
                      className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/60 flex sm:grid sm:grid-cols-[1fr_80px_60px_60px] gap-3 sm:gap-4 items-center blur-sm select-none pointer-events-none"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">{item.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{item.ticker}</p>
                      </div>
                      <span className="text-sm font-black tabular-nums text-blue-600 dark:text-blue-400 text-right">
                        {item.ncav_ratio != null ? `${item.ncav_ratio.toFixed(2)}x` : "-"}
                      </span>
                      <span className="text-sm tabular-nums text-zinc-500 text-right hidden sm:block">
                        {item.pbr != null ? item.pbr.toFixed(2) : "-"}
                      </span>
                      <span className="text-sm tabular-nums text-zinc-500 text-right hidden sm:block">
                        {item.per != null && item.per > 0 ? item.per.toFixed(1) : "-"}
                      </span>
                    </div>
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-zinc-900/70 backdrop-blur-[1px]">
                    <Link
                      href="/login"
                      className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold shadow-lg shadow-blue-600/20 transition-all"
                    >
                      <Lock size={13} />
                      로그인하여 전체 {preview.total}개 보기
                      <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
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
              { label: "종목 발굴", href: "/login" },
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
