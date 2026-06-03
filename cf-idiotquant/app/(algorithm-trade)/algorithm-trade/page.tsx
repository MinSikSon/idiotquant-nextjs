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
import * as Tooltip from "@radix-ui/react-tooltip";

// =========================================================================
// 상수
// =========================================================================
const us_tickers = [...nasdaq_tickers, ...nyse_tickers, ...amex_tickers];
const PAGE_SIZE = 12;
const DAILY_PAGE_SIZE = 20;
type SortKey = "ticker" | "ncavScore" | "curPrice" | "per" | "pbr";
type SortOrder = "asc" | "desc";
type DiscoverySortKey = "ticker" | "ncav_ratio" | "per" | "pbr" | "roe" | "market_cap" | "last_price" | "graham_upside";

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
    ncav:           "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    low_pbr:        "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    low_per:        "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
    s_rim:          "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
    graham_number:  "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400",
    magic_formula:  "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400",
    quality_value:  "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    near_ncav:      "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400",
    balanced_value: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-400",
};
const STRATEGY_LABEL: Record<string, string> = {
    ncav: "NCAV", low_pbr: "저PBR", low_per: "저PER", s_rim: "S-RIM",
    graham_number: "그레이엄", magic_formula: "마법공식", quality_value: "퀄리티",
    near_ncav: "NCAV근접", balanced_value: "균형가치",
};
const STRATEGY_ACTIVE_CLS: Record<string, string> = {
    ncav:           "bg-emerald-600 border-emerald-600 text-white shadow-sm",
    low_pbr:        "bg-blue-600 border-blue-600 text-white shadow-sm",
    low_per:        "bg-orange-500 border-orange-500 text-white shadow-sm",
    s_rim:          "bg-violet-600 border-violet-600 text-white shadow-sm",
    graham_number:  "bg-teal-600 border-teal-600 text-white shadow-sm",
    magic_formula:  "bg-rose-600 border-rose-600 text-white shadow-sm",
    quality_value:  "bg-amber-500 border-amber-500 text-white shadow-sm",
    near_ncav:      "bg-indigo-600 border-indigo-600 text-white shadow-sm",
    balanced_value: "bg-cyan-600 border-cyan-600 text-white shadow-sm",
};
const STRATEGY_DOT_CLS: Record<string, string> = {
    ncav: "bg-emerald-500", low_pbr: "bg-blue-500", low_per: "bg-orange-400", s_rim: "bg-violet-500",
    graham_number: "bg-teal-500", magic_formula: "bg-rose-500", quality_value: "bg-amber-400",
    near_ncav: "bg-indigo-500", balanced_value: "bg-cyan-500",
};

// =========================================================================
// 전략 프리셋 + 유틸
// =========================================================================
const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

interface StrategyPreset {
    id: string;
    label: string;
    desc: string;
    hint: string;
    criteria: { min_ncav_ratio?: number; max_pbr?: number; min_eps?: number; max_per?: number };
    criteriaChips: { label: string; value: string }[];
    columns: string[];
    clientFilter?: (item: Record<string, any>) => boolean;
}

const STRATEGY_PRESETS: StrategyPreset[] = [
    {
        id: "ncav", label: "NCAV", desc: "그레이엄 청산가치 기준",
        hint: "유동자산 − 총부채 > 시가총액이면 청산 시 주주가 이익. NCAV 비율 ≥ 1.0은 시장가가 청산가치 이하임을 의미. 벤 그레이엄의 가장 보수적인 매수 기준.",
        criteria: { min_ncav_ratio: 1.0 },
        criteriaChips: [{ label: "NCAV 비율", value: "≥ 1.0x" }],
        columns: ["NCAV 업사이드"],
    },
    {
        id: "low_pbr", label: "저PBR", desc: "PBR 0.5 미만 저평가",
        hint: "주가가 장부가치(BPS) 대비 얼마나 싼지 나타냄. PBR 0.5 미만은 순자산의 절반도 안 되는 가격에 거래 중임을 뜻함. BPS = 자기자본 ÷ 발행주식수.",
        criteria: { max_pbr: 0.5 },
        criteriaChips: [{ label: "PBR", value: "< 0.5x" }],
        columns: ["PBR"],
    },
    {
        id: "low_per", label: "저PER", desc: "PER 10 미만 수익성 종목",
        hint: "현재 이익 수준 대비 주가가 낮을수록 저평가. PER 10 미만이면 이익의 10배 이하에 매수 가능. EPS > 0(흑자) 조건을 병행해 적자 기업을 제외.",
        criteria: { max_per: 10 },
        criteriaChips: [{ label: "PER", value: "< 10x" }, { label: "EPS", value: "> 0" }],
        columns: ["PER"],
    },
    {
        id: "s_rim", label: "S-RIM", desc: "초과이익모델 — ROE > 8% & PBR < 1.0",
        hint: "ROE(자본수익률)가 요구수익률(Ke=8%)을 초과할 때 내재가치가 장부가치보다 높아짐. PBR < 1.0이면 내재가치 대비 할인된 상태. 공식: 적정가치 = BPS × (ROE / Ke).",
        criteria: {},
        criteriaChips: [{ label: "ROE", value: "> 8%" }, { label: "PBR", value: "< 1.0x" }],
        columns: ["ROE", "PBR"],
    },
    {
        id: "graham_number", label: "그레이엄 넘버", desc: "PER × PBR < 22.5",
        hint: "벤 그레이엄의 복합 안전마진 공식: √(22.5 × EPS × BPS). 현재가가 이 값 미만이면 매수 적정. PER × PBR < 22.5와 동치이며, 두 지표를 곱으로 평가해 단독 기준보다 유연함. EPS·BPS 모두 양수 조건 필요.",
        criteria: {},
        criteriaChips: [{ label: "PER × PBR", value: "< 22.5" }, { label: "EPS·BPS", value: "> 0" }],
        columns: ["PER", "PBR"],
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.bps) > 0 &&
            safeNum(item.per) > 0 && safeNum(item.pbr) > 0 &&
            safeNum(item.per) * safeNum(item.pbr) < 22.5,
    },
    {
        id: "magic_formula", label: "마법공식", desc: "Greenblatt — PER < 15 & ROE > 10%",
        hint: "Greenblatt 마법공식의 변형. 수익수익률(1/PER)이 높고 자본효율(ROE)도 좋은 종목 — 싸고 잘 버는 기업. PER < 15(수익률 > 6.7%), ROE = EPS/BPS × 100 > 10% 기준.",
        criteria: {},
        criteriaChips: [{ label: "PER", value: "< 15x" }, { label: "ROE", value: "> 10%" }, { label: "EPS", value: "> 0" }],
        columns: ["PER", "ROE"],
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.per) > 0 && safeNum(item.per) < 15 &&
            safeNum(item.bps) > 0 && (safeNum(item.eps) / safeNum(item.bps)) * 100 > 10,
    },
    {
        id: "quality_value", label: "퀄리티 밸류", desc: "ROE > 15% & PBR < 2.0",
        hint: "높은 ROE(>15%)로 경쟁력이 증명된 기업 중 PBR 2.0 미만으로 아직 고평가되지 않은 종목. 워런 버핏 스타일의 퀄리티 + 밸류 복합 기준.",
        criteria: {},
        criteriaChips: [{ label: "ROE", value: "> 15%" }, { label: "PBR", value: "< 2.0x" }, { label: "EPS", value: "> 0" }],
        columns: ["ROE", "PBR"],
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.bps) > 0 &&
            (safeNum(item.eps) / safeNum(item.bps)) * 100 > 15 &&
            safeNum(item.pbr) > 0 && safeNum(item.pbr) < 2.0,
    },
    {
        id: "near_ncav", label: "NCAV 근접", desc: "청산가치 70~100% 구간",
        hint: "NCAV 비율 0.7~1.0 — 청산가치엔 미달하지만 근접한 종목. NCAV 기준 진입 전 관찰 목록으로 활용하거나 안전마진이 점차 확보되는 과정을 추적할 때 유용.",
        criteria: {},
        criteriaChips: [{ label: "NCAV 비율", value: "0.7x ~ 1.0x" }],
        columns: ["NCAV 업사이드"],
        clientFilter: (item) => safeNum(item.ncav_ratio) >= 0.7 && safeNum(item.ncav_ratio) < 1.0,
    },
    {
        id: "balanced_value", label: "균형 가치", desc: "PER 5~15 & PBR < 1.5",
        hint: "너무 싸서 문제가 있거나(PER < 5) 너무 비싼 종목을 제외한 균형 가치 구간. PER 5~15, PBR < 1.5, 흑자(EPS > 0) 조건으로 적정가치 + 저평가 기업을 동시에 스크리닝.",
        criteria: {},
        criteriaChips: [{ label: "PER", value: "5x ~ 15x" }, { label: "PBR", value: "< 1.5x" }, { label: "EPS", value: "> 0" }],
        columns: ["PER", "PBR"],
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.per) > 5 && safeNum(item.per) < 15 &&
            safeNum(item.pbr) > 0 && safeNum(item.pbr) < 1.5,
    },
];

// =========================================================================
// StrategyTooltip — 전략 설명 툴팁
// =========================================================================
const StrategyTooltipContent = ({ preset }: { preset: StrategyPreset }) => (
    <div className="max-w-64 space-y-2.5">
        <div>
            <p className="font-black text-sm text-white tracking-tight">{preset.label}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{preset.desc}</p>
        </div>
        <div className="border-t border-zinc-700/60 pt-2 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">조건</p>
            <div className="flex flex-wrap gap-1">
                {preset.criteriaChips.map(chip => (
                    <span key={chip.label} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-700/60 rounded text-[10px] font-mono">
                        <span className="text-zinc-400">{chip.label}</span>
                        <span className="text-white font-bold">{chip.value}</span>
                    </span>
                ))}
            </div>
        </div>
        <div className="border-t border-zinc-700/60 pt-2">
            <p className="text-[11px] text-zinc-300 leading-relaxed">{preset.hint}</p>
        </div>
    </div>
);

// =========================================================================
// MetricTooltip — 지표 설명 툴팁 래퍼
// =========================================================================
const MetricTooltipContent = ({ title, desc }: { title: string; desc: string }) => (
    <div className="max-w-56">
        <p className="font-black text-sm text-white">{title}</p>
        <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">{desc}</p>
    </div>
);

const TOOLTIP_CONTENT_CLS =
    "z-50 rounded-xl px-3.5 py-3 text-xs bg-zinc-900 dark:bg-zinc-800 border border-zinc-700/60 shadow-xl shadow-black/30 will-change-[transform,opacity] data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95";

const METRIC_HINTS: Record<string, { title: string; desc: string }> = {
    "NCAV 업사이드": {
        title: "NCAV 업사이드 (%)",
        desc: "(유동자산 − 총부채) / 시가총액 − 1. 양수일수록 청산가치 대비 저평가. 100% 이상이면 NCAV 기준 통과.",
    },
    "PER": {
        title: "PER (주가수익비율)",
        desc: "주가 ÷ EPS(주당순이익). 현재 이익의 몇 배에 거래되는지. 낮을수록 이익 대비 저평가.",
    },
    "PBR": {
        title: "PBR (주가순자산비율)",
        desc: "주가 ÷ BPS(주당순자산). 순자산의 몇 배에 거래되는지. 1.0 미만이면 장부가치 이하 거래.",
    },
    "ROE": {
        title: "ROE (자기자본수익률)",
        desc: "EPS ÷ BPS × 100. 자본 대비 얼마나 이익을 내는지. 높을수록 자본 효율성 우수.",
    },
    "EPS": {
        title: "EPS (주당순이익)",
        desc: "당기순이익 ÷ 발행주식수. 양수이면 흑자, 음수이면 적자. PER 계산의 기준값.",
    },
    "BPS": {
        title: "BPS (주당순자산)",
        desc: "자기자본 ÷ 발행주식수. 주당 장부가치. PBR·ROE·그레이엄 넘버 계산의 기준값.",
    },
    "그레이엄 업사이드": {
        title: "그레이엄 넘버 업사이드 (%)",
        desc: "그레이엄 넘버 = √(22.5 × EPS × BPS). 현재가 대비 그레이엄 넘버의 초과율. 양수이면 현재가가 그레이엄 넘버 이하.",
    },
    "시가총액": {
        title: "시가총액 (억 원)",
        desc: "현재가 × 발행주식수. 단위: 억 원.",
    },
    "현재가": {
        title: "현재가 (원)",
        desc: "최근 스캔 기준 주가.",
    },
};

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
    const [activeStrategyIds, setActiveStrategyIds] = useState<string[]>([]);
    const [strategyCondition, setStrategyCondition] = useState<"or" | "and">("or");
    const [excludeHoldings, setExcludeHoldings] = useState(false);
    const [excludeJiju, setExcludeJiju] = useState(false);
    const [excludePreferred, setExcludePreferred] = useState(false);
    const [excludeSpac, setExcludeSpac] = useState(false);
    const [excludeDeficit, setExcludeDeficit] = useState(false);
    const [ncavPositiveOnly, setNcavPositiveOnly] = useState(false);
    const [minMarketCap, setMinMarketCap] = useState(0);
    const [minNcavRatio, setMinNcavRatio] = useState("");
    const [maxPbr, setMaxPbr] = useState("");
    const [maxPer, setMaxPer] = useState("");
    const [minRoe, setMinRoe] = useState("");
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);
    const [manualDateInput, setManualDateInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [discoverySortKey, setDiscoverySortKey] = useState<DiscoverySortKey>("ncav_ratio");
    const [discoverySortOrder, setDiscoverySortOrder] = useState<SortOrder>("desc");
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(["유동자산(억)", "총부채(억)", "EPS", "BPS"]));
    const [columnToggleOpen, setColumnToggleOpen] = useState(false);

    const listRef = useRef<HTMLDivElement>(null);
    const columnToggleRef = useRef<HTMLDivElement>(null);
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

    const toggleStrategy = useCallback((id: string) => {
        setActiveStrategyIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    }, []);

    const clearAllFilters = useCallback(() => {
        setActiveStrategyIds([]); setStrategyCondition("or");
        setMinNcavRatio(""); setMaxPbr(""); setMaxPer(""); setMinRoe("");
        setExcludeHoldings(false); setExcludeJiju(false); setExcludePreferred(false);
        setExcludeSpac(false); setExcludeDeficit(false); setNcavPositiveOnly(false);
        setMinMarketCap(0); setSearchQuery(""); setDailyDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const toggleDiscoverySort = useCallback((key: DiscoverySortKey) => {
        setDiscoverySortKey(prev => {
            if (prev === key) { setDiscoverySortOrder(o => o === "asc" ? "desc" : "asc"); return key; }
            setDiscoverySortOrder("desc");
            return key;
        });
        setDailyDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    // 컬럼 토글 드롭다운 외부 클릭 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (columnToggleRef.current && !columnToggleRef.current.contains(e.target as Node)) {
                setColumnToggleOpen(false);
            }
        };
        if (columnToggleOpen) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [columnToggleOpen]);

    const activePresentsList = useMemo(
        () => STRATEGY_PRESETS.filter(p => activeStrategyIds.includes(p.id)),
        [activeStrategyIds]
    );
    const activePresetColumns = useMemo(() => {
        const cols = new Set<string>();
        activePresentsList.forEach(p => p.columns.forEach(c => cols.add(c)));
        return cols;
    }, [activePresentsList]);

    const activeFilterCount = useMemo(() => {
        let n = activeStrategyIds.length;
        if (minNcavRatio) n++; if (maxPbr) n++; if (maxPer) n++; if (minRoe) n++;
        if (excludeHoldings) n++; if (excludeJiju) n++; if (excludePreferred) n++;
        if (excludeSpac) n++; if (excludeDeficit) n++; if (ncavPositiveOnly) n++;
        if (minMarketCap > 0) n++;
        if (searchQuery) n++;
        return n;
    }, [activeStrategyIds, minNcavRatio, maxPbr, maxPer, minRoe, excludeHoldings, excludeJiju, excludePreferred, excludeSpac, excludeDeficit, ncavPositiveOnly, minMarketCap, searchQuery]);

    const filteredDailyList = useMemo(() => {
        let list = ncavDailyList.list;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item => item.ticker.toLowerCase().includes(q) || (item.name ?? "").toLowerCase().includes(q));
        }
        if (excludeHoldings)  list = list.filter(item => !item.name?.includes("홀딩스"));
        if (excludeJiju)      list = list.filter(item => !item.name?.includes("지주"));
        if (excludePreferred) list = list.filter(item => !/\d*우[A-D]?$/.test(item.name ?? ""));
        if (excludeSpac)      list = list.filter(item => !item.name?.includes("스팩"));
        if (excludeDeficit)   list = list.filter(item => safeNum(item.eps) > 0);
        if (ncavPositiveOnly) list = list.filter(item => safeNum(item.ncav_ratio) >= 1);
        if (minMarketCap > 0) list = list.filter(item => safeNum(item.market_cap) >= minMarketCap);
        if (activeStrategyIds.length > 0) {
            const matchesStrategy = (item: Record<string, any>, strategyId: string): boolean => {
                const preset = STRATEGY_PRESETS.find(p => p.id === strategyId);
                if (preset?.clientFilter) return preset.clientFilter(item);
                return (item.strategies ?? []).includes(strategyId);
            };
            list = strategyCondition === "and"
                ? list.filter(item => activeStrategyIds.every(s => matchesStrategy(item, s)))
                : list.filter(item => activeStrategyIds.some(s => matchesStrategy(item, s)));
        }
        const nv = minNcavRatio ? parseFloat(minNcavRatio) : null;
        const pb = maxPbr ? parseFloat(maxPbr) : null;
        const pe = maxPer ? parseFloat(maxPer) : null;
        const ro = minRoe ? parseFloat(minRoe) : null;
        if (nv !== null && !isNaN(nv)) list = list.filter(item => safeNum(item.ncav_ratio) >= nv);
        if (pb !== null && !isNaN(pb)) list = list.filter(item => safeNum(item.pbr) > 0 && safeNum(item.pbr) <= pb);
        if (pe !== null && !isNaN(pe)) list = list.filter(item => safeNum(item.per) > 0 && safeNum(item.per) <= pe);
        // ROE = EPS / BPS (자본총계 기반)
        if (ro !== null && !isNaN(ro)) list = list.filter(item => safeNum(item.bps) > 0 && (safeNum(item.eps) / safeNum(item.bps)) * 100 >= ro);
        // 정렬
        list = [...list].sort((a, b) => {
            let va: number, vb: number;
            if (discoverySortKey === "ticker") {
                return discoverySortOrder === "asc" ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
            }
            const grahamUpside = (item: any): number => {
                const e = safeNum(item.eps); const bp = safeNum(item.bps); const lp = safeNum(item.last_price);
                if (e <= 0 || bp <= 0 || lp <= 0) return -Infinity;
                return (Math.sqrt(22.5 * e * bp) / lp - 1) * 100;
            };
            if (discoverySortKey === "roe") {
                va = safeNum(a.bps) > 0 ? safeNum(a.eps) / safeNum(a.bps) : -Infinity;
                vb = safeNum(b.bps) > 0 ? safeNum(b.eps) / safeNum(b.bps) : -Infinity;
            } else if (discoverySortKey === "graham_upside") {
                va = grahamUpside(a); vb = grahamUpside(b);
            } else {
                va = safeNum((a as any)[discoverySortKey]);
                vb = safeNum((b as any)[discoverySortKey]);
            }
            return discoverySortOrder === "asc" ? va - vb : vb - va;
        });
        return list;
    }, [ncavDailyList.list, searchQuery, excludeHoldings, excludeJiju, excludePreferred, excludeSpac, excludeDeficit, ncavPositiveOnly, minMarketCap, activeStrategyIds, strategyCondition, minNcavRatio, maxPbr, maxPer, minRoe, discoverySortKey, discoverySortOrder]);

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
      <Tooltip.Provider delayDuration={400}>
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
                                        const stratCntMap: Record<string, number | undefined> = { ncav: d.ncav_cnt, low_pbr: d.low_pbr_cnt, low_per: d.low_per_cnt, s_rim: d.s_rim_cnt };
                                        const activeStratCnt = activeStrategyIds.length === 1
                                            ? (stratCntMap[activeStrategyIds[0]] ?? d.total_cnt ?? d.cnt)
                                            : (d.total_cnt ?? d.cnt);
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
                                                    {activeStratCnt}개
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
                        {/* ── 종목명/티커 검색 ── */}
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="종목명 또는 티커 검색..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                className="w-full sm:w-72 pl-8 pr-8 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200/60 dark:focus:ring-indigo-900/60 transition-colors"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(""); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                    className="absolute right-2.5 text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* ── 필터 패널 ── */}
                        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
                            {/* 토글 헤더 */}
                            <button
                                onClick={() => setFilterPanelOpen(p => !p)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Filter className="w-3.5 h-3.5 text-zinc-400" />
                                        <span className="text-xs font-black text-zinc-400 uppercase tracking-wider">필터</span>
                                    </div>
                                    {activeFilterCount > 0 && (
                                        <span className="w-5 h-5 flex items-center justify-center bg-indigo-600 text-white text-[10px] font-black rounded-full shrink-0">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                    {!filterPanelOpen && activeFilterCount > 0 && (
                                        <div className="flex flex-wrap gap-1 min-w-0">
                                            {activeStrategyIds.map((id, i) => (
                                                <span key={id} className="flex items-center gap-1 shrink-0">
                                                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black", STRATEGY_BADGE[id])}>
                                                        {STRATEGY_LABEL[id]}
                                                    </span>
                                                    {i < activeStrategyIds.length - 1 && (
                                                        <span className="text-[9px] font-black text-zinc-400 dark:text-zinc-500">
                                                            {strategyCondition.toUpperCase()}
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                            {minNcavRatio && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">NCAV≥{minNcavRatio}</span>}
                                            {maxPbr && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">PBR≤{maxPbr}</span>}
                                            {maxPer && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">PER≤{maxPer}</span>}
                                            {minRoe && <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 shrink-0">ROE≥{minRoe}%</span>}
                                        </div>
                                    )}
                                </div>
                                <div className="shrink-0 ml-2">
                                    {filterPanelOpen
                                        ? <ChevronUp className="w-4 h-4 text-zinc-400" />
                                        : <ChevronDown className="w-4 h-4 text-zinc-400" />
                                    }
                                </div>
                            </button>

                            {/* 펼쳐진 패널 */}
                            {filterPanelOpen && (
                                <div className="border-t border-zinc-100 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">

                                    {/* 활성 필터 수 + 초기화 */}
                                    {activeFilterCount > 0 && (
                                        <div className="px-4 py-2.5 flex items-center justify-between bg-indigo-50/60 dark:bg-indigo-950/20">
                                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                                활성 필터 {activeFilterCount}개 적용 중
                                            </span>
                                            <button
                                                onClick={clearAllFilters}
                                                className="text-[11px] font-bold text-indigo-400 hover:text-red-500 dark:text-indigo-500 dark:hover:text-red-400 transition-colors"
                                            >
                                                모두 초기화
                                            </button>
                                        </div>
                                    )}

                                    {/* 전략 (다중 선택, OR / AND 전환) */}
                                    <div className="px-4 py-3.5 flex items-start gap-4">
                                        <div className="w-14 shrink-0 pt-1">
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">전략</p>
                                            {/* OR / AND 토글 */}
                                            {activeStrategyIds.length >= 2 && (
                                                <div className="flex items-center mt-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden w-fit">
                                                    {(["or", "and"] as const).map(cond => (
                                                        <button
                                                            key={cond}
                                                            onClick={() => setStrategyCondition(cond)}
                                                            className={cn(
                                                                "px-1.5 py-0.5 text-[9px] font-black uppercase transition-colors",
                                                                strategyCondition === cond
                                                                    ? "bg-indigo-600 text-white"
                                                                    : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                            )}
                                                        >
                                                            {cond}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {activeStrategyIds.length < 2 && (
                                                <p className="text-[9px] text-zinc-300 dark:text-zinc-600 mt-0.5">다중 선택</p>
                                            )}
                                        </div>
                                        <Tooltip.Provider delayDuration={300}>
                                        <div className="flex flex-wrap gap-2">
                                            {STRATEGY_PRESETS.map(preset => {
                                                const isActive = activeStrategyIds.includes(preset.id);
                                                return (
                                                    <Tooltip.Root key={preset.id}>
                                                        <Tooltip.Trigger asChild>
                                                            <button
                                                                onClick={() => { toggleStrategy(preset.id); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                                                className={cn(
                                                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                                                                    isActive
                                                                        ? (STRATEGY_ACTIVE_CLS[preset.id] ?? "bg-zinc-700 border-zinc-700 text-white shadow-sm")
                                                                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200"
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    "w-2 h-2 rounded-full shrink-0 transition-colors",
                                                                    isActive ? "bg-white/80" : (STRATEGY_DOT_CLS[preset.id] ?? "bg-zinc-400")
                                                                )} />
                                                                <span>{preset.label}</span>
                                                                <span className={cn(
                                                                    "text-[9px] max-w-[100px] truncate transition-opacity",
                                                                    isActive ? "opacity-70" : "text-zinc-400 dark:text-zinc-500"
                                                                )}>
                                                                    {preset.desc}
                                                                </span>
                                                            </button>
                                                        </Tooltip.Trigger>
                                                        <Tooltip.Portal>
                                                            <Tooltip.Content side="top" sideOffset={8} className={TOOLTIP_CONTENT_CLS}>
                                                                <StrategyTooltipContent preset={preset} />
                                                                <Tooltip.Arrow className="fill-zinc-900 dark:fill-zinc-800" />
                                                            </Tooltip.Content>
                                                        </Tooltip.Portal>
                                                    </Tooltip.Root>
                                                );
                                            })}
                                        </div>
                                        </Tooltip.Provider>
                                    </div>

                                    {/* 수치 필터 */}
                                    <div className="px-4 py-3.5 flex items-start gap-4">
                                        <div className="w-14 shrink-0 pt-1">
                                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">수치</p>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {([
                                                { label: "NCAV ≥", value: minNcavRatio, onChange: setMinNcavRatio, placeholder: "1.0", unit: "x" },
                                                { label: "PBR ≤",  value: maxPbr,       onChange: setMaxPbr,       placeholder: "0.5", unit: "x" },
                                                { label: "PER ≤",  value: maxPer,       onChange: setMaxPer,       placeholder: "10",  unit: "x" },
                                                { label: "ROE ≥",  value: minRoe,       onChange: setMinRoe,       placeholder: "8",   unit: "%" },
                                            ] as const).map(f => (
                                                <div key={f.label} className="flex flex-col gap-1">
                                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{f.label}</label>
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="number"
                                                            placeholder={f.placeholder}
                                                            value={f.value}
                                                            onChange={e => { (f.onChange as any)(e.target.value); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                                            className="w-full pl-2.5 pr-7 py-2 text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200/60 dark:focus:ring-indigo-900/60 transition-colors"
                                                        />
                                                        {f.value ? (
                                                            <button
                                                                onClick={() => { (f.onChange as any)(""); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                                                className="absolute right-1.5 text-zinc-300 hover:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <span className="absolute right-2.5 text-[10px] text-zinc-300 dark:text-zinc-600 font-mono pointer-events-none">{f.unit}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 종목 유형 + 시총 */}
                                    <div className="px-4 py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 shrink-0 pt-1">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">유형</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {([
                                                    { label: "홀딩스 제외", active: excludeHoldings,  toggle: () => setExcludeHoldings(p => !p) },
                                                    { label: "지주 제외",  active: excludeJiju,       toggle: () => setExcludeJiju(p => !p) },
                                                    { label: "우선주 제외", active: excludePreferred, toggle: () => setExcludePreferred(p => !p) },
                                                    { label: "스팩 제외",  active: excludeSpac,      toggle: () => setExcludeSpac(p => !p) },
                                                    { label: "적자 제외",  active: excludeDeficit,   toggle: () => setExcludeDeficit(p => !p) },
                                                    { label: "NCAV 양수만", active: ncavPositiveOnly, toggle: () => setNcavPositiveOnly(p => !p) },
                                                ] as const).map(({ label, active, toggle }) => (
                                                    <button
                                                        key={label}
                                                        onClick={() => { toggle(); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                                        className={cn(
                                                            "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                            active
                                                                ? "bg-amber-500 border-amber-500 text-white shadow-sm"
                                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300"
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 shrink-0 pt-1">
                                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">시총</p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {([
                                                    { label: "전체",  value: 0 },
                                                    { label: "50억+", value: 50 },
                                                    { label: "100억+", value: 100 },
                                                    { label: "300억+", value: 300 },
                                                    { label: "500억+", value: 500 },
                                                ] as const).map(({ label, value }) => (
                                                    <button
                                                        key={label}
                                                        onClick={() => { setMinMarketCap(value); setDailyDisplayCount(DAILY_PAGE_SIZE); }}
                                                        className={cn(
                                                            "px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                            minMarketCap === value
                                                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                                                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300"
                                                        )}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

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
                                <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">스캔일</span>
                                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                                            {ncavDailyList.scanDate ?? "-"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-zinc-400 font-medium">
                                            {filteredDailyList.length !== ncavDailyList.list.length
                                                ? <>{filteredDailyList.length}<span className="text-zinc-300 dark:text-zinc-600"> / {ncavDailyList.list.length}</span>개 종목</>
                                                : <>{ncavDailyList.list.length}개 종목</>
                                            }
                                        </span>
                                        {/* 컬럼 토글 드롭다운 */}
                                        <div ref={columnToggleRef} className="relative">
                                            <button
                                                onClick={() => setColumnToggleOpen(p => !p)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all",
                                                    columnToggleOpen
                                                        ? "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400"
                                                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600"
                                                )}
                                            >
                                                컬럼
                                                <ChevronDown className={cn("w-3 h-3 transition-transform", columnToggleOpen && "rotate-180")} />
                                            </button>
                                            {columnToggleOpen && (
                                                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-20 py-1.5 overflow-hidden">
                                                    {["유동자산(억)", "총부채(억)", "EPS", "BPS"].map(col => (
                                                        <button
                                                            key={col}
                                                            onClick={() => setHiddenColumns(prev => {
                                                                const next = new Set(prev);
                                                                next.has(col) ? next.delete(col) : next.add(col);
                                                                return next;
                                                            })}
                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                                                        >
                                                            <span className={cn(
                                                                "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                                                !hiddenColumns.has(col)
                                                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                                                    : "border-zinc-300 dark:border-zinc-600"
                                                            )}>
                                                                {!hiddenColumns.has(col) && <span className="text-[8px] font-black">✓</span>}
                                                            </span>
                                                            <span className={hiddenColumns.has(col) ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-700 dark:text-zinc-300"}>
                                                                {col}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                                                {([
                                                    { label: "티커",           align: "",           sortKey: "ticker"        },
                                                    { label: "종목명",         align: "",           sortKey: null            },
                                                    { label: "전략",           align: "",           sortKey: null            },
                                                    { label: "NCAV 업사이드",  align: "text-right", sortKey: "ncav_ratio"    },
                                                    { label: "유동자산(억)",   align: "text-right", sortKey: null            },
                                                    { label: "총부채(억)",     align: "text-right", sortKey: null            },
                                                    { label: "시가총액(억)",   align: "text-right", sortKey: "market_cap"    },
                                                    { label: "현재가",         align: "text-right", sortKey: "last_price"    },
                                                    { label: "PER",            align: "text-right", sortKey: "per"           },
                                                    { label: "PBR",            align: "text-right", sortKey: "pbr"           },
                                                    { label: "ROE",            align: "text-right", sortKey: "roe"           },
                                                    { label: "그레이엄 업사이드", align: "text-right", sortKey: "graham_upside" },
                                                    { label: "EPS",            align: "text-right", sortKey: null            },
                                                    { label: "BPS",            align: "text-right", sortKey: null            },
                                                ] as { label: string; align: string; sortKey: DiscoverySortKey | null }[])
                                                .filter(col => !hiddenColumns.has(col.label))
                                                .map(({ label, align, sortKey }) => {
                                                    const isStrategy = activePresetColumns.has(label);
                                                    const isGraham = label === "그레이엄 업사이드";
                                                    const isActive = sortKey && discoverySortKey === sortKey;
                                                    const metricHint = METRIC_HINTS[label];
                                                    const thContent = (
                                                        <th key={label}
                                                            onClick={sortKey ? () => toggleDiscoverySort(sortKey) : undefined}
                                                            className={cn(
                                                                "py-3 px-4 text-[10px] font-black uppercase tracking-wider select-none whitespace-nowrap transition-colors rounded-sm",
                                                                align,
                                                                isGraham ? "text-teal-600 dark:text-teal-400" :
                                                                isStrategy ? "text-violet-600 dark:text-violet-400" :
                                                                isActive ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/30" :
                                                                "text-zinc-400",
                                                                sortKey && "cursor-pointer hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 hover:text-zinc-600 dark:hover:text-zinc-300"
                                                            )}>
                                                            <span className="inline-flex items-center gap-1 justify-end">
                                                                {label}
                                                                {isStrategy && <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                                                                {isGraham && <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />}
                                                                {sortKey && (isActive
                                                                    ? (discoverySortOrder === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                                                                    : <ChevronsUpDown className="w-3 h-3 opacity-40 group-hover:opacity-80 transition-opacity" />
                                                                )}
                                                            </span>
                                                        </th>
                                                    );
                                                    if (metricHint) {
                                                        return (
                                                            <Tooltip.Provider key={label} delayDuration={400}>
                                                                <Tooltip.Root>
                                                                    <Tooltip.Trigger asChild>{thContent}</Tooltip.Trigger>
                                                                    <Tooltip.Portal>
                                                                        <Tooltip.Content side="top" sideOffset={6} className={TOOLTIP_CONTENT_CLS}>
                                                                            <MetricTooltipContent title={metricHint.title} desc={metricHint.desc} />
                                                                            <Tooltip.Arrow className="fill-zinc-900 dark:fill-zinc-800" />
                                                                        </Tooltip.Content>
                                                                    </Tooltip.Portal>
                                                                </Tooltip.Root>
                                                            </Tooltip.Provider>
                                                        );
                                                    }
                                                    return thContent;
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                                            {filteredDailyList.slice(0, dailyDisplayCount).map((item) => {
                                                const upsidePct = (safeNum(item.ncav_ratio) - 1) * 100;
                                                const isPositive = upsidePct >= 0;
                                                const backendStrategies: string[] = item.strategies ?? [];
                                                const clientMatchedStrategies = STRATEGY_PRESETS
                                                    .filter(p => p.clientFilter && p.clientFilter(item))
                                                    .map(p => p.id);
                                                const allMatchedStrategies = Array.from(new Set([...backendStrategies, ...clientMatchedStrategies]));
                                                const matchCount = allMatchedStrategies.length;
                                                // ROE = EPS / BPS (자본총계 기반, 백엔드 저장값 대신 클라이언트 계산)
                                                const roePct = item.bps > 0 ? (item.eps / item.bps) * 100 : null;
                                                const grahamNum = safeNum(item.eps) > 0 && safeNum(item.bps) > 0
                                                    ? Math.sqrt(22.5 * safeNum(item.eps) * safeNum(item.bps)) : null;
                                                const grahamUpside = grahamNum && safeNum(item.last_price) > 0
                                                    ? (grahamNum / safeNum(item.last_price) - 1) * 100 : null;
                                                return (
                                                    <tr key={item.ticker} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-sm group/row">
                                                        {!hiddenColumns.has("티커") && (
                                                            <td className="py-3 px-4 font-mono font-black text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{item.ticker}</td>
                                                        )}
                                                        {!hiddenColumns.has("종목명") && (
                                                            <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 max-w-[160px]">
                                                                <span className="truncate block" title={item.name}>{item.name}</span>
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("전략") && (
                                                            <td className="py-3 px-4">
                                                                <div className="flex flex-wrap items-center gap-1">
                                                                    {backendStrategies.map(s => (
                                                                        <span key={s} className={cn(
                                                                            "px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                                                                            STRATEGY_BADGE[s] ?? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                                        )}>
                                                                            {STRATEGY_LABEL[s] ?? s}
                                                                        </span>
                                                                    ))}
                                                                    {backendStrategies.length === 0 && matchCount === 0 && (
                                                                        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">—</span>
                                                                    )}
                                                                    {matchCount > 0 && (
                                                                        <span className={cn(
                                                                            "px-1.5 py-0.5 rounded text-[9px] font-black font-mono",
                                                                            matchCount >= 4
                                                                                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                                                                                : matchCount >= 3
                                                                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                                                                                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                                                        )}>
                                                                            {matchCount}개
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("NCAV 업사이드") && (
                                                            <td className={cn(
                                                                "py-3 px-4 text-right font-mono font-black whitespace-nowrap",
                                                                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                                                            )}>
                                                                {isPositive ? "+" : ""}{upsidePct.toFixed(1)}%
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("유동자산(억)") && (
                                                            <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                                {safeNum(item.current_assets).toLocaleString()}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("총부채(억)") && (
                                                            <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                                {safeNum(item.total_liabilities).toLocaleString()}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("시가총액(억)") && (
                                                            <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                                {safeNum(item.market_cap).toLocaleString()}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("현재가") && (
                                                            <td className="py-3 px-4 text-right font-mono text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                                {safeNum(item.last_price) > 0 ? `₩${safeNum(item.last_price).toLocaleString()}` : "—"}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("PER") && (
                                                            <td className={cn(
                                                                "py-3 px-4 text-right font-mono whitespace-nowrap",
                                                                safeNum(item.per) > 0 && safeNum(item.per) < 10
                                                                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                                                    : "text-zinc-500 dark:text-zinc-400"
                                                            )}>
                                                                {safeNum(item.per) === 0 ? "—" : `${safeNum(item.per).toFixed(1)}x`}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("PBR") && (
                                                            <td className={cn(
                                                                "py-3 px-4 text-right font-mono whitespace-nowrap",
                                                                safeNum(item.pbr) > 0 && safeNum(item.pbr) < 0.5
                                                                    ? "text-blue-600 dark:text-blue-400 font-bold"
                                                                    : safeNum(item.pbr) > 0 && safeNum(item.pbr) < 1.0
                                                                        ? "text-sky-500 dark:text-sky-400"
                                                                        : "text-zinc-500 dark:text-zinc-400"
                                                            )}>
                                                                {safeNum(item.pbr) === 0 ? "—" : `${safeNum(item.pbr).toFixed(2)}x`}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("ROE") && (
                                                            <td className={cn(
                                                                "py-3 px-4 text-right font-mono whitespace-nowrap",
                                                                roePct === null ? "text-zinc-400 dark:text-zinc-500"
                                                                    : roePct >= 8 ? "text-violet-600 dark:text-violet-400 font-bold"
                                                                    : roePct > 0 ? "text-zinc-600 dark:text-zinc-300"
                                                                    : "text-red-500 dark:text-red-400"
                                                            )}>
                                                                {roePct === null ? "—" : `${roePct.toFixed(1)}%`}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("그레이엄 업사이드") && (
                                                            <td className={cn(
                                                                "py-3 px-4 text-right font-mono whitespace-nowrap",
                                                                grahamUpside === null ? "text-zinc-400 dark:text-zinc-500"
                                                                    : grahamUpside > 0 ? "text-teal-600 dark:text-teal-400 font-bold"
                                                                    : "text-zinc-500 dark:text-zinc-400"
                                                            )}>
                                                                {grahamUpside === null ? "—" : `${grahamUpside > 0 ? "+" : ""}${grahamUpside.toFixed(1)}%`}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("EPS") && (
                                                            <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                                {safeNum(item.eps).toLocaleString()}
                                                            </td>
                                                        )}
                                                        {!hiddenColumns.has("BPS") && (
                                                            <td className="py-3 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400 text-xs whitespace-nowrap">
                                                                {safeNum(item.bps).toLocaleString()}
                                                            </td>
                                                        )}
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
      </Tooltip.Provider>
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
