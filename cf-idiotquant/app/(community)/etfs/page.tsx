"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowDown, Heart, Layers, LoaderCircle } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import { CommunityEtf, getCommunityEtfs, setCommunityEtfLike } from "@/lib/features/communityEtfs/api";

const PAGE_SIZE = 20;

export default function CommunityEtfsPage() {
    const { status } = useSession();
    const [items, setItems] = useState<CommunityEtf[]>([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState("");
    const [busyLike, setBusyLike] = useState<string | null>(null);

    const load = useCallback(async (nextOffset = 0) => {
        if (nextOffset === 0) setLoading(true);
        else setLoadingMore(true);
        setError("");
        const result = await getCommunityEtfs(PAGE_SIZE, nextOffset);
        if (!result.success || !Array.isArray(result.data)) {
            setError(result.error || "ETF 피드를 불러오지 못했습니다.");
        } else {
            setItems(current => nextOffset === 0 ? result.data! : [...current, ...result.data!]);
            setOffset(nextOffset + result.data.length);
            setHasMore(result.data.length === PAGE_SIZE);
        }
        setLoading(false);
        setLoadingMore(false);
    }, []);

    useEffect(() => {
        let active = true;
        getCommunityEtfs(PAGE_SIZE, 0).then(result => {
            if (!active) return;
            if (!result.success || !Array.isArray(result.data)) setError(result.error || "ETF 피드를 불러오지 못했습니다.");
            else {
                setItems(result.data);
                setOffset(result.data.length);
                setHasMore(result.data.length === PAGE_SIZE);
            }
            setLoading(false);
        });
        return () => { active = false; };
    }, []);

    async function toggleLike(item: CommunityEtf) {
        if (status !== "authenticated") {
            window.location.assign(`/login?callbackUrl=${encodeURIComponent("/etfs")}`);
            return;
        }
        if (busyLike) return;
        setBusyLike(item.id);
        const result = await setCommunityEtfLike(item.id, !item.likedByMe);
        if (result.success && typeof result.liked === "boolean" && typeof result.likeCount === "number") {
            setItems(current => current.map(value => value.id === item.id
                ? { ...value, likedByMe: result.liked!, likeCount: result.likeCount! }
                : value).sort((a, b) => b.likeCount - a.likeCount || b.createdAt - a.createdAt));
        } else setError(result.error || "좋아요를 저장하지 못했습니다.");
        setBusyLike(null);
    }

    return <>
        <PageHeader title="가상 ETF 피드" width="content" primaryAction={<Link href="/screener" className={PAGE_PRIMARY_ACTION_CLS}>ETF 만들기</Link>} />
        <main className="mx-auto max-w-xl px-4 pb-[calc(var(--bottombar-h)+1.5rem)] pt-4 text-neutral-900 dark:text-neutral-100 sm:pt-6">
            <div className="mb-4 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                <Layers size={17} aria-hidden="true" className="text-brand-ink" />
                <p>다른 투자자의 기준과 종목 구성을 둘러보세요.</p>
            </div>
            {loading ? <p role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-neutral-500"><LoaderCircle size={18} className="animate-spin" />피드를 불러오는 중…</p>
                : error && items.length === 0 ? <div className="py-14 text-center"><p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-11 px-3 text-sm font-semibold text-brand-ink">다시 불러오기</button></div>
                : items.length === 0 ? <section className="border-y border-neutral-200 py-16 text-center dark:border-surface-dark-border"><h1 className="text-lg font-semibold">아직 공개된 ETF가 없어요</h1><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">스크리너에서 종목을 골라 첫 ETF를 만들어 보세요.</p><Link href="/screener" className={`${PAGE_PRIMARY_ACTION_CLS} mt-5`}>종목 고르기</Link></section>
                : <>
                    {error && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                    <div className="h-[min(72svh,46rem)] min-h-[31rem] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-white dark:border-surface-dark-border dark:bg-surface-dark-card">
                        {items.map(item => <EtfEpisode key={item.id} item={item} busy={busyLike === item.id} onLike={() => void toggleLike(item)} />)}
                    </div>
                    {hasMore && <div className="flex justify-center py-3">
                        <button type="button" disabled={loadingMore} onClick={() => void load(offset)} className="inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-brand-ink disabled:opacity-50">
                            {loadingMore ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowDown size={16} aria-hidden="true" />}
                            {loadingMore ? "불러오는 중…" : "다음 ETF"}
                        </button>
                    </div>}
                </>}
        </main>
    </>;
}

function EtfEpisode({ item, busy, onLike }: { item: CommunityEtf; busy: boolean; onLike: () => void }) {
    const preview = item.holdings.slice(0, 4);
    const remaining = item.holdings.length - preview.length;
    return <article aria-label={`${item.name} 가상 ETF`} className="flex min-h-full snap-start flex-col justify-between gap-4 p-4 sm:p-6">
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-300">
                <span>{item.creator.name || "투자자"}</span>
                <span className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-600">{item.market === "KR" ? "국내" : "미국"} · 균등 비중</span>
            </div>
            <h2 className="mt-4 break-words text-2xl font-semibold leading-tight">{item.name}</h2>
            <p className="mt-3 break-words text-base leading-relaxed text-neutral-700 dark:text-neutral-200">{item.idea}</p>
            <div className="mt-6 border-t border-neutral-200 pt-4 dark:border-surface-dark-border">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">구성 종목</h3>
                    <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">{item.holdings.length}종목 · 각 {(100 / item.holdings.length).toFixed(1)}%</span>
                </div>
                <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
                    {preview.map(holding => <li key={holding.ticker} className="flex min-h-14 items-center gap-3 py-2">
                        <StockLogo ticker={holding.ticker} name={holding.name} isUs={item.market === "US"} />
                        <span className="min-w-0 flex-1 break-words font-medium">{holding.name}<span className="ml-2 text-xs text-neutral-500">{holding.ticker}</span></span>
                    </li>)}
                </ul>
                {remaining > 0 && <details className="group border-t border-neutral-200 dark:border-surface-dark-border">
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-brand-ink">나머지 {remaining}종목 보기</summary>
                    <ul className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
                        {item.holdings.slice(4).map(holding => <li key={holding.ticker} className="flex min-h-12 items-center gap-3 py-2">
                            <StockLogo ticker={holding.ticker} name={holding.name} isUs={item.market === "US"} />
                            <span className="min-w-0 flex-1 break-words">{holding.name}<span className="ml-2 text-xs text-neutral-500">{holding.ticker}</span></span>
                        </li>)}
                    </ul>
                </details>}
            </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-surface-dark-border">
            <span className="text-xs text-neutral-500">수익률 시뮬레이션은 제공하지 않습니다.</span>
            <button type="button" disabled={busy} onClick={onLike} aria-pressed={item.likedByMe} aria-label={`${item.name} 좋아요 ${item.likeCount}개`} className="inline-flex min-h-11 min-w-16 items-center justify-center gap-2 rounded px-3 text-sm font-semibold text-brand-ink hover:bg-brand/10 disabled:opacity-50">
                <Heart size={19} aria-hidden="true" fill={item.likedByMe ? "currentColor" : "none"} />{item.likeCount}
            </button>
        </div>
    </article>;
}
