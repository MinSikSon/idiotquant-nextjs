"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Search,
  Calculator,
  BarChart3,
  Lock,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Activity,
  Zap,
  Shield,
  Users,
  Database,
  Star,
} from "lucide-react";

/* ─────────────────────────────────────────────
   MOCK TICKER DATA
───────────────────────────────────────────── */
const TICKERS = [
  { symbol: "KOSPI", value: "2,748.31", change: "+0.84%", up: true },
  { symbol: "KOSDAQ", value: "841.92", change: "-0.32%", up: false },
  { symbol: "S&P500", value: "5,304.72", change: "+0.63%", up: true },
  { symbol: "NASDAQ", value: "16,742.39", change: "+0.91%", up: true },
  { symbol: "USD/KRW", value: "1,342.50", change: "-0.12%", up: false },
  { symbol: "삼성전자", value: "76,400", change: "+1.20%", up: true },
  { symbol: "SK하이닉스", value: "198,500", change: "+2.47%", up: true },
  { symbol: "NVDA", value: "894.52", change: "+3.14%", up: true },
];

/* ─────────────────────────────────────────────
   STATS
───────────────────────────────────────────── */
const STATS = [
  { label: "분석 완료 종목", value: "4,200+", icon: Database },
  { label: "누적 사용자", value: "18,000+", icon: Users },
  { label: "평균 수익률 개선", value: "+23.4%", icon: TrendingUp },
  { label: "알고리즘 정확도", value: "91.2%", icon: Zap },
];

/* ─────────────────────────────────────────────
   SERVICES
───────────────────────────────────────────── */
const SERVICES = [
  {
    title: "적정 주가 분석",
    subtitle: "Intrinsic Value Engine",
    description:
      "DCF, PBR, PER, EV/EBITDA 등 7가지 밸류에이션 모델을 병렬 실행하여 기업의 본질 가치를 정밀 산출합니다.",
    icon: Search,
    link: "/search",
    highlight: true,
    badge: "Most Used",
    preview: [
      { label: "삼성전자", value: "82,400원", gap: "+7.9%" },
      { label: "NAVER", value: "198,000원", gap: "-2.1%" },
      { label: "카카오", value: "56,500원", gap: "+12.3%" },
    ],
  },
  {
    title: "수익률 계산기",
    subtitle: "Profit Simulator",
    description:
      "매수가·목표가·거래세·수수료·복리 효과를 통합 시뮬레이션해 실제 순수익률을 정확히 예측합니다.",
    icon: Calculator,
    link: "/calculator",
    badge: null,
    preview: [
      { label: "단순 수익률", value: "+18.4%" },
      { label: "세후 수익률", value: "+15.2%" },
      { label: "연환산 수익률", value: "+9.7%" },
    ],
  },
  {
    title: "퀀트 종목 추천",
    subtitle: "Quant Portfolio",
    description:
      "NCAV, F-Score, PBR·ROE 매트릭스를 결합한 멀티팩터 전략으로 저평가 우량주를 자동 선별합니다.",
    icon: BarChart3,
    link: "/algorithm-trade",
    requiresAuth: true,
    badge: "Pro",
    preview: [
      { label: "이번 주 추천 종목", value: "12개" },
      { label: "NCAV 충족 비율", value: "94%" },
      { label: "백테스트 CAGR", value: "+31.7%" },
    ],
  },
];

/* ─────────────────────────────────────────────
   TESTIMONIALS
───────────────────────────────────────────── */
const REVIEWS = [
  {
    text: "적정주가 분석 기능 덕분에 막연했던 가치 투자에 기준이 생겼습니다.",
    author: "개인투자자 K모씨",
    role: "3년차 주식 투자자",
  },
  {
    text: "퀀트 추천 포트폴리오로 6개월 만에 시장 대비 +14% 초과 수익을 달성했습니다.",
    author: "직장인 L모씨",
    role: "Pro 플랜 사용자",
  },
  {
    text: "수수료·세금까지 고려한 순수익 계산이 다른 서비스엔 없었어요.",
    author: "전업 투자자 P모씨",
    role: "10년차 퀀트 투자자",
  },
];

/* ─────────────────────────────────────────────
   TICKER BANNER
───────────────────────────────────────────── */
function TickerBanner() {
  const doubled = [...TICKERS, ...TICKERS];
  return (
    <div className="relative w-full overflow-hidden border-y border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 py-2.5">
      <div className="flex gap-0 animate-ticker whitespace-nowrap">
        {doubled.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 px-6 text-xs font-mono border-r border-zinc-200 dark:border-zinc-800"
          >
            <span className="font-bold text-zinc-700 dark:text-zinc-300 tracking-tight">
              {t.symbol}
            </span>
            <span className="text-zinc-500">{t.value}</span>
            <span
              className={`flex items-center gap-0.5 font-semibold ${
                t.up ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {t.up ? (
                <TrendingUp size={11} />
              ) : (
                <TrendingDown size={11} />
              )}
              {t.change}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COUNTER ANIMATION
───────────────────────────────────────────── */
function AnimatedNumber({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  return <span className={className}>{value}</span>;
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function ModernHomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0b] text-zinc-900 dark:text-zinc-50 font-sans antialiased selection:bg-blue-500/20 selection:text-blue-700 dark:selection:text-blue-300">
      {/* ── Ticker ── */}
      {/* <TickerBanner /> */}

      {/* ── Hero ── */}
      <header
        ref={heroRef}
        className="relative pt-28 pb-24 px-6 overflow-hidden"
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.025] dark:opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Aurora glows */}
        <div className="absolute -top-40 -left-20 w-[700px] h-[500px] bg-blue-500/8 blur-[160px] rounded-full -z-10 dark:bg-blue-600/12" />
        <div className="absolute -top-20 right-0 w-[500px] h-[400px] bg-indigo-500/8 blur-[140px] rounded-full -z-10 dark:bg-indigo-600/10" />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-10"
          >
            <Activity size={12} className="text-blue-500 animate-pulse" />
            <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-[0.18em]">
              Idiot Quant v3.0 &nbsp;·&nbsp; LIVE
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[1.04] tracking-tight mb-7"
          >
            <span className="block">데이터가 말하는</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500">
              진짜 주가를 찾아라.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-zinc-500 dark:text-zinc-400 text-lg font-medium leading-relaxed mb-12"
          >
            감에 의존한 투자는 이제 끝. 7가지 밸류에이션 모델과 NCAV 퀀트
            전략으로
            <br className="hidden md:block" />
            저평가 종목을 정밀하게 발굴하고, 수익률을 시뮬레이션하세요.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="flex flex-wrap justify-center gap-3"
          >
            <Link
              href="/search"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold tracking-wide transition-all duration-200 shadow-lg shadow-blue-600/30"
            >
              무료로 분석 시작하기
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              href="/algorithm-trade"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-bold tracking-wide hover:border-zinc-400 dark:hover:border-zinc-500 transition-all duration-200"
            >
              퀀트 전략 보기
            </Link>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex flex-wrap justify-center items-center gap-5 mt-10 text-xs text-zinc-400 dark:text-zinc-600 font-medium"
          >
            {["신용카드 불필요", "무료 플랜 제공", "DART 공시 연동", "실시간 업데이트"].map(
              (t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  {t}
                </span>
              )
            )}
          </motion.div>
        </motion.div>
      </header>

      {/* ── Stats Bar ── */}
      {/* <section className="border-y border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-0">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`flex flex-col items-center justify-center text-center py-5 px-4 ${
                  i < 3 ? "border-r border-zinc-200 dark:border-zinc-800" : ""
                }`}
              >
                <Icon
                  size={18}
                  className="text-blue-500 mb-2.5 opacity-80"
                  strokeWidth={1.8}
                />
                <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {s.value}
                </div>
                <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider mt-1">
                  {s.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section> */}

      {/* ── Services ── */}
      <main className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-3">
              Core Services
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              투자 의사결정의{" "}
              <span className="text-zinc-400 dark:text-zinc-600">
                모든 단계를 커버합니다.
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            종목 발굴부터 수익 시뮬레이션, 포트폴리오 구성까지 —
            하나의 플랫폼에서 완결됩니다.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: index * 0.12,
                  duration: 0.6,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="h-full"
              >
                <Link href={service.link} className="group block h-full">
                  <div
                    className={`relative h-full flex flex-col p-7 rounded-2xl border transition-all duration-300 ${
                      service.highlight
                        ? "bg-white dark:bg-zinc-900 border-blue-500/60 shadow-xl shadow-blue-500/10"
                        : "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg"
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-8">
                      <div
                        className={`p-3.5 rounded-xl ${
                          service.highlight
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <div className="flex items-center gap-2">
                        {service.badge === "Pro" && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-400/20 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                            <Lock size={9} />
                            Pro
                          </span>
                        )}
                        {service.badge === "Most Used" && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                            <Star size={9} />
                            인기
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title */}
                    <div className="mb-1.5">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.18em] mb-1.5">
                        {service.subtitle}
                      </p>
                      <h3 className="text-xl font-black flex items-center gap-1.5 group-hover:text-blue-500 transition-colors">
                        {service.title}
                        <ChevronRight
                          size={18}
                          className="-translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                        />
                      </h3>
                    </div>

                    {/* Desc */}
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-7 flex-1">
                      {service.description}
                    </p>

                    {/* Preview data */}
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-700/50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-700/50 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.16em]">
                          Sample Output
                        </span>
                      </div>
                      <div className="px-4 py-3 space-y-2.5">
                        {service.preview.map((row, ri) => (
                          <div
                            key={ri}
                            className="flex items-center justify-between"
                          >
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                              {row.label}
                            </span>
                            <div className="flex items-center gap-2">
                              {"gap" in row && (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    String(row.gap).startsWith("+")
                                      ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
                                      : "text-red-500 bg-red-500/10"
                                  }`}
                                >
                                  {row.gap}
                                </span>
                              )}
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 tabular-nums">
                                {row.value}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* ── How it Works ── */}
      <section className="bg-white dark:bg-zinc-900/40 border-y border-zinc-200 dark:border-zinc-800/60 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-3">
              How It Works
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              3단계로 끝나는 가치 투자
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-zinc-200 via-blue-400/40 to-zinc-200 dark:from-zinc-800 dark:via-blue-600/30 dark:to-zinc-800" />

            {[
              {
                step: "01",
                title: "종목 검색",
                desc: "KOSPI·KOSDAQ·미국 상장사 4,200여 개의 종목을 검색하세요.",
                icon: Search,
              },
              {
                step: "02",
                title: "밸류에이션 분석",
                desc: "7가지 모델이 병렬 실행되어 적정 주가와 안전마진을 도출합니다.",
                icon: BarChart3,
              },
              {
                step: "03",
                title: "수익 시뮬레이션",
                desc: "매수 시나리오별 세후 순수익과 연환산 수익률을 확인하세요.",
                icon: Calculator,
              },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center text-center relative"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 border border-blue-400/20 flex items-center justify-center mb-5 relative z-10">
                    <Icon
                      size={24}
                      className="text-blue-500"
                      strokeWidth={1.8}
                    />
                    <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-black mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      {/* <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-3">
              User Reviews
            </p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              투자자들의 실제 후기
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {REVIEWS.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, si) => (
                    <Star
                      key={si}
                      size={12}
                      className="text-amber-400 fill-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed mb-5 font-medium">
                  &ldquo;{r.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-black">
                    {r.author[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {r.author}
                    </p>
                    <p className="text-[10px] text-zinc-400">{r.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}

      {/* ── CTA Banner ── */}
      {/* <section className="px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-12 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }} />
          <Shield size={36} className="text-blue-200 mx-auto mb-5 opacity-80" />
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
            지금 바로 시작하세요.
          </h2>
          <p className="text-blue-200 text-base font-medium mb-8 max-w-lg mx-auto leading-relaxed">
            가입 없이도 기본 분석 기능을 무료로 사용할 수 있습니다.
            데이터는 거짓말을 하지 않습니다.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/search"
              className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-blue-700 text-sm font-extrabold tracking-wide hover:bg-blue-50 transition-all shadow-lg"
            >
              무료 분석 시작하기
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
            <Link
              href="/algorithm-trade"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/30 text-white text-sm font-bold tracking-wide hover:bg-white/10 transition-all"
            >
              Pro 플랜 알아보기
            </Link>
          </div>
        </motion.div>
      </section> */}

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-xl font-black tracking-tight">
              IDIOT QUANT
            </span>
            <p className="text-sm text-zinc-500 font-medium max-w-xs leading-relaxed">
              데이터 기반 가치 투자 플랫폼.
              <br />
              데이터는 거짓말을 하지 않습니다.
            </p>
            {/* <div className="flex gap-2 mt-2">
              {["서비스", "가격", "블로그", "고객센터"].map((l) => (
                <span
                  key={l}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
                >
                  {l}
                </span>
              ))}
            </div> */}
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.35em]">
              © 2026 IDIOT QUANT
            </p>
            <p className="text-[10px] text-zinc-400 text-right leading-relaxed max-w-xs">
              본 서비스는 투자 참고용이며, 투자 결과에 대한 법적 책임을
              지지 않습니다.
            </p>
          </div>
        </div>
      </footer>

      {/* ── Ticker CSS ── */}
      <style jsx global>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 28s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}