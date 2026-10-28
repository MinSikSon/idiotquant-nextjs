"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calculator, BarChart3, TrendingUp, ChevronDown, ChevronUp,
  Layers, Zap, Sparkles, Activity, Target, Lock, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VALUATION_MODEL_DESCRIPTIONS, type ValuationModelDescription } from "./valuationModelDescriptions";
import type { ValuationResult } from "@/lib/utils/financeCalc";
import { valuationModels } from "@/lib/utils/valuationModels";

type ValuationModelType = "NCAV" | "SRIM" | "DCF" | "PER" | "PEG" | "PBR" | string;
type FilterTabType = "ALL" | "ASSET" | "EARNING";

// =========================================================================
// 모델 설정
// =========================================================================
interface ModelConfig {
  name: string;
  category: "ASSET" | "EARNING";
  description: ValuationModelDescription;
  icon: React.ReactNode;
  dotBg: string;
  accentLine: string;
  iconBg: string;
  iconColor: string;
  badgeClass: string;
  textColor: string;
  extendMetrics?: (baseMetrics: any[], rows: any[]) => any[];
}

const MODEL_CONFIG: Record<string, ModelConfig> = {
  NCAV: {
    name: "NCAV 청산가치",
    category: "ASSET",
    description: VALUATION_MODEL_DESCRIPTIONS.NCAV,
    icon: <Calculator size={14} />,
    dotBg: "bg-neutral-500 dark:bg-neutral-300",
    accentLine: "bg-neutral-200 dark:bg-neutral-700",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    iconColor: "text-neutral-600 dark:text-neutral-300",
    badgeClass: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
    textColor: "text-neutral-700 dark:text-neutral-200",
    extendMetrics: (base, rows) => {
      const priceMetric = base.find((m: any) => /현재가|주가|price/i.test(m.label));
      const curPrice = priceMetric ? parseFloat(priceMetric.value.replace(/[^0-9.-]/g, "")) : 0;
      const baseRow =
        rows.find((r: any) => /1\.0|100|기준|적정/i.test((r.multiplier || r.label || "").toString())) ||
        rows[0];
      const ncavPrice = baseRow?.targetPrice ?? 0;
      const margin =
        ncavPrice > 0 && curPrice > 0
          ? `${((ncavPrice - curPrice) / ncavPrice * 100).toFixed(1)}%`
          : "—";
      return [...base, { label: "안전마진율", value: margin }];
    },
  },
  PBR: {
    name: "PBR 자본밴드",
    category: "ASSET",
    description: VALUATION_MODEL_DESCRIPTIONS.PBR,
    icon: <Layers size={14} />,
    dotBg: "bg-neutral-500 dark:bg-neutral-300",
    accentLine: "bg-neutral-200 dark:bg-neutral-700",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    iconColor: "text-neutral-600 dark:text-neutral-300",
    badgeClass: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
    textColor: "text-neutral-700 dark:text-neutral-200",
  },
  SRIM: {
    name: "S-RIM 초과수익",
    category: "EARNING",
    description: VALUATION_MODEL_DESCRIPTIONS.SRIM,
    icon: <Activity size={14} />,
    dotBg: "bg-neutral-500 dark:bg-neutral-300",
    accentLine: "bg-neutral-200 dark:bg-neutral-700",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    iconColor: "text-neutral-600 dark:text-neutral-300",
    badgeClass: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
    textColor: "text-neutral-700 dark:text-neutral-200",
  },
  DCF: {
    name: "DCF 현금흐름할인",
    category: "EARNING",
    description: VALUATION_MODEL_DESCRIPTIONS.DCF,
    icon: <TrendingUp size={14} />,
    dotBg: "bg-neutral-500 dark:bg-neutral-300",
    accentLine: "bg-neutral-200 dark:bg-neutral-700",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    iconColor: "text-neutral-600 dark:text-neutral-300",
    badgeClass: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
    textColor: "text-neutral-700 dark:text-neutral-200",
  },
  PER: {
    name: "PER 멀티플",
    category: "EARNING",
    description: VALUATION_MODEL_DESCRIPTIONS.PER,
    icon: <BarChart3 size={14} />,
    dotBg: "bg-neutral-500 dark:bg-neutral-300",
    accentLine: "bg-neutral-200 dark:bg-neutral-700",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    iconColor: "text-neutral-600 dark:text-neutral-300",
    badgeClass: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
    textColor: "text-neutral-700 dark:text-neutral-200",
  },
  PEG: {
    name: "PEG 가치성장",
    category: "EARNING",
    description: VALUATION_MODEL_DESCRIPTIONS.PEG,
    icon: <Zap size={14} />,
    dotBg: "bg-neutral-500 dark:bg-neutral-300",
    accentLine: "bg-neutral-200 dark:bg-neutral-700",
    iconBg: "bg-neutral-100 dark:bg-neutral-800",
    iconColor: "text-neutral-600 dark:text-neutral-300",
    badgeClass: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
    textColor: "text-neutral-700 dark:text-neutral-200",
  },
};

const DEFAULT_CONFIG: ModelConfig = {
  name: "기타",
  category: "ASSET",
  description: { short: "추가 설명이 없는 모델입니다.", detail: "계산 방식은 아래 모델 표를 확인하세요.", caution: "" },
  icon: <BarChart3 size={14} />,
  dotBg: "bg-neutral-500 dark:bg-neutral-300",
  accentLine: "bg-neutral-200 dark:bg-neutral-700",
  iconBg: "bg-neutral-100 dark:bg-neutral-800",
  iconColor: "text-neutral-600 dark:text-neutral-300",
  badgeClass: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300",
  textColor: "text-neutral-700 dark:text-neutral-200",
};

// 눈금 행과 모델 행이 같은 그리드를 써야 라벨과 점의 x 좌표가 일치한다
const AXIS_GRID = "grid grid-cols-[84px_minmax(0,1fr)_70px_44px] sm:grid-cols-[150px_minmax(0,1fr)_88px_56px] gap-2 sm:gap-3 items-center";

// =========================================================================
// ValuationSection
// =========================================================================
interface ValuationSectionProps {
  data: any;
  isUs: boolean;
  isLoggedIn?: boolean;
  loginHref?: string;
}

export const ValuationSection = ({ data, isUs, isLoggedIn = true, loginHref = "/login" }: ValuationSectionProps) => {
  const [activeTab, setActiveTab] = useState<FilterTabType>("ALL");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const currency = isUs ? "$" : "₩";

  // 실제 시세. analyze 페이지가 이미 같은 필드를 직접 쓰고 있고, 같은 data prop 으로 들어온다.
  const marketPrice = isUs
    ? Number(data?.usDetail?.output?.last ?? 0)
    : Number(data?.kiPrice?.output?.stck_prpr ?? 0);

  const models = useMemo(() => valuationModels(data, isUs), [data, isUs]);

  // 축 요약 — 모델들이 제시한 적정주가와 현재가를 한 눈금 위에 세워, 지금 가격이 그 사이
  // 어디쯤인지 바로 읽히게 한다. 위치는 반드시 가격에서 계산한다(눈대중 배치는 어긋난다).
  const axis = useMemo(() => {
    const rows = models
      .map(({ type, result }) => {
        const baseRow =
          result.rows.find((r: any) =>
            /1\.0|100|기준|적정/i.test((r.multiplier || r.label || r.weight || "").toString().replace(/\s+/g, ""))
          ) ?? result.rows[0];
        return {
          type,
          config: MODEL_CONFIG[type] ?? DEFAULT_CONFIG,
          formula: result.formula,
          targetPrice: baseRow?.targetPrice ?? 0,
          returnPct: baseRow?.returnPct ?? 0,
        };
      })
      .filter(r => r.targetPrice > 0);

    // 모델이 계산에 쓴 기준가 — returnPct = targetPrice / 기준가 − 1 이므로 역산할 수 있다.
    // 예전에는 이 값을 그대로 "현재가"라고 적었는데, 첫 유효 모델 하나에서 나온 값이라
    // 화면 상단 시세와 다른 시점일 수 있다. 이제는 시세를 우선 쓰고 이 값은 대조용으로 남긴다.
    const ref = rows.find(r => r.returnPct > -100);
    const modelBase = ref ? ref.targetPrice / (1 + ref.returnPct / 100) : 0;
    // 시세를 못 읽는 경우(로딩 전·응답 누락)에는 기존대로 역산값으로 떨어진다 — 눈금이 비는 것보다 낫다.
    const curPrice = marketPrice > 0 ? marketPrice : modelBase;

    const prices = [...rows.map(r => r.targetPrice), curPrice].filter(p => p > 0);
    if (prices.length === 0) return null;

    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const pad = (hi - lo) * 0.12 || hi * 0.1 || 1;
    const min = Math.max(0, lo - pad);
    const max = hi + pad;
    const pos = (p: number) => (max > min ? ((p - min) / (max - min)) * 100 : 50);

    // min·max 는 pos() 안에서만 쓰인다(끝값 라벨을 걷어내며 밖으로 내보낼 이유가 없어졌다).
    return {
      rows: [...rows].sort((a, b) => b.targetPrice - a.targetPrice),
      curPrice, modelBase, usedMarketPrice: marketPrice > 0, pos,
    };
  }, [models, marketPrice]);

  // 모델 기준가와 시세가 어긋나면 괴리율이 어느 가격 기준인지 헷갈린다 → 그 사실을 적는다.
  // 0.5% 는 호가 한두 틱 수준의 차이를 잡음으로 흘려보내기 위한 문턱이다.
  const baseGap = axis && axis.usedMarketPrice && axis.modelBase > 0
    ? Math.abs(axis.modelBase - axis.curPrice) / axis.curPrice
    : 0;
  const showBaseNote = baseGap > 0.005;

  const curLabelPos = axis ? axis.pos(axis.curPrice) : 0;

  const filteredModels = useMemo(() => {
    if (activeTab === "ALL") return models;
    return models.filter(m => (MODEL_CONFIG[m.type] ?? DEFAULT_CONFIG).category === activeTab);
  }, [models, activeTab]);

  const assetCount = models.filter(m => (MODEL_CONFIG[m.type] ?? DEFAULT_CONFIG).category === "ASSET").length;
  const earningCount = models.filter(m => (MODEL_CONFIG[m.type] ?? DEFAULT_CONFIG).category === "EARNING").length;

  if (models.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400 dark:text-neutral-500">
        <Target size={32} className="opacity-30" />
        <p className="text-sm font-medium">재무 데이터가 부족하여 밸류에이션을 계산할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">

      {/* ────── 모델별 적정주가 (모델별 트랙) ────── */}
      {axis && (
        <div className="px-0 sm:px-5 pt-2 pb-4 border-b border-neutral-100 dark:border-border-subtle-dark">
          <div className="flex items-center gap-2 mb-3">
            <Target size={13} className="text-neutral-400 shrink-0" />
            <span className="text-[13.5px] font-extrabold text-neutral-700 dark:text-neutral-200 tracking-tight">
              모델별 적정주가
            </span>
            <span className="ml-auto text-xs font-mono font-bold text-neutral-400 dark:text-neutral-500 bg-surface-canvas dark:bg-surface-dark-card px-2 py-0.5 rounded-md uppercase tracking-wider">
              {axis.rows.length}개 모델
            </span>
          </div>
          <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
            세로선은 현재가, 점은 모델별 계산 가격입니다. 오른쪽 %는 계산 기준가와의 차이입니다.
          </p>

          {showBaseNote && (
            <p className="mb-2.5 text-sm leading-relaxed text-neutral-400 dark:text-neutral-500 break-keep">
              아래 괴리율은 모델이 계산에 쓴 {currency}{axis.modelBase.toLocaleString(undefined, { maximumFractionDigits: isUs ? 2 : 0 })} 기준입니다
              (현재 시세 {currency}{axis.curPrice.toLocaleString(undefined, { maximumFractionDigits: isUs ? 2 : 0 })}).
            </p>
          )}

          {/* 모델별 트랙 — 축과 목록을 한 줄에 합친다. 점과 이름이 같은 행에 있으면
              "이 점이 어느 모델인지" 를 색으로 되짚을 필요가 없다.
              모든 행이 같은 min~max 스케일을 쓰므로 세로로 곧장 비교된다. */}
          <div className="overflow-hidden">
            {/* 눈금 — 트랙 열 위에만 올린다. 그리드 정의를 행과 똑같이 맞춰야 라벨이 실제 위치를 가리킨다.
                축 양 끝값(min·max)은 찍지 않는다. 실제 목표가가 아니라 가장 바깥 점이 잘리지 않게
                12% 여백을 붙인 눈금 경계일 뿐인데, 현재가 옆에 나란히 서면 또 하나의 가격으로 읽힌다. */}
            <div className={cn(AXIS_GRID, "px-0 sm:px-4 pt-2 pb-1")}>
              <div />
              <div className="relative h-4">
                {axis.curPrice > 0 && (
                  <>
                    <span
                      className="absolute -translate-x-1/2 whitespace-nowrap text-xs font-bold font-mono text-neutral-500 dark:text-neutral-400"
                      style={{ left: `${curLabelPos}%` }}
                    >
                      현재가 {axis.curPrice.toLocaleString(undefined, { maximumFractionDigits: isUs ? 2 : 0 })}
                    </span>
                    {/* 라벨과 첫 행의 세로선을 잇는 토막 — 선이 라벨에서 시작하는 것처럼 보인다 */}
                    <div
                      className="absolute top-4 -bottom-1 w-px -ml-px bg-neutral-900/40 dark:bg-white/40"
                      style={{ left: `${curLabelPos}%` }}
                    />
                  </>
                )}
              </div>
              <div />
              <div />
            </div>

            {axis.rows.map(r => {
              const isPositive = r.returnPct >= 0;
              const target = axis.pos(r.targetPrice);
              const isExplained = (hoveredModel ?? selectedModel) === r.type;
              return (
                <div
                  key={r.type}
                  onPointerEnter={event => { if (event.pointerType === "mouse") setHoveredModel(r.type); }}
                  onPointerLeave={event => { if (event.pointerType === "mouse") setHoveredModel(null); }}
                  className={cn(AXIS_GRID, "px-0 sm:px-4 py-2.5 bg-transparent sm:bg-white dark:sm:bg-surface-dark-card border-t border-neutral-100 dark:border-border-subtle-dark")}
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setHoveredModel(null);
                        setSelectedModel(current => current === r.type ? null : r.type);
                      }}
                      onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setHoveredModel(r.type); }}
                      onBlur={() => setHoveredModel(null)}
                      aria-label={`${r.config.name} 모델 설명`}
                      aria-expanded={isExplained}
                      aria-controls={isExplained ? `model-explanation-${r.type}` : undefined}
                      className="inline-flex min-h-11 w-full items-center gap-1 text-left text-[12px] font-medium text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 focus-visible:outline-2 focus-visible:outline-brand rounded-sm"
                    >
                      <span className="whitespace-nowrap sm:hidden">{r.config.name.split(" ")[0]}</span><span className="hidden sm:inline sm:truncate">{r.config.name}</span><ChevronDown size={12} aria-hidden="true" className={cn("shrink-0 text-neutral-400 transition-transform", isExplained && "rotate-180")} />
                    </button>
                    <p className="hidden sm:block text-xs text-neutral-500 dark:text-neutral-400 truncate">{r.config.description.short}</p>
                  </div>

                  {/* self-stretch — 셀이 행 높이를 꽉 채워야 현재가 세로선이 행 사이에서 끊기지 않는다.
                      행 패딩(py-2.5)은 -inset-y-2.5 로 넘겨 다음 행 선과 맞붙는다. */}
                  <div className="relative self-stretch min-h-4">
                    <div className="absolute left-0 right-0 top-1/2 -mt-px h-0.5 rounded-full bg-[#f2f0ec] dark:bg-surface-dark-hover" />
                    {axis.curPrice > 0 && (
                      <>
                        <div
                          className="absolute -inset-y-3 w-px -ml-px bg-neutral-900/40 dark:bg-white/40"
                          style={{ left: `${curLabelPos}%` }}
                        />
                        {/* 현재가 → 적정주가 구간. 길이가 곧 괴리율이라 숫자를 읽기 전에 눈에 들어온다 */}
                        <div
                          className={cn("absolute top-1/2 -mt-px h-0.5 rounded-full opacity-60", r.config.dotBg)}
                          style={{
                            left: `${Math.min(curLabelPos, target)}%`,
                            width: `${Math.abs(target - curLabelPos)}%`,
                          }}
                        />
                      </>
                    )}
                    <div
                      title={`${r.config.name} ${currency}${r.targetPrice.toLocaleString()}`}
                      className={cn(
                        "absolute top-1/2 -mt-1.5 w-3 h-3 -ml-1.5 rounded-full ring-[2.5px] ring-white dark:ring-surface-dark-card",
                        r.config.dotBg
                      )}
                      style={{ left: `${target}%` }}
                    />
                  </div>

                  <span className="text-[12.5px] font-extrabold font-mono tabular-nums text-neutral-900 dark:text-neutral-100 text-right">
                    {currency}{r.targetPrice.toLocaleString()}
                  </span>
                  <span className={cn(
                    "text-[11.5px] font-extrabold font-mono tabular-nums text-right",
                    isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                  )}>
                    {isPositive ? "+" : ""}{r.returnPct.toFixed(0)}%
                  </span>
                  <p className="col-span-4 sm:hidden text-sm leading-snug text-neutral-600 dark:text-neutral-300 break-keep">
                    {r.config.description.short}
                  </p>
                  {isExplained && (
                    <div
                      id={`model-explanation-${r.type}`}
                      className="col-span-4 rounded-lg bg-surface-canvas dark:bg-surface-dark-canvas p-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 break-keep"
                    >
                      <p><strong className="text-neutral-900 dark:text-white">계산 방식</strong> · {r.config.description.detail}</p>
                      {r.config.description.caution && (
                        <p className="mt-1.5"><strong className="text-neutral-900 dark:text-white">주의할 점</strong> · {r.config.description.caution}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ────── 세부 모델 (필터탭 + 카드 그리드) ────── */}
      <div className="relative">
        <div className={cn(!isLoggedIn && "blur-sm select-none pointer-events-none")}>

          {/* 필터 탭 */}
          <div className="px-0 sm:px-5 py-3 border-b border-neutral-100 dark:border-border-subtle-dark flex items-center gap-1">
            {([
              { id: "ALL",     label: "전체",     count: models.length },
              { id: "ASSET",   label: "자산가치", count: assetCount },
              { id: "EARNING", label: "수익가치", count: earningCount },
            ] as { id: FilterTabType; label: string; count: number }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-pressed={activeTab === tab.id}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
                  activeTab === tab.id
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-card hover:text-neutral-800 dark:hover:text-neutral-200"
                )}
              >
                {tab.label}
                <span className={cn(
                  "text-[9px] font-black px-1.5 py-0.5 rounded-full",
                  activeTab === tab.id
                    ? "bg-white/20 dark:bg-black/20"
                    : "bg-surface-canvas dark:bg-surface-dark-card text-neutral-500 dark:text-neutral-500"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* 카드 그리드 */}
          {filteredModels.length > 0 ? (
            <div className="py-3 sm:p-5 grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
              {filteredModels.map(m => (
                <StrategyCard
                  key={m.type}
                  modelType={m.type}
                  result={m.result}
                  currency={currency}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400 dark:text-neutral-500">
              <Layers size={28} className="opacity-30" />
              <span className="text-xs font-medium">해당 카테고리의 모델이 없습니다.</span>
            </div>
          )}
        </div>

        {/* 블러 오버레이 */}
        {!isLoggedIn && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/40 to-white/95 dark:from-surface-dark-card/40 dark:to-surface-dark-card/95">
            <Link
              href={loginHref}
              className="flex min-h-11 items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 text-sm font-medium transition-colors"
            >
              <Lock size={13} />
              로그인하여 세부 모델 보기
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// StrategyCard
// =========================================================================
interface StrategyCardProps {
  modelType: ValuationModelType;
  result: ValuationResult;
  currency: string;
}

function StrategyCard({ modelType, result, currency }: StrategyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const config = MODEL_CONFIG[modelType] ?? DEFAULT_CONFIG;

  const extendedMetrics = useMemo(() => {
    if (config.extendMetrics) {
      return config.extendMetrics(result.metrics, result.rows ?? []);
    }
    return result.metrics;
  }, [result, config]);

  const baseRowIndex = useMemo(
    () =>
      result.rows.findIndex((r: any) =>
        /1\.0|100|기준|적정/i.test(
          (r.multiplier || r.label || r.weight || "").toString().replace(/\s+/g, "")
        )
      ),
    [result.rows]
  );

  return (
    <div className="bg-transparent sm:bg-white dark:sm:bg-surface-dark-card rounded-none border-0 sm:rounded-xl sm:border border-neutral-200 dark:border-border-subtle-dark overflow-hidden flex flex-col">

      {/* 상단 컬러 액센트 라인 */}
      <div className={cn("h-0.5 w-full shrink-0", config.accentLine)} />

      {/* 카드 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(open => !open)}
        aria-expanded={isExpanded}
        aria-label={`${config.name} 세부 계산 ${isExpanded ? '접기' : '보기'}`}
        className="group w-full rounded-lg sm:rounded-none px-3 sm:px-5 py-4 border-b border-neutral-100 dark:border-border-subtle-dark bg-neutral-50/70 dark:bg-white/[0.025] sm:bg-transparent dark:sm:bg-transparent text-left hover:bg-neutral-100/60 dark:hover:bg-white/5 active:bg-neutral-100 dark:active:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand transition-colors"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
            config.iconBg, config.iconColor
          )}>
            {config.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white tracking-tight break-keep">
                {config.name}
              </h3>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                config.badgeClass
              )}>
                {config.category === "ASSET" ? "자산가치" : "수익가치"}
              </span>
            </div>
          </div>
          <span aria-hidden="true" className="shrink-0 grid h-8 w-8 place-items-center rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 group-hover:bg-neutral-200/60 dark:group-hover:bg-white/10">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 break-keep">{config.description.short}</p>
      </button>

      {/* 카드 바디 */}
      {isExpanded && (
        <>
          {/* 모델 설명 */}
          <div className="px-0 sm:px-5 py-3.5 border-b border-neutral-50 dark:border-border-subtle-dark/60 bg-surface-canvas/30 dark:bg-surface-dark-card/10">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep">
              {config.description.detail}
            </p>
            <p className="mt-2 text-xs leading-relaxed font-mono text-neutral-500 dark:text-neutral-400 break-words">계산식 · {result.formula}</p>
          </div>

          {/* 핵심 지표 그리드 */}
          {extendedMetrics.length > 0 && (
            <div className="px-0 sm:px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-b border-neutral-100 dark:border-border-subtle-dark">
              {extendedMetrics.map((m: any, i: number) => (
                <div
                  key={i}
                  className="px-0 py-2 sm:p-3 border-b border-neutral-100 dark:border-border-subtle-dark"
                >
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider mb-1 truncate">
                    {m.label}
                  </p>
                  <p className="text-xs font-black font-mono text-neutral-900 dark:text-white tabular-nums truncate">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 목표주가 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-canvas dark:bg-surface-dark-card/30">
                  {result.headers.map((h: any, i: number) => (
                    <th
                      key={i}
                      className={cn(
                        "px-2 sm:px-5 py-2.5 text-xs font-extrabold text-neutral-400 uppercase tracking-wider font-mono whitespace-nowrap",
                        i > 0 && "text-right"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row: any, idx: number) => {
                  const isBase = idx === baseRowIndex;
                  const isPositive = row.returnPct >= 0;
                  const displayMultiplier = row.multiplier || row.label || row.weight || "—";

                  return (
                    <tr
                      key={idx}
                      className={cn(
                        "border-t border-neutral-100 dark:border-border-subtle-dark transition-colors",
                        isBase
                          ? "bg-surface-canvas/80 dark:bg-surface-dark-card/30"
                          : "hover:bg-surface-muted-hover/40 dark:hover:bg-surface-dark-card/10"
                      )}
                    >
                      <td className="px-2 sm:px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isBase ? config.dotBg : "bg-transparent"
                          )} />
                          <span className={cn(
                            "text-xs font-bold font-mono tracking-tight",
                            isBase ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
                          )}>
                            {displayMultiplier}
                          </span>
                          {isBase && (
                            <span className="text-[9px] font-black text-neutral-400 dark:text-neutral-500 font-mono uppercase tracking-wider">
                              적정
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-5 py-3 text-right whitespace-nowrap">
                        <span className={cn(
                          "text-xs font-black font-mono tabular-nums px-2.5 py-0.5 rounded-lg inline-block",
                          isPositive
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                            : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                        )}>
                          {isPositive ? "+" : ""}{row.returnPct.toFixed(2)}%
                        </span>
                      </td>
                      <td className={cn(
                        "px-2 sm:px-5 py-3 text-xs font-black font-mono text-right tabular-nums whitespace-nowrap",
                        isBase ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                      )}>
                        {currency}{row.targetPrice.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 푸터 노트 */}
          <div className="px-0 sm:px-5 py-3 border-t border-neutral-100 dark:border-border-subtle-dark bg-surface-canvas/30 dark:bg-surface-dark-card/10 flex items-start gap-2">
            <Sparkles size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-neutral-400 dark:text-neutral-500 leading-relaxed">
              {result.footerNotice}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
