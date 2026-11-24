"use client";

import styles from "../screener.module.css";

import { Ellipsis, Heart } from "lucide-react";
import { ComparisonCheckbox, type ComparisonChoice } from "@/components/comparison-checkbox";
import { cn } from "@/lib/utils";
import FinancialFreshnessNotice from "@/components/financial-freshness";
import { scanFinancialPeriods, scanCollectionDate } from "@/lib/utils/financialFreshness";
import { LiquidityBadge } from "./LiquidityBadge";
import { StockResult, type StockResultActions } from "./StockResult";
import { ratioMetrics, barPct } from "./ratioMetrics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;

const money = (v: number, us: boolean) => us ? `$${(v / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M` : `${Math.round(v).toLocaleString()}억`;
const x = (v: number | null) => (v === null ? "—" : `${v.toFixed(2)}x`);

// 세 막대를 같은 축(scale)에 그려 길이 자체가 비율이 되게 한다. 숫자만 나열하면
// "유동자산 3000억 / 부채 1000억 / 시총 1500억" 을 머릿속에서 비교해야 하지만,
// 같은 축에 눕히면 어느 쪽이 큰지 한눈에 읽힌다.
function Bar({ label, value, scale, color, hint, us }: {
    label: string; value: number; scale: number; color: string; hint: string; us: boolean;
}) {
    return (
        <div className={styles.ratioBar} title={hint}>
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">{label}</span>
            <div className={styles.track}>
                <div
                    className={cn(styles.bar, color)}
                    style={{ width: `${barPct(value, scale)}%` }}
                />
            </div>
            <span className="text-right text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                {money(value, us)}
            </span>
        </div>
    );
}

const Ratio = ({ label, value, ok, hint }: { label: string; value: number | null; ok: boolean; hint: string }) => (
    <div title={hint}>
        <dt>{label}</dt>
        <dd className={cn(
            value === null ? "text-neutral-400" : ok ? "text-brand-ink" : "text-neutral-700 dark:text-neutral-200"
        )}>
            {x(value)}
            {ok && value !== null && <><span aria-hidden="true" title="강조 기준 충족"> ✓</span><span className="sr-only"> 강조 기준 충족</span></>}
        </dd>
    </div>
);

export function StockRatioRow({ item, actions, isLiked, onToggleLike, comparison }: {
    item: Item;
    actions: StockResultActions;
    isLiked: boolean;
    comparison?: ComparisonChoice;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const m = ratioMetrics(item);
    const us = item.country === "US";

    return (
        <StockResult
            ticker={item.ticker}
            name={item.name}
            actions={actions}
            comparison={comparison}
            className={styles.ratioCard}
        >
            <div className="flex min-w-0 items-center gap-2">
                <ComparisonCheckbox choice={comparison} name={item.name} />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="min-w-0 break-words text-base font-semibold text-neutral-900 dark:text-white leading-tight" title={item.name}>{item.name}</span>
                        {item.ticker !== item.name && <span className="shrink-0 text-xs font-mono text-neutral-500">{item.ticker}</span>}
                        <LiquidityBadge item={item} />
                        <FinancialFreshnessNotice compact periods={scanFinancialPeriods(item)} source={item.financial_source} collectionDate={scanCollectionDate(item)} />
                    </div>
                </div>
                <button
                    type="button"
                    aria-label={`${item.name} 관심 종목`}
                    aria-pressed={isLiked}
                    onClick={e => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                    className={cn(styles.tableLike, "flex h-11 w-11 items-center justify-center rounded shrink-0 transition-colors",
                        isLiked ? "text-rose-500" : "text-neutral-500 dark:text-neutral-400 hover:text-rose-500")}
                    title={isLiked ? "관심 해제" : "관심 추가"}
                >
                    <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {comparison?.purpose !== "etf" && (
                    <span className="flex min-h-11 shrink-0 items-center text-brand-ink" aria-hidden="true" title="종목 메뉴">
                        <Ellipsis size={16} />
                    </span>
                )}
            </div>

            <div className={styles.ratioRows}>
                <Bar label="유동자산" value={m.currentAssets} scale={m.scale} color="bg-brand-ink" us={us}
                     hint="유동자산 — 1년 안에 현금화할 수 있는 자산" />
                <Bar label="부채총계" value={m.liabilities} scale={m.scale} color="bg-[#d4525c]" us={us}
                     hint="부채총계 — 갚아야 할 돈 전체" />
                <Bar label="시가총액" value={m.marketCap} scale={m.scale} color="bg-neutral-400 dark:bg-neutral-500" us={us}
                     hint="시가총액 — 시장이 이 회사에 매긴 값" />
            </div>

            <dl className={styles.ratioSummary}>
                <div>
                    <dt>순유동자산</dt>
                    <dd>{money(m.netCurrent, us)}</dd>
                </div>
                <Ratio label="순유동/시총" value={m.ncavMultiple} ok={(m.ncavMultiple ?? 0) >= 1}
                       hint="(유동자산 − 부채총계) ÷ 시가총액. 1x 이상이면 순유동자산이 시가총액보다 큽니다." />
                <Ratio label="부채/유동자산" value={m.debtToAssets} ok={m.debtToAssets !== null && m.debtToAssets < 1}
                       hint="부채총계 ÷ 유동자산. 1x 미만이면 유동자산으로 부채를 덮을 수 있습니다." />
                <Ratio label="시총/유동자산" value={m.capToAssets} ok={m.capToAssets !== null && m.capToAssets < 1}
                       hint="시가총액 ÷ 유동자산." />
            </dl>
        </StockResult>
    );
}
