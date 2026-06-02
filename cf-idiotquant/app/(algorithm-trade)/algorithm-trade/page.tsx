"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, useRef, useCallback, Suspense, ReactNode } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { AnimatePresence, motion } from "framer-motion";
import {
    LayoutGrid, List, RefreshCw, AlertTriangle, X,
    ChevronUp, ChevronDown, ChevronsUpDown, Loader2,
    Database, Globe2, BarChart3, TrendingUp, Search, Filter,
} from "lucide-react";

import {
    selectStockByTicker, updateStockDetail, setStockState,
    selectNcavDailyDates, selectNcavDailyList,
    reqGetNcavDailyDates, reqGetNcavDailyList,
    reqGetQuantRule,
    setNcavDailySelectedDate, reqDiscoverNcavDates,
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { selectStrategyNcavLatest, reqGetNcavLatest } from "@/lib/features/backtest/backtestSlice";
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

// =========================================================================
// 상수
// =========================================================================
const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];
const PAGE_SIZE = 12;
const DAILY_PAGE_SIZE = 20;
type SortKey = "ticker" | "ncavScore" | "curPrice" | "per" | "pbr";
type SortOrder = "asc" | "desc";

const GRADE_PILL: Record<string, string> = {
    SSS: "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white",
    SS:  "bg-amber-500 text-white",
    S:   "bg-emerald-500 text-white",
    A:   "bg-slate-500 text-white",
    B:   "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
    F:   "bg-red-500 text-white",
};
const gradePill = (g: string) =>
    GRADE_PILL[g] ?? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400";

const STRATEGY_BADGE: Record<string, string> = {
    ncav:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    low_pbr: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    low_per: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
    s_rim:   "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
};
const STRATEGY_LABEL: Record<string, string> = {
    ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
};

// =========================================================================
// 전략 프리셋 + 유틸
// =========================================================================
const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

interface StrategyPreset {
    id: string;
    label: string;
    desc: string;
    criteria: { min_ncav_ratio?: number; max_pbr?: number; min_eps?: number; max_per?: number };
    criteriaChips: { label: string; value: string }[];
    columns: string[];
}

const STRATEGY_PRESETS: StrategyPreset[] = [
    {
        id: "ncav", label: "NCAV", desc: "그레이엄 청산가치 기준",
        criteria: { min_ncav_ratio: 1.0 },
        criteriaChips: [{ label: "NCAV 비율", value: "≥ 1.0x" }],
        columns: ["NCAV 업사이드"],
    },
    {
        id: "low_pbr", label: "저PBR", desc: "PBR 0.5 미만 저평가",
        criteria: { max_pbr: 0.5 },
        criteriaChips: [{ label: "PBR", value: "< 0.5x" }],
        columns: ["PBR"],
    },
    {
        id: "low_per", label: "저PER", desc: "PER 10 미만 수익성 종목",
        criteria: { max_per: 10 },
        criteriaChips: [{ label: "PER", value: "< 10x" }],
        columns: ["PER"],
    },
    {
        id: "s_rim", label: "S-RIM", desc: "ROE > 8% & PBR < 1.0 복합 가치",
        criteria: {},
        criteriaChips: [{ label: "ROE", value: "> 8%" }, { label: "PBR", value: "< 1.0x" }],
        columns: ["ROE", "PBR"],
    },
];

// =========================================================================
// StockLogo
// =========================================================================
const StockLogo = ({ ticker, isUs, className }: { ticker: string; isUs: boolean; className?: string }) => {
    const [imgError, setImgError] = useState(false);
    const logoUrl = useMemo(() =>
        isUs
            ? `https://img.logo.dev/ticker/${ticker}?token=${process.env.NEXT_PUBLIC_CLEARBIT_API_KEY}&size=200`
            : `${process.env.NEXT_PUBLIC_KR_LOGO_API}/${ticker}`,
    [ticker, isUs]);

    if (imgError) {
        return (
            <div className={cn(
                "rounded-xl flex items-center justify-center text-[10px] font-black text-white shrink-0 select-none",
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
            alt={ticker}
            className={cn("rounded-xl object-cover bg-white border border-zinc-200/60 dark:border-zinc-800 shrink-0", className)}
            onError={() => setImgError(true)}
        />
    );
};

// =========================================================================
// StockDataWrapper — 데이터 패칭 로직 (변경 없음)
// =========================================================================
const StockDataWrapper = ({
    ticker, name, onDataLoaded, children,
}: {
    ticker: string;
    name: string;
    onDataLoaded?: (ticker: string, data: any) => void;
    children: (parsedData: any, chartConfig: any, state: string) => ReactNode;
}) => {
    const dispatch = useAppDispatch();
    const isUs = useMemo(() => us_tickers.includes(ticker.toUpperCase()), [ticker]);
    const data = useAppSelector((state) => selectStockByTicker(state, ticker));

    const dataRef = useRef(data);
    dataRef.current = data;

    useEffect(() => {
        if (dataRef.current?.state === "fulfilled" || dataRef.current?.state === "pending") return;

        dispatch(setStockState({ ticker, status: "pending" }));

        const fetchData = async () => {
            try {
                const upper = ticker.toUpperCase();
                let payload: any = { ticker, name, isUs };
                if (isUs) {
                    const [finnhub, detail, search, daily] = await Promise.all([
                        dispatch(reqGetFinnhubUsFinancialsReported(upper)).unwrap(),
                        dispatch(reqGetQuotationsPriceDetail({ PDNO: upper })).unwrap(),
                        dispatch(reqGetQuotationsSearchInfo({ PDNO: upper })).unwrap(),
                        dispatch(reqGetOverseasPriceQuotationsDailyPrice({ PDNO: upper, FID_INPUT_DATE_1: new Date().toISOString().split('T')[0].replaceAll("-", "") })).unwrap(),
                    ]);
                    payload = { ...payload, finnhubData: finnhub, usDetail: detail, usSearchInfo: search, usDaily: daily };
                } else {
                    const json = (corpCodeJson as any)[name] || Object.values(corpCodeJson).find((v: any) => (v as any).stock_code === ticker);
                    const code = json?.stock_code || ticker;
                    const [price, bs, is, chart] = await Promise.all([
                        dispatch(reqGetInquirePrice({ PDNO: code })).unwrap(),
                        dispatch(reqGetBalanceSheet({ PDNO: code })).unwrap(),
                        dispatch(reqGetIncomeStatement({ PDNO: code })).unwrap(),
                        dispatch(reqGetInquireDailyItemChartPrice({ PDNO: code, FID_INPUT_DATE_1: "20240101", FID_INPUT_DATE_2: new Date().toISOString().split('T')[0].replaceAll("-", "") })).unwrap(),
                    ]);
                    payload = { ...payload, kiPrice: price, kiBS: bs, kiIS: is, kiChart: chart };
                }
                dispatch(updateStockDetail({ ticker, data: { ...payload, state: "fulfilled" } }));
            } catch {
                dispatch(setStockState({ ticker, status: "rejected" }));
            }
        };

        fetchData();
    }, [ticker, name, isUs, dispatch]);

    const chartConfig = useMemo(() => {
        if (!data || data.state !== "fulfilled") return { data: [], categories: [], color: '#3b82f6' };
        const isUsMarket = data.isUs === true;
        const raw = isUsMarket ? data.usDaily?.output2 : data.kiChart?.output2;
        return {
            data: raw?.map((i: any) => Number(isUsMarket ? i.clos : i.stck_clpr)).reverse() || [],
            categories: raw?.map((i: any) => (isUsMarket ? i.xymd : i.stck_bsop_date)).reverse() || [],
            color: isUsMarket ? '#3b82f6' : '#6366f1',
        };
    }, [data]);

    const parsedData = useMemo(() => {
        if (!data || data.state !== "fulfilled") return null;
        const rawGrade = data.isUs
            ? getUsNcavGrade(data.finnhubData, data.usDetail)
            : getKrNcavGrade(data.kiBS, data.kiChart);
        const gradeDisplay = rawGrade && typeof rawGrade === "object"
            ? (rawGrade.grade || "N/A") : (rawGrade || "N/A");

        return data.isUs ? {
            code: ticker, isUs: true, name, ticker: name,
            gradeRaw: rawGrade, gradeDisplay,
            curPriceNum: Number(data?.usDetail?.output?.last ?? 0),
            curPrice: Number(data?.usDetail?.output?.last ?? 0).toFixed(2),
            ncavScore: Number(calculateUsNcavRatio(data.finnhubData, data.usDetail) || 0),
            per: Number(data?.usDetail?.output?.perx ?? 0),
            pbr: Number(data?.usDetail?.output?.pbrx ?? 0),
            sector: data?.usDetail?.output?.e_icod ?? "DEFAULT",
        } : {
            code: ticker, isUs: false, name, ticker: (corpCodeJson as any)?.[name]?.stock_code ?? '',
            gradeRaw: rawGrade, gradeDisplay,
            curPriceNum: Number(data?.kiPrice?.output?.stck_prpr ?? 0),
            curPrice: Number(data?.kiPrice?.output?.stck_prpr ?? 0).toLocaleString(),
            ncavScore: Number(calculateKrNcavRatio(data.kiBS, data.kiChart) || 0),
            per: Number(data?.kiPrice?.output?.per ?? 0),
            pbr: Number(data?.kiPrice?.output?.pbr ?? 0),
            sector: data?.kiPrice?.output?.bstp_kor_isnm ?? "DEFAULT",
        };
    }, [data, ticker, name]);

    useEffect(() => {
        if (parsedData && onDataLoaded) onDataLoaded(ticker, parsedData);
    }, [parsedData, ticker, onDataLoaded]);

    return <>{children(parsedData, chartConfig, data?.state || "idle")}</>;
};

// =========================================================================
// MiniSparkline
// =========================================================================
const MiniSparkline = ({ data }: { data: number[] }) => {
    if (!data || data.length < 2) return <div className="h-6 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    const W = 80; const H = 24;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(" ");
    return (
        <svg width={W} height={H} className="overflow-visible shrink-0">
            <polyline fill="none" stroke={data[data.length - 1] >= data[0] ? "#ef4444" : "#3b82f6"}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts} />
        </svg>
    );
};

// =========================================================================
// CompactCard — 그리드 뷰용 정보 밀도 카드
// =========================================================================
const CompactCard = ({
    ticker, isFocused, onClick, parsedData, chartConfig,
}: {
    ticker: string; isFocused: boolean; onClick: () => void;
    parsedData: any; chartConfig: any;
}) => {
    const barW = Math.min(Math.max(parsedData.ncavScore, 0), 100);
    const barColor = parsedData.ncavScore > 50 ? "bg-emerald-500"
        : parsedData.ncavScore > 0 ? "bg-amber-400" : "bg-zinc-200 dark:bg-zinc-700";

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative bg-white dark:bg-zinc-900 rounded-2xl border cursor-pointer select-none",
                "transition-all duration-150 p-5 flex flex-col gap-4",
                "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm",
                isFocused
                    ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md"
                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <StockLogo ticker={ticker} isUs={parsedData.isUs} className="w-9 h-9 shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono font-black text-sm text-zinc-900 dark:text-white tracking-tight">
                                {ticker}
                            </span>
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0",
                                parsedData.isUs
                                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
                                    : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                            )}>
                                {parsedData.isUs ? "US" : "KR"}
                            </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate font-medium leading-tight">
                            {parsedData.name}
                        </p>
                    </div>
                </div>
                <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-black font-mono shrink-0 shadow-sm",
                    gradePill(parsedData.gradeDisplay)
                )}>
                    {parsedData.gradeDisplay}
                </span>
            </div>

            <div>
                <p className="text-[22px] font-black font-mono text-zinc-900 dark:text-white tracking-tight leading-none">
                    {parsedData.isUs ? `$${parsedData.curPrice}` : `₩${parsedData.curPrice}`}
                </p>
                <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider font-semibold">현재가</p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">NCAV 업사이드</span>
                    <span className={cn(
                        "text-xs font-black font-mono tabular-nums",
                        parsedData.ncavScore > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                    )}>
                        {parsedData.ncavScore > 0 ? "+" : ""}{parsedData.ncavScore.toFixed(1)}%
                    </span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-[width] duration-700", barColor)}
                        style={{ width: `${barW}%` }} />
                </div>
            </div>

            <div className="flex items-end justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex gap-5">
                    {[{ label: "PER", val: parsedData.per }, { label: "PBR", val: parsedData.pbr }].map(m => (
                        <div key={m.label}>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">{m.label}</p>
                            <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">
                                {m.val === 0 ? "—" : `${m.val.toFixed(1)}x`}
                            </p>
                        </div>
                    ))}
                </div>
                <MiniSparkline data={chartConfig.data} />
            </div>
        </div>
    );
};

// =========================================================================
// 스켈레톤 / 에러
// =========================================================================
const CardSkeleton = () => (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 flex flex-col gap-4 animate-pulse">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <div className="space-y-1.5">
                    <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-28 bg-zinc-100 dark:bg-zinc-700 rounded" />
                </div>
            </div>
            <div className="h-6 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        </div>
        <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="space-y-1.5">
            <div className="flex justify-between">
                <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-700 rounded" />
                <div className="h-3 w-10 bg-zinc-100 dark:bg-zinc-700 rounded" />
            </div>
            <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full" />
        </div>
        <div className="flex justify-between items-end pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-5">
                <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded" />
                <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded" />
            </div>
            <div className="h-6 w-20 bg-zinc-100 dark:bg-zinc-800 rounded" />
        </div>
    </div>
);

const ErrorCard = ({ ticker }: { ticker: string }) => (
    <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[200px]">
        <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl text-red-400">
            <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 font-mono">{ticker}</p>
            <p className="text-xs text-zinc-400 mt-0.5">데이터를 불러올 수 없습니다.</p>
        </div>
    </div>
);

// =========================================================================
// 메인 컴포넌트
// =========================================================================
function AlgorithmTradeContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();

    const strategyNcavLatest = useAppSelector(selectStrategyNcavLatest);
    const ncavDailyDates = useAppSelector(selectNcavDailyDates);
    const ncavDailyList = useAppSelector(selectNcavDailyList);
    const ncavDailySelectedDate = ncavDailyDates.selectedDate;
    const currentStrategyId = searchParams.get("strategy");

    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
    const [dailyDisplayCount, setDailyDisplayCount] = useState(DAILY_PAGE_SIZE);
    const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<"card" | "table">("card");
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [sortKey, setSortKey] = useState<SortKey>("ticker");
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
    const [loadedDataMap, setLoadedDataMap] = useState<Record<string, any>>({});
    const [mainTab, setMainTab] = useState<"discovery" | "strategy">("discovery");
    const [marketTab, setMarketTab] = useState<"kr" | "us">("kr");
    const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
    const [excludeHoldings, setExcludeHoldings] = useState(false);
    const [excludeJiju, setExcludeJiju] = useState(false);
    const [excludePreferred, setExcludePreferred] = useState(false);
    const [excludeSpac, setExcludeSpac] = useState(false);
    const [excludeDeficit, setExcludeDeficit] = useState(false);
    const [ncavPositiveOnly, setNcavPositiveOnly] = useState(false);
    const [minMarketCap, setMinMarketCap] = useState(0);
    const [manualDateInput, setManualDateInput] = useState("");

    const listRef = useRef<HTMLDivElement>(null);
    const hasDiscovered = useRef(false);

    useEffect(() => { dispatch(reqGetNcavLatest()); dispatch(reqGetQuantRule()); }, [dispatch]);

    useEffect(() => {
        dispatch(reqGetNcavDailyDates());
        dispatch(reqGetNcavDailyList("latest"));
    }, [dispatch]);

    useEffect(() => {
        if (
            ncavDailyList.state === "fulfilled" &&
            ncavDailyList.scanDate &&
            !hasDiscovered.current &&
            ncavDailyDates.dates.length < 2
        ) {
            hasDiscovered.current = true;
            dispatch(reqDiscoverNcavDates(ncavDailyList.scanDate));
        }
    }, [ncavDailyList.state, ncavDailyList.scanDate, ncavDailyDates.dates.length, dispatch]);

    useEffect(() => {
        setDisplayCount(PAGE_SIZE);
        setSelectedTicker(null);
        setFocusedIndex(0);
        setLoadedDataMap({});
        setMarketTab("kr");
    }, [currentStrategyId]);

    useEffect(() => {
        setDisplayCount(PAGE_SIZE);
        setFocusedIndex(0);
    }, [marketTab]);

    useEffect(() => {
        setDailyDisplayCount(DAILY_PAGE_SIZE);
        setDisplayCount(PAGE_SIZE);
        setSelectedTicker(null);
    }, [mainTab]);

    useEffect(() => {
        setDailyDisplayCount(DAILY_PAGE_SIZE);
    }, [ncavDailySelectedDate]);

    const activeStrategy = useMemo(() => {
        const list = strategyNcavLatest?.list;
        if (!list?.length) return null;
        return currentStrategyId ? list.find(s => s.strategyId === currentStrategyId) ?? list[0] : list[0];
    }, [strategyNcavLatest, currentStrategyId]);

    const totalCandidateKeys = useMemo(() =>
        activeStrategy?.candidates ? Object.keys(activeStrategy.candidates) : [],
    [activeStrategy]);

    const activePreset = useMemo(
        () => STRATEGY_PRESETS.find(p => p.id === activeStrategyId) ?? null,
        [activeStrategyId]
    );

    const filteredDailyList = useMemo(() => {
        let list = ncavDailyList.list;
        if (excludeHoldings)  list = list.filter(item => !item.name?.includes("홀딩스"));
        if (excludeJiju)      list = list.filter(item => !item.name?.includes("지주"));
        if (excludePreferred) list = list.filter(item => !/\d*우[A-D]?$/.test(item.name ?? ""));
        if (excludeSpac)      list = list.filter(item => !item.name?.includes("스팩"));
        if (excludeDeficit)   list = list.filter(item => safeNum(item.eps) > 0);
        if (ncavPositiveOnly) list = list.filter(item => safeNum(item.ncav_ratio) >= 1);
        if (minMarketCap > 0) list = list.filter(item => safeNum(item.market_cap) >= minMarketCap);
        if (activeStrategyId) {
            list = list.filter(item => (item.strategies ?? []).includes(activeStrategyId));
        }
        return list;
    }, [ncavDailyList.list, excludeHoldings, excludeJiju, excludePreferred, excludeSpac, excludeDeficit, ncavPositiveOnly, minMarketCap, activeStrategyId]);

    const krCandidateEntries = useMemo(() => {
        if (!activeStrategy?.candidates) return [] as [string, any][];
        return Object.entries(activeStrategy.candidates).filter(([t]) => !us_tickers.includes(t.toUpperCase()));
    }, [activeStrategy]);

    const usCandidateEntries = useMemo(() => {
        if (!activeStrategy?.candidates) return [] as [string, any][];
        return Object.entries(activeStrategy.candidates).filter(([t]) => us_tickers.includes(t.toUpperCase()));
    }, [activeStrategy]);

    const marketDist = { kr: krCandidateEntries.length, us: usCandidateEntries.length };
    const activeMarketEntries = marketTab === "kr" ? krCandidateEntries : usCandidateEntries;

    const handleDataLoaded = useCallback((ticker: string, d: any) => {
        setLoadedDataMap(prev => {
            if (prev[ticker]?.ncavScore === d.ncavScore && prev[ticker]?.curPriceNum === d.curPriceNum) return prev;
            return { ...prev, [ticker]: d };
        });
    }, []);

    const visibleCandidates = useMemo(() => {
        const raw = activeMarketEntries.slice(0, displayCount);
        if (viewMode !== "table") return raw;
        return [...raw].sort((a, b) => {
            const [ta, tb] = [a[0], b[0]];
            if (sortKey === "ticker") return sortOrder === "asc" ? ta.localeCompare(tb) : tb.localeCompare(ta);
            const da = loadedDataMap[ta]; const db = loadedDataMap[tb];
            if (!da && !db) return 0;
            if (!da) return 1; if (!db) return -1;
            const get = (d: any) => ({
                ncavScore: d.ncavScore, curPrice: d.curPriceNum, per: d.per, pbr: d.pbr,
            }[sortKey] ?? 0);
            return sortOrder === "asc" ? get(da) - get(db) : get(db) - get(da);
        });
    }, [activeMarketEntries, displayCount, viewMode, sortKey, sortOrder, loadedDataMap]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") return;
            const max = visibleCandidates.length - 1;
            if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex(p => Math.min(p + 1, max)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex(p => Math.max(p - 1, 0)); }
            else if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!selectedTicker && visibleCandidates[focusedIndex]) setSelectedTicker(visibleCandidates[focusedIndex][0]);
            }
            else if (e.key === "Escape") { e.preventDefault(); setSelectedTicker(null); }
            else if (["v", "V", "ㅔ"].includes(e.key) || e.code === "KeyV") {
                e.preventDefault();
                setViewMode(p => p === "card" ? "table" : "card");
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [visibleCandidates, focusedIndex, selectedTicker]);

    useEffect(() => {
        if (!listRef.current) return;
        const sel = viewMode === "table" ? "tbody tr" : "[data-card]";
        const items = listRef.current.querySelectorAll(sel);
        (items[focusedIndex] as HTMLElement)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [focusedIndex, viewMode]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortOrder(p => p === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortOrder("desc"); }
    };

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 transition-opacity" />;
        return sortOrder === "asc"
            ? <ChevronUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            : <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
    };

    if (strategyNcavLatest.state === "pending") return <LoadingUI />;
    if (!activeStrategy) return <EmptyUI onRetry={() => dispatch(reqGetNcavLatest())} />;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">

                {/* ── 헤더 ── */}
                <header>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1.5">
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-mono">
                                자동매매 / Graham NCAV
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                                알고리즘 트레이드
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                                그레이엄의 청산가치 기준으로 국내 저평가 종목을 발굴하고 전략별 후보를 관리합니다.
                            </p>
                        </div>

                        {mainTab === "strategy" && (
                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                                <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 font-mono">
                                    <span className="text-zinc-300 dark:text-zinc-600 text-[10px] font-bold uppercase tracking-wider mr-0.5">단축키</span>
                                    {[["V", "뷰 전환"], ["↑↓", "이동"], ["Enter", "열기"], ["Esc", "닫기"]].map(([k, v]) => (
                                        <span key={k} className="flex items-center gap-1">
                                            <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-[10px] font-black text-zinc-600 dark:text-zinc-300">{k}</kbd>
                                            <span className="text-zinc-400 text-[10px]">{v}</span>
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center p-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                    {([["card", <LayoutGrid key="g" className="w-3.5 h-3.5" />, "카드"] as const,
                                       ["table", <List key="l" className="w-3.5 h-3.5" />, "테이블"] as const]).map(([mode, icon, label]) => (
                                        <button key={mode} onClick={() => setViewMode(mode)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                                                viewMode === mode
                                                    ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 shadow-sm"
                                                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                                            )}>
                                            {icon}{label}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => dispatch(reqGetNcavLatest())}
                                    className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                                    title="새로고침"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* ── 최상위 탭: 종목 발굴 | 전략 후보 ── */}
                <div className="flex items-center gap-2">
                    {([
                        { id: "discovery" as const, label: "종목 발굴", count: ncavDailyList.list.length },
                        { id: "strategy"  as const, label: "전략 후보", count: totalCandidateKeys.length },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMainTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all",
                                mainTab === tab.id
                                    ? "bg-zinc-950 dark:bg-white border-zinc-950 dark:border-white text-white dark:text-zinc-950 shadow-sm"
                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                        >
                            {tab.label}
                            <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-mono font-black",
                                mainTab === tab.id ? "bg-white/20 dark:bg-zinc-900/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                            )}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* ── 전략 후보 탭 전용: 전략 서브탭 + KPI + 마켓 토글 ── */}
                {mainTab === "strategy" && (<>

                <nav className="flex flex-wrap gap-2">
                    {strategyNcavLatest?.list?.map((s) => {
                        const isActive = activeStrategy.strategyId === s.strategyId;
                        const count = s.candidates ? Object.keys(s.candidates).length : 0;
                        return (
                            <button key={s.strategyId}
                                onClick={() => {
                                    const p = new URLSearchParams(searchParams.toString());
                                    p.set("strategy", s.strategyId);
                                    router.push(`?${p.toString()}`, { scroll: false });
                                }}
                                className={cn(
                                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all",
                                    isActive
                                        ? "bg-zinc-950 dark:bg-white border-zinc-950 dark:border-white text-white dark:text-zinc-950 shadow-sm"
                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200"
                                )}>
                                <span>{s.name}</span>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-mono font-black",
                                    isActive ? "bg-white/20 dark:bg-zinc-900/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                                )}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <section className="grid grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex items-center gap-3 shadow-sm">
                        <div className="p-2.5 rounded-xl shrink-0 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            <Database className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">전체 후보</p>
                            <p className="text-xl font-black font-mono mt-0.5 tracking-tight text-zinc-600 dark:text-zinc-400">
                                {totalCandidateKeys.length}
                                <span className="text-xs font-normal text-zinc-400 ml-1">개사</span>
                            </p>
                        </div>
                    </div>
                    {([
                        { id: "kr" as const, label: "국내 (KR)", value: marketDist.kr, icon: <BarChart3 className="w-4 h-4" />, activeColor: "text-indigo-600 dark:text-indigo-400", activeBg: "bg-indigo-50 dark:bg-indigo-950/30", activeRing: "ring-2 ring-indigo-300 dark:ring-indigo-800 border-indigo-300 dark:border-indigo-700", legacy: false },
                        { id: "us" as const, label: "미국 (US)", value: marketDist.us, icon: <Globe2 className="w-4 h-4" />, activeColor: "text-blue-600 dark:text-blue-400", activeBg: "bg-blue-50 dark:bg-blue-950/30", activeRing: "ring-2 ring-blue-300 dark:ring-blue-800 border-blue-300 dark:border-blue-700", legacy: true },
                    ] as const).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setMarketTab(tab.id)}
                            className={cn(
                                "bg-white dark:bg-zinc-900 border rounded-2xl p-4 sm:p-5 flex items-center gap-3 shadow-sm cursor-pointer transition-all text-left",
                                marketTab === tab.id
                                    ? tab.activeRing
                                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                        >
                            <div className={cn("p-2.5 rounded-xl shrink-0", tab.activeBg, tab.activeColor)}>{tab.icon}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{tab.label}</p>
                                    {tab.legacy && (
                                        <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-black rounded uppercase tracking-wide">
                                            레거시
                                        </span>
                                    )}
                                </div>
                                <p className={cn("text-xl font-black font-mono mt-0.5 tracking-tight", tab.activeColor)}>
                                    {tab.value}
                                    <span className="text-xs font-normal text-zinc-400 ml-1">개사</span>
                                </p>
                            </div>
                        </button>
                    ))}
                </section>

                </>)}

                {/* ── 콘텐츠 ── */}
                <div ref={listRef}>

                    {/* 전략 후보 뷰 */}
                    {mainTab === "strategy" && (<>

                    {activeMarketEntries.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                            <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                                <TrendingUp className="w-8 h-8 text-zinc-400" />
                            </div>
                            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                                {marketTab === "kr" ? "국내" : "미국"} 후보 종목이 없습니다.
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">전략을 변경하거나 나중에 다시 확인해 보세요.</p>
                        </div>
                    )}

                    {viewMode === "card" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {visibleCandidates.map(([ticker, candidate], idx) => (
                                <div key={`card-${activeStrategy.strategyId}-${ticker}`} data-card>
                                    <StockDataWrapper
                                        ticker={ticker}
                                        name={candidate.name || candidate.symbol || ticker}
                                    >
                                        {(parsedData, chartConfig, state) =>
                                            state === "fulfilled" && parsedData ? (
                                                <CompactCard
                                                    ticker={ticker}
                                                    isFocused={focusedIndex === idx}
                                                    onClick={() => { setFocusedIndex(idx); setSelectedTicker(ticker); }}
                                                    parsedData={parsedData}
                                                    chartConfig={chartConfig}
                                                />
                                            ) : state === "rejected" ? (
                                                <ErrorCard ticker={ticker} />
                                            ) : <CardSkeleton />
                                        }
                                    </StockDataWrapper>
                                </div>
                            ))}
                        </div>
                    )}

                    {viewMode === "table" && (
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                                            {([
                                                { key: "ticker", label: "티커 / 종목명", align: "" },
                                                { key: null, label: "시장", align: "text-center" },
                                                { key: null, label: "등급", align: "" },
                                                { key: "curPrice", label: "현재가", align: "text-right" },
                                                { key: "ncavScore", label: "NCAV 업사이드", align: "text-right" },
                                                { key: "per", label: "PER", align: "text-right" },
                                                { key: "pbr", label: "PBR", align: "text-right" },
                                                { key: null, label: "추세", align: "text-center" },
                                                { key: null, label: "섹터", align: "" },
                                            ] as { key: SortKey | null; label: string; align: string }[]).map(({ key, label, align }) => (
                                                <th key={label}
                                                    onClick={key ? () => toggleSort(key) : undefined}
                                                    className={cn(
                                                        "py-3.5 px-4 text-[10px] font-black text-zinc-400 uppercase tracking-wider select-none",
                                                        align,
                                                        key && "cursor-pointer group hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                                    )}>
                                                    {key ? (
                                                        <span className="inline-flex items-center gap-1 justify-end">
                                                            {label}
                                                            <SortIcon k={key} />
                                                        </span>
                                                    ) : label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                        {visibleCandidates.map(([ticker, candidate], idx) => (
                                            <StockDataWrapper
                                                key={`row-${ticker}`}
                                                ticker={ticker}
                                                name={candidate.name || candidate.symbol || ticker}
                                                onDataLoaded={handleDataLoaded}
                                            >
                                                {(parsedData, chartConfig, state) => {
                                                    if (state === "pending" || state === "idle") return (
                                                        <tr className="animate-pulse">
                                                            <td className="py-4 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                                                                    <div className="space-y-1.5">
                                                                        <div className="h-3.5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                                                        <div className="h-3 w-24 bg-zinc-100 dark:bg-zinc-700 rounded" />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {[...Array(8)].map((_, i) => (
                                                                <td key={i} className="py-4 px-4">
                                                                    <div className="h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded w-full max-w-[60px] ml-auto" />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                    if (state === "rejected") return (
                                                        <tr className="bg-red-50/30 dark:bg-red-950/10">
                                                            <td className="py-3.5 px-4 font-mono font-bold text-red-500 text-sm">{ticker}</td>
                                                            <td colSpan={8} className="py-3.5 px-4 text-xs text-red-400/70">데이터를 불러올 수 없습니다.</td>
                                                        </tr>
                                                    );
                                                    return (
                                                        <tr
                                                            onClick={() => { setFocusedIndex(idx); setSelectedTicker(ticker); }}
                                                            className={cn(
                                                                "cursor-pointer transition-colors duration-100 text-sm",
                                                                focusedIndex === idx
                                                                    ? "bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-500/50 ring-inset"
                                                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                                            )}
                                                        >
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex items-center gap-3">
                                                                    <StockLogo ticker={ticker} isUs={parsedData.isUs} className="w-8 h-8 shrink-0" />
                                                                    <div className="truncate max-w-[160px]">
                                                                        <p className="font-mono font-black text-zinc-900 dark:text-zinc-100 text-sm">{ticker}</p>
                                                                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">{parsedData.name}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-center">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                                                    parsedData.isUs ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
                                                                )}>
                                                                    {parsedData.isUs ? "US" : "KR"}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <span className={cn("px-2.5 py-1 rounded-lg text-[11px] font-black font-mono shadow-sm", gradePill(parsedData.gradeDisplay))}>
                                                                    {parsedData.gradeDisplay}
                                                                </span>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                                                                {parsedData.isUs ? `$${parsedData.curPrice}` : `₩${parsedData.curPrice}`}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                                                                {parsedData.ncavScore > 0 ? "+" : ""}{parsedData.ncavScore.toFixed(1)}%
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">
                                                                {parsedData.per === 0 ? "—" : `${parsedData.per.toFixed(1)}x`}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">
                                                                {parsedData.pbr === 0 ? "—" : `${parsedData.pbr.toFixed(1)}x`}
                                                            </td>
                                                            <td className="py-3.5 px-4">
                                                                <div className="flex justify-center">
                                                                    <MiniSparkline data={chartConfig.data} />
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-4 text-xs text-zinc-400 dark:text-zinc-500 max-w-[140px] truncate">
                                                                {parsedData.sector}
                                                            </td>
                                                        </tr>
                                                    );
                                                }}
                                            </StockDataWrapper>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {visibleCandidates.length < activeMarketEntries.length && (
                        <div className="flex flex-col items-center gap-3 py-8 mt-2">
                            <p className="text-xs text-zinc-400 font-medium">
                                {visibleCandidates.length} / {activeMarketEntries.length}개 표시 중
                            </p>
                            <button
                                onClick={() => setDisplayCount(p => p + PAGE_SIZE)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all shadow-sm"
                            >
                                더 보기
                                <span className="text-xs font-mono text-zinc-400">+{Math.min(PAGE_SIZE, activeMarketEntries.length - visibleCandidates.length)}</span>
                            </button>
                        </div>
                    )}

                    </>)}

                    {/* 종목 발굴 뷰 */}
                    {mainTab === "discovery" && (
                    <div className="space-y-3">
                        {/* 날짜 선택 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {(() => {
                                const latestScanDate = ncavDailyDates.dates[0]?.scan_date ?? ncavDailyList.scanDate;
                                const fmtDate = (d: string) =>
                                    d.length === 8
                                        ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
                                        : d;
                                const isLatestSelected = ncavDailySelectedDate === "latest" || ncavDailySelectedDate === latestScanDate;
                                const otherDates = ncavDailyDates.dates.filter(d => d.scan_date !== latestScanDate);
                                const handleManualDate = () => {
                                    const normalized = manualDateInput.replace(/-/g, "").trim();
                                    if (normalized.length === 8) {
                                        dispatch(setNcavDailySelectedDate(normalized));
                                        dispatch(reqGetNcavDailyList(normalized));
                                        setDailyDisplayCount(DAILY_PAGE_SIZE);
                                        setManualDateInput("");
                                    }
                                };
                                return (<>
                                    <button
                                        onClick={() => {
                                            dispatch(setNcavDailySelectedDate("latest"));
                                            dispatch(reqGetNcavDailyList("latest"));
                                        }}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all",
                                            isLatestSelected
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                                        )}
                                    >
                                        최신
                                        {latestScanDate && (
                                            <span className={cn("text-[10px] font-mono", isLatestSelected ? "text-indigo-200" : "text-zinc-400")}>
                                                {fmtDate(latestScanDate)}
                                            </span>
                                        )}
                                    </button>
                                    {otherDates.map(d => {
                                        const isSelected = ncavDailySelectedDate === d.scan_date;
                                        const stratCnt = activeStrategyId
                                            ? (d as any)[`${activeStrategyId}_cnt`] ?? null
                                            : null;
                                        const displayCnt = stratCnt !== null ? stratCnt : d.total_cnt ?? d.cnt;
                                        return (
                                            <button
                                                key={d.scan_date}
                                                onClick={() => {
                                                    dispatch(setNcavDailySelectedDate(d.scan_date));
                                                    dispatch(reqGetNcavDailyList(d.scan_date));
                                                    setDailyDisplayCount(DAILY_PAGE_SIZE);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all",
                                                    isSelected
                                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                                                )}
                                            >
                                                {fmtDate(d.scan_date)}
                                                <span className={cn("text-[10px] font-mono", isSelected ? "text-indigo-200" : "text-zinc-400")}>
                                                    {displayCnt}개
                                                </span>
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => dispatch(reqGetNcavDailyList(ncavDailySelectedDate))}
                                        className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                                        title="새로고침"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                    {/* 날짜 직접 입력 */}
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            placeholder="YYYYMMDD"
                                            value={manualDateInput}
                                            onChange={e => setManualDateInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") handleManualDate(); }}
                                            className="w-28 px-2.5 py-2 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleManualDate}
                                            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
                                            title="해당 날짜 조회"
                                        >
                                            <Search className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>);
                            })()}
                        </div>
                        {/* 필터 */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="flex items-center gap-1 text-[10px] font-black text-zinc-400 uppercase tracking-wider w-12 shrink-0">
                                    <Filter className="w-3 h-3" />
                                    필터
                                </span>
                                {([
                                    { label: "홀딩스 제외",  active: excludeHoldings,  toggle: () => setExcludeHoldings(p => !p) },
                                    { label: "지주회사 제외", active: excludeJiju,       toggle: () => setExcludeJiju(p => !p) },
                                    { label: "우선주 제외",  active: excludePreferred,  toggle: () => setExcludePreferred(p => !p) },
                                    { label: "스팩 제외",   active: excludeSpac,      toggle: () => setExcludeSpac(p => !p) },
                                    { label: "적자 제외",   active: excludeDeficit,   toggle: () => setExcludeDeficit(p => !p) },
                                    { label: "NCAV 양수만", active: ncavPositiveOnly, toggle: () => setNcavPositiveOnly(p => !p) },
                                ] as const).map(({ label, active, toggle }) => (
                                    <button
                                        key={label}
                                        onClick={() => { toggle(); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                            active
                                                ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider w-12 shrink-0">시총</span>
                                {([
                                    { label: "전체", value: 0 },
                                    { label: "50억+", value: 50 },
                                    { label: "100억+", value: 100 },
                                    { label: "300억+", value: 300 },
                                    { label: "500억+", value: 500 },
                                ] as const).map(({ label, value }) => (
                                    <button
                                        key={label}
                                        onClick={() => { setMinMarketCap(value); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                            minMarketCap === value
                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            {/* 전략 프리셋 */}
                            <div className="flex items-start gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider w-12 shrink-0 mt-1.5">전략</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {STRATEGY_PRESETS.map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => {
                                                setActiveStrategyId(p => p === preset.id ? null : preset.id);
                                                setDailyDisplayCount(DAILY_PAGE_SIZE);
                                            }}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                activeStrategyId === preset.id
                                                    ? "bg-violet-600 border-violet-600 text-white shadow-sm"
                                                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400"
                                            )}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 전략 기준 배너 */}
                        {activePreset && (
                            <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800/40 rounded-xl p-4 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase", STRATEGY_BADGE[activePreset.id])}>
                                        {STRATEGY_LABEL[activePreset.id] ?? activePreset.label}
                                    </span>
                                    <span className="text-[10px] text-zinc-400">{activePreset.desc}</span>
                                    <span className="ml-auto text-[10px] font-medium text-violet-600 dark:text-violet-400">
                                        {filteredDailyList.length}개 종목
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {activePreset.criteriaChips.map(({ label, value }) => (
                                        <div key={label} className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-800/50 rounded-lg px-3 py-1.5">
                                            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{label}</span>
                                            <span className="text-[11px] font-black font-mono text-violet-700 dark:text-violet-300">{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-zinc-400 pt-0.5">백엔드 스캔 시 이 조건을 충족한 종목만 표시됩니다.</p>
                            </div>
                        )}

                    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        {(ncavDailyList.state === "pending" || ncavDailyList.state === "init") ? (
                            <div className="flex items-center justify-center py-16 gap-3">
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                <span className="text-sm text-zinc-400 font-medium">불러오는 중...</span>
                            </div>
                        ) : ncavDailyList.state === "rejected" ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-xl">
                                    <AlertTriangle className="w-7 h-7 text-red-400 dark:text-red-500" />
                                </div>
                                <p className="text-sm font-bold text-red-500 dark:text-red-400">데이터를 불러오지 못했습니다.</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-sm">{ncavDailyList.error ?? "API 오류가 발생했습니다. Worker 배포 상태와 D1 바인딩을 확인해주세요."}</p>
                            </div>
                        ) : ncavDailyList.list.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                                <Database className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">스캔 결과가 없습니다.</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500">아직 D1에 데이터가 저장되지 않았거나 해당 날짜의 결과가 없습니다.</p>
                            </div>
                        ) : filteredDailyList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                                <Filter className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                                <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">필터 조건에 해당하는 종목이 없습니다.</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500">필터를 해제하거나 조건을 변경해 주세요.</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">스캔일</span>
                                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                            {ncavDailyList.scanDate ?? "-"}
                                        </span>
                                    </div>
                                    <span className="text-xs text-zinc-400 font-medium">
                                        {filteredDailyList.length !== ncavDailyList.list.length
                                            ? <>{filteredDailyList.length}<span className="text-zinc-300 dark:text-zinc-600"> / {ncavDailyList.list.length}</span>개 종목</>
                                            : <>{ncavDailyList.list.length}개 종목</>
                                        }
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                                {([
                                                    { label: "티커",          align: "" },
                                                    { label: "종목명",        align: "" },
                                                    { label: "전략",          align: "" },
                                                    { label: "NCAV 업사이드", align: "text-right" },
                                                    { label: "유동자산(억)",  align: "text-right" },
                                                    { label: "총부채(억)",    align: "text-right" },
                                                    { label: "시가총액(억)",  align: "text-right" },
                                                    { label: "현재가",        align: "text-right" },
                                                    { label: "PER",           align: "text-right" },
                                                    { label: "PBR",           align: "text-right" },
                                                    { label: "ROE",           align: "text-right" },
                                                    { label: "EPS",           align: "text-right" },
                                                    { label: "BPS",           align: "text-right" },
                                                ] as { label: string; align: string }[]).map(({ label, align }) => {
                                                    const isStrategy = !!activePreset?.columns.includes(label);
                                                    return (
                                                        <th key={label} className={cn(
                                                            "py-3 px-4 text-[10px] font-black uppercase tracking-wider select-none whitespace-nowrap",
                                                            align,
                                                            isStrategy ? "text-violet-600 dark:text-violet-400" : "text-zinc-400"
                                                        )}>
                                                            <span className="inline-flex items-center gap-1">
                                                                {label}
                                                                {isStrategy && (
                                                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                                                                )}
                                                            </span>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                            {filteredDailyList.slice(0, dailyDisplayCount).map((item) => {
                                                const upsidePct = (safeNum(item.ncav_ratio) - 1) * 100;
                                                const isPositive = upsidePct >= 0;
                                                const strategies: string[] = item.strategies ?? [];
                                                const roePct = item.roe != null ? item.roe * 100 : null;
                                                return (
                                                    <tr key={item.ticker} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors text-sm">
                                                        <td className="py-3 px-4 font-mono font-black text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{item.ticker}</td>
                                                        <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 max-w-[160px] truncate">{item.name}</td>
                                                        <td className="py-3 px-4">
                                                            <div className="flex flex-wrap gap-1">
                                                                {strategies.map(s => (
                                                                    <span key={s} className={cn(
                                                                        "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                                                                        STRATEGY_BADGE[s] ?? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                                    )}>
                                                                        {STRATEGY_LABEL[s] ?? s}
                                                                    </span>
                                                                ))}
                                                                {strategies.length === 0 && (
                                                                    <span className="text-[10px] text-zinc-300 dark:text-zinc-600">—</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={cn(
                                                            "py-3 px-4 text-right font-mono font-black whitespace-nowrap",
                                                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                                                        )}>
                                                            {isPositive ? "+" : ""}{upsidePct.toFixed(1)}%
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                            {safeNum(item.current_assets).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                            {safeNum(item.total_liabilities).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                            {safeNum(item.market_cap).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                            {safeNum(item.last_price) > 0 ? `₩${safeNum(item.last_price).toLocaleString()}` : "—"}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                            {safeNum(item.per) === 0 ? "—" : `${safeNum(item.per).toFixed(1)}x`}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                            {safeNum(item.pbr) === 0 ? "—" : `${safeNum(item.pbr).toFixed(2)}x`}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                            {roePct === null ? "—" : `${roePct.toFixed(1)}%`}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                            {safeNum(item.eps).toLocaleString()}
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                            {safeNum(item.bps).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {dailyDisplayCount < filteredDailyList.length && (
                                    <div className="flex flex-col items-center gap-3 py-6 border-t border-zinc-100 dark:border-zinc-800">
                                        <p className="text-xs text-zinc-400 font-medium">
                                            {dailyDisplayCount} / {filteredDailyList.length}개 표시 중
                                        </p>
                                        <button
                                            onClick={() => setDailyDisplayCount(p => p + DAILY_PAGE_SIZE)}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-750 transition-all"
                                        >
                                            더 보기
                                            <span className="text-xs font-mono text-zinc-400">+{Math.min(DAILY_PAGE_SIZE, filteredDailyList.length - dailyDisplayCount)}</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    </div>
                    )}

                </div>

            </div>

            {/* ── 상세 모달 ── */}
            <AnimatePresence>
                {selectedTicker && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedTicker(null)}
                        />
                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97, y: 8 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div className="relative pointer-events-auto" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => setSelectedTicker(null)}
                                    className="absolute -top-11 right-0 flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl backdrop-blur-md border border-white/10 transition-colors z-10"
                                >
                                    <X className="w-4 h-4" />
                                    닫기
                                </button>
                                {(() => {
                                    const c = activeStrategy.candidates[selectedTicker];
                                    return (
                                        <StockDataWrapper ticker={selectedTicker} name={c?.name || c?.symbol || selectedTicker}>
                                            {(parsedData, chartConfig, state) =>
                                                state === "fulfilled" && parsedData ? (
                                                    <StockCard
                                                        isCompact={false}
                                                        stock={{ ...parsedData, grade: parsedData.gradeRaw }}
                                                        chartConfig={chartConfig}
                                                    />
                                                ) : state === "rejected" ? (
                                                    <ErrorCard ticker={selectedTicker} />
                                                ) : <CardSkeleton />
                                            }
                                        </StockDataWrapper>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// =========================================================================
// 로딩 / 빈 상태
// =========================================================================
const LoadingUI = () => (
    <div className="h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 gap-4">
        <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <div className="text-center space-y-1">
            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">전략 데이터를 불러오는 중입니다</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">NCAV 스크리닝 결과를 가져오는 중...</p>
        </div>
    </div>
);

const EmptyUI = ({ onRetry }: { onRetry: () => void }) => (
    <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="max-w-sm w-full bg-white dark:bg-zinc-900 text-center p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="inline-flex p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400">
                <TrendingUp className="w-7 h-7" />
            </div>
            <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1.5">후보 종목 없음</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    NCAV 스크리닝 결과가 없거나 스케줄러가 아직 실행 중입니다.<br />
                    잠시 후 다시 시도해 주세요.
                </p>
            </div>
            <button onClick={onRetry}
                className="w-full py-3 bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" />
                다시 시도
            </button>
        </div>
    </div>
);

// =========================================================================
// 페이지 내보내기
// =========================================================================
export default function Page() {
    return (
        <Suspense fallback={<LoadingUI />}>
            <AlgorithmTradeContent />
        </Suspense>
    );
}
