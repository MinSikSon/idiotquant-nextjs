"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, useCallback, useRef, Suspense, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { computeValueScore, type ValueTone } from "@/lib/utils/valueScore";
import { CopyStockButtons, type CopyStock } from "@/components/copyStockButtons";
import { STRATEGY_LABEL, STRATEGY_BADGE, STRATEGY_PRESETS_CLIENT as STRATEGY_PRESETS, MKTCAP_PRESETS } from "@/lib/constants/strategies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };
import { RefreshCw, ChevronRight, Loader2, Search, SlidersHorizontal, TrendingUp, Info, X, Heart, Clock, Share2, Check, Lock } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

// =========================================================================
// 상수 & 타입
// =========================================================================
const DAILY_PAGE_SIZE = 30;
type DiscoverySortKey = "value_score" | "ticker" | "ncav_ratio" | "per" | "pbr" | "roe" | "market_cap" | "last_price";
type SortOrder = "asc" | "desc";

// 밸류에이션 필터 프리셋 (0 = 미적용)
const PBR_MAX_PRESETS = [0.5, 0.7, 1.0];   // PBR 이하
const PER_MAX_PRESETS = [5, 10, 15];        // PER 이하
const ROE_MIN_PRESETS = [5, 10, 15];        // ROE(%) 이상
const NCAV_MIN_PRESETS = [0.7, 1.0, 1.5];   // NCAV 비율 이상
// 우선주: 종목명이 '우' / '우B' / '우C' 등으로 끝남
const isPreferredStock = (name: string): boolean => /\d*우[A-C]?$/.test((name ?? "").trim());

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

// 백엔드 strategies + 프론트엔드 clientFilter 병합 (백엔드 미분류 종목도 표시)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveStrategies(item: Record<string, any>): string[] {
    const base = new Set<string>(item.strategies ?? []);
    for (const preset of STRATEGY_PRESETS) {
        if (preset.clientFilter && preset.clientFilter(item)) base.add(preset.id);
    }
    return Array.from(base);
}

// 단일 전략 선택 시 강조할 지표 컬럼 + 기준 충족 판정. 키는 전략의 기준이 되는 컬럼.
type MetricKey = "ncav_ratio" | "pbr" | "per" | "roe";
type HighlightMap = Partial<Record<MetricKey, (i: any) => boolean>>;
const roeOf = (i: any) => safeNum(i.bps) > 0 ? (safeNum(i.eps) / safeNum(i.bps)) * 100 : 0;
const grahamOk = (i: any) => safeNum(i.per) > 0 && safeNum(i.pbr) > 0 && safeNum(i.per) * safeNum(i.pbr) < 22.5;
const STRATEGY_HIGHLIGHT: Record<string, HighlightMap> = {
    ncav:           { ncav_ratio: i => safeNum(i.ncav_ratio) >= 1.0 },
    near_ncav:      { ncav_ratio: i => safeNum(i.ncav_ratio) >= 0.7 && safeNum(i.ncav_ratio) < 1.0 },
    low_pbr:        { pbr: i => safeNum(i.pbr) > 0 && safeNum(i.pbr) < 0.5 },
    low_per:        { per: i => safeNum(i.per) > 0 && safeNum(i.per) < 10 },
    graham_number:  { per: grahamOk, pbr: grahamOk },
    s_rim:          { roe: i => roeOf(i) > 8, pbr: i => safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.0 },
    magic_formula:  { per: i => safeNum(i.per) > 0 && safeNum(i.per) < 15, roe: i => roeOf(i) > 10 },
    quality_value:  { roe: i => roeOf(i) > 15, pbr: i => safeNum(i.pbr) > 0 && safeNum(i.pbr) < 2.0 },
    balanced_value: { per: i => safeNum(i.per) > 5 && safeNum(i.per) < 15, pbr: i => safeNum(i.pbr) > 0 && safeNum(i.pbr) < 1.5 },
};

// 강조 컬럼의 값 span에 입힐 클래스 (기준 충족=초록 pill, 미달=중립 pill, 비대상=없음)
function hlPillCls(highlight: HighlightMap | null, key: MetricKey, item: any): string {
    if (!highlight || !(key in highlight)) return "";
    return highlight[key]!(item)
        ? "px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900/60 text-emerald-600 dark:text-emerald-400 font-bold"
        : "px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-[#2c2b27] text-neutral-400";
}

const TOOLTIP_CLS =
    "z-50 max-w-64 rounded-xl px-3.5 py-3 text-xs bg-neutral-900 dark:bg-[#242320] border border-neutral-700/60 shadow-lg text-neutral-200 leading-relaxed " +
    "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 " +
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95";

// =========================================================================
// SortableHeader
// =========================================================================
function SortableHeader({ label, sortKey: key, currentKey, order, onToggle, relevant }: {
    label: string;
    sortKey: DiscoverySortKey;
    currentKey: DiscoverySortKey;
    order: SortOrder;
    onToggle: (k: DiscoverySortKey) => void;
    relevant?: boolean;
}) {
    const active = currentKey === key;
    return (
        <button
            onClick={() => onToggle(key)}
            className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap",
                active ? "text-[#16a34a] dark:text-[#16a34a]" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                relevant && !active && "text-emerald-600/90 dark:text-emerald-400/90"
            )}
        >
            {relevant && <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />}
            {label}
            <span className="text-[9px] font-mono">{active ? (order === "asc" ? "↑" : "↓") : "↕"}</span>
        </button>
    );
}

// =========================================================================
// ValueMedal — 저평가 점수 + 메달 (게임 스코어)
// =========================================================================
const MEDAL_TONE: Record<ValueTone, string> = {
    legend: "bg-violet-100 text-violet-700 ring-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-800",
    treasure: "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800",
    diamond: "bg-sky-50 text-sky-700 ring-sky-300 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-800",
    gold: "bg-yellow-50 text-yellow-700 ring-yellow-300 dark:bg-yellow-950/30 dark:text-yellow-300 dark:ring-yellow-800",
    silver: "bg-neutral-100 text-neutral-600 ring-neutral-300 dark:bg-[#2c2b27] dark:text-neutral-300 dark:ring-[#4a4641]",
    bronze: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:ring-orange-900",
    raw: "bg-stone-100 text-stone-600 ring-stone-300 dark:bg-stone-900/40 dark:text-stone-400 dark:ring-stone-700",
    explore: "bg-neutral-50 text-neutral-400 ring-neutral-200 dark:bg-[#242320] dark:text-neutral-500 dark:ring-[#35332e]",
};
function ValueMedal({ item, size = "sm" }: { item: any; size?: "sm" | "lg" }) {
    const v = computeValueScore(item);
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-black tabular-nums shrink-0",
                size === "lg" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-[11px]",
                MEDAL_TONE[v.tone]
            )}
            title={`저평가 점수 ${v.score}/100 · ${v.label}등급 (NCAV·PBR·PER·ROE 종합)`}
        >
            <span aria-hidden>{v.medal}</span>{v.score}
        </span>
    );
}

// =========================================================================
// TableRow — 데스크탑
// =========================================================================
const TableRow = memo(function TableRow({ item, onClick, isLiked, onToggleLike, highlight }: {
    item: any;
    onClick: (ticker: string, name: string) => void;
    isLiked: boolean;
    onToggleLike: (ticker: string, name: string) => void;
    highlight: HighlightMap | null;
}) {
    const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;
    const strategies: string[] = resolveStrategies(item);
    const ncav = safeNum(item.ncav_ratio);

    return (
        <div
            className="group grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_112px] gap-4 items-center px-6 py-5 hover:bg-[#f0fdf4]/40 dark:hover:bg-[#242320]/50 cursor-pointer transition-colors border-b border-neutral-100 dark:border-[#35332e] last:border-0"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="min-w-0 flex items-center gap-2">
                <ValueMedal item={item} />
                <div className="min-w-0">
                    <p className="font-bold text-sm text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                    <p className="text-[11px] text-neutral-400 font-mono mt-0.5 tracking-wider">{item.ticker}</p>
                </div>
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
                    ncav >= 0.7 ? "text-amber-500" : "text-neutral-400",
                    hlPillCls(highlight, "ncav_ratio", item)
                )}>
                    {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className={cn("text-sm font-mono text-neutral-600 dark:text-neutral-300 tabular-nums", hlPillCls(highlight, "pbr", item))}>
                    {safeNum(item.pbr) > 0 ? `${safeNum(item.pbr).toFixed(2)}` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className={cn("text-sm font-mono text-neutral-600 dark:text-neutral-300 tabular-nums", hlPillCls(highlight, "per", item))}>
                    {safeNum(item.per) > 0 ? `${safeNum(item.per).toFixed(1)}` : "—"}
                </span>
            </div>

            <div className="text-right">
                <span className={cn(
                    "text-sm font-mono tabular-nums",
                    roe && roe > 15 ? "text-emerald-600 dark:text-emerald-400 font-bold" :
                    roe && roe > 0 ? "text-neutral-600 dark:text-neutral-300" : "text-neutral-400",
                    hlPillCls(highlight, "roe", item)
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
});

// =========================================================================
// StockRowCard — 모바일
// =========================================================================
const StockRowCard = memo(function StockRowCard({ item, onClick, isLiked, onToggleLike, highlight }: {
    item: any;
    onClick: (ticker: string, name: string) => void;
    isLiked: boolean;
    onToggleLike: (ticker: string, name: string) => void;
    highlight: HighlightMap | null;
}) {
    const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;
    const strategies: string[] = resolveStrategies(item);
    const ncav = safeNum(item.ncav_ratio);

    return (
        <div
            className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 cursor-pointer hover:border-[#86efac] dark:hover:border-[#15803d]/50 hover:shadow-md transition-all active:scale-[0.99]"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <ValueMedal item={item} size="lg" />
                    </div>
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
                            : "bg-[#faf9f7] dark:bg-[#242320] text-neutral-500",
                        highlight && "ncav_ratio" in highlight && "ring-2 ring-emerald-400/60 dark:ring-emerald-500/50"
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
                {([
                    { key: "pbr" as MetricKey, label: "PBR", value: safeNum(item.pbr) > 0 ? `${safeNum(item.pbr).toFixed(2)}` : "—" },
                    { key: "per" as MetricKey, label: "PER", value: safeNum(item.per) > 0 ? `${safeNum(item.per).toFixed(1)}` : "—" },
                    { key: "roe" as MetricKey, label: "ROE", value: roe !== null && roe > 0 ? `${roe.toFixed(1)}%` : "—" },
                ]).map(m => {
                    const rel = !!highlight && m.key in highlight;
                    const met = rel && highlight![m.key]!(item);
                    return (
                        <div key={m.label} className={cn(
                            "text-center p-3.5 rounded-xl",
                            rel && met ? "bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900/60"
                                : "bg-[#faf9f7] dark:bg-[#242320]/60"
                        )}>
                            <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">{m.label}</p>
                            <p className={cn(
                                "text-sm font-mono font-bold mt-0.5",
                                rel && met ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-700 dark:text-neutral-200"
                            )}>{m.value}</p>
                        </div>
                    );
                })}
            </div>

            <button className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#faf9f7] dark:bg-[#242320] hover:bg-[#16a34a] hover:text-white text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-all">
                상세 분석
                <ChevronRight size={12} />
            </button>
        </div>
    );
});

// =========================================================================
// 숫자 프리셋 필터 그룹 (NCAV/PBR/PER/ROE 공통 UI). 활성 값을 다시 누르면 해제(0).
// =========================================================================
function NumericPresetGroup({ label, presets, value, onPick, fmt }: {
    label: string;
    presets: number[];
    value: number;
    onPick: (v: number) => void;
    fmt: (v: number) => string;
}) {
    return (
        <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">{label}</span>
            {presets.map(p => (
                <button
                    key={p}
                    onClick={() => onPick(value === p ? 0 : p)}
                    className={cn(
                        "px-2.5 py-1 rounded-lg border text-xs font-bold transition-all",
                        value === p
                            ? "bg-[#16a34a] border-[#16a34a] text-white shadow-sm"
                            : "bg-white dark:bg-[#242320] border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
                    )}
                >
                    {fmt(p)}
                </button>
            ))}
        </div>
    );
}

const FilterDivider = () => <div className="w-px h-4 bg-neutral-200 dark:bg-[#4a4641] hidden sm:block" />;

// =========================================================================
// 메인 스크리너
// =========================================================================
const VALID_SORT_KEYS: DiscoverySortKey[] = ["value_score", "ticker", "ncav_ratio", "per", "pbr", "roe", "market_cap", "last_price"];

function ScreenerContent() {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const isLoggedIn = !!session;
    // 비로그인 시 고급 필터/관심 사용 → 로그인 페이지로 유도 (복귀 URL 보존)
    const requireLogin = useCallback(() => {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/screener${window.location.search}`)}`);
    }, [router]);
    const ncavDailyDates = useAppSelector(selectNcavDailyDates);
    const ncavDailyList = useAppSelector(selectNcavDailyList);
    const likedTickersArr = useAppSelector(selectLikedTickers);
    const likedList = useAppSelector(selectLikedList);
    const likedTickers = useMemo(() => new Set(likedTickersArr), [likedTickersArr]);

    // URL query params → localStorage(전체 필터 스냅샷) 순 fallback으로 상태 초기화
    // (다른 페이지 다녀와 URL 파라미터가 없어도 마지막 필터를 그대로 복원)
    const saved = useMemo(() => {
        if (typeof window === 'undefined') return {} as Record<string, any>;
        try { return JSON.parse(localStorage.getItem('screener:filters') || '{}') as Record<string, any>; }
        catch { return {} as Record<string, any>; }
    }, []);
    const urlExclude = useMemo(() => searchParams.get('exclude')?.split(',') ?? null, [searchParams]);
    const initExclude = (key: string): boolean =>
        urlExclude ? urlExclude.includes(key) : (Array.isArray(saved.exclude) && saved.exclude.includes(key));
    const initNum = (param: string, savedKey: string, allowed?: number[]): number => {
        const raw = searchParams.get(param);
        const v = Number(raw ?? (saved[savedKey] ?? 0));
        if (!Number.isFinite(v) || v <= 0) return 0;
        return allowed && !allowed.includes(v) ? 0 : v;
    };

    const [activeStrategyIds, setActiveStrategyIds] = useState<Set<string>>(() => {
        const urlS = searchParams.get('strategies');
        const src = urlS ?? (Array.isArray(saved.strategies) ? saved.strategies.join(',') : '');
        return new Set((src || '').split(',').filter(id => STRATEGY_PRESETS.some(p => p.id === id)));
    });
    const [filterMode, setFilterMode] = useState<'OR' | 'AND'>(() =>
        (searchParams.get('mode') ?? saved.mode) === 'AND' ? 'AND' : 'OR'
    );
    const [showGuide, setShowGuide] = useState(false);
    const [sortKey, setSortKey] = useState<DiscoverySortKey>(() => {
        const s = (searchParams.get('sort') ?? saved.sort) as DiscoverySortKey;
        return VALID_SORT_KEYS.includes(s) ? s : 'value_score';
    });
    const [sortOrder, setSortOrder] = useState<SortOrder>(() =>
        (searchParams.get('order') ?? saved.order) === 'asc' ? 'asc' : 'desc'
    );
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') ?? saved.q ?? "");
    const [displayCount, setDisplayCount] = useState(DAILY_PAGE_SIZE);
    const [shareCopied, setShareCopied] = useState(false);
    const [excludeHoldings, setExcludeHoldings] = useState(() => initExclude('holdings'));
    const [excludeDeficit, setExcludeDeficit] = useState(() => initExclude('deficit'));
    const [excludePreferred, setExcludePreferred] = useState(() => initExclude('preferred'));
    const [filterOpen, setFilterOpen] = useState(false);
    const [showLikedOnly, setShowLikedOnly] = useState(() =>
        (searchParams.get('filter') ?? saved.filter) === 'liked'
    );
    // 시가총액 필터 (단위: 억원, URL param: mincap)
    const [minMarketCap, setMinMarketCap] = useState<number>(() =>
        initNum('mincap', 'mincap', MKTCAP_PRESETS.map(p => p.value))
    );
    // 밸류에이션 필터 (0 = 미적용)
    const [maxPbr, setMaxPbr] = useState<number>(() => initNum('maxpbr', 'maxpbr', PBR_MAX_PRESETS));
    const [maxPer, setMaxPer] = useState<number>(() => initNum('maxper', 'maxper', PER_MAX_PRESETS));
    const [minRoe, setMinRoe] = useState<number>(() => initNum('minroe', 'minroe', ROE_MIN_PRESETS));
    const [minNcav, setMinNcav] = useState<number>(() => initNum('minncav', 'minncav', NCAV_MIN_PRESETS));

    const hasDiscovered = useRef(false);

    useEffect(() => {
        dispatch(reqGetNcavDailyDates());
        dispatch(reqGetNcavDailyList("latest"));
    }, [dispatch]);

    useEffect(() => {
        if (isLoggedIn) dispatch(reqGetMyLikes());
    }, [dispatch, isLoggedIn]);

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

    // 현재 필터 상태를 그대로 재현하는 쿼리 스트링 (URL 동기화 + 공유 링크 공용)
    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        if (activeStrategyIds.size > 0)
            params.set('strategies', Array.from(activeStrategyIds).join(','));
        if (filterMode !== 'OR')
            params.set('mode', filterMode);
        if (sortKey !== 'value_score')
            params.set('sort', sortKey);
        if (sortOrder !== 'desc')
            params.set('order', sortOrder);
        const excludeList = [
            excludeHoldings ? 'holdings' : null,
            excludeDeficit ? 'deficit' : null,
            excludePreferred ? 'preferred' : null,
        ].filter(Boolean).join(',');
        if (excludeList) params.set('exclude', excludeList);
        if (minMarketCap > 0) params.set('mincap', String(minMarketCap));
        if (maxPbr > 0) params.set('maxpbr', String(maxPbr));
        if (maxPer > 0) params.set('maxper', String(maxPer));
        if (minRoe > 0) params.set('minroe', String(minRoe));
        if (minNcav > 0) params.set('minncav', String(minNcav));
        if (showLikedOnly) params.set('filter', 'liked');
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        return params.toString();
    }, [activeStrategyIds, filterMode, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, minMarketCap, maxPbr, maxPer, minRoe, minNcav, showLikedOnly, searchQuery]);

    // 필터 상태 → URL 동기화 + localStorage 저장 (페이지 이동 후 재진입 시에도 전체 필터 유지)
    useEffect(() => {
        // 타이핑 등 빠른 연속 변경 시 매번 router.replace + localStorage 쓰기를 피하려 디바운스
        const debounce = setTimeout(() => {
        router.replace(queryString ? `/screener?${queryString}` : '/screener', { scroll: false });

        // 전체 필터 스냅샷을 단일 키에 저장 — 다른 페이지 이동 후 복귀 시 그대로 복원
        const snapshot: Record<string, any> = {};
        if (activeStrategyIds.size > 0) snapshot.strategies = Array.from(activeStrategyIds);
        if (filterMode !== 'OR') snapshot.mode = filterMode;
        if (sortKey !== 'value_score') snapshot.sort = sortKey;
        if (sortOrder !== 'desc') snapshot.order = sortOrder;
        const excludeArr = [
            excludeHoldings ? 'holdings' : null,
            excludeDeficit ? 'deficit' : null,
            excludePreferred ? 'preferred' : null,
        ].filter(Boolean);
        if (excludeArr.length) snapshot.exclude = excludeArr;
        if (minMarketCap > 0) snapshot.mincap = minMarketCap;
        if (maxPbr > 0) snapshot.maxpbr = maxPbr;
        if (maxPer > 0) snapshot.maxper = maxPer;
        if (minRoe > 0) snapshot.minroe = minRoe;
        if (minNcav > 0) snapshot.minncav = minNcav;
        if (showLikedOnly) snapshot.filter = 'liked';
        if (searchQuery.trim()) snapshot.q = searchQuery.trim();
        if (Object.keys(snapshot).length > 0) {
            localStorage.setItem('screener:filters', JSON.stringify(snapshot));
        } else {
            localStorage.removeItem('screener:filters');
        }
        // 레거시 개별 키 정리 (구버전 호환)
        localStorage.removeItem('screener:strategies');
        localStorage.removeItem('screener:filterMode');
        }, 300);
        return () => clearTimeout(debounce);
    }, [queryString, activeStrategyIds, filterMode, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, minMarketCap, maxPbr, maxPer, minRoe, minNcav, showLikedOnly, searchQuery, router]);

    // 현재 필터링 결과 링크 공유 (모바일: 네이티브 공유 시트 / 데스크탑: 클립보드 복사)
    const handleShare = useCallback(async () => {
        const url = `${window.location.origin}/screener${queryString ? `?${queryString}` : ''}`;
        const nav = typeof navigator !== 'undefined' ? navigator : undefined;
        if (nav?.share) {
            try {
                await nav.share({ title: "아이디어퀀트 발굴 종목", text: "필터링한 발굴 종목 보기", url });
            } catch { /* 사용자가 공유 취소 — 무시 */ }
            return;
        }
        try {
            await nav?.clipboard?.writeText(url);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2000);
        } catch { /* 클립보드 권한 없음 — 무시 */ }
    }, [queryString]);

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
        setExcludePreferred(false);
        setMinMarketCap(0);
        setMaxPbr(0);
        setMaxPer(0);
        setMinRoe(0);
        setMinNcav(0);
        setShowLikedOnly(false);
        setDisplayCount(DAILY_PAGE_SIZE);
        localStorage.removeItem('screener:filters');
        localStorage.removeItem('screener:strategies');
        localStorage.removeItem('screener:filterMode');
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
        const likedMap = new Map<string, (typeof likedList)[number]>(likedList.map(item => [item.ticker, item]));
        return Array.from(likedTickers).map((ticker: string) => {
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
                    return preset?.clientFilter ? preset.clientFilter(item) : resolveStrategies(item).includes(stratId as string);
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

        if (excludeHoldings)  list = list.filter(item => !item.name?.includes("홀딩스"));
        if (excludeDeficit)   list = list.filter(item => safeNum(item.eps) > 0);
        if (excludePreferred) list = list.filter(item => !isPreferredStock(item.name ?? ""));
        if (minMarketCap > 0) list = list.filter(item => safeNum(item.market_cap) >= minMarketCap);
        if (maxPbr > 0)  list = list.filter(item => safeNum(item.pbr) > 0 && safeNum(item.pbr) <= maxPbr);
        if (maxPer > 0)  list = list.filter(item => safeNum(item.per) > 0 && safeNum(item.per) <= maxPer);
        if (minNcav > 0) list = list.filter(item => safeNum(item.ncav_ratio) >= minNcav);
        if (minRoe > 0)  list = list.filter(item => {
            const roe = safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null;
            return roe !== null && roe >= minRoe;
        });

        list.sort((a, b) => {
            if (sortKey === "value_score") {
                const sa = computeValueScore(a).score;
                const sb = computeValueScore(b).score;
                return sortOrder === "asc" ? sa - sb : sb - sa;
            }
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
    }, [ncavDailyList.list, normalizedLikedList, showLikedOnly, activeStrategyIds, filterMode, searchQuery, excludeHoldings, excludeDeficit, excludePreferred, minMarketCap, maxPbr, maxPer, minRoe, minNcav, sortKey, sortOrder]);

    const visibleList = filteredList.slice(0, displayCount);
    const hasMore = filteredList.length > displayCount;

    // 단일 전략만 선택했을 때, 그 전략 기준 컬럼을 강조 (0개·복수 선택이면 강조 안 함)
    const highlightMap: HighlightMap | null =
        activeStrategyIds.size === 1 ? (STRATEGY_HIGHLIGHT[Array.from(activeStrategyIds)[0]] ?? null) : null;

    // 목록 복사용 행 (관심 뷰·일반 발굴 목록 공용)
    const copyRows = useMemo<CopyStock[]>(() => filteredList.map(item => ({
        name: item.name,
        ticker: item.ticker,
        ncav: item.ncav_ratio,
        pbr: item.pbr,
        per: item.per,
        roe: safeNum(item.bps) > 0 ? (safeNum(item.eps) / safeNum(item.bps)) * 100 : null,
    })), [filteredList]);
    const isLoading = !showLikedOnly && (ncavDailyList.state === "pending" || ncavDailyList.state === "init");

    const handleStockClick = useCallback((ticker: string, name: string) => {
        // KR 종목은 종목명으로 검색 (corpCodeJson[종목명] → stock_code 매핑)
        router.push(`/analyze?ticker=${encodeURIComponent(name)}&from=screener`);
    }, [router]);

    const handleToggleLike = useCallback((ticker: string, name: string) => {
        if (!isLoggedIn) { requireLogin(); return; }
        // KR 종목 좋아요 키는 종목명 기준 — analyze와 동일하게 통일
        dispatch(reqToggleLike({ ticker: name, name, isUs: false }));
    }, [dispatch, isLoggedIn, requireLogin]);

    const scanDate = ncavDailyList.scanDate;
    const formattedDate = scanDate
        ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}`
        : null;
    const prevDate = ncavDailyList.prevDate;
    const formattedPrevDate = prevDate
        ? `${prevDate.slice(0, 4)}.${prevDate.slice(4, 6)}.${prevDate.slice(6, 8)}`
        : null;
    const scanningInProgress = ncavDailyList.scanningInProgress;

    const activeFilterCount = [excludeHoldings, excludeDeficit, excludePreferred, minMarketCap > 0, maxPbr > 0, maxPer > 0, minRoe > 0, minNcav > 0].filter(Boolean).length;
    const isAllActive = activeStrategyIds.size === 0;
    const hasActiveFilters = activeStrategyIds.size > 0 || excludeHoldings || excludeDeficit || excludePreferred || minMarketCap > 0 || maxPbr > 0 || maxPer > 0 || minRoe > 0 || minNcav > 0 || sortKey !== 'value_score' || sortOrder !== 'desc' || showLikedOnly;
    const isFiltered = !showLikedOnly && filteredList.length !== ncavDailyList.list.length;

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
                                    {showLikedOnly ? "내 관심 종목" : "최근 발굴 종목"}
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
                            최근 발굴 종목 수집 중 — 아직 스캔되지 않은 종목은{formattedPrevDate ? ` 이전(${formattedPrevDate})` : " 이전"} 데이터로 보완됩니다.
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

                    {/* 둘째 줄: 관심 + 결과 수 + 전략 안내 + 초기화 */}
                    <div className="flex items-center gap-2 pb-3">
                        {/* 저평가 점수순 정렬 (게임 리더보드) */}
                        <button
                            onClick={() => { setSortKey("value_score"); setSortOrder("desc"); setDisplayCount(DAILY_PAGE_SIZE); }}
                            title="저평가 점수 높은 순으로 정렬 (NCAV·PBR·PER·ROE 종합)"
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                sortKey === "value_score"
                                    ? "bg-[#16a34a] border-[#16a34a] text-white shadow-sm"
                                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-[#86efac] dark:hover:border-[#15803d] hover:text-[#16a34a] bg-white dark:bg-[#242320]"
                            )}
                        >
                            <span aria-hidden>🏆</span>
                            점수순
                        </button>

                        {/* 관심 종목 필터 */}
                        <button
                            onClick={() => {
                                if (!isLoggedIn) { requireLogin(); return; }
                                setShowLikedOnly(o => !o); setActiveStrategyIds(new Set()); setDisplayCount(DAILY_PAGE_SIZE);
                            }}
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap",
                                showLikedOnly
                                    ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-500 dark:hover:text-rose-400 bg-white dark:bg-[#242320]"
                            )}
                        >
                            <Heart size={11} fill={showLikedOnly ? "currentColor" : "none"} />
                            관심
                            {!isLoggedIn && <Lock size={10} className="opacity-60" />}
                            <span className={cn(
                                "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                showLikedOnly ? "bg-white/20" : "bg-[#faf9f7] dark:bg-[#4a4641] text-neutral-500"
                            )}>
                                {likedTickers.size}
                            </span>
                        </button>

                        {/* 결과 종목 수 (sticky — 스크롤해도 항상 보임) */}
                        {!isLoading && (
                            <div className={cn(
                                "shrink-0 flex items-baseline gap-1 px-3 py-1.5 rounded-lg border transition-colors",
                                isFiltered
                                    ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-[#bbf7d0] dark:border-[#166534]/50"
                                    : "bg-[#faf9f7] dark:bg-[#242320] border-neutral-200 dark:border-[#3a3834]"
                            )}>
                                <span className={cn(
                                    "text-sm font-black tabular-nums leading-none",
                                    isFiltered ? "text-[#15803d] dark:text-[#16a34a]" : "text-neutral-700 dark:text-neutral-200"
                                )}>{filteredList.length}</span>
                                <span className="text-[10px] font-bold text-neutral-400">개</span>
                                {isFiltered && (
                                    <span className="text-[10px] font-medium text-neutral-400 ml-0.5">/ {ncavDailyList.list.length}</span>
                                )}
                            </div>
                        )}

                        <div className="flex-1" />

                        {/* 결과 링크 공유 */}
                        <button
                            onClick={handleShare}
                            className={cn(
                                "shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all",
                                shareCopied
                                    ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-[#86efac] dark:border-[#15803d] text-[#15803d] dark:text-[#16a34a]"
                                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 bg-white dark:bg-[#242320]"
                            )}
                            title="현재 필터링 결과 링크 공유"
                        >
                            {shareCopied ? <Check size={12} /> : <Share2 size={12} />}
                            <span className="hidden sm:inline">{shareCopied ? "복사됨" : "공유"}</span>
                        </button>

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

                    {/* 적용된 조건 칩 (검색·시가총액·제외) — 무엇이 걸려있는지 한눈에 */}
                    {(() => {
                        const chips: { key: string; label: string; clear: () => void }[] = [];
                        if (searchQuery)     chips.push({ key: 'q',   label: `검색 "${searchQuery}"`, clear: () => { setSearchQuery(''); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (minMarketCap > 0) chips.push({ key: 'cap', label: `시총 ${MKTCAP_PRESETS.find(p => p.value === minMarketCap)?.label ?? `${minMarketCap}억+`}`, clear: () => { setMinMarketCap(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (minNcav > 0)     chips.push({ key: 'ncav', label: `NCAV ≥ ${minNcav}`, clear: () => { setMinNcav(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (maxPbr > 0)      chips.push({ key: 'pbr', label: `PBR ≤ ${maxPbr}`, clear: () => { setMaxPbr(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (maxPer > 0)      chips.push({ key: 'per', label: `PER ≤ ${maxPer}`, clear: () => { setMaxPer(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (minRoe > 0)      chips.push({ key: 'roe', label: `ROE ≥ ${minRoe}%`, clear: () => { setMinRoe(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (excludeHoldings) chips.push({ key: 'hold', label: '홀딩스 제외', clear: () => setExcludeHoldings(false) });
                        if (excludeDeficit)  chips.push({ key: 'def',  label: '적자 제외',  clear: () => setExcludeDeficit(false) });
                        if (excludePreferred) chips.push({ key: 'pref', label: '우선주 제외', clear: () => setExcludePreferred(false) });
                        if (chips.length === 0) return null;
                        return (
                            <div className="pb-2.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-neutral-400 font-medium">적용:</span>
                                {chips.map(c => (
                                    <span key={c.key} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/30 border border-[#bbf7d0] dark:border-[#166534]/50 text-[#15803d] dark:text-[#16a34a]">
                                        {c.label}
                                        <button onClick={c.clear} className="hover:opacity-60" title="제거"><X size={9} /></button>
                                    </span>
                                ))}
                            </div>
                        );
                    })()}
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
                    onClick={() => isLoggedIn ? setFilterOpen(o => !o) : requireLogin()}
                    className={cn(
                        "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all",
                        filterOpen || activeFilterCount > 0
                            ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-[#86efac] dark:border-[#166534] text-[#15803d] dark:text-[#16a34a]"
                            : "bg-white dark:bg-[#242320] border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                    )}
                >
                    <SlidersHorizontal size={12} />
                    필터
                    {!isLoggedIn && <Lock size={10} className="opacity-60" />}
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

                        <FilterDivider />

                        {/* NCAV 비율 (이상) */}
                        <NumericPresetGroup
                            label="NCAV ≥"
                            presets={NCAV_MIN_PRESETS}
                            value={minNcav}
                            onPick={v => { setMinNcav(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                            fmt={v => `${v}`}
                        />

                        <FilterDivider />

                        {/* PBR (이하) */}
                        <NumericPresetGroup
                            label="PBR ≤"
                            presets={PBR_MAX_PRESETS}
                            value={maxPbr}
                            onPick={v => { setMaxPbr(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                            fmt={v => `${v}`}
                        />

                        <FilterDivider />

                        {/* PER (이하) */}
                        <NumericPresetGroup
                            label="PER ≤"
                            presets={PER_MAX_PRESETS}
                            value={maxPer}
                            onPick={v => { setMaxPer(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                            fmt={v => `${v}`}
                        />

                        <FilterDivider />

                        {/* ROE (이상) */}
                        <NumericPresetGroup
                            label="ROE ≥"
                            presets={ROE_MIN_PRESETS}
                            value={minRoe}
                            onPick={v => { setMinRoe(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                            fmt={v => `${v}%`}
                        />

                        <FilterDivider />

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
                                    checked={excludePreferred}
                                    onChange={e => setExcludePreferred(e.target.checked)}
                                    className="rounded accent-[#16a34a]"
                                />
                                <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400">우선주</span>
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
                        {/* 목록 복사 (종목명만 / 상세) */}
                        <div className="flex items-center justify-end gap-2 mb-3">
                            <span className="text-[11px] text-neutral-400 font-medium">목록 복사</span>
                            <CopyStockButtons rows={copyRows} label={showLikedOnly ? "관심 종목" : "발굴 종목"} />
                        </div>
                        {/* 데스크탑 테이블 */}
                        <div className="hidden md:block">
                            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_88px] gap-4 items-center px-6 py-4 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-200 dark:border-[#35332e]">
                                    <SortableHeader label="종목명" sortKey="ticker" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략</div>
                                    <SortableHeader label="NCAV 비율" sortKey="ncav_ratio" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!highlightMap && "ncav_ratio" in highlightMap} />
                                    <SortableHeader label="PBR" sortKey="pbr" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!highlightMap && "pbr" in highlightMap} />
                                    <SortableHeader label="PER" sortKey="per" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!highlightMap && "per" in highlightMap} />
                                    <SortableHeader label="ROE" sortKey="roe" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!highlightMap && "roe" in highlightMap} />
                                    <div />
                                </div>
                                <div>
                                    {visibleList.map((item: any) => (
                                        <TableRow key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} highlight={highlightMap} />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 모바일 카드 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                            {visibleList.map((item: any) => (
                                <StockRowCard key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} highlight={highlightMap} />
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
