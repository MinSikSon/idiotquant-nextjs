"use client";

import React, { useState, useEffect, Suspense, useId, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/lib/hooks"; // dispatch 추가
import { useStockSearch } from "./hooks/useStockSearch";
import { StockHeader } from "./components/StockHeader";
import { ValuationSection } from "./components/ValuationSection";
import { FinancialTables } from "./components/FinancialTables";
import FinnhubTable from "./table";
import SearchAutocomplete from "@/components/searchAutoComplete";
import { selectKrMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice"; // reqGetSearchLog 추가
import { Tag, Card, Elevation, Spinner, Callout, Intent, Icon } from "@blueprintjs/core";
import validCorpNameArray from "@/public/data/validCorpNameArray.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";
import { MdTableTemplate } from "./components/MdTableTemplate";
import { StockMetrics } from "./components/StockMetrics";
import { calculateKrNcavRatio, calculateKrNcavValue, calculateUsNcavRatio, calculateUsNcavValue, getKrNcavGrade, getUsNcavGrade } from "./utils/financeCalc";
import { SearchGuide } from "./components/SearchGuide";
import { ModernTiltCard } from "./components/StockCard";
import { reqGetSearchLog, selectPopularStocks } from "@/lib/features/searchLog/searchLogSlice";
import corpCodeJson from "@/public/data/validCorpCode.json";
import { IconNames } from "@blueprintjs/icons";

const all_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers, ...validCorpNameArray];

function SearchContent() {
    const sectionId = useId();
    const router = useRouter();
    const dispatch = useAppDispatch(); // dispatch 초기화
    const searchParams = useSearchParams();
    const { onSearch, krOrUs, response, data, name, waitResponse } = useStockSearch();

    // Redux State
    const krMarketHistory = useAppSelector(selectKrMarketHistory);
    // [추가] 슬라이스에 정의하신 인기 종목 상태를 가져옵니다. (state 명칭은 slice 정의에 맞춰 확인 필요)
    const popularStocks = useAppSelector(selectPopularStocks) || [];

    const [fixed, setFixed] = useState(false);
    const [isInitialVisit, setIsInitialVisit] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    // 1. 초기 마운트 시 데이터 Fetch
    useEffect(() => {
        setHasMounted(true);
        // [추가] 페이지 진입 시 D1으로부터 카운팅된 인기 종목 정보를 가져옵니다.
        dispatch(reqGetSearchLog("10"));
    }, [dispatch]);

    const isValidTicker = (ticker: string) => {
        return all_tickers.some(t => t.toLowerCase() === ticker.toLowerCase());
    };

    const handleSearch = (stockName: string) => {
        if (!stockName) return;
        if (!isValidTicker(stockName)) {
            setError(`'${stockName}'은(는) 목록에 없는 종목입니다.`);
            setTimeout(() => setError(null), 3000);
            return;
        }
        setError(null);
        setIsInitialVisit(false);
        router.push(`/search?ticker=${encodeURIComponent(stockName)}`);
    };

    useEffect(() => {
        const tickerFromUrl = searchParams.get("ticker");
        if (tickerFromUrl) {
            if (isValidTicker(tickerFromUrl)) {
                setIsInitialVisit(false);
                setError(null);
                if (tickerFromUrl !== name) {
                    onSearch(tickerFromUrl);
                }
            }
        }
    }, [searchParams, name, onSearch]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 600) setFixed(true);
            else setFixed(false);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const tickerFromUrl = searchParams.get("ticker");
    const isKrReady = data.kiChart.state === "fulfilled" || data.kiBS.state === "fulfilled";
    const isUsReady = data.usSearchInfo.state === "fulfilled" || data.finnhubData.state === "fulfilled";
    const hasAnyData = isKrReady || isUsReady;
    const isLoaded = tickerFromUrl === name && hasAnyData;
    const shouldShowLoading = waitResponse && !isLoaded;

    const chartConfig = useMemo(() => {
        if (krOrUs === "US") {
            return {
                data: data.usDaily?.output2?.map((i: any) => Number(i.clos)).reverse() || [],
                categories: data.usDaily?.output2?.map((i: any) => i.xymd).reverse() || [],
                color: "#818cf8"
            };
        }
        return {
            data: data.kiChart?.output2?.map((i: any) => Number(i.stck_clpr)).reverse() || [],
            categories: data.kiChart?.output2?.map((i: any) => i.stck_bsop_date).reverse() || [],
            color: "#6366f1"
        };
    }, [krOrUs, data]);

    if (!hasMounted) {
        return <div className="w-full min-h-screen !bg-gray-50 dark:!bg-zinc-950" />;
    }

    return (
        <div className="w-full min-h-screen !bg-gray-50 dark:!bg-zinc-950">
            <header
                suppressHydrationWarning
                className={`z-50 w-full transition-all duration-300 ${fixed
                        ? "fixed top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg border-b dark:border-zinc-800 shadow-sm"
                        : "relative bg-white dark:bg-zinc-900 border-b dark:border-zinc-800"
                    }`}
            >
                <div className="max-w-6xl mx-auto overflow-hidden">
                    {/* 검색창 섹션 */}
                    <div className="p-3 md:p-4">
                        <SearchAutocomplete
                            placeHolder="🇰🇷 종목명 또는 🇺🇸 티커"
                            onSearchButton={handleSearch}
                            validCorpNameArray={all_tickers}
                        />
                    </div>

                    {/* 실시간 인기 & 최근 검색 통합 바 */}
                    <div className="flex flex-col gap-1 pb-1 px-4">
                        {/* 실시간 인기 종목 */}
                        {popularStocks.length > 0 && (
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    <span className="text-[10px] font-black text-red-500 italic whitespace-nowrap">HOT 10</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {popularStocks.map((s: any, i: number) => (
                                        <button
                                            key={`pop-${s.ticker}-${i}`}
                                            onClick={() => handleSearch(s.ticker)}
                                            className="flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 text-[11px] font-bold text-red-600 dark:text-red-400 active:scale-95 transition-all"
                                        >
                                            <span className="text-[9px] opacity-60 font-black">{i + 1}</span>
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 최근 검색 기록 */}
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <Icon icon={IconNames.HISTORY} size={10} className="text-zinc-400" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Recent</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {krMarketHistory.slice(-8).reverse().map((s, i) => (
                                    <button
                                        key={`${sectionId}-history-${i}`}
                                        onClick={() => handleSearch(s)}
                                        className="whitespace-nowrap px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors active:opacity-60"
                                    >
                                        {s}
                                    </button>
                                ))}
                                {krMarketHistory.length === 0 && (
                                    <span className="text-[10px] text-zinc-300 dark:text-zinc-700 italic font-medium">검색 기록이 없습니다.</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 md:p-6">
                {error && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
                        <Callout intent={Intent.DANGER} icon="error" title="알림" id={`${sectionId}-error-callout`}>
                            {error}
                        </Callout>
                    </div>
                )}

                {isInitialVisit && !hasAnyData && !tickerFromUrl ? (
                    <SearchGuide />
                ) : (
                    <>
                        {shouldShowLoading && (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Spinner size={40} />
                                <p className="mt-4 text-sm text-gray-500 animate-pulse">데이터 분석 중...</p>
                            </div>
                        )}

                        <div className={!isLoaded ? "hidden" : "block animate-in fade-in duration-700"}>
                            <div className="flex justify-center mb-10">
                                <ModernTiltCard
                                    stock={krOrUs === "US" ?
                                        {
                                            code: tickerFromUrl || "",
                                            isUs: true,
                                            name: name,
                                            ticker: name,
                                            grade: getUsNcavGrade(data.finnhubData, data.usDetail),
                                            fairValue: "$" + calculateUsNcavValue(data.finnhubData, data.usDetail),
                                            undervaluedScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                                            per: data?.usDetail?.output?.perx ?? 0,
                                            pbr: data?.usDetail?.output?.pbrx ?? 0
                                        } : {
                                            code: tickerFromUrl || "",
                                            isUs: false,
                                            name: name,
                                            ticker: (corpCodeJson as any)?.[name]?.stock_code ?? "",
                                            grade: getKrNcavGrade(data.kiBS, data.kiChart),
                                            fairValue: "₩" + calculateKrNcavValue(data.kiBS, data.kiChart),
                                            undervaluedScore: calculateKrNcavRatio(data.kiBS, data.kiChart),
                                            per: data?.kiPrice?.output?.per ?? 0,
                                            pbr: data?.kiPrice?.output?.pbr ?? 0
                                        }
                                    }
                                    chartConfig={chartConfig}
                                />
                            </div>

                            <StockHeader data={data} isUs={krOrUs === "US"} isFixed={fixed} all_tickers={all_tickers} handleSearch={handleSearch} />
                            <StockMetrics data={data} isUs={krOrUs === "US"} />
                            <ValuationSection data={data} isUs={krOrUs === "US"} />

                            {krOrUs === "KR" ? (
                                <FinancialTables kiBS={data.kiBS} kiIS={data.kiIS} />
                            ) : (
                                <FinnhubTable data={data.finnhubData.data} />
                            )}

                            {response && (
                                <Card
                                    elevation={Elevation.TWO}
                                    className="mt-8 border-t-4 !border-blue-500 dark:!bg-zinc-900"
                                    id={`${sectionId}-ai-analysis`}
                                >
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <MdTableTemplate content={response} />
                                    </div>
                                </Card>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={
            <div className="w-full min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950">
                <Spinner size={50} intent={Intent.PRIMARY} />
                <p className="mt-4 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                    Initializing Engine...
                </p>
            </div>
        }>
            <SearchContent />
        </Suspense>
    );
}