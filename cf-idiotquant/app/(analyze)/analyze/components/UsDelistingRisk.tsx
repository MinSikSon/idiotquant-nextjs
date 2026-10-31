"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Minus, Eye, ChevronDown,
} from "lucide-react";

type Status = "위험" | "주의" | "양호" | "—";

interface Criterion {
  label: string;
  value: string;
  status: Status;
  note: string;
  law: string;
}

interface OpYear {
  year: string;
  op: number;
  rev: number;
}

interface SuspicionFlag {
  label: string;
  desc: string;
}

function findVal(arr: any[], concepts: string[]): number | null {
  if (!arr?.length) return null;
  for (const c of concepts) {
    const item = arr.find((i: any) => i.concept === c || i.concept === `us-gaap_${c}`);
    if (item?.value != null) {
      const n = Number(item.value);
      return isNaN(n) ? null : n;
    }
  }
  return null;
}

function fmtUSD(v: number | null): string {
  if (v === null) return "—";
  const abs = Math.abs(v);
  const s = v < 0 ? "-" : "+";
  if (abs >= 1e12) return `${s}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${s}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${s}$${(abs / 1e6).toFixed(1)}M`;
  return `${s}$${Math.round(abs).toLocaleString()}`;
}

function fmtUSDPlain(v: number | null): string {
  if (v === null) return "—";
  const abs = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (abs >= 1e12) return `${s}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${s}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${s}$${(abs / 1e6).toFixed(1)}M`;
  return `${s}$${Math.round(abs).toLocaleString()}`;
}

const STATUS_ICON = {
  "위험": XCircle,
  "주의": AlertTriangle,
  "양호": CheckCircle2,
  "—":    Minus,
} as const;

const STATUS_COLOR: Record<Status, string> = {
  "위험": "text-red-600 dark:text-red-400",
  "주의": "text-amber-600 dark:text-amber-400",
  "양호": "text-emerald-700 dark:text-emerald-300",
  "—":    "text-neutral-600 dark:text-neutral-300",
};

const STATUS_ROW_CLS: Record<Status, string> = {
  "위험": "bg-red-50/70 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40",
  "주의": "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40",
  "양호": "bg-surface-canvas dark:bg-surface-dark-card/50 border-neutral-100 dark:border-border-subtle-dark",
  "—":    "bg-surface-canvas dark:bg-surface-dark-card/50 border-neutral-100 dark:border-border-subtle-dark",
};

const OVERALL_CONFIG: Record<Exclude<Status, "—">, { badge: string; sub: string }> = {
  "위험": {
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/50",
    sub: "NYSE/NASDAQ 상장유지 기준 위반 가능성",
  },
  "주의": {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
    sub: "재무 건전성 악화 요인 존재",
  },
  "양호": {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    sub: "주요 상장유지 기준 충족",
  },
};

function OpBar({ val, max }: { val: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.abs(val) / max, 1) * 100 : 0;
  const isPos = val >= 0;
  return (
    <div className="h-2.5 min-w-0 bg-neutral-100 dark:bg-surface-dark-muted rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all",
          isPos ? "bg-emerald-400 dark:bg-emerald-500" : "bg-red-400 dark:bg-red-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface Props {
  finnhubData: any;
  usDetail: any;
}

export function UsDelistingRisk({ finnhubData, usDetail }: Props) {
  const result = useMemo(() => {
    const allReports: any[] = finnhubData?.annualData ?? finnhubData?.data ?? [];
    const annuals = allReports
      .filter((r: any) => /^(10-K|20-F|40-F)(\/A)?$/.test(r.form ?? ""))
      .sort((a: any, b: any) => (b.year ?? 0) - (a.year ?? 0))
      .slice(0, 5);

    if (annuals.length === 0) return null;

    const latest = annuals[0];
    const bs = finnhubData?.data?.[0]?.report?.bs ?? [];
    const ic = latest.report?.ic ?? [];
    const cf = latest.report?.cf ?? [];

    const equity = findVal(bs, [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ]);
    const currentAssets = findVal(bs, ["AssetsCurrent"]);
    const currentLiab   = findVal(bs, ["LiabilitiesCurrent"]);

    const revenue   = findVal(ic, [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "SalesRevenueNet",
    ]);
    const opIncome  = findVal(ic, ["OperatingIncomeLoss"]);
    const netIncome = findVal(ic, ["NetIncomeLoss"]);
    const cfo       = findVal(cf, ["NetCashProvidedByUsedInOperatingActivities"]);

    const price = Number(usDetail?.output?.last ?? 0);

    const criteria: Criterion[] = [];

    // 1. 주가
    if (price > 0) {
      criteria.push({
        label: "주가",
        value: `$${price.toFixed(2)}`,
        status: price < 1 ? "위험" : price < 5 ? "주의" : "양호",
        note: price < 1
          ? "$1 미만 — 30일 지속 시 NYSE/NASDAQ 상장폐지 통보"
          : price < 5
          ? "$5 미만 — 일부 기관투자자 제한, 패닉셀 위험"
          : "$5 이상, 정상 범위",
        law: "NASDAQ Rule 5550(a)(2) / NYSE §802.01C",
      });
    }

    // 2. 주주자본
    if (equity !== null) {
      criteria.push({
        label: "주주자본",
        value: fmtUSDPlain(equity),
        status: equity < 0 ? "위험" : equity < 2_500_000 ? "주의" : "양호",
        note: equity < 0
          ? "음의 자본 — 부채 > 자산, 청산 시 주주 회수 불가"
          : equity < 2_500_000
          ? "NASDAQ 최소 주주자본 기준($2.5M) 미충족"
          : "양호",
        law: "NASDAQ Rule 5550(b)(1)",
      });
    }

    // 3. 유동비율
    if (currentAssets !== null && currentLiab !== null && currentLiab > 0) {
      const ratio = currentAssets / currentLiab;
      criteria.push({
        label: "유동비율",
        value: `${ratio.toFixed(2)}x`,
        status: ratio < 1 ? "위험" : ratio < 1.5 ? "주의" : "양호",
        note: ratio < 1
          ? "유동부채 > 유동자산 — 단기 지급 불능 위험"
          : ratio < 1.5
          ? "단기 유동성 다소 부족"
          : "단기 채무 대응 능력 양호",
        law: "참고지표",
      });
    }

    // 4. 영업현금흐름
    if (cfo !== null) {
      criteria.push({
        label: "영업현금흐름",
        value: fmtUSDPlain(cfo),
        status: cfo < 0 ? "주의" : "양호",
        note: cfo < 0
          ? "현금 유출 중 — 외부 자금 조달 의존도 높음"
          : "자생적 현금 창출 가능",
        law: "참고지표",
      });
    }

    // 5. 당기순이익
    if (netIncome !== null) {
      criteria.push({
        label: "당기순이익",
        value: fmtUSDPlain(netIncome),
        status: netIncome < 0 ? "주의" : "양호",
        note: netIncome < 0 ? "당기순손실 — 자본 잠식 가속 요인" : "당기순이익 흑자",
        law: "참고지표",
      });
    }

    // ── 영업이익 연간 추이 ───────────────────────────────────────────
    const opYears: OpYear[] = annuals.map((r: any) => {
      const ric = r.report?.ic ?? [];
      return {
        year: String(r.year ?? "?"),
        op:  findVal(ric, ["OperatingIncomeLoss"]) ?? 0,
        rev: findVal(ric, [
          "RevenueFromContractWithCustomerExcludingAssessedTax",
          "Revenues",
          "SalesRevenueNet",
        ]) ?? 0,
      };
    });

    let consLossCount = 0;
    for (const y of opYears) {
      if (y.op < 0) consLossCount++;
      else break;
    }

    let prevLossCount = 0;
    for (let i = 1; i < opYears.length; i++) {
      if (opYears[i].op < 0) prevLossCount++;
      else break;
    }

    const curOp  = opYears[0];
    const prevOp = opYears[1] ?? null;
    const isAvoidancePattern = (curOp?.op ?? 0) > 0 && prevLossCount >= 2;

    const flags: SuspicionFlag[] = [];
    if (isAvoidancePattern && curOp) {
      if (curOp.rev > 0 && (curOp.op / curOp.rev) * 100 < 0.5)
        flags.push({
          label: "극미 영업이익률",
          desc: `영업이익률 ${((curOp.op / curOp.rev) * 100).toFixed(2)}% — 실질 체질 개선 불확실`,
        });
      if (prevOp && prevOp.rev > 0 && curOp.rev < prevOp.rev)
        flags.push({
          label: "매출 감소 + 흑자전환",
          desc: "매출 감소 추세임에도 흑자전환 — 비용 절감 효과일 가능성",
        });
    }

    const dangerCount  = criteria.filter(c => c.status === "위험").length;
    const cautionCount = criteria.filter(c => c.status === "주의").length;
    const overallGrade: Status =
      dangerCount >= 1 || consLossCount >= 3 ? "위험"
      : cautionCount >= 2 || consLossCount >= 2 ? "주의"
      : "양호";

    return { criteria, opYears, consLossCount, isAvoidancePattern, flags, overallGrade };
  }, [finnhubData, usDetail]);

  if (!result) {
    return (
      <div className="w-full bg-transparent sm:bg-white dark:sm:bg-surface-dark-card rounded-none border-0 sm:rounded-xl sm:border border-neutral-200 dark:border-border-subtle-dark p-0 sm:p-6">
        <p className="text-[15px] text-neutral-500">위험도를 점검할 재무 자료가 부족합니다.</p>
      </div>
    );
  }

  const { criteria, opYears, consLossCount, isAvoidancePattern, flags, overallGrade } = result;
  const maxAbsOp = Math.max(...opYears.map(y => Math.abs(y.op)), 1);
  const cfg = OVERALL_CONFIG[overallGrade as Exclude<Status, "—">] ?? OVERALL_CONFIG["양호"];

  return (
    <div data-share-risk data-share-overall={overallGrade} className="w-full bg-transparent sm:bg-white dark:sm:bg-surface-dark-card rounded-none border-0 sm:rounded-xl sm:border border-neutral-200 dark:border-border-subtle-dark overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-0 sm:px-5 py-4 border-b border-neutral-100 dark:border-border-subtle-dark">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className="text-neutral-500 dark:text-neutral-400" />
          <span className="text-[15px] font-bold text-neutral-800 dark:text-neutral-100">미국 상장유지 위험도</span>
          <span className="hidden sm:inline text-[13px] text-neutral-600 dark:text-neutral-300 font-mono">NYSE / NASDAQ</span>
        </div>
        <span className={cn("px-2.5 py-0.5 rounded-lg text-[15px] font-semibold border", cfg.badge)}>
          {overallGrade}
        </span>
      </div>

      <div className="p-0 sm:p-5 space-y-5">
        <p className="text-[15px] text-neutral-500 dark:text-neutral-400">{cfg.sub}</p>

        {/* 기준 목록 */}
        <div className="space-y-2">
          {criteria.map(c => {
            const Icon = STATUS_ICON[c.status];
            return (
              <div key={c.label} data-share-risk-row data-share-label={c.label} data-share-status={c.status} data-share-value={c.value} data-share-note={c.note} data-share-law={c.law} className={cn("p-3 rounded-xl border break-keep", STATUS_ROW_CLS[c.status])}>

                <div className="flex-1 min-w-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                    <span className="inline-flex min-w-0 items-center gap-2 text-[13px] font-bold text-neutral-700 dark:text-neutral-300"><Icon size={14} className={cn("shrink-0", STATUS_COLOR[c.status])} />{c.label}</span>
                  <span className={cn("shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[13px] font-semibold", STATUS_COLOR[c.status])}>{c.status === "—" ? "자료 없음" : c.status}</span>
                    <span className={cn("shrink-0 whitespace-nowrap text-[13px] font-semibold font-mono tabular-nums", STATUS_COLOR[c.status])}>{c.value}</span>
                  </div>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{c.note}</p>
                  {c.law !== "참고지표" && (
                    <details className="group mt-2 text-[13px] leading-relaxed text-neutral-500 dark:text-neutral-400"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-white/5 [&::-webkit-details-marker]:hidden">판정 기준<ChevronDown size={15} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" /></summary><p className="mt-2 break-words">{c.law}</p></details>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 영업이익 연간 바 차트 */}
        {opYears.length > 0 && (
          <div>
            <p className="text-[13px] font-bold text-neutral-600 dark:text-neutral-300 uppercase tracking-wide mb-2.5">
              연간 공시 기준 영업이익 추이
            </p>
            <div className="space-y-4 sm:space-y-3">
              {opYears.map(y => (
                <div key={y.year} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[3rem_minmax(0,1fr)_auto]">
                  <span className="whitespace-nowrap text-[15px] font-mono tabular-nums text-neutral-600 dark:text-neutral-300">{y.year}</span>
                  <span className={cn(
                    "text-right text-[15px] font-bold font-mono tabular-nums whitespace-nowrap sm:order-3",
                    y.op >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400",
                  )}>
                    {fmtUSD(y.op)}
                  </span>
                  <div className="col-span-2 min-w-0 sm:order-2 sm:col-span-1">
                    <OpBar val={y.op} max={maxAbsOp} />
                  </div>
                </div>
              ))}
            </div>
            {consLossCount > 0 && (
              <p className="text-[15px] font-semibold text-amber-600 dark:text-amber-400 mt-2">
                현재 {consLossCount}년 연속 영업손실
              </p>
            )}
          </div>
        )}

        {/* 흑자전환 의심 패턴 */}
        {isAvoidancePattern && (
          <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/40">
            <div className="flex items-center gap-2 mb-1.5">
              <Eye size={13} className="text-orange-600 dark:text-orange-400" />
              <span className="text-[13px] font-bold text-orange-700 dark:text-orange-400">흑자전환 의심 패턴 감지</span>
            </div>
            <p className="text-[15px] text-orange-600 dark:text-orange-400 mb-2">
              직전 {opYears.length - 1}개 연도 영업손실 후 흑자전환 — 재무 왜곡 여부 확인 권장
            </p>
            {flags.map(f => (
              <div key={f.label} className="flex items-start gap-1.5 mt-1">
                <span className="text-orange-500 font-bold text-[13px] shrink-0 mt-0.5">•</span>
                <p className="text-[13px] text-orange-600 dark:text-orange-400">
                  <span className="font-bold">{f.label}</span> — {f.desc}
                </p>
              </div>
            ))}
            {flags.length === 0 && (
              <p className="text-[13px] text-orange-600 dark:text-orange-400">패턴 감지, 특정 의심 신호 없음</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
