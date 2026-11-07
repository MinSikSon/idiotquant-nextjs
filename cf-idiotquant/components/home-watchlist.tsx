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

    return <section aria-label="내 관심종목 이어보기" className="mx-4 mt-5 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-surface-dark-card sm:mx-6 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold"><Heart size={17} />내 관심종목{items && ` · ${items.length}`}</h2>
            <Link href={WATCHLIST_HREF} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-ink">관심종목 전체 보기<ArrowRight size={15} /></Link>
        </div>
        {failed ? <div role="alert" className="text-sm"><p>관심종목을 불러오지 못했습니다.</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 underline">다시 불러오기</button></div>
            : !items ? <p role="status" className="text-sm text-neutral-500">관심종목을 불러오는 중…</p>
                : !items.length ? <p className="text-sm text-neutral-600 dark:text-neutral-300">발굴·분석 화면에서 하트를 눌러 담으면 여기서 다시 확인할 수 있습니다.</p>
                    : <div className="flex flex-wrap gap-2">{items.slice(0, 5).map(item => <Link key={`${item.is_us}:${item.ticker}`}
                        href={analysisHref(item.is_us ? item.ticker : item.stock_name || item.ticker, WATCHLIST_HREF)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-200 px-3 text-sm dark:border-neutral-700">
                        {item.stock_name || item.ticker}<ArrowRight size={14} />
                    </Link>)}</div>}
    </section>;
}
