"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
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


// 세 막대를 같은 축(scale)에 그려 길이 자체가 비율이 되게 한다. 숫자만 나열하면
// "유동자산 3000억 / 부채 1000억 / 시총 1500억" 을 머릿속에서 비교해야 하지만,
// 같은 축에 눕히면 어느 쪽이 큰지 한눈에 읽힌다.
function Bar({ label, value, scale, color, hint, amount }: {
    label: string; value: number; scale: number; color: string; hint: string; amount: string;
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
                {amount}
            </span>
        </div>
    );
}

function Ratio({ label, value, ok, hint }: { label: string; value: number | null; ok: boolean; hint: string }) {
    const t = useTranslations("screener");
    const analysis = useTranslations("analysis");
    const locale = useLocale();
    return (
        <div title={hint}>
            <dt>{label}</dt>
            <dd className={cn(
                value === null ? "text-neutral-400" : ok ? "text-brand-ink" : "text-neutral-700 dark:text-neutral-200"
            )}>
                {value === null ? "—" : locale === "ko" ? `${value.toFixed(2)}x` : analysis("multiple", { value: value.toFixed(2) })}
                {ok && value !== null && <><span aria-hidden="true" title={t("highlightMet")}> ✓</span><span className="sr-only"> {t("highlightMet")}</span></>}
            </dd>
        </div>
    );
}

export function StockRatioRow({ item, displayName, actions, isLiked, onToggleLike, comparison }: {
    item: Item;
    displayName: string;
    actions: StockResultActions;
    isLiked: boolean;
    comparison?: ComparisonChoice;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const t = useTranslations("screener");
    const ratio = useTranslations("assetRatios");
    const locale = useLocale();
    const m = ratioMetrics(item);
    const us = item.country === "US";
    const format = useFormatter();
    const money = (value: number) => {
        if (locale !== "ko") return format.number(us ? value : value * 100_000_000, {
            style: "currency", currency: us ? "USD" : "KRW", currencyDisplay: "narrowSymbol",
            notation: "compact", maximumFractionDigits: 2,
        });
        return us ? `$${(value / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`
            : `${Math.round(value).toLocaleString(locale)}억`;
    };

    return (
        <StockResult
            ticker={item.ticker}
            name={item.name}
            displayName={displayName}
            actions={actions}
            comparison={comparison}
            className={styles.ratioCard}
        >
            <div className="flex min-w-0 items-center gap-2">
                <ComparisonCheckbox choice={comparison} name={displayName} />
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="min-w-0 break-words text-base font-semibold text-neutral-900 dark:text-white leading-tight" title={displayName}>{displayName}</span>
                        {item.ticker !== displayName && <span className="shrink-0 text-xs font-mono text-neutral-500">{item.ticker}</span>}
                        <LiquidityBadge item={item} />
                        <FinancialFreshnessNotice compact periods={scanFinancialPeriods(item)} source={item.financial_source} collectionDate={scanCollectionDate(item)} />
                    </div>
                </div>
                <button
                    type="button"
                    aria-label={`${displayName} · ${t("watchlistLabel")}`}
                    aria-pressed={isLiked}
                    onClick={e => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                    className={cn(styles.tableLike, "flex h-11 w-11 items-center justify-center rounded shrink-0 transition-colors",
                        isLiked ? "text-rose-500" : "text-neutral-500 dark:text-neutral-400 hover:text-rose-500")}
                    title={isLiked ? t("removeWatch") : t("addWatch")}
                >
                    <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {comparison?.purpose !== "etf" && (
                    <span className="flex min-h-11 shrink-0 items-center text-brand-ink" aria-hidden="true" title={t("stockMenu")}>
                        <Ellipsis size={16} />
                    </span>
                )}
            </div>

            <div className={styles.ratioRows}>
                <Bar label={ratio("currentAssets")} value={m.currentAssets} amount={money(m.currentAssets)} scale={m.scale} color="bg-brand-ink"
                     hint={ratio("currentAssetsHint")} />
                <Bar label={ratio("totalLiabilities")} value={m.liabilities} amount={money(m.liabilities)} scale={m.scale} color="bg-[#d4525c]"
                     hint={ratio("liabilitiesHint")} />
                <Bar label={ratio("marketCap")} value={m.marketCap} amount={money(m.marketCap)} scale={m.scale} color="bg-neutral-400 dark:bg-neutral-500"
                     hint={ratio("marketCapHint")} />
            </div>

            <dl className={styles.ratioSummary}>
                <div>
                    <dt>{ratio("netCurrentAssets")}</dt>
                    <dd>{money(m.netCurrent)}</dd>
                </div>
                <Ratio label={ratio("ncavRatio")} value={m.ncavMultiple} ok={(m.ncavMultiple ?? 0) >= 1}
                       hint={ratio("ncavHint")} />
                <Ratio label={ratio("debtRatio")} value={m.debtToAssets} ok={m.debtToAssets !== null && m.debtToAssets < 1}
                       hint={ratio("debtHint")} />
                <Ratio label={ratio("priceRatio")} value={m.capToAssets} ok={m.capToAssets !== null && m.capToAssets < 1}
                       hint={ratio("marketValueHint")} />
            </dl>
        </StockResult>
    );
}
