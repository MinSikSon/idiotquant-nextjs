"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Heart, Loader2 } from "lucide-react";
import ResultShare from "@/components/result-share";
import { screenerSnapshot } from "@/lib/share/builders";
import { PageHeader, PAGE_WIDTH, PAGE_PRIMARY_ACTION_CLS, PAGE_ACTION_CLS } from "@/components/pageHeader";
import { ComparisonCheckbox } from "@/components/comparison-checkbox";
import { analysisHref, comparisonHref, toggleComparisonSelection } from "@/lib/investmentFlow";
import { HOME_STOCK_FILTERS, formatHomeMarketCap, homeFilterFromParams, homeResultsHref, type HomeStockPreview } from "@/lib/utils/homeStockPreview";

const metric = (value: number, digits: number) => Number.isFinite(value) && value > 0 ? value.toLocaleString("ko-KR", { maximumFractionDigits: digits }) : "—";
const columns = "grid grid-cols-[minmax(0,1fr)_52px_52px_16px] items-center gap-3 px-3 sm:px-5";

export default function GuestDiscovery() {
    const params = useSearchParams();
    const query = params.toString();
    const returnPath = `/screener${query ? `?${query}` : ""}`;
    const country = params.get("country") === "US" ? "US" : "KR";
    const filter = homeFilterFromParams(params);
    const selectedFilter = HOME_STOCK_FILTERS.find(item => item.id === filter)!;
    const [snapshot, setSnapshot] = useState<{ country: string; data: HomeStockPreview } | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [compareMode, setCompareMode] = useState(false);
    const [selection, setSelection] = useState<{ key: string; tickers: string[] }>({ key: "", tickers: [] });
    const key = `${country}:${filter}`;
    const selected = selection.key === key ? selection.tickers : [];
    const data = snapshot?.country === country ? snapshot.data : null;
    const items = data?.groups[filter] ?? [];
    const failed = failure === country;
    const loading = !data && !failed;
    const loginHref = `/login?callbackUrl=${encodeURIComponent(returnPath)}`;
    const scanDate = data?.scanDate;
    const dateLabel = scanDate ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}` : "";
    const toggle = (ticker: string) => setSelection(current => ({ key, tickers: toggleComparisonSelection(current.key === key ? current.tickers : [], ticker, 4) }));

    useEffect(() => {
        const controller = new AbortController();
        fetch(`/api/public/home-stocks?country=${country}&view=discovery`, { signal: controller.signal, cache: attempt ? "reload" : "default" })
            .then(async response => {
                const result = await response.json();
                if (!response.ok || !result.groups) throw new Error("unavailable");
                if (!controller.signal.aborted) { setSnapshot({ country, data: result }); setFailure(null); }
            }).catch(() => { if (!controller.signal.aborted) setFailure(country); });
        return () => controller.abort();
    }, [country, attempt]);

    useEffect(() => {
        if (!data) return;
        try {
            const stored = JSON.parse(sessionStorage.getItem("screener:return-position") ?? "null");
            if (stored?.path !== returnPath) return;
            const frame = requestAnimationFrame(() => {
                try { sessionStorage.removeItem("screener:return-position"); } catch { /* 복귀는 계속한다. */ }
                window.scrollTo(0, Number(stored.y) || 0);
            });
            return () => cancelAnimationFrame(frame);
        } catch { /* 저장소를 사용할 수 없어도 조건은 URL에 남는다. */ }
    }, [data, returnPath]);

    const savePosition = () => {
        try { sessionStorage.setItem("screener:return-position", JSON.stringify({ path: returnPath, y: window.scrollY, count: 10 })); }
        catch { /* 분석의 복귀 링크에 조건은 남는다. */ }
    };

    return <div id="screener-page" className="min-h-screen bg-surface-canvas text-neutral-900 dark:bg-surface-dark-canvas dark:text-white">
        <PageHeader title="종목 발굴" mobileTitleInNavigation mobileCompact description="홈에서 살펴본 조건 그대로, 후보 종목을 이어서 확인하세요." actions={<ResultShare disabled={loading || !items.length} getSnapshot={() => screenerSnapshot(items, returnPath, scanDate ?? null, country, [selectedFilter.description])} />} />
        <div className={`${PAGE_WIDTH.data} py-4 sm:py-6`}>
            {params.get("filter") === "liked" ? <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700"><h2 className="flex items-center gap-2 font-semibold"><Heart size={17} />내 관심종목</h2><p className="my-3 text-sm">로그인하면 저장한 종목과 지난 조회 이후 변화를 확인할 수 있습니다.</p><Link href={loginHref} className={PAGE_PRIMARY_ACTION_CLS}>로그인하고 관심종목 보기</Link></section> : <>
                <nav aria-label="발굴 시장" className="discovery-filters mb-3">
                    {(["KR", "US"] as const).map(market => <Link key={market} href={homeResultsHref(filter, market)} scroll={false} aria-current={country === market ? "page" : undefined}>{market === "KR" ? "국내 주식" : "미국 주식"}</Link>)}
                </nav>
                <nav aria-label="발굴 미리보기 조건" className="discovery-filters mb-6">
                    {HOME_STOCK_FILTERS.map(item => <Link key={item.id} href={homeResultsHref(item.id, country)} scroll={false} aria-current={filter === item.id ? "page" : undefined}>{item.label}</Link>)}
                </nav>
                <section aria-label="선택 조건의 발굴 결과">
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-semibold">{selectedFilter.label} 종목 미리보기</h2><span className="text-xs text-neutral-600 dark:text-neutral-400">{dateLabel}</span></div>
                    <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-300">{selectedFilter.description}. {data && `조건 충족 ${data.counts[filter].toLocaleString()}개 중 상위 ${items.length}개를 표시합니다.`}</p>
                    {loading ? <p role="status" className="flex min-h-40 items-center justify-center gap-2 text-sm"><Loader2 size={18} className="animate-spin" />선택한 조건의 종목을 불러오는 중…</p>
                        : failed ? <div role="alert" className="py-8 text-sm"><p>종목을 불러오지 못했습니다.</p><button type="button" onClick={() => { setFailure(null); setAttempt(value => value + 1); }} className="min-h-11 underline">다시 불러오기</button></div>
                            : !items.length ? <p className="py-8 text-sm">선택한 조건에 맞는 종목이 없습니다. 다른 조건을 선택해 보세요.</p> : <>
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => { setCompareMode(value => !value); setSelection({ key, tickers: [] }); }} aria-pressed={compareMode} className={PAGE_ACTION_CLS}>{compareMode ? "선택 취소" : "비교할 종목 선택"}</button>
                                    {compareMode && <span role="status" className="text-sm">{selected.length}/4개 선택</span>}
                                    {selected.length > 0 && <Link href={comparisonHref(country, selected, scanDate || new Date().toLocaleDateString("sv-SE"))} className={PAGE_PRIMARY_ACTION_CLS}>선택한 {selected.length}개 비교</Link>}
                                </div>
                                <div className="overflow-hidden border-y border-neutral-200 dark:border-neutral-700">
                                    <div className={`${columns} min-h-10 bg-neutral-50 text-xs text-neutral-600 dark:text-neutral-400 dark:bg-surface-dark-card`}><span>종목 / 수집 주가</span><span className="text-right">{filter === "ncav" ? "NCAV %" : "PER 배"}</span><span className="text-right">PBR 배</span><span /></div>
                                    {items.map(item => <div key={item.ticker} className="flex items-center border-t border-neutral-200 dark:border-neutral-700">
                                        {compareMode && <span className="pl-3"><ComparisonCheckbox name={item.name} choice={{ selected: selected.includes(item.ticker), disabled: !selected.includes(item.ticker) && selected.length >= 4, toggle: () => toggle(item.ticker) }} /></span>}
                                        <Link href={analysisHref(item.ticker, returnPath)} onClick={savePosition} aria-label={`${item.name} 종목 분석`} className={`${columns} min-h-20 min-w-0 flex-1 py-3 hover:bg-neutral-50 dark:hover:bg-surface-dark-card`}>
                                            <div className="min-w-0"><p title={item.name} className="truncate text-sm font-semibold">{item.name}</p><p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400" title={`${item.ticker} · ${country === "US" ? "$" : "₩"}${metric(item.last_price, country === "US" ? 2 : 0)}${filter === "large_cap" ? ` · 시총 ${formatHomeMarketCap(item.market_cap, country)}` : ""}${item.scan_date !== scanDate ? ` · ${item.scan_date.slice(4, 6)}.${item.scan_date.slice(6, 8)} 수집` : ""}`}>
                                                {item.ticker} · {country === "US" ? "$" : "₩"}{metric(item.last_price, country === "US" ? 2 : 0)}
                                                {filter === "large_cap" && <> · 시총 {formatHomeMarketCap(item.market_cap, country)}</>}
                                                {item.scan_date !== scanDate && <> · {item.scan_date.slice(4, 6)}.{item.scan_date.slice(6, 8)} 수집</>}
                                            </p></div>
                                            <span className="text-right text-sm tabular-nums">{metric(filter === "ncav" ? item.ncav_ratio * 100 : item.per, filter === "ncav" ? 0 : 1)}</span><span className="text-right text-sm tabular-nums">{metric(item.pbr, 2)}</span><ArrowUpRight size={14} />
                                        </Link>
                                    </div>)}
                                </div>
                            </>}
                    <div className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-700"><p className="mb-3 text-sm">로그인하면 이 조건의 전체 목록과 상세 필터를 이용할 수 있습니다.</p><Link href={loginHref} className={PAGE_PRIMARY_ACTION_CLS}>로그인하고 전체 보기</Link></div>
                </section>
            </>}
        </div>
    </div>;
}
