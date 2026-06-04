"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    selectNcavDailyDates, selectNcavDailyList,
    reqGetNcavDailyDates, reqGetNcavDailyList,
    reqDiscoverNcavDates,
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { cn } from "@/lib/utils";
import { RefreshCw, ChevronRight, Loader2, Search, SlidersHorizontal, TrendingUp } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

// =========================================================================
// 상수 & 타입
// =========================================================================
const DAILY_PAGE_SIZE = 30;
type DiscoverySortKey = "ticker" | "ncav_ratio" | "per" | "pbr" | "roe" | "market_cap" | "last_price";
type SortOrder = "asc" | "desc";

const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };

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
    all:            "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-sm",
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

interface StrategyPreset {
    id: string;
    label: string;
    hint: string;
    clientFilter?: (item: Record<string, any>) => boolean;
}

const STRATEGY_PRESETS: StrategyPreset[] = [
    {
        id: "ncav", label: "NCAV",
        hint: "순유동자산(유동자산−총부채) > 시가총액. 그레이엄 기준 청산가치 이하에 거래 중인 종목.",
    },
    {
        id: "low_pbr", label: "저PBR",
        hint: "PBR 0.5 미만 — 순자산의 절반 이하 가격에 거래 중인 심층 저평가 종목.",
    },
    {
        id: "low_per", label: "저PER",
        hint: "PER 10 미만 + 흑자(EPS > 0) — 현재 이익의 10배 이하에 살 수 있는 종목.",
    },
    {
        id: "s_rim", label: "S-RIM",
        hint: "ROE > 8% & PBR < 1.0 — 초과이익(ROE > Ke) 창출 기업이 장부가 이하에 거래 중.",
    },
    {
        id: "graham_number", label: "그레이엄",
        hint: "PER × PBR < 22.5 — 그레이엄 복합 안전마진 공식. 두 지표를 곱으로 평가.",
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.bps) > 0 &&
            safeNum(item.per) > 0 && safeNum(item.pbr) > 0 &&
            safeNum(item.per) * safeNum(item.pbr) < 22.5,
    },
    {
        id: "magic_formula", label: "마법공식",
        hint: "PER < 15 & ROE > 10% — Greenblatt 마법공식 변형. 싸면서 잘 버는 기업.",
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.per) > 0 && safeNum(item.per) < 15 &&
            safeNum(item.bps) > 0 && (safeNum(item.eps) / safeNum(item.bps)) * 100 > 10,
    },
    {
        id: "quality_value", label: "퀄리티",
        hint: "ROE > 15% & PBR < 2.0 — 버핏 스타일. 경쟁력 높은 기업이 아직 고평가되지 않은 구간.",
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.bps) > 0 &&
            (safeNum(item.eps) / safeNum(item.bps)) * 100 > 15 &&
            safeNum(item.pbr) > 0 && safeNum(item.pbr) < 2.0,
    },
    {
        id: "near_ncav", label: "NCAV근접",
        hint: "NCAV 비율 0.7~1.0 — 청산가치 미달이지만 근접. 진입 전 관찰 목록으로 활용.",
        clientFilter: (item) => safeNum(item.ncav_ratio) >= 0.7 && safeNum(item.ncav_ratio) < 1.0,
    },
    {
        id: "balanced_value", label: "균형가치",
        hint: "PER 5~15 & PBR < 1.5 & EPS > 0 — 적정가치 + 저평가 복합 기준.",
        clientFilter: (item) =>
            safeNum(item.eps) > 0 && safeNum(item.per) > 5 && safeNum(item.per) < 15 &&
            safeNum(item.pbr) > 0 && safeNum(item.pbr) < 1.5,
    },
];

const TOOLTIP_CLS =
    "z-50 max-w-64 rounded-xl px-3.5 py-3 text-xs bg-zinc-900 dark:bg-zinc-800 border border-zinc-700/60 shadow-xl text-zinc-200 leading-relaxed " +
    "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 " +
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95";

// =========================================================================
// SortableHeader
// =========================================================================
function SortableHeader({ label, sortKey: key, currentKey, order, onToggle }: {
    label: string;
    sortKey: DiscoverySortKey;
    currentKey: DiscoverySortKey;
    order: SortOrder;
    onToggle: (k: DiscoverySortKey) => void;
}) {
    const active = currentKey === key;
    return (
        <button
            onClick={() => onToggle(key)}
            className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap",
                active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            )}
        >
            {label}
            <span className="text-[9px] font-mono">{active ? (order === "asc" ? "↑" : "↓") : "↕"}</span>
        </button>
    );
}

// =========================================================================
// TableRow — 데스크탑
// =========================================================================
function TableRow({ item, onClick }: { item: any; onClick: (ticker: string, name: string) => void }) {
    const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;
    const strategies: string[] = item.strategies ?? [];
    const ncav = safeNum(item.ncav_ratio);

    return (
        <div
            className="group grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_88px] gap-4 items-center px-5 py-4 hover:bg-blue-50/40 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white truncate leading-tight">{item.name}</p>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5 tracking-wider">{item.ticker}</p>
            </div>

            <div className="flex flex-wrap gap-1">
                {strategies.slice(0, 2).map(s => (
                    <span key={s} className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STRATEGY_BADGE[s] ?? "bg-zinc-100 text-zinc-500")}>
                        {STRATEGY_LABEL[s] ?? s}
                    </span>
                ))}
                {strategies.length > 2 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-700 text-zinc-500">
                        +{strategies.length - 2}
                    </span>
                )}
            </div>

            <div className="text-right">
                <span className={cn(
                    "text-sm font-mono font-black tabular-nums",
                    ncav >= 1 ? "text-emerald-600 dark:text-emerald-400" :
                    ncav >= 0.7 ? "text-amber-500" : "text-zinc-400"
                )}>
                    {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className="text-sm font-mono text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {safeNum(item.pbr) > 0 ? `${safeNum(item.pbr).toFixed(2)}` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className="text-sm font-mono text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {safeNum(item.per) > 0 ? `${safeNum(item.per).toFixed(1)}` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className={cn(
                    "text-sm font-mono tabular-nums",
                    roe && roe > 15 ? "text-emerald-600 dark:text-emerald-400 font-bold" :
                    roe && roe > 0 ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400"
                )}>
                    {roe !== null && roe > 0 ? `${roe.toFixed(1)}%` : "—"}
                </span>
            </div>

            <div className="flex justify-end">
                <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-blue-600 group-hover:text-white text-zinc-600 dark:text-zinc-400 text-xs font-bold transition-all whitespace-nowrap"
                    onClick={(e) => { e.stopPropagation(); onClick(item.ticker, item.name); }}
                >
                    분석
                    <ChevronRight size={12} />
                </button>
            </div>
        </div>
    );
}

// =========================================================================
// StockRowCard — 모바일
// =========================================================================
function StockRowCard({ item, onClick }: { item: any; onClick: (ticker: string, name: string) => void }) {
    const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;
    const strategies: string[] = item.strategies ?? [];
    const ncav = safeNum(item.ncav_ratio);

    return (
        <div
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700/50 hover:shadow-md transition-all active:scale-[0.99]"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <p className="font-bold text-base text-zinc-900 dark:text-white truncate leading-tight">{item.name}</p>
                    <p className="text-[11px] text-zinc-400 font-mono tracking-wider mt-0.5">{item.ticker}</p>
                </div>
                <div className={cn(
                    "shrink-0 px-2.5 py-1.5 rounded-xl text-sm font-black font-mono",
                    ncav >= 1
                        ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                        : ncav >= 0.7
                        ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                )}>
                    {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
                </div>
            </div>

            {strategies.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {strategies.map(s => (
                        <span key={s} className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STRATEGY_BADGE[s] ?? "bg-zinc-100 text-zinc-500")}>
                            {STRATEGY_LABEL[s] ?? s}
                        </span>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                    { label: "PBR", value: safeNum(item.pbr) > 0 ? `${safeNum(item.pbr).toFixed(2)}` : "—" },
                    { label: "PER", value: safeNum(item.per) > 0 ? `${safeNum(item.per).toFixed(1)}` : "—" },
                    { label: "ROE", value: roe !== null && roe > 0 ? `${roe.toFixed(1)}%` : "—" },
                ].map(m => (
                    <div key={m.label} className="text-center p-2.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{m.label}</p>
                        <p className="text-sm font-mono font-bold text-zinc-700 dark:text-zinc-200 mt-0.5">{m.value}</p>
                    </div>
                ))}
            </div>

            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-600 hover:text-white text-zinc-600 dark:text-zinc-400 text-xs font-bold transition-all">
                상세 분석
                <ChevronRight size={12} />
            </button>
        </div>
    );
}

// =========================================================================
// 메인 스크리너
// =========================================================================
function ScreenerContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const ncavDailyDates = useAppSelector(selectNcavDailyDates);
    const ncavDailyList = useAppSelector(selectNcavDailyList);

    const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<DiscoverySortKey>("ncav_ratio");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [searchQuery, setSearchQuery] = useState("");
    const [displayCount, setDisplayCount] = useState(DAILY_PAGE_SIZE);
    const [excludeHoldings, setExcludeHoldings] = useState(false);
    const [excludeDeficit, setExcludeDeficit] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);

    const hasDiscovered = useRef(false);

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

    const handleRefresh = useCallback(() => {
        dispatch(reqGetNcavDailyList("latest"));
        setDisplayCount(DAILY_PAGE_SIZE);
    }, [dispatch]);

    const toggleSort = useCallback((key: DiscoverySortKey) => {
        setSortKey(prev => {
            if (prev === key) { setSortOrder(o => o === "asc" ? "desc" : "asc"); return key; }
            setSortOrder("desc");
            return key;
        });
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const strategyCounts = useMemo(() => {
        const counts: Record<string, number> = { all: ncavDailyList.list.length };
        STRATEGY_PRESETS.forEach(preset => {
            if (preset.clientFilter) {
                counts[preset.id] = ncavDailyList.list.filter(preset.clientFilter as any).length;
            } else {
                counts[preset.id] = ncavDailyList.list.filter(item =>
                    ((item as any).strategies ?? []).includes(preset.id)
                ).length;
            }
        });
        return counts;
    }, [ncavDailyList.list]);

    const filteredList = useMemo(() => {
        let list = [...ncavDailyList.list] as Record<string, any>[];

        if (activeStrategyId) {
            const preset = STRATEGY_PRESETS.find(p => p.id === activeStrategyId);
            if (preset?.clientFilter) {
                list = list.filter(preset.clientFilter);
            } else {
                list = list.filter(item => (item.strategies ?? []).includes(activeStrategyId));
            }
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item =>
                (item.ticker ?? "").toLowerCase().includes(q) ||
                (item.name ?? "").toLowerCase().includes(q)
            );
        }

        if (excludeHoldings) list = list.filter(item => !item.name?.includes("홀딩스"));
        if (excludeDeficit)  list = list.filter(item => safeNum(item.eps) > 0);

        list.sort((a, b) => {
            if (sortKey === "ticker") {
                return sortOrder === "asc"
                    ? (a.ticker ?? "").localeCompare(b.ticker ?? "")
                    : (b.ticker ?? "").localeCompare(a.ticker ?? "");
            }
            if (sortKey === "roe") {
                const ra = safeNum(a.bps) > 0 ? (safeNum(a.eps) / safeNum(a.bps)) * 100 : -Infinity;
                const rb = safeNum(b.bps) > 0 ? (safeNum(b.eps) / safeNum(b.bps)) * 100 : -Infinity;
                return sortOrder === "asc" ? ra - rb : rb - ra;
            }
            const va = safeNum(a[sortKey]);
            const vb = safeNum(b[sortKey]);
            return sortOrder === "asc" ? va - vb : vb - va;
        });

        return list;
    }, [ncavDailyList.list, activeStrategyId, searchQuery, excludeHoldings, excludeDeficit, sortKey, sortOrder]);

    const visibleList = filteredList.slice(0, displayCount);
    const hasMore = filteredList.length > displayCount;
    const isLoading = ncavDailyList.state === "pending" || ncavDailyList.state === "init";

    const handleStockClick = useCallback((ticker: string, name: string) => {
        // 국장 종목은 종목명으로 검색해야 하므로 name을 ticker 파라미터로 전달
        router.push(`/analyze?ticker=${encodeURIComponent(name)}&from=screener`);
    }, [router]);

    const scanDate = ncavDailyList.scanDate;
    const formattedDate = scanDate
        ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
        : null;

    const activeFilterCount = [excludeHoldings, excludeDeficit].filter(Boolean).length;

    return (
        <Tooltip.Provider delayDuration={300}>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">

            {/* ── 헤더 ── */}
            <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <TrendingUp size={18} className="text-blue-600 dark:text-blue-400" strokeWidth={2.5} />
                                <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                                    오늘의 발굴 종목
                                </h1>
                            </div>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-2">
                                {isLoading ? (
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 size={11} className="animate-spin" />
                                        데이터 로딩 중...
                                    </span>
                                ) : (
                                    <>
                                        {formattedDate && <span className="font-mono">{formattedDate}</span>}
                                        {formattedDate && <span>·</span>}
                                        총 <span className="font-bold text-zinc-700 dark:text-zinc-300 mx-0.5">{filteredList.length}개</span> 종목
                                        {ncavDailyList.list.length !== filteredList.length && (
                                            <span className="text-zinc-400"> (전체 {ncavDailyList.list.length}개 중)</span>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-start"
                        >
                            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                            새로고침
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 전략 탭 (sticky) ── */}
            <div className="sticky top-14 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-3">
                        {/* 전체 탭 */}
                        <Tooltip.Root>
                            <Tooltip.Trigger asChild>
                                <button
                                    onClick={() => { setActiveStrategyId(null); setDisplayCount(DAILY_PAGE_SIZE); }}
                                    className={cn(
                                        "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                        activeStrategyId === null
                                            ? STRATEGY_ACTIVE_CLS.all
                                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"
                                    )}
                                >
                                    전체
                                    <span className={cn(
                                        "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                        activeStrategyId === null
                                            ? "bg-white/20 dark:bg-black/20"
                                            : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
                                    )}>
                                        {strategyCounts.all}
                                    </span>
                                </button>
                            </Tooltip.Trigger>
                            <Tooltip.Portal>
                                <Tooltip.Content sideOffset={6} className={TOOLTIP_CLS}>
                                    전략 조건에 관계없이 오늘 스캔된 전체 종목을 표시합니다.
                                    <Tooltip.Arrow className="fill-zinc-900 dark:fill-zinc-800" />
                                </Tooltip.Content>
                            </Tooltip.Portal>
                        </Tooltip.Root>

                        {STRATEGY_PRESETS.map(preset => (
                            <Tooltip.Root key={preset.id}>
                                <Tooltip.Trigger asChild>
                                    <button
                                        onClick={() => {
                                            setActiveStrategyId(prev => prev === preset.id ? null : preset.id);
                                            setDisplayCount(DAILY_PAGE_SIZE);
                                        }}
                                        className={cn(
                                            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                            activeStrategyId === preset.id
                                                ? STRATEGY_ACTIVE_CLS[preset.id]
                                                : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900"
                                        )}
                                    >
                                        {preset.label}
                                        <span className={cn(
                                            "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                            activeStrategyId === preset.id
                                                ? "bg-white/20 dark:bg-black/20"
                                                : "bg-zinc-100 dark:bg-zinc-700 text-zinc-500"
                                        )}>
                                            {strategyCounts[preset.id] ?? 0}
                                        </span>
                                    </button>
                                </Tooltip.Trigger>
                                <Tooltip.Portal>
                                    <Tooltip.Content sideOffset={6} className={TOOLTIP_CLS}>
                                        <p className="font-bold mb-1">{preset.label}</p>
                                        {preset.hint}
                                        <Tooltip.Arrow className="fill-zinc-900 dark:fill-zinc-800" />
                                    </Tooltip.Content>
                                </Tooltip.Portal>
                            </Tooltip.Root>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 검색 & 필터 바 ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setDisplayCount(DAILY_PAGE_SIZE); }}
                        placeholder="종목명 또는 티커 검색"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-zinc-400 font-medium"
                    />
                </div>

                <button
                    onClick={() => setFilterOpen(o => !o)}
                    className={cn(
                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all",
                        filterOpen || activeFilterCount > 0
                            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-400"
                            : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    )}
                >
                    <SlidersHorizontal size={12} />
                    필터
                    {activeFilterCount > 0 && (
                        <span className="w-4 h-4 flex items-center justify-center rounded-full bg-blue-600 text-white text-[9px] font-black">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {filterOpen && (
                    <div className="w-full flex flex-wrap items-center gap-4 px-1 py-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={excludeHoldings}
                                onChange={e => setExcludeHoldings(e.target.checked)}
                                className="rounded accent-blue-600"
                            />
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">홀딩스 제외</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={excludeDeficit}
                                onChange={e => setExcludeDeficit(e.target.checked)}
                                className="rounded accent-blue-600"
                            />
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">적자 기업 제외</span>
                        </label>
                    </div>
                )}
            </div>

            {/* ── 종목 리스트 ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 size={32} className="animate-spin text-blue-600/50" />
                        <p className="text-sm font-bold text-zinc-400">스캔 데이터 불러오는 중...</p>
                    </div>
                )}

                {!isLoading && filteredList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
                            <Search size={24} className="text-zinc-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">조건에 맞는 종목이 없습니다</p>
                            <p className="text-xs text-zinc-400 mt-1">필터를 조정하거나 다른 전략을 선택해보세요.</p>
                        </div>
                    </div>
                )}

                {!isLoading && filteredList.length > 0 && (
                    <>
                        {/* 데스크탑 테이블 */}
                        <div className="hidden md:block">
                            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_88px] gap-4 items-center px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700/60">
                                    <SortableHeader label="종목명" sortKey="ticker" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">전략</div>
                                    <SortableHeader label="NCAV 비율" sortKey="ncav_ratio" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <SortableHeader label="PBR" sortKey="pbr" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <SortableHeader label="PER" sortKey="per" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <SortableHeader label="ROE" sortKey="roe" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div />
                                </div>
                                <div>
                                    {visibleList.map((item: any) => (
                                        <TableRow key={item.ticker} item={item} onClick={handleStockClick} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 모바일 카드 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                            {visibleList.map((item: any) => (
                                <StockRowCard key={item.ticker} item={item} onClick={handleStockClick} />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="flex justify-center mt-8">
                                <button
                                    onClick={() => setDisplayCount(c => c + DAILY_PAGE_SIZE)}
                                    className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-all"
                                >
                                    더 보기 ({filteredList.length - displayCount}개 남음)
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
        </Tooltip.Provider>
    );
}

// =========================================================================
// 페이지 내보내기
// =========================================================================
export default function ScreenerPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
        }>
            <ScreenerContent />
        </Suspense>
    );
}
