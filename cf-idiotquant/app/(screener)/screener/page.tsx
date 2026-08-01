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
import { computeValueScore } from "@/lib/utils/valueScore";
import { CopyStockButtons, type CopyStock } from "@/components/copyStockButtons";
import { PageHeader, PAGE_ACTION_CLS } from "@/components/pageHeader";
import { ValueMedal } from "@/components/valueMedal";
import { buildGroups, defaultOpenGroups, GroupedResults, type GroupMode } from "./components/GroupedResults";
import { ResultSummary, TermStrip } from "./components/ResultSummary";
import { StockGridCard } from "./components/StockGridCard";
import { StockRatioRow } from "./components/StockRatioRow";
import { STRATEGY_LABEL, STRATEGY_BADGE, STRATEGY_PRESETS_CLIENT as STRATEGY_PRESETS, MKTCAP_PRESETS, STRATEGY_ACTIVE_CLS } from "@/lib/constants/strategies";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const safeNum = (v: any): number => { const n = Number(v); return isNaN(n) ? 0 : n; };
import { RefreshCw, ChevronRight, Loader2, Search, SlidersHorizontal, Info, X, Heart, Clock, Share2, Check, Lock } from "lucide-react";
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
// table: 표 · card: 카드 · ratio: 자산·부채·시총 비율 비교
type ViewMode = 'table' | 'card' | 'ratio';
const VIEW_MODE_TITLE: Record<ViewMode, string> = {
    table: "표로 보기",
    card: "카드로 보기",
    ratio: "비율로 보기 — 유동자산·부채총계·시가총액을 같은 축에서 비교",
};
const DEFAULT_VIEW: ViewMode = 'ratio';
// URL·localStorage 어디서 읽든 같은 규칙으로 해석한다. 한 곳만 고치면 복원 경로에서 어긋난다.
const parseViewMode = (v: string | null | undefined): ViewMode =>
    (['table', 'card', 'ratio'] as ViewMode[]).includes(v as ViewMode) ? (v as ViewMode) : DEFAULT_VIEW;
type MetricKey = "ncav_ratio" | "pbr" | "per" | "roe";
type HighlightMap = Partial<Record<MetricKey, (i: any) => boolean>>;
const roeOf = (i: any) => safeNum(i.bps) > 0 ? (safeNum(i.eps) / safeNum(i.bps)) * 100 : 0;
// 상세 분석 화면의 S-RIM 카드는 ROE를 당기순이익÷자본총계(연결 전체)로 계산해 값이 다르다.
// 같은 이름으로 다른 값이 보이면 데이터 오류로 오해하므로 양쪽에 기준을 명시한다.
const ROE_BASIS_HINT = "ROE = EPS ÷ BPS (지배주주 기준). 상세 분석의 S-RIM 카드는 당기순이익÷자본총계(연결 전체) 기준이라 지주회사 등에서는 값이 다를 수 있습니다.";
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

// =========================================================================
// 필터 적용 — 순수 함수로 분리한 이유: 필터 서랍의 파생 카운트(→N·−N)를 계산하려면
// "지금과 조금 다른 조건"으로 같은 필터를 여러 번 돌려야 한다. 화면에 그리는 목록과
// 카운트가 서로 다른 로직을 쓰면 숫자가 어긋나므로 반드시 같은 함수를 공유한다.
// =========================================================================
interface ScreenerFilters {
    strategies: Set<string>;
    mode: "OR" | "AND";
    q: string;
    excludeHoldings: boolean;
    excludeDeficit: boolean;
    excludePreferred: boolean;
    minMarketCap: number;
    maxPbr: number;
    maxPer: number;
    minRoe: number;
    minNcav: number;
}

// 필터 그룹 — 서랍 카드 순서와 1:1. 누적 카운트(→N)는 이 순서대로 쌓아 계산한다.
type FilterGroupKey = "mktcap" | "pbr" | "per" | "ncav" | "profit" | "exclude";
const FILTER_GROUP_ORDER: FilterGroupKey[] = ["mktcap", "pbr", "per", "ncav", "profit", "exclude"];
const GROUP_DEFAULTS: Record<FilterGroupKey, Partial<ScreenerFilters>> = {
    mktcap:  { minMarketCap: 0 },
    pbr:     { maxPbr: 0 },
    per:     { maxPer: 0 },
    ncav:    { minNcav: 0 },
    profit:  { minRoe: 0, excludeDeficit: false },
    exclude: { excludeHoldings: false, excludePreferred: false },
};

function applyFilters(list: Record<string, any>[], f: ScreenerFilters): Record<string, any>[] {
    let out = list;

    if (f.strategies.size > 0) {
        const check = f.mode === "AND" ? "every" : "some";
        const ids = Array.from(f.strategies);
        out = out.filter(item =>
            ids[check](stratId => {
                const preset = STRATEGY_PRESETS.find(p => p.id === stratId);
                return preset?.clientFilter ? preset.clientFilter(item) : resolveStrategies(item).includes(stratId);
            })
        );
    }

    if (f.q) {
        const q = f.q.toLowerCase();
        out = out.filter(item =>
            (item.ticker ?? "").toLowerCase().includes(q) ||
            (item.name ?? "").toLowerCase().includes(q)
        );
    }

    if (f.excludeHoldings)  out = out.filter(item => !item.name?.includes("홀딩스"));
    if (f.excludeDeficit)   out = out.filter(item => safeNum(item.eps) > 0);
    if (f.excludePreferred) out = out.filter(item => !isPreferredStock(item.name ?? ""));
    if (f.minMarketCap > 0) out = out.filter(item => safeNum(item.market_cap) >= f.minMarketCap);
    if (f.maxPbr > 0)  out = out.filter(item => safeNum(item.pbr) > 0 && safeNum(item.pbr) <= f.maxPbr);
    if (f.maxPer > 0)  out = out.filter(item => safeNum(item.per) > 0 && safeNum(item.per) <= f.maxPer);
    if (f.minNcav > 0) out = out.filter(item => safeNum(item.ncav_ratio) >= f.minNcav);
    if (f.minRoe > 0)  out = out.filter(item => roeOf(item) >= f.minRoe);

    return out;
}

const TOOLTIP_CLS =
    "z-50 max-w-64 rounded-xl px-3.5 py-3 text-xs bg-neutral-900 dark:bg-[#242320] border border-neutral-700/60 shadow-lg text-neutral-200 leading-relaxed " +
    "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 " +
    "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95";

// =========================================================================
// 전략 격자 셀 — 이름 위 / 종목 수 아래. 폭이 고정이라 개수가 같은 열에 선다.
// =========================================================================
function StrategyCell({ label, count, active, activeCls, title, onClick }: {
    label: string;
    count: number;
    active: boolean;
    activeCls: string;
    title?: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            title={title}
            aria-pressed={active}
            className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-[10px] border text-center leading-none transition-all",
                active
                    ? activeCls
                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#242320]"
            )}
        >
            <span className="text-[11.5px] font-extrabold truncate max-w-full px-1">{label}</span>
            <span className={cn("text-[10px] font-black font-mono tabular-nums", active ? "opacity-75" : "text-neutral-400")}>
                {count}
            </span>
        </button>
    );
}

// =========================================================================
// SortableHeader
// =========================================================================
function SortableHeader({ label, sortKey: key, currentKey, order, onToggle, relevant, title }: {
    label: string;
    sortKey: DiscoverySortKey;
    currentKey: DiscoverySortKey;
    order: SortOrder;
    onToggle: (k: DiscoverySortKey) => void;
    relevant?: boolean;
    title?: string;
}) {
    const active = currentKey === key;
    return (
        <button
            title={title}
            onClick={() => onToggle(key)}
            className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap",
                active ? "text-[#16a34a] dark:text-[#16a34a]" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300",
                relevant && !active && "text-emerald-600/90 dark:text-emerald-400/90"
            )}
        >
            {(active || relevant) && <span className={cn("w-1 h-1 rounded-full shrink-0", active ? "bg-[#16a34a]" : "bg-emerald-500")} />}
            {label}
            <span className="text-[9px] font-mono">{active ? (order === "asc" ? "↑" : "↓") : "↕"}</span>
        </button>
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
                        <div key={m.label} title={m.key === "roe" ? ROE_BASIS_HINT : undefined} className={cn(
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
// 필터 서랍 — 조건을 좁히면서 결과가 몇 개 남는지 즉시 확인한다.
// 모달이 아니라 툴바 아래로 밀어내리는 서랍인 이유: 모달로 띄우면 결과 테이블이 가려져
// "이 조건을 켜면 뭐가 사라지는지"를 볼 수 없다.
// =========================================================================
// 저장 형식은 공유 링크와 같은 쿼리스트링 — 표현이 하나면 저장·복원·공유가 어긋날 일이 없다
const SAVED_SETS_KEY = 'screener:savedSets';
interface SavedFilterSet { id: string; name: string; qs: string }

// 서랍 카드 껍데기 — 라벨 + 우측에 "여기까지 좁히면 남는 개수"
function DrawerCard({ label, remain, dashed, span2, children }: {
    label: string; remain?: number; dashed?: boolean; span2?: boolean; children: React.ReactNode;
}) {
    return (
        <div className={cn(
            "rounded-xl px-4 py-3.5 bg-white dark:bg-[#242320]",
            dashed
                ? "border border-dashed border-[#bbf7d0] dark:border-[#166534]/60"
                : "border border-[#dcfce7] dark:border-[#166534]/40",
            span2 && "sm:col-span-2"
        )}>
            <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</span>
                {remain !== undefined && (
                    <span className="text-[10.5px] font-bold font-mono text-[#16a34a] tabular-nums shrink-0">→ {remain}개</span>
                )}
            </div>
            {children}
        </div>
    );
}

// 서랍 안의 프리셋 칩 — 활성 값을 다시 누르면 해제
function DrawerChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-2.5 py-1 rounded-[7px] text-[11px] font-bold border transition-colors",
                active
                    ? "bg-[#16a34a] border-[#16a34a] text-white"
                    : "bg-[#faf9f7] dark:bg-[#1f1e1b] border-neutral-200 dark:border-[#3a3834] text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
            )}
        >
            {children}
        </button>
    );
}

// 체크박스 행 — 우측 −N 이 이 화면의 핵심. 어떤 조건이 결과를 많이 죽이는지 켜기 전에 알 수 있다.
function DrawerCheck({ checked, onChange, label, delta }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; delta: number;
}) {
    return (
        <label className="flex items-center gap-2.5 cursor-pointer select-none py-0.5">
            <span
                className={cn(
                    "w-[15px] h-[15px] rounded-[5px] flex items-center justify-center shrink-0 transition-colors",
                    checked
                        ? "bg-[#16a34a]"
                        : "bg-white dark:bg-[#1f1e1b] border-[1.5px] border-neutral-300 dark:border-[#4a4641]"
                )}
            >
                {checked && <Check size={10} className="text-white" strokeWidth={3.5} />}
            </span>
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className={cn(
                "flex-1 text-xs",
                checked ? "font-semibold text-neutral-900 dark:text-neutral-100" : "font-medium text-neutral-500 dark:text-neutral-400"
            )}>
                {label}
            </span>
            {delta > 0 && (
                <span className="text-[10.5px] font-mono text-neutral-400 tabular-nums shrink-0">−{delta}</span>
            )}
        </label>
    );
}

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

    // 저장된 필터 조합 — 자주 쓰는 조건을 이름 붙여 두면 다음에 한 번에 불러올 수 있다.
    const [savedSets, setSavedSets] = useState<SavedFilterSet[]>(() => {
        if (typeof window === 'undefined') return [];
        try { return JSON.parse(localStorage.getItem(SAVED_SETS_KEY) || '[]') as SavedFilterSet[]; }
        catch { return []; }
    });

    // 묶어 보기 / 뷰 모드 — 기본값이 none·table 이라 배포 직후 동작은 그대로다
    const [groupMode, setGroupMode] = useState<GroupMode>(() => {
        const v = (searchParams.get('group') ?? saved.group) as GroupMode;
        return (['sector', 'strategy', 'grade'] as GroupMode[]).includes(v) ? v : 'none';
    });
    const [viewMode, setViewMode] = useState<ViewMode>(
        () => parseViewMode(searchParams.get('view') ?? saved.view)
    );
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

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
        if (groupMode !== 'none') params.set('group', groupMode);
        if (viewMode !== DEFAULT_VIEW) params.set('view', viewMode);
        return params.toString();
    }, [activeStrategyIds, filterMode, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, minMarketCap, maxPbr, maxPer, minRoe, minNcav, showLikedOnly, searchQuery, groupMode, viewMode]);

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
        if (groupMode !== 'none') snapshot.group = groupMode;
        if (viewMode !== DEFAULT_VIEW) snapshot.view = viewMode;
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
    }, [queryString, activeStrategyIds, filterMode, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, minMarketCap, maxPbr, maxPer, minRoe, minNcav, showLikedOnly, searchQuery, groupMode, viewMode, router]);

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

    // 현재 필터 상태 스냅샷 — 목록·파생 카운트가 같은 입력을 쓰도록 한 곳에서 만든다
    const filters = useMemo<ScreenerFilters>(() => ({
        strategies: activeStrategyIds,
        mode: filterMode,
        q: searchQuery,
        excludeHoldings, excludeDeficit, excludePreferred,
        minMarketCap, maxPbr, maxPer, minRoe, minNcav,
    }), [activeStrategyIds, filterMode, searchQuery, excludeHoldings, excludeDeficit, excludePreferred, minMarketCap, maxPbr, maxPer, minRoe, minNcav]);

    const baseList = useMemo(
        () => (showLikedOnly ? normalizedLikedList : ncavDailyList.list) as Record<string, any>[],
        [showLikedOnly, normalizedLikedList, ncavDailyList.list]
    );

    const filteredList = useMemo(() => {
        const list = [...applyFilters(baseList, filters)];

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
    }, [baseList, filters, sortKey, sortOrder]);

    // 조건 하나만 다르게 걸었을 때 남는 개수 — 서랍의 −N 표기용
    const countWith = useCallback(
        (override: Partial<ScreenerFilters>) => applyFilters(baseList, { ...filters, ...override }).length,
        [baseList, filters]
    );

    // 그룹까지 누적 적용했을 때 남는 개수 — 서랍 카드 헤더의 →N개 표기용.
    // 뒤 그룹은 기본값으로 되돌려 "여기까지 좁히면 이만큼 남는다"를 보여준다.
    const cumulativeCounts = useMemo(() => {
        const out = {} as Record<FilterGroupKey, number>;
        FILTER_GROUP_ORDER.forEach((key, idx) => {
            const reset = FILTER_GROUP_ORDER.slice(idx + 1)
                .reduce<Partial<ScreenerFilters>>((acc, k) => ({ ...acc, ...GROUP_DEFAULTS[k] }), {});
            out[key] = applyFilters(baseList, { ...filters, ...reset }).length;
        });
        return out;
    }, [baseList, filters]);

    // 묶어 보기는 전체 결과를 대상으로 한다 — 페이지를 넘길 때마다 그룹 개수가 변하면
    // "이 전략에 12개"라는 숫자를 믿을 수 없다. 대신 상위 2개 그룹만 펼쳐 DOM을 작게 유지한다.
    const groups = useMemo(() => buildGroups(filteredList, groupMode), [filteredList, groupMode]);
    useEffect(() => { setOpenGroups(defaultOpenGroups(buildGroups(filteredList, groupMode))); }, [groupMode]); // eslint-disable-line react-hooks/exhaustive-deps

    const visibleList = filteredList.slice(0, displayCount);
    const hasMore = !groups && filteredList.length > displayCount;

    // 조건 깔때기 — 어느 단계에서 결과가 확 줄었는지 보여준다
    const funnel = useMemo(() => {
        const none: ScreenerFilters = {
            strategies: new Set(), mode: 'OR', q: '',
            excludeHoldings: false, excludeDeficit: false, excludePreferred: false,
            minMarketCap: 0, maxPbr: 0, maxPer: 0, minRoe: 0, minNcav: 0,
        };
        const steps: { label: string; patch: Partial<ScreenerFilters> }[] = [
            { label: '전체',      patch: {} },
            { label: '전략',      patch: { strategies: filters.strategies, mode: filters.mode } },
            { label: '검색',      patch: { q: filters.q } },
            { label: '가치 지표', patch: { minMarketCap: filters.minMarketCap, maxPbr: filters.maxPbr, maxPer: filters.maxPer, minNcav: filters.minNcav } },
            { label: '수익·제외', patch: { minRoe: filters.minRoe, excludeDeficit: filters.excludeDeficit, excludeHoldings: filters.excludeHoldings, excludePreferred: filters.excludePreferred } },
        ];
        let acc = { ...none };
        return steps.map(s => {
            acc = { ...acc, ...s.patch };
            return { label: s.label, count: applyFilters(baseList, acc).length };
        });
    }, [baseList, filters]);

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
    // 업종 묶기는 응답에 sector/industry 가 있을 때만. 없으면 세그먼트에서 비활성.
    const hasSectorData = ncavDailyList.list.some((i: any) => i.sector ?? i.industry);

    // 단일 전략 선택 시에만 기준 배너를 띄운다 — 여러 전략을 겹치면 "이 값이 왜 초록인지"를
    // 한 줄로 설명할 수 없어 오히려 오해를 만든다.
    const bannerPreset = activeStrategyIds.size === 1
        ? STRATEGY_PRESETS.find(p => p.id === Array.from(activeStrategyIds)[0]) ?? null
        : null;

    // 활성 조건에 걸린 컬럼은 초록 pill — 전략 기준이든 상세 필터든 규칙을 하나로 통일한다.
    const metricHighlight = useMemo<HighlightMap | null>(() => {
        const map: HighlightMap = { ...(highlightMap ?? {}) };
        if (minNcav > 0) map.ncav_ratio = i => safeNum(i.ncav_ratio) >= minNcav;
        if (maxPbr > 0)  map.pbr = i => safeNum(i.pbr) > 0 && safeNum(i.pbr) <= maxPbr;
        if (maxPer > 0)  map.per = i => safeNum(i.per) > 0 && safeNum(i.per) <= maxPer;
        if (minRoe > 0)  map.roe = i => roeOf(i) >= minRoe;
        return Object.keys(map).length > 0 ? map : null;
    }, [highlightMap, minNcav, maxPbr, maxPer, minRoe]);

    // 현재 걸려 있는 상세 조건 목록 — 서랍 카운트·빈 결과 제안이 공유한다
    const activeConditions = useMemo(() => ([
        minMarketCap > 0 && { label: `시총 ${minMarketCap}억+`, override: { minMarketCap: 0 } as Partial<ScreenerFilters>, clear: () => setMinMarketCap(0) },
        maxPbr > 0       && { label: `PBR ≤ ${maxPbr}`,        override: { maxPbr: 0 } as Partial<ScreenerFilters>,       clear: () => setMaxPbr(0) },
        maxPer > 0       && { label: `PER ≤ ${maxPer}`,        override: { maxPer: 0 } as Partial<ScreenerFilters>,       clear: () => setMaxPer(0) },
        minNcav > 0      && { label: `NCAV ≥ ${minNcav}`,      override: { minNcav: 0 } as Partial<ScreenerFilters>,      clear: () => setMinNcav(0) },
        minRoe > 0       && { label: `ROE ≥ ${minRoe}%`,       override: { minRoe: 0 } as Partial<ScreenerFilters>,       clear: () => setMinRoe(0) },
        excludeDeficit   && { label: '적자 기업 제외',           override: { excludeDeficit: false } as Partial<ScreenerFilters>,   clear: () => setExcludeDeficit(false) },
        excludeHoldings  && { label: '홀딩스 제외',              override: { excludeHoldings: false } as Partial<ScreenerFilters>,  clear: () => setExcludeHoldings(false) },
        excludePreferred && { label: '우선주 제외',              override: { excludePreferred: false } as Partial<ScreenerFilters>, clear: () => setExcludePreferred(false) },
    ].filter(Boolean) as { label: string; override: Partial<ScreenerFilters>; clear: () => void }[]),
    [minMarketCap, maxPbr, maxPer, minNcav, minRoe, excludeDeficit, excludeHoldings, excludePreferred]);

    // 결과가 0개일 때 — "무엇을 풀면 몇 개가 돌아오는지"를 짚어준다. 그냥 "없습니다"로 끝내면
    // 어떤 조건이 결과를 죽였는지 사용자가 하나씩 꺼보며 찾아야 한다.
    const emptySuggestion = useMemo(() => {
        if (filteredList.length > 0 || activeConditions.length === 0) return null;
        return activeConditions
            .map(c => ({ ...c, count: countWith(c.override) }))
            .filter(c => c.count > 0)
            .sort((a, b) => b.count - a.count)[0] ?? null;
    }, [filteredList.length, activeConditions, countWith]);

    // 상세 필터만 초기화 — 전략 선택은 남긴다 (전략은 "무엇을 보는지", 필터는 "얼마나 좁히는지")
    const clearDetailFilters = useCallback(() => {
        setMinMarketCap(0); setMaxPbr(0); setMaxPer(0); setMinRoe(0); setMinNcav(0);
        setExcludeHoldings(false); setExcludeDeficit(false); setExcludePreferred(false);
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const persistSets = useCallback((next: SavedFilterSet[]) => {
        setSavedSets(next);
        localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(next));
    }, []);

    const saveCurrentSet = useCallback(() => {
        const fallback = activeConditions.map(c => c.label).join(' · ') || '전체';
        const name = (window.prompt('저장할 이름', fallback) ?? '').trim();
        if (!name) return;
        persistSets([...savedSets, { id: `${Date.now()}`, name, qs: queryString }].slice(-12));
    }, [activeConditions, savedSets, queryString, persistSets]);

    const applySavedSet = useCallback((qs: string) => {
        const p = new URLSearchParams(qs);
        setActiveStrategyIds(new Set((p.get('strategies') ?? '').split(',').filter(id => STRATEGY_PRESETS.some(s => s.id === id))));
        setFilterMode(p.get('mode') === 'AND' ? 'AND' : 'OR');
        setSortKey(VALID_SORT_KEYS.includes(p.get('sort') as DiscoverySortKey) ? p.get('sort') as DiscoverySortKey : 'value_score');
        setSortOrder(p.get('order') === 'asc' ? 'asc' : 'desc');
        const ex = p.get('exclude')?.split(',') ?? [];
        setExcludeHoldings(ex.includes('holdings'));
        setExcludeDeficit(ex.includes('deficit'));
        setExcludePreferred(ex.includes('preferred'));
        setMinMarketCap(safeNum(p.get('mincap')));
        setMaxPbr(safeNum(p.get('maxpbr')));
        setMaxPer(safeNum(p.get('maxper')));
        setMinRoe(safeNum(p.get('minroe')));
        setMinNcav(safeNum(p.get('minncav')));
        setSearchQuery(p.get('q') ?? '');
        setShowLikedOnly(p.get('filter') === 'liked');
        setGroupMode((p.get('group') as GroupMode) ?? 'none');
        setViewMode(parseViewMode(p.get('view')));
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    return (
        <Tooltip.Provider delayDuration={300}>
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] text-neutral-900 dark:text-neutral-100">

            {/* ── 페이지 헤더 (공통 규칙) ── */}
            <PageHeader
                emoji={showLikedOnly ? "♡" : "🥇"}
                title={showLikedOnly ? "내 관심 종목" : "종목 발굴"}
                meta={
                    isLoading && !showLikedOnly ? (
                        <span className="flex items-center gap-1.5">
                            <Loader2 size={11} className="animate-spin" />
                            데이터 로딩 중...
                        </span>
                    ) : (
                        <>
                            {!showLikedOnly && formattedDate && <><span className="font-mono">{formattedDate}</span><span>·</span></>}
                            <span>조건 충족 <span className={cn("font-extrabold", isFiltered ? "text-[#15803d] dark:text-[#16a34a]" : "text-neutral-700 dark:text-neutral-300")}>{filteredList.length}개</span></span>
                            {!showLikedOnly && ncavDailyList.list.length !== filteredList.length && (
                                <span className="text-neutral-300 dark:text-neutral-600">(전체 {ncavDailyList.list.length}개 중)</span>
                            )}
                        </>
                    )
                }
                actions={
                    <>
                        <button onClick={handleShare} className={PAGE_ACTION_CLS} title="현재 필터링 결과 링크 공유">
                            {shareCopied ? <Check size={13} /> : <Share2 size={13} />}
                            {shareCopied ? "복사됨" : "공유"}
                        </button>
                        <button onClick={handleRefresh} disabled={isLoading} className={PAGE_ACTION_CLS}>
                            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                            새로고침
                        </button>
                    </>
                }
            />

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

            {/* ── 전략 탭 + 통합 툴바 (sticky) ── */}
            <div className={cn(
                "sticky top-0 z-30 bg-white/95 dark:bg-[#1f1e1b]/95 backdrop-blur-md",
                "border-b border-neutral-200 dark:border-[#3a3834]"
            )}>
                <div className="max-w-7xl mx-auto px-4 sm:px-7">

                    {/* 첫째 줄: 전략 격자.
                        칩(가변 폭)을 격자(고정 폭)로 바꾼 이유 — 칩은 이름 길이대로 폭이 달라져서
                        종목 수가 매번 다른 위치에 서고, 전략끼리 개수를 비교할 수가 없었다.
                        격자는 이름 위 / 개수 아래로 열을 맞추므로 훑는 것만으로 비교가 된다. */}
                    <div className="flex items-baseline gap-2 pt-3 pb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-neutral-400">전략</span>
                        <span className="text-[10.5px] font-bold text-[#16a34a]">
                            {isAllActive ? '전체' : `${activeStrategyIds.size}개 선택`} · {filteredList.length}종목
                        </span>
                        <button
                            onClick={() => setShowGuide(o => !o)}
                            title="전략 설명 보기"
                            className={cn(
                                "ml-auto shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-colors",
                                showGuide
                                    ? "bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#15803d] dark:text-[#16a34a]"
                                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            )}
                        >
                            <Info size={11} />
                            <span className="hidden sm:inline">전략 안내</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 xl:grid-cols-10 gap-1.5 pb-2">
                        <StrategyCell
                            label="전체" count={strategyCounts.all} active={isAllActive}
                            activeCls={STRATEGY_ACTIVE_CLS.all} onClick={clearStrategies}
                        />
                        {STRATEGY_PRESETS.map(preset => (
                            <StrategyCell
                                key={preset.id}
                                label={preset.label}
                                count={strategyCounts[preset.id] ?? 0}
                                active={activeStrategyIds.has(preset.id)}
                                activeCls={STRATEGY_ACTIVE_CLS[preset.id]}
                                title={preset.hint}
                                onClick={() => toggleStrategy(preset.id)}
                            />
                        ))}
                    </div>

                    {/* 둘째 줄: 통합 툴바 — 검색·정렬·필터·관심을 한 줄로. 예전엔 세 줄로 흩어져
                        세로 공간만 먹고 무엇이 주된 조작인지 위계가 없었다. */}
                    <div className="flex items-center gap-2 flex-wrap pb-3">
                        {/* 검색 */}
                        <div className="relative flex-1 min-w-[180px]">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-300 dark:text-neutral-600 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setDisplayCount(DAILY_PAGE_SIZE); }}
                                placeholder="종목명 또는 코드로 검색"
                                className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-[#faf9f7] dark:bg-[#242320] border border-neutral-200 dark:border-[#3a3834] rounded-[10px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/15 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                            />
                        </div>

                        {/* 정렬 — 점수순 (활성 시 반전) */}
                        <button
                            onClick={() => { setSortKey("value_score"); setSortOrder("desc"); setDisplayCount(DAILY_PAGE_SIZE); }}
                            title="저평가 점수 높은 순으로 정렬 (NCAV·PBR·PER·ROE 종합)"
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold border transition-all whitespace-nowrap",
                                sortKey === "value_score"
                                    ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900"
                                    : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 bg-white dark:bg-[#242320]"
                            )}
                        >
                            점수순
                            <span className="font-mono text-[10px]">{sortKey === "value_score" && sortOrder === "asc" ? "↑" : "↓"}</span>
                        </button>

                        {/* 필터 — 열림은 다른 툴바 토글과 같은 '단색 채움'으로 표시한다.
                            서랍과 탭처럼 이어붙이는 연출은 이 레이아웃에서 성립하지 않는다:
                            버튼이 감싸는 flex 줄 한가운데 있고 아래로 sticky 끝·칩 줄이 끼어서,
                            테두리를 지우면 이어지는 대신 스타일이 벗겨진 것처럼 보인다. */}
                        <button
                            onClick={() => isLoggedIn ? setFilterOpen(o => !o) : requireLogin()}
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold border transition-colors whitespace-nowrap",
                                filterOpen
                                    ? "bg-[#16a34a] border-[#16a34a] text-white shadow-sm"
                                    : activeFilterCount > 0
                                        ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-[#86efac] dark:border-[#166534] text-[#15803d] dark:text-[#16a34a]"
                                        : "bg-white dark:bg-[#242320] border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                            )}
                        >
                            <SlidersHorizontal size={12} />
                            필터
                            {!isLoggedIn && <Lock size={10} className="opacity-60" />}
                            {activeFilterCount > 0 && (
                                <span className={cn(
                                    "px-1.5 rounded-full text-[10px] font-black",
                                    filterOpen ? "bg-white/25 text-white" : "bg-[#dcfce7] dark:bg-[#14532d]/60 text-[#16a34a]"
                                )}>
                                    {activeFilterCount}
                                </span>
                            )}
                            <span className="font-mono text-[9px]">{filterOpen ? "▲" : "▼"}</span>
                        </button>

                        {/* 표 ↔ 카드 ↔ 비율 */}
                        <div className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-[10px] bg-[#f2f0ec] dark:bg-[#2c2b27]">
                            {([['table', '☰'], ['card', '▦'], ['ratio', '▤']] as const).map(([id, icon]) => (
                                <button
                                    key={id}
                                    onClick={() => setViewMode(id)}
                                    title={VIEW_MODE_TITLE[id]}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                                        viewMode === id
                                            ? "bg-white dark:bg-[#1f1e1b] text-neutral-900 dark:text-white shadow-sm"
                                            : "text-neutral-500 dark:text-neutral-400"
                                    )}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>

                        {/* 관심 종목 */}
                        <button
                            onClick={() => {
                                if (!isLoggedIn) { requireLogin(); return; }
                                setShowLikedOnly(o => !o); setActiveStrategyIds(new Set()); setDisplayCount(DAILY_PAGE_SIZE);
                            }}
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold border transition-all whitespace-nowrap",
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

                    {/* 적용된 조건 칩 — 서랍이 닫혀 있을 때만. 열려 있으면 같은 조건이 서랍 안에
                        그대로 보이므로 두 번 나열할 이유가 없다. */}
                    {!filterOpen && (() => {
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
                        // 칩이 없어도 걸린 조건(정렬·관심·전략)이 있으면 초기화 경로는 남겨야 한다.
                        if (chips.length === 0 && !hasActiveFilters) return null;
                        return (
                            <div className="pb-2.5 flex items-center gap-1.5 flex-wrap">
                                {chips.length > 0 && <span className="text-[10px] text-neutral-400 font-medium">적용:</span>}
                                {chips.map(c => (
                                    <span key={c.key} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/30 border border-[#bbf7d0] dark:border-[#166534]/50 text-[#15803d] dark:text-[#16a34a]">
                                        {c.label}
                                        <button onClick={c.clear} className="hover:opacity-60" title="제거"><X size={9} /></button>
                                    </span>
                                ))}
                                {hasActiveFilters && (
                                    <button
                                        onClick={resetAllFilters}
                                        title="모든 조건 초기화"
                                        className="ml-auto shrink-0 text-[10px] font-bold text-neutral-400 hover:text-red-500 underline underline-offset-2 transition-colors"
                                    >
                                        전체 해제
                                    </button>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* ── 필터 서랍 ── */}
            {filterOpen && (
                <div className="bg-[#f0fdf4] dark:bg-[#052e16]/25 border-b border-[#dcfce7] dark:border-[#166534]/40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-7 pt-5 pb-[18px]">

                        <div className="flex items-end justify-between gap-3 mb-4">
                            <div className="min-w-0">
                                <p className="text-[12.5px] font-extrabold text-[#14532d] dark:text-[#86efac]">상세 필터</p>
                                <p className="text-[11px] text-[#16a34a] dark:text-[#4ade80]/80 mt-0.5">조건을 좁힐 때마다 결과가 즉시 갱신됩니다</p>
                            </div>
                            <button
                                onClick={clearDetailFilters}
                                className="text-[11.5px] font-bold text-[#16a34a] hover:opacity-70 transition-opacity shrink-0"
                            >
                                전체 해제
                            </button>
                        </div>

                        {/* 조건 깔때기 — 어느 단계에서 결과가 확 줄었는지 한눈에 */}
                        <div className="mb-4 flex flex-col gap-1">
                            {funnel.map((s, i) => (
                                <div key={s.label} className="flex items-center gap-2">
                                    <span className="w-[76px] shrink-0 text-[10.5px] font-bold text-neutral-500 dark:text-neutral-400">{s.label}</span>
                                    <span className="flex-1 h-2.5 rounded-full bg-white/60 dark:bg-black/20 overflow-hidden">
                                        <span
                                            className="block h-full rounded-full"
                                            style={{
                                                width: `${funnel[0].count > 0 ? (s.count / funnel[0].count) * 100 : 0}%`,
                                                background: ['#e5e5e5', '#bbf7d0', '#86efac', '#4ade80', '#16a34a'][i],
                                            }}
                                        />
                                    </span>
                                    <span className="w-12 shrink-0 text-right text-[10.5px] font-mono font-bold tabular-nums text-[#15803d] dark:text-[#16a34a]">{s.count}</span>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">

                            {/* 시가총액 — 프리셋과 직접 입력을 함께 둔다. 프리셋만 있으면 정확한 값을
                                못 넣고, 입력만 있으면 초보자가 무슨 값을 넣을지 모른다. */}
                            <DrawerCard label="시가총액" remain={cumulativeCounts.mktcap}>
                                <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                    {MKTCAP_PRESETS.filter(p => p.value > 0).map(p => (
                                        <DrawerChip
                                            key={p.value}
                                            active={minMarketCap === p.value}
                                            onClick={() => { setMinMarketCap(minMarketCap === p.value ? 0 : p.value); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        >
                                            {p.label}
                                        </DrawerChip>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px]">
                                    <input
                                        type="number"
                                        min={0}
                                        value={minMarketCap || ''}
                                        onChange={e => { setMinMarketCap(Math.max(0, safeNum(e.target.value))); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        placeholder="0"
                                        className="w-20 px-2 py-1 rounded-md font-mono tabular-nums bg-[#faf9f7] dark:bg-[#1f1e1b] border border-neutral-200 dark:border-[#3a3834] outline-none focus:border-[#16a34a]"
                                    />
                                    <span className="text-neutral-400">~</span>
                                    <span className="text-neutral-300 dark:text-neutral-600">제한 없음</span>
                                    <span className="text-neutral-400">억원</span>
                                </div>
                            </DrawerCard>

                            {/* PBR */}
                            <DrawerCard label="PBR" remain={cumulativeCounts.pbr}>
                                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                                    {PBR_MAX_PRESETS.map(p => (
                                        <DrawerChip key={p} active={maxPbr === p} onClick={() => { setMaxPbr(maxPbr === p ? 0 : p); setDisplayCount(DAILY_PAGE_SIZE); }}>
                                            {p} 미만
                                        </DrawerChip>
                                    ))}
                                </div>
                                <input
                                    type="range"
                                    min={0} max={1.3} step={0.05}
                                    value={maxPbr}
                                    onChange={e => { setMaxPbr(Number(e.target.value)); setDisplayCount(DAILY_PAGE_SIZE); }}
                                    className="w-full h-1 accent-[#16a34a] cursor-pointer"
                                />
                                <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-neutral-300 dark:text-neutral-600">
                                    <span>0</span>
                                    <span className={cn(maxPbr > 0 && "font-bold text-[#16a34a]")}>{maxPbr > 0 ? maxPbr.toFixed(2) : '미적용'}</span>
                                    <span>1.3</span>
                                </div>
                            </DrawerCard>

                            {/* PER */}
                            <DrawerCard label="PER" remain={cumulativeCounts.per}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {PER_MAX_PRESETS.map(p => (
                                        <DrawerChip key={p} active={maxPer === p} onClick={() => { setMaxPer(maxPer === p ? 0 : p); setDisplayCount(DAILY_PAGE_SIZE); }}>
                                            {p} 이하
                                        </DrawerChip>
                                    ))}
                                </div>
                            </DrawerCard>

                            {/* NCAV */}
                            <DrawerCard label="NCAV 비율" remain={cumulativeCounts.ncav}>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    {NCAV_MIN_PRESETS.map(p => (
                                        <DrawerChip key={p} active={minNcav === p} onClick={() => { setMinNcav(minNcav === p ? 0 : p); setDisplayCount(DAILY_PAGE_SIZE); }}>
                                            {p} 이상
                                        </DrawerChip>
                                    ))}
                                </div>
                            </DrawerCard>

                            {/* 수익성 — −N 표기가 핵심. 어떤 조건이 결과를 많이 죽이는지 켜기 전에 안다. */}
                            <DrawerCard label="수익성" remain={cumulativeCounts.profit}>
                                <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                    {ROE_MIN_PRESETS.map(p => (
                                        <DrawerChip key={p} active={minRoe === p} onClick={() => { setMinRoe(minRoe === p ? 0 : p); setDisplayCount(DAILY_PAGE_SIZE); }}>
                                            ROE {p}%+
                                        </DrawerChip>
                                    ))}
                                </div>
                                <DrawerCheck
                                    checked={excludeDeficit}
                                    onChange={v => { setExcludeDeficit(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                    label="적자 기업 제외"
                                    delta={excludeDeficit
                                        ? countWith({ excludeDeficit: false }) - filteredList.length
                                        : filteredList.length - countWith({ excludeDeficit: true })}
                                />
                            </DrawerCard>

                            {/* 제외 조건 */}
                            <DrawerCard label="제외" remain={cumulativeCounts.exclude}>
                                <div className="flex flex-col gap-1">
                                    <DrawerCheck
                                        checked={excludeHoldings}
                                        onChange={v => { setExcludeHoldings(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        label="홀딩스 제외"
                                        delta={excludeHoldings
                                            ? countWith({ excludeHoldings: false }) - filteredList.length
                                            : filteredList.length - countWith({ excludeHoldings: true })}
                                    />
                                    <DrawerCheck
                                        checked={excludePreferred}
                                        onChange={v => { setExcludePreferred(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        label="우선주 제외"
                                        delta={excludePreferred
                                            ? countWith({ excludePreferred: false }) - filteredList.length
                                            : filteredList.length - countWith({ excludePreferred: true })}
                                    />
                                </div>
                            </DrawerCard>

                            {/* 이 조합 저장 — 재방문 동기 장치. 저장된 필터가 있으면 다시 올 이유가 생긴다. */}
                            <DrawerCard label="이 조합 저장" dashed span2>
                                <p className="text-[11px] leading-relaxed text-neutral-400 mb-2.5">
                                    자주 쓰는 필터를 이름 붙여 저장하고 다음에 한 번에 불러옵니다.
                                </p>
                                {savedSets.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                        {savedSets.map(s => (
                                            <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#f0fdf4] dark:bg-[#052e16]/40 border border-[#bbf7d0] dark:border-[#166534]/50 text-[11px] font-bold text-[#15803d] dark:text-[#16a34a]">
                                                <button onClick={() => applySavedSet(s.qs)} className="hover:opacity-70 max-w-[160px] truncate" title={s.name}>
                                                    {s.name}
                                                </button>
                                                <button onClick={() => persistSets(savedSets.filter(x => x.id !== s.id))} className="hover:opacity-60" title="삭제">
                                                    <X size={9} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={saveCurrentSet}
                                    className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-[9px] bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-colors"
                                >
                                    ＋ 내 필터로 저장
                                </button>
                            </DrawerCard>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 전략 기준 배너 — 어떤 값이 왜 초록으로 표시되는지 한 줄로 밝힌다.
                   기존에는 전략 이름만 있고 판정 기준이 화면 어디에도 없었다. ── */}
            {bannerPreset && (
                <div className="bg-[#f0fdf4] dark:bg-[#052e16]/25 border-b border-[#dcfce7] dark:border-[#166534]/40">
                    <div className="max-w-7xl mx-auto px-4 sm:px-7 py-2.5 flex items-start gap-2">
                        <span className={cn(
                            "shrink-0 mt-px px-1.5 py-0.5 rounded-[5px] text-[10px] font-extrabold",
                            STRATEGY_BADGE[bannerPreset.id] ?? "bg-[#dcfce7] text-[#15803d]"
                        )}>
                            {bannerPreset.label}
                        </span>
                        <p className="text-xs leading-relaxed text-[#15803d] dark:text-[#86efac] break-keep">
                            <span className="font-bold">{bannerPreset.formula}</span>
                            {` — ${bannerPreset.plain}. 기준을 충족한 값에 초록 표시가 붙습니다.`}
                        </p>
                    </div>
                </div>
            )}

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

            {/* ── 종목 리스트 ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-7 pt-5 pb-20">

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
                        {/* 어떤 조건을 풀면 몇 개가 돌아오는지 짚어준다 — 조건을 하나씩 꺼보게
                            만들지 않는 것이 이 안내의 목적이다. */}
                        {emptySuggestion && (
                            <button
                                onClick={() => { emptySuggestion.clear(); setDisplayCount(DAILY_PAGE_SIZE); }}
                                className="px-4 py-2 rounded-xl bg-[#f0fdf4] dark:bg-[#052e16]/30 border border-[#bbf7d0] dark:border-[#166534]/50 text-xs font-bold text-[#15803d] dark:text-[#16a34a] hover:bg-[#dcfce7] dark:hover:bg-[#052e16]/50 transition-colors"
                            >
                                &lsquo;{emptySuggestion.label}&rsquo; 해제하면 {emptySuggestion.count}개
                            </button>
                        )}
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
                        {/* 결과에 거는 조작(묶기)과 목록 복사 — 조건을 고르는 상단과 분리한다.
                            묶기는 "무엇을 걸러낼지"가 아니라 "고른 결과를 어떻게 늘어놓을지"라
                            결과 바로 위가 제자리다. */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            <div className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-[10px] bg-[#f2f0ec] dark:bg-[#2c2b27]">
                                {([
                                    { id: 'none',     label: '안 묶기' },
                                    { id: 'sector',   label: '업종', disabled: !hasSectorData },
                                    { id: 'strategy', label: '전략' },
                                    { id: 'grade',    label: '등급' },
                                ] as { id: GroupMode; label: string; disabled?: boolean }[]).map(o => (
                                    <button
                                        key={o.id}
                                        disabled={o.disabled}
                                        onClick={() => setGroupMode(o.id)}
                                        title={o.disabled ? "업종 데이터 연동 예정" : undefined}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-[11px] transition-colors whitespace-nowrap",
                                            o.disabled && "opacity-40 cursor-not-allowed",
                                            groupMode === o.id
                                                ? "bg-white dark:bg-[#1f1e1b] font-extrabold text-neutral-900 dark:text-white shadow-sm"
                                                : "font-bold text-neutral-500 dark:text-neutral-400"
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                            <span className="ml-auto hidden sm:inline text-[11px] text-neutral-400 font-medium">목록 복사</span>
                            <div className="ml-auto sm:ml-0 flex items-center gap-2">
                                <CopyStockButtons rows={copyRows} label={showLikedOnly ? "관심 종목" : "발굴 종목"} />
                            </div>
                        </div>

                        {/* 숫자를 읽는 법 + 결과가 대체로 어떤 모양인지 — 스크롤 전에 먼저 준다 */}
                        <TermStrip />
                        <ResultSummary list={filteredList} />

                        {viewMode === 'ratio' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {visibleList.map((item: any) => (
                                    <StockRatioRow key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} />
                                ))}
                            </div>
                        ) : viewMode === 'card' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {visibleList.map((item: any) => (
                                    <StockGridCard key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} />
                                ))}
                            </div>
                        ) : (
                        <>
                        {/* 데스크탑 테이블 */}
                        <div className="hidden md:block">
                            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_88px] gap-4 items-center px-6 py-4 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-200 dark:border-[#35332e]">
                                    <SortableHeader label="종목명" sortKey="ticker" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략</div>
                                    <SortableHeader label="NCAV 비율" sortKey="ncav_ratio" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "ncav_ratio" in metricHighlight} />
                                    <SortableHeader label="PBR" sortKey="pbr" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "pbr" in metricHighlight} />
                                    <SortableHeader label="PER" sortKey="per" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "per" in metricHighlight} />
                                    <SortableHeader label="ROE" sortKey="roe" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "roe" in metricHighlight} title={ROE_BASIS_HINT} />
                                    <div />
                                </div>
                                {groups ? (
                                    <GroupedResults
                                        groups={groups}
                                        open={openGroups}
                                        onToggle={key => setOpenGroups(prev => {
                                            const next = new Set(prev);
                                            if (!next.delete(key)) next.add(key);
                                            return next;
                                        })}
                                        hint={g => groupMode === 'strategy'
                                            ? (STRATEGY_PRESETS.find(p => p.id === g.key)?.formula ?? '')
                                            : ''}
                                        renderRow={(item: any) => (
                                            <TableRow key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} highlight={metricHighlight} />
                                        )}
                                    />
                                ) : (
                                    <div>
                                        {visibleList.map((item: any) => (
                                            <TableRow key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} highlight={metricHighlight} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 모바일 카드 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
                            {visibleList.map((item: any) => (
                                <StockRowCard key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} highlight={metricHighlight} />
                            ))}
                        </div>
                        </>
                        )}

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
