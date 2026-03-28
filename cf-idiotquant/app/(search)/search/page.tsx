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
import { Tag, Card, Elevation, Spinner, Callout, Intent } from "@blueprintjs/core";
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
            <div
                suppressHydrationWarning
                className={`z-40 w-full transition-all ${fixed ? "fixed top-0" : "relative shadow-md"} bg-white dark:bg-zinc-900 dark:border-zinc-800`}
            >
                <SearchAutocomplete
                    placeHolder="🇰🇷 종목명 또는 🇺🇸 티커"
                    onSearchButton={handleSearch}
                    validCorpNameArray={all_tickers}
                />

                {/* [수정] 인기 종목 및 검색 기록 UI */}
                <div className="flex flex-col border-t dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    {/* 실시간 인기 종목 (D1 데이터 활용) */}
                    {popularStocks.length > 0 && (
                        <div className="flex items-center px-4 py-2 gap-2 overflow-x-auto no-scrollbar border-b dark:border-zinc-800/50 bg-white dark:bg-zinc-900">
                            {/* 라벨 고정 (왼쪽 그림자 효과를 주거나 고정하고 싶다면 sticky 사용) */}
                            <span className="text-[10px] font-black text-red-500 whitespace-nowrap italic flex-shrink-0 mr-1">
                                HOT TOP 10 🔥
                            </span>

                            <div className="flex items-center gap-2">
                                {popularStocks.map((s: any, i: number) => (
                                    <Tag
                                        key={`popular-${s.ticker}-${i}`}
                                        interactive
                                        round
                                        minimal
                                        intent={Intent.DANGER}
                                        onClick={() => handleSearch(s.ticker)}
                                        // whitespace-nowrap: 글자가 잘리지 않게 함
                                        // flex-shrink-0: 부모 컨테이너가 좁아져도 태그 크기가 줄어들지 않게 함
                                        className="cursor-pointer !text-[11px] font-bold whitespace-nowrap flex-shrink-0 px-3 py-1"
                                    >
                                        <span className="mr-1 text-[9px] opacity-70">{i + 1}.</span>
                                        {s.name}
                                    </Tag>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 가로 슬라이드 컨테이너 */}
                    <div className="flex items-center px-4 py-2 gap-2 overflow-x-auto no-scrollbar border-b dark:border-zinc-800/50 bg-white dark:bg-zinc-900">
                        <span className="text-[10px] font-black text-gray-500 whitespace-nowrap italic flex-shrink-0 mr-1">
                            RECENT
                        </span>
                        {/* 최근 6개 기록을 역순으로 표시 */}
                        {krMarketHistory.slice(-10).reverse().map((s, i) => (
                            <Tag
                                key={`${sectionId}-history-${i}`}
                                interactive
                                round
                                minimal
                                onClick={() => handleSearch(s)}
                                // whitespace-nowrap: 텍스트 줄바꿈 방지
                                // flex-shrink-0: 태그가 좁아지지 않게 고정
                                className="cursor-pointer dark:!text-white whitespace-nowrap flex-shrink-0 px-2.5 py-1 text-[11px] border-none bg-zinc-100 dark:bg-zinc-800"
                            >
                                {s}
                            </Tag>
                        ))}

                        {/* 기록이 없을 때 빈 공간 유지용 (선택 사항) */}
                        {krMarketHistory.length === 0 && (
                            <span className="text-[10px] text-zinc-300 italic">No history</span>
                        )}
                    </div>
                </div>
            </div>

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
                                            ticker: (corpCodeJson as any)[name].stock_code ?? "",
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

                            <StockHeader data={data} isUs={krOrUs === "US"} isFixed={fixed} />
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