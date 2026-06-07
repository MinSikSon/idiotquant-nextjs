"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    selectNcavDailyDates, selectNcavDailyList,
    reqGetNcavDailyDates, reqGetNcavDailyList,
    reqDiscoverNcavDates,
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
    selectLikedTickers, selectLikedList, selectTogglePending,
    reqGetMyLikes, reqToggleLike,
} from "@/lib/features/stockLikes/stockLikesSlice";
import { cn } from "@/lib/utils";
import { RefreshCw, ChevronRight, Loader2, Search, SlidersHorizontal, TrendingUp, Info, X, Heart, Clock } from "lucide-react";
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
    low_pbr:        "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
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
    all:            "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-sm",
    ncav:           "bg-emerald-600 border-emerald-600 text-white shadow-sm",
    low_pbr:        "bg-sky-600 border-sky-600 text-white shadow-sm",
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
        clientFilter: (item) => safeNum(item.ncav_ratio) >= 1.0,
    },
    {
        id: "low_pbr", label: "저PBR",
        hint: "PBR 0.5 미만 — 순자산의 절반 이하 가격에 거래 중인 심층 저평가 종목.",
        clientFilter: (item) => safeNum(item.pbr) > 0 && safeNum(item.pbr) < 0.5,
    },
    {
        id: "low_per", label: "저PER",
        hint: "PER 10 미만 + 흑자(EPS > 0) — 현재 이익의 10배 이하에 살 수 있는 종목.",
        clientFilter: (item) => safeNum(item.eps) > 0 && safeNum(item.per) > 0 && safeNum(item.per) < 10,
    },
    {
        id: "s_rim", label: "S-RIM",
        hint: "ROE > 8% & PBR < 1.0 — 초과이익(ROE > Ke) 창출 기업이 장부가 이하에 거래 중.",
        clientFilter: (item) => {
            const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : 0;
            return roe > 8 && safeNum(item.pbr) > 0 && safeNum(item.pbr) < 1.0;
        },
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

// 백엔드 strategies + 프론트엔드 clientFilter 병합 (백엔드 미분류 종목도 표시)
function resolveStrategies(item: Record<string, any>): string[] {
    const base = new Set<string>(item.strategies ?? []);
    for (const preset of STRATEGY_PRESETS) {
        if (preset.clientFilter && preset.clientFilter(item)) base.add(preset.id);
    }
    return Array.from(base);
}

// 시가총액 프리셋 (단위: 억원)
const MKTCAP_PRESETS: { label: string; value: number }[] = [
    { label: "전체", value: 0 },
    { label: "500억+", value: 500 },
    { label: "1000억+", value: 1000 },
    { label: "5000억+", value: 5000 },
];

const TOOLTIP_CLS =
    "z-50 max-w-64 rounded-xl px-3.5 py-3 text-xs bg-neutral-900 dark:bg-[#242320] border border-neutral-700/60 shadow-lg text-neutral-200 leading-relaxed " +
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
                active ? "text-[#16a34a] dark:text-[#16a34a]" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
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
function TableRow({ item, onClick, likedTickers, onToggleLike }: {
    item: any;
    onClick: (ticker: string, name: string) => void;
    likedTickers: Set<string>;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;
    const strategies: string[] = resolveStrategies(item);
    const ncav = safeNum(item.ncav_ratio);
    const isLiked = likedTickers.has(item.name);

    return (
        <div
            className="group grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_112px] gap-4 items-center px-6 py-5 hover:bg-[#f0fdf4]/40 dark:hover:bg-[#242320]/50 cursor-pointer transition-colors border-b border-neutral-100 dark:border-[#35332e] last:border-0"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="min-w-0">
                <p className="font-bold text-sm text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5 tracking-wider">{item.ticker}</p>
            </div>

            <div className="flex flex-wrap gap-1">
                {strategies.slice(0, 2).map(s => (
                    <span key={s} className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STRATEGY_BADGE[s] ?? "bg-[#faf9f7] text-neutral-500")}>
                        {STRATEGY_LABEL[s] ?? s}
                    </span>
                ))}
                {strategies.length > 2 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#faf9f7] dark:bg-[#4a4641] text-neutral-500">
                        +{strategies.length - 2}
                    </span>
                )}
            </div>

            <div className="text-right">
                <span className={cn(
                    "text-sm font-mono font-black tabular-nums",
                    ncav >= 1 ? "text-emerald-600 dark:text-emerald-400" :
                    ncav >= 0.7 ? "text-amber-500" : "text-neutral-400"
                )}>
                    {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className="text-sm font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                    {safeNum(item.pbr) > 0 ? `${safeNum(item.pbr).toFixed(2)}` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className="text-sm font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                    {safeNum(item.per) > 0 ? `${safeNum(item.per).toFixed(1)}` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className={cn(
                    "text-sm font-mono tabular-nums",
                    roe && roe > 15 ? "text-emerald-600 dark:text-emerald-400 font-bold" :
                    roe && roe > 0 ? "text-neutral-600 dark:text-neutral-300" : "text-neutral-400"
                )}>
                    {roe !== null && roe > 0 ? `${roe.toFixed(1)}%` : "—"}
                </span>
            </div>

            <div className="flex justify-end items-center gap-1.5">
                <button
                    className={cn(
                        "p-1.5 rounded-lg transition-all",
                        isLiked
                            ? "text-rose-500 dark:text-rose-400"
                            : "text-neutral-300 dark:text-neutral-600 hover:text-rose-400 dark:hover:text-rose-500"
                    )}
                    onClick={(e) => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                    title={isLiked ? "관심 해제" : "관심 추가"}
                >
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                </button>
                <button
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#faf9f7] dark:bg-[#242320] group-hover:bg-[#16a34a] group-hover:text-white text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-all whitespace-nowrap"
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
function StockRowCard({ item, onClick, likedTickers, onToggleLike }: {
    item: any;
    onClick: (ticker: string, name: string) => void;
    likedTickers: Set<string>;
    onToggleLike: (ticker: string, name: string) => void;
}) {
    const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;
    const strategies: string[] = resolveStrategies(item);
    const ncav = safeNum(item.ncav_ratio);
    const isLiked = likedTickers.has(item.name);

    return (
        <div
            className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 cursor-pointer hover:border-[#86efac] dark:hover:border-[#15803d]/50 hover:shadow-md transition-all active:scale-[0.99]"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-base text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                    <p className="text-[11px] text-neutral-400 font-mono tracking-wider mt-0.5">{item.ticker}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        className={cn(
                            "p-1.5 rounded-lg transition-all",
                            isLiked
                                ? "text-rose-500 dark:text-rose-400"
                                : "text-neutral-300 dark:text-neutral-600 hover:text-rose-400 dark:hover:text-rose-500"
                        )}
                        onClick={(e) => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                    >
                        <Heart size={16} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                    <div className={cn(
                        "px-2.5 py-1.5 rounded-xl text-sm font-black font-mono",
                        ncav >= 1
                            ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                            : ncav >= 0.7
                            ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                            : "bg-[#faf9f7] dark:bg-[#242320] text-neutral-500"
                    )}>
                        {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
                    </div>
                </div>
            </div>

            {strategies.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {strategies.map(s => (
                        <span key={s} className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STRATEGY_BADGE[s] ?? "bg-[#faf9f7] text-neutral-500")}>
                            {STRATEGY_LABEL[s] ?? s}
                        </span>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                    { label: "PBR", value: safeNum(item.pbr) > 0 ? `${safeNum(item.pbr).toFixed(2)}` : "—" },
                    { label: "PER", value: safeNum(item.per) > 0 ? `${safeNum(item.per).toFixed(1)}` : "—" },
                    { label: "ROE", value: roe !== null && roe > 0 ? `${roe.toFixed(1)}%` : "—" },
                ].map(m => (
                    <div key={m.label} className="text-center p-3.5 bg-[#faf9f7] dark:bg-[#242320]/60 rounded-xl">
                        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{m.label}</p>
                        <p className="text-sm font-mono font-bold text-neutral-700 dark:text-neutral-200 mt-0.5">{m.value}</p>
                    </div>
                ))}
            </div>

            <button className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#faf9f7] dark:bg-[#242320] hover:bg-[#16a34a] hover:text-white text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-all">
                상세 분석
                <ChevronRight size={12} />
            </button>
        </div>
    );
}

// =========================================================================
// 메인 스크리너
// =========================================================================
const VALID_SORT_KEYS: DiscoverySortKey[] = ["ticker", "ncav_ratio", "per", "pbr", "roe", "market_cap", "last_price"];

function ScreenerContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const ncavDailyDates = useAppSelector(selectNcavDailyDates);
    const ncavDailyList = useAppSelector(selectNcavDailyList);
    const likedTickersArr = useAppSelector(selectLikedTickers);
    const likedList = useAppSelector(selectLikedList);
    const likedTickers = useMemo(() => new Set(likedTickersArr), [likedTickersArr]);

    // URL query params → 상태 초기화 (페이지 재진입 시에도 필터 유지)
    const [activeStrategyIds, setActiveStrategyIds] = useState<Set<string>>(() => {
        const s = searchParams.get('strategies');
        return s ? new Set(s.split(',').filter(id => STRATEGY_PRESETS.some(p => p.id === id))) : new Set();
    });
    const [filterMode, setFilterMode] = useState<'OR' | 'AND'>(() =>
        searchParams.get('mode') === 'AND' ? 'AND' : 'OR'
    );
    const [showGuide, setShowGuide] = useState(false);
    const [sortKey, setSortKey] = useState<DiscoverySortKey>(() => {
        const s = searchParams.get('sort') as DiscoverySortKey;
        return VALID_SORT_KEYS.includes(s) ? s : 'ncav_ratio';
    });
    const [sortOrder, setSortOrder] = useState<SortOrder>(() =>
        searchParams.get('order') === 'asc' ? 'asc' : 'desc'
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [displayCount, setDisplayCount] = useState(DAILY_PAGE_SIZE);
    const [excludeHoldings, setExcludeHoldings] = useState(() =>
        searchParams.get('exclude')?.split(',').includes('holdings') ?? false
    );
    const [excludeDeficit, setExcludeDeficit] = useState(() =>
        searchParams.get('exclude')?.split(',').includes('deficit') ?? false
    );
    const [excludeDelisted, setExcludeDelisted] = useState(() => {
        const p = searchParams.get('exclude');
        return p === null ? true : p.split(',').includes('delisted');
    });
    const [filterOpen, setFilterOpen] = useState(false);
    const [showLikedOnly, setShowLikedOnly] = useState(() =>
        searchParams.get('filter') === 'liked'
    );
    // 시가총액 필터 (단위: 억원, URL param: mincap)
    const [minMarketCap, setMinMarketCap] = useState<number>(() => {
        const mc = Number(searchParams.get('mincap') ?? 0);
        return MKTCAP_PRESETS.some(p => p.value === mc) ? mc : 0;
    });

    const hasDiscovered = useRef(false);

    useEffect(() => {
        dispatch(reqGetNcavDailyDates());
        dispatch(reqGetNcavDailyList("latest"));
        dispatch(reqGetMyLikes());
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

    // 필터 상태 → URL 동기화 (다른 페이지 다녀와도 필터 유지)
    useEffect(() => {
        const params = new URLSearchParams();
        if (activeStrategyIds.size > 0)
            params.set('strategies', Array.from(activeStrategyIds).join(','));
        if (filterMode !== 'OR')
            params.set('mode', filterMode);
        if (sortKey !== 'ncav_ratio')
            params.set('sort', sortKey);
        if (sortOrder !== 'desc')
            params.set('order', sortOrder);
        const excludeList = [
            excludeHoldings ? 'holdings' : null,
            excludeDeficit ? 'deficit' : null,
            excludeDelisted ? 'delisted' : null,
        ].filter(Boolean).join(',');
        if (excludeList) params.set('exclude', excludeList);
        if (minMarketCap > 0) params.set('mincap', String(minMarketCap));

        if (showLikedOnly) params.set('filter', 'liked');
        const qs = params.toString();
        router.replace(qs ? `/screener?${qs}` : '/screener', { scroll: false });
    }, [activeStrategyIds, filterMode, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludeDelisted, minMarketCap, showLikedOnly, router]);

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

    const toggleStrategy = useCallback((id: string) => {
        setActiveStrategyIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const clearStrategies = useCallback(() => {
        setActiveStrategyIds(new Set());
        setFilterMode('OR');
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const resetAllFilters = useCallback(() => {
        setActiveStrategyIds(new Set());
        setFilterMode('OR');
        setSortKey('ncav_ratio');
        setSortOrder('desc');
        setSearchQuery('');
        setExcludeHoldings(false);
        setExcludeDeficit(false);
        setExcludeDelisted(true);
        setMinMarketCap(0);
        setShowLikedOnly(false);
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const strategyCounts = useMemo(() => {
        const counts: Record<string, number> = { all: ncavDailyList.list.length };
        STRATEGY_PRESETS.forEach(preset => {
            counts[preset.id] = ncavDailyList.list.filter(
                item => preset.clientFilter
                    ? preset.clientFilter(item as any)
                    : resolveStrategies(item as any).includes(preset.id)
            ).length;
        });
        return counts;
    }, [ncavDailyList.list]);

    // 관심 종목 뷰: likedTickers(optimistic) 기준으로 scan 데이터 → server 데이터 → 최소 항목 순으로 병합
    const normalizedLikedList = useMemo(() => {
        if (likedTickers.size === 0) return [] as Record<string, any>[];
        const scanMap = new Map(ncavDailyList.list.map((item: any) => [item.name, item]));
        const likedMap = new Map(likedList.map(item => [item.ticker, item]));
        return Array.from(likedTickers).map(ticker => {
            const fromScan = scanMap.get(ticker);
            if (fromScan) return fromScan;
            const fromLiked = likedMap.get(ticker);
            if (fromLiked) return { ...fromLiked, name: fromLiked.stock_name ?? ticker };
            return { ticker, name: ticker, strategies: [] as string[] };
        }) as Record<string, any>[];
    }, [likedTickers, likedList, ncavDailyList.list]);

    const filteredList = useMemo(() => {
        let list: Record<string, any>[] = showLikedOnly
            ? normalizedLikedList
            : [...ncavDailyList.list];

        if (activeStrategyIds.size > 0) {
            const check = filterMode === 'AND' ? 'every' : 'some';
            list = list.filter((item) =>
                Array.from(activeStrategyIds)[check]((stratId) => {
                    const preset = STRATEGY_PRESETS.find(p => p.id === stratId);
                    return preset?.clientFilter ? preset.clientFilter(item) : resolveStrategies(item).includes(stratId);
                })
            );
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(item =>
                (item.ticker ?? "").toLowerCase().includes(q) ||
                (item.name ?? "").toLowerCase().includes(q)
            );
        }

        if (excludeDelisted) list = list.filter(item => item.lstn_stcn == null || safeNum(item.lstn_stcn) !== 0);
        if (excludeHoldings) list = list.filter(item => !item.name?.includes("홀딩스"));
        if (excludeDeficit)  list = list.filter(item => safeNum(item.eps) > 0);
        if (minMarketCap > 0) list = list.filter(item => safeNum(item.market_cap) >= minMarketCap);

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
    }, [ncavDailyList.list, normalizedLikedList, showLikedOnly, activeStrategyIds, filterMode, searchQuery, excludeDelisted, excludeHoldings, excludeDeficit, minMarketCap, sortKey, sortOrder]);

    const visibleList = filteredList.slice(0, displayCount);
    const hasMore = filteredList.length > displayCount;
    const isLoading = !showLikedOnly && (ncavDailyList.state === "pending" || ncavDailyList.state === "init");

    const handleStockClick = useCallback((ticker: string, name: string) => {
        // KR 종목은 종목명으로 검색 (corpCodeJson[종목명] → stock_code 매핑)
        router.push(`/analyze?ticker=${encodeURIComponent(name)}&from=screener`);
    }, [router]);

    const handleToggleLike = useCallback((ticker: string, name: string) => {
        // KR 종목 좋아요 키는 종목명 기준 — analyze와 동일하게 통일
        dispatch(reqToggleLike({ ticker: name, name, isUs: false }));
    }, [dispatch]);

    const scanDate = ncavDailyList.scanDate;
    const formattedDate = scanDate
        ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
        : null;
    const scanningInProgress = ncavDailyList.scanningInProgress;

    const activeFilterCount = [excludeHoldings, excludeDeficit, minMarketCap > 0].filter(Boolean).length;
    const isAllActive = activeStrategyIds.size === 0;
    const hasActiveFilters = activeStrategyIds.size > 0 || excludeHoldings || excludeDeficit || !excludeDelisted || minMarketCap > 0 || sortKey !== 'ncav_ratio' || sortOrder !== 'desc' || showLikedOnly;

    return (
        <Tooltip.Provider delayDuration={300}>
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] text-neutral-900 dark:text-neutral-100">

            {/* ── 헤더 ── */}
            <div className="bg-white dark:bg-[#1f1e1b] border-b border-neutral-200 dark:border-[#3a3834] border-t-[3px] border-t-[#16a34a]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                {showLikedOnly
                                    ? <Heart size={18} className="text-rose-500" fill="currentColor" />
                                    : <TrendingUp size={18} className="text-[#16a34a] dark:text-[#16a34a]" strokeWidth={2.5} />
                                }
                                <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                                    {showLikedOnly ? "내 관심 종목" : scanningInProgress ? "어제의 발굴 종목" : "오늘의 발굴 종목"}
                                </h1>
                            </div>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium flex items-center gap-2">
                                {isLoading && !showLikedOnly ? (
                                    <span className="flex items-center gap-1.5">
                                        <Loader2 size={11} className="animate-spin" />
                                        데이터 로딩 중...
                                    </span>
                                ) : (
                                    <>
                                        {!showLikedOnly && formattedDate && <span className="font-mono">{formattedDate}</span>}
                                        {!showLikedOnly && formattedDate && <span>·</span>}
                                        총 <span className="font-bold text-neutral-700 dark:text-neutral-300 mx-0.5">{filteredList.length}개</span> 종목
                                        {!showLikedOnly && ncavDailyList.list.length !== filteredList.length && (
                                            <span className="text-neutral-400"> (전체 {ncavDailyList.list.length}개 중)</span>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#faf9f7] dark:bg-[#242320] hover:bg-neutral-200 dark:hover:bg-[#242320] text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-start"
                        >
                            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                            새로고침
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 수집 중 안내 배너 ── */}
            {scanningInProgress && !showLikedOnly && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/70 dark:border-amber-800/30">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2">
                        <Clock size={13} className="text-amber-500 dark:text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                            오늘 발굴 종목 수집 중 — 아직 스캔되지 않은 종목은 어제({formattedDate}) 데이터로 보완됩니다.
                        </p>
                    </div>
                </div>
            )}

            {/* ── 전략 탭 (sticky, 멀티셀렉트) ── */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1f1e1b]/95 backdrop-blur-md border-b border-neutral-200 dark:border-[#3a3834]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">

                    {/* 첫째 줄: 전략 탭 (전체 너비 스크롤) */}
                    <div className="flex items-center gap-1.5 pt-3 pb-2">
                        {/* 전체 탭 */}
                        <button
                            onClick={clearStrategies}
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                isAllActive
                                    ? STRATEGY_ACTIVE_CLS.all
                                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#242320]"
                            )}
                        >
                            전체
                            <span className={cn(
                                "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                isAllActive ? "bg-white/20 dark:bg-black/20" : "bg-[#faf9f7] dark:bg-[#4a4641] text-neutral-500"
                            )}>
                                {strategyCounts.all}
                            </span>
                        </button>

                        {/* 전략 탭 스크롤 영역 */}
                        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
                            {STRATEGY_PRESETS.map(preset => {
                                const isActive = activeStrategyIds.has(preset.id);
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={() => toggleStrategy(preset.id)}
                                        className={cn(
                                            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                            isActive
                                                ? STRATEGY_ACTIVE_CLS[preset.id]
                                                : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#242320]"
                                        )}
                                    >
                                        {preset.label}
                                        <span className={cn(
                                            "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                            isActive ? "bg-white/20 dark:bg-black/20" : "bg-[#faf9f7] dark:bg-[#4a4641] text-neutral-500"
                                        )}>
                                            {strategyCounts[preset.id] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 둘째 줄: 관심 + 전략 안내 + 초기화 */}
                    <div className="flex items-center gap-2 pb-3">
                        {/* 관심 종목 필터 */}
                        <button
                            onClick={() => { setShowLikedOnly(o => !o); setActiveStrategyIds(new Set()); setDisplayCount(DAILY_PAGE_SIZE); }}
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                showLikedOnly
                                    ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-500 dark:hover:text-rose-400 bg-white dark:bg-[#242320]"
                            )}
                        >
                            <Heart size={11} fill={showLikedOnly ? "currentColor" : "none"} />
                            관심
                            <span className={cn(
                                "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                showLikedOnly ? "bg-white/20" : "bg-[#faf9f7] dark:bg-[#4a4641] text-neutral-500"
                            )}>
                                {likedTickers.size}
                            </span>
                        </button>

                        <div className="flex-1" />

                        {/* 전략 가이드 토글 */}
                        <button
                            onClick={() => setShowGuide(o => !o)}
                            className={cn(
                                "shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all",
                                showGuide
                                    ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-[#86efac] dark:border-[#15803d] text-[#15803d] dark:text-[#16a34a]"
                                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 bg-white dark:bg-[#242320]"
                            )}
                            title="전략 설명 보기"
                        >
                            <Info size={12} />
                            <span className="hidden sm:inline">전략 안내</span>
                        </button>

                        {/* 전체 필터 초기화 */}
                        {hasActiveFilters && (
                            <button
                                onClick={resetAllFilters}
                                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/50 text-xs font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all bg-white dark:bg-[#242320]"
                                title="모든 필터 초기화"
                            >
                                <X size={12} />
                                <span className="hidden sm:inline">초기화</span>
                            </button>
                        )}
                    </div>

                    {/* 선택된 전략 조합 안내 */}
                    {activeStrategyIds.size > 1 && (
                        <div className="pb-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-neutral-400 font-medium">조합:</span>
                            {Array.from(activeStrategyIds).map(id => {
                                const preset = STRATEGY_PRESETS.find(p => p.id === id);
                                if (!preset) return null;
                                return (
                                    <span key={id} className={cn(
                                        "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded",
                                        STRATEGY_BADGE[id] ?? "bg-[#faf9f7] text-neutral-500"
                                    )}>
                                        {preset.label}
                                        <button onClick={() => toggleStrategy(id)} className="hover:opacity-70">
                                            <X size={9} />
                                        </button>
                                    </span>
                                );
                            })}
                            {/* OR / AND 토글 */}
                            <div className="flex items-center rounded-full border border-neutral-200 dark:border-[#3a3834] overflow-hidden text-[10px] font-black">
                                <button
                                    onClick={() => setFilterMode('OR')}
                                    className={cn(
                                        "px-2 py-0.5 transition-colors",
                                        filterMode === 'OR'
                                            ? "bg-[#16a34a] text-white"
                                            : "text-neutral-500 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#242320]"
                                    )}
                                >
                                    OR
                                </button>
                                <button
                                    onClick={() => setFilterMode('AND')}
                                    className={cn(
                                        "px-2 py-0.5 transition-colors border-l border-neutral-200 dark:border-[#3a3834]",
                                        filterMode === 'AND'
                                            ? "bg-[#16a34a] text-white"
                                            : "text-neutral-500 dark:text-neutral-400 hover:bg-[#f5f0e8] dark:hover:bg-[#242320]"
                                    )}
                                >
                                    AND
                                </button>
                            </div>
                            <span className="text-[10px] text-neutral-400">
                                {filterMode === 'AND' ? '모두 충족' : '중 하나 이상 충족'} · {filteredList.length}개
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── 전략 가이드 패널 ── */}
            {showGuide && (
                <div className="bg-white dark:bg-[#242320] border-b border-neutral-200 dark:border-[#35332e]">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-black text-neutral-900 dark:text-white">전략 설명</h2>
                            <button
                                onClick={() => setShowGuide(false)}
                                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {STRATEGY_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => toggleStrategy(preset.id)}
                                    className={cn(
                                        "text-left p-3.5 rounded-xl border-2 transition-all",
                                        activeStrategyIds.has(preset.id)
                                            ? "border-[#16a34a] dark:border-[#16a34a] bg-[#f0fdf4] dark:bg-[#052e16]/20"
                                            : "border-neutral-200 dark:border-[#3a3834] hover:border-neutral-300 dark:hover:border-neutral-600 bg-[#faf9f7] dark:bg-[#242320]/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "text-[10px] font-extrabold px-2 py-0.5 rounded",
                                            STRATEGY_BADGE[preset.id] ?? "bg-[#faf9f7] text-neutral-500"
                                        )}>
                                            {preset.label}
                                        </span>
                                        <span className="text-[10px] text-neutral-400 font-mono">
                                            {strategyCounts[preset.id] ?? 0}개
                                        </span>
                                        {activeStrategyIds.has(preset.id) && (
                                            <span className="ml-auto text-[9px] font-black text-[#16a34a] dark:text-[#16a34a] bg-[#dcfce7] dark:bg-[#14532d]/40 px-1.5 py-0.5 rounded">선택됨</span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        {preset.hint}
                                    </p>
                                </button>
                            ))}
                        </div>
                        <p className="mt-3 text-[10px] text-neutral-400 dark:text-neutral-500">
                            · 전략 카드를 클릭하면 필터에 추가됩니다. 복수 선택 후 OR(하나 이상 충족) 또는 AND(모두 충족) 조합 방식을 선택할 수 있습니다.
                        </p>
                    </div>
                </div>
            )}

            {/* ── 검색 & 필터 바 ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setDisplayCount(DAILY_PAGE_SIZE); }}
                        placeholder="종목명 또는 티커 검색"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-[#242320] border border-neutral-200 dark:border-[#3a3834] rounded-xl outline-none focus:ring-2 focus:ring-[#f0fdf4]0/30 focus:border-[#16a34a] placeholder:text-neutral-400 font-medium"
                    />
                </div>

                <button
                    onClick={() => setFilterOpen(o => !o)}
                    className={cn(
                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all",
                        filterOpen || activeFilterCount > 0
                            ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-[#86efac] dark:border-[#166534] text-[#15803d] dark:text-[#16a34a]"
                            : "bg-white dark:bg-[#242320] border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                    )}
                >
                    <SlidersHorizontal size={12} />
                    필터
                    {activeFilterCount > 0 && (
                        <span className="w-4 h-4 flex items-center justify-center rounded-full bg-[#16a34a] text-white text-[9px] font-black">
                            {activeFilterCount}
                        </span>
                    )}
                </button>

                {filterOpen && (
                    <div className="w-full flex flex-wrap items-center gap-x-5 gap-y-3 px-1 py-2">
                        {/* 시가총액 필터 */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">시가총액</span>
                            {MKTCAP_PRESETS.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => { setMinMarketCap(p.value); setDisplayCount(DAILY_PAGE_SIZE); }}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg border text-xs font-bold transition-all",
                                        minMarketCap === p.value
                                            ? "bg-[#16a34a] border-[#16a34a] text-white shadow-sm"
                                            : "bg-white dark:bg-[#242320] border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        {/* 구분선 */}
                        <div className="w-px h-4 bg-neutral-200 dark:bg-[#4a4641] hidden sm:block" />

                        {/* 제외 조건 */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">제외</span>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={excludeHoldings}
                                    onChange={e => setExcludeHoldings(e.target.checked)}
                                    className="rounded accent-[#16a34a]"
                                />
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">홀딩스</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={excludeDeficit}
                                    onChange={e => setExcludeDeficit(e.target.checked)}
                                    className="rounded accent-[#16a34a]"
                                />
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">적자 기업</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={excludeDelisted}
                                    onChange={e => setExcludeDelisted(e.target.checked)}
                                    className="rounded accent-[#16a34a]"
                                />
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">상장폐지 의심</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>

            {/* ── 종목 리스트 ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">

                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 size={32} className="animate-spin text-[#16a34a]/50" />
                        <p className="text-sm font-bold text-neutral-400">스캔 데이터 불러오는 중...</p>
                    </div>
                )}

                {!isLoading && filteredList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className="p-4 bg-[#faf9f7] dark:bg-[#242320] rounded-2xl">
                            {showLikedOnly
                                ? <Heart size={24} className="text-neutral-400" />
                                : <Search size={24} className="text-neutral-400" />
                            }
                        </div>
                        <div>
                            {showLikedOnly ? (
                                <>
                                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">관심 종목이 없습니다</p>
                                    <p className="text-xs text-neutral-400 mt-1">종목 목록에서 하트를 눌러 관심 종목을 추가해보세요.</p>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">조건에 맞는 종목이 없습니다</p>
                                    <p className="text-xs text-neutral-400 mt-1">전략 필터를 조정하거나 검색어를 변경해보세요.</p>
                                </>
                            )}
                        </div>
                        {activeStrategyIds.size > 0 && (
                            <button
                                onClick={clearStrategies}
                                className="text-xs font-bold text-[#16a34a] hover:underline"
                            >
                                전략 필터 초기화
                            </button>
                        )}
                    </div>
                )}

                {!isLoading && filteredList.length > 0 && (
                    <>
                        {/* 데스크탑 테이블 */}
                        <div className="hidden md:block">
                            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_88px] gap-4 items-center px-6 py-4 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-200 dark:border-[#35332e]">
                                    <SortableHeader label="종목명" sortKey="ticker" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략</div>
                                    <SortableHeader label="NCAV 비율" sortKey="ncav_ratio" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <SortableHeader label="PBR" sortKey="pbr" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <SortableHeader label="PER" sortKey="per" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <SortableHeader label="ROE" sortKey="roe" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div />
                                </div>
                                <div>
                                    {visibleList.map((item: any) => (
                                        <TableRow key={item.ticker} item={item} onClick={handleStockClick} likedTickers={likedTickers} onToggleLike={handleToggleLike} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 모바일 카드 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                            {visibleList.map((item: any) => (
                                <StockRowCard key={item.ticker} item={item} onClick={handleStockClick} likedTickers={likedTickers} onToggleLike={handleToggleLike} />
                            ))}
                        </div>

                        {hasMore && (
                            <div className="flex justify-center mt-10">
                                <button
                                    onClick={() => setDisplayCount(c => c + DAILY_PAGE_SIZE)}
                                    className="px-6 py-2.5 rounded-xl border border-neutral-200 dark:border-[#35332e] bg-white dark:bg-[#242320] text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-[#4a4641] hover:text-neutral-900 dark:hover:text-white transition-all"
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
            <div className="flex items-center justify-center min-h-screen bg-[#faf9f7] dark:bg-[#1a1915]">
                <Loader2 className="animate-spin text-[#16a34a]" size={24} />
            </div>
        }>
            <ScreenerContent />
        </Suspense>
    );
}
