"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, ArrowRight, BarChart3, CheckCircle, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VALUATION_MODEL_DESCRIPTIONS } from "./valuationModelDescriptions";

const QUICK_SEARCHES = [
  { label: "삼성전자",   ticker: "삼성전자",  market: "KR" },
  { label: "SK하이닉스", ticker: "SK하이닉스", market: "KR" },
  { label: "NAVER",      ticker: "NAVER",      market: "KR" },
  { label: "AAPL",       ticker: "AAPL",       market: "US" },
  { label: "NVDA",       ticker: "NVDA",       market: "US" },
  { label: "MSFT",       ticker: "MSFT",       market: "US" },
];

const GRADES = [
  { grade: "SSS", range: "NCAV +200%↑", desc: "극단적 저평가", bg: "bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500", text: "text-white" },
  { grade: "SS",  range: "NCAV +150%↑", desc: "강한 저평가",   bg: "bg-amber-500",  text: "text-white" },
  { grade: "S",   range: "NCAV +100%↑", desc: "저평가",        bg: "bg-emerald-500", text: "text-white" },
  { grade: "A",   range: "NCAV +50%↑",  desc: "적정 이하",     bg: "bg-slate-500",  text: "text-white" },
  { grade: "B",   range: "NCAV 0%↑",    desc: "적정가",        bg: "bg-neutral-200 dark:bg-surface-dark-elevated", text: "text-neutral-700 dark:text-neutral-200" },
  { grade: "F",   range: "NCAV 0% 미만", desc: "고평가",       bg: "bg-red-500",    text: "text-white" },
];

const MODELS = [
  { name: "NCAV", category: "자산가치", color: "text-brand", bg: "bg-[#f0fdf4] dark:bg-[#052e16]/30" },
  { name: "PBR", category: "자산가치", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  { name: "SRIM", label: "S-RIM", category: "수익가치", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { name: "DCF", category: "수익가치", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30" },
  { name: "PER", category: "수익가치", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  { name: "PEG", category: "수익가치", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
] as const;

const MOCK_VALUATION = [
  { model: "NCAV",  target: "82,400", ret: "+7.9%",  pct: 32, up: true },
  { model: "S-RIM", target: "96,200", ret: "+26.0%", pct: 72, up: true },
  { model: "DCF",   target: "88,500", ret: "+15.8%", pct: 52, up: true },
  { model: "PER",   target: "74,100", ret: "−3.1%",  pct: 18, up: false },
  { model: "PBR",   target: "79,800", ret: "+4.5%",  pct: 28, up: true },
];

export const SearchGuide = () => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);

  return (
    <div className="w-full min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16 pb-12 px-4">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[280px] bg-brand/5 dark:bg-brand/7 blur-[120px] rounded-full -z-10" />

        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-surface-dark-card border border-neutral-200 dark:border-border-subtle-dark shadow-sm mb-7">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono">실시간 분석</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-neutral-900 dark:text-white leading-[1.06] mb-4 break-keep">
            종목명 하나로<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-violet-500 dark:from-brand dark:to-violet-400">
              여러 방법으로 가치 비교
            </span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed mb-8 break-keep max-w-sm mx-auto">
            종목과 시장에 맞는 계산 방법으로 예상 주가를 나란히 비교합니다.
          </p>

          <div className="flex items-center gap-3 max-w-sm mx-auto px-4 py-3 bg-white dark:bg-surface-dark-card border-2 border-dashed border-neutral-300 dark:border-surface-dark-border rounded-2xl mb-6 text-neutral-400 cursor-default">
            <Search className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium flex-1 text-left">위 검색창에 종목명 또는 티커 입력</span>
            <ArrowRight className="w-4 h-4 shrink-0 opacity-40" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] text-neutral-400 font-medium">바로 검색:</span>
            {QUICK_SEARCHES.map(q => (
              <Link
                key={q.ticker}
                href={`/analyze?ticker=${encodeURIComponent(q.ticker)}`}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95",
                  q.market === "KR"
                    ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-800/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60"
                    : "bg-[#f0fdf4] dark:bg-[#052e16]/30 text-brand-hover dark:text-brand border-[#bbf7d0]/60 dark:border-[#166534]/40 hover:bg-brand-light dark:hover:bg-[#052e16]/60"
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

      {/* ── Output Preview ── */}
      <section className="px-4 pb-16 border-t border-neutral-200 dark:border-border-subtle-dark pt-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Output Preview</p>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">검색하면 이런 결과가 나옵니다</h2>
            <p className="text-xs text-neutral-400 mt-1.5">아래는 삼성전자 샘플입니다.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
            {[
              { label: "NCAV 비율", value: "1.47x", desc: "청산가치 / 시가총액", color: "text-emerald-600 dark:text-emerald-400" },
              { label: "PBR",       value: "1.40x", desc: "주가 / 순자산",       color: "text-neutral-700 dark:text-neutral-200" },
              { label: "PER",       value: "12.5x", desc: "주가 / 순이익",       color: "text-neutral-700 dark:text-neutral-200" },
              { label: "EPS",       value: "₩6.3K", desc: "주당 순이익",         color: "text-neutral-700 dark:text-neutral-200" },
            ].map(m => (
              <div key={m.label} className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-3.5 shadow-sm">
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1">{m.label}</p>
                <p className={cn("text-xl font-black font-mono tabular-nums leading-none", m.color)}>{m.value}</p>
                <p className="text-[9px] text-neutral-400 mt-1">{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-border-subtle-dark flex items-center gap-2">
              <BarChart3 className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-xs font-extrabold text-neutral-700 dark:text-neutral-300">모델별 목표주가</span>
              <span className="ml-auto text-[9px] font-mono font-black text-neutral-400 bg-surface-canvas dark:bg-surface-dark-canvas px-2 py-0.5 rounded uppercase tracking-wider">Sample</span>
            </div>
            <div className="p-4 space-y-1.5">
              {MOCK_VALUATION.map(r => (
                <div key={r.model} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                  <span className="w-10 text-[11px] font-black font-mono text-neutral-500 dark:text-neutral-400 shrink-0">{r.model}</span>
                  <div className="flex-1 h-1.5 bg-surface-canvas dark:bg-surface-dark-canvas rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", r.up ? "bg-emerald-500" : "bg-red-400")} style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-xs font-black font-mono text-neutral-700 dark:text-neutral-300 tabular-nums w-14 text-right">₩{r.target}</span>
                  <span className={cn(
                    "text-xs font-black font-mono tabular-nums w-12 text-right px-1.5 py-0.5 rounded",
                    r.up
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                      : "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                  )}>
                    {r.ret}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Grade + Models ── */}
      <section className="px-4 py-14 border-t border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark">
        <div className="max-w-3xl mx-auto space-y-12">

          {/* Grade scale */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">NCAV Grade</p>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight mb-1">NCAV 업사이드 기준 6단계 등급</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              시가총액 대비 순유동자산 초과 비율에 따라 자동 산정됩니다.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
              {GRADES.map(g => (
                <div key={g.grade} className="flex flex-col items-center gap-2.5 p-3.5 bg-surface-canvas dark:bg-surface-dark-card rounded-xl border border-neutral-200 dark:border-border-subtle-dark text-center">
                  <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black font-mono shadow-sm", g.bg, g.text)}>
                    {g.grade}
                  </span>
                  <div>
                    <p className="text-[10px] font-black font-mono text-neutral-600 dark:text-neutral-400 leading-tight">{g.range}</p>
                    <p className="text-[9px] text-neutral-400 dark:text-neutral-500 mt-0.5">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-surface-canvas dark:bg-surface-dark-card rounded-xl border border-neutral-200 dark:border-border-subtle-dark text-xs">
              <span className="text-neutral-500 dark:text-neutral-400 font-medium">그레이엄 기준</span>
              <code className="font-mono font-black text-brand bg-[#f0fdf4] dark:bg-[#052e16]/30 px-2.5 py-1 rounded-lg border border-[#bbf7d0]/50 dark:border-[#166534]/40">
                시가총액 {'<'} NCAV × 0.67
              </code>
              <span className="text-neutral-400 dark:text-neutral-500">→ S 등급 이상 (Net-Net)</span>
            </div>
          </div>

          {/* Valuation models */}
          <div>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">Valuation Models</p>
            <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight mb-1">주식 가치를 보는 6가지 방법</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              자산을 보는 2가지, 이익과 현금을 보는 4가지 방법이 있습니다. 종목과 시장에 따라 계산할 수 있는 방법이 달라요.
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3 sm:hidden">모델을 누르면 계산 방식과 주의점을 볼 수 있어요.</p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3 hidden sm:block">모델을 클릭하거나 마우스를 올리면 계산 방식과 주의점을 볼 수 있어요.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {MODELS.map(m => {
                const description = VALUATION_MODEL_DESCRIPTIONS[m.name];
                const isExplained = (hoveredModel ?? selectedModel) === m.name;
                return (
                  <div
                    key={m.name}
                    onPointerEnter={event => { if (event.pointerType === "mouse") setHoveredModel(m.name); }}
                    onPointerLeave={event => { if (event.pointerType === "mouse") setHoveredModel(null); }}
                    className="p-3.5 bg-surface-canvas dark:bg-surface-dark-card rounded-xl border border-neutral-200 dark:border-border-subtle-dark"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setHoveredModel(null);
                        setSelectedModel(current => current === m.name ? null : m.name);
                      }}
                      onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setHoveredModel(m.name); }}
                      onBlur={() => setHoveredModel(null)}
                      aria-expanded={isExplained}
                      aria-controls={isExplained ? `guide-model-${m.name}` : undefined}
                      className="w-full flex items-center gap-3.5 text-left rounded-md focus-visible:outline-2 focus-visible:outline-brand"
                    >
                      <span className={cn("px-2.5 py-1.5 rounded-lg font-black font-mono text-sm tracking-tight shrink-0 min-w-[3.5rem] text-center", m.bg, m.color)}>
                        {"label" in m ? m.label : m.name}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-0.5">{m.category}</span>
                        <span className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 leading-snug break-keep">{description.short}</span>
                      </span>
                      <ChevronRight className={cn("w-3.5 h-3.5 shrink-0 text-neutral-400 transition-transform", isExplained && "rotate-90")} />
                    </button>
                    {isExplained && (
                      <div id={`guide-model-${m.name}`} className="mt-3 pt-3 border-t border-neutral-200 dark:border-border-subtle-dark text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300 break-keep">
                        <p><strong className="text-neutral-900 dark:text-white">계산 방식</strong> · {description.detail}</p>
                        <p className="mt-1.5"><strong className="text-neutral-900 dark:text-white">주의할 점</strong> · {description.caution}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-neutral-200 dark:border-border-subtle-dark py-8 px-4">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-neutral-400 dark:text-neutral-600 font-mono font-bold">
            {["Korea Investment API", "Finnhub US Market", "DART 공시 연동"].map(s => (
              <span key={s} className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />{s}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-600 text-center max-w-sm leading-relaxed">
            본 서비스의 분석 결과는 투자 참고 목적의 정량적 자료이며, 투자 권유를 목적으로 하지 않습니다.
          </p>
          <span className="text-[10px] text-neutral-300 dark:text-neutral-700 font-mono">© 2026 IDIOTQUANT</span>
        </div>
      </footer>
    </div>
  );
};
