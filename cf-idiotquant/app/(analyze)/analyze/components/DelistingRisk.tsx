"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Minus } from "lucide-react";

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

export function DelistingRisk({ kiBS, kiIS }: DelistingRiskProps) {
  const result = useMemo(() => {
    const bs = kiBS?.output?.[0];
    const is_ = kiIS?.output?.[0];
    if (!bs || !is_) return null;

    const cpfn       = Number(bs.cpfn       ?? 0);  // 자본금 (억원)
    const totalCptl  = Number(bs.total_cptl ?? 0);  // 자기자본 (억원)
    const cras       = Number(bs.cras       ?? 0);  // 유동자산 (억원)
    const flowLblt   = Number(bs.flow_lblt  ?? 0);  // 유동부채 (억원)

    const saleAccount = Number(is_.sale_account ?? 0); // 매출액 (억원)
    const bsopPrti    = Number(is_.bsop_prti    ?? 0); // 영업이익 (억원)
    const thtrNtin    = Number(is_.thtr_ntin    ?? 0); // 당기순이익 (억원)

    const fmt = (v: number) =>
      `${v >= 0 ? "+" : ""}${v.toLocaleString()}억`;

    const criteria: Criterion[] = [];

    // ── 1. 자본잠식률 ────────────────────────────────────────────────────
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

      criteria.push({
        label: "자본잠식률",
        value: `${rate.toFixed(1)}%`,
        status,
        note,
        law: "유가증권 제47조 / 코스닥 제38조",
      });
    } else {
      criteria.push({
        label: "자본잠식률",
        value: "—",
        status: "—",
        note: "자본금 데이터 없음",
        law: "유가증권 제47조 / 코스닥 제38조",
      });
    }

    // ── 2. 영업이익 ─────────────────────────────────────────────────────
    criteria.push({
      label: "영업이익",
      value: fmt(bsopPrti),
      status: bsopPrti >= 0 ? "양호" : "주의",
      note: bsopPrti < 0
        ? "영업손실 — KOSPI: 4년 연속 영업손실 시 관리종목 지정"
        : "영업이익 흑자",
      law: "유가증권 제47조",
    });

    // ── 3. 당기순이익 ────────────────────────────────────────────────────
    criteria.push({
      label: "당기순이익",
      value: fmt(thtrNtin),
      status: thtrNtin >= 0 ? "양호" : "주의",
      note: thtrNtin < 0 ? "당기순손실 — 자본잠식 가속 요인" : "당기순이익 흑자",
      law: "참고지표",
    });

    // ── 4. 매출액 ────────────────────────────────────────────────────────
    {
      let status: CriterionStatus;
      let note: string;

      if (saleAccount <= 0) {
        status = "—";
        note = "데이터 없음";
      } else if (saleAccount < 50) {
        status = "위험";
        note = `${saleAccount.toLocaleString()}억 — KOSPI 50억 미만 관리종목 기준, 2년 연속 시 상장폐지`;
      } else if (saleAccount < 100) {
        status = "주의";
        note = `${saleAccount.toLocaleString()}억 — 100억 미만, 매출 추이 모니터링 권장`;
      } else {
        status = "양호";
        note = `${saleAccount.toLocaleString()}억`;
      }

      criteria.push({
        label: "매출액",
        value: saleAccount > 0 ? `${saleAccount.toLocaleString()}억` : "—",
        status,
        note,
        law: "유가증권 제47조 / 코스닥 제38조",
      });
    }

    // ── 5. 유동비율 ─────────────────────────────────────────────────────
    if (flowLblt > 0) {
      const ratio = (cras / flowLblt) * 100;
      criteria.push({
        label: "유동비율",
        value: `${ratio.toFixed(0)}%`,
        status: ratio < 100 ? "주의" : "양호",
        note: ratio < 100
          ? `유동비율 ${ratio.toFixed(0)}% — 100% 미만, 단기 유동성 부족 가능성`
          : `유동비율 ${ratio.toFixed(0)}%`,
        law: "참고지표",
      });
    } else {
      criteria.push({
        label: "유동비율",
        value: "—",
        status: "—",
        note: "유동부채 없음",
        law: "참고지표",
      });
    }

    const hasDanger  = criteria.some(c => c.status === "위험");
    const hasCaution = criteria.some(c => c.status === "주의");
    const overall: "위험" | "주의" | "양호" = hasDanger ? "위험" : hasCaution ? "주의" : "양호";

    return { criteria, overall };
  }, [kiBS, kiIS]);

  if (!result) return null;

  const { criteria, overall } = result;
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

        {criteria.map(c => {
          const Icon = STATUS_ICON[c.status];
          return (
            <div
              key={c.label}
              className={cn("flex items-start gap-3 px-3.5 py-3 rounded-xl border", STATUS_ROW_CLS[c.status])}
            >
              <Icon size={14} className={cn("mt-0.5 shrink-0", STATUS_COLOR[c.status])} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{c.label}</span>
                  <span className={cn("text-xs font-black font-mono tabular-nums shrink-0", STATUS_COLOR[c.status])}>
                    {c.value}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{c.note}</p>
                <p className="text-[9px] text-neutral-400/60 dark:text-neutral-500/60 mt-0.5 font-mono">{c.law}</p>
              </div>
            </div>
          );
        })}

        <p className="text-[9px] text-neutral-400 pt-2 leading-relaxed border-t border-neutral-100 dark:border-[#35332e]">
          유가증권시장 상장규정 제47조 · 코스닥시장 상장규정 제38조 기준. 재무데이터는 DART 공시 기준이며
          실제 관리종목 지정 여부는 KRX 심사 결과에 따릅니다.
        </p>
      </div>
    </div>
  );
}
