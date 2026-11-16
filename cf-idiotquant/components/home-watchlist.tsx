"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Plus } from 'lucide-react';
import { analysisHref, WATCHLIST_HREF } from '@/lib/investmentFlow';
import { scanDateLabel } from '@/lib/features/stockLikes/changes';
import { getWatchReview, type WatchReview } from '@/lib/features/stockLikes/review';
import { scanValuationSummary } from '@/lib/utils/valuationSummary';
import { getWatchlistSample, type WatchlistSampleData } from '@/lib/features/stockLikes/sample';
import type { LikedStockItem } from '@/lib/features/stockLikes/stockLikesSlice';
import { STRATEGY_LABEL } from '@/lib/constants/strategies';
import { useStockSearchModal } from '@/components/stock-search-provider';

const metric = (value: number | null) => value === null ? '—' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const panel = 'rounded-2xl border border-neutral-200 bg-white p-4 dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-6';
const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:border-neutral-700 disabled:opacity-50';

export function HomeWatchlist() {
    const [review, setReview] = useState<WatchReview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [grouping, setGrouping] = useState<'market' | 'strategy'>('market');
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

    return <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-10">
        {error && <div role="alert" className={`${panel} text-sm`}><p>{error}</p><button type="button" onClick={() => void load()} disabled={loading} className="mt-2 min-h-11 underline">다시 불러오기</button></div>}
        {!review ? loading && <p role="status" className={panel}>관심종목을 불러오는 중…</p> : <>
            {loading && <p role="status" className="text-xs text-neutral-500">최신 상태를 확인하는 중…</p>}
            {!review.items.length ? <section className={panel} aria-labelledby="empty-watchlist">
                <Heart size={24} aria-hidden="true" className="mb-4 text-brand-ink" />
                <h1 id="empty-watchlist" className="text-lg font-semibold">먼저 관심종목을 담아보세요</h1>
                <p className="mb-5 mt-2 text-sm leading-6 text-neutral-500">종목을 검색하거나 발굴한 뒤 하트를 누르면, 여기서 관심종목의 가격과 적정주가를 함께 볼 수 있습니다.</p>
                <AddStock onSearch={openSearch} />
                <div className="mt-5"><WatchlistSample /></div>
            </section> : <>
                <section className={panel} aria-labelledby="watchlist-title">
                    <div className="flex items-center justify-between gap-3"><h1 id="watchlist-title" className="text-sm font-semibold">내 관심종목 · {review.items.length}</h1><Link href={WATCHLIST_HREF} className="inline-flex min-h-11 items-center text-xs text-brand-ink">상세 목록<ArrowRight size={14} aria-hidden="true" /></Link></div>
                    <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-neutral-500">{grouping === 'market' ? '국내·미국으로 묶어 보기' : '여러 전략에 해당하면 중복 표시됩니다.'}</p>
                        <label className="flex shrink-0 items-center gap-2 text-xs text-neutral-500">분류
                            <select value={grouping} onChange={event => setGrouping(event.target.value as 'market' | 'strategy')} className="min-h-11 rounded-lg border border-neutral-200 bg-transparent px-2 text-neutral-900 dark:border-neutral-700 dark:text-neutral-100">
                                <option value="market">시장별</option><option value="strategy">전략별</option>
                            </select>
                        </label>
                    </div>
                    <p className="mb-2 text-[10px] leading-4 text-neutral-500">스캔 기준 추정 적정주가 · NCAV 1배 / PER 10배 / PBR 1배</p>
                    <WatchlistItems items={review.items} grouping={grouping} />
                    <div className="mt-4"><AddStock onSearch={openSearch} /></div>
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

function WatchlistItems({ items, grouping = 'market' }: { items: WatchlistDisplayItem[]; grouping?: 'market' | 'strategy' }) {
    const groups = new Map<string, WatchlistDisplayItem[]>();
    for (const item of items) {
        const keys = grouping === 'market' ? [item.is_us ? 'US' : 'KR'] : item.strategies.length ? [...new Set(item.strategies)] : ['unclassified'];
        for (const key of keys) groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    return <div className="space-y-1">{[...groups].map(([key, stocks], index) => <details key={`${grouping}:${key}`} open={index < 2} className="rounded-xl border border-neutral-100 dark:border-neutral-800">
        <summary className="min-h-11 cursor-pointer rounded-xl bg-neutral-50 px-2 py-2 text-[11px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:bg-neutral-800/50">
            {grouping === 'market' ? key === 'US' ? '미국' : '국내' : key === 'unclassified' ? '해당 전략 없음' : STRATEGY_LABEL[key] || key}<span className="ml-2 font-normal text-neutral-500">{stocks.length}종목</span>
        </summary>
        <ul className="divide-y divide-neutral-100 px-2 dark:divide-neutral-800">{stocks.map(item => {
            const currency = item.is_us ? '$' : '₩';
            const models = scanValuationSummary(item);
            return <li key={`${item.is_us}:${item.ticker}`}><Link href={analysisHref(item.ticker)} className="block min-h-11 rounded-lg py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                <div className="flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-1.5"><p className="truncate text-xs font-medium leading-4" title={item.stock_name || item.ticker}>{item.stock_name || item.ticker}</p><span className="shrink-0 text-[9px] text-neutral-500" title={item.ticker}>{item.scan_date ? scanDateLabel(item.scan_date) : '스캔 없음'}</span></div>
                    <span className="shrink-0 text-xs leading-4 tabular-nums">{item.last_price == null ? '—' : `${currency}${metric(item.last_price)}`}</span>
                </div>
                <dl aria-label="전략별 적정주가" className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] leading-[14px] tabular-nums">{models.map(model => <div key={model.label} className="flex items-baseline gap-1">
                    <dt className="text-neutral-500">{model.label}</dt><dd>{model.targetPrice === null ? '계산 불가' : `${currency}${metric(model.targetPrice)}`}</dd>
                </div>)}</dl>
            </Link></li>;

        })}</ul>
    </details>)}</div>;
}

export function WatchlistSample() {
    const [data, setData] = useState<WatchlistSampleData | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        void getWatchlistSample().then(result => { if (active) setData(result); });
        return () => { active = false; };
    }, [attempt]);
    return <section aria-label="관심종목 사용 예시" className="space-y-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 sm:p-4">
        <div><span className="rounded bg-brand/10 px-2 py-1 text-xs font-semibold text-brand-ink">실제 데이터 예시</span><h3 className="mt-3 text-sm font-semibold">전략별 적정주가를 한눈에</h3><p className="mt-1 text-xs leading-5 text-neutral-500">실제 스캔 데이터로 계산한 예시입니다. 내 관심종목에는 저장되지 않습니다.</p></div>
        {!data ? <p role="status" className="py-3 text-sm text-neutral-500">실제 종목 데이터를 불러오는 중…</p> : <>
            {data.failed > 0 && <div role="alert" className="text-xs leading-5 text-neutral-500"><p>일부 종목 데이터를 불러오지 못했습니다.</p><button type="button" className="min-h-11 underline" onClick={() => { setData(null); setAttempt(value => value + 1); }}>다시 불러오기</button></div>}
            {data.items.length > 0 ? <>
                {data.items.map(item => <article key={item.ticker} className="rounded-xl bg-white p-3 dark:bg-surface-dark-card">
                    <Link href={analysisHref(item.ticker)} className="flex min-h-11 items-center justify-between gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                        <div className="min-w-0"><h4 className="truncate text-sm font-semibold">{item.stock_name || item.ticker}</h4><p className="text-[11px] text-neutral-500">스캔 {scanDateLabel(item.scan_date!)} · 분석 →</p></div>
                        <div className="shrink-0 text-right"><p className="text-[11px] text-neutral-500">스캔 기준가</p><p className="text-sm font-medium tabular-nums">{item.last_price === null ? '—' : `₩${metric(item.last_price)}`}</p></div>
                    </Link>
                    <dl className="mt-2 divide-y divide-neutral-100 text-xs dark:divide-neutral-800">{scanValuationSummary(item).map(model => <div key={model.label} className="flex items-center justify-between gap-2 py-2">
                        <dt className="text-neutral-500">{model.label} <span className="text-[11px]">{model.basis}</span></dt>
                        <dd className="flex items-baseline gap-2 tabular-nums"><span className="font-medium">{model.targetPrice === null ? '계산 불가' : `₩${metric(model.targetPrice)}`}</span>{model.gapPercent !== null && <span className="text-[11px] text-neutral-500">{model.gapPercent > 0 ? '+' : ''}{model.gapPercent.toFixed(1)}%</span>}</dd>
                    </div>)}</dl>
                </article>)}
                <p className="text-[11px] leading-5 text-neutral-500">스캔 재무 기준 추정치 · %는 기준가 대비 차이입니다. NCAV=(유동자산−총부채)÷주식 수, PER=EPS×10, PBR=BPS×1.</p>
            </> : !data.failed && <p className="py-3 text-sm text-neutral-500">아직 표시할 스캔 데이터가 없습니다.</p>}
        </>}
    </section>;
}
