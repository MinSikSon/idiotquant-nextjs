"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
    CircleStackIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";

import {
    selectStockByTicker,
    updateStockDetail,
    setStockState
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
    selectStrategyNcavLatest,
    reqGetNcavLatest,
} from "@/lib/features/backtest/backtestSlice";

import { reqGetInquirePrice, reqGetBalanceSheet, reqGetIncomeStatement, reqGetInquireDailyItemChartPrice } from "@/lib/features/koreaInvestment/koreaInvestmentSlice";
import { reqGetQuotationsPriceDetail, reqGetQuotationsSearchInfo, reqGetOverseasPriceQuotationsDailyPrice } from "@/lib/features/koreaInvestmentUsMarket/koreaInvestmentUsMarketSlice";
import { reqGetFinnhubUsFinancialsReported } from "@/lib/features/finnhubUsMarket/finnhubUsMarketSlice";

import { getKrNcavGrade, calculateKrNcavRatio, getUsNcavGrade, calculateUsNcavRatio } from "@/components/utils/financeCalc";
import corpCodeJson from "@/public/data/validCorpCode.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";
import { StockCard } from "@/app/(search)/search/components/StockCard";
import { cn } from "@/lib/utils";

const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];
// 1. 페이지 사이즈를 10으로 변경
const PAGE_SIZE = 10;

/** 카드 데이터 패처 컴포넌트 */
const StockDataFetcher = ({ ticker, name, isSelected, onClick }: { ticker: string; name: string; isSelected: boolean; onClick?: () => void }) => {
    const dispatch = useAppDispatch();
    const isUs = useMemo(() => us_tickers.includes(ticker.toUpperCase()), [ticker]);
    const data = useAppSelector((state) => selectStockByTicker(state, ticker));

    useEffect(() => {
        if (data?.state === "fulfilled" || data?.state === "pending") return;
        const fetchData = async () => {
            dispatch(setStockState({ ticker, status: "pending" }));
            try {
                const upperTicker = ticker.toUpperCase();
                let payload: any = { ticker, name, isUs };
                if (isUs) {
                    const [finnhubRes, usDetailRes, usSearchRes, usDailyRes] = await Promise.all([
                        dispatch(reqGetFinnhubUsFinancialsReported(upperTicker)).unwrap(),
                        dispatch(reqGetQuotationsPriceDetail({ PDNO: upperTicker })).unwrap(),
                        dispatch(reqGetQuotationsSearchInfo({ PDNO: upperTicker })).unwrap(),
                        dispatch(reqGetOverseasPriceQuotationsDailyPrice({ PDNO: upperTicker, FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "") })).unwrap(),
                    ]);
                    payload = { ...payload, finnhubData: finnhubRes, usDetail: usDetailRes, usSearchInfo: usSearchRes, usDaily: usDailyRes };
                } else {
                    const jsonStock = (corpCodeJson as any)[name] || Object.values(corpCodeJson).find((v: any) => (v as any).stock_code === ticker);
                    const code = jsonStock?.stock_code || ticker;
                    const [price, bs, is, chart] = await Promise.all([
                        dispatch(reqGetInquirePrice({ PDNO: code })).unwrap(),
                        dispatch(reqGetBalanceSheet({ PDNO: code })).unwrap(),
                        dispatch(reqGetIncomeStatement({ PDNO: code })).unwrap(),
                        dispatch(reqGetInquireDailyItemChartPrice({ PDNO: code, FID_INPUT_DATE_1: "20240101", FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "") })).unwrap(),
                    ]);
                    payload = { ...payload, kiPrice: price, kiBS: bs, kiIS: is, kiChart: chart };
                }
                dispatch(updateStockDetail({ ticker, data: { ...payload, state: "fulfilled" } }));
            } catch (error) {
                dispatch(setStockState({ ticker, status: "rejected" }));
            }
        };
        fetchData();
    }, [ticker, name, isUs, dispatch, data?.state]);

    if (!data || data.state === "pending") {
        return <div className="h-[450px] w-full animate-pulse bg-zinc-100 dark:bg-zinc-800/40 rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-700/50" />;
    }

    return (
        <div onClick={onClick} className={cn("w-full h-full", !isSelected && "cursor-pointer")}>
            <StockCard
                isCompact={!isSelected}
                stock={data.isUs ? {
                    code: ticker, isUs: true, name, ticker: name,
                    grade: getUsNcavGrade(data.finnhubData, data.usDetail),
                    curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
                    ncavScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                    per: data?.usDetail?.output?.perx ?? 0,
                    pbr: data?.usDetail?.output?.pbrx ?? 0,
                    sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                } : {
                    code: ticker, isUs: false, name, ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
                    grade: getKrNcavGrade(data.kiBS, data.kiChart),
                    curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                    ncavScore: calculateKrNcavRatio(data.kiBS, data.kiChart),
                    per: data?.kiPrice?.output?.per ?? 0,
                    pbr: data?.kiPrice?.output?.pbr ?? 0,
                    sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                }}
            />
        </div>
    );
};

/** 메인 콘텐츠 컴포넌트 */
function AlgorithmTradeContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();

    const strategyNcavLatest = useAppSelector(selectStrategyNcavLatest);
    const currentStrategyId = searchParams.get("strategy");

    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dispatch(reqGetNcavLatest());
    }, [dispatch]);

    useEffect(() => {
        setDisplayCount(PAGE_SIZE);
        setSelectedTicker(null);
    }, [currentStrategyId]);

    const activeStrategy = useMemo(() => {
        const list = strategyNcavLatest?.list;
        if (!list || list.length === 0) return null;
        return currentStrategyId ? list.find(s => s.strategyId === currentStrategyId) || list[0] : list[0];
    }, [strategyNcavLatest, currentStrategyId]);

    const visibleCandidates = useMemo(() => {
        if (!activeStrategy?.candidates) return [];
        return Object.entries(activeStrategy.candidates).slice(0, displayCount);
    }, [activeStrategy, displayCount]);

    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        if (entries[0]?.isIntersecting && activeStrategy?.candidates && !selectedTicker) {
            const total = Object.keys(activeStrategy.candidates).length;
            if (displayCount < total) setDisplayCount(prev => prev + PAGE_SIZE);
        }
    }, [activeStrategy, displayCount, selectedTicker]);

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, { threshold: 0.1, rootMargin: "400px" });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [handleObserver]);

    if (strategyNcavLatest.state === "pending") return <LoadingUI />;
    if (!activeStrategy) return <EmptyUI onRetry={() => dispatch(reqGetNcavLatest())} />;

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-10 min-h-screen">
            <nav className="flex flex-wrap gap-2 mb-12 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                {strategyNcavLatest?.list?.map((strategy) => {
                    const isActive = activeStrategy.strategyId === strategy.strategyId;
                    return (
                        <button
                            key={strategy.strategyId}
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.set("strategy", strategy.strategyId);
                                router.push(`?${params.toString()}`, { scroll: false });
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${isActive ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900"}`}
                        >
                            {strategy.name}
                        </button>
                    );
                })}
            </nav>

            <div className="relative">
                <AnimatePresence>
                    {selectedTicker && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTicker(null)}
                            className="fixed inset-0 bg-zinc-950/60 dark:bg-black/90 backdrop-blur-xl z-[100] cursor-zoom-out"
                        />
                    )}
                </AnimatePresence>

                <LayoutGroup>
                    <div className={cn(
                        "relative transition-all duration-700",
                        "flex flex-col items-center lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-12"
                    )}>
                        {visibleCandidates.map(([ticker, candidate], index) => {
                            const isSelected = selectedTicker === ticker;
                            const isAnySelected = selectedTicker !== null;

                            return (
                                <React.Fragment key={`${activeStrategy.strategyId}-${ticker}`}>
                                    {/* 1. 팝업 모드: 선택된 카드가 절대적인 최상위 z-index를 가짐 */}
                                    <AnimatePresence mode="wait">
                                        {isSelected && (
                                            <div
                                                // z-[200]으로 높여서 리스트 모드의 어떤 카드(최대 index+alpha)보다도 위에 오게 함
                                                className="fixed inset-0 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
                                                onClick={() => setSelectedTicker(null)}
                                            >
                                                <motion.div
                                                    layoutId={`card-${ticker}`}
                                                    // 클릭된 카드는 스타일적으로도 최상위임을 명시
                                                    style={{ zIndex: 1000 }}
                                                    className="w-fit max-w-2xl cursor-default relative"
                                                    transition={{ type: "spring", stiffness: 350, damping: 35 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <StockDataFetcher
                                                        ticker={ticker}
                                                        name={candidate.symbol || ticker}
                                                        isSelected={true}
                                                    />
                                                </motion.div>
                                            </div>
                                        )}
                                    </AnimatePresence>

                                    {/* 2. 리스트 모드: 계단식 겹침 유지 */}
                                    {!isSelected && (
                                        <motion.div
                                            layoutId={`card-${ticker}`}
                                            className={cn(
                                                "w-fit max-w-2xl transition-all duration-500",
                                                index !== 0 && "mt-[-320px] lg:mt-0",
                                                // 선택된 카드가 있을 때 리스트의 다른 카드들은 투명해지며 z-index 영향력 상실
                                                isAnySelected ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 relative"
                                            )}
                                            // 먼저 나온 카드가 위로 오게 하여 상단 헤더 노출 보장
                                            style={{ zIndex: visibleCandidates.length + index }}
                                        >
                                            <StockDataFetcher
                                                ticker={ticker}
                                                name={candidate.name || ticker}
                                                isSelected={false}
                                                onClick={() => setSelectedTicker(ticker)}
                                            />
                                        </motion.div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </LayoutGroup>
            </div>

            {!selectedTicker && visibleCandidates.length < Object.keys(activeStrategy.candidates).length && (
                <div ref={observerTarget} className="h-60 flex items-center justify-center mt-10">
                    <div className="w-10 h-10 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

const LoadingUI = () => (
    <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-black">
        <CircleStackIcon className="w-20 h-20 text-blue-600 animate-pulse mb-6" />
        <p className="font-black text-zinc-500 tracking-[0.5em] text-xs uppercase animate-pulse">Analyzing Portfolio...</p>
    </div>
);

const EmptyUI = ({ onRetry }: { onRetry: () => void }) => (
    <div className="py-60 text-center">
        <div className="inline-flex p-6 rounded-[3rem] bg-zinc-50 dark:bg-zinc-900 mb-8">
            <ExclamationTriangleIcon className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
        </div>
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-4">Data Not Found</h3>
        <button onClick={onRetry} className="px-10 py-4 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-[2rem] font-black hover:scale-105 active:scale-95 transition-all shadow-xl">Retry Refresh</button>
    </div>
);

export default function Page() {
    return (
        <Suspense fallback={<LoadingUI />}>
            <AlgorithmTradeContent />
        </Suspense>
    );
}