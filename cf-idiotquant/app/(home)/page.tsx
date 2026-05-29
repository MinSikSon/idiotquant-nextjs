"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Search, Calculator, BarChart3, Lock, ArrowRight,
  TrendingUp, ChevronRight, Activity, Shield,
  Database, Star, CheckCircle2, Layers,
  DollarSign, Coins, AreaChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =========================================================================
// 데이터
// =========================================================================
const SERVICES = [
  {
    title: "적정 주가 분석",
    subtitle: "Intrinsic Value Engine",
    description:
      "NCAV, S-RIM, DCF, PER, PEG, PBR 6가지 밸류에이션 모델을 병렬 실행하여 기업의 본질 가치를 정밀 산출합니다.",
    icon: Search,
    link: "/search",
    highlight: true,
    badge: "Most Used",
    market: null,
    preview: [
      { label: "삼성전자", value: "82,400원", change: "+7.9%", up: true },
      { label: "NAVER",  value: "198,000원", change: "-2.1%", up: false },
      { label: "카카오",  value: "56,500원",  change: "+12.3%", up: true },
    ],
  },
  {
    title: "수익률 계산기",
    subtitle: "Profit Simulator",
    description:
      "매수가·목표가·거래세·수수료·복리 효과를 통합 시뮬레이션해 실제 세후 순수익률을 예측합니다.",
    icon: Calculator,
    link: "/calculator",
    badge: null,
    market: null,
    preview: [
      { label: "단순 수익률",   value: "+18.4%" },
      { label: "세후 수익률",   value: "+15.2%" },
      { label: "연환산 수익률", value: "+9.7%"  },
    ],
  },
  {
    title: "퀀트 종목 추천",
    subtitle: "Quant Portfolio",
    description:
      "NCAV 청산가치 기준으로 국내·미국 저평가 종목을 자동 탐색합니다. 그레이엄 원칙에 기반한 퀀트 스크리너입니다.",
    icon: BarChart3,
    link: "/algorithm-trade",
    requiresAuth: true,
    badge: "Pro",
    market: null,
    preview: [
      { label: "이번 주 추천 종목", value: "12개" },
      { label: "NCAV 충족 비율",   value: "94%" },
      { label: "그레이엄 안전마진",  value: "≤67%" },
    ],
  },
];

const VALUATION_MODELS = [
  { name: "NCAV",  desc: "순유동자산 청산가치",  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  { name: "S-RIM", desc: "초과수익 잔여이익",    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { name: "DCF",   desc: "잉여현금흐름 할인",    color: "text-purple-600 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  { name: "PER",   desc: "이익 멀티플 밴드",     color: "text-indigo-600 dark:text-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { name: "PEG",   desc: "성장가치 조정 배수",   color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-amber-950/30" },
  { name: "PBR",   desc: "자본밴드 역산",        color: "text-cyan-600 dark:text-cyan-400",      bg: "bg-cyan-50 dark:bg-cyan-950/30" },
];

const HOW_IT_WORKS = [
  { step: "01", icon: Search,     title: "종목 검색",      desc: "국내 KRX 전 종목과 NASDAQ·NYSE·AMEX 상장 종목을 티커 또는 종목명으로 검색합니다." },
  { step: "02", icon: BarChart3,  title: "6가지 모델 분석", desc: "최신 재무제표 기반으로 6가지 밸류에이션 모델이 즉시 실행되고 목표주가를 산출합니다." },
  { step: "03", icon: Calculator, title: "수익 시뮬레이션", desc: "매수 시나리오별 세후 순수익과 연환산 수익률을 입력 직후 바로 확인합니다." },
];

const PRODUCT_FACTS = [
  { value: "6가지", label: "밸류에이션 모델",  icon: Layers,    color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  { value: "KR + US", label: "시장 통합 지원", icon: AreaChart, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { value: "무료",   label: "기본 분석 제공",  icon: Shield,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { value: "실시간", label: "재무 데이터 연동", icon: Database,  color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30" },
];

// =========================================================================
// 홈 페이지
// =========================================================================
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroY      = useTransform(scrollYProgress, [0, 1], [0, 50]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 antialiased selection:bg-blue-500/20">

      {/* ── 히어로 ── */}
      <header ref={heroRef} className="relative pt-28 pb-24 px-6 overflow-hidden">

        {/* 배경 그리드 */}
        <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* 배경 글로우 */}
        <div className="absolute -top-40 -left-20 w-[700px] h-[500px] bg-blue-500/6 blur-[160px] rounded-full -z-10 dark:bg-blue-600/10" />
        <div className="absolute -top-20 right-0 w-[500px] h-[400px] bg-indigo-500/6 blur-[140px] rounded-full -z-10 dark:bg-indigo-600/8" />

        <motion.div style={{ opacity: heroOpacity, y: heroY }}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          {/* 상태 배지 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/8 border border-blue-500/20 mb-10"
          >
            <Activity size={12} className="text-blue-500 animate-pulse" />
            <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em]">
              IdiotQuant &nbsp;·&nbsp; 실시간 분석 · 무료 제공
            </span>
          </motion.div>

          {/* 헤드라인 */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(2.6rem,7vw,5.5rem)] font-black leading-[1.04] tracking-tight mb-7"
          >
            <span className="block text-zinc-900 dark:text-white">데이터가 말하는</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500">
              진짜 주가를 찾아라.
            </span>
          </motion.h1>

          {/* 서브 카피 */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
            className="max-w-2xl mx-auto text-zinc-500 dark:text-zinc-400 text-lg font-medium leading-relaxed mb-10"
          >
            감에 의존한 투자는 끝냅니다.
            <br className="hidden md:block" />
            6가지 밸류에이션 모델과 NCAV 퀀트 전략으로 저평가 종목을 정밀하게 발굴하세요.
          </motion.p>

          {/* CTA 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="flex flex-wrap justify-center gap-3 mb-10"
          >
            <Link href="/search"
              className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold tracking-wide transition-all duration-200 shadow-lg shadow-blue-600/25"
            >
              무료로 분석 시작하기
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/algorithm-trade"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-bold tracking-wide hover:border-zinc-400 dark:hover:border-zinc-500 transition-all duration-200"
            >
              퀀트 전략 보기
            </Link>
          </motion.div>

          {/* 신뢰 신호 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-xs text-zinc-400 dark:text-zinc-500 font-medium"
          >
            {["신용카드 불필요", "무료 플랜 영구 제공", "DART 공시 연동", "한국투자증권 API"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </header>

      {/* ── 제품 사실 스트립 ── */}
      <section className="border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 divide-x divide-zinc-200 dark:divide-zinc-800">
          {PRODUCT_FACTS.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex flex-col items-center justify-center text-center py-4 px-4 gap-2"
              >
                <div className={cn("p-2 rounded-xl", f.bg)}>
                  <Icon size={16} className={f.color} strokeWidth={2} />
                </div>
                <div>
                  <p className={cn("text-xl font-black tracking-tight", f.color)}>{f.value}</p>
                  <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-0.5 leading-tight">{f.label}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── 서비스 카드 ── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-3">Core Services</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">
              투자 의사결정의{" "}
              <span className="text-zinc-400 dark:text-zinc-600">모든 단계를 커버합니다.</span>
            </h2>
          </div>
          <p className="max-w-sm text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
            종목 발굴부터 수익 시뮬레이션, 포트폴리오 구성까지 —
            하나의 플랫폼에서 완결됩니다.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SERVICES.map((svc, i) => {
            const Icon = svc.icon;
            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
              >
                <Link href={svc.link} className="group block h-full">
                  <div className={cn(
                    "relative h-full flex flex-col p-7 rounded-2xl border transition-all duration-300",
                    svc.highlight
                      ? "bg-white dark:bg-zinc-900 border-blue-500/40 shadow-xl shadow-blue-500/8 hover:shadow-blue-500/15"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-lg"
                  )}>
                    {/* 상단: 아이콘 + 배지 */}
                    <div className="flex items-start justify-between mb-7">
                      <div className={cn(
                        "p-3.5 rounded-xl transition-colors",
                        svc.highlight
                          ? "bg-blue-600 text-white group-hover:bg-blue-700"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}>
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <div className="flex items-center gap-2">
                        {svc.badge === "Pro" && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-tight">
                            <Lock size={9} />Pro
                          </span>
                        )}
                        {svc.badge === "Most Used" && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                            <Star size={9} />인기
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 타이틀 */}
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.18em] mb-1.5">{svc.subtitle}</p>
                      <h3 className="text-xl font-black flex items-center gap-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                        {svc.title}
                        <ChevronRight size={18} className="-translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                      </h3>
                    </div>

                    {/* 설명 */}
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed mb-6 flex-1">
                      {svc.description}
                    </p>

                    {/* 샘플 아웃풋 */}
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-700/50 flex items-center gap-1.5">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                          <span className="w-2 h-2 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-0.5">Sample Output</span>
                      </div>
                      <div className="px-4 py-3 space-y-2.5">
                        {svc.preview.map((row, ri) => (
                          <div key={ri} className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{row.label}</span>
                            <div className="flex items-center gap-2">
                              {"change" in row && row.change && (
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                                  row.up
                                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                                    : "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                                )}>
                                  {row.change}
                                </span>
                              )}
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 tabular-nums">{row.value}</span>
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
      </section>

      {/* ── 밸류에이션 모델 ── */}
      <section className="border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-3">Valuation Models</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
              6가지 모델로 동시에 검증합니다
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
              단일 모델의 한계를 보완하기 위해 자산가치 계열 2가지, 수익성 계열 4가지를 병렬로 실행합니다.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {VALUATION_MODELS.map((m, i) => (
              <motion.div key={m.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-center hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <span className={cn("text-2xl font-black font-mono tracking-tight", m.color)}>{m.name}</span>
                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">{m.desc}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 사용 방법 ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-[11px] font-extrabold text-blue-500 uppercase tracking-[0.2em] mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">3단계로 끝나는 가치 투자</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* 연결선 */}
            <div className="hidden md:block absolute top-8 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-gradient-to-r from-zinc-200 via-blue-400/40 to-zinc-200 dark:from-zinc-800 dark:via-blue-600/30 dark:to-zinc-800" />

            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center text-center relative"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center mb-5 relative z-10">
                    <Icon size={24} className="text-blue-600 dark:text-blue-400" strokeWidth={1.8} />
                    <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-sm shadow-blue-600/30">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-black mb-2">{item.title}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 시장 커버리지 ── */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                flag: "🇰🇷",
                title: "국내 시장 (KRX)",
                desc: "KOSPI·KOSDAQ 전 종목을 지원합니다. 한국투자증권 API 기반 실시간 재무제표로 NCAV, S-RIM, PBR, PER 밴드를 즉시 산출합니다.",
                markets: ["KOSPI", "KOSDAQ"],
                icon: Coins,
                color: "text-indigo-600 dark:text-indigo-400",
                border: "border-indigo-200/60 dark:border-indigo-800/40",
                bg: "bg-indigo-50 dark:bg-indigo-950/20",
              },
              {
                flag: "🇺🇸",
                title: "미국 시장 (US)",
                desc: "NASDAQ·NYSE·AMEX 상장 종목을 지원합니다. Finnhub US-GAAP 재무 데이터로 동일한 기준의 퀀트 분석을 제공합니다.",
                markets: ["NASDAQ", "NYSE", "AMEX"],
                icon: DollarSign,
                color: "text-blue-600 dark:text-blue-400",
                border: "border-blue-200/60 dark:border-blue-800/40",
                bg: "bg-blue-50 dark:bg-blue-950/20",
              },
            ].map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={cn("rounded-2xl border p-6 bg-white dark:bg-zinc-900", m.border)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={cn("p-3 rounded-xl shrink-0", m.bg)}>
                      <Icon size={18} className={m.color} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lg">{m.flag}</span>
                        <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">{m.title}</h3>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {m.markets.map(mk => (
                          <span key={mk} className={cn("text-[10px] font-black px-2 py-0.5 rounded font-mono", m.bg, m.color)}>
                            {mk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">{m.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA 배너 ── */}
      <section className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-12 md:p-16 text-center relative overflow-hidden"
        >
          {/* 배경 그리드 */}
          <div className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* 글로우 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-white/10 blur-[60px] rounded-full" />

          <div className="relative z-10">
            <Shield size={36} className="text-blue-200 mx-auto mb-5 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
              지금 바로 시작하세요.
            </h2>
            <p className="text-blue-100 text-base font-medium mb-8 max-w-lg mx-auto leading-relaxed">
              가입 없이도 기본 분석 기능을 무료로 사용할 수 있습니다.
              <br className="hidden md:block" />
              데이터는 거짓말을 하지 않습니다.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/search"
                className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-blue-700 text-sm font-extrabold tracking-wide hover:bg-blue-50 active:bg-blue-100 transition-all shadow-lg shadow-blue-900/20"
              >
                무료 분석 시작하기
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/algorithm-trade"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/25 text-white text-sm font-bold tracking-wide hover:bg-white/10 transition-all"
              >
                퀀트 전략 보기
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 푸터 ── */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" strokeWidth={2.5} />
                <span className="text-base font-black tracking-tight">IDIOT QUANT</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium max-w-xs leading-relaxed">
                데이터 기반 가치 투자 플랫폼.<br />
                벤자민 그레이엄의 NCAV 원칙을 현대적으로 구현합니다.
              </p>
              <div className="flex items-center gap-3 pt-1">
                {["종목 분석", "계산기", "퀀트 전략"].map(l => (
                  <Link key={l} href={l === "종목 분석" ? "/search" : l === "계산기" ? "/calculator" : "/algorithm-trade"}
                    className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors font-medium"
                  >
                    {l}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2">
              <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.3em]">
                © 2026 IDIOT QUANT
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 md:text-right leading-relaxed max-w-xs">
                본 서비스는 투자 참고 목적의 분석 자료를 제공하며,
                투자 결과에 대한 법적 책임을 지지 않습니다.
              </p>
              <p className="text-[10px] text-zinc-300 dark:text-zinc-600 font-mono">
                Powered by Korea Investment API · Finnhub
              </p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
