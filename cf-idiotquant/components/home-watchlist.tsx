"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Heart, Plus, RefreshCw } from 'lucide-react';
import { analysisHref, WATCHLIST_HREF } from '@/lib/investmentFlow';
import { watchChanges, watchSnapshot, watchKey, scanDateLabel, watchChangeLabel } from '@/lib/features/stockLikes/changes';
import { confirmWatchReview, getWatchReview, type WatchReview } from '@/lib/features/stockLikes/review';
import { STRATEGY_LABEL } from '@/lib/constants/strategies';
import { useStockSearchModal } from '@/components/stock-search-provider';

const metric = (value: number | null) => value === null ? '—' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const panel = 'rounded-2xl border border-neutral-200 bg-white p-4 dark:border-surface-dark-border dark:bg-surface-dark-card sm:p-6';
const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand dark:border-neutral-700 disabled:opacity-50';

export function HomeWatchlist() {
    const [review, setReview] = useState<WatchReview | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const sequence = useRef(0);
    const busy = useRef(false);
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
        const onFocus = () => { if (!busy.current) void load(); };
        window.addEventListener('focus', onFocus);
        return () => { ++sequence.current; window.removeEventListener('focus', onFocus); };
    }, [load]);

    const current = useMemo(() => watchSnapshot(review?.items ?? []), [review]);
    const changes = useMemo(() => watchChanges(review?.baseline.items ?? [], current), [review, current]);
    const previous = new Map((review?.baseline.items ?? []).map(item => [watchKey(item), item]));
    const added = review?.baseline.revision ? current.filter(item => !previous.has(watchKey(item))) : [];
    const first = review?.baseline.revision === 0;
    const unavailable = (review?.items.length ?? 0) - current.length;
    const outdated = current.filter(item => {
        const old = previous.get(watchKey(item));
        return old && item.scanDate < old.scanDate;
    }).length;

    async function confirm() {
        if (!review || busy.current || loading || error) return;
        busy.current = true;
        ++sequence.current;
        setSaving(true); setNotice('');
        const result = await confirmWatchReview(review.baseline.revision, current);
        if (result.success === false) {
            if (result.status === 409 || result.status === 400) {
                await load();
                setNotice(result.error);
            } else setError(result.error);
        } else {
            setReview({ ...review, baseline: result.data });
            setError('');
            setNotice('확인을 완료했습니다. 다음에는 이 기준 이후의 변화를 보여드립니다.');
        }
        busy.current = false;
        setSaving(false);
    }

    return <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 text-neutral-900 dark:text-neutral-100 sm:px-6 sm:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="mb-1 text-xs text-neutral-500">내 관심종목, 매일 짧게</p><h1 className="text-2xl font-semibold">오늘</h1></div>
            <button type="button" onClick={() => { setNotice(''); void load(); }} disabled={loading || saving} className={action} aria-label="관심종목 새로고침"><RefreshCw size={16} aria-hidden="true" />새로고침</button>
        </header>
        {error && <div role="alert" className={`${panel} text-sm`}><p>{error}</p><button type="button" onClick={() => void load()} disabled={loading || saving} className="mt-2 min-h-11 underline">다시 불러오기</button></div>}
        {notice && <p role="status" className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">{notice}</p>}
        {!review ? loading && <p role="status" className={panel}>관심종목을 불러오는 중…</p> : <>
            {loading && <p role="status" className="text-xs text-neutral-500">최신 상태를 확인하는 중…</p>}
            {!review.items.length ? <section className={panel} aria-labelledby="empty-watchlist">
                <Heart size={24} aria-hidden="true" className="mb-4 text-brand-ink" />
                <h2 id="empty-watchlist" className="text-lg font-semibold">먼저 관심종목을 담아보세요</h2>
                <p className="mb-5 mt-2 text-sm leading-6 text-neutral-500">종목을 검색하거나 발굴한 뒤 하트를 누르면, 여기서 지난 확인 이후의 변화를 살펴볼 수 있습니다.</p>
                <AddStock onSearch={openSearch} />
            </section> : <>
                <section className={panel} aria-labelledby="watch-changes-title">
                    <h2 id="watch-changes-title" className="text-lg font-semibold">지난 확인 이후 변화{!first && ` · ${changes.length}종목`}</h2>
                    <p className="mt-2 text-xs leading-5 text-neutral-500">{first ? '현재 목록을 확인 기준으로 저장하면 다음 방문부터 변화를 보여드립니다.' : `마지막 확인 ${new Date(review.baseline.confirmedAt!).toLocaleString('ko-KR')}`}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">종목별 최신 스캔 값을 비교합니다. 가격 변화는 전일 대비 등락률이 아닙니다.</p>
                    {!first && !changes.length && !added.length && <p className="py-5 text-sm">{unavailable || outdated ? '비교 가능한 종목에서 달라진 내용이 없습니다.' : '달라진 내용이 없습니다.'}</p>}
                    {!first && <ul className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800">{changes.map(change => <li key={watchKey(change.after)} className="py-3">
                        <details>
                            <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                                <span className="min-w-0 break-all font-semibold">{change.after.name} <span className="font-normal text-neutral-500">{change.after.market}</span></span>
                                <span className="text-xs text-neutral-500">{watchChangeLabel(change)} · 자세히</span>
                            </summary>
                            <div className="space-y-2 py-2 text-sm">
                                <p className="text-xs text-neutral-500">스캔 {scanDateLabel(change.before.scanDate)} → {scanDateLabel(change.after.scanDate)}</p>
                                {(['price', 'per', 'pbr', 'ncav'] as const).filter(field => change.before[field] !== null && change.after[field] !== null && change.before[field] !== change.after[field]).map(field => <p key={field}>{({ price: '가격', per: 'PER', pbr: 'PBR', ncav: 'NCAV' })[field]} {metric(change.before[field])} → {metric(change.after[field])}</p>)}
                                {change.entered.map(id => <p key={`in-${id}`}>{STRATEGY_LABEL[id] || id} 조건 충족</p>)}
                                {change.exited.map(id => <p key={`out-${id}`}>{STRATEGY_LABEL[id] || id} 조건에서 제외</p>)}
                                <Link href={analysisHref(change.after.ticker)} className="inline-flex min-h-11 items-center gap-2 text-brand-ink">종목 분석<ArrowRight size={14} aria-hidden="true" /></Link>
                            </div>
                        </details>
                    </li>)}{added.map(item => <li key={watchKey(item)} className="py-3 text-sm"><Link href={analysisHref(item.ticker)} className="flex min-h-11 items-center justify-between gap-3"><span className="min-w-0 break-all">{item.name}</span><span className="shrink-0 text-xs text-neutral-500">새로 추가됨</span></Link></li>)}</ul>}
                    {unavailable > 0 && <p className="my-3 text-xs leading-5 text-neutral-500">{unavailable}종목은 비교할 스캔 데이터가 없습니다. 기존 확인 기준은 유지됩니다.</p>}
                    {outdated > 0 && <p className="my-3 text-xs leading-5 text-neutral-500">{outdated}종목은 확인 기준보다 과거 데이터여서 비교에서 제외했습니다.</p>}
                    <button type="button" onClick={() => void confirm()} disabled={loading || saving || !!error || !current.length} className={`${action} mt-4 w-full border-transparent bg-brand text-white hover:bg-brand-hover`}>
                        <Check size={16} aria-hidden="true" />{saving ? '저장하는 중…' : first ? '현재 목록을 확인 기준으로 저장' : '확인 완료'}
                    </button>
                </section>
                <section className={panel} aria-labelledby="watchlist-title">
                    <div className="flex items-center justify-between gap-3"><h2 id="watchlist-title" className="font-semibold">내 관심종목 · {review.items.length}</h2><Link href={WATCHLIST_HREF} className="inline-flex min-h-11 items-center text-xs text-brand-ink">상세 목록<ArrowRight size={14} aria-hidden="true" /></Link></div>
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">{review.items.map(item => <li key={`${item.is_us}:${item.ticker}`}>
                        <Link href={analysisHref(item.ticker)} className="flex min-h-16 items-center justify-between gap-3 rounded-lg py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                            <div className="min-w-0"><p className="break-all text-sm font-medium">{item.stock_name || item.ticker}</p><p className="mt-1 text-xs text-neutral-500">{item.is_us ? 'US' : 'KR'} · {item.scan_date ? `스캔 ${scanDateLabel(item.scan_date)}` : '스캔 데이터 없음'}</p></div>
                            <span className="shrink-0 text-sm tabular-nums">{item.last_price == null ? '—' : `${item.is_us ? '$' : '₩'}${metric(item.last_price)}`}</span>
                        </Link>
                    </li>)}</ul>
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
