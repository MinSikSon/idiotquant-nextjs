"use client";

import { Power, Check, ChevronRight, AlertTriangle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { StockGroup, QuantRule, BudgetState, LIKES_GROUP_ID } from "@/lib/features/capital/capitalSlice";

const won = (n: number) => `₩${Math.round(Number(n) || 0).toLocaleString("ko-KR")}`;

interface FlowStep {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

interface Props {
  country: "KR" | "US";
  tradingActive: boolean | null;
  groups: StockGroup[];
  stockList: { group_id?: string | null }[];
  quantRule?: QuantRule;
  budget?: BudgetState;          // KR 전용 (US 는 예산 단계 없음)
  onToggleTrading?: () => void;
  togglePending?: boolean;
  className?: string;
}

// 자동매매가 실제로 일어나는 조건(자동매매 ON → 활성 대상 → 운용 종목 → 예산)을
// 파이프라인으로 시각화하고, 막혀 있으면 무엇이 필요한지 알려준다.
export default function TradingFlowSummary({
  country, tradingActive, groups, stockList, quantRule, budget,
  onToggleTrading, togglePending, className,
}: Props) {
  const realGroups = groups.filter(g => g.id !== LIKES_GROUP_ID);
  const activeGroups = realGroups.filter(g => g.is_trading_active !== false);
  // 좋아요(__likes__) 풀은 관심목록이라 매매 대상이 아니므로 제외
  const operating = stockList.filter(s => s.group_id !== LIKES_GROUP_ID);
  const unassigned = operating.filter(s => !s.group_id || !realGroups.some(g => g.id === s.group_id));

  const isOn = tradingActive === true;
  const hasActiveTarget = activeGroups.length > 0 || unassigned.length > 0;
  const hasStocks = operating.length > 0;
  const budgetOk = !budget || budget.monthly_budget_krw > 0;

  const steps: FlowStep[] = [
    { key: "trading", label: "자동매매", ok: isOn, detail: tradingActive === null ? "—" : isOn ? "ON" : "OFF" },
    { key: "target", label: "활성 대상", ok: hasActiveTarget, detail: `그룹 ${activeGroups.length}/${realGroups.length}${unassigned.length ? ` · 미지정 ${unassigned.length}` : ""}` },
    { key: "stocks", label: "운용 종목", ok: hasStocks, detail: `${operating.length}종목` },
    ...(budget ? [{ key: "budget", label: "월 예산", ok: budget.monthly_budget_krw > 0, detail: budget.monthly_budget_krw > 0 ? won(budget.monthly_budget_krw) : "미설정" }] : []),
  ];

  const ready = isOn && hasActiveTarget && hasStocks && budgetOk;

  const missing: string[] = [];
  if (!isOn) missing.push("자동매매 ON");
  if (!hasStocks) missing.push("운용 종목 추가");
  if (!hasActiveTarget) missing.push("그룹 ON 또는 미지정 종목");
  if (budget && budget.monthly_budget_krw <= 0) missing.push("월 예산 설정");

  // 조건 요약 (상위 N종목 · NCAV ≥ x · 종목당 틱 배분)
  const activeCount = quantRule?.active_count;
  const ncav = quantRule?.ncav_ratio;
  const perStock = budget && budget.per_tick_per_stock > 0 ? budget.per_tick_per_stock : 0;
  const condBits: string[] = [];
  if (activeCount != null && activeCount > 0) condBits.push(`상위 ${activeCount}종목`);
  if (ncav != null && ncav > 0) condBits.push(`NCAV ≥ ${ncav}`);
  if (perStock > 0) condBits.push(`5분당 종목당 ${won(perStock)}`);

  return (
    <div className={cn(
      "rounded-2xl border p-4 sm:p-5",
      ready
        ? "border-[#bbf7d0] dark:border-[#166534]/60 bg-[#f0fdf4] dark:bg-[#052e16]/20"
        : "border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20",
      className
    )}>
      {/* 헤더: 상태 + 토글 */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("p-1.5 rounded-lg shrink-0", ready ? "bg-[#16a34a] text-white" : "bg-amber-400 text-white")}>
            {ready ? <Zap size={14} /> : <AlertTriangle size={14} />}
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm font-black leading-tight", ready ? "text-[#15803d] dark:text-[#16a34a]" : "text-amber-700 dark:text-amber-400")}>
              {ready ? "자동매매 가동 중" : "자동매매 대기"}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
              {ready
                ? (condBits.length ? `${condBits.join(" · ")} 조건으로 5분마다 매매` : "조건 충족 종목을 5분마다 매매합니다")
                : `매매 실행에 필요: ${missing.join(", ")}`}
            </p>
          </div>
        </div>
        {onToggleTrading && tradingActive !== null && (
          <button
            onClick={onToggleTrading}
            disabled={togglePending}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 disabled:opacity-60",
              isOn
                ? "bg-[#16a34a] text-white border-[#16a34a] hover:bg-[#15803d]"
                : "bg-white dark:bg-[#242320] text-neutral-500 border-neutral-200 dark:border-[#35332e] hover:border-neutral-400"
            )}
          >
            <Power size={13} />
            {isOn ? "ON" : "OFF"}
          </button>
        )}
      </div>

      {/* 파이프라인 단계 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border bg-white dark:bg-[#242320]",
              s.ok ? "border-[#bbf7d0] dark:border-[#166534]/60" : "border-neutral-200 dark:border-[#35332e]"
            )}>
              <span className={cn(
                "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                s.ok ? "bg-[#16a34a] text-white" : "bg-neutral-200 dark:bg-[#4a4641] text-neutral-400"
              )}>
                {s.ok ? <Check size={10} strokeWidth={3} /> : <span className="text-[9px] font-black">{i + 1}</span>}
              </span>
              <span className="text-[11px] font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">{s.label}</span>
              <span className={cn("text-[11px] font-mono font-bold whitespace-nowrap", s.ok ? "text-[#16a34a]" : "text-neutral-400")}>{s.detail}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight size={13} className="text-neutral-300 dark:text-neutral-600 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}
