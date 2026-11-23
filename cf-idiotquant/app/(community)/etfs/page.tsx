"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowDown, ChevronLeft, ChevronRight, Copy, Heart, LoaderCircle, Plus } from "lucide-react";
import { PageHeader, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { CONTROL_FOCUS_CLS } from "@/lib/ui-controls";
import { CommunityEtf, CommunityEtfHolding, getCommunityEtfs, setCommunityEtfLike } from "@/lib/features/communityEtfs/api";
import {
    averageEtfReturn, averageEtfValuationReturn, etfCreationDate, etfHoldingsText, etfReturnPercent, etfValuationModels, loadEtfHoldingPrices, type EtfHoldingPrices,
} from "@/lib/features/communityEtfs/marketData";

import { EtfNavigation } from "./EtfNavigation";
import { EtfShareButton } from "./EtfShareButton";

const PAGE_SIZE = 20;
const HOLDINGS_PER_SLIDE = 8;
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
        <PriceComparison item={item} prices={prices} market={market} onCopy={onCopy} onRetry={() => {
            setPrices(undefined);
            setAttempt(value => value + 1);
        }} />
        <div className="py-2"><EtfShareButton item={item} /></div>
    </article>;
}

function PriceComparison({ item, prices, market, onCopy, onRetry }: {
    item: CommunityEtf;
    prices: EtfHoldingPrices[] | undefined;
    market: CommunityEtf["market"];
    onCopy: () => void;
    onRetry: () => void;
}) {
    const { holdings } = item;
    const [per, ...strategies] = etfValuationModels[market];
    const expected = averageEtfValuationReturn(prices ?? [], per);
    const sinceCreation = averageEtfReturn(prices?.map(price => etfReturnPercent(price.baseline?.price ?? null, price.current)) ?? []);
    const showPercent = (percent: number | null) => percent === null ? "자료 없음" : percentFormat.format(percent / 100);
    const hasMissingPrices = prices?.some(price => price.current === null || price.baseline === null || price.valuationFailed);

    const actualTone = sinceCreation.percent === null || sinceCreation.percent === 0 ? ""
        : sinceCreation.percent > 0 ? "text-rose-700 dark:text-rose-400" : "text-blue-700 dark:text-blue-400";

    const detailPages: { holding: CommunityEtfHolding; price: EtfHoldingPrices | undefined }[][] = [];
    for (let i = 0; i < holdings.length; i += HOLDINGS_PER_SLIDE) {
        detailPages.push(holdings.slice(i, i + HOLDINGS_PER_SLIDE).map((holding, offset) => ({ holding, price: prices?.[i + offset] })));
    }
    const scroller = useRef<HTMLDivElement>(null);
    const [page, setPage] = useState(0);
    const pageCount = detailPages.length + 1;
    const showPage = (nextPage: number) => {
        const node = scroller.current;
        if (!node) return;
        const next = Math.max(0, Math.min(pageCount - 1, nextPage));
        node.scrollTo({ left: next * node.clientWidth, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        setPage(next);
    };

    return <section aria-label="수익률과 종목별 가격 비교" className="mt-2 border-y border-neutral-200 dark:border-surface-dark-border">
        <div className="border-y border-neutral-200 dark:border-surface-dark-border">
            <div className="flex min-h-11 items-center justify-between gap-2">
                <span className="text-sm font-semibold">{page === 0 ? "요약" : "종목별 상세"}</span>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={onCopy} aria-label={`${item.name} 종목 리스트 복사`} className={`inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}><Copy size={16} aria-hidden="true" /> 종목 복사</button>
                    <span aria-live="polite" className="min-w-12 text-center text-xs tabular-nums text-neutral-600 dark:text-neutral-300">{page + 1} / {pageCount}</span>
                    <button type="button" onClick={() => showPage(page - 1)} disabled={page <= 0} aria-label="이전 페이지" className={`grid min-h-11 min-w-11 place-items-center text-brand-ink disabled:opacity-40 ${CONTROL_FOCUS_CLS}`}><ChevronLeft size={18} aria-hidden="true" /></button>
                    <button type="button" onClick={() => showPage(page + 1)} disabled={page >= pageCount - 1} aria-label="다음 페이지" className={`grid min-h-11 min-w-11 place-items-center text-brand-ink disabled:opacity-40 ${CONTROL_FOCUS_CLS}`}><ChevronRight size={18} aria-hidden="true" /></button>
                </div>
            </div>
            {hasMissingPrices && <button type="button" onClick={onRetry} className={`min-h-11 px-1 text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}>누락된 자료 다시 조회</button>}
            <div ref={scroller} onScroll={event => setPage(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))} aria-label="가상 ETF 요약과 상세 페이지" tabIndex={0} className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
                <section aria-label="가상 ETF 요약" className="w-full shrink-0 snap-start px-1 pb-2">
                    <div className="grid grid-cols-2 gap-x-3 py-2.5">
                        <div><span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">기대 수익률 · PER</span><span className={`block break-words font-bold leading-tight tabular-nums ${expected.percent === null ? "text-sm" : "text-xl min-[360px]:text-2xl"}`}>{prices ? showPercent(expected.percent) : "조회 중…"}</span></div>
                        <div><span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">실제 수익률 · 생성 후</span><span className={`block break-words font-bold leading-tight tabular-nums ${sinceCreation.percent === null ? "text-sm" : "text-xl min-[360px]:text-2xl"} ${actualTone}`}>{prices ? showPercent(sinceCreation.percent) : "조회 중…"}</span></div>
                    </div>
                    <dl aria-label="전략별 기대 수익률" className="mb-2 grid grid-cols-4 gap-x-1 text-sm tabular-nums">
                        {strategies.map(model => {
                            const { percent } = averageEtfValuationReturn(prices ?? [], model);
                            return <div key={model} className="min-w-0 break-words">
                                <dt className="text-xs text-neutral-600 dark:text-neutral-300">{model === "SRIM" ? "S-RIM" : model}</dt>
                                <dd className="font-semibold">{prices ? showPercent(percent) : "조회 중…"}</dd>
                            </div>;
                        })}
                    </dl>
                    {expected.count > 0 && expected.count < holdings.length && <p className="mb-2 text-xs text-neutral-600 dark:text-neutral-300">PER 수익률은 {expected.count}/{holdings.length}종목 기준</p>}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 border-t border-neutral-200 pt-2 dark:border-surface-dark-border">
                        <h4 className="font-semibold">구성 종목</h4>
                        <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-300">
                            {holdings.length}종목{holdings.length > 0 && ` · 각 ${(100 / holdings.length).toFixed(1)}%`}
                        </span>
                    </div>
                    <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 min-[360px]:grid-cols-3 sm:grid-cols-4">
                        {holdings.map(holding => <li key={holding.ticker} title={holding.ticker} className="min-w-0 break-words text-sm leading-5">
                            {holding.name}<span className="sr-only"> {holding.ticker}</span>
                        </li>)}
                    </ul>
                </section>
                {detailPages.map((rows, index) => <section key={index} aria-label={`종목 상세 ${index + 1}페이지`} className="w-full shrink-0 snap-start px-1 pb-2">
                    <HoldingPriceTable rows={rows} market={market} loading={!prices} />
                </section>)}
            </div>
        </div>
    </section>;
}

function HoldingPriceTable({ rows, market, loading }: {
    rows: { holding: CommunityEtfHolding; price: EtfHoldingPrices | undefined }[];
    market: CommunityEtf["market"];
    loading: boolean;
}) {
    const dates = new Set(rows.flatMap(({ price }) => price?.baseline ? [price.baseline.priceDate] : []));
    const commonDate = dates.size === 1 ? [...dates][0] : undefined;
    const formatDate = (date: string) => date.replace(/^(....)(..)(..)$/, "$1.$2.$3");
    const showPrice = (value: number | null | undefined) => value == null
        ? <span aria-label="자료 없음">–</span>
        : priceFormats[market].format(value);

    return <table className="w-full table-fixed text-sm leading-5 tabular-nums">
        <caption className="py-1 text-left text-xs text-neutral-600 dark:text-neutral-300">
            {loading ? "가격 조회 중…" : commonDate ? `기준일 ${formatDate(commonDate)}` : <span className="sr-only">종목별 가격 비교</span>}
        </caption>
        <thead className="border-b border-neutral-200 text-xs text-neutral-600 dark:border-surface-dark-border dark:text-neutral-300">
            <tr>
                <th scope="col" className="w-[34%] pb-1 pr-1 text-left font-medium">종목 · 수익률</th>
                <th scope="col" className="pb-1 pl-1 text-right font-medium">기준 종가</th>
                <th scope="col" className="pb-1 pl-1 text-right font-medium">현재가</th>
                <th scope="col" className="pb-1 pl-1 text-right font-medium">PER 평가액</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-surface-dark-border">
            {rows.map(({ holding, price }) => {
                const baseline = price?.baseline;
                const actual = etfReturnPercent(baseline?.price ?? null, price?.current ?? null);
                const returnTone = actual === null || actual === 0 ? "text-neutral-600 dark:text-neutral-300"
                    : actual > 0 ? "text-rose-700 dark:text-rose-400" : "text-blue-700 dark:text-blue-400";
                return <tr key={holding.ticker}>
                    <th scope="row" className="break-words py-1 pr-1 text-left font-semibold">
                        <span title={holding.ticker}>{holding.name}<span className="sr-only"> {holding.ticker}</span></span>
                        {actual !== null && <span className={`block text-xs ${returnTone}`}>{percentFormat.format(actual / 100)}</span>}
                    </th>
                    <td className="break-words pl-1 text-right">
                        {showPrice(baseline?.price)}
                        {baseline && !commonDate && <span className="block text-xs text-neutral-600 dark:text-neutral-300">{formatDate(baseline.priceDate)}</span>}
                    </td>
                    <td className="break-words pl-1 text-right">{showPrice(price?.current)}</td>
                    <td className="break-words pl-1 text-right">{showPrice(price?.targets.PER)}</td>
                </tr>;
            })}
        </tbody>
    </table>;
}
