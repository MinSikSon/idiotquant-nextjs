"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSession, useSession } from "next-auth/react";
import { ArrowRight, Lock, Mail, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PageSearch } from "@/components/page-search";
import { useStockSearchModal } from "@/components/stock-search-provider";
import { apiRequest } from "@/lib/features/apiRequest";
import { getMyLikes, toggleLike } from "@/lib/features/stockLikes/stockLikesAPI";
import type { LikedStockItem } from "@/lib/features/stockLikes/stockLikesSlice";
import { formatBillingAmount } from "@/lib/utils/billingFormat";
import { loadStaticStockData } from "@/lib/utils/stockSearchData";
import {
    newsletterUrl, parseStockKey, scanPath, scanSnapshot, stockKey,
    type NewsletterStock, type ValuationSnapshot,
} from "@/lib/utils/newsletterValuation";
import { HistoricalComparison, PriceAxis } from "./ValuationCharts";
import { sampleSnapshots, sampleStocks } from "./historySample";
import styles from "./newsletter.module.css";

const draftKey = "idiotquant-newsletter-selection";
const stages = ["stocks", "pick", "result", "paywall", "history", "example"];
type Billing = { offer?: { amount: number; currency: string }; alerts?: { status: string } | null };
type StockKey = NonNullable<ReturnType<typeof parseStockKey>>;

function loginUrl(callback: string) {
    return `/login?callbackUrl=${encodeURIComponent(callback)}`;
}

function checkoutUrl(stock: StockKey) {
    return `/billing?newsletter=${encodeURIComponent(stockKey(stock))}`;
}

function readDraft(owner: string) {
    try {
        const draft = JSON.parse(sessionStorage.getItem(draftKey) ?? "{}");
        if ((draft.owner !== owner && draft.owner !== "guest") || !Array.isArray(draft.stocks)) return [];
        return draft.stocks.flatMap((item: NewsletterStock | null) =>
            item && parseStockKey(stockKey(item)) && typeof item.name === "string" ? [item] : []);
    } catch {
        return [];
    }
}

function fromLikes(data: LikedStockItem[]): NewsletterStock[] {
    return data.flatMap(item => {
        const key = parseStockKey(`${item.is_us ? "US" : "KR"}:${item.ticker.toUpperCase()}`);
        return key ? [{ ...key, name: item.stock_name || key.ticker }] : [];
    });
}

export default function NewsletterFlow({ checkoutEnabled, sampleEndDate }: { checkoutEnabled: boolean; sampleEndDate: string }) {
    const params = useSearchParams();
    const requestedStage = params.get("step") ?? "";
    const stage = stages.includes(requestedStage) ? requestedStage : "intro";
    const stock = parseStockKey(params.get("stock"));
    const selectedKey = stock ? stockKey(stock) : "";
    const { data: session, status } = useSession();
    const requiresLogin = stage !== "intro" && stage !== "example";
    const authenticated = status === "authenticated";
    const owner = session?.user?.id ?? "guest";
    const { openSearch } = useStockSearchModal();
    const [chosen, setChosen] = useState("");
    const [draft, setDraft] = useState<NewsletterStock[]>([]);
    const [likes, setLikes] = useState<NewsletterStock[]>([]);
    const [listError, setListError] = useState("");
    const [readyOwner, setReadyOwner] = useState("");
    const [error, setError] = useState("");
    const [working, setWorking] = useState<"search" | "save" | null>(null);
    const busy = useRef(false);
    const touch = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (requiresLogin && status === "unauthenticated") {
            window.location.replace(loginUrl(newsletterUrl(stage, parseStockKey(selectedKey) ?? undefined)));
        }
    }, [requiresLogin, status, stage, selectedKey]);

    useEffect(() => {
        if (status === "loading") return;
        let active = true;
        void (owner === "guest" ? Promise.resolve(null) : getMyLikes()).then(result => {
            if (!active) return;
            setLikes(Array.isArray(result?.data) ? fromLikes(result.data) : []);
            setListError(result?.success === false ? result.error : "");
            setDraft(readDraft(owner));
            setReadyOwner(owner);
        });
        return () => { active = false; };
    }, [owner, status]);

    const ready = status !== "loading" && readyOwner === owner;
    const items = ready ? [...new Map([...draft, ...likes].map(item => [stockKey(item), item])).values()] : [];
    const picked = items.find(item => stockKey(item) === chosen) ?? items[0];

    function saveDraft(next: NewsletterStock[]) {
        setDraft(next);
        try { sessionStorage.setItem(draftKey, JSON.stringify({ stocks: next, owner })); } catch { /* 화면 선택을 유지한다. */ }
    }

    function go(nextStage: string, nextStock = stock ?? undefined, replace = false) {
        setError("");
        const url = newsletterUrl(nextStage, nextStock);
        if (replace) window.history.replaceState(null, "", url);
        else window.history.pushState({ newsletterPrevious: stage }, "", url);
        window.scrollTo({ top: 0 });
        requestAnimationFrame(() => document.getElementById("newsletter-heading")?.focus({ preventScroll: true }));
    }

    function previous() {
        if (busy.current) return;
        const previousStage: Record<string, string> = {
            stocks: "intro", example: "intro", pick: "stocks", result: "pick", paywall: "result", history: "result",
        };
        const target = previousStage[stage];
        if (!target) return;
        if (window.history.state?.newsletterPrevious === target) {
            window.history.back();
            return;
        }
        go(target, target === "result" ? stock ?? undefined : undefined, true);
    }

    async function add(raw: string) {
        if (!ready || busy.current) return;
        busy.current = true;
        setWorking("search");
        setError("");
        try {
            const data = await loadStaticStockData();
            const value = raw.trim().toUpperCase();
            const korean = data.krStocks.find(item => item.symbol === value || item.koreanName === raw.trim());
            const match = korean ?? data.usStocks.find(item => item.symbol === value);
            const key = match && parseStockKey(`${korean ? "KR" : "US"}:${match.symbol}`);
            if (!key) { setError("검색 결과에서 상장 종목을 선택해 주세요."); return; }
            if (!items.some(item => stockKey(item) === stockKey(key))) {
                saveDraft([...draft, { ...key, name: match.koreanName || match.name || key.ticker }]);
            }
        } catch {
            setError("종목 목록을 불러오지 못했습니다. 다시 검색해 주세요.");
        } finally {
            busy.current = false;
            setWorking(null);
        }
    }

    async function registerStocks() {
        if (!ready || busy.current) return;
        if (!draft.length) { go("pick"); return; }
        setError("");
        setWorking("save");
        busy.current = true;
        try {
            const toSave = draft;
            const saveFailure = async (response: { status?: number; error?: string }, fallback: string) => {
                if (response.status === 401) {
                    const currentSession = await getSession({ broadcast: false });
                    if (!currentSession?.user) {
                        window.location.replace(loginUrl(newsletterUrl("stocks")));
                    } else {
                        setError("관심종목 저장 권한을 확인하지 못했습니다. 다시 시도해 주세요.");
                    }
                } else {
                    setError(response.error || fallback);
                }
                return false;
            };
            const persist = async () => {
                const response = await getMyLikes();
                if (response.success !== true || !Array.isArray(response.data)) {
                    return saveFailure(response, "관심종목을 확인하지 못했습니다.");
                }
                const existing = new Set(fromLikes(response.data).map(stockKey));
                for (const item of toSave) {
                    if (existing.has(stockKey(item))) continue;
                    const result = await toggleLike(item.ticker, item.name, item.market === "US");
                    if (result.success !== true || result.liked !== true) {
                        return saveFailure(result, "관심종목 저장 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
                    }
                }
                return true;
            };
            const saved = navigator.locks
                ? await navigator.locks.request(`newsletter-likes:${owner}`, persist)
                : await persist();
            if (!saved) return;
            setLikes([...new Map([...likes, ...toSave].map(item => [stockKey(item), item])).values()]);
            setListError("");
            saveDraft([]);
            go("pick");
        } catch {
            setError("관심종목을 저장하지 못했습니다. 다시 시도해 주세요.");
        } finally {
            busy.current = false;
            setWorking(null);
        }
    }

    const heading = (title: string) => <h1 id="newsletter-heading" tabIndex={-1}>{title}</h1>;
    const button = (label: string, onClick: () => void, disabled = false) =>
        <button type="button" className={styles.button} onClick={onClick} disabled={disabled}>{label}<ArrowRight size={17} aria-hidden /></button>;
    const actions = (...children: ReactNode[]) => <div className={styles.actions}>{children.map((child, index) => <div key={index} className="grid">{child}</div>)}</div>;
    const back = <button type="button" className={styles.secondary} onClick={previous}>이전</button>;
    const errorBlock = error && <p role="alert">{error}</p>;
    const stocksHref = newsletterUrl("stocks");
    const start = authenticated ? button("관심종목 선택하기", () => go("stocks"))
        : <Link className={styles.button} href={status === "loading" ? stocksHref : loginUrl(stocksHref)}>
            관심종목 선택하기 {status === "unauthenticated" &&
                <small className={styles.loginRequired}><Lock size={13} aria-hidden /> 로그인 필요</small>}
            <ArrowRight size={17} aria-hidden />
        </Link>;

    return <div className={styles.surface} onTouchStart={event => {
        const finger = event.touches[0];
        touch.current = event.touches.length === 1 && !((event.target as Element).closest("button, a, input, select, [data-no-swipe]"))
            ? { x: finger.clientX, y: finger.clientY } : null;
    }} onTouchCancel={() => { touch.current = null; }} onTouchEnd={event => {
        const start = touch.current;
        touch.current = null;
        const finger = event.changedTouches[0];
        if (start && finger && start.x - finger.clientX > 75 && Math.abs(start.y - finger.clientY) < 44) previous();
    }}>
        <div className={styles.shell}>
            <span className={styles.brand}>IdiotQuant</span>
            <div className={`${styles.body} ${stage === "history" ? styles.historyPage : styles.actionStep}`}>
                {stage === "intro" && <>
                    <div className={styles.paywallHeading}>
                        <Image src="/images/onboarding/newsletter-coyote.webp" width={404} height={440} alt="" loading="eager" unoptimized />
                        {heading("좋아하는 종목, 매일 아침 읽는 적정가")}
                    </div>
                    <p className={styles.lede}>관심종목의 가격을 전략별 적정가와 비교해 보세요. 예시에서 6개 종목의 과거 적정가를 먼저 볼 수 있어요.</p>
                    <div className={`${styles.actions} ${styles.stackedActions}`}>
                        <button type="button" className={styles.secondary} onClick={() => go("example")}>예시 결과 미리보기</button>
                        {start}
                    </div>
                </>}
                {stage === "example" && <>
                    <SampleComparison endDate={sampleEndDate} />
                    {actions(start)}
                </>}
                {requiresLogin && !authenticated && <p role="status">로그인 상태를 확인하는 중입니다.</p>}
                {requiresLogin && authenticated && <>
                    {stage === "stocks" && <>
                        {heading("관심종목을 등록해 주세요")}
                        <p className={styles.lede}>종목명이나 티커로 찾을 수 있어요. 다음 단계로 가면 선택한 종목을 계정에 저장합니다.</p>
                        <div className={styles.stack}>
                            <PageSearch label="관심종목 검색" onSelect={add} disabled={!ready || !!working} />
                            <button type="button" className={styles.secondary} onClick={openSearch} disabled={!ready || !!working}>
                                <Search size={17} aria-hidden />{working === "search" ? "종목 확인 중" : "종목 검색"}
                            </button>
                            {!ready && <p role="status">관심종목을 불러오는 중입니다.</p>}
                            {listError && !error && <p role="status">{listError}</p>}
                            {items.length > 0 && <ul className={styles.list}>{items.map(item => {
                                const key = stockKey(item);
                                const saved = likes.some(like => stockKey(like) === key);
                                return <li key={key}><span><strong>{item.name}</strong><small>{item.market} · {item.ticker}</small></span>
                                    {saved ? <small>저장됨</small> : <button type="button" aria-label={`${item.name} 선택 해제`} disabled={working === "save"}
                                        onClick={() => saveDraft(draft.filter(value => stockKey(value) !== key))}><X size={17} aria-hidden /></button>}
                                </li>;
                            })}</ul>}
                            {errorBlock}
                        </div>
                        {actions(back, button(working === "save" ? "저장 중 (1/2)" : "다음 (1/2)",
                            () => void registerStocks(), !items.length || !!working))}
                    </>}
                    {stage === "pick" && <>
                        {heading("먼저 분석할 종목을 골라주세요")}
                        <p className={styles.lede}>지금 저장된 스캔 가격과 전략별 적정가를 비교합니다.</p>
                        <div className={styles.stack}>
                            {!ready && <p role="status">관심종목을 불러오는 중입니다.</p>}
                            {ready && !items.length && <p>이전 단계에서 종목을 추가해 주세요.</p>}
                            {items.length > 0 && <ul className={styles.list}>{items.map(item => {
                                const key = stockKey(item);
                                return <li key={key}><label className={styles.pick}>
                                    <input type="radio" name="newsletter-focus" checked={picked && stockKey(picked) === key}
                                        onChange={() => setChosen(key)} />
                                    <span><strong>{item.name}</strong><small>{item.market} · {item.ticker}</small></span>
                                </label></li>;
                            })}</ul>}
                        </div>
                        {actions(back, button("다음 (2/2)", () => picked && go("result", picked), !picked))}
                    </>}
                    {stage === "result" && stock && <FreeResult key={selectedKey} stock={stock}
                        name={items.find(item => stockKey(item) === selectedKey)?.name}
                        checkoutEnabled={checkoutEnabled} />}
                    {stage === "paywall" && stock && <Paywall key={`${owner}:${selectedKey}`} checkoutEnabled={checkoutEnabled}
                        endDate={sampleEndDate} stock={stock} />}
                    {stage === "history" && stock && <History key={`${owner}:${selectedKey}`} stock={stock}
                        onPaywall={() => go("paywall", stock)} />}
                    {["result", "paywall", "history"].includes(stage) && !stock && <>
                        {heading("비교할 종목을 골라주세요")}
                        {actions(button("관심종목 선택하기", () => go("stocks")))}
                    </>}
                </>}
            </div>
        </div>
    </div>;
}

function useRequest<T>(path: string | null, transform: (data: unknown) => T) {
    const [revision, setRevision] = useState(0);
    const [result, setResult] = useState<{ key: string; revision: number; data?: T; error?: string; forbidden?: boolean; partial?: boolean }>();
    useEffect(() => {
        if (!path) return;
        let active = true;
        void apiRequest(path).then(response => {
            if (!active) return;
            if (response.success !== true) {
                setResult({ key: path, revision, error: response.error || "데이터를 불러오지 못했습니다.",
                    forbidden: ["PASS_REQUIRED", "SIGN_IN_REQUIRED"].includes(response.code) });
                return;
            }
            setResult({ key: path, revision, data: transform(response.data), partial: response.partial === true });
        });
        return () => { active = false; };
    }, [path, revision, transform]);
    const current = result?.key === path && result?.revision === revision ? result : undefined;
    return { ...current, loading: Boolean(path && !current), retry: () => setRevision(count => count + 1) };
}

const scanRows = (data: unknown): Record<string, unknown>[] => Array.isArray(data) ? data : [];
const historyRows = (data: unknown): ValuationSnapshot[] => Array.isArray(data) ? data : [];
const billingData = (data: unknown) => data as Billing;

function FreeResult({ stock, name, checkoutEnabled }: {
    stock: StockKey; name?: string; checkoutEnabled: boolean;
}) {
    const request = useRequest(scanPath(stock, "latest"), scanRows);
    const access = useRequest("/billing", billingData);
    const snapshot = request.data?.[0] && scanSnapshot(request.data[0], stock);
    const active = access.data?.alerts?.status === "active";
    return <>
        <h1 id="newsletter-heading" tabIndex={-1}>{snapshot?.name || name || stock.ticker} 현재 적정가</h1>
        <p className={styles.lede}>최근 저장된 스캔 기준</p>
        <div className={styles.stack}>
            {request.loading && <p role="status">분석 결과를 불러오는 중입니다.</p>}
            {request.error && <RequestError message={request.error} retry={request.retry} />}
            {snapshot && <PriceAxis snapshot={snapshot} market={stock.market} />}
            {request.data && !snapshot && <p>이 종목에 저장된 스캔 가격이 없습니다.</p>}
        </div>
        {!request.loading && !request.error && <div className={styles.actions}>
            {access.loading ? <p role="status">이용권을 확인하는 중입니다.</p>
                : active || checkoutEnabled ? <Link className={styles.button}
                    href={active ? newsletterUrl("history", stock) : checkoutUrl(stock)}>
                    과거 적정가 보기<ArrowRight size={17} aria-hidden />
                </Link> : <p role="status">현재 새 이용권 구매를 받지 않고 있습니다.</p>}
        </div>}
    </>;
}

function ComparisonHeading({ name, detail }: { name: string; detail: string }) {
    return <div className={styles.historyHeading}>
        <Image className={styles.historyCoyote} src="/images/onboarding/newsletter-history-coyote.webp"
            width={360} height={360} alt="" loading="eager" unoptimized />
        <div>
            <h1 id="newsletter-heading" tabIndex={-1}>{name} 과거 적정가</h1>
            <p>{detail}</p>
        </div>
    </div>;
}

function SampleComparison({ endDate }: { endDate: string }) {
    const [selected, setSelected] = useState(sampleStocks[0]);
    const snapshots = sampleSnapshots(selected, endDate);
    return <div className={styles.historyComparison}>
        <ComparisonHeading name={selected.name} detail="가상 예시 데이터 · 최근 12개 분기" />
        <div className={styles.sampleStocks} role="group" aria-label="예시 종목">
            {sampleStocks.map(stock => <button key={stock.ticker} type="button" aria-pressed={stock === selected}
                onClick={() => setSelected(stock)}>{stock.name}</button>)}
        </div>
        <HistoricalComparison snapshots={snapshots} market={selected.market} sampleDate={endDate} />
    </div>;
}

function Paywall({ checkoutEnabled, endDate, stock }: {
    checkoutEnabled: boolean; endDate: string; stock: StockKey;
}) {
    const access = useRequest("/billing", billingData);
    const active = access.data?.alerts?.status === "active";
    const checkout = checkoutEnabled && !active;
    const label = `${access.data?.offer ? formatBillingAmount(access.data.offer) + " " : ""}테스트 결제 계속하기`;
    return <div className={`${styles.stack} ${styles.actionStep}`}>
        <SampleComparison endDate={endDate} />
        <ul className={styles.benefits}>
            <li><Lock size={17} aria-hidden /> 저장된 날짜별 주가와 전략별 적정가 기록</li>
            <li><Mail size={17} aria-hidden /> 지정된 테스트 계정에 매일 아침 관심종목 분석 이메일</li>
        </ul>
        {access.loading && <p role="status">이용권을 확인하는 중입니다.</p>}
        {access.error && <RequestError message={access.error} retry={access.retry} />}
        {checkout && <p className={styles.note}>30일 이용 · 1회 테스트 결제 · 실제 청구 없음 · 자동 갱신 없음</p>}
        {!access.loading && (active || checkout) && <div className={styles.actions}>
            <Link className={styles.button} href={active ? newsletterUrl("history", stock) : checkoutUrl(stock)}>
                {active ? "전체 과거 비교 열기" : label}<ArrowRight size={17} aria-hidden />
            </Link>
        </div>}
        {!active && !checkout && !access.loading && !access.error && <p role="status">현재 새 이용권 구매를 받지 않고 있습니다.</p>}
    </div>;
}

function History({ stock, onPaywall }: {
    stock: StockKey; onPaywall: () => void;
}) {
    const history = useRequest(`/newsletter-history?stock=${encodeURIComponent(stockKey(stock))}`, historyRows);
    const snapshots = history.data ?? [];
    return <>
        <ComparisonHeading name={snapshots.at(-1)?.name || stock.ticker} detail="저장된 스캔 기록" />
        <div className={styles.stack}>
            {history.loading && <p role="status">이용권과 과거 기록을 확인하는 중입니다.</p>}
            {history.forbidden ? <>
                <p>과거 적정가를 보려면 활성 이용권이 필요합니다.</p>
                <button type="button" className={styles.button} onClick={onPaywall}>이용권 보기<ArrowRight size={17} aria-hidden /></button>
            </> : history.error && <RequestError message={history.error} retry={history.retry} />}
            {history.partial && <RequestError message="일부 기간의 기록만 불러왔습니다." retry={history.retry} />}
            {history.data && !snapshots.length && <p>이 종목에 저장된 비교 기록이 없습니다.</p>}
            {snapshots.length > 0 && <HistoricalComparison snapshots={snapshots} market={stock.market} />}
        </div>
    </>;
}

function RequestError({ message, retry }: { message: string; retry: () => void }) {
    return <div role="alert"><p>{message}</p><button type="button" className={styles.secondary} onClick={retry}>다시 불러오기</button></div>;
}
