"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import { useAppDispatch } from "@/lib/hooks";
import { reqGetMyLikes, type LikedStockItem } from "@/lib/features/stockLikes/stockLikesSlice";
import { analysisHref, WATCHLIST_HREF } from "@/lib/investmentFlow";

export function HomeWatchlist() {
    const dispatch = useAppDispatch();
    const [items, setItems] = useState<LikedStockItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        dispatch(reqGetMyLikes()).unwrap().then(result => {
            if (active) { setItems(result?.data ?? []); setFailed(false); }
        }).catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, [dispatch, attempt]);

    return <section aria-label="내 관심종목 이어보기" className="mx-4 mt-5 rounded-2xl border border-neutral-200 bg-white px-4 pb-2 pt-2 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:mx-6 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-neutral-200 dark:border-border-subtle-dark">
            <h2 className="flex min-h-11 items-center gap-2 text-sm font-semibold"><Heart size={16} aria-hidden="true" />내 관심종목{items && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs tabular-nums text-neutral-600 dark:bg-surface-dark-muted dark:text-neutral-300">{items.length}</span>}</h2>
            <Link href={WATCHLIST_HREF} aria-label="관심종목 전체 보기" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-medium text-brand-ink hover:underline focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink">전체 보기<ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        {failed ? <div role="alert" className="pt-3 text-sm"><p>관심종목을 불러오지 못했습니다.</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 underline">다시 불러오기</button></div>
            : !items ? <p role="status" className="py-3 text-sm text-neutral-500">관심종목을 불러오는 중…</p>
                : !items.length ? <p className="py-3 text-sm text-neutral-600 dark:text-neutral-300">발굴·분석 화면에서 하트를 눌러 담으면 여기서 다시 확인할 수 있습니다.</p>
                    : <ul className="divide-y divide-neutral-100 dark:divide-border-subtle-dark">{items.slice(0, 3).map(item => <li key={`${item.is_us}:${item.ticker}`}><Link
                        href={analysisHref(item.is_us ? item.ticker : item.stock_name || item.ticker, WATCHLIST_HREF)} className="group flex min-h-12 items-center justify-between gap-3 rounded-lg py-2 text-sm transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink dark:hover:bg-surface-dark-hover">
                        <span className="min-w-0 break-words font-medium">{item.stock_name || item.ticker}</span><ArrowRight size={15} aria-hidden="true" className="shrink-0 text-neutral-400 group-hover:text-brand-ink" />
                    </Link></li>)}</ul>}
    </section>;
}
