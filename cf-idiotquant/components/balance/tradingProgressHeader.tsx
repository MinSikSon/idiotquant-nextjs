import { Database } from "lucide-react";
import { LIKES_GROUP_ID, type KrUsCapitalType } from "@/lib/features/capital/capitalSlice";
import { stockBudgetProgress } from "@/lib/features/capital/tradingSummary";
import { SectionHeader } from "./shared";

export default function TradingProgressHeader({ country, capital, tradingActive }: {
  country: "KR" | "US";
  capital: KrUsCapitalType;
  tradingActive: boolean | null;
}) {
  const loaded = capital.state === "fulfilled";
  const groups = new Map((capital.groups ?? [])
    .filter(group => group.id !== LIKES_GROUP_ID && group.is_trading_active !== false)
    .map(group => [group.id, group]));
  let active = 0;
  let funded = 0;
  let priced = 0;
  let unknown = 0;

  if (loaded) {
    for (const stock of capital.stock_list ?? []) {
      const group = groups.get(stock.group_id ?? "");
      if (!group || stock.action !== "active") continue;
      active++;
      if (group.side === "sell" && !group.dca) continue;

      const budget = stockBudgetProgress(stock, country, capital.frst_bltn_exrt);
      if (!budget) {
        unknown++;
        continue;
      }
      priced++;
      if (budget.shares >= 1) funded++;
    }
  }

  const status = !loaded ? "조회 중"
    : tradingActive === null ? "가동 상태 미확인"
    : !tradingActive ? "자동매매 OFF"
    : active > 0 ? `활성 ${active}종목` : "대상 선정 대기";

  return (
    <SectionHeader
      icon={<Database size={16} />}
      title="자동매매 운영"
      subtitle="그룹별 매매 대상 종목과 예산 포인트를 설정하세요."
      badge={<span className="text-xs font-medium tabular-nums text-neutral-600 dark:text-neutral-300">{status}</span>}
      action={(priced > 0 || unknown > 0) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1.5 text-xs text-neutral-600 dark:text-neutral-300 md:px-0">
          {priced > 0 ? (
            <span className="tabular-nums">
              1주 예산 확보 <strong className="font-semibold text-neutral-900 dark:text-neutral-100">{funded}/{priced}종목</strong>
            </span>
          ) : <span>1주 예산 계산 대기</span>}
          {unknown > 0 && <span className="tabular-nums">· 미확인 {unknown}종목</span>}
          {priced > 0 && (
            <span aria-hidden="true" className="hidden h-1 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700 md:block">
              <span className="block h-full rounded-full bg-neutral-800 dark:bg-neutral-200" style={{ width: `${funded / priced * 100}%` }} />
            </span>
          )}
        </div>
      )}
    />
  );
}
