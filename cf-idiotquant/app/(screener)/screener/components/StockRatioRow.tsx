"use client";

import { ChevronRight, Heart } from "lucide-react";
import { ComparisonCheckbox, type ComparisonChoice } from "@/components/comparison-checkbox";
import { cn } from "@/lib/utils";
import FinancialFreshnessNotice from "@/components/financial-freshness";
import { scanFinancialPeriods, scanCollectionDate } from "@/lib/utils/financialFreshness";
import { LiquidityBadge } from "./LiquidityBadge";
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
        <div className="flex items-center gap-2" title={hint}>
            <span className="w-[52px] shrink-0 text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider">{label}</span>
            <div className="relative flex-1 h-[18px] rounded-md bg-[#f2f0ec] dark:bg-surface-dark-hover overflow-hidden">
                <div
                    className={cn("absolute inset-y-0 left-0 rounded-md transition-[width] duration-500", color)}
                    style={{ width: `${barPct(value, scale)}%` }}
                />
            </div>
            <span className="w-[68px] shrink-0 text-right text-[11px] font-mono font-bold tabular-nums text-neutral-700 dark:text-neutral-200">
                {money(value, us)}
            </span>
        </div>
    );
}

const Ratio = ({ label, value, ok, hint }: { label: string; value: number | null; ok: boolean; hint: string }) => (
    <div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap" title={hint}>
        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{label}</p>
        <p className={cn(
            "text-[13px] font-mono font-bold tabular-nums",
            value === null ? "text-neutral-400" : ok ? "text-brand-ink" : "text-neutral-700 dark:text-neutral-200"
        )}>
            {x(value)}
            {ok && value !== null && <><span aria-hidden="true" title="강조 기준 충족"> ✓</span><span className="sr-only"> 강조 기준 충족</span></>}
        </p>
    </div>
);

export function StockRatioRow({ item, onClick, isLiked, onToggleLike, comparison }: {
    item: Item;
    onClick: (ticker: string, name: string) => void;
    isLiked: boolean;
    comparison?: ComparisonChoice;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const m = ratioMetrics(item);
    const us = item.country === "US";

    return (
        <div
            onClick={() => onClick(item.ticker, item.name)}
            onKeyDown={event => {
                if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onClick(item.ticker, item.name);
                }
            }}
            role="link"
            tabIndex={0}
            aria-label={`${item.name} 분석 보기`}
            className="cursor-pointer rounded-md border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card p-2.5 sm:p-4 hover:border-brand-light-hover dark:hover:border-brand-hover/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ink transition-all"
        >
            <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <ComparisonCheckbox choice={comparison} name={item.name} />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <span className="min-w-0 truncate text-sm font-extrabold text-neutral-900 dark:text-white leading-tight" title={item.name}>{item.name}</span>
                        {item.ticker !== item.name && <span className="shrink-0 text-[10px] font-mono text-neutral-400">{item.ticker}</span>}
                        <span className="shrink-0"><LiquidityBadge item={item} /></span>
                    </div>
                    <div className="mt-1 min-w-0"><FinancialFreshnessNotice compact periods={scanFinancialPeriods(item)} source={item.financial_source} collectionDate={scanCollectionDate(item)} /></div>
                </div>
                <button
                    type="button"
                    aria-label={`${item.name} 관심 종목`}
                    aria-pressed={isLiked}
                    onClick={e => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                    className={cn("p-1 rounded-lg shrink-0 transition-colors",
                        isLiked ? "text-rose-500" : "text-neutral-300 dark:text-neutral-600 hover:text-rose-400")}
                    title={isLiked ? "관심 해제" : "관심 추가"}
                >
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                </button>
            </div>

            <div className="flex flex-col gap-1.5">
                <Bar label="유동자산" value={m.currentAssets} scale={m.scale} color="bg-brand" us={us}
                     hint="유동자산 — 1년 안에 현금화할 수 있는 자산" />
                <Bar label="부채총계" value={m.liabilities} scale={m.scale} color="bg-[#d4525c]" us={us}
                     hint="부채총계 — 갚아야 할 돈 전체" />
                <Bar label="시가총액" value={m.marketCap} scale={m.scale} color="bg-neutral-400 dark:bg-neutral-500" us={us}
                     hint="시가총액 — 시장이 이 회사에 매긴 값" />
            </div>

            <div className="mt-2 sm:mt-3 pt-2 border-t border-neutral-100 dark:border-border-subtle-dark flex items-center justify-between gap-3 overflow-x-auto">
                <Ratio label="순유동/시총" value={m.ncavMultiple} ok={(m.ncavMultiple ?? 0) >= 1}
                       hint="(유동자산 − 부채총계) ÷ 시가총액. 1x 이상이면 청산가치가 시가총액보다 큽니다." />
                <Ratio label="부채/유동자산" value={m.debtToAssets} ok={m.debtToAssets !== null && m.debtToAssets < 1}
                       hint="부채총계 ÷ 유동자산. 1x 미만이면 유동자산만으로 부채를 덮을 수 있습니다." />
                <Ratio label="시총/유동자산" value={m.capToAssets} ok={m.capToAssets !== null && m.capToAssets < 1}
                       hint="시가총액 ÷ 유동자산. 낮을수록 자산 대비 싸게 거래됩니다." />
            </div>

            <p className="mt-2 overflow-x-auto whitespace-nowrap text-[10.5px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                순유동자산 <span className="font-mono font-bold">{money(m.netCurrent, us)}</span>
                {m.ncavMultiple !== null && m.ncavMultiple >= 1
                    ? " — 시가총액보다 큽니다(청산가치 이하 거래)."
                    : m.netCurrent < 0
                        ? " — 유동자산으로 부채를 덮지 못합니다."
                        : " — 시가총액에는 못 미칩니다."}
            </p>
            <span className="mt-2 flex items-center justify-end gap-0.5 text-[11px] font-semibold text-brand-ink">분석 <ChevronRight size={12} aria-hidden="true" /></span>
        </div>
    );
}
