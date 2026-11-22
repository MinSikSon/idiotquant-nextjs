"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowDown, ChevronDown, ChevronRight, Heart, LoaderCircle } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS, PAGE_WIDTH } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import { CommunityEtf, CommunityEtfDraft, CommunityEtfHolding, getCommunityEtfs, setCommunityEtfLike } from "@/lib/features/communityEtfs/api";

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
        <PageHeader
            title="나만의 ETF"
            width="content"
            description="수익률 시뮬레이션은 제공하지 않습니다."
            primaryAction={<Link href="/screener?createEtf=1" className={PAGE_PRIMARY_ACTION_CLS}>ETF 만들기</Link>}
        />
        <div className={`${PAGE_WIDTH.content} pb-4 pt-2 text-neutral-900 dark:text-neutral-100 sm:pt-4`}>
            {draft && draft.holdings.length > 0 && <section aria-labelledby="etf-draft-title" className="mb-5 border-y border-neutral-200 py-4 dark:border-surface-dark-border">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 id="etf-draft-title" className="font-semibold">내 ETF 초안</h2>
                        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{draft.market === "KR" ? "국내" : "미국"} · {draft.holdings.length}종목</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/etfs/draft" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-ink">종목 보기</Link>
                        {draft.holdings.length >= 2 && <Link href="/etfs/new" className={PAGE_PRIMARY_ACTION_CLS}>ETF 만들기</Link>}
                    </div>
                </div>
                <Link href="/etfs/draft" aria-label="ETF 초안 구성 종목 전체 보기" className="mt-2 flex min-h-12 items-center justify-between border-t border-neutral-200 py-2 text-sm text-neutral-700 dark:border-surface-dark-border dark:text-neutral-300">
                    <span className="truncate">{draft.holdings.slice(0, 2).map(holding => holding.name).join(" · ")}{draft.holdings.length > 2 ? ` 외 ${draft.holdings.length - 2}종목` : ""}</span>
                    <ChevronRight size={18} aria-hidden="true" className="ml-2 shrink-0 text-brand-ink" />
                </Link>
            </section>}
            {loading ? <p role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-neutral-500"><LoaderCircle size={18} className="animate-spin" />피드를 불러오는 중…</p>
                : error && items.length === 0 ? <div className="py-14 text-center"><p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-11 px-3 text-sm font-semibold text-brand-ink">다시 불러오기</button></div>
                : items.length === 0 ? <section className="border-y border-neutral-200 py-16 text-center dark:border-surface-dark-border"><h1 className="text-lg font-semibold">아직 공개된 ETF가 없어요</h1><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">종목을 골라 나만의 ETF를 만들어 보세요.</p><Link href="/screener?createEtf=1" className={`${PAGE_PRIMARY_ACTION_CLS} mt-5`}>종목 고르기</Link></section>
                : <>
                    {error && <p role="alert" className="mb-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                    <div className="mx-auto grid max-w-3xl gap-3">
                        {items.map(item => <EtfEpisode key={item.id} item={item} busy={busyLike === item.id} onLike={() => void toggleLike(item)} />)}
                    </div>
                    {hasMore && <div className="flex justify-center py-3">
                        <button type="button" disabled={loadingMore} onClick={() => void load(offset)} className="inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-brand-ink disabled:opacity-50">
                            {loadingMore ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowDown size={16} aria-hidden="true" />}
                            {loadingMore ? "불러오는 중…" : "다음 ETF"}
                        </button>
                    </div>}
                </>}
        </div>
    </>;
}

function EtfEpisode({ item, busy, onLike }: { item: CommunityEtf; busy: boolean; onLike: () => void }) {
    const preview = item.holdings.slice(0, 8);
    const remaining = item.holdings.slice(preview.length);
    const isUs = item.market === "US";

    return <article aria-label={`${item.name} 가상 ETF`} className="rounded-lg border border-neutral-200 bg-white px-3 pb-1 pt-1 dark:border-surface-dark-border dark:bg-surface-dark-card sm:px-4">
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand font-bold text-white dark:text-neutral-900">{(item.creator.name || "투").slice(0, 1)}</span>
            <span className="min-w-0 flex-1 break-words">@{item.creator.name || "투자자"}</span>
            <span>{isUs ? "미국" : "국내"}</span>
            <button type="button" disabled={busy} onClick={onLike} aria-pressed={item.likedByMe} aria-label={`${item.name} 좋아요 ${item.likeCount}개`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded px-1.5 font-semibold tabular-nums hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 aria-pressed:text-brand-ink dark:hover:bg-white/10">
                <Heart size={18} aria-hidden="true" fill={item.likedByMe ? "currentColor" : "none"} />
                <span>{item.likeCount}</span>
            </button>
        </div>
        <h2 className="break-words text-lg font-bold leading-tight tracking-tight sm:text-xl">{item.name}</h2>
        <p className="mt-1 break-words text-sm leading-5 text-neutral-700 dark:text-neutral-300 sm:text-base">{item.idea}</p>
        <div className="mt-3 border-t border-neutral-200 pt-2 dark:border-surface-dark-border">
            <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <h3 className="font-semibold">구성 종목</h3>
                <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-300">
                    {item.holdings.length}종목{item.holdings.length > 0 && ` · 각 ${(100 / item.holdings.length).toFixed(1)}%`}
                </span>
            </div>
            <HoldingsList holdings={preview} isUs={isUs} />
            {remaining.length > 0 && <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded text-sm font-semibold text-brand-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">나머지 {remaining.length}종목 보기</span>
                    <span className="hidden group-open:inline">나머지 종목 접기</span>
                    <ChevronDown size={16} aria-hidden="true" className="shrink-0 group-open:rotate-180" />
                </summary>
                <HoldingsList holdings={remaining} isUs={isUs} />
            </details>}
        </div>
    </article>;
}

function HoldingsList({ holdings, isUs }: { holdings: CommunityEtfHolding[]; isUs: boolean }) {
    return <ul className="grid grid-cols-2 gap-x-3 sm:gap-x-5">
        {holdings.map(holding => <li key={holding.ticker} className="flex min-h-11 min-w-0 items-center gap-1.5 border-b border-neutral-200 py-1.5 dark:border-surface-dark-border sm:gap-2">
            <StockLogo ticker={holding.ticker} name={holding.name} isUs={isUs} />
            <span className="min-w-0 break-words text-sm leading-4">
                {holding.name} <span className="inline-block max-w-full text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{holding.ticker}</span>
            </span>
        </li>)}
    </ul>;
}
