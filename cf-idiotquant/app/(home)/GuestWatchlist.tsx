'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { StockLogo } from '@/components/stockLogo';
import { scanDateLabel } from '@/lib/features/stockLikes/changes';
import { analysisHref } from '@/lib/investmentFlow';
import { scanValuationSummary, valuationComparisonAxis } from '@/lib/utils/valuationSummary';
import { guestWatchlistGroups, loadGuestQuote, loadGuestWatchlist, type GuestStock, type GuestWatchlistGroup } from './guestWatchlistData';

const secondary = 'text-neutral-600 dark:text-neutral-300';

export default function GuestWatchlist() {
    return <section aria-labelledby="guest-watchlist-title">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="guest-watchlist-title" className="text-lg font-semibold">관심종목 예시</h2>
            <p className={`flex flex-wrap gap-x-3 gap-y-1 text-xs ${secondary}`}>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-px bg-brand-ink" />비교 기준가</span>
                <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full bg-brand-ink" />전략별 적정주가</span>
            </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
            {guestWatchlistGroups.map(group => <WatchlistGroup key={group.id} group={group} />)}
        </div>
        <p className={`mt-3 break-keep text-xs leading-5 ${secondary}`}>적정주가는 스캔 재무 자료로 계산한 추정치입니다. 차이율은 각 종목에 표시된 가격을 기준으로 합니다.</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 border-t border-neutral-200 dark:border-surface-dark-border">
            <p className={`text-sm ${secondary}`}>내 관심종목을 저장하려면</p>
            <Link href="/login?callbackUrl=%2F" className="inline-flex min-h-11 items-center gap-2 rounded px-1 text-sm font-semibold text-brand-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink">로그인<ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
    </section>;
}

function WatchlistGroup({ group }: { group: GuestWatchlistGroup }) {
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
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-neutral-200 py-3 dark:border-surface-dark-border">
            <h3 id={group.id} className="font-semibold">{group.title}</h3>
            <span className={`text-xs ${secondary}`}>{group.id.endsWith('-value') ? '흑자 · PER 10배 미만' : '시가총액 상위'}</span>
        </div>
        {loading && <p role="status" className={`py-4 text-sm ${secondary}`}>종목을 불러오는 중…</p>}
        {result?.stocks.length === 0 && <p className={`py-4 text-sm ${secondary}`}>현재 조건에 맞는 종목이 없습니다.</p>}
        {result && result.stocks.length > 0 && <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {result.stocks.map(stock => <li key={stock.ticker} className="py-2">
                <StockComparison stock={stock} country={group.country} />
            </li>)}
        </ul>}
        {showRetry && <div className={`flex flex-wrap items-center justify-between gap-x-2 text-sm ${secondary}`}>
            <p role="status">{failed ? '종목을 불러오지 못했습니다.' : '일부 스캔 자료를 불러오지 못했습니다.'}</p>
            <button type="button" className="min-h-11 rounded text-brand-ink underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink" onClick={() => {
                setResult(null);
                setFailed(false);
                setAttempt(value => value + 1);
            }}>다시 불러오기</button>
        </div>}
    </section>;
}

function StockComparison({ stock, country }: { stock: GuestStock; country: 'KR' | 'US' }) {
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

    const isUs = country === 'US';
    const formatPrice = (value: number) => `${isUs ? '$' : '₩'}${value.toLocaleString('ko-KR', {
        minimumFractionDigits: isUs ? 2 : 0,
        maximumFractionDigits: isUs ? 4 : 0,
    })}`;
    const scanPrice = scan?.last_price != null && scan.last_price > 0 ? scan.last_price : null;
    const reference = quote ?? scanPrice;
    const models = scan ? scanValuationSummary(scan) : [];
    const axis = valuationComparisonAxis(reference ?? 0, models.map(model => model.targetPrice));
    const currentPosition = reference === null ? null : axis.position(reference);
    const scanDate = scan?.scan_date ? scanDateLabel(scan.scan_date) : null;

    return <>
        <Link href={analysisHref(ticker)} className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded px-1 py-1 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink dark:hover:bg-white/5">
            <span className="flex min-w-0 flex-1 items-center gap-2">
                <span className="shrink-0 rounded-md bg-white ring-1 ring-neutral-200 dark:ring-transparent"><StockLogo ticker={ticker} name={name} isUs={isUs} /></span>
                <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="font-semibold">{name}{isUs && name !== ticker && <span className={`text-xs font-normal ${secondary}`}> {ticker}</span>}</span>
                    {scanDate && <span className={`block text-xs ${secondary}`}>스캔 {scanDate}</span>}
                </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-right">
                <span className="grid">
                    <span className={`text-xs ${secondary}`}>{quote != null ? '현재가' : scanPrice !== null ? '스캔 기준가' : '현재가'}</span>
                    <span className="font-semibold tabular-nums">{reference !== null ? formatPrice(reference) : quote === undefined ? '조회 중' : '조회 불가'}</span>
                </span>
                <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-brand-ink" />
            </span>
        </Link>
        {models.length > 0 ? <dl className="grid grid-cols-[auto_minmax(1.5rem,1fr)_minmax(0,auto)] gap-x-2 px-1 py-1 text-sm">
            {models.map(({ label, basis, targetPrice }) => {
                const targetPosition = targetPrice === null ? null : axis.position(targetPrice);
                const difference = axis.difference(targetPrice);
                return <div key={label} className="col-span-3 grid grid-cols-subgrid items-center">
                    <dt className="whitespace-nowrap py-0.5 font-medium">{label} <span className={`text-xs font-normal ${secondary}`}>{basis}</span></dt>
                    <dd className="col-span-2 grid grid-cols-subgrid items-center self-stretch">
                        <span aria-hidden="true" className="relative self-stretch">
                            <span className="absolute inset-x-0 top-1/2 h-px bg-neutral-200 dark:bg-neutral-700" />
                            {currentPosition !== null && <span className="absolute inset-y-0 z-10 w-px bg-brand-ink" style={{ left: `${currentPosition}%` }} />}
                            {targetPosition !== null && <>
                                {currentPosition !== null && <span className="absolute top-1/2 h-[3px] -translate-y-1/2 bg-brand-ink/30" style={{
                                    left: `${Math.min(currentPosition, targetPosition)}%`,
                                    width: `${Math.abs(currentPosition - targetPosition)}%`,
                                }} />}
                                <span className="absolute top-1/2 z-20 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-ink" style={{ left: `${targetPosition}%` }} />
                            </>}
                        </span>
                        <span className="flex flex-wrap items-baseline justify-end gap-x-2 py-0.5 text-right tabular-nums [overflow-wrap:anywhere]">
                            <span>{targetPrice === null ? '계산 불가' : formatPrice(targetPrice)}</span>
                            {difference !== null && <span className={`text-xs ${secondary}`}>{difference > 0 ? '+' : ''}{difference.toFixed(1)}%</span>}
                        </span>
                    </dd>
                </div>;
            })}
        </dl> : <p className={`px-1 py-2 text-sm ${secondary}`}>전략별 적정주가를 계산할 스캔 자료가 없습니다.</p>}
    </>;
}
