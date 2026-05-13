"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
    CircleStackIcon, 
    ExclamationTriangleIcon,
    CheckCircleIcon
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

import { getKrNcavGrade, calculateKrNcavValue, calculateKrNcavRatio, getKrSRIMTargetPrice, getUsNcavGrade, calculateUsNcavValue, calculateUsNcavRatio, getUsSRIMTargetPrice } from "@/components/utils/financeCalc"; 
import corpCodeJson from "@/public/data/validCorpCode.json";
import nasdaq_tickers from "@/public/data/usStockSymbols/nasdaq_tickers.json";
import nyse_tickers from "@/public/data/usStockSymbols/nyse_tickers.json";
import amex_tickers from "@/public/data/usStockSymbols/amex_tickers.json";
import { StockCard } from "@/app/(search)/search/components/StockCard";
import { cn } from "@/lib/utils";

const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];
const PAGE_SIZE = 20;

const StockDataFetcher = ({ ticker, name, isSelected, onClick }: { ticker: string; name: string; isSelected: boolean; onClick?: () => void }) => {
    const dispatch = useAppDispatch();
    const isUs = useMemo(() => us_tickers.includes(ticker.toUpperCase()), [ticker]);
    const data = useAppSelector((state) => selectStockByTicker(state, ticker));

    useEffect(() => {
        if (data?.state === "pending" || data?.state === "fulfilled") return;
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
        <div 
            onClick={onClick} 
            className={cn(
                "w-full transition-transform duration-500", 
                !isSelected && "cursor-pointer hover:-translate-y-4"
            )}
        >
            <StockCard
                stock={data.isUs ? {
                    code: ticker, isUs: true, name, ticker: name,
                    grade: getUsNcavGrade(data.finnhubData, data.usDetail),
                    curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
                    fairValue: '$' + calculateUsNcavValue(data.finnhubData, data.usDetail),
                    ncavScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                    srimScore: getUsSRIMTargetPrice(data.finnhubData, data.usDetail),
                    per: data?.usDetail?.output?.perx ?? 0,
                    pbr: data?.usDetail?.output?.pbrx ?? 0,
                    eps: "$" + (data?.usDetail?.output?.epsx ?? 0),
                    sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                } : {
                    code: ticker, isUs: false, name, ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
                    grade: getKrNcavGrade(data.kiBS, data.kiChart),
                    curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                    fairValue: '₩' + calculateKrNcavValue(data.kiBS, data.kiChart),
                    ncavScore: calculateKrNcavRatio(data.kiBS, data.kiChart),
                    srimScore: getKrSRIMTargetPrice(data.kiBS, data.kiIS, data.kiChart),
                    per: data?.kiPrice?.output?.per ?? 0,
                    pbr: data?.kiPrice?.output?.pbr ?? 0,
                    eps: "₩" + Number(data?.kiPrice?.output?.eps ?? 0).toFixed(0),
                    sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                }}
                chartConfig={{}} rawData={data} 
            />
        </div>
    );
};

export default function Page() {
    return (
        <Suspense fallback={<LoadingUI />}>
            <AlgorithmTradeContent />
        </Suspense>
    );
}

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
        const observer = new IntersectionObserver(handleObserver, { threshold: 0.1, rootMargin: "200px" });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [handleObserver]);

    if (strategyNcavLatest.state === "pending") return <LoadingUI />;
    if (!activeStrategy) return <EmptyUI onRetry={() => dispatch(reqGetNcavLatest())} />;

    return (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-10 min-h-screen">
            {/* Header & Nav */}
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
                            {isActive && <CheckCircleIcon className="w-4 h-4 text-blue-400" />}
                            {strategy.name}
                        </button>
                    );
                })}
            </nav>

            <div className="relative">
                {/* 1. Backdrop - 카드 이외의 영역을 클릭하면 닫히도록 설정 */}
                <AnimatePresence>
                    {selectedTicker && (
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTicker(null)} // 배경 클릭 시만 해제
                            className="fixed inset-0 bg-zinc-950/40 dark:bg-black/80 backdrop-blur-md z-[100] cursor-zoom-out"
                        />
                    )}
                </AnimatePresence>

                {/* 2. 카드 리스트 영역 */}
                <LayoutGroup>
                    <div className={cn(
                        "relative transition-all duration-700",
                        "flex flex-col items-center lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-8"
                    )}>
                        {visibleCandidates.map(([ticker, candidate], index) => {
                            const isSelected = selectedTicker === ticker;
                            const isAnySelected = selectedTicker !== null;

                            return (
                                <React.Fragment key={`${activeStrategy.strategyId}-${ticker}`}>
                                    {/* 고정 팝업 모드 (선택된 카드) */}
                                    <AnimatePresence>
                                        {isSelected && (
                                            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
                                                <motion.div
                                                    layoutId={`card-${ticker}`}
                                                    className="w-full max-w-2xl pointer-events-auto"
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    onClick={(e) => e.stopPropagation()} // 카드 본체 클릭 시 이벤트 전파 차단 (닫히지 않음)
                                                >
                                                    <StockDataFetcher 
                                                        ticker={ticker} 
                                                        name={candidate.symbol || ticker} 
                                                        isSelected={true}
                                                        // onClick 속성을 전달하지 않거나 빈 함수 전달하여 클릭 방지
                                                    />
                                                </motion.div>
                                            </div>
                                        )}
                                    </AnimatePresence>

                                    {/* 기본 리스트 상태 */}
                                    {!isSelected && (
                                        <motion.div
                                            layoutId={`card-${ticker}`}
                                            className={cn(
                                                "w-full max-w-2xl transition-all duration-500",
                                                index !== 0 && "mt-[-400px] lg:mt-0", // 더 깊게 가려지도록 수정
                                                isAnySelected ? "opacity-0 scale-90" : "opacity-100 relative z-10"
                                            )}
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

            {/* 인피니트 스크롤 */}
            {!selectedTicker && visibleCandidates.length < Object.keys(activeStrategy.candidates).length && (
                <div ref={observerTarget} className="h-60 flex items-center justify-center mt-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Discovering More...</p>
                    </div>
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