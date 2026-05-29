"use client";

import React, { useMemo, useState } from "react";
import {
  Calculator, BarChart3, TrendingUp, ChevronDown, ChevronUp,
  Layers, Zap, Sparkles, Activity, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  calculateKrNcav,
  calculateKrSRIM,
  calculateKrDCF,
  calculateKrMultipliers,
  calculateKrPbrBand,
  calculateUsNcav,
  calculateUsSRIM,
  calculateUsPEG,
  calculateUsDCF,
  calculateUsMultipliers,
  ValuationResult,
} from "@/components/utils/financeCalc";

type ValuationModelType = "NCAV" | "SRIM" | "DCF" | "PER" | "PEG" | "PBR" | string;
type FilterTabType = "ALL" | "ASSET" | "EARNING";

// =========================================================================
// 모델 설정
// =========================================================================
interface ModelConfig {
  name: string;
  category: "ASSET" | "EARNING";
  description: { summary: string; idea: string; target: string };
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
    description: {
      summary: "유동자산에서 총부채를 차감한 순유동자산(NCAV)과 시가총액을 비교합니다. 벤자민 그레이엄의 Net-Net 전략에 기반합니다.",
      idea: "시가총액 < NCAV × 0.67이면 완전한 안전마진이 확보된 상태로 판단합니다.",
      target: "시장 소외주, 하방 경직성이 보장된 극단적 저평가 자산주",
    },
    icon: <Calculator size={14} />,
    dotBg: "bg-blue-500",
    accentLine: "bg-blue-500",
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40",
    textColor: "text-blue-600 dark:text-blue-400",
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
    description: {
      summary: "순자산(장부가) 대비 주가 비율인 PBR의 역사적 밴드 상·하단을 역산하여 목표주가를 산출합니다.",
      idea: "현재 PBR이 역사적 바닥권에 도달했는지 확인하여 매수 타이밍을 포착합니다.",
      target: "실적 변동성이 크지만 자산이 단단한 대형주, 경기 민감 사이클 종목",
    },
    icon: <Layers size={14} />,
    dotBg: "bg-cyan-500",
    accentLine: "bg-cyan-500",
    iconBg: "bg-cyan-50 dark:bg-cyan-950/40",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    badgeClass: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200/50 dark:border-cyan-800/40",
    textColor: "text-cyan-600 dark:text-cyan-400",
  },
  SRIM: {
    name: "S-RIM 초과수익",
    category: "EARNING",
    description: {
      summary: "순자산 가치에 '주주 요구수익률을 초과하는 ROE로 창출되는 미래 초과이익의 현재가치'를 더해 내재가치를 구합니다.",
      idea: "자본 효율성(ROE vs 요구수익률)을 측정해 지속 성장 기업의 내재가치를 평가합니다.",
      target: "우량 제조 강소기업, 자본 효율성이 우수하고 지속 성장이 기대되는 종목",
    },
    icon: <Activity size={14} />,
    dotBg: "bg-emerald-500",
    accentLine: "bg-emerald-500",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  DCF: {
    name: "DCF 현금흐름할인",
    category: "EARNING",
    description: {
      summary: "미래 잉여현금흐름(FCF)을 가중평균자본비용(WACC)으로 할인하여 기업의 절대적 내재가치를 산출합니다.",
      idea: "회계 이익이 아닌 실제 현금 창출력에 기반한 본질 가치를 측정합니다.",
      target: "현금흐름 예측이 안정적인 성숙기 대형주, 경제적 해자를 보유한 기업",
    },
    icon: <TrendingUp size={14} />,
    dotBg: "bg-purple-500",
    accentLine: "bg-purple-500",
    iconBg: "bg-purple-50 dark:bg-purple-950/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    badgeClass: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  PER: {
    name: "PER 멀티플",
    category: "EARNING",
    description: {
      summary: "주당순이익(EPS)에 업종 평균·과거 평균 배수를 결합하는 대중적인 상대가치 모델입니다.",
      idea: "현재 시장 심리와 섹터 평균을 반영해 직관적인 밸류에이션 상한·하한을 설정합니다.",
      target: "보편적 업종 내 종목 비교, 시장 트렌드가 빠르게 반영되는 주도주",
    },
    icon: <BarChart3 size={14} />,
    dotBg: "bg-indigo-500",
    accentLine: "bg-indigo-500",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    badgeClass: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40",
    textColor: "text-indigo-600 dark:text-indigo-400",
  },
  PEG: {
    name: "PEG 가치성장",
    category: "EARNING",
    description: {
      summary: "피터 린치가 대중화한 지표로, PER을 이익성장률(G)로 나눠 성장 프리미엄의 정당성을 검증합니다.",
      idea: "고PER이더라도 그를 압도하는 성장력이 있다면 저평가일 수 있음을 수치로 나타냅니다.",
      target: "성장 초기·중기의 기술주, 고성장 혁신 기업 및 트렌드 주도 종목",
    },
    icon: <Zap size={14} />,
    dotBg: "bg-amber-500",
    accentLine: "bg-amber-500",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeClass: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40",
    textColor: "text-amber-600 dark:text-amber-400",
  },
};

const DEFAULT_CONFIG: ModelConfig = {
  name: "기타",
  category: "ASSET",
  description: { summary: "등록되지 않은 밸류에이션 모델입니다.", idea: "", target: "" },
  icon: <BarChart3 size={14} />,
  dotBg: "bg-zinc-500",
  accentLine: "bg-zinc-400",
  iconBg: "bg-zinc-100 dark:bg-zinc-800",
  iconColor: "text-zinc-500 dark:text-zinc-400",
  badgeClass: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700",
  textColor: "text-zinc-600 dark:text-zinc-400",
};

// =========================================================================
// ValuationSection
// =========================================================================
interface ValuationSectionProps {
  data: any;
  isUs: boolean;
}

export const ValuationSection = ({ data, isUs }: ValuationSectionProps) => {
  const [activeTab, setActiveTab] = useState<FilterTabType>("ALL");
  const currency = isUs ? "$" : "₩";

  const models = useMemo(() => {
    const list: { type: ValuationModelType; result: ValuationResult }[] = [];
    if (isUs) {
      if (data?.finnhubData && data?.usDetail) {
        const ncav = calculateUsNcav(data.finnhubData, data.usDetail);
        if (typeof ncav !== "string") list.push({ type: "NCAV", result: ncav });
        const srim = calculateUsSRIM(data.finnhubData, data.usDetail);
        if (typeof srim !== "string") list.push({ type: "SRIM", result: srim });
        const peg = calculateUsPEG(data.finnhubData, data.usDetail);
        if (typeof peg !== "string") list.push({ type: "PEG", result: peg });
        const dcf = calculateUsDCF(data.finnhubData, data.usDetail);
        if (typeof dcf !== "string") list.push({ type: "DCF", result: dcf });
        const per = calculateUsMultipliers(data.finnhubData, data.usDetail);
        if (typeof per !== "string") list.push({ type: "PER", result: per });
      }
    } else {
      if (data?.kiBS && data?.kiChart) {
        const ncav = calculateKrNcav(data.kiBS, data.kiChart);
        if (ncav) list.push({ type: "NCAV", result: ncav });
        const pbr = calculateKrPbrBand(data.kiBS, data.kiChart);
        if (pbr) list.push({ type: "PBR", result: pbr });
        if (data?.kiIS) {
          const srim = calculateKrSRIM(data.kiBS, data.kiIS, data.kiChart);
          if (srim) list.push({ type: "SRIM", result: srim });
          const per = calculateKrMultipliers(data.kiBS, data.kiIS, data.kiChart);
          if (per) list.push({ type: "PER", result: per });
        }
        if (data?.kiCF) {
          const dcf = calculateKrDCF(data.kiCF, data.kiChart);
          if (dcf) list.push({ type: "DCF", result: dcf });
        }
      }
    }
    return list;
  }, [data, isUs]);

  const filteredModels = useMemo(() => {
    if (activeTab === "ALL") return models;
    return models.filter(m => (MODEL_CONFIG[m.type] ?? DEFAULT_CONFIG).category === activeTab);
  }, [models, activeTab]);

  const assetCount = models.filter(m => (MODEL_CONFIG[m.type] ?? DEFAULT_CONFIG).category === "ASSET").length;
  const earningCount = models.filter(m => (MODEL_CONFIG[m.type] ?? DEFAULT_CONFIG).category === "EARNING").length;

  if (models.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400 dark:text-zinc-500">
        <Target size={32} className="opacity-30" />
        <p className="text-sm font-medium">재무 데이터가 부족하여 밸류에이션을 계산할 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col">

      {/* ────── 모델 요약 바 ────── */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 mb-4">
          <Target size={13} className="text-zinc-400 shrink-0" />
          <span className="text-xs font-extrabold text-zinc-600 dark:text-zinc-300 tracking-tight">
            모델별 목표주가 요약
          </span>
          <span className="ml-auto text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
            {models.length} Models
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {models.map(({ type, result }) => {
            const config = MODEL_CONFIG[type] ?? DEFAULT_CONFIG;
            const baseRow =
              result.rows.find((r: any) =>
                /1\.0|100|기준|적정/i.test(
                  (r.multiplier || r.label || r.weight || "").toString().replace(/\s+/g, "")
                )
              ) ?? result.rows[0];
            const targetPrice = baseRow?.targetPrice ?? 0;
            const returnPct = baseRow?.returnPct ?? 0;
            const isPositive = returnPct >= 0;
            const barWidth = Math.min(Math.abs(returnPct), 100);

            return (
              <div key={type} className="flex items-center gap-3">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotBg)} />
                <span className={cn("text-[11px] font-black font-mono w-10 shrink-0", config.textColor)}>
                  {type}
                </span>
                <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isPositive ? "bg-emerald-500" : "bg-red-400"
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className="text-[11px] font-black font-mono tabular-nums text-zinc-800 dark:text-zinc-200 w-24 text-right shrink-0">
                  {currency}{targetPrice.toLocaleString()}
                </span>
                <span className={cn(
                  "text-[11px] font-black font-mono tabular-nums px-2 py-0.5 rounded-md w-16 text-right shrink-0",
                  isPositive
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                    : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                )}>
                  {isPositive ? "+" : ""}{returnPct.toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────── 필터 탭 ────── */}
      <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-1">
        {([
          { id: "ALL",     label: "전체",     count: models.length },
          { id: "ASSET",   label: "자산가치", count: assetCount },
          { id: "EARNING", label: "수익가치", count: earningCount },
        ] as { id: FilterTabType; label: string; count: number }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
              activeTab === tab.id
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200"
            )}
          >
            {tab.label}
            <span className={cn(
              "text-[9px] font-black px-1.5 py-0.5 rounded-full",
              activeTab === tab.id
                ? "bg-white/20 dark:bg-black/20"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ────── 카드 그리드 ────── */}
      {filteredModels.length > 0 ? (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-400 dark:text-zinc-500">
          <Layers size={28} className="opacity-30" />
          <span className="text-xs font-medium">해당 카테고리의 모델이 없습니다.</span>
        </div>
      )}
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
  const [isExpanded, setIsExpanded] = useState(true);

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
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">

      {/* 상단 컬러 액센트 라인 */}
      <div className={cn("h-0.5 w-full shrink-0", config.accentLine)} />

      {/* 카드 헤더 */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
            config.iconBg, config.iconColor
          )}>
            {config.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white tracking-tight">
                {result.title}
              </h3>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0",
                config.badgeClass
              )}>
                {config.category === "ASSET" ? "자산가치" : "수익가치"}
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate">{result.formula}</p>
          </div>
        </div>
        <div className="shrink-0 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-2">
          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* 카드 바디 */}
      {isExpanded && (
        <>
          {/* 모델 설명 */}
          <div className="px-5 py-3.5 border-b border-zinc-50 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-800/10">
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed break-keep">
              {config.description.summary}
            </p>
          </div>

          {/* 핵심 지표 그리드 */}
          {extendedMetrics.length > 0 && (
            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-b border-zinc-100 dark:border-zinc-800">
              {extendedMetrics.map((m: any, i: number) => (
                <div
                  key={i}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800"
                >
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-1 truncate">
                    {m.label}
                  </p>
                  <p className="text-xs font-black font-mono text-zinc-900 dark:text-white tabular-nums truncate">
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
                <tr className="bg-zinc-50 dark:bg-zinc-800/30">
                  {result.headers.map((h: any, i: number) => (
                    <th
                      key={i}
                      className={cn(
                        "px-5 py-2.5 text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider font-mono whitespace-nowrap",
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
                        "border-t border-zinc-100 dark:border-zinc-800 transition-colors",
                        isBase
                          ? "bg-zinc-50/80 dark:bg-zinc-800/30"
                          : "hover:bg-zinc-50/40 dark:hover:bg-zinc-800/10"
                      )}
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isBase ? config.dotBg : "bg-transparent"
                          )} />
                          <span className={cn(
                            "text-xs font-bold font-mono tracking-tight",
                            isBase ? "text-zinc-900 dark:text-white" : "text-zinc-600 dark:text-zinc-400"
                          )}>
                            {displayMultiplier}
                          </span>
                          {isBase && (
                            <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wider">
                              적정
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
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
                        "px-5 py-3 text-xs font-black font-mono text-right tabular-nums whitespace-nowrap",
                        isBase ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
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
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/10 flex items-start gap-2">
            <Sparkles size={12} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
              {result.footerNotice}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
