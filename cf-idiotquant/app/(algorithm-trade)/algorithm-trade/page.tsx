"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { motion, AnimatePresence } from "framer-motion";
import { 
    CircleStackIcon, 
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ChartBarIcon,
    AdjustmentsHorizontalIcon,
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
    StrategyNcavLatestItemType,
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

const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];
const PAGE_SIZE = 20;

/**
 * [StockDataFetcher]
 */
const StockDataFetcher = ({ ticker, name }: { ticker: string; name: string }) => {
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
                        dispatch(reqGetOverseasPriceQuotationsDailyPrice({
                            PDNO: upperTicker,
                            FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "")
                        })).unwrap(),
                    ]);
                    payload = { ...payload, finnhubData: finnhubRes, usDetail: usDetailRes, usSearchInfo: usSearchRes, usDaily: usDailyRes };
                } else {
                    const jsonStock = (corpCodeJson as any)[name] || Object.values(corpCodeJson).find((v: any) => (v as any).stock_code === ticker);
                    const code = jsonStock?.stock_code || ticker;
                    const [price, bs, is, chart] = await Promise.all([
                        dispatch(reqGetInquirePrice({ PDNO: code })).unwrap(),
                        dispatch(reqGetBalanceSheet({ PDNO: code })).unwrap(),
                        dispatch(reqGetIncomeStatement({ PDNO: code })).unwrap(),
                        dispatch(reqGetInquireDailyItemChartPrice({
                            PDNO: code,
                            FID_INPUT_DATE_1: "20240101",
                            FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "")
                        })).unwrap(),
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

    if (data.state === "rejected") {
        return <div className="h-[450px] flex items-center justify-center border border-dashed rounded-[2.5rem] text-zinc-400">Error: {ticker}</div>;
    }

    return (
        <StockCard
            stock={
                data.isUs
                    ? {
                        code: ticker,
                        isUs: true,
                        name,
                        ticker: name,
                        grade: getUsNcavGrade(data.finnhubData, data.usDetail),
                        curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
                        fairValue: '$' + calculateUsNcavValue(data.finnhubData, data.usDetail),
                        ncavScore: calculateUsNcavRatio(data.finnhubData, data.usDetail),
                        srimScore: getUsSRIMTargetPrice(data.finnhubData, data.usDetail),
                        per: data?.usDetail?.output?.perx ?? 0,
                        pbr: data?.usDetail?.output?.pbrx ?? 0,
                        eps: "$" + (data?.usDetail?.output?.epsx ?? 0),
                        sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
                    }
                    : {
                        code: ticker,
                        isUs: false,
                        name,
                        ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
                        grade: getKrNcavGrade(data.kiBS, data.kiChart),
                        curPrice: data?.kiPrice?.output?.stck_prpr ?? 0,
                        fairValue: '₩' + calculateKrNcavValue(data.kiBS, data.kiChart),
                        ncavScore: calculateKrNcavRatio(data.kiBS, data.kiChart),
                        srimScore: getKrSRIMTargetPrice(data.kiBS, data.kiIS, data.kiChart),
                        per: data?.kiPrice?.output?.per ?? 0,
                        pbr: data?.kiPrice?.output?.pbr ?? 0,
                        eps: "₩" + Number(data?.kiPrice?.output?.eps ?? 0).toFixed(0),
                        sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
                    }
            }
            chartConfig={{}} 
            rawData={data} 
        />
    );
};

export default function AlgorithmTradeContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const strategyNcavLatest = useAppSelector(selectStrategyNcavLatest);
    const currentStrategyId = searchParams.get("strategy");

    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dispatch(reqGetNcavLatest());
    }, [dispatch]);

    useEffect(() => {
        setDisplayCount(PAGE_SIZE);
    }, [currentStrategyId]);

    const activeStrategy = useMemo(() => {
        const list = strategyNcavLatest?.list;
        if (!list || list.length === 0) return null;
        return currentStrategyId 
            ? list.find(s => s.strategyId === currentStrategyId) || list[0]
            : list[0];
    }, [strategyNcavLatest, currentStrategyId]);

    // 방어 코드 추가: activeStrategy.candidates가 없을 경우 빈 배열 반환
    const visibleCandidates = useMemo(() => {
        if (!activeStrategy?.candidates) return [];
        return Object.entries(activeStrategy.candidates).slice(0, displayCount);
    }, [activeStrategy, displayCount]);

    const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
        const target = entries[0];
        // entries[0] 존재 여부 체크
        if (target?.isIntersecting && activeStrategy?.candidates) {
            const total = Object.keys(activeStrategy.candidates).length;
            if (displayCount < total) {
                setDisplayCount(prev => prev + PAGE_SIZE);
            }
        }
    }, [activeStrategy, displayCount]);

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, { 
            threshold: 0.1, // 1.0은 너무 엄격하여 작동하지 않을 수 있으므로 조정
            rootMargin: "100px" // 미리 로딩되도록 여유값 추가
        });
        if (observerTarget.current) observer.observe(observerTarget.current);
        return () => observer.disconnect();
    }, [handleObserver]);

    const handleStrategyChange = (id: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("strategy", id);
        router.push(`?${params.toString()}`, { scroll: false });
    };

    if (strategyNcavLatest.state === "pending") return <LoadingUI />;
    if (!activeStrategy) return <EmptyUI onRetry={() => dispatch(reqGetNcavLatest())} />;

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-10 space-y-10">
            <nav className="flex flex-wrap gap-2 pb-6 border-b border-zinc-100 dark:border-zinc-800">
                {strategyNcavLatest?.list?.map((strategy) => {
                    const isActive = activeStrategy.strategyId === strategy.strategyId;
                    return (
                        <button
                            key={strategy.strategyId}
                            onClick={() => handleStrategyChange(strategy.strategyId)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${isActive ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xl" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900"}`}
                        >
                            {isActive && <CheckCircleIcon className="w-4 h-4 text-blue-400" />}
                            {strategy.name}
                            <span className="ml-1 text-[10px] opacity-60">{strategy.numCandidates}</span>
                        </button>
                    );
                })}
            </nav>

            <header className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">{activeStrategy.universe} Market</span>
                            <span className="text-zinc-400 text-xs font-bold tracking-widest uppercase">{String(activeStrategy.dataSource)}</span>
                        </div>
                        <h1 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">{activeStrategy.name}</h1>
                        <p className="text-zinc-500 text-sm font-medium">{activeStrategy.notes || "퀀트 전략 기반 실시간 유망 종목 리스트입니다."}</p>
                    </div>
                    <button onClick={() => dispatch(reqGetNcavLatest())} className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:rotate-180 transition-transform duration-700">
                        <ArrowPathIcon className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-6 p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] border border-zinc-100 dark:border-zinc-800">
                    <StatItem label="Loaded" value={`${visibleCandidates.length} / ${activeStrategy.numCandidates}개`} icon={<ChartBarIcon className="w-4 h-4 text-blue-500" />} />
                    <StatItem label="NCAV Filter" value={`${activeStrategy?.params?.ncavToMarketCapMin ?? 0}x`} icon={<AdjustmentsHorizontalIcon className="w-4 h-4 text-orange-500" />} />
                </div>
            </header>

            <motion.div 
                key={activeStrategy.strategyId}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                initial="hidden" animate="show"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.02 } } }}
            >
                <AnimatePresence mode="popLayout">
                    {visibleCandidates.map(([ticker, candidate]: [string, any]) => (
                        <motion.div
                            key={`${activeStrategy.strategyId}-${ticker}`}
                            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                            layout
                        >
                            <StockDataFetcher ticker={ticker} name={candidate.name || ticker} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            {/* 하단 관찰 포인트: candidates가 더 있을 때만 표시 */}
            {activeStrategy?.candidates && visibleCandidates.length < Object.keys(activeStrategy.candidates).length && (
                <div ref={observerTarget} className="h-40 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}

// StatItem 등 하위 컴포넌트는 이전과 동일
const StatItem = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
    <div className="flex items-center gap-3">
        {icon && <div className="p-2 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700/50">{icon}</div>}
        <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
    </div>
);

const LoadingUI = () => (
    <div className="py-60 flex flex-col items-center justify-center">
        <CircleStackIcon className="w-16 h-16 text-blue-600 animate-bounce mb-4" />
        <p className="font-black text-zinc-400 tracking-[0.4em] text-xs">SYNCHRONIZING QUANT DATA...</p>
    </div>
);

const EmptyUI = ({ onRetry }: { onRetry: () => void }) => (
    <div className="py-40 text-center">
        <ExclamationTriangleIcon className="w-16 h-16 text-amber-500 mx-auto mb-6 opacity-20" />
        <h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-8">No Strategy Found</h3>
        <button onClick={onRetry} className="px-8 py-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-2xl font-bold transition-transform active:scale-95">Retry Refresh</button>
    </div>
);