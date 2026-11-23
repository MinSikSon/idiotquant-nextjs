"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowDown, ChevronLeft, ChevronRight, Copy, Heart, LoaderCircle, Plus } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { StockLogo } from "@/components/stockLogo";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { CONTROL_FOCUS_CLS } from "@/lib/ui-controls";
import { CommunityEtf, CommunityEtfHolding, getCommunityEtfs, setCommunityEtfLike } from "@/lib/features/communityEtfs/api";
import {
    averageEtfReturn, averageEtfValuationReturn, etfCreationDate, etfHoldingsText, etfReturnPercent, etfValuationModels, loadEtfHoldingPrices, type EtfHoldingPrices,
} from "@/lib/features/communityEtfs/marketData";

import { EtfNavigation } from "./EtfNavigation";
import { EtfShareButton } from "./EtfShareButton";

const PAGE_SIZE = 20;
const percentFormat = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const priceFormats = {
    KR: new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }),
    US: new Intl.NumberFormat("ko-KR", { style: "currency", currency: "USD", maximumFractionDigits: 4 }),
};

export default function CommunityEtfsPage() {
    const { status } = useSession();
    const { toasts, addToast, removeToast } = useToast();
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

    async function copyHoldings(item: CommunityEtf) {
        try {
            await navigator.clipboard.writeText(etfHoldingsText(item.holdings));
            addToast("success", `${item.holdings.length}종목을 복사했습니다.`);
        } catch {
            addToast("error", "종목을 복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.");
        }
    }

    return <>
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <PageHeader
            title="가상 ETF"
            tabs={<EtfNavigation active="feed" />}
            width="content"
            description="기대 수익률은 분석 페이지와 같은 모델로 산출한 평가액을 현재가와 비교한 추정치입니다. 실제 수익률은 생성일 기준 종가 대비 현재가의 변화이며, 배당·환율·거래비용은 반영하지 않습니다."
            primaryAction={<Link href="/etfs/draft" className={`${PAGE_PRIMARY_ACTION_CLS} dark:text-neutral-950`}><Plus size={16} aria-hidden="true" />ETF 만들기</Link>}
        />
        <section aria-label="공개 가상 ETF 피드" tabIndex={0} className={`h-[calc(100dvh-var(--navigation-h)-2.75rem-var(--bottombar-h))] min-h-48 snap-y snap-mandatory overflow-y-auto overscroll-y-contain text-neutral-900 dark:text-neutral-100 md:h-[calc(100dvh-var(--navigation-h))] ${CONTROL_FOCUS_CLS}`}>
            {loading ? <p role="status" className="flex min-h-64 items-center justify-center gap-2 text-sm text-neutral-500"><LoaderCircle size={18} className="animate-spin" />피드를 불러오는 중…</p>
                : error && items.length === 0 ? <div className="py-14 text-center"><p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-11 px-3 text-sm font-semibold text-brand-ink">다시 불러오기</button></div>
                : items.length === 0 ? <section className="border-y border-neutral-200 py-8 dark:border-surface-dark-border"><h2 className="text-lg font-semibold">아직 공개된 가상 ETF가 없어요</h2><p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">종목을 골라 첫 가상 ETF를 만들고, 함께 고른 이유를 공유해 보세요.</p></section>
                : <>
                    {items.map((item, index) => <div key={item.id} className="min-h-full snap-start snap-always">
                        {error && index === 0 && <p role="alert" className="mb-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
                        <EtfEpisode item={item} busy={busyLike === item.id} onLike={() => void toggleLike(item)} onCopy={() => void copyHoldings(item)} />
                        {hasMore && index === items.length - 1 && <div className="flex justify-center pt-2">
                            <button type="button" disabled={loadingMore} onClick={() => void load(offset)} className={`inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-brand-ink disabled:opacity-50 ${CONTROL_FOCUS_CLS}`}>
                                {loadingMore ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowDown size={16} aria-hidden="true" />}
                                {loadingMore ? "불러오는 중…" : "ETF 더 불러오기"}
                            </button>
                        </div>}
                    </div>)}
                </>}
        </section>
    </>;
}

function EtfEpisode({ item, busy, onLike, onCopy }: { item: CommunityEtf; busy: boolean; onLike: () => void; onCopy: () => void }) {
    const { holdings, createdAt, market } = item;
    const isUs = market === "US";
    const createdDate = etfCreationDate(createdAt);
    const articleRef = useRef<HTMLElement>(null);
    const [prices, setPrices] = useState<EtfHoldingPrices[]>();
    const [visible, setVisible] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!articleRef.current) return;
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            setVisible(true);
            observer.disconnect();
        });
        observer.observe(articleRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return;
        let active = true;
        void loadEtfHoldingPrices({ holdings, market, createdAt }, () => active).then(result => {
            if (active) setPrices(result);
        });
        return () => { active = false; };
    }, [attempt, createdAt, holdings, market, visible]);

    return <article ref={articleRef} aria-label={`${item.name} 가상 ETF`} className="min-h-full px-4 pb-3 pt-3 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand font-bold text-white dark:text-neutral-900">{(item.creator.name || "투").slice(0, 1)}</span>
            <span className="min-w-0 flex-1 break-words">@{item.creator.name || "투자자"}</span>
            <span>{isUs ? "미국" : "국내"}</span>
            <button type="button" disabled={busy} onClick={onLike} aria-pressed={item.likedByMe} aria-label={`${item.name} 좋아요 ${item.likeCount}개`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded px-1.5 font-semibold tabular-nums hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 aria-pressed:text-brand-ink dark:hover:bg-white/10">
                <Heart size={18} aria-hidden="true" fill={item.likedByMe ? "currentColor" : "none"} />
                <span>{item.likeCount}</span>
            </button>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <h2 className="min-w-0 break-words text-lg font-bold leading-tight tracking-tight sm:text-xl">{item.name}</h2>
            <time dateTime={createdDate} aria-label={`생성일 ${createdDate}`} className="shrink-0 text-xs tabular-nums text-neutral-600 dark:text-neutral-300">{createdDate.replaceAll("-", ".")} 생성</time>
        </div>
        <p className="mt-1 break-words text-sm leading-5 text-neutral-700 dark:text-neutral-300 sm:text-base">{item.idea}</p>
        <PriceComparison holdings={holdings} prices={prices} market={market} onRetry={() => {
            setPrices(undefined);
            setAttempt(value => value + 1);
        }} />
        <div className="border-t border-neutral-200 dark:border-surface-dark-border">
            <div className="flex flex-wrap items-center justify-between gap-x-2">
                <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="font-semibold">구성 종목</h3>
                    <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-300">
                        {holdings.length}종목{holdings.length > 0 && ` · 각 ${(100 / holdings.length).toFixed(1)}%`}
                    </span>
                </div>
                <button type="button" onClick={onCopy} aria-label={`${item.name} 종목 리스트 복사`} className={`inline-flex min-h-11 min-w-11 items-center gap-1.5 rounded text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}>
                    <Copy size={16} aria-hidden="true" /> 종목 복사
                </button>
            </div>
            {holdings.length > 6 && <p className="text-xs text-neutral-600 dark:text-neutral-300">좌우로 밀어 나머지 종목 보기</p>}
            <HoldingsList holdings={holdings} isUs={isUs} />
        </div>
        <div className="py-2"><EtfShareButton item={item} /></div>
    </article>;
}

function PriceComparison({ holdings, prices, market, onRetry }: {
    holdings: CommunityEtfHolding[];
    prices: EtfHoldingPrices[] | undefined;
    market: CommunityEtf["market"];
    onRetry: () => void;
}) {
    const [per, ...strategies] = etfValuationModels[market];
    const expected = averageEtfValuationReturn(prices ?? [], per);
    const sinceCreation = averageEtfReturn(prices?.map(price => etfReturnPercent(price.baseline?.price ?? null, price.current)) ?? []);
    const showPercent = (percent: number | null) => percent === null ? "자료 없음" : percentFormat.format(percent / 100);
    const showPrice = (price: number | null | undefined) => price == null ? "자료 없음" : priceFormats[market].format(price);

    const actualTone = sinceCreation.percent === null || sinceCreation.percent === 0 ? ""
        : sinceCreation.percent > 0 ? "text-rose-700 dark:text-rose-400" : "text-blue-700 dark:text-blue-400";

    const detailPages: { holding: CommunityEtfHolding; price: EtfHoldingPrices | undefined }[][] = [];
    for (let i = 0; i < holdings.length; i += 3) {
        detailPages.push(holdings.slice(i, i + 3).map((holding, offset) => ({ holding, price: prices?.[i + offset] })));
    }
    const detailScroller = useRef<HTMLDivElement>(null);
    const [detailPage, setDetailPage] = useState(0);
    const showDetailPage = (page: number) => {
        const node = detailScroller.current;
        if (!node) return;
        const nextPage = Math.max(0, Math.min(detailPages.length - 1, page));
        node.scrollTo({ left: nextPage * node.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        setDetailPage(nextPage);
    };

    return <section aria-label="수익률과 종목별 가격 비교" className="mt-2 border-y border-neutral-200 dark:border-surface-dark-border">
        <div className="py-2.5">
            <span className="grid grid-cols-2 gap-x-2">
                <span>
                    <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">기대 수익률 · PER</span>
                    <span className={`block break-words font-bold leading-tight tracking-tight tabular-nums ${expected.percent === null ? "text-sm" : "text-xl min-[360px]:text-2xl"}`}>{prices ? showPercent(expected.percent) : "조회 중…"}</span>
                    {expected.count > 0 && expected.count < holdings.length && <span className="text-xs text-neutral-600 dark:text-neutral-300">{expected.count}/{holdings.length}종목</span>}
                </span>
                <span className="border-l border-neutral-200 pl-2 pr-5 dark:border-surface-dark-border">
                    <span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">실제 수익률<span className="sr-only"> (생성 후)</span></span>
                    <span className={`block break-words font-bold leading-tight tracking-tight tabular-nums ${sinceCreation.percent === null ? "text-sm" : "text-xl min-[360px]:text-2xl"} ${actualTone}`}>{prices ? showPercent(sinceCreation.percent) : "조회 중…"}</span>
                    {sinceCreation.count > 0 && sinceCreation.count < holdings.length && <span className="text-xs text-neutral-600 dark:text-neutral-300">{sinceCreation.count}/{holdings.length}종목</span>}
                </span>
            </span>
            <span className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 border-t border-neutral-200 pt-2 dark:border-surface-dark-border sm:grid-cols-4">
                <span className="sr-only">전략별 기대 수익률</span>
                {strategies.map(model => {
                    const { percent, count } = averageEtfValuationReturn(prices ?? [], model);
                    const tone = percent !== null && percent > 0 ? "text-emerald-700 dark:text-emerald-300"
                        : percent !== null && percent < 0 ? "text-red-600 dark:text-red-400" : "";
                    return <span key={model} className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 text-xs">
                        <span className="font-medium text-neutral-600 dark:text-neutral-300">{model === "SRIM" ? "S-RIM" : model}</span>
                        <span className={`break-words font-semibold tabular-nums ${tone}`}>{prices ? showPercent(percent) : "조회 중…"}</span>
                        {count > 0 && count < holdings.length && <span className="text-neutral-600 dark:text-neutral-300">{count}/{holdings.length}종목</span>}
                    </span>;
                })}
            </span>
            <ReturnBars values={[
                { label: "기대 · PER", value: expected.percent },
                { label: "실제", value: sinceCreation.percent },
                ...strategies.map(model => ({ label: model === "SRIM" ? "S-RIM" : model, value: averageEtfValuationReturn(prices ?? [], model).percent })),
            ]} />
        </div>
        <div className="border-t border-neutral-200 py-2 dark:border-surface-dark-border">
            <div className="mb-2 flex min-h-11 items-center justify-between gap-2">
                <div>
                    <h4 className="text-sm font-semibold">종목별 가격 비교</h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300">{prices ? `${holdings.length}종목 · 좌우로 넘겨 보기` : "종목별 주가를 불러오는 중…"}</p>
                </div>
                <div className="flex items-center gap-1">
                    <span aria-live="polite" className="min-w-12 text-center text-xs tabular-nums text-neutral-600 dark:text-neutral-300">{detailPages.length ? `${detailPage + 1} / ${detailPages.length}` : "– / –"}</span>
                    <button type="button" onClick={() => showDetailPage(detailPage - 1)} disabled={detailPage <= 0} aria-label="이전 종목 페이지" className={`grid min-h-11 min-w-11 place-items-center text-brand-ink disabled:opacity-40 ${CONTROL_FOCUS_CLS}`}><ChevronLeft size={18} aria-hidden="true" /></button>
                    <button type="button" onClick={() => showDetailPage(detailPage + 1)} disabled={detailPage >= detailPages.length - 1} aria-label="다음 종목 페이지" className={`grid min-h-11 min-w-11 place-items-center text-brand-ink disabled:opacity-40 ${CONTROL_FOCUS_CLS}`}><ChevronRight size={18} aria-hidden="true" /></button>
                </div>
            </div>
            {!prices ? <p role="status" className="pb-2 text-sm">가격 자료를 불러오는 중…</p> : <>
                {prices.some(price => price.current === null || price.baseline === null || price.valuationFailed) && <button type="button" onClick={onRetry} className={`mb-2 min-h-11 text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}>누락된 자료 다시 조회</button>}
                <div ref={detailScroller} onScroll={event => setDetailPage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))} aria-label="종목별 가격 비교 페이지" tabIndex={0} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                    {detailPages.map((page, pageIndex) => <ul key={pageIndex} aria-label={`종목 상세 ${pageIndex + 1}페이지`} className="w-full shrink-0 snap-start divide-y divide-neutral-200 pr-2 dark:divide-surface-dark-border">
                        {page.map(({ holding, price }) => {
                            const baselineDate = price?.baseline?.priceDate.replace(/^(....)(..)(..)$/, "$1.$2.$3");
                            return <li key={holding.ticker} className="py-2">
                                <p className="break-words text-sm font-semibold">{holding.name} <span className="font-normal text-neutral-600 dark:text-neutral-300">{holding.ticker}</span></p>
                                <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-sm tabular-nums sm:grid-cols-4">
                                    <div><dt className="text-xs text-neutral-600 dark:text-neutral-300">기준 종가 {baselineDate}</dt><dd>{showPrice(price?.baseline?.price)}</dd></div>
                                    <div><dt className="text-xs text-neutral-600 dark:text-neutral-300">현재가</dt><dd>{showPrice(price?.current)}</dd></div>
                                    <div><dt className="text-xs text-neutral-600 dark:text-neutral-300">{per} 평가액</dt><dd>{showPrice(price?.targets[per])}</dd></div>
                                    <div><dt className="text-xs text-neutral-600 dark:text-neutral-300">실제 주가 수익률</dt><dd>{showPercent(etfReturnPercent(price?.baseline?.price ?? null, price?.current ?? null))}</dd></div>
                                </dl>
                            </li>;
                        })}
                    </ul>)}
                </div>
            </>}
        </div>
    </section>;
}

function ReturnBars({ values }: { values: { label: string; value: number | null }[] }) {
    const extent = Math.max(100, ...values.map(({ value }) => Math.abs(value ?? 0)));
    return <div aria-label="전략별 수익률 그래프" className="mt-3 space-y-1.5">
        {values.map(({ label, value }) => {
            const positive = (value ?? 0) >= 0;
            const width = value === null ? 0 : Math.min(48, Math.abs(value) / extent * 48);
            return <div key={label} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2 text-xs tabular-nums">
                <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
                <span className="relative h-4 border-b border-neutral-200 dark:border-neutral-700">
                    <span aria-hidden="true" className="absolute bottom-0 left-1/2 top-0 border-l border-neutral-500 dark:border-neutral-400" />
                    {value !== null && <span aria-hidden="true" className={`absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full ${positive ? "bg-rose-500" : "bg-blue-500"}`} style={{ left: positive ? "50%" : `${50 - width}%`, width: `${width}%` }} />}
                </span>
                <span className={`text-right font-semibold ${value === null ? "text-neutral-500" : positive ? "text-rose-700 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}`}>{value === null ? "자료 없음" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`}</span>
            </div>;
        })}
    </div>;
}

function HoldingsList({ holdings, isUs }: { holdings: CommunityEtfHolding[]; isUs: boolean }) {
    const pages: CommunityEtfHolding[][] = [];
    for (let i = 0; i < holdings.length; i += 6) pages.push(holdings.slice(i, i + 6));
    return <div aria-label="구성 종목 좌우로 넘기기" tabIndex={0} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
        {pages.map((page, pageIndex) => <ul key={pageIndex} className="grid w-full shrink-0 snap-start grid-cols-2 gap-x-3 pr-2 sm:gap-x-5">
            {page.map(holding => <li key={holding.ticker} className="flex min-h-11 min-w-0 items-center gap-1.5 border-b border-neutral-200 py-1.5 dark:border-surface-dark-border sm:gap-2">
                <StockLogo ticker={holding.ticker} name={holding.name} isUs={isUs} />
                <span className="min-w-0 break-words text-sm leading-4">{holding.name} <span className="inline-block max-w-full text-xs tabular-nums text-neutral-600 dark:text-neutral-400">{holding.ticker}</span></span>
            </li>)}
        </ul>)}
    </div>;
}
