"use client";

import React, { useState, useEffect, Suspense, useId, useMemo } from "react";
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
import { SearchGuide } from "./components/SearchGuide";
import { ModernTiltCard } from "./components/StockCard";

const all_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers, ...validCorpNameArray];

/**
 * [SearchContent] 
 * 하이드레이션 에러 방지를 위해 클라이언트 마운트 이후 렌더링을 제어합니다.
 */
function SearchContent() {
    const sectionId = useId(); // Blueprint 컴포넌트 ID 충돌 방지용 고유 식별자
    const router = useRouter();
    const searchParams = useSearchParams();
    const { onSearch, krOrUs, response, data, name, waitResponse } = useStockSearch();
    const krMarketHistory = useAppSelector(selectKrMarketHistory);
    
    // State 관리
    const [fixed, setFixed] = useState(false);
    const [isInitialVisit, setIsInitialVisit] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false); // 하이드레이션 가드

    // 1. 초기 마운트 체크 (SSR-Client 간 불일치 원천 차단)
    useEffect(() => {
        setHasMounted(true);
    }, []);

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

    // URL 파라미터 감시 및 검색 실행
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

    // 스크롤 감지 (클라이언트 전용 로직)
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 600) setFixed(true);
            else setFixed(false);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // 데이터 로딩 상태 계산
    const tickerFromUrl = searchParams.get("ticker");
    const isKrReady = data.kiChart.state === "fulfilled" || data.kiBS.state === "fulfilled";
    const isUsReady = data.usSearchInfo.state === "fulfilled" || data.finnhubData.state === "fulfilled";
    const hasAnyData = isKrReady || isUsReady;
    const isLoaded = tickerFromUrl === name && hasAnyData;
    const shouldShowLoading = waitResponse && !isLoaded;

    // 차트 데이터 가공
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

    // 하이드레이션 완료 전에는 빈 화면을 띄워 Mismatch 경고 차단
    if (!hasMounted) {
        return <div className="w-full min-h-screen !bg-gray-50 dark:!bg-zinc-950" />;
    }

    return (
        <div className="w-full min-h-screen !bg-gray-50 dark:!bg-zinc-950">
            {/* 검색바 영역 (스크롤 고정) */}
            <div 
                suppressHydrationWarning
                className={`z-40 w-full transition-all ${fixed ? "fixed top-0 shadow-md" : "relative"} bg-white dark:bg-zinc-900 dark:border-zinc-800`}
            >
                <SearchAutocomplete
                    placeHolder="🇰🇷 종목명 또는 🇺🇸 티커"
                    onSearchButton={handleSearch}
                    validCorpNameArray={all_tickers}
                />
                <div className="flex px-4 py-1 gap-1 overflow-x-auto no-scrollbar bg-white dark:bg-zinc-900 border-t dark:border-zinc-800">
                    {krMarketHistory.slice(-6).reverse().map((s, i) => (
                        <Tag
                            key={`${sectionId}-history-${i}`}
                            interactive
                            round
                            minimal
                            onClick={() => handleSearch(s)}
                            className="cursor-pointer dark:!text-white whitespace-nowrap"
                        >
                            {s}
                        </Tag>
                    ))}
                </div>
            </div>

            <main className="max-w-6xl mx-auto p-4 md:p-6">
                {/* 에러 메시지 알림 */}
                {error && (
                    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
                        <Callout 
                            intent={Intent.DANGER} 
                            icon="error" 
                            title="알림" 
                            id={`${sectionId}-error-callout`}
                        >
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
                                            code: tickerFromUrl || "", // 한국 주식 로고 대응을 위해 code 전달
                                            isUs: true, 
                                            name: name, 
                                            grade: getUsNcavGrade(data.finnhubData, data.usDetail), 
                                            fairValue: "$" + calculateUsNcavValue(data.finnhubData, data.usDetail), 
                                            undervaluedScore: calculateUsNcavRatio(data.finnhubData, data.usDetail), 
                                            per: data?.usDetail?.output?.perx ?? 0, 
                                            pbr: data?.usDetail?.output?.pbrx ?? 0 
                                        } : { 
                                            code: tickerFromUrl || "", // 한국 종목 코드
                                            isUs: false, 
                                            name: name, 
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