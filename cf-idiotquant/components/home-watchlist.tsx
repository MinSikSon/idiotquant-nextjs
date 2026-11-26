"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Plus } from 'lucide-react';
import { WATCHLIST_HREF } from '@/lib/investmentFlow';
import { getWatchReview, type WatchReview } from '@/lib/features/stockLikes/review';
import { scanValuationSummary } from '@/lib/utils/valuationSummary';
import { getWatchlistSample, type WatchlistSampleData } from '@/lib/features/stockLikes/sample';
import type { LikedStockItem } from '@/lib/features/stockLikes/stockLikesSlice';
import { useStrategyText } from '@/i18n/strategy-labels';
import { useStockSearchModal } from '@/components/stock-search-provider';
import { NewsletterEntry } from '@/components/newsletter-entry';

import { WatchlistPriceLegend, WatchlistStockRow } from '@/components/watchlist-stock-row';
const panel = 'rounded-lg border border-neutral-200 bg-white p-3 dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-5';
const action = 'service-button inline-flex min-h-11 items-center justify-center gap-2 border border-neutral-200 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:border-neutral-700 disabled:opacity-50';

export function HomeWatchlist() {
  const t = useTranslations("home");
    const [review, setReview] = useState<WatchReview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [grouping, setGrouping] = useState<'market' | 'strategy'>('market');
    const [filter, setFilter] = useState<'all' | 'valued' | 'unscanned'>('all');
    const [expanded, setExpanded] = useState<string[]>([]);
    const sequence = useRef(0);
    const { openSearch } = useStockSearchModal();

    const load = useCallback(async () => {
        const request = ++sequence.current;
        setLoading(true);
        const result = await getWatchReview();
        if (request !== sequence.current) return;
        if (result.success === false) setError(result.error);
        else { setReview(result.data); setError(''); }
        setLoading(false);
    }, []);

    useEffect(() => {
        void load();
        const onFocus = () => { void load(); };
        window.addEventListener('focus', onFocus);
        return () => { ++sequence.current; window.removeEventListener('focus', onFocus); };
    }, [load]);

    const items = review?.items ?? [];
    const valued = items.filter(item => item.scan_date && scanValuationSummary(item).some(model => model.targetPrice !== null));
    const unscanned = items.filter(item => !item.scan_date);
    const visible = filter === 'valued' ? valued : filter === 'unscanned' ? unscanned : items;
    const filters = [{ key: 'all', label: t("all"), count: items.length }, { key: 'valued', label: t("valued"), count: valued.length }, { key: 'unscanned', label: t("unscanned"), count: unscanned.length }] as const;

    const alertBenefits = (
        <div className="flex flex-wrap gap-x-3">
            <Link href="/mailing" className="service-button-quiet inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-ink">
                {t("memberMailing")}<ArrowRight size={16} aria-hidden="true" />
            </Link>
        </div>
    );

    return <div className="mx-auto w-full max-w-4xl space-y-4 px-2 py-3 text-base text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-8">
        <NewsletterEntry label={t("newsletter")} description={t("newsletterHint")} />
        {error && <div role="alert" className={`${panel} text-sm`}><p>{error}</p><button type="button" onClick={() => void load()} disabled={loading} className="service-button mt-2 min-h-11 px-3">{t("retry")}</button></div>}
        {!review && !loading && alertBenefits}
        {!review ? loading && <p role="status" className={panel}>{t("loadingWatchlist")}</p> : <>
            {loading && <p role="status" className="text-xs text-neutral-500">{t("refreshing")}</p>}
            {!review.items.length ? <section className={panel} aria-labelledby="empty-watchlist">
                <Heart size={24} aria-hidden="true" className="mb-4 text-brand-ink" />
                <h1 id="empty-watchlist" className="text-lg font-semibold">{t("emptyWatchlist")}</h1>
                <p className="mb-5 mt-2 text-sm leading-6 text-neutral-500">{t("emptyWatchlistHint")}</p>
                <AddStock onSearch={openSearch} />
                <div className="mt-5"><WatchlistSample /></div>
                {alertBenefits}
            </section> : <>
                <section className={panel} aria-labelledby="watchlist-title">
                    <div className="flex flex-wrap items-center justify-between gap-x-3"><h1 id="watchlist-title" className="text-lg font-semibold">{t("watchlist")} <span className="font-normal tabular-nums text-neutral-500">· {items.length}</span></h1><Link href={WATCHLIST_HREF} className="service-button-quiet inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-ink">{t("manage")}<ArrowRight size={16} aria-hidden="true" /></Link></div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-neutral-200 dark:border-neutral-700">
                        <div role="group" aria-label={t("watchlistFilter")} className="flex flex-wrap gap-x-3">{filters.map(option => <button key={option.key} type="button" aria-pressed={filter === option.key} onClick={() => { setFilter(option.key); setExpanded([]); }} className={`min-h-11 border-b-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${filter === option.key ? 'border-brand font-semibold text-brand-ink' : 'border-transparent text-neutral-600 dark:text-neutral-300'}`}>
                            {option.label} <span className="tabular-nums">{option.count}</span>
                        </button>)}</div>
                        <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"><span className="sr-only">{t("groupWatchlist")}</span>
                            <select value={grouping} onChange={event => { setGrouping(event.target.value as 'market' | 'strategy'); setExpanded([]); }} className="service-button min-h-11 bg-transparent pl-2 text-base text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:text-neutral-100">
                                <option value="market">{t("byMarket")}</option><option value="strategy">{t("byStrategy")}</option>
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
                        <WatchlistPriceLegend />
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">{t("scanReference")}</p>
                    </div>
                    {grouping === 'strategy' && <p className="mb-2 text-xs leading-5 text-neutral-600 dark:text-neutral-300">{t("duplicates")}</p>}
                    {visible.length ? <WatchlistItems items={visible} grouping={grouping} expanded={expanded} onToggle={key => setExpanded(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key])} /> : <p role="status" className="py-6 text-sm text-neutral-500">{filter === 'valued' ? t("noValued") : t("allScanned")}</p>}
                    <details className="mt-2 border-t border-neutral-100 text-xs leading-5 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"><summary className="flex min-h-11 cursor-pointer items-center">{t("valuationMethod")}</summary><p className="pb-3">{t("valuationBasis")}</p></details>
                    <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800"><Link href="/screener" className={action}>{t("discoverNew")}<ArrowRight size={16} aria-hidden="true" /></Link><Link href="/compare" className={action}>{t("compare")}</Link></div>
                    {alertBenefits}
                </section>
            </>}
        </>}
        <footer className="space-y-2 text-xs leading-5 text-neutral-500">
            <p>{t("investNotice")}</p>
            <div className="flex flex-wrap gap-5"><Link href="/terms">{t("terms")}</Link><Link href="/privacy">{t("privacy")}</Link></div>
        </footer>
    </div>;
}

function AddStock({ onSearch }: { onSearch: () => void }) {
  const t = useTranslations("home");
    return <div className="flex flex-wrap gap-2"><button type="button" onClick={onSearch} className={action}><Plus size={16} aria-hidden="true" />{t("search")}</button><Link href="/screener" className={action}>{t("discoverToAdd")}<ArrowRight size={14} aria-hidden="true" /></Link></div>;
}


type WatchlistDisplayItem = Pick<LikedStockItem, 'ticker' | 'stock_name' | 'is_us' | 'scan_date' | 'strategies' | 'last_price' | 'eps' | 'bps' | 'ncav_ratio' | 'current_assets' | 'total_liabilities'> & { net_income?: number | null };

function WatchlistItems({ items, grouping, expanded, onToggle }: { items: WatchlistDisplayItem[]; grouping: 'market' | 'strategy'; expanded: string[]; onToggle: (key: string) => void }) {
  const t = useTranslations("home");
    const strategyText = useStrategyText();
    const groups = new Map<string, WatchlistDisplayItem[]>();
    // 최신 스캔부터 확인하고, 스캔이 없는 종목은 각 그룹의 뒤에 둔다.
    const sorted = [...items].sort((a, b) => (b.scan_date ?? '').replaceAll('-', '').localeCompare((a.scan_date ?? '').replaceAll('-', '')));
    for (const item of sorted) {
        const keys = grouping === 'market' ? [item.is_us ? 'US' : 'KR'] : item.strategies.length ? [...new Set(item.strategies)] : ['unclassified'];
        for (const key of keys) groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return <div className="space-y-3">{[...groups].map(([key, stocks]) => <section key={`${grouping}:${key}`} aria-label={grouping === 'market' ? key === 'US' ? t("usWatchlist") : t("krWatchlist") : strategyText(key)}>
        <h2 className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-neutral-200 py-2 font-semibold dark:border-surface-dark-border">
            {grouping === 'market' ? key === 'US' ? t("us") : t("kr") : key === 'unclassified' ? t("noStrategy") : strategyText(key)}<span className="text-xs font-normal tabular-nums text-neutral-600 dark:text-neutral-300">{t("stockCount", { count: stocks.length })}</span>
        </h2>
        <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {(expanded.includes(key) ? stocks : stocks.slice(0, 5)).map(item => {
                const models = item.scan_date ? scanValuationSummary(item) : [];
                return <li key={`${item.is_us}:${item.ticker}`}>
                    <WatchlistStockRow
                        ticker={item.ticker} name={item.stock_name || item.ticker} isUs={Boolean(item.is_us)} scanDate={item.scan_date}
                        reference={item.scan_date ? { price: item.last_price != null && item.last_price > 0 ? item.last_price : null, label: '스캔 기준가' } : null}
                        models={models.some(model => model.targetPrice !== null) ? models : []}
                        emptyMessage={item.scan_date ? t("valuationMissing") : t("scanMissing")}
                    />
                </li>;
            })}
        </ul>
        {stocks.length > 5 && <button type="button" aria-expanded={expanded.includes(key)} onClick={() => onToggle(key)} className="service-button flex min-h-11 w-full items-center justify-center border border-neutral-200 text-sm font-medium text-brand-ink hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:border-neutral-700 dark:hover:bg-neutral-800/50">{expanded.includes(key) ? t("collapse") : t("moreStocks", { count: stocks.length - 5 })}</button>}
    </section>)}</div>;
}

export function useWatchlistSample() {
    const [data, setData] = useState<WatchlistSampleData | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        void getWatchlistSample().then(result => { if (active) setData(result); });
        return () => { active = false; };
    }, [attempt]);
    return { data, retry: () => { setData(null); setAttempt(value => value + 1); } };
}

export function WatchlistSample() {
  const t = useTranslations("home");
    const { data, retry } = useWatchlistSample();
    return <section aria-label={t("sampleLabel")} className="space-y-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 sm:p-4">
        <h3 className="text-sm font-semibold">{t("sampleHeading")}</h3>
        {!data ? <p role="status" className="py-3 text-sm text-neutral-500">{t("loadingSample")}</p> : <>
            {data.failed > 0 && <div role="alert" className="text-xs leading-5 text-neutral-500"><p>{t("sampleError")}</p><button type="button" className="service-button-quiet min-h-11 underline" onClick={retry}>{t("retry")}</button></div>}
            {data.items.length > 0 ? <>
                <WatchlistPriceLegend />
                <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
                    {data.items.map(item => <li key={item.ticker}>
                        <WatchlistStockRow
                            ticker={item.ticker} name={item.stock_name || item.ticker} isUs={false} scanDate={item.scan_date}
                            reference={{ price: item.last_price != null && item.last_price > 0 ? item.last_price : null, label: '스캔 기준가' }}
                            models={scanValuationSummary(item)}
                        />
                    </li>)}
                </ul>
                <p className="text-[11px] leading-5 text-neutral-500">{t("sampleBasis")}</p>
            </> : !data.failed && <p className="py-3 text-sm text-neutral-500">{t("noSample")}</p>}
        </>}
    </section>;
}
