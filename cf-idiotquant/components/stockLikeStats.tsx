'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/features/apiRequest';
import { analysisHref } from '@/lib/investmentFlow';

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
    const [market, setMarket] = useState<'KR' | 'US'>('KR');
    const [retry, setRetry] = useState(0);
    const [result, setResult] = useState<{ key: string; data?: LikeStats; error?: boolean } | null>(null);
    const selectedMarket = country ?? market;
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
    const marketLabel = selectedMarket === 'KR' ? '국내' : '미국';

    return (
        <section aria-label="종목 좋아요 통계" className="mb-5 rounded-2xl border border-neutral-200 p-4 dark:border-border-subtle-dark sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><Heart size={16} aria-hidden="true" />관심 종목 통계</h2>
                {!country && <div className="flex gap-1" aria-label="통계 시장 선택">
                    {(['KR', 'US'] as const).map(value => <button key={value} type="button" aria-pressed={market === value}
                        onClick={() => setMarket(value)}
                        className={`min-h-11 rounded-lg px-3 text-sm ${market === value ? 'bg-neutral-100 font-semibold dark:bg-neutral-800' : 'text-neutral-500'}`}>
                        {value === 'KR' ? '국내' : '미국'}
                    </button>)}
                </div>}
            </div>
            <div aria-live="polite">
                {!current && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 size={14} className="animate-spin" aria-hidden="true" />통계를 불러오는 중입니다.</p>}
                {current?.error && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                    <p>관심 종목 통계를 불러오지 못했습니다.</p>
                    <button type="button" onClick={() => setRetry(value => value + 1)} className="min-h-11 px-2 underline underline-offset-4">다시 시도</button>
                </div>}
                {stats && <>
                    {selected && <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <p className="text-sm"><strong className="text-xl tabular-nums">{selected.count.toLocaleString('ko-KR')}</strong>명이 관심 종목에 등록</p>
                        <p className="text-sm text-neutral-500">{selected.rank === null ? '아직 관심 순위가 없습니다' : `${marketLabel} 관심 순위 ${selected.rank.toLocaleString('ko-KR')}위`}</p>
                    </div>}
                    <p className="mt-3 text-xs text-neutral-500">{marketLabel} 관심 상위 5종목 · {stats.stock_count.toLocaleString('ko-KR')}종목에 총 {stats.total_likes.toLocaleString('ko-KR')}건 등록</p>
                    {stats.top.length ? <ol className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-5">
                        {stats.top.map(stock => <li key={stock.ticker} className="min-w-0">
                            <Link href={analysisHref(stock.ticker)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                <span className="shrink-0 text-xs text-neutral-500">{stock.rank}위</span>
                                <span className="min-w-0 flex-1 truncate" title={stock.name}>{stock.name}</span>
                                <span className="shrink-0 tabular-nums">{stock.count.toLocaleString('ko-KR')}명</span>
                            </Link>
                        </li>)}
                    </ol> : <p className="mt-3 text-sm text-neutral-500">아직 등록된 관심 종목이 없습니다.</p>}
                </>}
            </div>
            <p className="mt-3 text-xs leading-5 text-neutral-500">현재 관심 종목 저장 기준 · 종목별 계정당 1명 · 같은 등록자 수는 공동 순위입니다. 매수·보유 현황을 뜻하지 않습니다.</p>
        </section>
    );
}
