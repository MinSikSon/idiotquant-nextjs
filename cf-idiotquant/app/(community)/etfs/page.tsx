"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowDown, ChevronRight, Heart, Layers, LoaderCircle } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import { CommunityEtf, CommunityEtfDraft, getCommunityEtfs, setCommunityEtfLike } from "@/lib/features/communityEtfs/api";

const PAGE_SIZE = 20;
const DRAFT_KEY = "idiotquant:community-etf-draft:v1";

export default function CommunityEtfsPage() {
    const { status } = useSession();
    const [items, setItems] = useState<CommunityEtf[]>([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState("");
    const [busyLike, setBusyLike] = useState<string | null>(null);
    const [draft, setDraft] = useState<CommunityEtfDraft | null>(null);

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
        try {
            const parsed = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
            if ((parsed?.market === "KR" || parsed?.market === "US") && Array.isArray(parsed?.holdings)) {
                setDraft(parsed);
            }
        } catch { /* 초안이 없으면 공개된 ETF 목록만 보여준다. */ }
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
        <PageHeader title="나만의 ETF" width="content" primaryAction={<Link href="/screener?createEtf=1" className={PAGE_PRIMARY_ACTION_CLS}>ETF 만들기</Link>} />
        <main className="mx-auto max-w-3xl px-0 pb-[calc(var(--bottombar-h)+1.5rem)] pt-2 text-neutral-900 dark:text-neutral-100 sm:px-4 sm:pt-5">
            <div className="mb-3 hidden items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 sm:flex">
                <Layers size={17} aria-hidden="true" className="text-brand-ink" />
                <p>다른 투자자의 기준과 종목 구성을 둘러보세요.</p>
            </div>
            {draft && draft.holdings.length > 0 && <section aria-labelledby="etf-draft-title" className="mb-5 border-y border-neutral-200 py-4 dark:border-surface-dark-border">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 id="etf-draft-title" className="font-semibold">내 ETF 초안</h2>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{draft.market === "KR" ? "국내" : "미국"} · {draft.holdings.length}종목</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/analyze" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-ink">종목 추가</Link>
                        {draft.holdings.length >= 2 && <Link href="/etfs/new" className={PAGE_PRIMARY_ACTION_CLS}>ETF 만들기</Link>}
                    </div>
                </div>
                <ul className="mt-2 divide-y divide-neutral-200 dark:divide-surface-dark-border">
                    {draft.holdings.map(holding => <li key={holding.ticker} className="flex min-h-14 items-center gap-3 py-2">
                        <StockLogo ticker={holding.ticker} name={holding.name} isUs={draft.market === "US"} />
                        <span className="min-w-0 flex-1 break-words font-medium">{holding.name}<span className="ml-2 text-xs text-neutral-500">{holding.ticker}</span></span>
                    </li>)}
                </ul>
            </section>}
            {loading ? <p role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-neutral-500"><LoaderCircle size={18} className="animate-spin" />피드를 불러오는 중…</p>
                : error && items.length === 0 ? <div className="py-14 text-center"><p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-11 px-3 text-sm font-semibold text-brand-ink">다시 불러오기</button></div>
                : items.length === 0 ? <section className="border-y border-neutral-200 py-16 text-center dark:border-surface-dark-border"><h1 className="text-lg font-semibold">아직 공개된 ETF가 없어요</h1><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">종목을 골라 나만의 ETF를 만들어 보세요.</p><Link href="/screener?createEtf=1" className={`${PAGE_PRIMARY_ACTION_CLS} mt-5`}>종목 고르기</Link></section>
                : <>
                    {error && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                    <div className="h-[calc(100svh-var(--bottombar-h)-6rem)] min-h-[32rem] snap-y snap-mandatory overflow-y-auto overscroll-contain bg-neutral-100 sm:h-[min(78svh,52rem)] sm:rounded-lg sm:border sm:border-neutral-200 dark:bg-neutral-950 dark:sm:border-surface-dark-border">
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
    const holdingsPages = Array.from({ length: Math.ceil(item.holdings.length / 8) }, (_, index) => item.holdings.slice(index * 8, (index + 1) * 8));
    return <article aria-label={`${item.name} 가상 ETF`} className="relative flex min-h-full snap-start flex-col justify-end overflow-hidden bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-white">
        <div className="relative z-10 flex min-h-full flex-col justify-between px-2 pb-5 pt-4 sm:px-8 sm:py-7">
            <div className="relative flex flex-1 items-start py-2 sm:py-5">
                <div className="w-full rounded-lg border border-neutral-200 bg-white p-4 pr-14 dark:border-white/15 dark:bg-black/25 sm:p-6 sm:pr-20">
                    <div className="mb-3 flex items-center gap-2 text-xs text-neutral-600 dark:text-white/65"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#126557] font-bold text-white">{(item.creator.name || "투").slice(0, 1)}</span>@{item.creator.name || "투자자"}<span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 dark:bg-white/10 dark:text-white/75">{item.market === "KR" ? "국내" : "미국"} · 균등 비중</span></div>
                    <div className="flex items-start gap-3">
                        <h2 className="min-w-0 shrink-0 break-words text-xl font-bold leading-tight tracking-tight sm:text-3xl">{item.name}</h2>
                        <p className="min-w-0 flex-1 break-words text-sm leading-5 text-neutral-700 dark:text-white/75 sm:text-base sm:leading-6">{item.idea}</p>
                    </div>
                    <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-white/20">
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                            <h3 className="font-semibold">구성 종목</h3>
                            <span className="text-sm tabular-nums text-neutral-600 dark:text-white/70">{item.holdings.length}종목 · 각 {(100 / item.holdings.length).toFixed(1)}%</span>
                        </div>
                        <div aria-label="ETF 구성 종목" className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" role="group" tabIndex={0}>
                    {holdingsPages.map((page, pageIndex) => <ul key={pageIndex} aria-label={`종목 ${pageIndex * 8 + 1}번부터 ${pageIndex * 8 + page.length}번`} className="grid min-w-full shrink-0 snap-start grid-cols-2 gap-x-3">
                        {page.map(holding => <li key={holding.ticker} className="flex min-h-11 min-w-0 items-center gap-2 border-b border-neutral-200 py-1 dark:border-white/15">
                            <StockLogo ticker={holding.ticker} name={holding.name} isUs={item.market === "US"} />
                            <span className="min-w-0 flex-1 truncate text-sm" title={`${holding.name} (${holding.ticker})`}>{holding.name}<span className="ml-1.5 text-xs text-neutral-500 dark:text-white/55">{holding.ticker}</span></span>
                        </li>)}
                    </ul>
                    )}
                </div>
                {holdingsPages.length > 1 && <p className="flex min-h-10 items-center justify-between text-sm text-neutral-600 dark:text-white/65"><span>옆으로 밀어 나머지 종목 보기</span><ChevronRight size={17} aria-hidden="true" className="text-brand-ink dark:text-[#73D1BB]" /></p>}
            </div>
                </div>
            </div>
            <div className="flex items-end justify-between gap-4 px-2">
                <p className="text-xs text-neutral-500 dark:text-white/50">수익률 시뮬레이션은 제공하지 않습니다.</p>
                <span className="text-xs text-neutral-600 dark:text-white/60">{item.holdings.length}개 종목 포트폴리오</span>
            </div>
        </div>
        <div className="absolute bottom-24 right-2 z-20 flex flex-col items-center sm:bottom-10 sm:right-4">
            <button type="button" disabled={busy} onClick={onLike} aria-pressed={item.likedByMe} aria-label={`${item.name} 좋아요 ${item.likeCount}개`} className="flex min-h-14 min-w-12 flex-col items-center justify-center gap-1 rounded-full text-neutral-700 transition-transform hover:scale-105 disabled:opacity-50 dark:text-white">
                <Heart size={27} aria-hidden="true" fill={item.likedByMe ? "currentColor" : "none"} />
                <span className="text-xs font-semibold tabular-nums">{item.likeCount}</span>
            </button>
        </div>
    </article>;
}
