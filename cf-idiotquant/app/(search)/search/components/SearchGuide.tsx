"use client";

import {
  Globe,
  Layers,
  Trophy,
  Sparkles,
  ArrowRight,
  Search,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  CheckCircle,
  Database,
  Coins,
  DollarSign,
  Star,
  BookOpen,
} from "lucide-react";
import { StockCard } from "./StockCard";
import { cn } from "@/lib/utils";

// ===========================
// 데이터
// ===========================
const GUIDE_CARDS = [
  {
    stock: {
      isUs: false,
      name: "삼성전자",
      sector: "CHIP",
      ticker: "005930",
      grade: "S",
      curPrice: 78500,
      per: 12.5,
      pbr: 1.4,
      ncavScore: 0.85,
      debtRatio: 15.2,
      isGuide: true,
    },
    chartConfig: {
      data: [72000, 73500, 75000, 74200, 76500, 78500],
      categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
      color: "#3b82f6",
    },
    market: "KRX",
    marketColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30",
    title: "정밀한 내재가치 산출",
    desc: "NCAV와 S-RIM 알고리즘을 결합해 시장 소음에 영향받지 않는 기업의 본질 가치를 계산합니다. 유동자산에서 총부채를 차감한 순자산가치 기준으로 현재 주가의 저평가 여부를 판단합니다.",
    icon: <Layers className="w-3.5 h-3.5" />,
    aura: "bg-gradient-to-tr from-blue-400 to-cyan-500",
  },
  {
    stock: {
      isUs: true,
      name: "Apple Inc.",
      sector: "CHIP",
      ticker: "AAPL",
      grade: "SS",
      curPrice: 195.2,
      per: 28.4,
      pbr: 35.2,
      ncavScore: 0.92,
      debtRatio: 8.5,
      isGuide: true,
    },
    chartConfig: {
      data: [175.5, 182.1, 180.4, 189.9, 192.3, 195.2],
      categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
      color: "#818cf8",
    },
    market: "NASDAQ",
    marketColor: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-900/30",
    title: "글로벌 마켓 통합 스크리닝",
    desc: "NASDAQ·NYSE·AMEX 상장 종목을 국내 주식과 동일한 기준으로 분석합니다. Finnhub API의 US-GAAP 재무 데이터를 환율 보정 없이 원화·달러 동시 표시하여 비교합니다.",
    icon: <Globe className="w-3.5 h-3.5" />,
    aura: "bg-gradient-to-tr from-amber-400 to-orange-500",
  },
  {
    stock: {
      isUs: false,
      name: "NCAV 절대 전략",
      sector: "FLOW",
      ticker: "QUANT",
      grade: "SSS",
      curPrice: 999999,
      per: 3.2,
      pbr: 0.4,
      ncavScore: 0.99,
      debtRatio: 0.1,
      isGuide: true,
    },
    chartConfig: {
      data: [100000, 250000, 430000, 610000, 850000, 999999],
      categories: ["M1", "M2", "M3", "M4", "M5", "M6"],
      color: "#ec4899",
    },
    market: "NCAV SSS",
    marketColor: "bg-pink-50 text-pink-700 dark:bg-pink-950/50 dark:text-pink-400 border-pink-100/50 dark:border-pink-900/30",
    title: "청산가치 절대 저평가",
    desc: "벤자민 그레이엄의 Net-Net 원칙에 따라 시가총액이 순유동자산의 67% 미만인 종목을 발굴합니다. 하방이 자산으로 보호된 극단적 저평가 구간에서만 진입 신호를 발생시킵니다.",
    icon: <Trophy className="w-3.5 h-3.5" />,
    aura: "bg-gradient-to-tr from-pink-500 to-purple-600",
  },
];

const VALUATION_MODELS = [
  { name: "NCAV", desc: "순유동자산 청산가치", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { name: "S-RIM", desc: "초과수익 잔여이익", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { name: "DCF", desc: "잉여현금흐름 할인", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { name: "PER", desc: "이익 멀티플 밴드", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { name: "PEG", desc: "성장가치 조정 배수", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { name: "PBR", desc: "자본밴드 역산", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <Search className="w-5 h-5" />,
    title: "종목 검색",
    desc: "국내 종목명 또는 미국 티커를 입력합니다. KRX 전 종목과 NASDAQ·NYSE·AMEX 상장 종목을 지원합니다.",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200/60 dark:border-blue-900/40",
  },
  {
    step: "02",
    icon: <BarChart3 className="w-5 h-5" />,
    title: "자동 분석",
    desc: "최신 재무제표를 기반으로 6가지 밸류에이션 모델이 즉시 실행됩니다. 각 모델별 목표주가와 상승 여력이 산출됩니다.",
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    border: "border-purple-200/60 dark:border-purple-900/40",
  },
  {
    step: "03",
    icon: <TrendingUp className="w-5 h-5" />,
    title: "투자 판단",
    desc: "NCAV 등급(SSS~F)과 모델별 수익률을 비교하여 안전마진이 확보된 종목인지 빠르게 확인합니다.",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200/60 dark:border-emerald-900/40",
  },
];

const KEY_FEATURES = [
  { icon: <ShieldCheck className="w-4 h-4" />, title: "안전마진 검증", desc: "그레이엄 기준 시가총액 ≤ NCAV×0.67 충족 여부를 자동 판별합니다." },
  { icon: <Database className="w-4 h-4" />, title: "실시간 재무 데이터", desc: "한국투자증권 API와 Finnhub을 통해 최신 재무제표를 실시간으로 조회합니다." },
  { icon: <Coins className="w-4 h-4" />, title: "국내 주식 (KRX)", desc: "재무상태표·손익계산서·현금흐름표 기반의 정밀 밸류에이션을 제공합니다." },
  { icon: <DollarSign className="w-4 h-4" />, title: "미국 주식 (US)", desc: "US-GAAP 기준 Finnhub 재무 데이터로 해외 종목을 동일 잣대로 분석합니다." },
  { icon: <Star className="w-4 h-4" />, title: "관심 종목 저장", desc: "자주 조회하는 종목을 즐겨찾기에 추가해 빠르게 접근할 수 있습니다." },
  { icon: <BookOpen className="w-4 h-4" />, title: "모델 상세 가이드", desc: "각 밸류에이션 모델의 가정·산식·적합 종목 유형을 툴팁으로 바로 확인합니다." },
];

// ===========================
// SearchGuide 컴포넌트
// ===========================
export const SearchGuide = () => {
  return (
    <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 md:pt-20 md:pb-16 animate-in fade-in slide-in-from-bottom-6 duration-700 overflow-hidden selection:bg-blue-500/20">

      {/* ── 1. 히어로 ── */}
      <header className="flex flex-col items-center text-center mb-16 space-y-7 relative w-full max-w-4xl">
        {/* 배경 글로우 */}
        <div className="absolute -top-24 w-80 h-80 bg-gradient-to-tr from-blue-500/8 to-purple-500/8 rounded-full blur-[130px] -z-10 animate-pulse" />

        {/* 라이브 뱃지 */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em] font-mono">
            실시간 분석 · 무료 제공
          </span>
        </div>

        {/* 헤드라인 */}
        <div className="space-y-3">
          <p className="text-xs sm:text-sm font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono">
            NCAV · S-RIM · DCF · PER · PEG · PBR
          </p>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[1.05] break-keep">
            6가지 모델로<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400">
              내재가치를 산출합니다
            </span>
          </h1>
        </div>

        {/* 서브 카피 */}
        <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg max-w-xl break-keep leading-relaxed">
          국내 KRX 전 종목과 미국 NASDAQ·NYSE·AMEX 상장 종목을 검색하세요.
          벤자민 그레이엄의{" "}
          <span className="text-zinc-800 dark:text-zinc-200 font-semibold">안전마진 원칙</span>
          에 기반한 퀀트 분석 결과를 즉시 확인할 수 있습니다.
        </p>

        {/* 입력 유도 CTA */}
        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-bold shadow-lg shadow-zinc-900/10 dark:shadow-white/5 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-default select-none">
          <Search className="w-4 h-4" />
          <span>위 검색창에 종목명 또는 티커를 입력하세요</span>
          <ArrowRight className="w-4 h-4 opacity-60" />
        </div>
      </header>

      {/* ── 2. 핵심 지표 스트립 ── */}
      <div className="w-full max-w-3xl mb-20">
        <div className="grid grid-cols-3 gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          {[
            { value: "6가지", label: "밸류에이션 모델", color: "text-blue-600 dark:text-blue-400" },
            { value: "KR + US", label: "국내 · 미국 시장 통합", color: "text-indigo-600 dark:text-indigo-400" },
            { value: "무료", label: "모든 분석 기능 제공", color: "text-emerald-600 dark:text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 py-1">
              <span className={cn("text-2xl sm:text-3xl font-black font-mono tracking-tight", s.color)}>{s.value}</span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. 밸류에이션 모델 목록 ── */}
      <section className="w-full mb-24">
        <div className="text-center mb-8">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">Valuation Models</p>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            6가지 방법으로 동시에 검증합니다
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-lg mx-auto">
            단일 모델의 한계를 보완하기 위해 자산가치 계열 2가지, 수익성 계열 4가지를 병렬로 실행합니다.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {VALUATION_MODELS.map((m) => (
            <div
              key={m.name}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm text-center"
            >
              <span className={cn("text-xl font-black font-mono tracking-tight", m.color)}>{m.name}</span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-tight">{m.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. 종목 카드 쇼케이스 ── */}
      <section className="w-full mb-28">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">Card Showcase</p>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            분석 결과는 카드로 요약됩니다
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-md mx-auto">
            카드를 클릭하면 뒤집어 밸류에이션 룰 가이드와 관심도 XP 현황을 확인할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-8 relative px-2">
          <div className="absolute top-[180px] left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800/80 to-transparent -z-20 hidden lg:block" />

          {GUIDE_CARDS.map((item, i) => (
            <div key={i} className="flex flex-col items-center group relative">

              {/* 3D 호버 카드 */}
              <div className="relative w-full flex justify-center transform transition-all duration-500 ease-out group-hover:-translate-y-6 group-hover:scale-[1.025] z-10">
                <StockCard stock={item.stock} chartConfig={item.chartConfig} />
                <div className={cn(
                  "absolute -z-10 inset-0 blur-[80px] rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none scale-75",
                  item.aura
                )} />
              </div>

              {/* 설명 카드 */}
              <div className="mt-8 w-full max-w-[325px] p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 border-b-[3px] border-b-zinc-200 dark:border-b-zinc-800 group-hover:border-b-blue-500 dark:group-hover:border-b-indigo-500 shadow-sm transition-all duration-400">

                <div className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider mb-4 font-mono border",
                  item.marketColor
                )}>
                  {item.icon}
                  {item.market}
                </div>

                <h3 className="text-zinc-900 dark:text-zinc-100 font-extrabold text-lg mb-2.5 tracking-tight group-hover:text-blue-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  {item.title}
                </h3>

                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. 사용 방법 (3단계) ── */}
      <section className="w-full mb-24">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">How It Works</p>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            3단계로 끝납니다
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="relative flex flex-col gap-4 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {/* 연결선 (마지막 제외) */}
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 z-10 -translate-y-1/2">
                  <ArrowRight className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className={cn("p-2.5 rounded-xl border", step.bg, step.border)}>
                  <span className={step.color}>{step.icon}</span>
                </div>
                <span className="text-3xl font-black font-mono text-zinc-100 dark:text-zinc-800 leading-none select-none">
                  {step.step}
                </span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white mb-1.5 tracking-tight">{step.title}</h3>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep font-medium">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. 세부 기능 그리드 ── */}
      <section className="w-full mb-24">
        <div className="text-center mb-10">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">Features</p>
          <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
            분석에 필요한 모든 기능
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {KEY_FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-4 p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-600 dark:text-zinc-400 shrink-0 mt-0.5">
                {f.icon}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white mb-1 tracking-tight">{f.title}</h4>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 7. 투자 원칙 안내 ── */}
      <div className="w-full max-w-2xl mb-24 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest font-mono">Investment Disclaimer</p>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">
          본 서비스의 분석 결과는 <span className="text-zinc-700 dark:text-zinc-300 font-semibold">벤자민 그레이엄의 가치투자 원칙</span>에 근거한 정량적 참고 자료입니다.
          실제 투자 결정은 본인의 판단과 책임하에 이루어져야 하며, 본 서비스는 투자 권유를 목적으로 하지 않습니다.
        </p>
      </div>

      {/* ── 8. 푸터 ── */}
      <footer className="w-full flex flex-col items-center gap-5">
        <div className="flex items-center gap-4 w-full max-w-xs">
          <div className="flex-1 h-px bg-gradient-to-l from-zinc-200 dark:from-zinc-800 to-transparent" />
          <div className="flex gap-1.5">
            {[0, 1, 2].map((n) => (
              <div key={n} className={cn("rounded-full bg-zinc-300 dark:bg-zinc-700", n === 1 ? "w-3 h-1.5" : "w-1.5 h-1.5")} />
            ))}
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-zinc-200 dark:from-zinc-800 to-transparent" />
        </div>

        <div className="flex items-center gap-6 text-[11px] text-zinc-400 dark:text-zinc-600 font-mono">
          <span className="flex items-center gap-1.5 font-bold">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Korea Investment API
          </span>
          <span className="flex items-center gap-1.5 font-bold">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Finnhub US Market
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 dark:text-zinc-600 font-mono font-bold">
          © 2026 IDIOTQUANT · Deep Value Investment Platform
        </p>
      </footer>
    </div>
  );
};
