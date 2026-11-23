"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Plus } from 'lucide-react';
import { WATCHLIST_HREF } from '@/lib/investmentFlow';
import { getWatchReview, type WatchReview } from '@/lib/features/stockLikes/review';
import { scanValuationSummary } from '@/lib/utils/valuationSummary';
import { getWatchlistSample, type WatchlistSampleData } from '@/lib/features/stockLikes/sample';
import type { LikedStockItem } from '@/lib/features/stockLikes/stockLikesSlice';
import { STRATEGY_LABEL } from '@/lib/constants/strategies';
import { useStockSearchModal } from '@/components/stock-search-provider';

import { WatchlistPriceLegend, WatchlistStockRow } from '@/components/watchlist-stock-row';
const panel = 'rounded-lg border border-neutral-200 bg-white p-3 dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-5';
const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded border border-neutral-200 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:border-neutral-700 disabled:opacity-50';

export function HomeWatchlist() {
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
    const filters = [{ key: 'all', label: '전체', count: items.length }, { key: 'valued', label: '평가 가능', count: valued.length }, { key: 'unscanned', label: '스캔 없음', count: unscanned.length }] as const;

    return <div className="mx-auto w-full max-w-4xl space-y-4 px-2 py-3 text-base text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-8">
        {error && <div role="alert" className={`${panel} text-sm`}><p>{error}</p><button type="button" onClick={() => void load()} disabled={loading} className="mt-2 min-h-11 underline">다시 불러오기</button></div>}
        {!review ? loading && <p role="status" className={panel}>관심종목을 불러오는 중…</p> : <>
            {loading && <p role="status" className="text-xs text-neutral-500">최신 상태를 확인하는 중…</p>}
            {!review.items.length ? <section className={panel} aria-labelledby="empty-watchlist">
                <Heart size={24} aria-hidden="true" className="mb-4 text-brand-ink" />
                <h1 id="empty-watchlist" className="text-lg font-semibold">저장한 관심종목이 없습니다</h1>
                <p className="mb-5 mt-2 text-sm leading-6 text-neutral-500">종목을 열고 하트를 누르면 관심종목에 저장됩니다.</p>
                <AddStock onSearch={openSearch} />
                <div className="mt-5"><WatchlistSample /></div>
            </section> : <>
                <section className={panel} aria-labelledby="watchlist-title">
                    <div className="flex flex-wrap items-center justify-between gap-x-3"><h1 id="watchlist-title" className="text-lg font-semibold">내 관심종목 <span className="font-normal tabular-nums text-neutral-500">· {items.length}</span></h1><Link href={WATCHLIST_HREF} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-ink">전체 관리<ArrowRight size={16} aria-hidden="true" /></Link></div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-neutral-200 dark:border-neutral-700">
                        <div role="group" aria-label="관심종목 필터" className="flex flex-wrap gap-x-3">{filters.map(option => <button key={option.key} type="button" aria-pressed={filter === option.key} onClick={() => { setFilter(option.key); setExpanded([]); }} className={`min-h-11 border-b-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${filter === option.key ? 'border-brand font-semibold text-brand-ink' : 'border-transparent text-neutral-600 dark:text-neutral-300'}`}>
                            {option.label} <span className="tabular-nums">{option.count}</span>
                        </button>)}</div>
                        <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300"><span className="sr-only">관심종목 분류</span>
                            <select value={grouping} onChange={event => { setGrouping(event.target.value as 'market' | 'strategy'); setExpanded([]); }} className="min-h-11 rounded bg-transparent text-base text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:text-neutral-100">
                                <option value="market">시장별</option><option value="strategy">전략별</option>
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2">
                        <WatchlistPriceLegend />
                        <p className="text-xs text-neutral-600 dark:text-neutral-300">스캔 기준가 · 실시간 시세 아님</p>
                    </div>
                    {grouping === 'strategy' && <p className="mb-2 text-xs leading-5 text-neutral-600 dark:text-neutral-300">여러 전략에 해당하면 중복 표시됩니다.</p>}
                    {visible.length ? <WatchlistItems items={visible} grouping={grouping} expanded={expanded} onToggle={key => setExpanded(current => current.includes(key) ? current.filter(value => value !== key) : [...current, key])} /> : <p role="status" className="py-6 text-sm text-neutral-500">{filter === 'valued' ? '평가 가능한 종목이 없습니다. 종목 분석에서 재무 데이터를 확인해 보세요.' : '모든 관심종목에 스캔 데이터가 있습니다.'}</p>}
                    <details className="mt-2 border-t border-neutral-100 text-xs leading-5 text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"><summary className="flex min-h-11 cursor-pointer items-center">적정주가 계산 기준 보기</summary><p className="pb-3">NCAV 1배 / PER 10배 / PBR 1배 기준 추정치입니다. 차이율은 스캔 기준가 대비이며, 실제 수익률이나 목표 수익을 의미하지 않습니다. 스캔이 없는 종목과 재무 수치가 부족한 모델은 평가하지 않습니다.</p></details>
                    <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800"><Link href="/screener" className={action}>새 종목 발굴<ArrowRight size={16} aria-hidden="true" /></Link><Link href="/compare" className={action}>종목 비교</Link></div>
                </section>
            </>}
        </>}
        <footer className="space-y-2 text-xs leading-5 text-neutral-500">
            <p>본 서비스는 투자 참고 정보이며 투자 판단과 결과는 이용자에게 있습니다.</p>
            <div className="flex flex-wrap gap-5"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보 처리방침</Link></div>
        </footer>
    </div>;
}

function AddStock({ onSearch }: { onSearch: () => void }) {
    return <div className="flex flex-wrap gap-2"><button type="button" onClick={onSearch} className={action}><Plus size={16} aria-hidden="true" />종목 검색</button><Link href="/screener" className={action}>발굴해서 추가<ArrowRight size={14} aria-hidden="true" /></Link></div>;
}


type WatchlistDisplayItem = Pick<LikedStockItem, 'ticker' | 'stock_name' | 'is_us' | 'scan_date' | 'strategies' | 'last_price' | 'eps' | 'bps' | 'ncav_ratio' | 'current_assets' | 'total_liabilities'> & { net_income?: number | null };

function WatchlistItems({ items, grouping, expanded, onToggle }: { items: WatchlistDisplayItem[]; grouping: 'market' | 'strategy'; expanded: string[]; onToggle: (key: string) => void }) {
    const groups = new Map<string, WatchlistDisplayItem[]>();
    // 최신 스캔부터 확인하고, 스캔이 없는 종목은 각 그룹의 뒤에 둔다.
    const sorted = [...items].sort((a, b) => (b.scan_date ?? '').replaceAll('-', '').localeCompare((a.scan_date ?? '').replaceAll('-', '')));
    for (const item of sorted) {
        const keys = grouping === 'market' ? [item.is_us ? 'US' : 'KR'] : item.strategies.length ? [...new Set(item.strategies)] : ['unclassified'];
        for (const key of keys) groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return <div className="space-y-3">{[...groups].map(([key, stocks]) => <section key={`${grouping}:${key}`} aria-label={grouping === 'market' ? key === 'US' ? '미국 관심종목' : '국내 관심종목' : STRATEGY_LABEL[key] || key}>
        <h2 className="flex flex-wrap items-baseline justify-between gap-x-2 border-b border-neutral-200 py-2 font-semibold dark:border-surface-dark-border">
            {grouping === 'market' ? key === 'US' ? '미국' : '국내' : key === 'unclassified' ? '해당 전략 없음' : STRATEGY_LABEL[key] || key}<span className="text-xs font-normal tabular-nums text-neutral-600 dark:text-neutral-300">{stocks.length}종목</span>
        </h2>
        <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {(expanded.includes(key) ? stocks : stocks.slice(0, 5)).map(item => {
                const models = item.scan_date ? scanValuationSummary(item) : [];
                return <li key={`${item.is_us}:${item.ticker}`}>
                    <WatchlistStockRow
                        ticker={item.ticker} name={item.stock_name || item.ticker} isUs={Boolean(item.is_us)} scanDate={item.scan_date}
                        reference={item.scan_date ? { price: item.last_price != null && item.last_price > 0 ? item.last_price : null, label: '스캔 기준가' } : null}
                        models={models.some(model => model.targetPrice !== null) ? models : []}
                        emptyMessage={item.scan_date ? '평가에 필요한 재무 수치 부족' : '스캔 데이터 없음'}
                    />
                </li>;
            })}
        </ul>
        {stocks.length > 5 && <button type="button" aria-expanded={expanded.includes(key)} onClick={() => onToggle(key)} className="flex min-h-11 w-full items-center justify-center rounded border border-neutral-200 text-sm font-medium text-brand-ink hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:border-neutral-700 dark:hover:bg-neutral-800/50">{expanded.includes(key) ? '접기' : `${stocks.length - 5}종목 더 보기`}</button>}
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
    const { data, retry } = useWatchlistSample();
    return <section aria-label="관심종목 사용 예시" className="space-y-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 sm:p-4">
        <h3 className="text-sm font-semibold">전략별 적정주가 예시</h3>
        {!data ? <p role="status" className="py-3 text-sm text-neutral-500">실제 종목 데이터를 불러오는 중…</p> : <>
            {data.failed > 0 && <div role="alert" className="text-xs leading-5 text-neutral-500"><p>일부 종목 데이터를 불러오지 못했습니다.</p><button type="button" className="min-h-11 underline" onClick={retry}>다시 불러오기</button></div>}
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
                <p className="text-[11px] leading-5 text-neutral-500">실제 스캔 데이터로 적정주가를 계산했습니다. 차이율은 스캔 기준가 대비입니다. NCAV = (유동자산 − 총부채) ÷ 주식 수, PER 기준 = EPS × 10, PBR 기준 = BPS × 1.</p>
            </> : !data.failed && <p className="py-3 text-sm text-neutral-500">아직 표시할 스캔 데이터가 없습니다.</p>}
        </>}
    </section>;
}
