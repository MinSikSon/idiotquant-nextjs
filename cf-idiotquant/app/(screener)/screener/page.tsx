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
import { CopyStockButtons, type CopyStock } from "@/components/copyStockButtons";
import { PageHeader, PAGE_ACTION_CLS } from "@/components/pageHeader";
import { buildGroups, defaultOpenGroups, GroupedResults, type Group, type GroupMode } from "./components/GroupedResults";
import { ResultSummary, TermStrip } from "./components/ResultSummary";
import { StockGridCard } from "./components/StockGridCard";
import { StockRatioRow } from "./components/StockRatioRow";
import { LiquidityBadge, trAmtEok, w52Position } from "./components/LiquidityBadge";
import { STRATEGY_LABEL, STRATEGY_BADGE, STRATEGY_PRESETS_CLIENT as STRATEGY_PRESETS, MKTCAP_PRESETS, STRATEGY_ACTIVE_CLS, STRATEGY_HEX } from "@/lib/constants/strategies";
import {
    safeNum, isPreferredStock, marketOf, sectorOf, roeOf, grahamOk,
    resolveStrategies, primaryStrategyOf,
    applyFilters, sortList, FILTER_GROUP_ORDER, GROUP_DEFAULTS, DEFAULT_SORT, VALID_SORT_KEYS,
    type ScreenerFilters, type FilterGroupKey, type DiscoverySortKey, type SortOrder,
} from "./filters";

import { RefreshCw, ChevronRight, Loader2, Search, SlidersHorizontal, Info, X, Heart, Clock, Share2, Check, Lock } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

// =========================================================================
// 상수 & 타입
// =========================================================================
const DAILY_PAGE_SIZE = 30;

// 밸류에이션 필터 프리셋 (0 = 미적용)
const PBR_MAX_PRESETS = [0.5, 0.7, 1.0];   // PBR 이하
const PER_MAX_PRESETS = [5, 10, 15];        // PER 이하
const ROE_MIN_PRESETS = [5, 10, 15];        // ROE(%) 이상
const NCAV_MIN_PRESETS = [0.7, 1.0, 1.5];   // NCAV 비율 이상

// 업종 분포 띠 색 — 앱 강조색(초록)에서 단계적으로 옅어지고, 마지막은 "그 외"용 중립색.
// 두 테마 모두 같은 값을 쓴다: 채도가 있는 면 위에 흰 글씨라 바탕색이 바뀌어도 대비가 유지된다.
const MIX_COLORS = ['#15803d', '#16a34a', '#3faf6d', '#6ec492', '#93a89b', '#a8a29e'];
// 전략 띠는 전략 고유색을 그대로 쓴다 — 요약의 산점도 점도 같은 색이라 이 범례가 그쪽 범례를 겸한다.
const STRATEGY_HEX_BY_LABEL: Record<string, string> = Object.fromEntries(
    Object.entries(STRATEGY_HEX).map(([id, hex]) => [STRATEGY_LABEL[id] ?? id, hex])
);

// 일 거래대금 하한 프리셋 (단위: 억원, 0 = 미적용)
const TR_AMT_PRESETS = [1, 3, 10, 50];
// 52주 구간에서 현재가 위치의 상한(%). 0=저점, 100=고점 → 낮게 잡을수록 저점권만 남는다.
const W52_POS_PRESETS = [10, 25, 50];

/** 시장 구분. KIS 는 "KOSPI"/"KOSDAQ"/"KONEX" 외에 "코스피" 같은 표기도 섞어 보낸다. */
// 대표 전략 — 한 종목이 여러 전략에 걸리므로 비율 띠를 그리려면 하나로 정해야 한다.
// 규칙은 전략 묶기(buildGroups)·요약 산점도의 점 색과 같아야 한다: 프리셋 순서상 첫 번째,
// 없으면 백엔드가 붙여 준 첫 전략. 뒤쪽 폴백을 빼먹으면 어느 프리셋에도 안 걸린 종목이
// 띠에서만 사라져 합계가 전체보다 적어지고, 점 색의 범례로도 성립하지 않는다.
// (칩에 붙는 "NCAV 26" 같은 숫자는 겹침을 그대로 센 값이라 여기 합계와 다르다.)

interface Mix {
    segs: { name: string; n: number; pct: number; color: string }[];
    known: number;
    top3Pct: number;
    topNames: string[];
}

/**
 * 비율 띠 하나 분량의 집계. 상위 top 개 + '그 외'.
 *
 * keyOf 가 빈 문자열을 주면 그 종목은 세지 않는다 — 업종이 비어 있는 종목이 "기타"라는
 * 이름으로 띠를 차지하는 것보다, 아예 빼고 분모를 줄이는 편이 정직하다.
 * 셀 게 4개도 안 되거나 종류가 하나뿐이면 띠를 그리지 않는다(null).
 *
 * top 은 업종처럼 종류가 수십 개일 때 띠와 범례가 감당 못 하는 걸 막는 장치다.
 * 전략 띠는 산점도 점 색의 범례를 겸하므로 자르지 않는다(Infinity) — '그 외'로 묶는 순간
 * 그 색의 점이 화면에서 설명되지 않는다.
 */
function buildMix(list: any[], keyOf: (i: any) => string, colorAt: (idx: number, name: string) => string, top = 5): Mix | null {
    if (list.length < 4) return null;
    const counts = new Map<string, number>();
    let known = 0;
    for (const i of list) {
        const k = keyOf(i);
        if (!k) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
        known++;
    }
    if (known < 4 || counts.size < 2) return null;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const head = sorted.slice(0, top);
    const restCount = sorted.slice(top).reduce((acc, [, n]) => acc + n, 0);
    const segs = head.map(([name, n], idx) => ({ name, n, pct: (n / known) * 100, color: colorAt(idx, name) }));
    if (restCount > 0) segs.push({ name: '그 외', n: restCount, pct: (restCount / known) * 100, color: MIX_COLORS[5] });
    const top3 = sorted.slice(0, 3).reduce((acc, [, n]) => acc + n, 0);
    return { segs, known, top3Pct: (top3 / known) * 100, topNames: sorted.slice(0, 3).map(([nm]) => nm) };
}

/** 비율 띠 한 줄. 좁은 화면에서는 띠 안에 이름을 넣을 자리가 없어 이름은 항상 아래 범례가 맡고,
    띠 안에는 넉넉한 조각에만 퍼센트를 얹는다. */
function MixRow({ label, mix }: { label: string; mix: Mix }) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="w-7 shrink-0 pt-[5px] text-[10.5px] font-extrabold text-neutral-400">{label}</span>
            <div className="flex-1 min-w-0">
                <div className="flex h-6 rounded-md overflow-hidden border border-neutral-200 dark:border-surface-dark-border">
                    {mix.segs.map(seg => (
                        <div
                            key={seg.name}
                            title={`${seg.name} ${seg.n}종목 (${seg.pct.toFixed(0)}%)`}
                            style={{ width: `${seg.pct}%`, minWidth: '3px', background: seg.color }}
                            className="relative flex items-center justify-center"
                        >
                            {seg.pct >= 15 && (
                                <span className="text-[9.5px] font-black text-white tabular-nums">{seg.pct.toFixed(0)}%</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {mix.segs.map(seg => (
                        <span key={seg.name} className="inline-flex items-center gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-400">
                            <i className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: seg.color }} />
                            <span className="font-semibold">{seg.name}</span>
                            <span className="font-mono tabular-nums text-neutral-400">{seg.n}</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
// 거래대금·거래정지 판정은 배지와 같은 기준을 써야 하므로 LiquidityBadge 모듈에서 가져온다.


// 백엔드 strategies + 프론트엔드 clientFilter 병합 (백엔드 미분류 종목도 표시)
// eslint-disable-next-line @typescript-eslint/no-explicit-any

// 단일 전략 선택 시 강조할 지표 컬럼 + 기준 충족 판정. 키는 전략의 기준이 되는 컬럼.
// table: 표 · card: 카드 · ratio: 자산·부채·시총 비율 비교
type ViewMode = 'table' | 'card' | 'ratio';
const VIEW_MODE_TITLE: Record<ViewMode, string> = {
    table: "표로 보기",
    card: "카드로 보기",
    ratio: "비율로 보기 — 유동자산·부채총계·시가총액을 같은 축에서 비교",
};
const DEFAULT_VIEW: ViewMode = 'ratio';
// 묶었을 때 카드·비율 뷰의 그룹 본문 — 격자 뷰라 격자 클래스를 그대로 넘긴다.
const GRID_BODY = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3';
// URL·localStorage 어디서 읽든 같은 규칙으로 해석한다. 한 곳만 고치면 복원 경로에서 어긋난다.
const parseViewMode = (v: string | null | undefined): ViewMode =>
    (['table', 'card', 'ratio'] as ViewMode[]).includes(v as ViewMode) ? (v as ViewMode) : DEFAULT_VIEW;
type MetricKey = "ncav_ratio" | "pbr" | "per" | "roe";
type HighlightMap = Partial<Record<MetricKey, (i: any) => boolean>>;
// 상세 분석 화면의 S-RIM 카드는 ROE를 당기순이익÷자본총계(연결 전체)로 계산해 값이 다르다.
// 같은 이름으로 다른 값이 보이면 데이터 오류로 오해하므로 양쪽에 기준을 명시한다.
const ROE_BASIS_HINT = "ROE = EPS ÷ BPS (지배주주 기준). 상세 분석의 S-RIM 카드는 당기순이익÷자본총계(연결 전체) 기준이라 지주회사 등에서는 값이 다를 수 있습니다.";
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
        : "px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-surface-dark-hover text-neutral-400";
}

// =========================================================================
// 필터 적용 — 순수 함수로 분리한 이유: 필터 서랍의 파생 카운트(→N·−N)를 계산하려면
// "지금과 조금 다른 조건"으로 같은 필터를 여러 번 돌려야 한다. 화면에 그리는 목록과
// 카운트가 서로 다른 로직을 쓰면 숫자가 어긋나므로 반드시 같은 함수를 공유한다.
// =========================================================================

// 필터 그룹 — 서랍 카드 순서와 1:1. 누적 카운트(→N)는 이 순서대로 쌓아 계산한다.


const TOOLTIP_CLS =
    "z-50 max-w-64 rounded-xl px-3.5 py-3 text-xs bg-neutral-900 dark:bg-surface-dark-card border border-neutral-700/60 shadow-lg text-neutral-200 leading-relaxed " +
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
                    : "border-neutral-200 dark:border-surface-dark-border text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-surface-dark-card"
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
            className="group grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_112px] gap-4 items-center px-6 py-5 hover:bg-[#f0fdf4]/40 dark:hover:bg-surface-dark-card/50 cursor-pointer transition-colors border-b border-neutral-100 dark:border-border-subtle-dark last:border-0"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="min-w-0 flex items-center gap-2">
                <div className="min-w-0">
                    <p className="font-bold text-sm text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <span className="text-[11px] text-neutral-400 font-mono tracking-wider shrink-0">{item.ticker}</span>
                        <LiquidityBadge item={item} />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-1">
                {strategies.slice(0, 2).map(s => (
                    <span key={s} className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STRATEGY_BADGE[s] ?? "bg-surface-canvas text-neutral-500")}>
                        {STRATEGY_LABEL[s] ?? s}
                    </span>
                ))}
                {strategies.length > 2 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-canvas dark:bg-surface-dark-elevated text-neutral-500">
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-canvas dark:bg-surface-dark-card group-hover:bg-[#16a34a] group-hover:text-white text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-all whitespace-nowrap"
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
            className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 cursor-pointer hover:border-brand-light-hover dark:hover:border-[#15803d]/50 hover:shadow-md transition-all active:scale-[0.99]"
            onClick={() => onClick(item.ticker, item.name)}
        >
            <div className="flex items-start justify-between gap-2 mb-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                    </div>
                    <p className="font-bold text-base text-neutral-900 dark:text-white truncate leading-tight">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-neutral-400 font-mono tracking-wider">{item.ticker}</span>
                        <LiquidityBadge item={item} />
                    </div>
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
                            : "bg-surface-canvas dark:bg-surface-dark-card text-neutral-500",
                        highlight && "ncav_ratio" in highlight && "ring-2 ring-emerald-400/60 dark:ring-emerald-500/50"
                    )}>
                        {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}
                    </div>
                </div>
            </div>

            {strategies.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                    {strategies.map(s => (
                        <span key={s} className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", STRATEGY_BADGE[s] ?? "bg-surface-canvas text-neutral-500")}>
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
                                : "bg-surface-canvas dark:bg-surface-dark-card/60"
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

            <button className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-surface-canvas dark:bg-surface-dark-card hover:bg-[#16a34a] hover:text-white text-neutral-600 dark:text-neutral-400 text-xs font-bold transition-all">
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
            "rounded-xl px-4 py-3.5 bg-white dark:bg-surface-dark-card",
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
function DrawerChip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className={cn(
                "px-2.5 py-1 rounded-[7px] text-[11px] font-bold border transition-colors",
                active
                    ? "bg-[#16a34a] border-[#16a34a] text-white"
                    : "bg-surface-canvas dark:bg-surface-dark border-neutral-200 dark:border-surface-dark-border text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600"
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
                        : "bg-white dark:bg-surface-dark border-[1.5px] border-neutral-300 dark:border-[#4a4641]"
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
// 기본 정렬. 예전엔 저평가 점수순이었는데 등급·점수를 화면에서 감추면서 보이지 않는
// 값으로 순서가 정해지게 돼, 목록에 실제로 보이는 NCAV 비율을 기준으로 바꿨다.

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
        return VALID_SORT_KEYS.includes(s) ? s : DEFAULT_SORT;
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
    const [excludeHalted, setExcludeHalted] = useState(() => initExclude('halted'));
    const [excludeManaged, setExcludeManaged] = useState(() => initExclude('managed'));
    const [excludeDelisting, setExcludeDelisting] = useState(() => initExclude('delisting'));
    // 업종 다중 선택 (URL param: sectors, 쉼표 구분)
    const [sectors, setSectors] = useState<Set<string>>(() => {
        const urlS = searchParams.get('sectors');
        const src = urlS ?? (Array.isArray(saved.sectors) ? saved.sectors.join(',') : '');
        return new Set((src || '').split(',').map(v => v.trim()).filter(Boolean));
    });
    // 시장 다중 선택 (URL param: markets, 쉼표 구분)
    const [markets, setMarkets] = useState<Set<string>>(() => {
        const urlM = searchParams.get('markets');
        const src = urlM ?? (Array.isArray(saved.markets) ? saved.markets.join(',') : '');
        return new Set((src || '').split(',').map(v => v.trim().toUpperCase()).filter(Boolean));
    });
    // 52주 위치 상한 (%, URL param: w52)
    const [maxW52Pos, setMaxW52Pos] = useState<number>(() => initNum('w52', 'w52', W52_POS_PRESETS));
    // 일 거래대금 하한 (단위: 억원, URL param: mintr)
    const [minTrAmt, setMinTrAmt] = useState<number>(() => initNum('mintr', 'mintr', TR_AMT_PRESETS));
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
        return (['sector', 'strategy'] as GroupMode[]).includes(v) ? v : 'none';
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
        if (sortKey !== DEFAULT_SORT)
            params.set('sort', sortKey);
        if (sortOrder !== 'desc')
            params.set('order', sortOrder);
        const excludeList = [
            excludeHoldings ? 'holdings' : null,
            excludeDeficit ? 'deficit' : null,
            excludePreferred ? 'preferred' : null,
            excludeHalted ? 'halted' : null,
            excludeManaged ? 'managed' : null,
            excludeDelisting ? 'delisting' : null,
        ].filter(Boolean).join(',');
        if (excludeList) params.set('exclude', excludeList);
        if (sectors.size > 0) params.set('sectors', Array.from(sectors).join(','));
        if (markets.size > 0) params.set('markets', Array.from(markets).join(','));
        if (maxW52Pos > 0) params.set('w52', String(maxW52Pos));
        if (minTrAmt > 0) params.set('mintr', String(minTrAmt));
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
    }, [activeStrategyIds, filterMode, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, excludeHalted, excludeManaged, excludeDelisting, sectors, markets, maxW52Pos, minTrAmt, minMarketCap, maxPbr, maxPer, minRoe, minNcav, showLikedOnly, searchQuery, groupMode, viewMode]);

    // 필터 상태 → URL 동기화 + localStorage 저장 (페이지 이동 후 재진입 시에도 전체 필터 유지)
    useEffect(() => {
        // 타이핑 등 빠른 연속 변경 시 매번 router.replace + localStorage 쓰기를 피하려 디바운스
        const debounce = setTimeout(() => {
        router.replace(queryString ? `/screener?${queryString}` : '/screener', { scroll: false });

        // 전체 필터 스냅샷을 단일 키에 저장 — 다른 페이지 이동 후 복귀 시 그대로 복원
        const snapshot: Record<string, any> = {};
        if (activeStrategyIds.size > 0) snapshot.strategies = Array.from(activeStrategyIds);
        if (filterMode !== 'OR') snapshot.mode = filterMode;
        if (sortKey !== DEFAULT_SORT) snapshot.sort = sortKey;
        if (sortOrder !== 'desc') snapshot.order = sortOrder;
        const excludeArr = [
            excludeHoldings ? 'holdings' : null,
            excludeDeficit ? 'deficit' : null,
            excludePreferred ? 'preferred' : null,
            excludeHalted ? 'halted' : null,
            excludeManaged ? 'managed' : null,
            excludeDelisting ? 'delisting' : null,
        ].filter(Boolean);
        if (excludeArr.length) snapshot.exclude = excludeArr;
        if (sectors.size > 0) snapshot.sectors = Array.from(sectors);
        if (markets.size > 0) snapshot.markets = Array.from(markets);
        if (maxW52Pos > 0) snapshot.w52 = maxW52Pos;
        if (minTrAmt > 0) snapshot.mintr = minTrAmt;
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
    }, [queryString, activeStrategyIds, filterMode, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, excludeHalted, excludeManaged, excludeDelisting, sectors, markets, maxW52Pos, minTrAmt, minMarketCap, maxPbr, maxPer, minRoe, minNcav, showLikedOnly, searchQuery, groupMode, viewMode, router]);

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
        excludeHoldings, excludeDeficit, excludePreferred, excludeHalted, excludeManaged, excludeDelisting,
        sectors, markets, maxW52Pos, minTrAmt,
        minMarketCap, maxPbr, maxPer, minRoe, minNcav,
    }), [activeStrategyIds, filterMode, searchQuery, excludeHoldings, excludeDeficit, excludePreferred, excludeHalted, excludeManaged, excludeDelisting, sectors, markets, maxW52Pos, minTrAmt, minMarketCap, maxPbr, maxPer, minRoe, minNcav]);

    const baseList = useMemo(
        () => (showLikedOnly ? normalizedLikedList : ncavDailyList.list) as Record<string, any>[],
        [showLikedOnly, normalizedLikedList, ncavDailyList.list]
    );

    const filteredList = useMemo(() => {
        return sortList([...applyFilters(baseList, filters)], sortKey, sortOrder);
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
    // 그룹 구성이 달라지면 펼침 상태를 다시 잡는다. groupMode 만 보면 필터를 바꿔 그룹이
    // 통째로 바뀌었을 때 옛 키가 남아 "전부 접힘"이 된다.
    const groupSignature = (groups ?? []).map(g => g.key).join('|');
    useEffect(() => { setOpenGroups(defaultOpenGroups(groups)); }, [groupSignature]); // eslint-disable-line react-hooks/exhaustive-deps

    // 묶기는 뷰 모드와 무관하게 같은 동작이라 props 를 한 번만 만든다 —
    // 예전에는 데스크톱 표에만 붙어 있어서 기본 뷰(비율)와 폰에서는 눌러도 아무 일이 없었다.
    const groupedProps = {
        groups: groups ?? [],
        open: openGroups,
        onToggle: (key: string) => setOpenGroups(prev => {
            const next = new Set(prev);
            if (!next.delete(key)) next.add(key);
            return next;
        }),
        hint: (g: Group) => groupMode === 'strategy'
            ? (STRATEGY_PRESETS.find(p => p.id === g.key)?.formula ?? '')
            : '',
    };

    const visibleList = filteredList.slice(0, displayCount);
    const hasMore = !groups && filteredList.length > displayCount;

    // 결과 분포 — 지금 화면에 있는 목록 기준. 저PBR·NCAV 결과는 업황이 꺾인 산업 하나로
    // 뒤덮이기 쉬운데, 표를 위에서부터 읽으면 그게 "싼 회사가 많다"로 보인다.
    const sectorMix = useMemo(() => buildMix(filteredList, sectorOf, idx => MIX_COLORS[idx]), [filteredList]);
    // 전략도 같은 자리에서 본다. 예전에는 표 위 요약 카드가 따로 세었는데, 분포를 두 군데서
    // 보여 주면 어느 쪽을 읽어야 할지 알 수 없어 한 카드로 합쳤다.
    const strategyMix = useMemo(
        () => buildMix(
            filteredList,
            i => { const id = primaryStrategyOf(i); return id ? (STRATEGY_LABEL[id] ?? id) : ""; },
            // 색과 폴백 회색은 산점도 점과 같은 값이어야 범례가 성립한다.
            (idx, name) => STRATEGY_HEX_BY_LABEL[name] ?? "#a3a3a3",
            Infinity,
        ),
        [filteredList]
    );

    // 조건 깔때기 — 어느 단계에서 결과가 확 줄었는지 보여준다
    const funnel = useMemo(() => {
        const none: ScreenerFilters = {
            strategies: new Set(), mode: 'OR', q: '',
            excludeHoldings: false, excludeDeficit: false, excludePreferred: false, excludeHalted: false, excludeManaged: false, excludeDelisting: false,
            sectors: new Set<string>(), markets: new Set<string>(), maxW52Pos: 0, minTrAmt: 0,
            minMarketCap: 0, maxPbr: 0, maxPer: 0, minRoe: 0, minNcav: 0,
        };
        const steps: { label: string; patch: Partial<ScreenerFilters> }[] = [
            { label: '전체',      patch: {} },
            { label: '전략',      patch: { strategies: filters.strategies, mode: filters.mode } },
            { label: '검색',      patch: { q: filters.q } },
            { label: '가치 지표', patch: { minMarketCap: filters.minMarketCap, maxPbr: filters.maxPbr, maxPer: filters.maxPer, minNcav: filters.minNcav } },
            { label: '수익·제외', patch: { minRoe: filters.minRoe, excludeDeficit: filters.excludeDeficit, excludeHoldings: filters.excludeHoldings, excludePreferred: filters.excludePreferred } },
            { label: '시장·업종', patch: { markets: filters.markets, sectors: filters.sectors } },
            { label: '위치·유동성', patch: { maxW52Pos: filters.maxW52Pos, minTrAmt: filters.minTrAmt, excludeHalted: filters.excludeHalted, excludeManaged: filters.excludeManaged, excludeDelisting: filters.excludeDelisting } },
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

    const activeFilterCount = [excludeHoldings, excludeDeficit, excludePreferred, excludeHalted, excludeManaged, excludeDelisting, sectors.size > 0, markets.size > 0, maxW52Pos > 0, minTrAmt > 0, minMarketCap > 0, maxPbr > 0, maxPer > 0, minRoe > 0, minNcav > 0].filter(Boolean).length;
    const isAllActive = activeStrategyIds.size === 0;
    const hasActiveFilters = activeStrategyIds.size > 0 || excludeHoldings || excludeDeficit || excludePreferred || excludeHalted || excludeManaged || excludeDelisting || sectors.size > 0 || markets.size > 0 || maxW52Pos > 0 || minTrAmt > 0 || minMarketCap > 0 || maxPbr > 0 || maxPer > 0 || minRoe > 0 || minNcav > 0 || sortKey !== DEFAULT_SORT || sortOrder !== 'desc' || showLikedOnly;
    const isFiltered = !showLikedOnly && filteredList.length !== ncavDailyList.list.length;
    // 업종 묶기는 응답에 sector/industry 가 있을 때만. 없으면 세그먼트에서 비활성.
    const hasSectorData = ncavDailyList.list.some((i: any) => i.sector ?? i.industry);
    // 워커가 아직 이 값을 채우기 전(migration 0013 배포 전)에는 해당 서랍 카드를 아예 띄우지
    // 않는다. 조작해도 아무 일이 없는 손잡이를 두는 것보다 없는 편이 낫다.
    const hasTrAmtData = useMemo(() => baseList.some(i => trAmtEok(i) !== null), [baseList]);
    // 거래정지 판정은 stat_cls_code(58) 도 본다 → 둘 중 하나라도 있으면 손잡이를 띄운다.
    const hasHaltData = useMemo(() => baseList.some(i => i.temp_stop_yn != null || i.stat_cls_code != null), [baseList]);
    // 관리종목은 전용 플래그(migration 0014) 우선, 옛 데이터는 stat_cls_code(51) 로도 잡힌다.
    const hasManagedData = useMemo(() => baseList.some(i => i.mang_issu_cls_code != null || i.stat_cls_code != null), [baseList]);
    // 정리매매는 전용 플래그(sltr_yn)뿐이라 대체 경로가 없다.
    const hasDelistData = useMemo(() => baseList.some(i => i.sltr_yn != null), [baseList]);
    const hasW52Data = useMemo(() => baseList.some(i => w52Position(i) !== null), [baseList]);
    // 시장 선택지 — 지금 목록에 실제로 있는 시장만, 종목이 많은 순으로.
    const marketOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const i of baseList) {
            const m = marketOf(i);
            if (m) counts.set(m, (counts.get(m) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [baseList]);
    // 업종 선택지 — 지금 목록에 실제로 있는 업종만, 종목이 많은 순으로.
    const sectorOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const i of baseList) {
            const sec = sectorOf(i);
            if (sec) counts.set(sec, (counts.get(sec) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [baseList]);

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
        excludeHalted    && { label: '거래정지 제외',             override: { excludeHalted: false } as Partial<ScreenerFilters>,    clear: () => setExcludeHalted(false) },
        excludeManaged   && { label: '관리종목 제외',             override: { excludeManaged: false } as Partial<ScreenerFilters>,   clear: () => setExcludeManaged(false) },
        excludeDelisting && { label: '정리매매 제외',             override: { excludeDelisting: false } as Partial<ScreenerFilters>, clear: () => setExcludeDelisting(false) },
        minTrAmt > 0     && { label: `거래대금 ${minTrAmt}억+`,   override: { minTrAmt: 0 } as Partial<ScreenerFilters>,             clear: () => setMinTrAmt(0) },
        maxW52Pos > 0    && { label: `52주 저점권 ${maxW52Pos}%`, override: { maxW52Pos: 0 } as Partial<ScreenerFilters>,            clear: () => setMaxW52Pos(0) },
        sectors.size > 0 && { label: `업종 ${sectors.size}개`,    override: { sectors: new Set<string>() } as Partial<ScreenerFilters>, clear: () => setSectors(new Set()) },
        markets.size > 0 && { label: `시장 ${Array.from(markets).join('·')}`, override: { markets: new Set<string>() } as Partial<ScreenerFilters>, clear: () => setMarkets(new Set()) },
    ].filter(Boolean) as { label: string; override: Partial<ScreenerFilters>; clear: () => void }[]),
    [minMarketCap, maxPbr, maxPer, minNcav, minRoe, excludeDeficit, excludeHoldings, excludePreferred, excludeHalted, excludeManaged, excludeDelisting, minTrAmt, maxW52Pos, sectors, markets]);

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
        setExcludeHalted(false); setExcludeManaged(false); setExcludeDelisting(false);
        setSectors(new Set()); setMarkets(new Set()); setMaxW52Pos(0); setMinTrAmt(0);
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
        setSortKey(VALID_SORT_KEYS.includes(p.get('sort') as DiscoverySortKey) ? p.get('sort') as DiscoverySortKey : DEFAULT_SORT);
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
        <div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas text-neutral-900 dark:text-neutral-100">

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
                "sticky top-0 z-30 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md",
                "border-b border-neutral-200 dark:border-surface-dark-border"
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
                                className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-surface-canvas dark:bg-surface-dark-card border border-neutral-200 dark:border-surface-dark-border rounded-[10px] outline-none focus:border-[#16a34a] focus:ring-2 focus:ring-[#16a34a]/15 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
                            />
                        </div>

                        {/* 정렬 — NCAV 비율순 (활성 시 반전) */}
                        <button
                            onClick={() => { setSortKey(DEFAULT_SORT); setSortOrder(sortKey === DEFAULT_SORT && sortOrder === "desc" ? "asc" : "desc"); setDisplayCount(DAILY_PAGE_SIZE); }}
                            title="NCAV 비율 높은 순으로 정렬 (순유동자산 ÷ 시가총액)"
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold border transition-all whitespace-nowrap",
                                sortKey === DEFAULT_SORT
                                    ? "bg-neutral-900 dark:bg-white border-neutral-900 dark:border-white text-white dark:text-neutral-900"
                                    : "border-neutral-200 dark:border-surface-dark-border text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 bg-white dark:bg-surface-dark-card"
                            )}
                        >
                            NCAV순
                            <span className="font-mono text-[10px]">{sortKey === DEFAULT_SORT && sortOrder === "asc" ? "↑" : "↓"}</span>
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
                                        ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-brand-light-hover dark:border-[#166534] text-[#15803d] dark:text-[#16a34a]"
                                        : "bg-white dark:bg-surface-dark-card border-neutral-200 dark:border-surface-dark-border text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
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
                        <div className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-[10px] bg-[#f2f0ec] dark:bg-surface-dark-hover">
                            {([['table', '☰'], ['card', '▦'], ['ratio', '▤']] as const).map(([id, icon]) => (
                                <button
                                    key={id}
                                    onClick={() => setViewMode(id)}
                                    title={VIEW_MODE_TITLE[id]}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                                        viewMode === id
                                            ? "bg-white dark:bg-surface-dark text-neutral-900 dark:text-white shadow-sm"
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
                                    : "border-neutral-200 dark:border-surface-dark-border text-neutral-600 dark:text-neutral-400 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-500 dark:hover:text-rose-400 bg-white dark:bg-surface-dark-card"
                            )}
                        >
                            <Heart size={11} fill={showLikedOnly ? "currentColor" : "none"} />
                            관심
                            {!isLoggedIn && <Lock size={10} className="opacity-60" />}
                            <span className={cn(
                                "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                showLikedOnly ? "bg-white/20" : "bg-surface-canvas dark:bg-surface-dark-elevated text-neutral-500"
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
                                        STRATEGY_BADGE[id] ?? "bg-surface-canvas text-neutral-500"
                                    )}>
                                        {preset.label}
                                        <button onClick={() => toggleStrategy(id)} className="hover:opacity-70">
                                            <X size={9} />
                                        </button>
                                    </span>
                                );
                            })}
                            {/* OR / AND 토글 */}
                            <div className="flex items-center rounded-full border border-neutral-200 dark:border-surface-dark-border overflow-hidden text-[10px] font-black">
                                <button
                                    onClick={() => setFilterMode('OR')}
                                    className={cn(
                                        "px-2 py-0.5 transition-colors",
                                        filterMode === 'OR'
                                            ? "bg-[#16a34a] text-white"
                                            : "text-neutral-500 dark:text-neutral-400 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-card"
                                    )}
                                >
                                    OR
                                </button>
                                <button
                                    onClick={() => setFilterMode('AND')}
                                    className={cn(
                                        "px-2 py-0.5 transition-colors border-l border-neutral-200 dark:border-surface-dark-border",
                                        filterMode === 'AND'
                                            ? "bg-[#16a34a] text-white"
                                            : "text-neutral-500 dark:text-neutral-400 hover:bg-surface-muted-hover dark:hover:bg-surface-dark-card"
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
                        if (excludeHalted)   chips.push({ key: 'halt', label: '거래정지 제외', clear: () => setExcludeHalted(false) });
                        if (excludeManaged)  chips.push({ key: 'mang', label: '관리종목 제외', clear: () => setExcludeManaged(false) });
                        if (excludeDelisting) chips.push({ key: 'slt', label: '정리매매 제외', clear: () => setExcludeDelisting(false) });
                        if (minTrAmt > 0)    chips.push({ key: 'tr',   label: `거래대금 ${minTrAmt}억+`, clear: () => { setMinTrAmt(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (maxW52Pos > 0)   chips.push({ key: 'w52',  label: `52주 저점권 ${maxW52Pos}%`, clear: () => { setMaxW52Pos(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (sectors.size > 0) chips.push({ key: 'sec', label: `업종 ${sectors.size}개`, clear: () => { setSectors(new Set()); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (markets.size > 0) chips.push({ key: 'mkt', label: `시장 ${Array.from(markets).join('·')}`, clear: () => { setMarkets(new Set()); setDisplayCount(DAILY_PAGE_SIZE); } });
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
                                        className="w-20 px-2 py-1 rounded-md font-mono tabular-nums bg-surface-canvas dark:bg-surface-dark border border-neutral-200 dark:border-surface-dark-border outline-none focus:border-[#16a34a]"
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

                            {/* 시장 — 코스닥은 같은 지표라도 변동성·유동성 성격이 다르다. */}
                            {marketOptions.length > 1 && (
                                <DrawerCard label="시장" remain={cumulativeCounts.market}>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {marketOptions.map(([mk, n]) => (
                                            <DrawerChip
                                                key={mk}
                                                active={markets.has(mk)}
                                                onClick={() => {
                                                    setMarkets(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(mk)) next.delete(mk); else next.add(mk);
                                                        return next;
                                                    });
                                                    setDisplayCount(DAILY_PAGE_SIZE);
                                                }}
                                            >
                                                {mk} <span className="opacity-60 font-mono">{n}</span>
                                            </DrawerChip>
                                        ))}
                                    </div>
                                </DrawerCard>
                            )}

                            {/* 업종 — 저PBR·NCAV 결과는 한 업종에 몰리기 쉽다. 골라서 좁히거나 덜어낸다. */}
                            {hasSectorData && sectorOptions.length > 0 && (
                                <DrawerCard label="업종" remain={cumulativeCounts.sector} span2>
                                    <div className="flex items-center gap-1.5 flex-wrap max-h-28 overflow-y-auto -mr-1 pr-1">
                                        {sectorOptions.map(([sec, n]) => (
                                            <DrawerChip
                                                key={sec}
                                                active={sectors.has(sec)}
                                                onClick={() => {
                                                    setSectors(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(sec)) next.delete(sec); else next.add(sec);
                                                        return next;
                                                    });
                                                    setDisplayCount(DAILY_PAGE_SIZE);
                                                }}
                                            >
                                                {sec} <span className="opacity-60 font-mono">{n}</span>
                                            </DrawerChip>
                                        ))}
                                    </div>
                                    {sectors.size > 0 && (
                                        <button
                                            onClick={() => { setSectors(new Set()); setDisplayCount(DAILY_PAGE_SIZE); }}
                                            className="mt-2 text-[11px] font-bold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                        >
                                            업종 선택 해제
                                        </button>
                                    )}
                                </DrawerCard>
                            )}

                            {/* 52주 위치 — 0%면 52주 저점, 100%면 고점. 낮을수록 덜 오른 구간이다.
                                "싸다"의 근거는 아니지만, 이미 크게 오른 종목을 걸러내는 데 쓴다. */}
                            {hasW52Data && (
                                <DrawerCard label="52주 위치" remain={cumulativeCounts.w52}>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {W52_POS_PRESETS.map(v => (
                                            <DrawerChip
                                                key={v}
                                                active={maxW52Pos === v}
                                                title={`현재가가 52주 저점~고점 구간의 아래쪽 ${v}% 안에 있는 종목`}
                                                onClick={() => { setMaxW52Pos(maxW52Pos === v ? 0 : v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                            >
                                                저점권 {v}%
                                            </DrawerChip>
                                        ))}
                                    </div>
                                </DrawerCard>
                            )}

                            {/* 유동성 — 지표가 아무리 좋아도 하루 거래대금이 적으면 원하는 수량을 담을 수 없다. */}
                            {hasTrAmtData && (
                                <DrawerCard label="일 거래대금" remain={cumulativeCounts.liquidity}>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {TR_AMT_PRESETS.map(v => (
                                            <DrawerChip key={v} active={minTrAmt === v} onClick={() => { setMinTrAmt(minTrAmt === v ? 0 : v); setDisplayCount(DAILY_PAGE_SIZE); }}>
                                                {v}억 이상
                                            </DrawerChip>
                                        ))}
                                    </div>
                                </DrawerCard>
                            )}

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
                                    {hasHaltData && (
                                        <DrawerCheck
                                            checked={excludeHalted}
                                            onChange={v => { setExcludeHalted(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                            label="거래정지 제외"
                                            delta={excludeHalted
                                                ? countWith({ excludeHalted: false }) - filteredList.length
                                                : filteredList.length - countWith({ excludeHalted: true })}
                                        />
                                    )}
                                    {hasManagedData && (
                                        <DrawerCheck
                                            checked={excludeManaged}
                                            onChange={v => { setExcludeManaged(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                            label="관리종목 제외"
                                            delta={excludeManaged
                                                ? countWith({ excludeManaged: false }) - filteredList.length
                                                : filteredList.length - countWith({ excludeManaged: true })}
                                        />
                                    )}
                                    {hasDelistData && (
                                        <DrawerCheck
                                            checked={excludeDelisting}
                                            onChange={v => { setExcludeDelisting(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                            label="정리매매 제외"
                                            delta={excludeDelisting
                                                ? countWith({ excludeDelisting: false }) - filteredList.length
                                                : filteredList.length - countWith({ excludeDelisting: true })}
                                        />
                                    )}
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
                <div className="bg-white dark:bg-surface-dark-card border-b border-neutral-200 dark:border-border-subtle-dark">
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
                                            : "border-neutral-200 dark:border-surface-dark-border hover:border-neutral-300 dark:hover:border-neutral-600 bg-surface-canvas dark:bg-surface-dark-card/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "text-[10px] font-extrabold px-2 py-0.5 rounded",
                                            STRATEGY_BADGE[preset.id] ?? "bg-surface-canvas text-neutral-500"
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
                        <div className="p-4 bg-surface-canvas dark:bg-surface-dark-card rounded-2xl">
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
                        {/* 결과 분포 — 목록을 늘어놓기 전에 "무엇을 받았는지"를 먼저 보여준다.
                            업종과 전략을 한 카드에 둔다: 같은 목록을 두 각도로 자른 것이라
                            나란히 놓아야 "이 업황 하나에 이 전략 하나" 같은 쏠림이 눈에 띈다. */}
                        {(sectorMix || strategyMix) && (
                            <div className="mb-3 rounded-xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card px-3.5 py-3">
                                <div className="flex items-baseline justify-between gap-2 mb-2">
                                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">결과 분포</span>
                                    <span className="text-[10.5px] font-mono text-neutral-400 tabular-nums shrink-0">{filteredList.length}종목</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {sectorMix && <MixRow label="업종" mix={sectorMix} />}
                                    {strategyMix && <MixRow label="전략" mix={strategyMix} />}
                                </div>
                                {sectorMix && sectorMix.top3Pct >= 60 && (
                                    <p className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-border-subtle-dark text-[11.5px] leading-relaxed text-[#b8762e] dark:text-[#d9a05a] break-keep">
                                        상위 3개 업종({sectorMix.topNames.join(' · ')})이 {sectorMix.top3Pct.toFixed(0)}%를 차지합니다.
                                        여기서 고르면 사실상 그 업황에 거는 셈입니다.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 결과에 거는 조작(묶기)과 목록 복사 — 조건을 고르는 상단과 분리한다.
                            묶기는 "무엇을 걸러낼지"가 아니라 "고른 결과를 어떻게 늘어놓을지"라
                            결과 바로 위가 제자리다. */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                            <div className="shrink-0 flex items-center gap-0.5 p-0.5 rounded-[10px] bg-[#f2f0ec] dark:bg-surface-dark-hover">
                                {([
                                    { id: 'none',     label: '안 묶기' },
                                    { id: 'sector',   label: '업종', disabled: !hasSectorData },
                                    { id: 'strategy', label: '전략' },
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
                                                ? "bg-white dark:bg-surface-dark font-extrabold text-neutral-900 dark:text-white shadow-sm"
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
                            groups ? (
                                <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden shadow-sm">
                                    <GroupedResults {...groupedProps} bodyClassName={GRID_BODY}
                                        renderRow={(item: any) => (
                                            <StockRatioRow key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} />
                                        )} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {visibleList.map((item: any) => (
                                        <StockRatioRow key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} />
                                    ))}
                                </div>
                            )
                        ) : viewMode === 'card' ? (
                            groups ? (
                                <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden shadow-sm">
                                    <GroupedResults {...groupedProps} bodyClassName={GRID_BODY}
                                        renderRow={(item: any) => (
                                            <StockGridCard key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} />
                                        )} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {visibleList.map((item: any) => (
                                        <StockGridCard key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} />
                                    ))}
                                </div>
                            )
                        ) : (
                        <>
                        {/* 데스크탑 테이블 */}
                        <div className="hidden md:block">
                            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden shadow-sm">
                                <div className="grid grid-cols-[minmax(160px,2.5fr)_minmax(110px,1fr)_88px_68px_68px_68px_88px] gap-4 items-center px-6 py-4 bg-[#fcfaf7] dark:bg-surface-dark border-b border-neutral-200 dark:border-border-subtle-dark">
                                    <SortableHeader label="종목명" sortKey="ticker" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략</div>
                                    <SortableHeader label="NCAV 비율" sortKey="ncav_ratio" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "ncav_ratio" in metricHighlight} />
                                    <SortableHeader label="PBR" sortKey="pbr" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "pbr" in metricHighlight} />
                                    <SortableHeader label="PER" sortKey="per" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "per" in metricHighlight} />
                                    <SortableHeader label="ROE" sortKey="roe" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "roe" in metricHighlight} title={ROE_BASIS_HINT} />
                                    <div />
                                </div>
                                {groups ? (
                                    <GroupedResults {...groupedProps}
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

                        {/* 모바일 카드 — 데스크톱 표와 같은 묶기를 여기서도 해 준다.
                            예전에는 이 블록이 묶기를 무시해, 폰에서는 버튼을 눌러도 아무 일이 없었다. */}
                        <div className="md:hidden">
                            {groups ? (
                                <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden shadow-sm">
                                    <GroupedResults {...groupedProps} bodyClassName="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3"
                                        renderRow={(item: any) => (
                                            <StockRowCard key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} highlight={metricHighlight} />
                                        )} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {visibleList.map((item: any) => (
                                        <StockRowCard key={item.ticker} item={item} onClick={handleStockClick} isLiked={likedTickers.has(item.name)} onToggleLike={handleToggleLike} highlight={metricHighlight} />
                                    ))}
                                </div>
                            )}
                        </div>
                        </>
                        )}

                        {hasMore && (
                            <div className="flex justify-center mt-10">
                                <button
                                    onClick={() => setDisplayCount(c => c + DAILY_PAGE_SIZE)}
                                    className="px-6 py-2.5 rounded-xl border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-card text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-[#4a4641] hover:text-neutral-900 dark:hover:text-white transition-all"
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
            <div className="flex items-center justify-center min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas">
                <Loader2 className="animate-spin text-[#16a34a]" size={24} />
            </div>
        }>
            <ScreenerContent />
        </Suspense>
    );
}
