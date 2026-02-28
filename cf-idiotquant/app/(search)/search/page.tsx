"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppSelector } from "@/lib/hooks";
import { useStockSearch } from "./hooks/useStockSearch";
import { StockHeader } from "./components/StockHeader";
import { ValuationSection } from "./components/ValuationSection";
import { FinancialTables } from "./components/FinancialTables";
import FinnhubTable from "./table";
import SearchAutocomplete from "@/components/searchAutoComplete";
import { selectKrMarketHistory } from "@/lib/features/searchHistory/searchHistorySlice";
import { Tag, Card, Elevation, Spinner, Callout, Intent } from "@blueprintjs/core";
import validCorpNameArray from "@/public/data/validCorpNameArray.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";
import { MdTableTemplate } from "./components/MdTableTemplate";
import { StockMetrics } from "./components/StockMetrics";
import { calculateKrNcavRatio, calculateKrNcavValue, calculateUsNcavRatio, calculateUsNcavValue, getKrNcavGrade, getUsNcavGrade } from "./utils/financeCalc";
import { StockCard } from "./components/StockCard";
import { SearchGuide } from "./components/SearchGuide";

const all_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers, ...validCorpNameArray];

export default function SearchPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { onSearch, krOrUs, response, data, name, waitResponse } = useStockSearch();
    const krMarketHistory = useAppSelector(selectKrMarketHistory);
    const [fixed, setFixed] = useState(false);
    const [isInitialVisit, setIsInitialVisit] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        const handleScroll = () => setFixed(window.scrollY > 330);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // [데이터 상태 체크]
    const tickerFromUrl = searchParams.get("ticker");
    const isKrReady = data.kiChart.state === "fulfilled" || data.kiBS.state === "fulfilled";
    const isUsReady = data.usSearchInfo.state === "fulfilled" || data.finnhubData.state === "fulfilled";
    const hasAnyData = isKrReady || isUsReady;

    // [로딩 표시 로직 수정]
    // 1. URL의 티커와 로드된 데이터의 이름이 일치하면 로딩을 끕니다.
    // 2. 혹은 데이터가 하나라도 완료 상태(fulfilled)가 되면 로딩 표시를 최소화합니다.
    const isLoaded = tickerFromUrl === name && hasAnyData;
    const shouldShowLoading = waitResponse && !isLoaded;

    return (
        <div className="w-full min-h-screen !bg-gray-50 dark:!bg-zinc-950">
            <div className={`z-40 w-full transition-all ${fixed ? "fixed top-0" : "relative"} bg-white dark:bg-zinc-900 dark:border-zinc-800`}>
                <SearchAutocomplete
                    placeHolder="🇰🇷 종목명 또는 🇺🇸 티커"
                    onSearchButton={handleSearch}
                    validCorpNameArray={all_tickers}
                />
                <div className="flex px-4 py-1 gap-1 overflow-x-auto no-scrollbar bg-white dark:!text-white dark:bg-zinc-900 border-t dark:border-zinc-800">
                    {krMarketHistory.slice(-6).reverse().map((s, i) => (
                        <Tag
                            key={i}
                            interactive
                            round
                            minimal
                            onClick={() => handleSearch(s)}
                            className="cursor-pointer dark:!text-white"
                        >
                            {s}
                        </Tag>
                    ))}
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-4 md:p-6">
                {error && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
                        <Callout intent={Intent.DANGER} icon="error" title="알림">
                            {error}
                        </Callout>
                    </div>
                )}

                {isInitialVisit && !hasAnyData && !tickerFromUrl ? (
                    <SearchGuide />
                ) : (
                    <>
                        {/* 로딩 바: 데이터가 로드되지 않았거나 waitResponse가 떠있을 때만 표시 */}
                        {shouldShowLoading && (
                            <div className="flex flex-col items-center justify-center py-10">
                                <Spinner size={40} />
                                <p className="mt-4 text-sm text-gray-500 animate-pulse">데이터 분석 중...</p>
                            </div>
                        )}

                        {/* 데이터가 매칭되었을 때만 컨텐츠 노출 */}
                        <div className={!isLoaded ? "hidden" : "block"}>
                            <div className="flex justify-center mb-6">
                                <StockCard stock={
                                    krOrUs === "US" ?
                                        { isUs: true, id: 1, name: name, grade: getUsNcavGrade(data.finnhubData, data.usDetail), fairValue: "$" + calculateUsNcavValue(data.finnhubData, data.usDetail), undervaluedScore: calculateUsNcavRatio(data.finnhubData, data.usDetail), per: data?.usDetail?.output?.perx ?? 0, pbr: data?.usDetail?.output?.pbrx ?? 0 }
                                        :
                                        { isUs: false, id: 1, name: name, grade: getKrNcavGrade(data.kiBS, data.kiChart), fairValue: "₩" + calculateKrNcavValue(data.kiBS, data.kiChart), undervaluedScore: calculateKrNcavRatio(data.kiBS, data.kiChart), per: data?.kiPrice?.output?.per ?? 0, pbr: data?.kiPrice?.output?.pbr ?? 0 }
                                } />
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
                                <Card elevation={Elevation.TWO} className="mt-8 border-t-4 !border-blue-500 dark:!bg-zinc-900">
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