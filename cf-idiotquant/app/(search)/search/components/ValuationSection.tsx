"use client";

import { useLocale, useTranslations } from "next-intl";
import { useFinancialLabels } from "@/i18n/financial-labels";
import { useMemo, useState } from "react";
import styles from "./ValuationSection.module.css";
import { ChevronDown } from "lucide-react";
import { LockedAnalysisValue } from "@/components/locked-analysis-value";
import { cn } from "@/lib/utils";
import type { ValuationResult } from "@/lib/utils/financeCalc";
import { valuationModels } from "@/lib/utils/valuationModels";
import { valuationSummary, valuationComparisonAxis } from "@/lib/utils/valuationSummary";


type FilterTabType = "ALL" | "ASSET" | "EARNING";

// =========================================================================
// 모델 설정
// =========================================================================
interface ModelConfig {
  name: string;
  category: "ASSET" | "EARNING";
  extendMetrics?: (baseMetrics: any[], rows: any[]) => any[];
}

const MODEL_CONFIG = {
  NCAV: {
    name: "NCAV",
    category: "ASSET",
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
    name: "PBR",
    category: "ASSET",
  },
  SRIM: {
    name: "S-RIM",
    category: "EARNING",
  },
  DCF: {
    name: "DCF",
    category: "EARNING",
  },
  PER: {
    name: "PER",
    category: "EARNING",
  },
  PEG: {
    name: "PEG",
    category: "EARNING",
  },
} satisfies Record<string, ModelConfig>;
type ModelType = keyof typeof MODEL_CONFIG;

const DEFAULT_CONFIG: ModelConfig = { name: "", category: "ASSET" };

function modelConfig(type: string): ModelConfig {
  return Object.hasOwn(MODEL_CONFIG, type) ? MODEL_CONFIG[type as ModelType] : DEFAULT_CONFIG;
}

function formatValuationPrice(value: number | null, currency: string, locale: string) {
  return value !== null && Number.isFinite(value)
    ? `${value < 0 ? "−" : ""}${currency}${Math.abs(value).toLocaleString(locale)}`
    : null;
}

function formatValuationTextValue(value: string, locale: string) {
  if (locale === "ko") return value;
  const won = /^(-?)(?:([\d,]+)조 ?)?(?:([\d,]+)억 ?)?([\d,]+)?원$/.exec(value);
  if (won) {
    const amount = (part: string | undefined) => Number(part?.replaceAll(",", "") ?? 0);
    const [, sign, trillions, hundredMillions, units] = won;
    const total = (sign === "-" ? -1 : 1) * (amount(trillions) * 1e12 + amount(hundredMillions) * 1e8 + amount(units));
    return new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", currencyDisplay: "narrowSymbol", notation: trillions || hundredMillions ? "compact" : "standard", maximumFractionDigits: 2 }).format(total);
  }
  return locale === "en" ? value.replace(/배$/, "×") : value.replace(/배$/, "倍");
}

// =========================================================================
// ValuationSection
// =========================================================================
interface ValuationSectionProps {
  data: any;
  isUs: boolean;
  isLoggedIn?: boolean;
}

export const ValuationSection = ({ data, isUs, isLoggedIn = true }: ValuationSectionProps) => {
  const t = useTranslations("valuation");
  const locale = useLocale();
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
    const rows = valuationSummary(models).map(row => ({
      ...row,
      config: modelConfig(row.type),
    }));

    // 모델이 계산에 쓴 기준가 — returnPct = targetPrice / 기준가 − 1 이므로 역산할 수 있다.
    // 예전에는 이 값을 그대로 "현재가"라고 적었는데, 첫 유효 모델 하나에서 나온 값이라
    // 화면 상단 시세와 다른 시점일 수 있다. 이제는 시세를 우선 쓰고 이 값은 대조용으로 남긴다.
    const ref = rows.find(r => r.targetPrice !== null && r.returnPct !== null && r.returnPct > -100);
    const modelBase = ref?.targetPrice != null && ref.returnPct !== null ? ref.targetPrice / (1 + ref.returnPct / 100) : 0;
    // 시세를 못 읽는 경우(로딩 전·응답 누락)에는 기존대로 역산값으로 떨어진다 — 눈금이 비는 것보다 낫다.
    const hasMarketPrice = Number.isFinite(marketPrice) && marketPrice > 0;
    const curPrice = hasMarketPrice ? marketPrice : Number.isFinite(modelBase) && modelBase > 0 ? modelBase : 0;

    const comparison = valuationComparisonAxis(curPrice, rows.map(row => row.targetPrice));

    return {
      rows: [...rows].sort((a, b) => (b.targetPrice ?? 0) - (a.targetPrice ?? 0)),
      curPrice, modelBase, usedMarketPrice: hasMarketPrice, pos: comparison.position, difference: comparison.difference,
    };
  }, [models, marketPrice]);

  // 모델 기준가와 시세가 어긋나면 괴리율이 어느 가격 기준인지 헷갈린다 → 그 사실을 적는다.
  // 0.5% 는 호가 한두 틱 수준의 차이를 잡음으로 흘려보내기 위한 문턱이다.
  const baseGap = axis && axis.usedMarketPrice && axis.modelBase > 0
    ? Math.abs(axis.modelBase - axis.curPrice) / axis.curPrice
    : 0;
  const showBaseNote = baseGap > 0.005;

  const axisPrice = formatValuationPrice(axis.curPrice, currency, locale) ?? t("unavailable");
  const axisReference = t(axis.usedMarketPrice ? "currentLegend" : "baseLegend", { price: axisPrice });
  const curLabelPos = axis ? axis.pos(axis.curPrice) : 0;

  const filteredModels = useMemo(() => {
    if (activeTab === "ALL") return models;
    return models.filter(m => modelConfig(m.type).category === activeTab);
  }, [models, activeTab]);

  if (models.length === 0) {
    return <p className="py-4 text-sm text-neutral-600 dark:text-neutral-300">{t("noData")}</p>;
  }

  return (
    <div className="w-full flex flex-col">

      {/* ────── 모델별 적정주가 (모델별 트랙) ────── */}
      {axis && (
        <div className={cn(styles.chartHeader, "px-0 sm:px-5 pb-2 border-b border-neutral-100 dark:border-border-subtle-dark")}>
          <p className="mb-1 text-sm font-semibold">{t("title")}</p>
          <p className="mb-2 text-[0.8125rem] text-neutral-600 dark:text-neutral-300">
            {t("sameAxis", { reference: t(axis.usedMarketPrice ? "currentPrice" : "calculationPrice") })}
          </p>
          {showBaseNote && (
            <p className="mb-2.5 text-[0.9375rem] leading-relaxed text-neutral-600 dark:text-neutral-300 break-keep">
              {t("baseNotice", { price: `${currency}${axis.modelBase.toLocaleString(locale, { maximumFractionDigits: isUs ? 2 : 0 })}` })}
            </p>
          )}

          <div className={styles.legend}>
            <span><i className={styles.currentKey} aria-hidden="true" />{axisReference}</span>
            <span><i className={styles.targetKey} aria-hidden="true" />{t("fairPrice")}</span>
          </div>
          {/* 모델별 트랙 — 축과 목록을 한 줄에 합친다. 점과 이름이 같은 행에 있으면
              "이 점이 어느 모델인지" 를 색으로 되짚을 필요가 없다.
              모든 행이 같은 min~max 스케일을 쓰므로 세로로 곧장 비교된다. */}
          <div className={styles.axis}>
            {axis.curPrice > 0 && <div
              className={styles.referenceColumn}
              style={{ gridRow: `1 / span ${axis.rows.length}` }}
              aria-hidden="true"
            >
              <div className={styles.currentLine} style={{ left: `${curLabelPos}%` }} />
            </div>}
            {axis.rows.map((r, index) => {
              const difference = axis.difference(r.targetPrice);
              const isPositive = difference !== null && difference >= 0;
              const target = r.targetPrice !== null ? axis.pos(r.targetPrice) : null;
              const priceLabel = formatValuationPrice(r.targetPrice, currency, locale) ?? t("unavailable");
              const modelName = r.config.name || t("other");
              const modelType = r.type as ModelType;
              const isExplained = (hoveredModel ?? selectedModel) === r.type;
              return (
                <div
                  key={r.type}
                  onPointerEnter={event => { if (event.pointerType === "mouse") setHoveredModel(r.type); }}
                  onPointerLeave={event => { if (event.pointerType === "mouse") setHoveredModel(null); }}
                  className={cn(styles.modelRow, "grid grid-cols-[subgrid] items-center border-t border-neutral-100 dark:border-border-subtle-dark")}
                  style={{ gridRow: index + 1 }}
                >
                  <div className={cn(styles.modelLabel, "min-w-0")}>
                    <button
                      type="button"
                      onClick={() => {
                        setHoveredModel(null);
                        setSelectedModel(current => current === r.type ? null : r.type);
                      }}
                      onFocus={event => { if (event.currentTarget.matches(":focus-visible")) setHoveredModel(r.type); }}
                      onBlur={() => setHoveredModel(null)}
                      aria-label={t("modelDescription", { model: modelName })}
                      aria-expanded={isExplained}
                      aria-controls={isExplained ? `model-explanation-${r.type}` : undefined}
                      className="inline-flex min-h-11 w-full items-center gap-1 text-left text-[0.8125rem] font-medium text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 focus-visible:outline-2 focus-visible:outline-brand rounded-sm"
                    >
                      <span>{modelName}</span><ChevronDown size={12} aria-hidden="true" className={cn("shrink-0 text-neutral-600 dark:text-neutral-300 transition-transform", isExplained && "rotate-180")} />
                    </button>
                  </div>

                  <div
                    className={styles.track}
                    role="img"
                    aria-label={t("chartLabel", { model: modelName, reference: axisReference, target: priceLabel, difference: difference === null ? "" : t("chartDifference", { value: difference.toFixed(1) }) })}
                  >
                    <div className={styles.baseline} />
                    {target !== null && difference !== null && <div
                      className={cn(styles.gap, isPositive ? styles.higher : styles.lower)}
                      style={{ left: `${Math.min(curLabelPos, target)}%`, width: `${Math.abs(target - curLabelPos)}%` }}
                    />}
                    {target !== null && <div
                      className={cn(styles.targetMarker, difference === null ? styles.neutral : isPositive ? styles.higher : styles.lower)}
                      style={{ left: `${target}%` }}
                    />}
                    {axis.curPrice > 0 && <div className={styles.currentMarker} style={{ left: `${curLabelPos}%` }} />}
                  </div>

                  <span className={cn(styles.price, "whitespace-nowrap text-[0.875rem] font-semibold tabular-nums text-neutral-900 dark:text-neutral-100 text-right")}>
                    {priceLabel}
                  </span>
                  <span className={cn(
                    styles.returnPct,
                    "whitespace-nowrap text-[0.8125rem] font-semibold font-mono tabular-nums text-right",
                    difference === null ? "text-neutral-500 dark:text-neutral-400" : isPositive ? "text-emerald-700 dark:text-emerald-300" : "text-red-500 dark:text-red-400"
                  )}>
                    {difference !== null ? `${isPositive ? "+" : ""}${difference.toFixed(0)}%` : "—"}
                  </span>
                  {r.notice && (
                    <p className={cn(styles.notice, "col-span-4 text-[0.9375rem] leading-normal text-neutral-600 dark:text-neutral-300 break-keep")}>
                      {t("unavailableEstimate")}
                    </p>
                  )}
                  {isExplained && (
                    <div
                      id={`model-explanation-${r.type}`}
                      className={cn(styles.explanation, "col-span-4 rounded-lg bg-surface-canvas dark:bg-surface-dark-canvas p-3 text-[0.9375rem] leading-relaxed text-neutral-700 dark:text-neutral-300 break-keep")}
                    >
                      <p><strong className="text-neutral-900 dark:text-white">{t("how")}</strong> · {r.config.name ? t(`${modelType}Detail`) : t("otherDetail")}</p>
                      {r.config.name && (
                        <p className="mt-1.5"><strong className="text-neutral-900 dark:text-white">{t("caution")}</strong> · {t(`${modelType}Caution`)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div role="group" aria-label={t("modelFilters")} className={cn(styles.modelFilters, "flex flex-wrap items-center gap-1 border-b border-neutral-200 py-1 dark:border-border-subtle-dark")}>
        {([
          { id: "ALL", label: t("all") },
          { id: "ASSET", label: t("asset") },
          { id: "EARNING", label: t("earnings") },
        ] as const).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={cn("min-h-11 rounded px-2.5 text-sm", activeTab === tab.id
              ? "bg-surface-canvas font-semibold text-brand-ink dark:bg-surface-dark-muted"
              : "text-neutral-600 hover:bg-surface-canvas dark:text-neutral-300 dark:hover:bg-surface-dark-muted")}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {filteredModels.length > 0 ? (
        <div className={cn(styles.modelCards, "grid grid-cols-1 gap-1 py-2")}>
          {filteredModels.map(model => (
            <StrategyCard key={model.type} modelType={model.type} result={model.result} currency={currency} showScenarios={isLoggedIn} />
          ))}
        </div>
      ) : (
        <p className="py-3 text-sm text-neutral-600 dark:text-neutral-300">{t("noCategory")}</p>
      )}
    </div>
  );
};

// =========================================================================
// StrategyCard
// =========================================================================
interface StrategyCardProps {
  modelType: string;
  result: ValuationResult;
  currency: string;
  showScenarios: boolean;
}

function StrategyCard({ modelType, result, currency, showScenarios }: StrategyCardProps) {
  const t = useTranslations("valuation");
  const locale = useLocale();
  const label = useFinancialLabels();
  const [isExpanded, setIsExpanded] = useState(false);

  const config = modelConfig(modelType);
  const heading = t("calculation", { model: config.name || t("other") });

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

      <button
        type="button"
        onClick={() => setIsExpanded(open => !open)}
        aria-expanded={isExpanded}
        aria-label={heading}
        className="flex min-h-11 w-full items-center justify-between gap-2 border-b border-neutral-100 px-3 py-1 text-left text-sm font-semibold hover:bg-neutral-100 dark:border-border-subtle-dark dark:hover:bg-white/5"
      >
        <span>{heading}</span>
        <ChevronDown size={15} aria-hidden="true" className={cn("shrink-0 text-neutral-600 transition-transform dark:text-neutral-300", isExpanded && "rotate-180")} />
      </button>

      {/* 카드 바디 */}
      {isExpanded && (
        <>
          {/* 모델 설명 */}
          <div className="px-0 sm:px-5 py-3.5 border-b border-neutral-50 dark:border-border-subtle-dark/60 bg-surface-canvas/30 dark:bg-surface-dark-card/10">
            <p className="text-[0.9375rem] text-neutral-500 dark:text-neutral-400 leading-relaxed break-keep">
              {config.name ? t(`${modelType as ModelType}Detail`) : t("otherDetail")}
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed font-mono text-neutral-500 dark:text-neutral-400 break-words">{t("formula", { formula: label(result.formula) })}</p>
          </div>

          {/* 핵심 지표 그리드 */}
          {extendedMetrics.length > 0 && (
            <div className="grid grid-cols-2 gap-x-3 px-3 py-2 border-b border-neutral-100 dark:border-border-subtle-dark">
              {extendedMetrics.map((m: any, i: number) => (
                <div
                  key={i}
                  className="min-w-0 py-2"
                >
                  <p className="text-[0.8125rem] text-neutral-600 dark:text-neutral-300 mb-1 font-medium break-words">
                    {label(m.label)}
                  </p>
                  <p className="text-[0.8125rem] font-semibold font-mono text-neutral-900 dark:text-white tabular-nums break-words">
                    {formatValuationTextValue(m.value, locale)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 목표주가 테이블 */}
          <div className="relative overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-canvas dark:bg-surface-dark-card/30">
                  {result.headers.map((h: any, i: number) => (
                    <th
                      key={i}
                      className={cn(
                        "px-2 sm:px-5 py-2.5 text-[0.8125rem] font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-normal font-mono whitespace-nowrap",
                        i > 0 && "text-right"
                      )}
                    >
                      {label(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row: any, idx: number) => {
                  const isBase = idx === baseRowIndex;
                  const locked = !showScenarios && idx !== Math.max(0, baseRowIndex);
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
                            "text-[0.8125rem] font-bold font-mono tracking-tight",
                            isBase ? "text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"
                          )}>
                            {displayMultiplier.startsWith("영구성장 ") ? t("perpetualGrowth", { value: displayMultiplier.slice(5, -1) })
                              : /^PEG [\d.]+배 기준$/.test(displayMultiplier) ? t("pegScenario", { value: displayMultiplier.split(" ")[1].slice(0, -1) })
                              : formatValuationTextValue(displayMultiplier, locale)}
                          </span>
                          {isBase && (
                            <span className="text-[0.8125rem] font-semibold text-neutral-600 dark:text-neutral-300 font-mono uppercase tracking-normal">
                              {t("assumption")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-5 py-3 text-right whitespace-nowrap">
                        {locked ? <LockedAnalysisValue /> : !Number.isFinite(row.returnPct) ? "—" : <span className={cn(
                          "text-[0.8125rem] font-semibold font-mono tabular-nums px-2.5 py-0.5 rounded-lg inline-block",
                          isPositive
                            ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                            : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30"
                        )}>
                          {isPositive ? "+" : ""}{row.returnPct.toFixed(2)}%
                        </span>}
                      </td>
                      <td className={cn(
                        "px-2 sm:px-5 py-3 text-[0.8125rem] font-semibold font-mono text-right tabular-nums whitespace-nowrap",
                        isBase ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                      )}>
                        {locked ? <LockedAnalysisValue /> : (formatValuationPrice(row.targetPrice, currency, locale) ?? t("unavailable"))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 푸터 노트 */}
          <div className="px-0 sm:px-5 py-3 border-t border-neutral-100 dark:border-border-subtle-dark bg-surface-canvas/30 dark:bg-surface-dark-card/10 flex items-start gap-2">
            <p className="text-[0.9375rem] text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {label(result.footerNotice)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
