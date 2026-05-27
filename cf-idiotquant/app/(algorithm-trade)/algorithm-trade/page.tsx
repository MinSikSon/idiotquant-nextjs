"use client";

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
    CircleStackIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    GlobeAltIcon,
    AdjustmentsHorizontalIcon,
    XMarkIcon,
    Squares2X2Icon,
    ArrowPathIcon,
    ListBulletIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    BarsArrowUpIcon,
    BarsArrowDownIcon,
    CommandLineIcon
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
const PAGE_SIZE = 12;

type SortKey = "ticker" | "ncavScore" | "curPrice" | "per" | "pbr";
type SortOrder = "asc" | "desc";

/**
 * 전용 로고 이미지 핸들러
 */
const StockLogo = ({ ticker, isUs, className }: { ticker: string; isUs: boolean; className?: string }) => {
    const [imgError, setImgError] = useState(false);
    
    const logoUrl = useMemo(() => {
        if (isUs) {
            return `https://img.logo.dev/ticker/${ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`;
        } else {
            return `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${ticker}`;
        }
    }, [ticker, isUs]);

    if (imgError || (!process.env.NEXT_PUBLIC_CLEARBIT_API_KEY && isUs) || (!process.env.NEXT_PUBLIC_KR_LOGO_API && !isUs)) {
        return (
            <div className={cn(
                "rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-xs shrink-0 select-none",
                isUs ? "bg-gradient-to-tr from-blue-600 to-sky-400" : "bg-gradient-to-tr from-indigo-600 to-purple-400",
                className
            )}>
                {ticker.substring(0, 2).toUpperCase()}
            </div>
        );
    }

    return (
        <img 
            src={logoUrl} 
            alt={`${ticker} logo`}
            className={cn("rounded-full object-cover bg-white border border-zinc-200/60 dark:border-zinc-800 shrink-0", className)}
            onError={() => setImgError(true)}
        />
    );
};

/**
 * 데이터 오케스트레이션 래퍼 컴포넌트
 */
const StockDataWrapper = ({ 
    ticker, 
    name, 
    onDataLoaded,
    children 
}: { 
    ticker: string; 
    name: string; 
    onDataLoaded?: (ticker: string, parsedData: any) => void;
    children: (parsedData: any, chartConfig: any, state: string) => React.ReactNode 
}) => {
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

    const chartConfig = useMemo(() => {
        if (!data || data.state !== "fulfilled") {
            return { data: [], categories: [], color: '#3b82f6' };
        }
        const isUsMarket = data.isUs === true;
        const rawData = isUsMarket ? data.usDaily?.output2 : data.kiChart?.output2;

        return {
            data: rawData?.map((i: any) => Number(isUsMarket ? i.clos : i.stck_clpr)).reverse() || [],
            categories: rawData?.map((i: any) => (isUsMarket ? i.xymd : i.stck_bsop_date)).reverse() || [],
            color: isUsMarket ? '#3b82f6' : '#6366f1',
        };
    }, [data]);

    const parsedData = useMemo(() => {
        if (!data || data.state !== "fulfilled") return null;

        const rawGrade = data.isUs 
            ? getUsNcavGrade(data.finnhubData, data.usDetail) 
            : getKrNcavGrade(data.kiBS, data.kiChart);

        const gradeText = rawGrade && typeof rawGrade === "object" 
            ? (rawGrade.grade || "N/A") 
            : (rawGrade || "N/A");

        const res = data.isUs ? {
            code: ticker, isUs: true, name, ticker: name,
            gradeRaw: rawGrade,
            gradeDisplay: gradeText,
            curPriceNum: Number(data?.usDetail?.output?.last ?? 0),
            curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
            ncavScore: Number(calculateUsNcavRatio(data.finnhubData, data.usDetail) || 0),
            per: Number(data?.usDetail?.output?.perx ?? 0),
            pbr: Number(data?.usDetail?.output?.pbrx ?? 0),
            sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
        } : {
            code: ticker, isUs: false, name, ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
            gradeRaw: rawGrade,
            gradeDisplay: gradeText,
            curPriceNum: Number(data?.kiPrice?.output?.stck_prpr ?? 0),
            curPrice: Number(data?.kiPrice?.output?.stck_prpr ?? 0).toLocaleString(),
            ncavScore: Number(calculateKrNcavRatio(data.kiBS, data.kiChart) || 0),
            per: Number(data?.kiPrice?.output?.per ?? 0),
            pbr: Number(data?.kiPrice?.output?.pbr ?? 0),
            sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
        };

        return res;
    }, [data, ticker, name]);

    useEffect(() => {
        if (parsedData && onDataLoaded) {
            onDataLoaded(ticker, parsedData);
        }
    }, [parsedData, ticker, onDataLoaded]);

    return <>{children(parsedData, chartConfig, data?.state || "idle")}</>;
};

/**
 * 실시간 주가 차트 스파크라인
 */
const MiniSparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length < 2) return <div className="h-5 w-20 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />;
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    
    const width = 100;
    const height = 24;
    const points = data.map((val, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(" ");

    const isUp = data[data.length - 1] >= data[0];
    const strokeColor = isUp ? "#ef4444" : "#3b82f6";

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                fill="none"
                stroke={strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    );
};

const CardSkeleton = () => (
    <div className="w-full h-[380px] bg-gradient-to-b from-zinc-50 to-zinc-100/50 dark:from-zinc-900 dark:to-zinc-900/30 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 flex flex-col justify-between animate-pulse">
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <div className="h-6 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
            </div>
            <div className="h-7 w-44 bg-zinc-300 dark:bg-zinc-700 rounded-lg" />
            <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            </div>
        </div>
        <div className="h-28 bg-zinc-200/70 dark:bg-zinc-800/50 rounded-2xl w-full" />
    </div>
);

const ErrorStateCard = ({ ticker }: { ticker: string }) => (
    <div className="w-full h-[380px] bg-zinc-50/50 dark:bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 p-6 flex flex-col items-center justify-center text-center gap-3">
        <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-full text-red-500">
            <ExclamationTriangleIcon className="w-6 h-6" />
        </div>
        <div>
            <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{ticker} 로드 실패</h4>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">금융 API 마켓 원천 데이터를<br />가져올 수 없습니다.</p>
        </div>
    </div>
);

function AlgorithmTradeContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();

    const strategyNcavLatest = useAppSelector(selectStrategyNcavLatest);
    const currentStrategyId = searchParams.get("strategy");

    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    
    const [focusedIndex, setFocusedIndex] = useState<number>(0);
    
    const [sortKey, setSortKey] = useState<SortKey>("ticker");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [loadedDataMap, setLoadedDataMap] = useState<Record<string, any>>({});

    const observerTarget = useRef<HTMLDivElement>(null);
    const listContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        dispatch(reqGetNcavLatest());
    }, [dispatch]);

    useEffect(() => {
        setDisplayCount(PAGE_SIZE);
        setSelectedTicker(null);
        setFocusedIndex(0);
        setLoadedDataMap({});
    }, [currentStrategyId]);

    const activeStrategy = useMemo(() => {
        const list = strategyNcavLatest?.list;
        if (!list || list.length === 0) return null;
        return currentStrategyId ? list.find(s => s.strategyId === currentStrategyId) || list[0] : list[0];
    }, [strategyNcavLatest, currentStrategyId]);

    const totalCandidateKeys = useMemo(() => {
        if (!activeStrategy?.candidates) return [];
        return Object.keys(activeStrategy.candidates);
    }, [activeStrategy]);

    const marketDistribution = useMemo(() => {
        if (!activeStrategy?.candidates) return { us: 0, kr: 0 };
        let us = 0;
        let kr = 0;
        Object.keys(activeStrategy.candidates).forEach(ticker => {
            if (us_tickers.includes(ticker.toUpperCase())) us++;
            else kr++;
        });
        return { us, kr };
    }, [activeStrategy]);

    const handleDataLoaded = useCallback((ticker: string, parsedData: any) => {
        setLoadedDataMap(prev => {
            if (prev[ticker]?.ncavScore === parsedData.ncavScore && prev[ticker]?.curPriceNum === parsedData.curPriceNum) return prev;
            return { ...prev, [ticker]: parsedData };
        });
    }, []);

    const visibleCandidates = useMemo(() => {
        if (!activeStrategy?.candidates) return [];
        const rawEntries = Object.entries(activeStrategy.candidates).slice(0, displayCount);
        
        if (viewMode === "table") {
            return [...rawEntries].sort((a, b) => {
                const tickerA = a[0];
                const tickerB = b[0];
                const dataA = loadedDataMap[tickerA];
                const dataB = loadedDataMap[tickerB];

                if (sortKey === "ticker") {
                    return sortOrder === "asc" ? tickerA.localeCompare(tickerB) : tickerB.localeCompare(tickerA);
                }

                if (!dataA && !dataB) return 0;
                if (!dataA) return 1;
                if (!dataB) return -1;

                let valA = 0;
                let valB = 0;

                if (sortKey === "ncavScore") {
                    valA = dataA.ncavScore;
                    valB = dataB.ncavScore;
                } else if (sortKey === "curPrice") {
                    valA = dataA.curPriceNum;
                    valB = dataB.curPriceNum;
                } else if (sortKey === "per") {
                    valA = dataA.per;
                    valB = dataB.per;
                } else if (sortKey === "pbr") {
                    valA = dataA.pbr;
                    valB = dataB.pbr;
                }

                return sortOrder === "asc" ? valA - valB : valB - valA;
            });
        }

        return rawEntries;
    }, [activeStrategy, displayCount, viewMode, sortKey, sortOrder, loadedDataMap]);

    /**
     * 🎹 한글 키보드 매핑 방어선이 보강된 단축키 이벤트 리스너
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
                return;
            }

            const maxIndex = visibleCandidates.length - 1;
            const keyLower = e.key.toLowerCase();

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setFocusedIndex(prev => (prev >= maxIndex ? maxIndex : prev + 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setFocusedIndex(prev => (prev <= 0 ? 0 : prev - 1));
                    break;
                case "Enter":
                case " ":
                    e.preventDefault();
                    if (!selectedTicker && visibleCandidates[focusedIndex]) {
                        setSelectedTicker(visibleCandidates[focusedIndex][0]);
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    if (selectedTicker) {
                        setSelectedTicker(null);
                    }
                    break;
                // 'v', 'V' 및 한글 자음 'ㅍ' 상태에서도 완벽하게 감지되도록 케이스 확장 보강
                case "v":
                case "V":
                case "ㅍ":
                    e.preventDefault();
                    setViewMode(prev => (prev === "card" ? "table" : "card"));
                    break;
                default:
                    // 브라우저에 따라 e.key가 깨질 때를 대비한 e.code(물리 키 위치) 크로스체킹 폴백 추가
                    if (e.code === "KeyV") {
                        e.preventDefault();
                        setViewMode(prev => (prev === "card" ? "table" : "card"));
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [visibleCandidates, focusedIndex, selectedTicker]);

    // 테이블 뷰 뿐만 아니라 카드 뷰 상태에서도 포커스가 상하 이동할 때 뷰포트 내로 자동 스크롤 유도 고도화
    useEffect(() => {
        if (listContainerRef.current) {
            const targetQuery = viewMode === "table" ? "tbody tr" : "[data-card-item]";
            const items = listContainerRef.current.querySelectorAll(targetQuery);
            const targetItem = items[focusedIndex] as HTMLElement;
            if (targetItem) {
                targetItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        }
    }, [focusedIndex, viewMode]);

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

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortOrder("desc");
        }
    };

    const renderSortIcon = (key: SortKey) => {
        if (sortKey !== key) return <BarsArrowDownIcon className="w-3.5 h-3.5 opacity-30 text-zinc-400 group-hover:opacity-80 transition-opacity" />;
        return sortOrder === "asc" 
            ? <ChevronUpIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />
            : <ChevronDownIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 font-black" />;
    };

    if (strategyNcavLatest.state === "pending") return <LoadingUI />;
    if (!activeStrategy) return <EmptyUI onRetry={() => dispatch(reqGetNcavLatest())} />;

    return (
        <div className="min-h-screen bg-zinc-50/30 dark:bg-zinc-950/40 transition-colors duration-500 font-sans text-zinc-900 dark:text-zinc-100">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

                {/* 대시보드 최고급화 헤더 */}
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200/80 dark:border-zinc-900 pb-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-[0.2em]">
                                <AdjustmentsHorizontalIcon className="w-4 h-4" />
                                <span>Quant Algorithmic Filtering</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-zinc-950 via-zinc-800 to-zinc-700 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                                Graham NCAV 탐색 대시보드
                            </h1>
                        </div>
                        
                        <div className="flex items-center flex-wrap sm:flex-nowrap gap-3 self-start md:self-center">
                            <div className="hidden lg:flex items-center gap-2 bg-zinc-100/80 dark:bg-zinc-900/80 px-3 py-2 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 text-[11px] text-zinc-500 font-medium">
                                <CommandLineIcon className="w-3.5 h-3.5 text-zinc-400 animate-pulse" />
                                <span>단축키 가이드: <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border rounded shadow-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">V</kbd> 뷰전환 (한/영 무관) · <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border rounded shadow-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">↑↓</kbd> 이동 · <kbd className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border rounded shadow-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">Enter</kbd> 열기</span>
                            </div>

                            <div className="flex items-center p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
                                <button
                                    onClick={() => setViewMode("card")}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                                        viewMode === "card"
                                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    <Squares2X2Icon className="w-3.5 h-3.5" />
                                    카드형
                                </button>
                                <button
                                    onClick={() => setViewMode("table")}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all",
                                        viewMode === "table"
                                            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                    )}
                                >
                                    <ListBulletIcon className="w-3.5 h-3.5" />
                                    테이블형
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* 전략 내비게이션 랙 */}
                <nav className="flex flex-wrap gap-2 mb-8">
                    {strategyNcavLatest?.list?.map((strategy) => {
                        const isActive = activeStrategy.strategyId === strategy.strategyId;
                        const count = strategy.candidates ? Object.keys(strategy.candidates).length : 0;
                        return (
                            <button
                                key={strategy.strategyId}
                                onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString());
                                    params.set("strategy", strategy.strategyId);
                                    router.push(`?${params.toString()}`, { scroll: false });
                                }}
                                className={cn(
                                    "flex items-center gap-3 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border duration-200",
                                    isActive
                                        ? "bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950 font-extrabold shadow-md shadow-zinc-950/10"
                                        : "bg-white border-zinc-200/80 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800/80 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                                )}
                            >
                                <span>{strategy.name}</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-mono font-bold",
                                    isActive
                                        ? "bg-blue-600 text-white dark:bg-zinc-200 dark:text-zinc-900"
                                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                {/* 요약 대시 가젯 보드 */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-zinc-700 dark:text-zinc-300">
                            <Squares2X2Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">전체 후보 스크리닝</span>
                            <span className="text-xl font-bold font-mono">{totalCandidateKeys.length} <span className="text-xs font-normal text-zinc-400">개사</span></span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-400">
                            <GlobeAltIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">미국 마켓 포지션</span>
                            <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{marketDistribution.us} <span className="text-xs font-normal text-zinc-400">개사</span></span>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-2xs">
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <ChartBarIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">한국 마켓 포지션</span>
                            <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">{marketDistribution.kr} <span className="text-xs font-normal text-zinc-400">개사</span></span>
                        </div>
                    </div>
                </section>

                {/* 메인 레이아웃 엔진 컨테이너 */}
                <div className="relative" ref={listContainerRef}>
                    <AnimatePresence>
                        {selectedTicker && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedTicker(null)}
                                className="fixed inset-0 bg-zinc-950/40 dark:bg-black/70 backdrop-blur-md z-[100] cursor-zoom-out"
                            />
                        )}
                    </AnimatePresence>

                    <LayoutGroup id="ncav-layout-group">
                        {viewMode === "card" ? (
                            /* ==================== 1. 카드 뷰 모드 ==================== */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {visibleCandidates.map(([ticker, candidate], index) => {
                                    const isSelected = selectedTicker === ticker;
                                    const isAnySelected = selectedTicker !== null;
                                    const isFocused = focusedIndex === index;

                                    return (
                                        <React.Fragment key={`card-${activeStrategy.strategyId}-${ticker}`}>
                                            <AnimatePresence mode="wait">
                                                {isSelected && (
                                                    <div
                                                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
                                                        onClick={() => setSelectedTicker(null)}
                                                    >
                                                        <motion.div
                                                            layoutId={`card-container-${ticker}`}
                                                            className="w-full max-w-xl cursor-default relative shadow-2xl"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={() => setSelectedTicker(null)}
                                                                className="absolute -top-12 right-0 p-2 bg-zinc-900 text-white rounded-full border border-zinc-800 z-[210]"
                                                            >
                                                                <XMarkIcon className="w-5 h-5" />
                                                            </button>
                                                            <StockDataWrapper ticker={ticker} name={candidate.symbol || candidate.name || ticker}>
                                                                {(parsedData, chartConfig, state) => (
                                                                    state === "fulfilled" ? (
                                                                        <StockCard 
                                                                            isCompact={false} 
                                                                            stock={{
                                                                                ...parsedData,
                                                                                grade: parsedData.gradeRaw
                                                                            }} 
                                                                            chartConfig={chartConfig} 
                                                                        />
                                                                    ) : state === "rejected" ? (
                                                                        <ErrorStateCard ticker={ticker} />
                                                                    ) : <CardSkeleton />
                                                                )}
                                                            </StockDataWrapper>
                                                        </motion.div>
                                                    </div>
                                                )}
                                            </AnimatePresence>

                                            <motion.div
                                                data-card-item
                                                layoutId={`card-container-${ticker}`}
                                                className={cn(
                                                    "w-full h-full transition-all duration-200 rounded-3xl",
                                                    isAnySelected && !isSelected ? "opacity-20 blur-xs scale-98 pointer-events-none" : "opacity-100",
                                                    isFocused && !isSelected ? "ring-4 ring-blue-500/80 ring-offset-4 dark:ring-offset-zinc-950 shadow-xl scale-[1.01]" : ""
                                                )}
                                                onClick={() => {
                                                    setFocusedIndex(index);
                                                    !isSelected && setSelectedTicker(ticker);
                                                }}
                                            >
                                                {!isSelected && (
                                                    <StockDataWrapper ticker={ticker} name={candidate.name || candidate.symbol || ticker}>
                                                        {(parsedData, chartConfig, state) => (
                                                            state === "fulfilled" ? (
                                                                <div className="cursor-pointer hover:scale-[1.015] transition-transform duration-300">
                                                                    <div className="relative">
                                                                        <StockCard 
                                                                            isCompact={false} 
                                                                            stock={{
                                                                                ...parsedData,
                                                                                grade: parsedData.gradeRaw
                                                                            }} 
                                                                            chartConfig={chartConfig} 
                                                                        />
                                                                        <div className="absolute top-6 left-6 pointer-events-none">
                                                                            <StockLogo ticker={ticker} isUs={parsedData.isUs} className="w-7 h-7" />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : state === "rejected" ? (
                                                                <ErrorStateCard ticker={ticker} />
                                                            ) : <CardSkeleton />
                                                        )}
                                                    </StockDataWrapper>
                                                )}
                                            </motion.div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ==================== 2. 동적 필터 정렬 테이블 뷰 모드 ==================== */
                            <div className="w-full overflow-hidden bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-500 text-[11px] font-bold uppercase tracking-wider select-none">
                                                <th onClick={() => toggleSort("ticker")} className="py-4 px-6 cursor-pointer group hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    <div className="flex items-center gap-1.5">
                                                        <span>티커 / 종목명</span>
                                                        {renderSortIcon("ticker")}
                                                    </div>
                                                </th>
                                                <th className="py-4 px-4 text-center">시장</th>
                                                <th className="py-4 px-4">그레이드</th>
                                                <th onClick={() => toggleSort("curPrice")} className="py-4 px-4 text-right cursor-pointer group hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span>현재가</span>
                                                        {renderSortIcon("curPrice")}
                                                    </div>
                                                </th>
                                                <th onClick={() => toggleSort("ncavScore")} className="py-4 px-4 text-right cursor-pointer group hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span>NCAV 비율</span>
                                                        {renderSortIcon("ncavScore")}
                                                    </div>
                                                </th>
                                                <th onClick={() => toggleSort("per")} className="py-4 px-4 text-right cursor-pointer group hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span>PER</span>
                                                        {renderSortIcon("per")}
                                                    </div>
                                                </th>
                                                <th onClick={() => toggleSort("pbr")} className="py-4 px-4 text-right cursor-pointer group hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40 transition-colors">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span>PBR</span>
                                                        {renderSortIcon("pbr")}
                                                    </div>
                                                </th>
                                                <th className="py-4 px-4 text-center">주가 트렌드 (최근)</th>
                                                <th className="py-4 px-6">섹터</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs sm:text-sm font-medium">
                                            {visibleCandidates.map(([ticker, candidate], index) => {
                                                const isFocused = focusedIndex === index;
                                                return (
                                                    <StockDataWrapper 
                                                        key={`table-row-${ticker}`} 
                                                        ticker={ticker} 
                                                        name={candidate.name || candidate.symbol || ticker}
                                                        onDataLoaded={handleDataLoaded}
                                                    >
                                                        {(parsedData, chartConfig, state) => {
                                                            if (state === "pending" || state === "idle") {
                                                                return (
                                                                    <tr>
                                                                        <td className="py-4 px-6 animate-pulse">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="w-7 h-7 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                                                                                <div className="space-y-1">
                                                                                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-14" />
                                                                                    <div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-24" />
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-4 px-4 animate-pulse"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-8 mx-auto" /></td>
                                                                        <td className="py-4 px-4 animate-pulse"><div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-10" /></td>
                                                                        <td className="py-4 px-4 animate-pulse"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-16 ml-auto" /></td>
                                                                        <td className="py-4 px-4 animate-pulse"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-12 ml-auto" /></td>
                                                                        <td className="py-4 px-4 animate-pulse"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-10 ml-auto" /></td>
                                                                        <td className="py-4 px-4 animate-pulse"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-10 ml-auto" /></td>
                                                                        <td className="py-4 px-4 animate-pulse"><div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-20 mx-auto" /></td>
                                                                        <td className="py-4 px-6 animate-pulse"><div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24" /></td>
                                                                    </tr>
                                                                );
                                                            }
                                                            if (state === "rejected") {
                                                                return (
                                                                    <tr className="text-zinc-400 bg-red-50/10 dark:bg-red-950/5">
                                                                        <td className="py-4 px-6 font-mono font-bold text-red-500">{ticker}</td>
                                                                        <td colSpan={8} className="py-4 px-6 text-xs text-red-400/80">원천 API 동기화 에러로 표시 불가</td>
                                                                    </tr>
                                                                );
                                                            }
                                                            return (
                                                                <tr 
                                                                    onClick={() => {
                                                                        setFocusedIndex(index);
                                                                        setSelectedTicker(ticker);
                                                                    }}
                                                                    className={cn(
                                                                        "cursor-pointer transition-all duration-150 relative",
                                                                        isFocused 
                                                                            ? "bg-blue-50/80 dark:bg-blue-950/30 text-blue-950 dark:text-blue-50 ring-2 ring-blue-500/80 ring-inset font-bold" 
                                                                            : "hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
                                                                    )}
                                                                >
                                                                    <td className="py-4 px-6">
                                                                        <div className="flex items-center gap-3">
                                                                            <StockLogo ticker={ticker} isUs={parsedData.isUs} className="w-7 h-7" />
                                                                            <div className="truncate max-w-[180px]">
                                                                                <div className="font-mono font-black text-zinc-900 dark:text-zinc-100">{ticker}</div>
                                                                                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-normal truncate mt-0.5">{parsedData.name}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-4 text-center">
                                                                        <span className={cn(
                                                                            "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                                                            parsedData.isUs ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                                                                        )}>
                                                                            {parsedData.isUs ? "US" : "KR"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-4">
                                                                        <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20 px-2.5 py-1 rounded-md text-xs">
                                                                            {parsedData.gradeDisplay}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right font-mono font-bold">
                                                                        {parsedData.isUs ? `$${parsedData.curPrice}` : `₩${parsedData.curPrice}`}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                        {parsedData.ncavScore.toFixed(1)}%
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                                                                        {parsedData.per === 0 ? "-" : parsedData.per.toFixed(1)}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-right font-mono text-zinc-600 dark:text-zinc-400">
                                                                        {parsedData.pbr === 0 ? "-" : parsedData.pbr.toFixed(1)}
                                                                    </td>
                                                                    <td className="py-4 px-4 text-center">
                                                                        <div className="inline-flex items-center justify-center">
                                                                            <MiniSparkline data={chartConfig.data} />
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-4 px-6 text-zinc-500 dark:text-zinc-400 text-xs font-normal max-w-[150px] truncate">
                                                                        {parsedData.sector}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }}
                                                    </StockDataWrapper>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </LayoutGroup>

                    {/* 무한 스크롤 트리거 */}
                    {visibleCandidates.length < totalCandidateKeys.length && (
                        <div ref={observerTarget} className="h-40 flex flex-col items-center justify-center mt-6 border-t border-zinc-100 dark:border-zinc-900 gap-2.5">
                            <div className="w-6 h-6 border-2 border-zinc-200 dark:border-zinc-800 border-t-blue-600 rounded-full animate-spin" />
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 tracking-widest font-mono uppercase">Fetching Next Quant Pool...</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* 레이아웃 공용 포탈 상세 팝업 모달 */}
            {selectedTicker && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setSelectedTicker(null)}>
                    <div className="w-full max-w-xl relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setSelectedTicker(null)}
                            className="absolute -top-12 right-0 p-2 bg-zinc-900 text-white rounded-full border border-zinc-800 z-[210]"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                        {(() => {
                            const candidate = activeStrategy.candidates[selectedTicker];
                            return (
                                <StockDataWrapper ticker={selectedTicker} name={candidate?.name || candidate?.symbol || selectedTicker}>
                                    {(parsedData, chartConfig, state) => (
                                        state === "fulfilled" ? (
                                            <div className="relative">
                                                <StockCard 
                                                    isCompact={false} 
                                                    stock={{
                                                        ...parsedData,
                                                        grade: parsedData.gradeRaw
                                                    }} 
                                                    chartConfig={chartConfig} 
                                                />
                                                <div className="absolute top-6 left-6 pointer-events-none">
                                                    <StockLogo ticker={selectedTicker} isUs={parsedData.isUs} className="w-7 h-7" />
                                                </div>
                                            </div>
                                        ) : state === "rejected" ? (
                                            <ErrorStateCard ticker={selectedTicker} />
                                        ) : <CardSkeleton />
                                    )}
                                </StockDataWrapper>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}

const LoadingUI = () => (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 gap-4">
        <div className="relative flex items-center justify-center">
            <CircleStackIcon className="w-14 h-14 text-blue-600 animate-pulse" />
            <div className="absolute w-20 h-20 border-2 border-dashed border-blue-500/30 rounded-full animate-spin [animation-duration:10s]" />
        </div>
        <div className="text-center space-y-1">
            <p className="font-bold text-zinc-800 dark:text-zinc-100 tracking-[0.3em] text-xs uppercase">NCAV ALIGNING ENGINE</p>
            <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">포트폴리오 청산 가치 및 실시간 재무 분석표 분석 중...</p>
        </div>
    </div>
);

const EmptyUI = ({ onRetry }: { onRetry: () => void }) => (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 text-center p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xl">
            <div className="inline-flex p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 mb-5">
                <ExclamationTriangleIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">백테스트 후보군 누락</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                불러온 실시간 NCAV 최신 리스트 풀이 존재하지 않거나 스케줄러가 대기 중입니다. 서버 상태를 다시 확인하세요.
            </p>
            <button
                onClick={onRetry}
                className="w-full py-3.5 bg-zinc-950 dark:bg-white dark:text-zinc-950 hover:opacity-90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
                <ArrowPathIcon className="w-4 h-4" />
                <span>데이터 원천 수집 재시도</span>
            </button>
        </div>
    </div>
);

export default function Page() {
    return (
        <Suspense fallback={<LoadingUI />}>
            <AlgorithmTradeContent />
        </Suspense>
    );
}