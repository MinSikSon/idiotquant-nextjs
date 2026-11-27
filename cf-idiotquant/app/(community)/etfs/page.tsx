"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowDown, ArrowDownRight, ArrowUpRight, Bot, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Copy, Heart, LoaderCircle, Wallet } from "lucide-react";
import Link from "next/link";
import { ToastContainer, useToast } from "@/components/ui/toast";
import { CONTROL_FOCUS_CLS, CONTROL_ICON_BUTTON_CLS } from "@/lib/ui-controls";
import { balanceTickerKey, type PortfolioTradingStatus } from "@/lib/features/algorithmTrade/portfolioStocks";
import { representativePortfolioUserId } from "@/lib/features/algorithmTrade/representativePortfolio";
import { useViewAsUser } from "@/lib/viewAsUser";
import { CommunityEtf, CommunityEtfHolding, getCommunityEtfs, setCommunityEtfLike } from "@/lib/features/communityEtfs/api";
import {
    averageEtfReturn, averageEtfValuationReturn, etfCreationDate, etfHoldingsText, etfReturnPercent, etfValuationModels, loadEtfHoldingPrices, type EtfHoldingPrices,
} from "@/lib/features/communityEtfs/marketData";

import { EtfShareButton } from "./EtfShareButton";
import { type EtfPortfolio, useEtfPortfolio, useEtfPortfolioKey } from "./useEtfPortfolio";

const PAGE_SIZE = 20;
const HOLDINGS_PER_SLIDE = 8;
const percentFormat = new Intl.NumberFormat("ko-KR", { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const priceFormats = {
    KR: new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" }),
    US: new Intl.NumberFormat("ko-KR", { style: "currency", currency: "USD", maximumFractionDigits: 4 }),
};

export default function CommunityEtfsPage() {
    const { data: session, status } = useSession();
    const { toasts, addToast, removeToast } = useToast();
    const [items, setItems] = useState<CommunityEtf[]>([]);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState("");
    const [busyLike, setBusyLike] = useState<string | null>(null);
    const feed = useRef<HTMLElement>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [portfolioAttempt, setPortfolioAttempt] = useState(0);
    const viewAsUser = useViewAsUser();
    const portfolioUserId = status === "authenticated" && !viewAsUser ? representativePortfolioUserId(session?.user) : undefined;
    const portfolioKey = useEtfPortfolioKey(items.length > 0 ? portfolioUserId : undefined, portfolioAttempt);
    const krPortfolio = useEtfPortfolio("KR", portfolioUserId, items.some(item => item.market === "KR") ? portfolioKey : undefined, portfolioAttempt);
    const usPortfolio = useEtfPortfolio("US", portfolioUserId, items.some(item => item.market === "US") ? portfolioKey : undefined, portfolioAttempt);

    function syncActiveCard() {
        const node = feed.current;
        if (!node) return;
        const cards = node.children;
        let index = cards.length - 1;
        while (index > 0 && (cards[index] as HTMLElement).offsetTop > node.scrollTop + 2) index--;
        setActiveIndex(index);
    }

    function goToCard(index: number) {
        const node = feed.current;
        const card = node?.children.item(index) as HTMLElement | null;
        if (!node || !card) return;
        node.scrollTo({
            top: card.offsetTop,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });
    }

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

    return <div className="mx-auto flex h-[calc(100dvh-var(--navigation-h)-var(--mobile-bottom-inset))] w-full max-w-3xl flex-col text-neutral-900 dark:text-neutral-100 md:h-[calc(100dvh-var(--navigation-h))]">
        <ToastContainer toasts={toasts} onRemove={removeToast} />
        <h1 className="sr-only">공개 가상 ETF 피드</h1>
        <section ref={feed} id="etf-feed" aria-label="ETF 목록" tabIndex={0} onScroll={syncActiveCard}
            className={`relative min-h-0 min-w-0 flex-1 snap-y snap-mandatory overflow-x-hidden overflow-y-auto overscroll-y-contain ${CONTROL_FOCUS_CLS} focus-visible:-outline-offset-2`}>
            {loading ? <p role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-neutral-600 dark:text-neutral-300"><LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" />피드를 불러오는 중…</p>
                : error && items.length === 0 ? <div className="px-4 py-10 text-center"><p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p><button type="button" onClick={() => void load()} className="mt-3 min-h-11 px-3 text-sm font-semibold text-brand-ink">다시 불러오기</button></div>
                : items.length === 0 ? <div className="px-4 py-10"><h2 className="text-lg font-semibold">아직 공개된 가상 ETF가 없어요</h2><p className="mt-2 text-base text-neutral-700 dark:text-neutral-300">종목을 골라 첫 가상 ETF를 만들고, 함께 고른 이유를 공유해 보세요.</p></div>
                : items.map((item, index) => <div key={item.id} className="min-h-full snap-start snap-always border-b border-neutral-200 dark:border-surface-dark-border">
                    <EtfEpisode item={item} busy={busyLike === item.id} onLike={() => void toggleLike(item)} onCopy={() => void copyHoldings(item)}
                        portfolio={item.market === "US" ? usPortfolio : krPortfolio}
                        portfolioMissing={portfolioKey === null} onRetryPortfolio={() => setPortfolioAttempt(value => value + 1)} />
                    {hasMore && index === items.length - 1 && <div className="flex justify-center px-4 pb-4">
                        <button type="button" disabled={loadingMore} onClick={() => void load(offset)} className={`service-button-quiet inline-flex min-h-11 items-center gap-2 px-4 text-sm font-semibold text-brand-ink disabled:opacity-50 ${CONTROL_FOCUS_CLS}`}>
                            {loadingMore ? <LoaderCircle size={16} className="animate-spin motion-reduce:animate-none" /> : <ArrowDown size={16} aria-hidden="true" />}
                            {loadingMore ? "불러오는 중…" : "ETF 더 불러오기"}
                        </button>
                    </div>}
                </div>)}
        </section>
        {items.length > 0 && error && <p role="alert" className="px-4 py-1 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        {items.length > 1 && <nav aria-label="피드 카드 탐색" className="flex shrink-0 items-center justify-between gap-2 border-t border-neutral-200 px-3 dark:border-surface-dark-border">
            <p className="flex min-w-0 items-center gap-1.5 text-sm text-neutral-700 dark:text-neutral-300">
                <ChevronsUpDown size={16} aria-hidden="true" className="shrink-0 text-brand-ink" />
                <span className="md:hidden">위아래로 밀어 ETF 보기</span>
                <span className="hidden md:inline">스크롤로 ETF 넘기기</span>
            </p>
            <div className="flex shrink-0 items-center">
                <span className="mr-1 text-xs tabular-nums text-neutral-700 dark:text-neutral-300" aria-live="polite">{activeIndex + 1} / {items.length}</span>
                <button type="button" onClick={() => goToCard(activeIndex - 1)} disabled={activeIndex === 0} aria-label="이전 ETF" aria-controls="etf-feed" className={CONTROL_ICON_BUTTON_CLS}><ChevronUp size={20} aria-hidden="true" /></button>
                <button type="button" onClick={() => goToCard(activeIndex + 1)} disabled={activeIndex >= items.length - 1} aria-label="다음 ETF" aria-controls="etf-feed" className={CONTROL_ICON_BUTTON_CLS}><ChevronDown size={20} aria-hidden="true" /></button>
            </div>
        </nav>}
    </div>;
}

function EtfEpisode({ item, busy, onLike, onCopy, portfolio, portfolioMissing, onRetryPortfolio }: {
    item: CommunityEtf; busy: boolean; onLike: () => void; onCopy: () => void;
    portfolio?: EtfPortfolio; portfolioMissing: boolean; onRetryPortfolio: () => void;
}) {
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

    return <article ref={articleRef} aria-label={`${item.name} 가상 ETF`} className="min-w-0 px-4 pb-4 pt-2 sm:px-6 md:pt-6">
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand font-bold text-white dark:text-neutral-900">{(item.creator.name || "투").slice(0, 1)}</span>
            <span className="min-w-0 flex-1 break-words">@{item.creator.name || "투자자"}</span>
            <span>{isUs ? "미국" : "국내"}</span>
            <button type="button" disabled={busy} onClick={onLike} aria-pressed={item.likedByMe} aria-label={`${item.name} 좋아요 ${item.likeCount}개`} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded px-1.5 font-semibold tabular-nums hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 aria-pressed:text-brand-ink dark:hover:bg-white/10">
                <Heart size={18} aria-hidden="true" fill={item.likedByMe ? "currentColor" : "none"} />
                <span>{item.likeCount}</span>
            </button>
            <EtfShareButton item={item} iconOnly />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="min-w-0 break-words text-2xl font-bold leading-tight tracking-tight min-[360px]:text-3xl md:text-4xl">{item.name}</h2>
            <time dateTime={createdDate} aria-label={`생성일 ${createdDate}`} className="shrink-0 text-xs tabular-nums text-neutral-600 dark:text-neutral-300">{createdDate.replaceAll("-", ".")} 생성</time>
        </div>
        <p className="mt-2 break-words text-base leading-relaxed text-neutral-800 dark:text-neutral-200 md:text-lg">{item.idea}</p>
        <PriceComparison item={item} prices={prices} market={market} onCopy={onCopy}
            portfolio={portfolio} portfolioMissing={portfolioMissing} onRetryPortfolio={onRetryPortfolio} onRetry={() => {
            setPrices(undefined);
            setAttempt(value => value + 1);
        }} />
    </article>;
}

function PriceComparison({ item, prices, market, onCopy, onRetry, portfolio, portfolioMissing, onRetryPortfolio }: {
    item: CommunityEtf;
    prices: EtfHoldingPrices[] | undefined;
    market: CommunityEtf["market"];
    onCopy: () => void;
    onRetry: () => void;
    portfolio?: EtfPortfolio;
    portfolioMissing: boolean;
    onRetryPortfolio: () => void;
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

    useEffect(() => {
        const node = scroller.current;
        if (!node) return;
        const settlePage = (event: Event) => {
            const left = node.getBoundingClientRect().left;
            const nearest = Array.from(node.children).reduce((best, slide, index) => {
                const distance = slide.getBoundingClientRect().left - left;
                return Math.abs(distance) < Math.abs(best.distance) ? { index, distance } : best;
            }, { index: 0, distance: Infinity });

            if (Math.abs(nearest.distance) > 0.5) {
                if (event.type !== "scrollend") return;
                node.scrollTo({ left: node.scrollLeft + nearest.distance, behavior: "instant" });
            }
            setPage(nearest.index);
        };
        const eventType = "onscrollend" in node ? "scrollend" : "scroll";
        node.addEventListener(eventType, settlePage);
        return () => node.removeEventListener(eventType, settlePage);
    }, []);

    const showPage = (nextPage: number) => {
        const node = scroller.current;
        const slide = node?.children.item(nextPage);
        if (!node || !slide) return;
        node.scrollTo({
            left: node.scrollLeft + slide.getBoundingClientRect().left - node.getBoundingClientRect().left,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
    };
    const slideClass = "relative w-full min-w-0 shrink-0 snap-start snap-always overflow-clip";
    // Keep the snap areas in flow while only the selected panel sets the carousel height.
    const slideContentClass = (index: number) => index === page ? "pb-1" : "absolute inset-x-0 top-0 pb-1";

    return <section aria-label="수익률과 종목별 가격 비교" className="mt-3 border-t border-neutral-200 dark:border-surface-dark-border">
        <div className="flex min-h-11 items-center justify-between gap-2">
            <span className="text-base font-semibold">{page === 0 ? "요약" : "종목별 상세"}</span>
            <div className="flex items-center gap-1">
                <button type="button" onClick={onCopy} aria-label={`${item.name} 종목 리스트 복사`} title="종목 복사" className={`${CONTROL_ICON_BUTTON_CLS} gap-1.5 px-2 text-sm font-semibold`}><Copy size={16} aria-hidden="true" /><span className="hidden min-[400px]:inline">종목 복사</span></button>
                <span aria-live="polite" className="min-w-8 text-center text-xs tabular-nums text-neutral-600 dark:text-neutral-300">{page + 1} / {pageCount}</span>
                <button type="button" onClick={() => showPage(page - 1)} disabled={page <= 0} aria-label="이전 상세 페이지" className={CONTROL_ICON_BUTTON_CLS}><ChevronLeft size={18} aria-hidden="true" /></button>
                <button type="button" onClick={() => showPage(page + 1)} disabled={page >= pageCount - 1} aria-label="다음 상세 페이지" className={CONTROL_ICON_BUTTON_CLS}><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
        </div>
        <div ref={scroller} aria-label="가상 ETF 요약과 상세 페이지" tabIndex={0} className="flex min-w-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
            <section aria-label="가상 ETF 요약" aria-hidden={page !== 0} className={slideClass}>
                <div className={slideContentClass(0)}>
                    <div className="grid grid-cols-2 gap-x-3 py-3 md:py-4">
                        <div><span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">기대 수익률 · PER</span><span className={`block break-words font-bold leading-tight tabular-nums ${expected.percent === null ? "text-sm" : "text-2xl min-[360px]:text-3xl md:text-4xl"}`}>{prices ? showPercent(expected.percent) : "조회 중…"}</span></div>
                        <div><span className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">실제 수익률 · 생성 후</span><span className={`block break-words font-bold leading-tight tabular-nums ${sinceCreation.percent === null ? "text-sm" : "text-2xl min-[360px]:text-3xl md:text-4xl"} ${actualTone}`}>{prices ? showPercent(sinceCreation.percent) : "조회 중…"}</span></div>
                    </div>
                    <dl aria-label="전략별 기대 수익률" className="mb-2 grid grid-cols-4 gap-x-1 text-sm tabular-nums md:mb-3 md:text-base">
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
                        <h3 className="font-semibold">구성 종목</h3>
                        <span className="text-xs tabular-nums text-neutral-600 dark:text-neutral-300">
                            {holdings.length}종목{holdings.length > 0 && ` · 각 ${(100 / holdings.length).toFixed(1)}%`}
                        </span>
                    </div>
                    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3 md:gap-y-3">
                        {holdings.map(holding => {
                            const ticker = balanceTickerKey(holding.ticker, market === "US");
                            const held = portfolio?.held?.has(ticker);
                            const trading = portfolio?.trading?.get(ticker);
                            return <li key={holding.ticker} className="flex min-w-0 items-center justify-between gap-1.5 text-base leading-snug md:text-lg">
                                <span title={holding.ticker} className="min-w-0 break-words">{holding.name}<span className="sr-only"> {holding.ticker}</span></span>
                                {(held || trading) && <span className="inline-flex shrink-0 items-center gap-1">
                                    {held && <span role="img" aria-label="보유 중" title="보유 중" className="text-neutral-600 dark:text-neutral-300"><Wallet size={15} aria-hidden="true" /></span>}
                                    {trading && <TradingDirectionIcon trading={trading} />}
                                </span>}
                            </li>;
                        })}
                    </ul>
                    {portfolioMissing && <Link href={`/balance?country=${market.toLowerCase()}`} className={`inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}>대표 포트폴리오 지정하기</Link>}
                    {portfolio?.failed && <button type="button" onClick={onRetryPortfolio} className={`service-button-quiet min-h-11 text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}>포트폴리오 상태 다시 조회</button>}
                </div>
            </section>
            {detailPages.map((rows, index) => <section key={index} aria-label={`종목 상세 ${index + 1}페이지`} aria-hidden={page !== index + 1} className={slideClass}>
                <div className={slideContentClass(index + 1)}>
                    <HoldingPriceTable rows={rows} market={market} loading={!prices} />
                </div>
            </section>)}
        </div>
        <div className="mt-1 flex flex-wrap items-start gap-x-4">
            <details className="group text-sm text-neutral-700 open:w-full dark:text-neutral-300">
                <summary className="service-button-quiet flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 font-medium"><ChevronDown size={16} aria-hidden="true" className="group-open:rotate-180" />수익률 계산 기준</summary>
                <p className="max-w-prose pb-2">기대 수익률은 분석 모델의 평가액을 현재가와 비교한 추정치입니다. 실제 수익률은 ETF 생성일 종가부터 현재가까지의 변화이며, 배당·환율·거래비용은 반영하지 않습니다.</p>
            </details>
            {hasMissingPrices && <button type="button" onClick={onRetry} className={`service-button-quiet min-h-11 text-sm font-semibold text-brand-ink ${CONTROL_FOCUS_CLS}`}>누락된 자료 다시 조회</button>}
        </div>
    </section>;
}

function TradingDirectionIcon({ trading }: { trading: PortfolioTradingStatus }) {
    const sell = trading.side === "sell";
    const description = `자동${sell ? "매도" : "매수"} 중 · ${trading.groupName}`;
    const Direction = sell ? ArrowDownRight : ArrowUpRight;
    return <span role="img" aria-label={description} title={description} className={`inline-flex items-center ${sell ? "text-rose-700 dark:text-rose-400" : "text-brand-ink"}`}>
        <Bot size={15} aria-hidden="true" /><Direction size={11} aria-hidden="true" />
    </span>;
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
