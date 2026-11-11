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
    const [stockNames, setStockNames] = useState<Map<string, string>>(new Map());
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        let active = true;
        dispatch(reqGetMyLikes()).unwrap().then(result => {
            if (active) { setItems(result?.data ?? []); setFailed(false); }
        }).catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, [dispatch, attempt]);

    useEffect(() => {
        const missingNames = items?.slice(0, 3).filter(item => !item.stock_name?.trim() || item.stock_name.trim().toUpperCase() === item.ticker.trim().toUpperCase()) ?? [];
        if (!missingNames.length) return;
        let active = true;
        // 이름이 없는 미리보기 종목의 시장 데이터만 불러온다.
        const sources = [
            ...(missingNames.some(item => item.is_us) ? ["nasdaq", "nyse", "amex"] : []),
            ...(missingNames.some(item => !item.is_us) ? ["kr"] : []),
        ];
        Promise.allSettled(sources.map(async (market): Promise<(readonly [string, string])[]> => {
            const response = await fetch(market === "kr" ? "/data/validCorpCode.json" : `/data/usStockSymbols/${market}_full_tickers.json`);
            if (!response.ok) throw new Error(`Stock names: ${response.status}`);
            if (market === "kr") {
                const data: Record<string, { stock_code: string }> = await response.json();
                return Object.entries(data).map(([name, item]) => [`0:${item.stock_code}`, name] as const);
            }
            const data: { symbol: string; name: string }[] = await response.json();
            return data.map(item => [`1:${item.symbol.trim().toUpperCase()}`, item.name] as const);
        })).then(results => {
            if (active) setStockNames(new Map(results.flatMap(result => result.status === "fulfilled" ? result.value : [])));
        });
        return () => { active = false; };
    }, [items]);

    return <section aria-label="내 관심종목 이어보기" className="mx-4 mt-3 rounded-2xl border border-neutral-200 bg-white px-3 py-1 dark:border-border-subtle-dark dark:bg-surface-dark-card sm:mx-6 sm:mt-5 sm:px-5 sm:py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-neutral-200 dark:border-border-subtle-dark">
            <h2 className="flex min-h-10 items-center gap-2 text-sm font-semibold sm:min-h-11"><Heart size={16} aria-hidden="true" />내 관심종목{items && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs tabular-nums text-neutral-600 dark:bg-surface-dark-muted dark:text-neutral-300">{items.length}</span>}</h2>
            <Link href={WATCHLIST_HREF} aria-label="관심종목 전체 보기" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-xs font-medium text-brand-ink hover:underline focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink">전체 보기<ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        {failed ? <div role="alert" className="pt-3 text-sm"><p>관심종목을 불러오지 못했습니다.</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="min-h-11 underline">다시 불러오기</button></div>
            : !items ? <p role="status" className="py-3 text-sm text-neutral-500">관심종목을 불러오는 중…</p>
                : !items.length ? <p className="py-3 text-sm text-neutral-600 dark:text-neutral-300">발굴·분석 화면에서 하트를 눌러 담으면 여기서 다시 확인할 수 있습니다.</p>
                    : <ul className="divide-y divide-neutral-100 dark:divide-border-subtle-dark">{items.slice(0, 3).map(item => {
                        const ticker = item.ticker.trim();
                        const savedName = item.stock_name?.trim();
                        const name = savedName && savedName.toUpperCase() !== ticker.toUpperCase()
                            ? savedName : stockNames.get(`${item.is_us ? 1 : 0}:${ticker.toUpperCase()}`);
                        return <li key={`${item.is_us}:${item.ticker}`}><Link
                        href={analysisHref(item.is_us ? item.ticker : name || item.ticker, WATCHLIST_HREF)} className="group flex min-h-11 sm:min-h-12 items-center justify-between gap-2 rounded-lg py-1 text-sm sm:gap-3 sm:py-2 transition-colors hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink dark:hover:bg-surface-dark-hover">
                        <span className="flex min-w-0 items-baseline gap-2">
                            {item.is_us ? <><span className="shrink-0 font-semibold">{ticker}</span>{name && <span title={name} className="truncate text-xs text-neutral-600 dark:text-neutral-300">{name}</span>}</>
                                : <span title={name || ticker} className="truncate font-medium">{name || ticker}</span>}
                        </span><ArrowRight size={15} aria-hidden="true" className="shrink-0 text-neutral-400 group-hover:text-brand-ink" />
                    </Link></li>; })}</ul>}
    </section>;
}
