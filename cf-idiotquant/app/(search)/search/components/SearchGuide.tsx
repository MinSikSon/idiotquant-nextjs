"use client";

import Link from "next/link";
import {
  Search, ArrowRight, BarChart3, TrendingUp,
  CheckCircle, Sparkles, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =========================================================================
// 데이터
// =========================================================================
const QUICK_SEARCHES = [
  { label: "삼성전자",   ticker: "삼성전자",  market: "KR" },
  { label: "SK하이닉스", ticker: "SK하이닉스", market: "KR" },
  { label: "NAVER",      ticker: "NAVER",      market: "KR" },
  { label: "AAPL",       ticker: "AAPL",       market: "US" },
  { label: "NVDA",       ticker: "NVDA",       market: "US" },
  { label: "MSFT",       ticker: "MSFT",       market: "US" },
];

const GRADES = [
  { grade: "SSS", range: "+200% 이상", desc: "극단적 저평가", bg: "bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500", text: "text-white", glow: "shadow-pink-500/20" },
  { grade: "SS",  range: "+150% 이상", desc: "강한 저평가",   bg: "bg-amber-500",  text: "text-white", glow: "shadow-amber-500/20" },
  { grade: "S",   range: "+100% 이상", desc: "저평가",        bg: "bg-emerald-500", text: "text-white", glow: "shadow-emerald-500/20" },
  { grade: "A",   range: "+50% 이상",  desc: "적정 이하",     bg: "bg-slate-500",  text: "text-white", glow: "" },
  { grade: "B",   range: "0% 이상",    desc: "적정가 수준",   bg: "bg-zinc-200 dark:bg-[#3a3a3a]", text: "text-zinc-700 dark:text-zinc-200", glow: "" },
  { grade: "F",   range: "0% 미만",    desc: "고평가",        bg: "bg-red-500",    text: "text-white", glow: "shadow-red-500/20" },
];

const MODELS = [
  { name: "NCAV",  category: "자산가치", desc: "유동자산 − 총부채로 청산가치 계산",  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  { name: "PBR",   category: "자산가치", desc: "역사적 PBR 밴드 상·하단 역산",       color: "text-cyan-600 dark:text-cyan-400",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  { name: "S-RIM", category: "수익가치", desc: "ROE 기반 초과수익의 현재가치 합산",   color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { name: "DCF",   category: "수익가치", desc: "잉여현금흐름을 WACC로 할인",         color: "text-purple-600 dark:text-purple-400",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  { name: "PER",   category: "수익가치", desc: "EPS × 업종 평균 배수 밴드",          color: "text-indigo-600 dark:text-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { name: "PEG",   category: "수익가치", desc: "PER ÷ 이익성장률로 성장 프리미엄 조정", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
];

const MOCK_VALUATION = [
  { model: "NCAV",  target: "82,400",  ret: "+7.9%",  pct: 32, up: true },
  { model: "S-RIM", target: "96,200",  ret: "+26.0%", pct: 72, up: true },
  { model: "DCF",   target: "88,500",  ret: "+15.8%", pct: 52, up: true },
  { model: "PER",   target: "74,100",  ret: "−3.1%",  pct: 18, up: false },
  { model: "PBR",   target: "79,800",  ret: "+4.5%",  pct: 28, up: true },
];

// =========================================================================
// SearchGuide
// =========================================================================
export const SearchGuide = () => {
  return (
    <div className="w-full min-h-screen bg-stone-100 dark:bg-[#0d0d0d] selection:bg-blue-500/20">

      {/* ────────── 히어로 ────────── */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        {/* 배경 그리드 */}
        <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.06]"
          style={{
            backgroundImage: "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/5 dark:bg-blue-600/8 blur-[130px] rounded-full -z-10" />

        <div className="max-w-3xl mx-auto text-center">
          {/* 상태 배지 */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#2a2a2a] shadow-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em] font-mono">
              실시간 분석 · 무료 제공
            </span>
          </div>

          {/* 헤드라인 */}
          <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-black tracking-tighter text-zinc-900 dark:text-white leading-[1.04] mb-5 break-keep">
            종목 하나 검색하면<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
              6가지 모델이 즉시 실행됩니다
            </span>
          </h1>

          <p className="text-zinc-500 dark:text-zinc-400 text-base sm:text-lg font-medium leading-relaxed mb-10 break-keep max-w-xl mx-auto">
            벤자민 그레이엄의 청산가치(NCAV)부터 DCF, S-RIM까지 —
            국내·미국 종목의 본질 가치를 정량적으로 분석합니다.
          </p>

          {/* 검색창 유도 */}
          <div className="flex items-center gap-3 max-w-md mx-auto px-4 py-3.5 bg-white dark:bg-[#1a1a1a] border-2 border-dashed border-zinc-300 dark:border-[#222222] rounded-2xl mb-8 text-zinc-400 dark:text-zinc-500 cursor-default">
            <Search className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium flex-1 text-left">위 검색창에 종목명 또는 티커 입력</span>
            <ArrowRight className="w-4 h-4 shrink-0 opacity-40" />
          </div>

          {/* 빠른 검색 칩 */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">바로 검색:</span>
            {QUICK_SEARCHES.map(q => (
              <Link
                key={q.ticker}
                href={`/search?ticker=${encodeURIComponent(q.ticker)}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-150",
                  "hover:scale-105 active:scale-95",
                  q.market === "KR"
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60"
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100 dark:hover:bg-blue-950/60"
                )}
              >
                <span className="text-[9px] font-black opacity-50 uppercase tracking-wider">{q.market}</span>
                {q.label}
                <ChevronRight className="w-3 h-3 opacity-40" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── 아웃풋 프리뷰 ────────── */}
      <section className="px-4 pb-20 border-t border-zinc-200 dark:border-[#2a2a2a] pt-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">Output Preview</p>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              검색하면 이런 결과가 나옵니다
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">아래는 삼성전자 샘플 분석 결과입니다.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* 종목 요약 카드 */}
            <div className="lg:col-span-2 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-[#2a2a2a] p-6 shadow-sm flex flex-col gap-5">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-400 flex items-center justify-center text-white text-[11px] font-black shrink-0">삼성</div>
                  <div>
                    <p className="font-black text-zinc-900 dark:text-white text-sm leading-tight">삼성전자</p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">005930 · KRX</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-3 py-1.5 rounded-xl text-sm font-black font-mono bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">S</span>
                  <span className="text-[9px] text-zinc-400 font-mono">등급</span>
                </div>
              </div>

              {/* 가격 & NCAV */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-stone-100 dark:bg-[#1a1a1a]/50 rounded-xl border border-zinc-100 dark:border-[#2a2a2a]">
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1">현재가</p>
                  <p className="text-lg font-black text-zinc-900 dark:text-white font-mono">₩78,500</p>
                </div>
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">NCAV 업사이드</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">+47.3%</p>
                </div>
              </div>

              {/* 안전마진 바 */}
              <div>
                <div className="flex justify-between text-[10px] font-bold mb-1.5">
                  <span className="text-zinc-400 uppercase tracking-wider">안전마진 (≤ NCAV × 0.67)</span>
                  <span className="text-emerald-600 dark:text-emerald-400">충족 ✓</span>
                </div>
                <div className="h-1.5 bg-stone-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full w-[67%] bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" />
                </div>
              </div>

              {/* 하단 지표 */}
              <div className="flex gap-0 pt-3 border-t border-zinc-100 dark:border-[#2a2a2a]">
                {[["PER", "12.5x"], ["PBR", "1.4x"], ["EPS", "₩6,280"]].map(([k, v], i) => (
                  <div key={k} className={cn("flex-1 text-center py-1", i < 2 && "border-r border-zinc-100 dark:border-[#2a2a2a]")}>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{k}</p>
                    <p className="text-xs font-black font-mono text-zinc-700 dark:text-zinc-300 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 밸류에이션 테이블 */}
            <div className="lg:col-span-3 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-[#2a2a2a] overflow-hidden shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-[#2a2a2a] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-extrabold text-zinc-700 dark:text-zinc-300">밸류에이션 모델별 목표주가</span>
                <span className="ml-auto text-[9px] font-mono font-black text-zinc-400 bg-stone-100 dark:bg-[#1a1a1a] px-2 py-0.5 rounded-md uppercase tracking-wider">Sample</span>
              </div>

              <div className="flex-1 p-4 space-y-2">
                {MOCK_VALUATION.map(r => (
                  <div key={r.model} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-[#1a1a1a]/50 transition-colors group">
                    <span className="w-12 text-xs font-black font-mono text-zinc-600 dark:text-zinc-400 shrink-0">{r.model}</span>
                    <div className="flex-1 h-1.5 bg-stone-100 dark:bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", r.up ? "bg-emerald-500" : "bg-red-400")}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-black font-mono text-zinc-700 dark:text-zinc-300 tabular-nums w-16 text-right">
                        ₩{r.target}
                      </span>
                      <span className={cn(
                        "text-xs font-black font-mono tabular-nums w-14 text-right px-2 py-0.5 rounded-md",
                        r.up
                          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                          : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                      )}>
                        {r.ret}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 bg-stone-100 dark:bg-[#1a1a1a]/30 border-t border-zinc-100 dark:border-[#2a2a2a] flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                  실제 분석에는 현재 주가 기준 실시간 재무 데이터가 사용됩니다. 위 수치는 설명용 샘플입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ────────── NCAV 등급 스케일 ────────── */}
      <section className="px-4 py-20 border-t border-zinc-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a]/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">NCAV Grade Scale</p>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-3">
              NCAV 업사이드 기준 6단계 등급
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              시가총액 대비 순유동자산(NCAV) 초과 비율에 따라
              자동으로 등급이 결정됩니다.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-8">
            {GRADES.map(g => (
              <div key={g.grade} className="flex flex-col items-center gap-3 p-4 bg-stone-100 dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-[#2a2a2a] text-center">
                <span className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center text-base font-black font-mono shadow-md",
                  g.bg, g.text, g.glow
                )}>
                  {g.grade}
                </span>
                <div>
                  <p className="text-[11px] font-black font-mono text-zinc-600 dark:text-zinc-400 leading-tight">{g.range}</p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 투자 기준 공식 */}
          <div className="flex flex-wrap items-center justify-center gap-3 p-4 bg-stone-100 dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-[#2a2a2a] text-sm">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">투자 기준</span>
            <code className="font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-xl border border-blue-200/50 dark:border-blue-800/40">
              시가총액 {'<'} NCAV × 0.67
            </code>
            <span className="text-zinc-400 dark:text-zinc-500">→ S 등급 이상 (그레이엄 Net-Net 전략)</span>
          </div>
        </div>
      </section>

      {/* ────────── 6가지 밸류에이션 모델 ────────── */}
      <section className="px-4 py-20 border-t border-zinc-200 dark:border-[#2a2a2a]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">Valuation Models</p>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">6가지 방법으로 동시에 검증</h2>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
              자산가치 2가지 + 수익가치 4가지를 병렬 실행해 단일 모델의 한계를 보완합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODELS.map(m => (
              <div key={m.name}
                className="flex items-center gap-4 p-4 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-[#2a2a2a] hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-sm"
              >
                <div className={cn("px-3 py-2 rounded-xl font-black font-mono text-lg tracking-tight shrink-0 min-w-[4rem] text-center", m.bg, m.color)}>
                  {m.name}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{m.category}</p>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 leading-snug break-keep">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── 3단계 사용법 ────────── */}
      <section className="px-4 py-20 border-t border-zinc-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a]/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2 font-mono">How It Works</p>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">3단계로 끝납니다</h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="hidden md:block absolute top-8 left-[calc(100%/6+1rem)] right-[calc(100%/6+1rem)] h-px bg-gradient-to-r from-zinc-200 via-blue-400/40 to-zinc-200 dark:from-zinc-800 dark:via-blue-600/30 dark:to-zinc-800" />
            {[
              {
                step: "01", title: "종목 검색",
                desc: "위 검색창에 국내 종목명 또는 미국 티커를 입력합니다.",
                icon: <Search className="w-5 h-5" />,
                color: "text-blue-600 dark:text-blue-400",
                bg: "bg-blue-50 dark:bg-blue-950/30",
                border: "border-blue-200/60 dark:border-blue-900/40",
              },
              {
                step: "02", title: "자동 분석",
                desc: "최신 재무제표 기반으로 6가지 모델이 즉시 실행되고 목표주가가 산출됩니다.",
                icon: <BarChart3 className="w-5 h-5" />,
                color: "text-purple-600 dark:text-purple-400",
                bg: "bg-purple-50 dark:bg-purple-950/30",
                border: "border-purple-200/60 dark:border-purple-900/40",
              },
              {
                step: "03", title: "투자 판단",
                desc: "등급·목표주가·안전마진을 확인하고 투자 여부를 결정합니다.",
                icon: <TrendingUp className="w-5 h-5" />,
                color: "text-emerald-600 dark:text-emerald-400",
                bg: "bg-emerald-50 dark:bg-emerald-950/30",
                border: "border-emerald-200/60 dark:border-emerald-900/40",
              },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-4 p-6 bg-stone-100 dark:bg-[#1a1a1a] rounded-2xl border border-zinc-200 dark:border-[#2a2a2a] relative z-10">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl border", s.bg, s.border, s.color)}>{s.icon}</div>
                  <span className="text-3xl font-black font-mono text-zinc-100 dark:text-zinc-800 select-none">{s.step}</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white mb-1.5 tracking-tight">{s.title}</h3>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep font-medium">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── 푸터 ────────── */}
      <footer className="border-t border-zinc-200 dark:border-[#2a2a2a] py-10 px-4">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-5">

          {/* 빠른 검색 반복 */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span className="text-[11px] text-zinc-400 font-medium">바로 검색해 보세요:</span>
            {QUICK_SEARCHES.map(q => (
              <Link key={q.ticker} href={`/search?ticker=${encodeURIComponent(q.ticker)}`}
                className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:underline underline-offset-2"
              >
                {q.label}
              </Link>
            ))}
          </div>

          {/* 데이터 출처 */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-400 dark:text-zinc-600 font-mono">
            {["Korea Investment API", "Finnhub US Market", "DART 공시 연동"].map(s => (
              <span key={s} className="flex items-center gap-1.5 font-bold">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />{s}
              </span>
            ))}
          </div>

          {/* 면책 */}
          <p className="text-[11px] text-zinc-400 dark:text-zinc-600 text-center max-w-lg leading-relaxed">
            본 서비스의 분석 결과는 <strong className="font-semibold text-zinc-500 dark:text-zinc-500">투자 참고 목적</strong>의 정량적 자료이며,
            투자 권유를 목적으로 하지 않습니다. 실제 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.
          </p>

          <p className="text-[10px] text-zinc-300 dark:text-zinc-700 font-mono">
            © 2026 IDIOTQUANT · Deep Value Investment Platform
          </p>
        </div>
      </footer>
    </div>
  );
};
