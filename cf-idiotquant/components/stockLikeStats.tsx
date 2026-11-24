'use client';

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/features/apiRequest';
import { analysisHref } from '@/lib/investmentFlow';
import { krStockCode, krStockDisplayName } from '@/lib/utils/krStockNames';
import { useUsStockDirectory, usStockDisplayName } from '@/lib/utils/usStockNames';

type StockStat = { ticker: string; name: string; count: number; rank: number | null };
type LikeStats = {
    country: 'KR' | 'US';
    stock_count: number;
    total_likes: number;
    top: StockStat[];
    selected: StockStat | null;
};

export default function StockLikeStats({ country, ticker, revision = 0 }: {
    country?: 'KR' | 'US'; ticker?: string; revision?: number;
}) {
    const t = useTranslations("stockLikeStats");
    const locale = useLocale();
    const [market, setMarket] = useState<'KR' | 'US'>('KR');
    const [retry, setRetry] = useState(0);
    const [result, setResult] = useState<{ key: string; data?: LikeStats; error?: boolean } | null>(null);
    const selectedMarket = country ?? market;
    const usDirectory = useUsStockDirectory(selectedMarket === "US");
    const query = new URLSearchParams({ country: selectedMarket, ...(ticker ? { ticker } : {}) }).toString();
    const key = `${query}:${revision}:${retry}`;

    useEffect(() => {
        let active = true;
        void apiRequest(`/stock-like-stats?${query}`).then(response => {
            if (!active) return;
            setResult(response.success === true && response.data
                ? { key, data: response.data } : { key, error: true });
        });
        return () => { active = false; };
    }, [query, key]);

    const current = result?.key === key ? result : null;
    const stats = current?.data;
    const selected = stats?.selected;
    const marketLabel = selectedMarket === 'KR' ? t("kr") : t("us");

    return (
        <section aria-label={t("section")} className="mb-5 rounded-2xl border border-neutral-200 p-4 dark:border-border-subtle-dark sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><Heart size={16} aria-hidden="true" />{t("heading")}</h2>
                {!country && <div role="group" className="flex gap-2" aria-label={t("market")}>
                    {(['KR', 'US'] as const).map(value => <button key={value} type="button" aria-pressed={market === value}
                        onClick={() => setMarket(value)}
                        className="service-button service-nav-tab min-h-11 min-w-11 px-3 text-sm font-semibold">
                        {value === 'KR' ? t("kr") : t("us")}
                    </button>)}
                </div>}
            </div>
            <div aria-live="polite">
                {!current && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" />{t("loading")}</p>}
                {current?.error && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                    <p>{t("loadFailed")}</p>
                    <button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-11 px-2 underline underline-offset-4">{t("retry")}</button>
                </div>}
                {stats && <>
                    {selected && <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <p className="text-sm">{t.rich("saveCount", { count: selected.count, number: text => <strong className="text-xl tabular-nums">{text}</strong> })}</p>
                        <p className="text-sm text-neutral-500">{selected.rank === null ? t("noRank") : t("marketRank", { market: marketLabel, rank: selected.rank })}</p>
                    </div>}
                    <p className="mt-3 text-xs text-neutral-500">{t("summary", { market: marketLabel, stocks: stats.stock_count, saves: stats.total_likes })}</p>
                    {stats.top.length ? <ol className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
                        {stats.top.map(stock => {
                            const code = selectedMarket === "KR" ? krStockCode(stock.ticker) ?? krStockCode(stock.name) : stock.ticker;
                            const name = selectedMarket === "KR" ? krStockDisplayName(code ?? stock.ticker, stock.name, locale)
                                : usStockDisplayName(usDirectory?.get(stock.ticker.toUpperCase()), stock.name, locale);
                            return <li key={stock.ticker} className="min-w-0">
                                <Link href={analysisHref(stock.ticker)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    <span className="shrink-0 text-xs text-neutral-500">{stock.rank === null ? "—" : t("rank", { rank: stock.rank })}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate" title={name}>{name}</span>
                                        {locale !== "ko" && code && code !== name && <span className="block truncate text-xs text-neutral-500">{code}</span>}
                                    </span>
                                    <span className="shrink-0 tabular-nums">{t("listeners", { count: stock.count })}</span>
                                </Link>
                            </li>;
                        })}
                    </ol> : <p className="mt-3 text-sm text-neutral-500">{t("empty")}</p>}
                </>}
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">{t("basis")}</p>
        </section>
    );
}
