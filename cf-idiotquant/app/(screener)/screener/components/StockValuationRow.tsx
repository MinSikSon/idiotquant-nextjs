"use client";

import { useTranslations } from "next-intl";
import { Ellipsis, Heart } from "lucide-react";
import { ComparisonCheckbox, type ComparisonChoice } from "@/components/comparison-checkbox";
import FinancialFreshnessNotice from "@/components/financial-freshness";
import { StockValuationContent } from "@/components/watchlist-stock-row";
import { cn } from "@/lib/utils";
import { scanCollectionDate, scanFinancialPeriods } from "@/lib/utils/financialFreshness";
import { scanValuationSummary } from "@/lib/utils/valuationSummary";
import { LiquidityBadge } from "./LiquidityBadge";
import { StockResult, type StockResultActions } from "./StockResult";
import styles from "../screener.module.css";

export function StockValuationRow({ item, displayName, isUs, actions, comparison, isLiked, onToggleLike }: {
    item: Record<string, any>;
    displayName: string;
    isUs: boolean;
    actions: StockResultActions;
    comparison?: ComparisonChoice;
    isLiked: boolean;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const t = useTranslations("screener");
    const home = useTranslations("home");
    const { ticker, name, last_price } = item;
    const price = Number.isFinite(last_price) && last_price > 0 ? last_price : null;
    const models = scanValuationSummary({
        last_price: price, eps: item.eps, bps: item.bps, current_assets: item.current_assets,
        total_liabilities: item.total_liabilities, lstn_stcn: item.lstn_stcn, ncav_ratio: item.ncav_ratio,
        net_income: item.net_income, is_us: Number(isUs),
    });

    return <StockResult ticker={ticker} name={name} displayName={displayName}
        actions={actions} comparison={comparison} className={styles.ratioCard}>
        <StockValuationContent ticker={ticker} name={name} displayName={displayName}
            code={ticker !== displayName ? ticker : undefined} isUs={isUs} scanDate={item.scan_date ?? null}
            reference={{ price, label: '스캔 기준가' }}
            models={models.some(model => model.targetPrice !== null) ? models : []}
            emptyMessage={home("valuationMissing")}
            leading={<ComparisonCheckbox choice={comparison} name={displayName} />}
            details={<div className="flex flex-wrap items-center gap-x-1.5 empty:hidden">
                <LiquidityBadge item={item} />
                <FinancialFreshnessNotice compact periods={scanFinancialPeriods(item)} source={item.financial_source} collectionDate={scanCollectionDate(item)} />
            </div>}
            trailing={<div className="flex shrink-0 items-center">
                <button type="button" aria-pressed={isLiked}
                    aria-label={`${displayName} ${isLiked ? t("removeWatch") : t("addWatch")}`}
                    onClick={() => onToggleLike(ticker, name)}
                    className={cn(styles.tableLike, "flex size-11 items-center justify-center rounded",
                        isLiked ? "text-rose-500" : "text-neutral-500 dark:text-neutral-400 hover:text-rose-500")}>
                    <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {comparison?.purpose !== "etf" && <Ellipsis size={16} aria-hidden="true" className="text-brand-ink" />}
            </div>} />
    </StockResult>;
}
