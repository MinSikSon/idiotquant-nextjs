"use client";

import { useLocale, useTranslations } from "next-intl";
import { annualKrIncomeRows, latestFirst } from "@/lib/utils/financialPeriods";

import { useCallback, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LockedAnalysisValue } from "@/components/locked-analysis-value";
import {
  AlertTriangle, CheckCircle2, XCircle,
  Minus, TrendingUp, TrendingDown, ChevronDown,
} from "lucide-react";
import { fmtJoEok } from "@/lib/utils/financeCalc";
import styles from "../analyze.module.css";

interface DelistingRiskProps {
  showHistory: boolean;
  kiBS: any;
  kiIS: any;
}

type CriterionStatus = "위험" | "주의" | "양호" | "—";

interface Criterion {
  label: string;
  value: string;
  status: CriterionStatus;
  note: string;
  law: string;
}

// ── 연도별 영업이익 요약 ─────────────────────────────────────────────
interface OpYear {
  year: string;   // "YYYY"
  op: number;     // 영업이익 (억원)
  rev: number;    // 매출액 (억원)
  sgna: number;   // 판관비 (억원)
  nonOpInc: number; // 영업외수익 (억원)
}

// ── 의심 신호 ────────────────────────────────────────────────────────
interface SuspicionFlag {
  label: string;
  desc: ReactNode;
}

const STATUS_ICON: Record<CriterionStatus, React.ElementType> = {
  "위험": XCircle,
  "주의": AlertTriangle,
  "양호": CheckCircle2,
  "—":    Minus,
};

const STATUS_COLOR: Record<CriterionStatus, string> = {
  "위험": "text-red-600 dark:text-red-400",
  "주의": "text-amber-600 dark:text-amber-400",
  "양호": "text-emerald-700 dark:text-emerald-300",
  "—":    "text-neutral-600 dark:text-neutral-300",
};

const STATUS_ROW_CLS: Record<CriterionStatus, string> = {
  "위험": "bg-red-50/70 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40",
  "주의": "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40",
  "양호": "bg-surface-canvas dark:bg-surface-dark-card/50 border-neutral-100 dark:border-border-subtle-dark",
  "—":    "bg-surface-canvas dark:bg-surface-dark-card/50 border-neutral-100 dark:border-border-subtle-dark",
};

const OVERALL_CONFIG = {
  "위험": {
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/50",
    sub: "dangerSummary",
  },
  "주의": {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
    sub: "cautionSummary",
  },
  "양호": {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    sub: "okSummary",
  },
} as const;

// ── 영업이익 추이 바 (최대 절대값 기준 정규화) ───────────────────────
function OpBar({ val, max }: { val: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.abs(val) / max, 1) * 100 : 0;
  const isPos = val >= 0;
  return (
    <div className="h-2.5 min-w-0 rounded-full bg-neutral-100 dark:bg-surface-dark-muted overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", isPos ? "bg-emerald-400 dark:bg-emerald-500" : "bg-red-400 dark:bg-red-500")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function DelistingRisk({ kiBS, kiIS, showHistory }: DelistingRiskProps) {
  const t = useTranslations("risk");
  const locale = useLocale();
  const statusLabel = (status: "위험" | "주의" | "양호" | "—") =>
    t(({ "위험": "danger", "주의": "caution", "양호": "ok", "—": "noData" } as const)[status]);
  const formatCurrency = useMemo(() => new Intl.NumberFormat(locale, {
    style: "currency", currency: "KRW", currencyDisplay: "narrowSymbol", notation: "compact", maximumFractionDigits: 2,
  }), [locale]);
  const formatEok = useCallback((value: number) => locale === "ko" ? fmtJoEok(value) : formatCurrency.format(value * 100_000_000), [formatCurrency, locale]);
  const result = useMemo(() => {
    const bs = latestFirst<any>(kiBS?.output)[0];
    const rawPeriods: any[] = annualKrIncomeRows<any>(kiIS);
    if (!bs || rawPeriods.length === 0) return null;

    // ── IS: 최신순 정렬 ───────────────────────────────────────────────
    const periods = [...rawPeriods].sort((a, b) =>
      String(b.stac_yymm ?? "").localeCompare(String(a.stac_yymm ?? ""))
    );
    const is_ = periods[0];

    const cpfn      = Number(bs.cpfn       ?? 0);
    const totalCptl = Number(bs.total_cptl ?? 0);
    const cras      = Number(bs.cras       ?? 0);
    const flowLblt  = Number(bs.flow_lblt  ?? 0);

    const saleAccount = Number(is_.sale_account ?? 0);
    const bsopPrti    = Number(is_.bsop_prti    ?? 0);
    const thtrNtin    = Number(is_.thtr_ntin    ?? 0);

    const fmt = (v: number) => `${v >= 0 ? "+" : "-"}${formatEok(Math.abs(v))}`;

    const criteria: Criterion[] = [];

    // ── 1. 자본잠식률 ────────────────────────────────────────────────
    if (cpfn > 0) {
      const rate = ((cpfn - totalCptl) / cpfn) * 100;
      let status: CriterionStatus;
      let note: string;
      if (totalCptl <= 0) {
        status = "위험";
        note = t("capitalComplete");
      } else if (rate >= 50) {
        status = "위험";
        note = t("capitalHigh");
      } else if (rate > 0) {
        status = "주의";
        note = t("capitalModerate");
      } else {
        status = "양호";
        note = "";
      }
      criteria.push({ label: t("capitalImpairment"), value: `${rate.toFixed(1)}%`, status, note, law: t("bothMarkets") });
    } else {
      criteria.push({ label: t("capitalImpairment"), value: "—", status: "—", note: t("capitalMissing"), law: t("bothMarkets") });
    }

    // ── 2. 영업이익 (최신 1개년) ─────────────────────────────────────
    criteria.push({
      label: t("operatingIncome"),
      value: fmt(bsopPrti),
      status: bsopPrti >= 0 ? "양호" : "주의",
      note: bsopPrti < 0 ? t("operatingLossRule") : "",
      law: t("kospiRule"),
    });

    // ── 3. 당기순이익 ────────────────────────────────────────────────
    criteria.push({
      label: t("netIncome"),
      value: fmt(thtrNtin),
      status: thtrNtin >= 0 ? "양호" : "주의",
      note: thtrNtin < 0 ? t("netLossWarning") : "",
      law: "참고지표",
    });

    // ── 4. 매출액 ────────────────────────────────────────────────────
    {
      let status: CriterionStatus;
      let note: string;
      if (saleAccount <= 0) {
        status = "—"; note = "";
      } else if (saleAccount < 50) {
        status = "위험"; note = t("revenueRisk");
      } else if (saleAccount < 100) {
        status = "주의"; note = t("revenueWatch");
      } else {
        status = "양호"; note = "";
      }
      criteria.push({ label: t("revenue"), value: saleAccount > 0 ? formatEok(saleAccount) : "—", status, note, law: t("bothMarkets") });
    }

    // ── 5. 유동비율 ─────────────────────────────────────────────────
    if (flowLblt > 0) {
      const ratio = (cras / flowLblt) * 100;
      criteria.push({
        label: t("currentRatio"),
        value: `${ratio.toFixed(0)}%`,
        status: ratio < 100 ? "주의" : "양호",
        note: ratio < 100 ? t("liquidityWarning") : "",
        law: "참고지표",
      });
    } else {
      criteria.push({ label: t("currentRatio"), value: "—", status: "—", note: t("noCurrentLiabilities"), law: "참고지표" });
    }

    // ── 영업이익 연속 이력 + 관리종목 회피 의심 분석 ────────────────
    const opYears: OpYear[] = periods.slice(0, 5).map(p => ({
      year: String(p.stac_yymm ?? "").slice(0, 4),
      op:      Number(p.bsop_prti    ?? 0),
      rev:     Number(p.sale_account ?? 0),
      sgna:    Number(p.sell_mang    ?? 0),
      nonOpInc: Number(p.bsop_non_ernn ?? 0),
    }));

    // 최신연도 기준 직전 N년 연속 손실 카운트
    let prevLossCount = 0;
    for (let i = 1; i < opYears.length; i++) {
      if (opYears[i].op < 0) prevLossCount++;
      else break;
    }

    const curOp  = opYears[0];
    const prevOp = opYears[1] ?? null;

    // 관리종목 회피 의심 패턴: 직전 3년 이상 손실 + 현재년 흑자전환
    const isAvoidancePattern = curOp.op > 0 && prevLossCount >= 3;

    // 의심 신호 목록
    const flags: SuspicionFlag[] = [];

    if (isAvoidancePattern) {
      // ① 마진이 극미 (영업이익률 < 0.5%)
      if (curOp.rev > 0 && (curOp.op / curOp.rev) * 100 < 0.5) {
        flags.push({
          label: t("thinMargin"),
          desc: t("thinMarginDetail", { margin: ((curOp.op / curOp.rev) * 100).toFixed(2) }),
        });
      }

      // ② 판관비 급감 (전년 대비 30%+ 감소)
      if (prevOp && prevOp.sgna > 0 && curOp.sgna > 0) {
        const sgnaDrop = (prevOp.sgna - curOp.sgna) / prevOp.sgna;
        if (sgnaDrop >= 0.30) {
          flags.push({
            label: t("sgaDrop"),
            desc: t.rich("sgaDropDetail", {
              drop: () => showHistory ? `${(sgnaDrop * 100).toFixed(0)}%` : <LockedAnalysisValue />,
              before: () => showHistory ? formatEok(prevOp.sgna) : <LockedAnalysisValue />,
              after: formatEok(curOp.sgna),
            }),
          });
        }
      }

      // ③ 매출 감소 중 흑자전환
      if (prevOp && prevOp.rev > 0 && curOp.rev < prevOp.rev) {
        flags.push({
          label: t("revenueDownProfit"),
          desc: t.rich("revenueDownProfitDetail", {
            before: () => showHistory ? formatEok(prevOp.rev) : <LockedAnalysisValue />,
            after: formatEok(curOp.rev),
          }),
        });
      }

      // ④ 영업외수익이 영업이익보다 큼 (영업이익의 질 낮음)
      if (curOp.nonOpInc > curOp.op && curOp.nonOpInc > 0) {
        flags.push({
          label: t("nonOperatingHigh"),
          desc: t("nonOperatingHighDetail", { nonOperating: formatEok(curOp.nonOpInc), operating: formatEok(curOp.op) }),
        });
      }
    }

    // 연속 손실 상태 요약 (현재년 포함)
    let consLossStatus: "위험" | "주의" | "양호" | "—" = "양호";
    let consLossCount = 0;
    for (const y of opYears) {
      if (y.op < 0) consLossCount++;
      else break;
    }
    if (consLossCount >= 4) consLossStatus = "위험";
    else if (consLossCount >= 2 || isAvoidancePattern) consLossStatus = "주의";

    const maxAbsOp = Math.max(...opYears.map(y => Math.abs(y.op)), 1);

    const hasDanger  = criteria.some(c => c.status === "위험");
    const hasCaution = criteria.some(c => c.status === "주의") || consLossStatus !== "양호";
    const overall: "위험" | "주의" | "양호" = hasDanger ? "위험" : hasCaution ? "주의" : "양호";

    return { criteria, overall, opYears, maxAbsOp, consLossCount, consLossStatus, isAvoidancePattern, flags, prevLossCount };
  }, [kiBS, kiIS, showHistory, formatEok, t]);

  if (!result) return null;

  const { criteria, overall, opYears, maxAbsOp, consLossCount, consLossStatus, isAvoidancePattern, flags, prevLossCount } = result;
  const cfg = OVERALL_CONFIG[overall];

  return (
    <div data-share-risk data-share-overall={overall} className="bg-transparent sm:bg-white dark:sm:bg-surface-dark-card rounded-none border-0 sm:rounded-xl sm:border border-neutral-200 dark:border-border-subtle-dark overflow-hidden">

      {/* ── 헤더 ── */}
      <div className={cn(styles.riskHeader, "px-0 sm:px-3 py-2 border-b border-neutral-100 dark:border-border-subtle-dark flex items-center justify-between shrink-0")}>
        <h3 className="text-sm font-semibold">{t("krTitle")} <span className="font-normal text-neutral-600 dark:text-neutral-300">{t("krx")}</span></h3>
        <span className={cn("px-2.5 py-1 rounded-lg text-[15px] font-semibold border shrink-0", cfg.badge)}>
          {statusLabel(overall)}
        </span>
      </div>

      {/* ── 본문 ── */}
      <div className={cn(styles.riskBody, "pt-2 sm:px-3 sm:pb-2 space-y-1")}>
        <p className="text-[13px] text-neutral-600 dark:text-neutral-300">{t(cfg.sub)}</p>

        {/* 기준 항목 목록 */}
        {criteria.map(c => {
          const Icon = STATUS_ICON[c.status];
          const hasLaw = c.law !== "참고지표";
          const hasDetails = hasLaw || Boolean(c.note);
          const Row = hasDetails ? "details" : "div";
          const RowBody = hasDetails ? "summary" : "div";
          return (
            <Row key={c.label} data-share-risk-row data-share-label={c.label} data-share-status={c.status} data-share-value={c.value} data-share-note={c.note} data-share-law={c.law} className={cn("group rounded-lg border", STATUS_ROW_CLS[c.status])}>
              <RowBody className={cn("flex min-h-11 items-center gap-2 rounded-lg px-2 py-1", hasDetails && "cursor-pointer list-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current [&::-webkit-details-marker]:hidden")}>
                <Icon size={14} aria-hidden="true" className={cn("shrink-0", STATUS_COLOR[c.status])} />
                <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                  <span className="mr-auto break-words text-[0.8125rem] font-bold text-neutral-700 dark:text-neutral-300">{c.label}</span>
                  {c.value !== "—" && <span className={cn("min-w-0 break-words font-mono text-sm font-semibold tabular-nums", STATUS_COLOR[c.status])}>{c.value}</span>}
                  <span className={cn("whitespace-nowrap text-[0.8125rem] font-semibold", STATUS_COLOR[c.status])}>{statusLabel(c.status)}</span>
                </span>
                {hasDetails && <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-neutral-500 group-open:rotate-180 dark:text-neutral-400" />}
              </RowBody>
              {hasDetails && (
                <div className="space-y-1 break-words pb-2 pl-9 pr-3 text-[0.8125rem] leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {c.note && <p>{c.note}</p>}
                  {hasLaw && <p>{t("criteria")} · {c.law}</p>}
                </div>
              )}
            </Row>
          );
        })}

        {/* ── 영업이익 연속 이력 ────────────────────────────────────── */}
        {opYears.length >= 2 && (
          <div className={cn(
            "mt-1 px-2 py-2 rounded-xl border",
            consLossStatus === "위험" ? STATUS_ROW_CLS["위험"]
            : consLossStatus === "주의" ? STATUS_ROW_CLS["주의"]
            : STATUS_ROW_CLS["양호"],
          )}>
            {/* 섹션 헤더 */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                {consLossStatus === "위험"
                  ? <TrendingDown size={13} className="text-red-500 shrink-0" />
                  : consLossStatus === "주의"
                  ? <TrendingDown size={13} className="text-amber-500 shrink-0" />
                  : <TrendingUp size={13} className="text-emerald-500 shrink-0" />
                }
                <span className="text-[15px] font-bold text-neutral-700 dark:text-neutral-300">{t("annualOperating")}</span>
              </div>
              <span className={cn(
                "text-[13px] font-semibold px-2 py-0.5 rounded font-mono",
                consLossCount >= 4 ? "text-red-600 bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                : consLossCount >= 2 ? "text-amber-600 bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
                : "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
              )}>
                {consLossCount >= 1 ? t.rich("lossYears", { count: () => showHistory ? consLossCount : <LockedAnalysisValue /> }) : t("noLossYears")}
              </span>
            </div>

            {/* 연도별 바 */}
            <div className="space-y-2">
              {opYears.map((y, i) => (
                <div key={y.year} className={cn(styles.riskYear, "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[6rem_minmax(0,1fr)_auto]")}>
                  <span className="flex items-center gap-2 whitespace-nowrap text-[15px] font-mono tabular-nums text-neutral-600 dark:text-neutral-300">
                    {y.year}
                    {i === 0 && <span className="text-[13px] font-sans text-neutral-500 dark:text-neutral-400">{t("latest")}</span>}
                  </span>
                  <span className={cn(
                    "text-right text-[15px] font-bold font-mono tabular-nums whitespace-nowrap sm:order-3",
                    (showHistory || i === 0) && (y.op >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"),
                  )}>
                    {!showHistory && i > 0 ? <LockedAnalysisValue /> : <>{y.op >= 0 ? "+" : "-"}{formatEok(Math.abs(y.op))}</>}
                  </span>
                  <div className="col-span-2 min-w-0 sm:order-2 sm:col-span-1">
                    {showHistory || i === 0
                      ? <OpBar val={y.op} max={showHistory ? maxAbsOp : Math.abs(y.op)} />
                      : <div aria-hidden="true" className="h-2.5 w-1/2 rounded-full bg-neutral-400 blur-[3px] dark:bg-neutral-500" />}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[13px] text-neutral-600 dark:text-neutral-300 mt-2">
              {t("lossRule")}
            </p>
          </div>
        )}

        {/* ── 관리종목 회피 의심 패턴 ───────────────────────────────── */}
        {isAvoidancePattern && (
          <div className="px-3.5 py-3.5 rounded-xl border bg-orange-50/60 dark:bg-orange-950/10 border-orange-200/70 dark:border-orange-900/40">
            <div className="flex items-start gap-2 mb-2.5">
              <div>
                <span className="text-[13px] font-bold text-orange-700 dark:text-orange-400">
                  {t("returnedToProfit")}
                </span>
                <p className="text-[13px] text-orange-600/80 dark:text-orange-400/70 mt-0.5 leading-relaxed">
                  {t.rich("returnedToProfitDetail", { count: () => showHistory ? prevLossCount : <LockedAnalysisValue /> })}
                </p>
              </div>
            </div>

            {flags.length > 0 ? (
              <div className="space-y-2 mt-1">
                {flags.map(f => (
                  <div key={f.label} className="flex items-start gap-2 pl-1">
                    <span className="text-orange-500 text-[13px] mt-0.5 shrink-0">•</span>
                    <div>
                      <span className="text-[13px] font-bold text-orange-700 dark:text-orange-400">{f.label}: </span>
                      <span className="text-[13px] text-orange-600/80 dark:text-orange-400/70 leading-relaxed">{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-orange-600/70 dark:text-orange-400/60 pl-5">
                {t("noMoreSignals")}
              </p>
            )}

            <p className="text-[13px] text-orange-500/60 dark:text-orange-400/50 mt-2 font-mono">
              {t("readFilings")}
            </p>
          </div>
        )}

        {/* ── 푸터 ─────────────────────────────────────────────────── */}
        <p className="text-[13px] text-neutral-600 dark:text-neutral-300 pt-2 leading-relaxed border-t border-neutral-100 dark:border-border-subtle-dark">
          {t("riskSource")}
        </p>
      </div>
    </div>
  );
}
