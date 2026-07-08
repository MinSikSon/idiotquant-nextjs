"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Search, Calculator, Filter, Lock, ArrowRight,
  TrendingUp, ChevronRight, BarChart3, Zap, Layers, Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/utils/numbers";
import { STRATEGY_PRESETS_CLIENT, STRATEGY_BADGE, type StrategyPreset } from "@/lib/constants/strategies";

interface PreviewStock {
  ticker: string;
  name: string;
  ncav_ratio: number;
  pbr: number;
  per: number;
  eps: number;
  bps: number;
  strategies: string[];
  market_cap?: number;
}

// 전략별 "핵심 지표" — 그 전략이 보는 지표와 기준 충족 여부. 종목이 설명에 얼마나 부합하는지 표시.
interface StrategyMetric {
  label: string;
  get: (i: PreviewStock) => number;   // 표시값 (0 이하 = 데이터 없음)
  ok: (v: number) => boolean;         // 전략 기준 충족 여부
  fmt: (v: number) => string;
}

// ROE = EPS / BPS × 100 — 스크리너 전략 필터(clientFilter)와 동일한 계산식
const roePct = (i: PreviewStock) => safeNum(i.bps) > 0 ? safeNum(i.eps) / safeNum(i.bps) * 100 : 0;

const STRATEGY_METRICS: Record<string, StrategyMetric[]> = {
  ncav:           [{ label: "NCAV",    get: i => safeNum(i.ncav_ratio), ok: v => v >= 1.0,            fmt: v => `${v.toFixed(2)}x` }],
  near_ncav:      [{ label: "NCAV",    get: i => safeNum(i.ncav_ratio), ok: v => v >= 0.7 && v < 1.0, fmt: v => `${v.toFixed(2)}x` }],
  low_pbr:        [{ label: "PBR",     get: i => safeNum(i.pbr),        ok: v => v > 0 && v < 0.5,    fmt: v => v.toFixed(2) }],
  low_per:        [{ label: "PER",     get: i => safeNum(i.per),        ok: v => v > 0 && v < 10,     fmt: v => v.toFixed(1) }],
  graham_number:  [{ label: "PER×PBR", get: i => safeNum(i.per) > 0 && safeNum(i.pbr) > 0 ? safeNum(i.per) * safeNum(i.pbr) : 0, ok: v => v > 0 && v < 22.5, fmt: v => v.toFixed(1) }],
  s_rim:          [
    { label: "ROE", get: roePct,            ok: v => v > 8,            fmt: v => `${v.toFixed(1)}%` },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 1.0, fmt: v => v.toFixed(2) },
  ],
  magic_formula:  [
    { label: "PER", get: i => safeNum(i.per), ok: v => v > 0 && v < 15, fmt: v => v.toFixed(1) },
    { label: "ROE", get: roePct,            ok: v => v > 10,           fmt: v => `${v.toFixed(1)}%` },
  ],
  quality_value:  [
    { label: "ROE", get: roePct,            ok: v => v > 15,           fmt: v => `${v.toFixed(1)}%` },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 2.0, fmt: v => v.toFixed(2) },
  ],
  balanced_value: [
    { label: "PER", get: i => safeNum(i.per), ok: v => v > 5 && v < 15,  fmt: v => v.toFixed(1) },
    { label: "PBR", get: i => safeNum(i.pbr), ok: v => v > 0 && v < 1.5, fmt: v => v.toFixed(2) },
  ],
};

const NCAV_METRIC: StrategyMetric[] = STRATEGY_METRICS.ncav;

const HOME_MKTCAP_MIN = 500;
const PER_STRATEGY = 2;    // 전략 그룹당 노출 종목 수
const GROUP_PUBLIC = 3;    // 비로그인 시 블러 없이 공개하는 전략 그룹 수

// 전략별 정렬 키 (값이 작을수록 상위). NCAV 계열은 비율이 높을수록 좋으므로 음수.
const STRATEGY_SORT: Record<string, (i: PreviewStock) => number> = {
  ncav:           i => -(i.ncav_ratio ?? 0),
  near_ncav:      i => -(i.ncav_ratio ?? 0),
  low_pbr:        i => i.pbr > 0 ? i.pbr : Infinity,
  s_rim:          i => i.pbr > 0 ? i.pbr : Infinity,
  quality_value:  i => i.pbr > 0 ? i.pbr : Infinity,
  balanced_value: i => i.pbr > 0 ? i.pbr : Infinity,
  graham_number:  i => (i.per > 0 && i.pbr > 0) ? i.per * i.pbr : Infinity,
  low_per:        i => i.per > 0 ? i.per : Infinity,
  magic_formula:  i => i.per > 0 ? i.per : Infinity,
};

const STRATEGY_LABEL: Record<string, string> = {
  ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
  graham_number: "그레이엄", magic_formula: "마법공식",
  quality_value: "퀄리티", near_ncav: "NCAV근접", balanced_value: "균형가치",
};

const STRATEGY_BADGE_CLS: Record<string, string> = {
  ncav:           "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60",
  low_pbr:        "bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#15803d] dark:text-[#16a34a] border-[#bbf7d0] dark:border-[#166534]/60",
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
    icon: Gamepad2,
    iconCls: "text-[#16a34a] dark:text-[#16a34a]",
    bgCls: "bg-[#f0fdf4] dark:bg-[#052e16]/30",
    title: "종목 카드 게임",
    link: "/game",
    linkLabel: "게임하기",
  },
  {
    icon: Filter,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    bgCls: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "종목 발굴",
    link: "/screener",
    linkLabel: "스크리너 열기",
  },
  {
    icon: Search,
    iconCls: "text-violet-600 dark:text-violet-400",
    bgCls: "bg-violet-50 dark:bg-violet-950/30",
    title: "적정주가 분석",
    link: "/analyze",
    linkLabel: "종목 분석하기",
  },
  {
    icon: Calculator,
    iconCls: "text-emerald-600 dark:text-emerald-400",
    bgCls: "bg-emerald-50 dark:bg-emerald-950/30",
    title: "수익 계산기",
    link: "/calculator",
    linkLabel: "계산해보기",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "카드로 종목 비교", accent: "text-[#16a34a]" },
  { step: "02", title: "등급·지표로 가치 감각", accent: "text-emerald-600 dark:text-emerald-400" },
  { step: "03", title: "실제 데이터로 확인", accent: "text-violet-600 dark:text-violet-400" },
];

// =========================================================================
// 홈 3D 애니메이션 일러스트 (CSS 3D 트랜스폼 · 외부 라이브러리/에셋 없음 · 라이트/다크 대응)
// 회전하는 금화(₩/$) + 3D 기울기의 캔들차트가 떠서 움직이며 "주식"을 표현한다.
// prefers-reduced-motion 시 애니메이션 정지.
// =========================================================================
const HERO_CANDLES: { h: number; up: boolean }[] = [
  { h: 40, up: true }, { h: 58, up: true }, { h: 36, up: false }, { h: 70, up: true },
  { h: 52, up: false }, { h: 86, up: true }, { h: 66, up: true },
];

const HERO3D_CSS = `
.iq3d{position:relative;width:100%;max-width:26rem;margin:0 auto;aspect-ratio:5/3;perspective:900px}
.iq3d-glow{position:absolute;inset:8% 10%;border-radius:50%;background:radial-gradient(closest-side,rgba(22,163,74,.22),transparent);filter:blur(10px)}
.iq3d-stage{position:absolute;inset:0;transform-style:preserve-3d}
.iq3d-chart{position:absolute;left:11%;right:11%;bottom:16%;height:52%;display:flex;align-items:flex-end;justify-content:space-between;gap:5%;transform:rotateX(22deg) rotateY(-13deg);transform-style:preserve-3d}
.iq3d-candle{position:relative;flex:1;height:var(--h);display:flex;align-items:flex-end;justify-content:center;transform-style:preserve-3d;animation:iq3d-float 4.2s ease-in-out infinite;animation-delay:var(--d)}
.iq3d-wick{position:absolute;left:50%;top:-16%;height:132%;width:3px;transform:translateX(-50%) translateZ(14px);background:#94a3b8;opacity:.4;border-radius:2px}
.iq3d-body{position:relative;width:100%;height:100%;border-radius:6px;transform:translateZ(14px);box-shadow:0 14px 22px rgba(2,44,26,.22)}
.iq3d-body::before{content:"";position:absolute;inset:0;border-radius:6px;background:linear-gradient(125deg,rgba(255,255,255,.42),rgba(255,255,255,0) 46%)}
.iq3d-body.up{background:linear-gradient(158deg,#4ade80,#15a34a 60%,#0f7a37)}
.iq3d-body.down{background:linear-gradient(158deg,#fb7185,#e11d48 60%,#be123c)}
.iq3d-coin{position:absolute;transform-style:preserve-3d;animation:iq3d-bob 3.4s ease-in-out infinite;filter:drop-shadow(0 10px 9px rgba(120,53,0,.28))}
.iq3d-coin1{width:58px;height:58px;font-size:24px;top:8%;left:2%}
.iq3d-coin2{width:40px;height:40px;font-size:16px;top:0;right:14%;animation-delay:.7s}
.iq3d-coin3{width:34px;height:34px;font-size:13px;bottom:24%;right:1%;animation-delay:1.3s}
.iq3d-spin{position:absolute;inset:0;transform-style:preserve-3d;animation:iq3d-spin 3.4s linear infinite}
.iq3d-face{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:50%;font-weight:900;color:#7c3f00;background:radial-gradient(circle at 34% 26%,#fff7db,#fcd34d 48%,#e0920b 78%,#b45309);box-shadow:inset 0 0 0 3px rgba(255,255,255,.45),inset 0 -7px 12px rgba(146,64,14,.4),inset 0 6px 10px rgba(255,255,255,.4);text-shadow:0 1px 0 rgba(255,255,255,.45),0 -1px 1px rgba(120,53,0,.45)}
.iq3d-face::after{content:"";position:absolute;top:16%;left:20%;width:30%;height:22%;border-radius:50%;background:rgba(255,255,255,.6);filter:blur(2px)}
@keyframes iq3d-spin{from{transform:rotateY(0)}to{transform:rotateY(360deg)}}
@keyframes iq3d-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-13px)}}
@keyframes iq3d-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@media (prefers-reduced-motion:reduce){.iq3d-coin,.iq3d-spin,.iq3d-candle{animation:none}}
`;

function Coin({ cls, symbol }: { cls: string; symbol: string }) {
  return (
    <div className={`iq3d-coin ${cls}`}>
      <div className="iq3d-spin">
        <span className="iq3d-face">{symbol}</span>
      </div>
    </div>
  );
}

function HeroArt() {
  return (
    <div className="iq3d" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: HERO3D_CSS }} />
      <div className="iq3d-glow" />
      <div className="iq3d-stage">
        <div className="iq3d-chart">
          {HERO_CANDLES.map((c, i) => (
            <div key={i} className="iq3d-candle"
              style={{ "--h": `${c.h}%`, "--d": `${i * 0.3}s` } as CSSProperties}>
              <span className="iq3d-wick" />
              <span className={`iq3d-body ${c.up ? "up" : "down"}`} />
            </div>
          ))}
        </div>
        <Coin cls="iq3d-coin1" symbol="₩" />
        <Coin cls="iq3d-coin2" symbol="$" />
        <Coin cls="iq3d-coin3" symbol="₩" />
      </div>
    </div>
  );
}

// 1단계: 여러 종목 중 좋은 하나를 돋보기로 집어냄
function StepScanArt() {
  const dots = [[14, 14], [26, 14], [38, 14], [14, 26], [26, 26], [38, 26], [14, 38], [26, 38]];
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="currentColor" />)}
      <circle cx="40" cy="40" r="3.2" fill="#16a34a" />
      <circle cx="40" cy="40" r="13" stroke="#16a34a" strokeWidth="3.5" fill="none" />
      <line x1="49" y1="49" x2="57" y2="57" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// 2단계: 많은 후보를 걸러 좋은 종목만 통과 (깔때기 + 체크)
function StepFunnelArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      <circle cx="20" cy="12" r="3" fill="currentColor" />
      <circle cx="32" cy="12" r="3" fill="currentColor" />
      <circle cx="44" cy="12" r="3" fill="currentColor" />
      <path d="M14,22 H50 L38,38 V46 H26 V38 Z" stroke="#16a34a" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="32" cy="54" r="8" fill="#16a34a" />
      <path d="M28,54 l3,3 l5,-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 3단계: 적정주가(₩) 확인 완료 (체크)
function StepTagArt() {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="w-11 h-11 shrink-0 text-neutral-300 dark:text-neutral-600">
      <circle cx="28" cy="30" r="16" stroke="currentColor" strokeWidth="2.5" />
      <text x="28" y="36" textAnchor="middle" fontSize="17" fontWeight="800" fill="#16a34a" fontFamily="sans-serif">₩</text>
      <circle cx="46" cy="44" r="9" fill="#16a34a" />
      <path d="M42,44 l3,3 l5,-6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STEP_ARTS = [StepScanArt, StepFunnelArt, StepTagArt];

// 대항해시대 네덜란드 범선(East Indiaman) — "가치를 향한 항해" 테마 배너.
// 실제 사진 대신 라이선스·네트워크 제약이 없는 자체 인라인 SVG 실루엣.
function ShipArt() {
  // 돛(순풍에 부푼 사각돛) 하나를 그리는 헬퍼: 상·하 활대에 걸리고 우현으로 부풂
  const sail = (x1: number, x2: number, yt: number, yb: number, bulge: number) =>
    `M${x1},${yt} L${x2},${yt} Q${x2 + bulge},${(yt + yb) / 2} ${x2},${yb} L${x1},${yb} Q${x1 + bulge},${(yt + yb) / 2} ${x1},${yt} Z`;
  const HULL = "#123c2e";
  return (
    <svg viewBox="0 0 960 300" fill="none" role="img" aria-label="가치를 향한 항해를 상징하는 대항해시대 네덜란드 범선"
      preserveAspectRatio="xMidYMid slice" className="w-full h-full">
      {/* 태양 */}
      <circle cx="742" cy="104" r="48" fill="#f59e0b" opacity="0.85" />
      <circle cx="742" cy="104" r="48" fill="#fbbf24" opacity="0.25" />

      {/* 선체 */}
      <path d="M320,208 L612,208 L590,240 Q468,252 348,240 Z" fill={HULL} />
      {/* 선미루 */}
      <path d="M582,208 L612,208 L612,186 Q600,182 588,186 Z" fill={HULL} />
      {/* 현측 장식선 */}
      <path d="M338,220 L596,220" stroke="#fcd34d" strokeWidth="2.5" opacity="0.7" />

      {/* 마스트 */}
      <line x1="395" y1="208" x2="395" y2="70" stroke={HULL} strokeWidth="5" />
      <line x1="468" y1="208" x2="468" y2="44" stroke={HULL} strokeWidth="6" />
      <line x1="541" y1="208" x2="541" y2="80" stroke={HULL} strokeWidth="5" />
      {/* 활대 */}
      <line x1="352" y1="92" x2="438" y2="92" stroke={HULL} strokeWidth="3.5" />
      <line x1="416" y1="66" x2="520" y2="66" stroke={HULL} strokeWidth="4" />
      <line x1="505" y1="100" x2="577" y2="100" stroke={HULL} strokeWidth="3.5" />
      {/* 선수 사장(bowsprit) */}
      <line x1="330" y1="206" x2="284" y2="182" stroke={HULL} strokeWidth="4" />

      {/* 돛 */}
      <path d={sail(363, 427, 96, 132, 20)} fill="#fdf7e6" stroke={HULL} strokeWidth="2" />
      <path d={sail(352, 438, 138, 188, 26)} fill="#fbf3dd" stroke={HULL} strokeWidth="2" />
      <path d={sail(428, 508, 70, 116, 24)} fill="#fdf7e6" stroke={HULL} strokeWidth="2" />
      <path d={sail(416, 520, 124, 180, 30)} fill="#fbf3dd" stroke={HULL} strokeWidth="2" />
      <path d={sail(513, 569, 104, 134, 18)} fill="#fdf7e6" stroke={HULL} strokeWidth="2" />
      <path d={sail(505, 577, 142, 186, 22)} fill="#fbf3dd" stroke={HULL} strokeWidth="2" />
      {/* 선수 삼각돛 */}
      <path d="M330,204 L292,182 L330,168 Z" fill="#fdf7e6" stroke={HULL} strokeWidth="2" />

      {/* 페넌트 깃발 */}
      <path d="M468,44 l30,7 l-30,7 Z" fill="#16a34a" />
      <path d="M395,70 l22,5 l-22,5 Z" fill="#16a34a" />
      <path d="M541,80 l22,5 l-22,5 Z" fill="#16a34a" />

      {/* 앞바다 물결 (선체 하부와 겹쳐 물에 떠 보이게) */}
      <path d="M0,238 Q120,228 240,238 T480,238 T720,238 T960,238 V300 H0 Z" fill="#16a34a" opacity="0.18" />
      <path d="M0,252 Q160,242 320,252 T640,252 T960,252 V300 H0 Z" fill="#16a34a" opacity="0.30" />
      <path d="M0,268 Q140,258 280,268 T560,268 T840,268 T960,268 V300 H0 Z" fill="#15803d" opacity="0.45" />
    </svg>
  );
}

function useCountUp(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * ease));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return count;
}

function StockRow({ item, index, excludeStrategy, metrics }: { item: PreviewStock; index: number; excludeStrategy?: string; metrics: StrategyMetric[] }) {
  const strategies = (item.strategies ?? []).filter(s => s !== excludeStrategy).slice(0, 2);

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] last:border-0 transition-colors">
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

      {/* 전략 핵심 지표 — 기준 충족 시 초록, 미달 회색, 데이터 없으면 — */}
      <div className="shrink-0 flex items-center gap-3 sm:gap-4">
        {metrics.map(m => {
          const v = m.get(item);
          const has = v > 0;
          const ok = has && m.ok(v);
          return (
            <div key={m.label} className="text-right min-w-[48px]">
              <p className={cn(
                "text-sm font-black font-mono tabular-nums",
                !has ? "text-neutral-300 dark:text-neutral-600"
                  : ok ? "text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-500 dark:text-neutral-400"
              )}>
                {has ? m.fmt(v) : "—"}
              </p>
              <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{m.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StrategyGroup({ preset, stocks }: { preset: StrategyPreset; stocks: PreviewStock[] }) {
  const metrics = STRATEGY_METRICS[preset.id] ?? NCAV_METRIC;
  return (
    <div className="border-b border-neutral-100 dark:border-[#35332e] last:border-0">
      <div className="px-4 py-2.5 bg-[#fcfaf7] dark:bg-[#1f1e1b] flex items-center gap-2">
        <span className={cn(
          "text-[11px] font-extrabold px-2 py-0.5 rounded shrink-0",
          STRATEGY_BADGE[preset.id] ?? "bg-neutral-100 text-neutral-500"
        )}>
          {preset.label}
        </span>
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate break-keep">
          {preset.plain}
        </span>
      </div>
      {stocks.map((item, i) => (
        <StockRow key={`${preset.id}-${item.ticker}`} item={item} index={i} excludeStrategy={preset.id} metrics={metrics} />
      ))}
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
    fetch("/api/proxy/scan/daily?strategy=all&limit=2500&sort=ncav_ratio&order=desc")
      .then(r => r.json())
      .then((data: any) => {
        if (data.success) {
          const all: PreviewStock[] = data.data;
          const filtered = all.filter(item => (item.market_cap ?? 0) >= HOME_MKTCAP_MIN);
          setPreview({
            items: filtered,
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

  // 전략별 상위 PER_STRATEGY개 그룹 (종목 없는 전략은 제외)
  const groups = STRATEGY_PRESETS_CLIENT.map(preset => {
    const sortFn = STRATEGY_SORT[preset.id] ?? (i => -(i.ncav_ratio ?? 0));
    const stocks = preview.items
      .filter(it => it.strategies?.includes(preset.id))
      .sort((a, b) => sortFn(a) - sortFn(b))
      .slice(0, PER_STRATEGY);
    return { preset, stocks };
  }).filter(g => g.stocks.length > 0);

  const visibleGroups = isLoggedIn ? groups : groups.slice(0, GROUP_PUBLIC);
  const lockedGroups = isLoggedIn ? [] : groups.slice(GROUP_PUBLIC);

  const formattedDate = preview.scanDate
    ? `${preview.scanDate.slice(0, 4)}.${preview.scanDate.slice(4, 6)}.${preview.scanDate.slice(6, 8)}`
    : null;

  const animatedTotal = useCountUp(preview.loading ? 0 : preview.total);
  const animatedFiltered = useCountUp(preview.loading ? 0 : preview.filteredTotal);

  return (
    <div className="min-h-screen">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#f4faf6] via-white to-white dark:from-[#12241c] dark:via-[#1f1e1b] dark:to-[#1f1e1b] border-b border-neutral-200/70 dark:border-[#3a3834] relative overflow-hidden">
        {/* Decorative radial accents + dot-grid texture */}
        <div className="absolute -top-40 -right-24 w-96 h-96 rounded-full bg-[#16a34a]/10 dark:bg-[#16a34a]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-16 -left-24 w-72 h-72 rounded-full bg-emerald-400/8 dark:bg-emerald-500/6 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none opacity-[0.4] dark:opacity-[0.18] [background-image:radial-gradient(circle_at_1px_1px,rgba(22,163,74,0.18)_1px,transparent_0)] [background-size:22px_22px]" />

        <div className="max-w-3xl mx-auto px-5 pt-14 pb-12 sm:pt-20 sm:pb-14 md:pt-28 md:pb-20 relative">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf9f7] dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e] mb-5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            게임으로 배우는 주식·경제
          </div>

          {/* Headline */}
          <h1 className="text-[2.1rem] sm:text-[3rem] md:text-[3.5rem] font-black leading-[1.08] tracking-tight mb-4 text-neutral-900 dark:text-neutral-50">
            주식이 게임처럼,<br />
            <span className="bg-gradient-to-r from-[#16a34a] to-emerald-500 dark:from-[#22c55e] dark:to-emerald-400 bg-clip-text text-transparent">쉽고 재미있게.</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 font-medium mb-6 break-keep max-w-md">
            종목 카드 게임으로 시작해, 실제 시장 데이터로 주식·경제 감각을 키웁니다.
          </p>

          {/* CTA — 게임이 메인 진입점, 실데이터는 보조 */}
          <div className="flex flex-wrap gap-2.5">
            <Link href="/game"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-sm shadow-md shadow-[#16a34a]/20 transition-all">
              🃏 카드 게임 시작 <ArrowRight size={15} />
            </Link>
            <Link href="/screener?mincap=500"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white/70 dark:bg-[#242320]/60 backdrop-blur text-neutral-700 dark:text-neutral-200 font-bold text-sm hover:border-[#16a34a]/50 transition-all">
              실제 종목 보기
            </Link>
          </div>

          {/* 히어로 일러스트 — "게임으로 배우는 주식"을 글자 대신 이미지로 */}
          <div className="mt-8 sm:mt-10">
            <HeroArt />
          </div>

        </div>

        {/* Stats strip — 히어로 위에 떠 있는 카드 */}
        {!preview.loading && preview.total > 0 && (
          <div className="relative">
            <div className="max-w-3xl mx-auto px-5 pb-9 grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="rounded-2xl bg-white/70 dark:bg-[#242320]/60 backdrop-blur border border-neutral-200/70 dark:border-[#35332e] shadow-sm px-2 py-4 text-center">
                <p className="text-xl sm:text-2xl font-black text-[#16a34a] dark:text-[#16a34a] tabular-nums leading-none">
                  {animatedTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1.5">최근 발굴 종목</p>
              </div>
              <div className="rounded-2xl bg-white/70 dark:bg-[#242320]/60 backdrop-blur border border-neutral-200/70 dark:border-[#35332e] shadow-sm px-2 py-4 text-center">
                <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                  {animatedFiltered.toLocaleString()}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1.5">시총 500억+</p>
              </div>
              <div className="rounded-2xl bg-white/70 dark:bg-[#242320]/60 backdrop-blur border border-neutral-200/70 dark:border-[#35332e] shadow-sm px-2 py-4 text-center">
                <p className="text-base sm:text-lg font-black text-neutral-700 dark:text-neutral-200 tabular-nums leading-none mt-1">
                  {formattedDate ?? "—"}
                </p>
                <p className="text-[10px] text-neutral-400 font-medium mt-1.5">업데이트</p>
              </div>
            </div>
          </div>
        )}
        {preview.loading && (
          <div className="relative">
            <div className="max-w-3xl mx-auto px-5 pb-9 grid grid-cols-3 gap-2.5 sm:gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white/60 dark:bg-[#242320]/50 border border-neutral-200/70 dark:border-[#35332e] px-2 py-4">
                  <div className="h-5 w-14 rounded-md bg-neutral-200/80 dark:bg-[#35332e] animate-pulse" />
                  <div className="h-2.5 w-12 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SHIP BANNER (대항해시대 테마 · 카드 게임 입구) ─────────── */}
      <Link href="/game" className="group relative flex h-40 sm:h-56 overflow-hidden border-b border-neutral-200/70 dark:border-[#3a3834] bg-gradient-to-b from-[#eaf5ee] to-white dark:from-[#0e2019] dark:to-[#1a1915]">
        <ShipArt />
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/85 dark:bg-[#242320]/85 backdrop-blur border border-neutral-200 dark:border-[#35332e] text-xs font-black text-[#15803d] dark:text-[#16a34a] shadow-sm group-hover:scale-105 transition-transform">
          🃏 종목 카드 게임으로 배우기 <ChevronRight size={13} />
        </span>
      </Link>

      {/* ── TODAY'S PICKS ─────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-neutral-900 dark:text-neutral-50">
                  최근 발굴 종목
                </h2>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#16a34a] text-white">
                  500억+
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1 break-keep">게임 카드로도 만나는 실제 저평가 종목</p>
            </div>
            <Link
              href="/screener?mincap=500"
              className="flex items-center gap-0.5 text-xs font-bold text-[#16a34a] dark:text-[#16a34a] whitespace-nowrap"
            >
              전체 보기 <ChevronRight size={13} />
            </Link>
          </div>

          {/* Stock list card */}
          <div className="rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden bg-white dark:bg-[#242320] shadow-sm">
            {/* Column headers */}
            <div className="px-4 py-2 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">종목</span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략 지표</span>
            </div>

            {preview.loading ? (
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] last:border-0">
                    <div className="w-4 h-3 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3.5 w-32 rounded bg-neutral-200/80 dark:bg-[#35332e] animate-pulse" />
                      <div className="h-2.5 w-16 rounded bg-neutral-100 dark:bg-[#2c2b27] animate-pulse" />
                    </div>
                    <div className="h-7 w-12 rounded-md bg-neutral-200/80 dark:bg-[#35332e] animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 size={24} className="text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
                <p className="text-xs text-neutral-400">스캔 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {visibleGroups.map(g => (
                  <StrategyGroup key={g.preset.id} preset={g.preset} stocks={g.stocks} />
                ))}

                {/* Locked groups */}
                {lockedGroups.length > 0 && (
                  <div className="relative">
                    <div className="blur-sm select-none pointer-events-none">
                      {lockedGroups.map(g => (
                        <StrategyGroup key={g.preset.id} preset={g.preset} stocks={g.stocks} />
                      ))}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 to-white/90 dark:from-[#242320]/40 dark:to-[#242320]/95">
                      <Link
                        href="/login"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold shadow-md shadow-[#16a34a]/20 transition-all"
                      >
                        <Lock size={13} />
                        로그인하여 {groups.length}개 전략 전체 확인
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                )}

                {isLoggedIn && (
                  <div className="px-4 py-3 bg-[#f0fdf4] dark:bg-[#052e16]/20 border-t border-[#dcfce7] dark:border-[#14532d]/40 flex items-center justify-between gap-3">
                    <p className="text-xs text-[#15803d] dark:text-[#16a34a] font-medium">
                      전체 <span className="font-black">{preview.filteredTotal}개</span> 종목을 필터·정렬로 탐색하세요.
                    </p>
                    <Link
                      href="/screener?mincap=500"
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16a34a] text-white text-xs font-bold hover:bg-[#15803d] transition-colors whitespace-nowrap"
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

      {/* ── STRATEGIES ───────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-[#16a34a]" strokeWidth={2.5} />
                <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">9가지 퀀트 전략</h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STRATEGY_PRESETS_CLIENT.map(s => (
              <Link
                key={s.id}
                href={`/screener?strategies=${s.id}&mincap=500`}
                className="group p-4 rounded-2xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] hover:border-[#16a34a]/50 dark:hover:border-[#16a34a]/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "text-[11px] font-extrabold px-2 py-0.5 rounded",
                    STRATEGY_BADGE[s.id] ?? "bg-neutral-100 text-neutral-500"
                  )}>
                    {s.label}
                  </span>
                  <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600 group-hover:text-[#16a34a] group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-200 font-medium leading-relaxed break-keep">
                  {s.plain}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834] bg-[#faf9f7] dark:bg-[#1a1917]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-7">
            <div className="flex items-center gap-2">
              <Zap size={13} className="text-[#16a34a]" strokeWidth={2.5} />
              <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">이렇게 배웁니다</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((step, i) => {
              const Art = STEP_ARTS[i];
              return (
                <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#35332e]">
                  <div className="flex items-center gap-3 mb-3">
                    <Art />
                    <span className={cn("text-xs font-black tabular-nums", step.accent)}>{step.step}</span>
                  </div>
                  <p className="text-sm font-black text-neutral-900 dark:text-neutral-50">{step.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-10 px-5 md:py-14 border-t border-neutral-100 dark:border-[#3a3834]">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h2 className="text-base font-black text-neutral-900 dark:text-neutral-50">주요 기능</h2>
          </div>

          {/* Mobile: horizontal scroll, Desktop: 3-col grid */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="shrink-0 w-56 sm:w-auto bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex flex-col gap-4"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", f.bgCls)}>
                    <Icon size={16} className={f.iconCls} strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black text-neutral-900 dark:text-neutral-50">{f.title}</p>
                  </div>
                  <Link href={f.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#16a34a] dark:text-[#16a34a]"
                  >
                    {f.linkLabel} <ChevronRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONVERSION CTA (비로그인) ─────────────────────────────── */}
      {!isLoggedIn && !sessionLoading && (
        <section className="py-16 px-5 border-t border-neutral-100 dark:border-[#3a3834] bg-gradient-to-b from-[#faf9f7] to-white dark:from-[#1a1917] dark:to-[#1f1e1b] relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full bg-[#16a34a]/5 dark:bg-[#16a34a]/4 blur-3xl" />
          </div>
          <div className="max-w-3xl mx-auto text-center relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#dcfce7] dark:border-[#14532d]/60 mb-4 text-[11px] font-semibold text-[#15803d] dark:text-[#16a34a]">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#16a34a] opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#16a34a]" />
              </span>
              무료로 시작하세요
            </div>
            <h2 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 mb-6 tracking-tight leading-tight">
              지금 바로 게임으로<br />주식·경제를 배워보세요
            </h2>
            <Link href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] active:bg-[#166534] text-white font-bold text-sm shadow-md shadow-[#16a34a]/20 transition-all"
            >
              카카오로 무료 시작
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 dark:border-[#3a3834] bg-white dark:bg-[#1f1e1b]">
        <div className="max-w-3xl mx-auto px-5 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#16a34a] shrink-0" strokeWidth={2.5} />
            <span className="text-xs font-black tracking-tight text-neutral-700 dark:text-neutral-200">
              IDIOT QUANT
            </span>
          </div>
          <div className="flex items-center gap-4">
            {[
              { label: "발굴", href: "/screener" },
              { label: "분석", href: "/analyze" },
              { label: "계산기", href: "/calculator" },
              { label: "🃏 게임", href: "/game" },
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
