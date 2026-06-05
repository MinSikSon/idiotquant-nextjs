"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, CheckCircle2, XCircle, ShieldAlert,
  Minus, TrendingUp, TrendingDown, Eye,
} from "lucide-react";

interface DelistingRiskProps {
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
  desc: string;
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
  "양호": "text-emerald-600 dark:text-emerald-400",
  "—":    "text-neutral-400",
};

const STATUS_ROW_CLS: Record<CriterionStatus, string> = {
  "위험": "bg-red-50/70 dark:bg-red-950/20 border-red-200/60 dark:border-red-900/40",
  "주의": "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40",
  "양호": "bg-[#faf9f7] dark:bg-[#242320]/50 border-neutral-100 dark:border-[#35332e]",
  "—":    "bg-[#faf9f7] dark:bg-[#242320]/50 border-neutral-100 dark:border-[#35332e]",
};

const OVERALL_CONFIG = {
  "위험": {
    badge: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/50",
    sub: "상장폐지 기준 해당 항목 확인 필요",
  },
  "주의": {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
    sub: "관리종목 지정 가능성 요인 있음",
  },
  "양호": {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    sub: "주요 상장유지 기준 충족",
  },
} as const;

// ── 영업이익 추이 바 (최대 절대값 기준 정규화) ───────────────────────
function OpBar({ val, max }: { val: number; max: number }) {
  const pct = max > 0 ? Math.min(Math.abs(val) / max, 1) * 100 : 0;
  const isPos = val >= 0;
  return (
    <div className="flex-1 flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-2.5 bg-neutral-100 dark:bg-[#35332e] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", isPos ? "bg-emerald-400 dark:bg-emerald-500" : "bg-red-400 dark:bg-red-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn(
        "text-[10px] font-black font-mono tabular-nums w-20 text-right shrink-0",
        isPos ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      )}>
        {val >= 0 ? "+" : ""}{val.toLocaleString()}억
      </span>
    </div>
  );
}

export function DelistingRisk({ kiBS, kiIS }: DelistingRiskProps) {
  const result = useMemo(() => {
    const bs = kiBS?.output?.[0];
    const rawPeriods: any[] = kiIS?.output ?? [];
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

    const fmt = (v: number) => `${v >= 0 ? "+" : ""}${v.toLocaleString()}억`;

    const criteria: Criterion[] = [];

    // ── 1. 자본잠식률 ────────────────────────────────────────────────
    if (cpfn > 0) {
      const rate = ((cpfn - totalCptl) / cpfn) * 100;
      let status: CriterionStatus;
      let note: string;
      if (totalCptl <= 0) {
        status = "위험";
        note = "완전자본잠식 — 즉시 관리종목 지정, 다음 사업연도에도 지속 시 상장폐지";
      } else if (rate >= 50) {
        status = "위험";
        note = `자본잠식률 ${rate.toFixed(1)}% — 50% 이상 시 관리종목, 2년 연속 유지 시 상장폐지`;
      } else if (rate > 0) {
        status = "주의";
        note = `자본잠식률 ${rate.toFixed(1)}% — 50% 미만이나 잠식 진행 중`;
      } else {
        status = "양호";
        note = "자본잠식 없음";
      }
      criteria.push({ label: "자본잠식률", value: `${rate.toFixed(1)}%`, status, note, law: "유가증권 제47조 / 코스닥 제38조" });
    } else {
      criteria.push({ label: "자본잠식률", value: "—", status: "—", note: "자본금 데이터 없음", law: "유가증권 제47조 / 코스닥 제38조" });
    }

    // ── 2. 영업이익 (최신 1개년) ─────────────────────────────────────
    criteria.push({
      label: "영업이익",
      value: fmt(bsopPrti),
      status: bsopPrti >= 0 ? "양호" : "주의",
      note: bsopPrti < 0 ? "영업손실 — KOSPI: 4년 연속 시 관리종목 지정" : "영업이익 흑자",
      law: "유가증권 제47조",
    });

    // ── 3. 당기순이익 ────────────────────────────────────────────────
    criteria.push({
      label: "당기순이익",
      value: fmt(thtrNtin),
      status: thtrNtin >= 0 ? "양호" : "주의",
      note: thtrNtin < 0 ? "당기순손실 — 자본잠식 가속 요인" : "당기순이익 흑자",
      law: "참고지표",
    });

    // ── 4. 매출액 ────────────────────────────────────────────────────
    {
      let status: CriterionStatus;
      let note: string;
      if (saleAccount <= 0) {
        status = "—"; note = "데이터 없음";
      } else if (saleAccount < 50) {
        status = "위험"; note = `${saleAccount.toLocaleString()}억 — KOSPI 50억 미만 관리종목 기준`;
      } else if (saleAccount < 100) {
        status = "주의"; note = `${saleAccount.toLocaleString()}억 — 100억 미만, 추이 모니터링 권장`;
      } else {
        status = "양호"; note = `${saleAccount.toLocaleString()}억`;
      }
      criteria.push({ label: "매출액", value: saleAccount > 0 ? `${saleAccount.toLocaleString()}억` : "—", status, note, law: "유가증권 제47조 / 코스닥 제38조" });
    }

    // ── 5. 유동비율 ─────────────────────────────────────────────────
    if (flowLblt > 0) {
      const ratio = (cras / flowLblt) * 100;
      criteria.push({
        label: "유동비율",
        value: `${ratio.toFixed(0)}%`,
        status: ratio < 100 ? "주의" : "양호",
        note: ratio < 100 ? `유동비율 ${ratio.toFixed(0)}% — 단기 유동성 부족 가능성` : `유동비율 ${ratio.toFixed(0)}%`,
        law: "참고지표",
      });
    } else {
      criteria.push({ label: "유동비율", value: "—", status: "—", note: "유동부채 없음", law: "참고지표" });
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
          label: "극미 영업이익률",
          desc: `영업이익률 ${((curOp.op / curOp.rev) * 100).toFixed(2)}% — 매출 대비 이익이 0.5% 미만으로 실질적 체질 개선 여부 불확실`,
        });
      }

      // ② 판관비 급감 (전년 대비 30%+ 감소)
      if (prevOp && prevOp.sgna > 0 && curOp.sgna > 0) {
        const sgnaDrop = (prevOp.sgna - curOp.sgna) / prevOp.sgna;
        if (sgnaDrop >= 0.30) {
          flags.push({
            label: "판관비 급감",
            desc: `판관비 전년 대비 ${(sgnaDrop * 100).toFixed(0)}% 감소 (${prevOp.sgna.toLocaleString()}억 → ${curOp.sgna.toLocaleString()}억) — 비용 절감으로 흑자 조작 가능성`,
          });
        }
      }

      // ③ 매출 감소 중 흑자전환
      if (prevOp && prevOp.rev > 0 && curOp.rev < prevOp.rev) {
        flags.push({
          label: "매출 감소 + 흑자전환",
          desc: `매출 ${prevOp.rev.toLocaleString()}억 → ${curOp.rev.toLocaleString()}억 감소세임에도 영업이익 흑자 전환 — 매출 성장이 아닌 비용 조정으로 인한 흑자일 가능성`,
        });
      }

      // ④ 영업외수익이 영업이익보다 큼 (영업이익의 질 낮음)
      if (curOp.nonOpInc > curOp.op && curOp.nonOpInc > 0) {
        flags.push({
          label: "영업외수익 > 영업이익",
          desc: `영업외수익 ${curOp.nonOpInc.toLocaleString()}억이 영업이익 ${curOp.op.toLocaleString()}억을 초과 — 본업 외 수익으로 영업이익 달성, 지속 가능성 낮음`,
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
  }, [kiBS, kiIS]);

  if (!result) return null;

  const { criteria, overall, opYears, maxAbsOp, consLossCount, consLossStatus, isAvoidancePattern, flags, prevLossCount } = result;
  const cfg = OVERALL_CONFIG[overall];

  return (
    <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden">

      {/* ── 헤더 ── */}
      <div className="px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#faf9f7] dark:bg-[#242320] rounded-lg flex items-center justify-center border border-neutral-200 dark:border-[#3a3834] shrink-0">
            <ShieldAlert size={14} className="text-neutral-500 dark:text-neutral-400" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-neutral-800 dark:text-neutral-200 tracking-tight leading-tight">
              상장폐지 위험도
            </h4>
            <p className="text-[9px] text-neutral-400 font-mono font-bold uppercase tracking-wider mt-0.5">
              Delisting Risk · KRX 기준
            </p>
          </div>
        </div>
        <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-black border shrink-0", cfg.badge)}>
          {overall}
        </span>
      </div>

      {/* ── 본문 ── */}
      <div className="p-5 space-y-2">
        <p className="text-[10px] text-neutral-400 pb-1">{cfg.sub}</p>

        {/* 기준 항목 목록 */}
        {criteria.map(c => {
          const Icon = STATUS_ICON[c.status];
          return (
            <div key={c.label} className={cn("flex items-start gap-3 px-3.5 py-3 rounded-xl border", STATUS_ROW_CLS[c.status])}>
              <Icon size={14} className={cn("mt-0.5 shrink-0", STATUS_COLOR[c.status])} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{c.label}</span>
                  <span className={cn("text-xs font-black font-mono tabular-nums shrink-0", STATUS_COLOR[c.status])}>{c.value}</span>
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{c.note}</p>
                <p className="text-[9px] text-neutral-400/60 dark:text-neutral-500/60 mt-0.5 font-mono">{c.law}</p>
              </div>
            </div>
          );
        })}

        {/* ── 영업이익 연속 이력 ────────────────────────────────────── */}
        {opYears.length >= 2 && (
          <div className={cn(
            "mt-1 px-3.5 py-3.5 rounded-xl border",
            consLossStatus === "위험" ? STATUS_ROW_CLS["위험"]
            : consLossStatus === "주의" ? STATUS_ROW_CLS["주의"]
            : STATUS_ROW_CLS["양호"],
          )}>
            {/* 섹션 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                {consLossStatus === "위험"
                  ? <TrendingDown size={13} className="text-red-500 shrink-0" />
                  : consLossStatus === "주의"
                  ? <TrendingDown size={13} className="text-amber-500 shrink-0" />
                  : <TrendingUp size={13} className="text-emerald-500 shrink-0" />
                }
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">영업이익 연속 손실 이력</span>
              </div>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded font-mono",
                consLossCount >= 4 ? "text-red-600 bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                : consLossCount >= 2 ? "text-amber-600 bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
                : "text-emerald-600 bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400"
              )}>
                {consLossCount >= 1 ? `현재 ${consLossCount}년 연속 손실` : "연속 손실 없음"}
              </span>
            </div>

            {/* 연도별 바 */}
            <div className="space-y-1.5">
              {opYears.map((y, i) => (
                <div key={y.year} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-neutral-400 w-10 shrink-0 font-mono">{y.year}</span>
                  <OpBar val={y.op} max={maxAbsOp} />
                  {i === 0 && (
                    <span className="text-[9px] text-neutral-400 shrink-0 font-mono">최신</span>
                  )}
                </div>
              ))}
            </div>

            <p className="text-[9px] text-neutral-400 mt-2">
              KOSPI 기준 4년 연속 영업손실 시 관리종목 지정 (유가증권 제47조)
            </p>
          </div>
        )}

        {/* ── 관리종목 회피 의심 패턴 ───────────────────────────────── */}
        {isAvoidancePattern && (
          <div className="px-3.5 py-3.5 rounded-xl border bg-orange-50/60 dark:bg-orange-950/10 border-orange-200/70 dark:border-orange-900/40">
            <div className="flex items-start gap-2 mb-2.5">
              <Eye size={14} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold text-orange-700 dark:text-orange-400">
                  관리종목 회피 의심 패턴
                </span>
                <p className="text-[10px] text-orange-600/80 dark:text-orange-400/70 mt-0.5 leading-relaxed">
                  직전 {prevLossCount}년 연속 영업손실 후 당기 흑자전환 — 4년차 관리종목 지정을 피하기 위해 영업이익을 조정했을 가능성을 검토합니다.
                </p>
              </div>
            </div>

            {flags.length > 0 ? (
              <div className="space-y-2 mt-1">
                {flags.map(f => (
                  <div key={f.label} className="flex items-start gap-2 pl-1">
                    <span className="text-orange-500 text-[10px] mt-0.5 shrink-0">•</span>
                    <div>
                      <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">{f.label}: </span>
                      <span className="text-[10px] text-orange-600/80 dark:text-orange-400/70 leading-relaxed">{f.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-orange-600/70 dark:text-orange-400/60 pl-5">
                패턴은 감지되었으나 구체적 의심 신호는 데이터 범위 내에서 발견되지 않았습니다.
              </p>
            )}

            <p className="text-[9px] text-orange-500/60 dark:text-orange-400/50 mt-2 font-mono">
              ※ 이 분석은 정량적 패턴 탐지이며 실제 분식 판단은 감사보고서 확인 필요
            </p>
          </div>
        )}

        {/* ── 푸터 ─────────────────────────────────────────────────── */}
        <p className="text-[9px] text-neutral-400 pt-2 leading-relaxed border-t border-neutral-100 dark:border-[#35332e]">
          유가증권시장 상장규정 제47조 · 코스닥시장 상장규정 제38조 기준. 재무데이터는 DART 공시 기준이며
          실제 관리종목 지정 여부는 KRX 심사 결과에 따릅니다.
        </p>
      </div>
    </div>
  );
}
