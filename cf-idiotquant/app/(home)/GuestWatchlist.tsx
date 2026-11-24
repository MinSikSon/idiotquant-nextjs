'use client';

import { useTranslations } from "next-intl";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { WatchlistPriceLegend, WatchlistStockRow } from '@/components/watchlist-stock-row';
import { scanValuationSummary } from '@/lib/utils/valuationSummary';
import { guestWatchlistGroups, loadGuestQuote, loadGuestWatchlist, type GuestStock, type GuestWatchlistGroup } from './guestWatchlistData';

const secondary = 'text-neutral-600 dark:text-neutral-300';

export default function GuestWatchlist() {
  const t = useTranslations("home");
    return <section aria-labelledby="guest-watchlist-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="guest-watchlist-title" className="text-lg font-semibold">{t("examples")}</h2>
            <WatchlistPriceLegend />
        </div>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {guestWatchlistGroups.map(group => <WatchlistGroup key={group.id} group={group} />)}
        </div>
        <p className={`mt-3 break-keep text-xs leading-5 ${secondary}`}>{t("estimate")}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 border-t border-neutral-200 dark:border-surface-dark-border">
            <p className={`text-sm ${secondary}`}>{t("savePrompt")}</p>
            <Link href="/login?callbackUrl=%2F" className="inline-flex min-h-11 items-center gap-2 rounded px-1 text-sm font-semibold text-brand-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink">{t("signIn")}<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
    </section>;
}

function WatchlistGroup({ group }: { group: GuestWatchlistGroup }) {
  const t = useTranslations("home");
    const [result, setResult] = useState<Awaited<ReturnType<typeof loadGuestWatchlist>> | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let active = true;
        void loadGuestWatchlist(group).then(
            data => { if (active) setResult(data); },
            () => { if (active) setFailed(true); },
        );
        return () => { active = false; };
    }, [group, attempt]);

    const loading = !result && !failed;
    const showRetry = failed || result?.partialFailure;
    return <section aria-labelledby={group.id} aria-busy={loading} className="rounded-2xl border border-neutral-200 bg-white px-3 dark:border-surface-dark-border dark:bg-surface-dark-card sm:px-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-neutral-200 py-2 dark:border-surface-dark-border">
            <h3 id={group.id} className="font-semibold">{t(({
                'kr-large': 'krLarge',
                'kr-value': 'krValue',
                'us-large': 'usLarge',
                'us-value': 'usValue',
            } as const)[group.id])}</h3>
            <span className={`text-xs ${secondary}`}>{group.id.endsWith('-value') ? t("valueFilter") : t("marketCap")}</span>
        </div>
        {loading && <p role="status" className={`py-4 text-sm ${secondary}`}>{t("loadingStocks")}</p>}
        {result?.stocks.length === 0 && <p className={`py-4 text-sm ${secondary}`}>{t("noStocks")}</p>}
        {result && result.stocks.length > 0 && <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {result.stocks.map(stock => <li key={stock.ticker}>
                <StockComparison stock={stock} country={group.country} />
            </li>)}
        </ul>}
        {showRetry && <div className={`flex flex-wrap items-center justify-between gap-x-2 text-sm ${secondary}`}>
            <p role="status">{failed ? t("failed") : t("partialFailure")}</p>
            <button type="button" className="min-h-11 rounded text-brand-ink underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink" onClick={() => {
                setResult(null);
                setFailed(false);
                setAttempt(value => value + 1);
            }}>{t("retry")}</button>
        </div>}
    </section>;
}

function StockComparison({ stock, country }: { stock: GuestStock; country: 'KR' | 'US' }) {
  const t = useTranslations("home");
    const [quote, setQuote] = useState<number | null>();
    const { ticker, name, scan } = stock;
    useEffect(() => {
        let active = true;
        void loadGuestQuote(ticker, country).then(
            price => { if (active) setQuote(price); },
            () => { if (active) setQuote(null); },
        );
        return () => { active = false; };
    }, [ticker, country]);

    const scanPrice = scan?.last_price != null && scan.last_price > 0 ? scan.last_price : null;

    return <WatchlistStockRow
        ticker={ticker} name={name} isUs={country === 'US'} scanDate={scan?.scan_date ?? null}
        reference={{
            price: quote ?? scanPrice,
            label: quote == null && scanPrice !== null ? '스캔 기준가' : '현재가',
            pending: quote === undefined,
        }}
        models={scan ? scanValuationSummary(scan) : []}
        emptyMessage={t("noValuation")}
    />;
}
