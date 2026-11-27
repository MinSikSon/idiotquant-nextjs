"use client";

export const dynamic = 'force-dynamic';

import { useLocale, useTranslations } from "next-intl";
import * as Popover from "@radix-ui/react-popover";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { ToastContainer, useToast } from "@/components/ui/toast";

import { ComparisonCheckbox, type ComparisonChoice } from "@/components/comparison-checkbox";
import { addEtfHoldings, ETF_HOLDING_LIMIT } from "@/lib/features/communityEtfs/draft";
import { analysisHref, comparisonHref, matchesWatchStock, PENDING_WATCH_KEY, toggleComparisonSelection } from "@/lib/investmentFlow";
import { useEffect, useMemo, useState, useCallback, useRef, Suspense, memo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useViewAsUser } from "@/lib/viewAsUser";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    selectNcavDailyList, reqGetNcavDailyList,
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import { getScanDailyDates, getScanWeeklyPeriods } from "@/lib/features/algorithmTrade/algorithmTradeAPI";
import {
    selectLikedTickers, selectLikedList, selectTogglePending, selectLikesState,
    reqGetMyLikes, reqToggleLike, WATCHLIST_MARKET_LIMIT,
} from "@/lib/features/stockLikes/stockLikesSlice";
import { cn } from "@/lib/utils";
import { PageHeader, PAGE_ACTION_CLS, PAGE_PRIMARY_ACTION_CLS } from "@/components/pageHeader";
import { buildGroups, defaultOpenGroups, GroupedResults, type Group, type GroupMode } from "./components/GroupedResults";
import { ResultSummary, TermStrip } from "./components/ResultSummary";
import { krStockDisplayName } from "@/lib/utils/krStockNames";
import { WatchlistPriceLegend } from "@/components/watchlist-stock-row";
import { StockValuationRow } from "./components/StockValuationRow";
import { StockRatioRow } from "./components/StockRatioRow";
import { StockResult, type StockResultActions } from "./components/StockResult";
import { FilterWorldcup } from "./components/FilterWorldcup";
import { expandWorldcupParams, readWorldcupCode, worldcupCode, worldcupFilters, type WorldcupAnswer } from "./worldcup";
import ScreenerUsageGuide from "./components/ScreenerUsageGuide";
import { ScreenerHeroCoins } from "./components/ScreenerHeroCoins";
import { LiquidityBadge, w52Position } from "./components/LiquidityBadge";
import { scanTradingAmount } from "@/lib/utils/scanFinancials";
import { isUsTicker } from "@/lib/utils/stockSearchInput";
import ScanRefreshNotice from "@/components/scan-refresh-notice";
import { useStrategyText } from "@/i18n/strategy-labels";
import { STRATEGY_BADGE, STRATEGY_PRESETS_CLIENT as STRATEGY_PRESETS, MKTCAP_PRESETS, STRATEGY_HEX } from "@/lib/constants/strategies";
import {
    safeNum, parseIncomeTaxBound, isPreferredStock, marketOf, sectorOf, roeOf, grahamOk,
    resolveStrategies, primaryStrategyOf,
    applyFilters, sortList, FILTER_GROUP_ORDER, GROUP_DEFAULTS, DEFAULT_SORT, VALID_SORT_KEYS,
    type ScreenerFilters, type FilterGroupKey, type DiscoverySortKey, type SortOrder,
} from "./filters";

import FinancialFreshnessNotice from "@/components/financial-freshness";
import { scanFinancialPeriods, scanCollectionDate } from "@/lib/utils/financialFreshness";
import FactorWorkbench from "@/components/research/FactorWorkbench";
import WatchlistChanges from "@/components/watchlistChanges";
import styles from "./screener.module.css";

import { ArrowDown, ArrowDownUp, ArrowUp, RefreshCw, Ellipsis, ChevronDown, CalendarDays, Loader2, Search, SlidersHorizontal, Info, X, Heart, Clock, Check, Lock, Plus } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";

// =========================================================================
// 상수 & 타입
// =========================================================================
const DAILY_PAGE_SIZE = 30;
const TABLE_COLUMNS = "grid-cols-[minmax(0,1fr)_3.375rem_3.5rem_3.25rem_44px] min-[360px]:grid-cols-[minmax(0,1fr)_3.75rem_3.5rem_3.25rem_44px] sm:grid-cols-[minmax(0,1fr)_4.25rem_3.25rem_3.25rem_44px] lg:grid-cols-[minmax(160px,2fr)_minmax(110px,1.25fr)_minmax(88px,1fr)_minmax(68px,1fr)_minmax(68px,1fr)_minmax(68px,1fr)_9.5rem]";

// 비로그인에게 보여 주는 줄 수. 검색엔진과 처음 온 사람에게 "무엇이 나오는 화면인지"는
// 보여 주되, 목록 전체는 계정이 있어야 본다.
const PREVIEW_SIZE = 10;

// 밸류에이션 필터 프리셋 (0 = 미적용)
const PBR_MAX_PRESETS = [0.5, 0.7, 1.0];   // PBR 이하
const PER_MAX_PRESETS = [5, 10, 15];        // PER 이하
const ROE_MIN_PRESETS = [5, 10, 15];        // ROE(%) 이상
const NCAV_MIN_PRESETS = [0.7, 1.0, 1.5];   // NCAV 비율 이상

// 업종 분포 띠 색 — 앱 강조색(초록)에서 단계적으로 옅어지고, 마지막은 "그 외"용 중립색.
// 두 테마 모두 같은 값을 쓴다: 채도가 있는 면 위에 흰 글씨라 바탕색이 바뀌어도 대비가 유지된다.
const MIX_COLORS = ['#126557', '#218774', '#4a9d8b', '#78b5a6', '#93a89b', '#a8a29e'];

// 일 거래대금 하한 프리셋 (단위: 억원, 0 = 미적용)
const KR_TR_AMT_PRESETS = [1, 3, 10, 50]; // 억원
const US_TR_AMT_PRESETS = [0.1, 0.3, 1, 5]; // 백만 달러
const US_MKTCAP_PRESETS = [
    { label: "$50M+", value: 50 },
    { label: "$100M+", value: 100 },
    { label: "$500M+", value: 500 },
];
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
function MixRow({ label, mix, strategy = false }: { label: string; mix: Mix; strategy?: boolean }) {
    const t = useTranslations("screener");
    const strategyText = useStrategyText();
    const nameFor = (name: string) => strategy ? strategyText(name) : name === "그 외" ? t("otherSectors") : name;
    return (
        <div className="flex items-start gap-2.5">
            <span className="w-16 shrink-0 break-words pt-[5px] text-xs font-extrabold text-neutral-400">{label}</span>
            <div className="flex-1 min-w-0">
                <div className="flex h-6 rounded-md overflow-hidden border border-neutral-200 dark:border-surface-dark-border">
                    {mix.segs.map(seg => (
                        <div
                            key={seg.name}
                            title={`${nameFor(seg.name)} · ${t("count", { count: seg.n })} (${seg.pct.toFixed(0)}%)`}
                            style={{ width: `${seg.pct}%`, minWidth: '3px', background: seg.color }}
                            className="relative flex items-center justify-center"
                        >
                            {seg.pct >= 15 && (
                                <span className="text-xs font-black text-white tabular-nums">{seg.pct.toFixed(0)}%</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {mix.segs.map(seg => (
                        <span key={seg.name} className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                            <i className="w-2 h-2 rounded-sm shrink-0" style={{ background: seg.color }} />
                            <span className="font-semibold">{nameFor(seg.name)}</span>
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
type ViewMode = 'valuation' | 'table' | 'ratio';
const DEFAULT_VIEW: ViewMode = 'valuation';
// 기존 링크와 저장 설정에서 명시적으로 선택한 보기를 유지한다.
const parseViewMode = (value: string | null | undefined): ViewMode =>
    value === 'ratio' ? 'ratio' : value === 'table' || value === 'card' ? 'table' : DEFAULT_VIEW;
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
        ? "px-0.5 sm:px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900/60 text-emerald-600 dark:text-emerald-400 font-bold"
        : "px-0.5 sm:px-1.5 py-0.5 rounded-md bg-neutral-100 dark:bg-surface-dark-hover text-neutral-400";
}

function MetricStatus({ highlight, metric, item }: { highlight: HighlightMap | null; metric: MetricKey; item: any }) {
    const t = useTranslations("screener");
    if (!highlight?.[metric]) return null;
    const matched = highlight[metric]!(item);
    const label = t(matched ? "highlightMet" : "highlightUnmet");
    return <span className="ml-0.5" title={label}><span aria-hidden="true">{matched ? "✓" : "×"}</span><span className="sr-only"> {label}</span></span>;
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
// 전략 이름과 해당 종목 수를 함께 보여준다.
function StrategyCell({ label, count, active, title, onClick }: {
    label: string;
    count: number;
    active: boolean;
    title?: string;
    onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick} title={title} aria-pressed={active} className={styles.strategyOption}>
            <span>{label}</span>
            <span className={styles.strategyCount}>{count.toLocaleString('ko-KR')}</span>
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
    const ascending = order === "asc";
    const SortIcon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowDownUp;
    return (
        <button
            type="button"
            title={title}
            aria-label={active ? `${label}, ${ascending ? "오름차순" : "내림차순"} 정렬 중` : `${label} 정렬`}
            onClick={() => onToggle(key)}
            className={cn(
                styles.sortControl,
                key !== "ticker" && styles.metricSort,
                active ? "text-brand-ink" : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200",
                relevant && !active && "text-emerald-600/90 dark:text-emerald-400/90"
            )}
        >
            {label}
            <SortIcon size={11} aria-hidden="true" className="shrink-0" />
        </button>
    );
}

// =========================================================================
// TableRow — 목록 뷰 공통 행. 좁은 화면에서는 핵심 지표만 한 줄에 표시한다.
// =========================================================================
const TableRow = memo(function TableRow({ item, displayName, actions, isLiked, onToggleLike, highlight, comparison }: {
    item: any;
    displayName: string;
    actions: StockResultActions;
    isLiked: boolean;
    onToggleLike: (ticker: string, name: string) => void;
    highlight: HighlightMap | null;
    comparison?: ComparisonChoice;
}) {
    const t = useTranslations("screener");
    const strategyText = useStrategyText();
    const roe = roeOf(item);
    const strategies: string[] = resolveStrategies(item);
    const ncav = safeNum(item.ncav_ratio);

    return (
        <StockResult
            ticker={item.ticker}
            name={item.name}
            displayName={displayName}
            actions={actions}
            comparison={comparison}
            className={cn("group grid min-h-[48px] gap-0.5 min-[360px]:gap-1 lg:gap-4 items-center px-2 py-0.5 sm:px-4 sm:py-2.5 lg:px-6 lg:py-0.5 hover:bg-brand-light/40 dark:hover:bg-surface-dark-card/50 cursor-pointer transition-colors border-b border-neutral-100 dark:border-border-subtle-dark last:border-0", TABLE_COLUMNS)}
        >
            <div className="min-w-0 flex items-center gap-1.5">
                <ComparisonCheckbox choice={comparison} name={displayName} />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-1.5">
                    <p className="min-w-0 font-semibold text-sm text-neutral-900 dark:text-white [overflow-wrap:anywhere]">{displayName}</p>
                    {item.ticker !== displayName && <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono [overflow-wrap:anywhere]">{item.ticker}</span>}
                    <span className="min-w-0 empty:hidden [&>span]:inline-block [&>span]:whitespace-normal [&>span]:[overflow-wrap:anywhere]">
                        <LiquidityBadge item={item} />
                    </span>
                    <FinancialFreshnessNotice compact periods={scanFinancialPeriods(item)} source={item.financial_source} collectionDate={scanCollectionDate(item)} />
                </div>
            </div>

            <div className="hidden lg:flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap">
                {strategies.slice(0, 2).map(s => (
                    <span key={s} className={cn("px-1.5 py-0.5 rounded text-xs font-semibold", STRATEGY_BADGE[s] ?? "bg-surface-canvas text-neutral-500")}>
                        {strategyText(s)}
                    </span>
                ))}
                {strategies.length > 2 && (
                    <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-surface-canvas dark:bg-surface-dark-elevated text-neutral-600 dark:text-neutral-300">
                        +{strategies.length - 2}
                    </span>
                )}
            </div>

            <div className={styles.metricCell}>
                <span className={cn(
                    "text-sm font-mono font-semibold tabular-nums",
                    ncav >= 1 ? "text-emerald-600 dark:text-emerald-400" :
                    ncav >= 0.7 ? "text-amber-500" : "text-neutral-400",
                    hlPillCls(highlight, "ncav_ratio", item)
                )}>
                    {ncav > 0 ? `${ncav.toFixed(2)}x` : "—"}<MetricStatus highlight={highlight} metric="ncav_ratio" item={item} />
                </span>
            </div>

            <div className={styles.metricCell}>
                <span className={cn("text-sm font-mono text-neutral-700 dark:text-neutral-200 tabular-nums", hlPillCls(highlight, "pbr", item))}>
                    {safeNum(item.pbr) > 0 ? `${safeNum(item.pbr).toFixed(2)}` : "—"}<MetricStatus highlight={highlight} metric="pbr" item={item} />
                </span>
            </div>

            <div className={styles.metricCell}>
                <span className={cn("text-sm font-mono text-neutral-700 dark:text-neutral-200 tabular-nums", hlPillCls(highlight, "per", item))}>
                    {safeNum(item.per) > 0 ? `${safeNum(item.per).toFixed(1)}` : "—"}<MetricStatus highlight={highlight} metric="per" item={item} />
                </span>
            </div>

            <div className={cn(styles.metricCell, "hidden lg:block")}>
                <span className={cn(
                    "text-sm font-mono tabular-nums",
                    roe > 15 ? "text-emerald-600 dark:text-emerald-400 font-bold" :
                    roe > 0 ? "text-neutral-600 dark:text-neutral-300" : "text-neutral-400",
                    hlPillCls(highlight, "roe", item)
                )}>
                    {roe > 0 ? `${roe.toFixed(1)}%` : "—"}<MetricStatus highlight={highlight} metric="roe" item={item} />
                </span>
            </div>

            <div className="grid grid-flow-col auto-cols-max items-center justify-end gap-1.5">
                <button
                    type="button"
                    className={cn(
                        styles.tableLike,
                        "flex h-11 w-11 items-center justify-center rounded transition-colors",
                        isLiked
                            ? "text-rose-500 dark:text-rose-400"
                            : "text-neutral-300 dark:text-neutral-600 hover:text-rose-400 dark:hover:text-rose-500"
                    )}
                    onClick={(e) => { e.stopPropagation(); onToggleLike(item.ticker, item.name); }}
                    title={isLiked ? t("removeWatch") : t("addWatch")}
                    aria-label={`${displayName} ${isLiked ? t("removeWatch") : t("addWatch")}`}
                >
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                </button>
                {comparison?.purpose !== "etf" && (
                    <span aria-hidden="true" className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-canvas dark:bg-surface-dark-card group-hover:bg-neutral-200 dark:group-hover:bg-surface-dark-hover text-neutral-600 dark:text-neutral-400 text-xs font-bold whitespace-nowrap">
                        {t("stockMenu")}
                        <Ellipsis size={14} />
                    </span>
                )}
            </div>
        </StockResult>
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
        <div className={cn(styles.drawerCard, dashed && styles.drawerSaved, span2 && "sm:col-span-2")}>
            <div className={styles.drawerCardHeading}>
                <h3>{label}</h3>
                {remain !== undefined && <span className="tabular-nums">{remain.toLocaleString('ko-KR')}개</span>}
            </div>
            <div className={styles.drawerCardBody}>
                {children}
            </div>
        </div>
    );
}

// 서랍 안의 프리셋 칩 — 활성 값을 다시 누르면 해제
function DrawerChip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            title={title}
            className={styles.drawerChip}
        >
            <Check size={12} aria-hidden="true" className={active ? undefined : "invisible"} />
            {children}
        </button>
    );
}

// 체크박스 행 — 우측 −N 이 이 화면의 핵심. 어떤 조건이 결과를 많이 죽이는지 켜기 전에 알 수 있다.
function DrawerCheck({ checked, onChange, label, delta }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; delta: number;
}) {
    return (
        <label className={styles.drawerCheck} data-checked={checked}>
            <span className={styles.drawerCheckIcon} aria-hidden="true">
                {checked && <Check size={11} strokeWidth={3} />}
            </span>
            <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
            <span className={cn(
                "flex-1 text-sm",
                checked ? "font-semibold" : "font-medium"
            )}>
                {label}
            </span>
            {delta > 0 && (
                <span className={styles.drawerDelta}>−{delta}</span>
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
  const locale = useLocale();
  const t = useTranslations("screener");
  const analysis = useTranslations("analysis");
  const { toasts, addToast, removeToast } = useToast();
  const strategyText = useStrategyText();
    const dispatch = useAppDispatch();
    const router = useRouter();
    const rawSearchParams = useSearchParams();
    const searchParams = useMemo(() => expandWorldcupParams(rawSearchParams.toString()), [rawSearchParams]);
    const [sharedWorldcup] = useState(() => readWorldcupCode(rawSearchParams.get('w')));
    const fromSharedScreen = rawSearchParams.get('from') === 'share';
    const [worldcupAnswers, setWorldcupAnswers] = useState<WorldcupAnswer[]>(sharedWorldcup?.answers ?? []);
    const [worldcupSharePath, setWorldcupSharePath] = useState<string>();
    const { data: session, status: sessionStatus } = useSession();
    const isLoggedIn = !!session;
    const viewAsUser = useViewAsUser();
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin" && !viewAsUser;
    const [selectedDate, setSelectedDate] = useState("latest");
    const [availableDates, setAvailableDates] = useState<string[]>([]);
    const [weeklyPeriods, setWeeklyPeriods] = useState<string[]>([]);
    const [datesLoading, setDatesLoading] = useState(false);
    const [datesError, setDatesError] = useState(false);
    const weeklyPeriod = isAdmin && selectedDate.startsWith("weekly:") ? selectedDate.slice(7) : null;
    const requestedDate = isAdmin && !weeklyPeriod ? selectedDate : "latest";
    // 비로그인 시 관심종목 사용 → 로그인 페이지로 유도 (복귀 URL 보존)
    const requireLogin = useCallback(() => {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/screener${window.location.search}`)}`);
    }, [router]);
    const ncavDailyList = useAppSelector(selectNcavDailyList);
    const likedTickersArr = useAppSelector(selectLikedTickers);
    const likedList = useAppSelector(selectLikedList);
    const likesState = useAppSelector(selectLikesState);
    const likedTickers = useMemo(() => new Set(likedTickersArr), [likedTickersArr]);

    // URL query params → localStorage(전체 필터 스냅샷) 순 fallback으로 상태 초기화
    // (다른 페이지 다녀와 URL 파라미터가 없어도 마지막 필터를 그대로 복원)
    const [saved] = useState(() => {
        // 공개 미리보기에서 이어오면 이전 개인 필터 대신 명시한 조건부터 시작한다.
        if (sharedWorldcup || fromSharedScreen || searchParams.get("from") === "preview" || typeof window === 'undefined') return {} as Record<string, any>;
        try { return JSON.parse(localStorage.getItem('screener:filters') || '{}') as Record<string, any>; }
        catch { return {} as Record<string, any>; }
    });
    const [country, setCountry] = useState<"KR" | "US">(() =>
        (searchParams.get('country') ?? saved.country) === 'US' ? 'US' : 'KR'
    );
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
    const [strategiesOpen, setStrategiesOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [etfCreationMode, setEtfCreationMode] = useState(() => rawSearchParams.get('createEtf') === '1');
    const [etfSelectionError, setEtfSelectionError] = useState('');
    const [comparisonSelection, setComparisonSelection] = useState<{ country: string; tickers: string[] }>({ country: "KR", tickers: [] });
    // 분포·산점도는 유용하지만 매번 목록보다 먼저 읽을 정보는 아니다. 기본은 결과에
    // 집중하고, 비교가 필요할 때만 같은 자리에서 펼친다.
    const [showInsights, setShowInsights] = useState(false);
    const [sortKey, setSortKey] = useState<DiscoverySortKey>(() => {
        const s = (searchParams.get('sort') ?? saved.sort) as DiscoverySortKey;
        return VALID_SORT_KEYS.includes(s) ? s : DEFAULT_SORT;
    });
    const [sortOrder, setSortOrder] = useState<SortOrder>(() =>
        (searchParams.get('order') ?? saved.order) === 'asc' ? 'asc' : 'desc'
    );
    const [displayCount, setDisplayCount] = useState(DAILY_PAGE_SIZE);
    const [excludeHoldings, setExcludeHoldings] = useState(() => initExclude('holdings'));
    const [excludeDeficit, setExcludeDeficit] = useState(() => initExclude('deficit'));
    const [excludePreferred, setExcludePreferred] = useState(() => initExclude('preferred'));
    const [excludeChinaSmall, setExcludeChinaSmall] = useState(() => initExclude('china-small'));
    const [excludeLowLiquidity, setExcludeLowLiquidity] = useState(() => initExclude('low-liquidity'));
    const [excludeCashBurn, setExcludeCashBurn] = useState(() => initExclude('cash-burn'));
    const [excludeAdr, setExcludeAdr] = useState(() => initExclude('adr'));
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
    // 일 거래대금 하한 (KR: 억원, US: 백만 달러, URL param: mintr)
    const [minTrAmt, setMinTrAmt] = useState<number>(() => initNum('mintr', 'mintr', country === 'US' ? US_TR_AMT_PRESETS : KR_TR_AMT_PRESETS));
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterMethod, setFilterMethod] = useState<'manual' | 'worldcup'>(sharedWorldcup && !fromSharedScreen ? 'worldcup' : 'manual');
    const filterButton = useRef<HTMLButtonElement>(null);
    const worldcupBackButton = useRef<HTMLButtonElement>(null);
    const previousFilterMethod = useRef(filterMethod);

    const [likedOnlyRequested, setShowLikedOnly] = useState(() =>
        (searchParams.get('filter') ?? saved.filter) === 'liked'
    );
    const showLikedOnly = isLoggedIn && likedOnlyRequested;
    // 시가총액 필터 (KR: 억원, US: 백만 달러, URL param: mincap)
    // 시가총액 직접 입력값과 PBR 슬라이더의 중간값도 URL·저장 조합에서 그대로 복원해야
    // 한다. 프리셋만 허용하면 750억·PBR 0.65처럼 사용자가 직접 고른 값이 재진입 때
    // 조용히 사라져 "저장" 기능을 믿을 수 없게 된다.
    const [minMarketCap, setMinMarketCap] = useState<number>(() => initNum('mincap', 'mincap'));
    // 밸류에이션 필터 (0 = 미적용)
    const [maxPbr, setMaxPbr] = useState<number>(() => initNum('maxpbr', 'maxpbr'));
    const [maxPer, setMaxPer] = useState<number>(() => initNum('maxper', 'maxper'));
    const [minRoe, setMinRoe] = useState<number>(() => initNum('minroe', 'minroe'));
    const [minIncomeTax, setMinIncomeTax] = useState<number | null>(() => parseIncomeTaxBound(searchParams.get('mintax') ?? saved.mintax));
    const [maxIncomeTax, setMaxIncomeTax] = useState<number | null>(() => parseIncomeTaxBound(searchParams.get('maxtax') ?? saved.maxtax));
    const [minNcav, setMinNcav] = useState<number>(() => initNum('minncav', 'minncav'));

    // 저장된 필터 조합 — 자주 쓰는 조건을 이름 붙여 두면 다음에 한 번에 불러올 수 있다.
    const [savedSets, setSavedSets] = useState<SavedFilterSet[]>(() => {
        if (typeof window === 'undefined') return [];
        try { return JSON.parse(localStorage.getItem(SAVED_SETS_KEY) || '[]') as SavedFilterSet[]; }
        catch { return []; }
    });

    // 묶어 보기 / 뷰 모드. 저장한 선택은 유지하고 첫 방문만 카드 보기로 시작한다.
    const [groupMode, setGroupMode] = useState<GroupMode>(() => {
        const v = (searchParams.get('group') ?? saved.group) as GroupMode;
        return (['sector', 'strategy'] as GroupMode[]).includes(v) ? v : 'none';
    });
    const [viewMode, setViewMode] = useState<ViewMode>(
        () => parseViewMode(searchParams.get('view') ?? saved.view)
    );
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!filterOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setFilterOpen(false);
        };
        const isMobile = window.matchMedia('(max-width: 639px)').matches;
        const previousOverflow = document.body.style.overflow;
        if (isMobile) document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);
        return () => {
            if (isMobile) document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [filterOpen]);

    // 날짜 목록은 관리자에게만 요청하고, 현재 시장의 일간·주간 스캔일만 선택지로 보여준다.
    useEffect(() => {
        if (!isAdmin) return;
        let active = true;
        setDatesLoading(true);
        setDatesError(false);
        Promise.all([getScanDailyDates(country), getScanWeeklyPeriods(country)]).then(([result, weeklyResult]: any[]) => {
            if (!active) return;
            if (result?.success === false || weeklyResult?.success === false) throw new Error("scan dates unavailable");
            const dates = [...new Set<string>((result?.data ?? [])
                .filter((item: any) => (item.total_cnt ?? item.cnt ?? 0) > 0)
                .map((item: any) => String(item.scan_date).replaceAll("-", ""))
                .filter((date: string) => /^\d{8}$/.test(date)))].sort((a, b) => b.localeCompare(a));
            const weeks = [...new Set<string>((weeklyResult?.data ?? [])
                .filter((item: any) => (item.total_stocks ?? 0) > 0)
                .map((item: any) => String(item.period_label))
                .filter((period: string) => /^\d{8}$/.test(period)))].sort((a, b) => b.localeCompare(a));
            setAvailableDates(dates);
            setWeeklyPeriods(weeks);
            setSelectedDate(current => current === "latest" || dates.includes(current) || (current.startsWith("weekly:") && weeks.includes(current.slice(7))) ? current : "latest");
        }).catch(() => {
            if (active) setDatesError(true);
        }).finally(() => {
            if (active) setDatesLoading(false);
        });
        return () => { active = false; };
    }, [isAdmin, country]);

    // 로그인 여부와 관계없이 전체 종목에 필터·정렬을 적용한다.
    useEffect(() => {
        if (sessionStatus === "loading") return;
        dispatch(reqGetNcavDailyList(
            { date: requestedDate, weeklyPeriod, country }
        ));
    }, [dispatch, sessionStatus, country, requestedDate, weeklyPeriod]);

    useEffect(() => {
        if (isLoggedIn) dispatch(reqGetMyLikes());
    }, [dispatch, isLoggedIn]);

    // 현재 필터 상태를 그대로 재현하는 쿼리 스트링 (URL 동기화 + 공유 링크 공용)
    const queryString = useMemo(() => {
        const params = new URLSearchParams();
        const proposal = worldcupFilters(worldcupAnswers, country);
        const code = worldcupCode(country, worldcupAnswers);
        const compact = code && proposal.excludeDeficit === excludeDeficit && proposal.maxPer === maxPer && proposal.maxPbr === maxPbr && proposal.minTrAmt === minTrAmt;
        if (compact) params.set('w', code);
        else if (country === 'US') params.set('country', 'US');
        if (activeStrategyIds.size > 0)
            params.set('strategies', Array.from(activeStrategyIds).join(','));
        if (sortKey !== DEFAULT_SORT)
            params.set('sort', sortKey);
        if (sortOrder !== 'desc')
            params.set('order', sortOrder);
        const excludeList = [
            excludeHoldings ? 'holdings' : null,
            excludeDeficit && !compact ? 'deficit' : null,
            excludePreferred ? 'preferred' : null,
            country === 'US' && excludeAdr ? 'adr' : null,
            excludeChinaSmall ? 'china-small' : null,
            excludeLowLiquidity ? 'low-liquidity' : null,
            excludeCashBurn ? 'cash-burn' : null,

            excludeHalted ? 'halted' : null,
            excludeManaged ? 'managed' : null,
            excludeDelisting ? 'delisting' : null,
        ].filter(Boolean).join(',');
        if (excludeList) params.set('exclude', excludeList);
        if (sectors.size > 0) params.set('sectors', Array.from(sectors).join(','));
        if (markets.size > 0) params.set('markets', Array.from(markets).join(','));
        if (maxW52Pos > 0) params.set('w52', String(maxW52Pos));
        if (!compact && minTrAmt > 0) params.set('mintr', String(minTrAmt));
        if (minMarketCap > 0) params.set('mincap', String(minMarketCap));
        if (!compact && maxPbr > 0) params.set('maxpbr', String(maxPbr));
        if (!compact && maxPer > 0) params.set('maxper', String(maxPer));
        if (minRoe > 0) params.set('minroe', String(minRoe));
        if (minNcav > 0) params.set('minncav', String(minNcav));
        if (minIncomeTax !== null) params.set('mintax', String(minIncomeTax));
        if (maxIncomeTax !== null) params.set('maxtax', String(maxIncomeTax));
        if (showLikedOnly) params.set('filter', 'liked');
        if (groupMode !== 'none') params.set('group', groupMode);
        if (viewMode !== DEFAULT_VIEW) params.set('view', viewMode);
        if (fromSharedScreen) params.set('from', 'share');
        if (etfCreationMode) params.set('createEtf', '1');
        return params.toString();
    }, [worldcupAnswers, country, activeStrategyIds, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, excludeAdr, excludeChinaSmall, excludeLowLiquidity, excludeCashBurn, excludeHalted, excludeManaged, excludeDelisting, sectors, markets, maxW52Pos, minTrAmt, minMarketCap, maxPbr, maxPer, minRoe, minNcav, minIncomeTax, maxIncomeTax, showLikedOnly, groupMode, viewMode, fromSharedScreen, etfCreationMode]);

    // 필터 상태 → URL 동기화 + localStorage 저장 (페이지 이동 후 재진입 시에도 전체 필터 유지)
    useEffect(() => {
        // 타이핑 등 빠른 연속 변경 시 매번 router.replace + localStorage 쓰기를 피하려 디바운스
        const debounce = setTimeout(() => {
        router.replace(queryString ? `/screener?${queryString}` : '/screener', { scroll: false });

        // 전체 필터 스냅샷을 단일 키에 저장 — 다른 페이지 이동 후 복귀 시 그대로 복원
        const snapshot: Record<string, any> = {};
        if (country === 'US') snapshot.country = country;
        if (activeStrategyIds.size > 0) snapshot.strategies = Array.from(activeStrategyIds);
        if (sortKey !== DEFAULT_SORT) snapshot.sort = sortKey;
        if (sortOrder !== 'desc') snapshot.order = sortOrder;
        const excludeArr = [
            excludeHoldings ? 'holdings' : null,
            excludeDeficit ? 'deficit' : null,
            excludePreferred ? 'preferred' : null,
            country === 'US' && excludeAdr ? 'adr' : null,
            excludeChinaSmall ? 'china-small' : null,
            excludeLowLiquidity ? 'low-liquidity' : null,
            excludeCashBurn ? 'cash-burn' : null,

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
        if (minIncomeTax !== null) snapshot.mintax = minIncomeTax;
        if (maxIncomeTax !== null) snapshot.maxtax = maxIncomeTax;
        if (showLikedOnly) snapshot.filter = 'liked';
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
    }, [queryString, country, activeStrategyIds, sortKey, sortOrder, excludeHoldings, excludeDeficit, excludePreferred, excludeAdr, excludeChinaSmall, excludeLowLiquidity, excludeCashBurn, excludeHalted, excludeManaged, excludeDelisting, sectors, markets, maxW52Pos, minTrAmt, minMarketCap, maxPbr, maxPer, minRoe, minNcav, minIncomeTax, maxIncomeTax, showLikedOnly, groupMode, viewMode, router]);

    const handleRefresh = useCallback(() => {
        if (showLikedOnly) void dispatch(reqGetMyLikes());
        else void dispatch(reqGetNcavDailyList({ date: requestedDate, weeklyPeriod, country, force: true }));
        setDisplayCount(DAILY_PAGE_SIZE);
    }, [dispatch, showLikedOnly, country, requestedDate, weeklyPeriod]);

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
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const resetAllFilters = useCallback(() => {
        setActiveStrategyIds(new Set());
        setSortKey('ncav_ratio');
        setSortOrder('desc');
        setExcludeHoldings(false);
        setExcludeDeficit(false);
        setExcludePreferred(false); setExcludeAdr(false); setExcludeChinaSmall(false); setExcludeLowLiquidity(false); setExcludeCashBurn(false);
        setExcludeHalted(false);
        setExcludeManaged(false);
        setExcludeDelisting(false);
        setSectors(new Set());
        setMarkets(new Set());
        setMaxW52Pos(0);
        setMinTrAmt(0);
        setMinMarketCap(0);
        setMaxPbr(0);
        setMaxPer(0);
        setMinRoe(0);
        setMinNcav(0);
        setMinIncomeTax(null); setMaxIncomeTax(null);
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
        const scanMap = new Map(ncavDailyList.list.map((item: any) => [country === 'US' ? item.ticker : item.name, item]));
        const countryLikes = likedList.filter(item => Boolean(item.is_us) === (country === 'US'));
        const likedMap = new Map<string, (typeof likedList)[number]>(countryLikes.map(item => [item.ticker, item]));
        return Array.from(likedTickers).filter(ticker => scanMap.has(ticker) || likedMap.has(ticker)).map((ticker: string) => {
            const fromScan = scanMap.get(ticker);
            if (fromScan) return fromScan;
            const fromLiked = likedMap.get(ticker);
            if (fromLiked) return { ...fromLiked, country, name: fromLiked.stock_name ?? ticker };
            return { ticker, country, name: ticker, strategies: [] as string[] };
        }) as Record<string, any>[];
    }, [likedTickers, likedList, ncavDailyList.list, country]);

    // 현재 필터 상태 스냅샷 — 목록·파생 카운트가 같은 입력을 쓰도록 한 곳에서 만든다
    const filters = useMemo<ScreenerFilters>(() => ({
        country,
        strategies: activeStrategyIds,
        q: '',
        excludeHoldings, excludeDeficit, excludePreferred, excludeAdr: country === 'US' && excludeAdr, excludeChinaSmall, excludeLowLiquidity, excludeCashBurn, excludeHalted, excludeManaged, excludeDelisting,
        sectors, markets, maxW52Pos, minTrAmt,
        minMarketCap, maxPbr, maxPer, minRoe, minNcav, minIncomeTax, maxIncomeTax,
    }), [country, activeStrategyIds, excludeHoldings, excludeDeficit, excludePreferred, excludeAdr, excludeChinaSmall, excludeLowLiquidity, excludeCashBurn, excludeHalted, excludeManaged, excludeDelisting, sectors, markets, maxW52Pos, minTrAmt, minMarketCap, maxPbr, maxPer, minRoe, minNcav, minIncomeTax, maxIncomeTax]);

    const [usEnglishNames, setUsEnglishNames] = useState<Map<string, string> | null>(null);
    useEffect(() => {
        if (country !== 'US' || usEnglishNames) return;
        let cancelled = false;
        Promise.all(['nasdaq', 'nyse', 'amex'].map(async market => {
            const response = await fetch(`/data/usStockSymbols/${market}_full_tickers.json`);
            if (!response.ok) throw new Error(`US names: ${response.status}`);
            return response.json() as Promise<{ symbol: string; name: string }[]>;
        })).then(lists => {
            if (!cancelled) setUsEnglishNames(new Map(lists.flat().map(item => [item.symbol.trim().toUpperCase(), item.name])));
        }).catch(error => console.error('미국 영문 종목명 로딩 실패', error));
        return () => { cancelled = true; };
    }, [country, usEnglishNames]);

    const baseList = useMemo(() => {
        const list = (showLikedOnly ? normalizedLikedList : ncavDailyList.list) as Record<string, any>[];
        return country === 'US' ? list.map(item => ({
            ...item,
            eng_name: item.eng_name?.trim() || usEnglishNames?.get(String(item.ticker ?? '').trim().toUpperCase()),
        })) : list;
    }, [showLikedOnly, normalizedLikedList, ncavDailyList.list, country, usEnglishNames]);

    const filteredList = useMemo(() => {
        return sortList([...applyFilters(baseList, filters)], sortKey, sortOrder);
    }, [baseList, filters, sortKey, sortOrder]);

    // 묶기·복사·공유·결과 해석은 화면에서 볼 수 있는 결과를 함께 사용한다.
    const accessibleList = useMemo(() => isLoggedIn ? filteredList : filteredList.slice(0, PREVIEW_SIZE), [isLoggedIn, filteredList]);

    // 조건 하나만 다르게 걸었을 때 남는 개수 — 서랍의 −N 표기용
    const countWith = useCallback(
        (override: Partial<ScreenerFilters>) => applyFilters(baseList, { ...filters, ...override }).length,
        [baseList, filters]
    );

    // 그룹까지 누적 적용했을 때 남는 개수 — 서랍 카드 헤더의 →N개 표기용.
    // 뒤 그룹은 기본값으로 되돌려 "여기까지 좁히면 이만큼 남는다"를 보여준다.
    const cumulativeCounts = useMemo(() => {
        const out = {} as Record<FilterGroupKey, number>;
        if (!filterOpen) return out;
        FILTER_GROUP_ORDER.forEach((key, idx) => {
            const reset = FILTER_GROUP_ORDER.slice(idx + 1)
                .reduce<Partial<ScreenerFilters>>((acc, k) => ({ ...acc, ...GROUP_DEFAULTS[k] }), {});
            out[key] = applyFilters(baseList, { ...filters, ...reset }).length;
        });
        return out;
    }, [baseList, filters, filterOpen]);

    // 묶어 보기는 전체 결과를 대상으로 한다 — 페이지를 넘길 때마다 그룹 개수가 변하면
    // "이 전략에 12개"라는 숫자를 믿을 수 없다. 대신 상위 2개 그룹만 펼쳐 DOM을 작게 유지한다.
    const groups = useMemo(() => buildGroups(accessibleList, groupMode), [accessibleList, groupMode]);
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
            ? strategyText(g.key, "formula", "")
            : '',
    };

    const matchedTotal = filteredList.length;
    const previewCapped = !isLoggedIn && matchedTotal > PREVIEW_SIZE;
    const visibleList = accessibleList.slice(0, displayCount);
    const hasMore = isLoggedIn && !groups && filteredList.length > displayCount;

    // 결과 분포 — 지금 화면에 있는 목록 기준. 저PBR·NCAV 결과는 업황이 꺾인 산업 하나로
    // 뒤덮이기 쉬운데, 표를 위에서부터 읽으면 그게 "싼 회사가 많다"로 보인다.
    const sectorMix = useMemo(() => buildMix(accessibleList, sectorOf, idx => MIX_COLORS[idx]), [accessibleList]);
    // 전략도 같은 자리에서 본다. 예전에는 표 위 요약 카드가 따로 세었는데, 분포를 두 군데서
    // 보여 주면 어느 쪽을 읽어야 할지 알 수 없어 한 카드로 합쳤다.
    const strategyMix = useMemo(
        () => buildMix(
            accessibleList,
            i => primaryStrategyOf(i) ?? "",
            // 색과 폴백 회색은 산점도 점과 같은 값이어야 범례가 성립한다.
            (idx, name) => STRATEGY_HEX[name] ?? "#a3a3a3",
            Infinity,
        ),
        [accessibleList]
    );

    // 상세 필터가 열려 있을 때 단계별 남은 종목 수를 계산한다.
    const funnel = useMemo(() => {
        if (!filterOpen) return [];
        const none: ScreenerFilters = {
            country,
            strategies: new Set(), q: '',
            excludeHoldings: false, excludeDeficit: false, excludePreferred: false, excludeAdr: false, excludeChinaSmall: false, excludeLowLiquidity: false, excludeCashBurn: false, excludeHalted: false, excludeManaged: false, excludeDelisting: false,
            sectors: new Set<string>(), markets: new Set<string>(), maxW52Pos: 0, minTrAmt: 0,
            minMarketCap: 0, maxPbr: 0, maxPer: 0, minRoe: 0, minNcav: 0,
        };
        const steps: { label: string; patch: Partial<ScreenerFilters> }[] = [
            { label: t("all"),      patch: {} },
            { label: t("strategy"),      patch: { strategies: filters.strategies } },
            { label: '가치 지표', patch: { minMarketCap: filters.minMarketCap, maxPbr: filters.maxPbr, maxPer: filters.maxPer, minNcav: filters.minNcav } },
            { label: '수익·제외', patch: { minRoe: filters.minRoe, minIncomeTax: filters.minIncomeTax, maxIncomeTax: filters.maxIncomeTax, excludeDeficit: filters.excludeDeficit, excludeHoldings: filters.excludeHoldings, excludePreferred: filters.excludePreferred, excludeAdr: filters.excludeAdr, excludeChinaSmall: filters.excludeChinaSmall, excludeLowLiquidity: filters.excludeLowLiquidity, excludeCashBurn: filters.excludeCashBurn } },
            { label: '시장·업종', patch: { markets: filters.markets, sectors: filters.sectors } },
            { label: '위치·유동성', patch: { maxW52Pos: filters.maxW52Pos, minTrAmt: filters.minTrAmt, excludeHalted: filters.excludeHalted, excludeManaged: filters.excludeManaged, excludeDelisting: filters.excludeDelisting } },
        ];
        let acc = { ...none };
        return steps.map(s => {
            acc = { ...acc, ...s.patch };
            return { label: s.label, count: applyFilters(baseList, acc).length };
        });
    }, [baseList, filters, filterOpen]);

    // 단일 전략만 선택했을 때, 그 전략 기준 컬럼을 강조 (0개·복수 선택이면 강조 안 함)
    const highlightMap: HighlightMap | null =
        activeStrategyIds.size === 1 ? (STRATEGY_HIGHLIGHT[Array.from(activeStrategyIds)[0]] ?? null) : null;

    const scanLoading = ncavDailyList.state === 'pending' || ncavDailyList.state === 'init' || ncavDailyList.country !== country;
    const isLoading = showLikedOnly ? likesState === 'pending' || likesState === 'init' : scanLoading;
    const isRefreshing = !showLikedOnly && ncavDailyList.refreshing;
    const resultsFailed = showLikedOnly ? likesState === 'rejected' : ncavDailyList.state === 'rejected';
    const resultName = showLikedOnly ? t("watchlist") : t("scanData");

    const returnPath = `/screener${queryString ? `?${queryString}` : ''}`;
    const shareParams = new URLSearchParams(queryString);
    if (filterMethod === 'manual' || !shareParams.has('w')) shareParams.set('from', 'share');
    const compareLimit = etfCreationMode ? ETF_HOLDING_LIMIT : isLoggedIn ? 20 : 4;
    const compareTickers = comparisonSelection.country === country ? comparisonSelection.tickers.slice(0, compareLimit) : [];
    const compareMode = etfCreationMode || compareTickers.length > 0;
    const etfSourceList = (showLikedOnly ? normalizedLikedList : ncavDailyList.country === country ? ncavDailyList.list : []) as Record<string, any>[];
    const selectedEtfHoldings = compareTickers.flatMap(ticker => {
        const item = etfSourceList.find(value => value.ticker === ticker);
        return item ? [{ ticker: String(item.ticker), name: String(item.name || item.ticker) }] : [];
    });
    const canAddEtfHoldings = selectedEtfHoldings.length >= (etfCreationMode ? 1 : 2);
    const toggleComparison = (ticker: string) => {
        setEtfSelectionError('');
        setComparisonSelection(current => ({
            country,
            tickers: toggleComparisonSelection(current.country === country ? current.tickers : [], ticker, compareLimit),
        }));
    };
    const addSelectionToEtf = () => {
        if (!canAddEtfHoldings) return;
        try {
            addEtfHoldings({ market: country, holdings: selectedEtfHoldings });
            router.push("/etfs/draft");
        } catch (error) {
            setEtfSelectionError(error instanceof Error && !(error instanceof DOMException) ? error.message : "초안을 저장하지 못했어요.");
        }
    };
    const comparisonFor = (ticker: string): ComparisonChoice | undefined => compareMode ? {
        selected: compareTickers.includes(ticker),
        disabled: !compareTickers.includes(ticker) && compareTickers.length >= compareLimit,
        toggle: () => toggleComparison(ticker),
        purpose: etfCreationMode ? "etf" : undefined,
    } : undefined;

    useEffect(() => {
        if (isLoading) return;
        try {
            const key = 'screener:return-position';
            const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
            if (saved?.path !== returnPath) return;
            if (Number.isFinite(saved.count)) setDisplayCount(Math.max(DAILY_PAGE_SIZE, saved.count));
            const frame = requestAnimationFrame(() => {
                try { sessionStorage.removeItem(key); } catch { /* 복귀 스크롤은 계속한다. */ }
                window.scrollTo(0, Number(saved.y) || 0);
            });
            return () => cancelAnimationFrame(frame);
        } catch { /* 저장소를 사용할 수 없어도 목록은 열린다. */ }
    }, [isLoading, returnPath]);

    const openStockDetails = (ticker: string, name: string) => {
        try { sessionStorage.setItem('screener:return-position', JSON.stringify({ path: returnPath, y: window.scrollY, count: displayCount })); }
        catch { /* 필터 조건은 복귀 링크에 남긴다. */ }
        router.push(analysisHref(country === 'US' ? ticker : name, returnPath));
    };

    const stockName = (item: { ticker: string; name: string; eng_name?: string }) =>
        country === 'KR' ? krStockDisplayName(item.ticker, item.name, locale)
            : locale === 'ko' ? item.name : item.eng_name || item.name;
    const stockActions: StockResultActions = { openDetails: openStockDetails, toggleComparison };
    const ChartRow = viewMode === 'valuation' ? StockValuationRow : StockRatioRow;

    // 국내 관심종목은 이름 또는 코드로 저장된 기존 자료가 모두 있다.
    const watchTickerFor = (ticker: string, name: string) =>
        likedList.find(item => matchesWatchStock(item, { ticker, name, isUs: country === 'US' }))?.ticker
            ?? (country === 'US' ? ticker : name);

    const handleToggleLike = async (ticker: string, name: string) => {
        if (!isLoggedIn) {
            const stock = { ticker: country === 'US' ? ticker : name, name, isUs: country === 'US', createdAt: Date.now() };
            try { sessionStorage.setItem(PENDING_WATCH_KEY, JSON.stringify(stock)); } catch { /* 로그인 뒤 수동 저장 가능 */ }
            router.push(`/login?callbackUrl=${encodeURIComponent(analysisHref(stock.ticker, returnPath))}`);
            return;
        }
        const watchTicker = watchTickerFor(ticker, name);
        const wasLiked = likedTickers.has(watchTicker);
        try {
            await dispatch(reqToggleLike({ ticker: watchTicker, name, isUs: country === 'US' })).unwrap();
        } catch (error) {
            if (error !== WATCHLIST_MARKET_LIMIT) await dispatch(reqGetMyLikes());
            addToast('error', error === WATCHLIST_MARKET_LIMIT
                ? analysis("watchlistMarketLimit") : analysis(wasLiked ? "removeFailed" : "saveFailed"));
        }
    };

    const scanDate = ncavDailyList.scanDate;
    const formattedDate = scanDate
        ? `${scanDate.slice(0, 4)}.${scanDate.slice(4, 6)}.${scanDate.slice(6, 8)}${weeklyPeriod ? " 주간" : ""}`
        : null;
    const prevDate = ncavDailyList.prevDate;
    const formattedPrevDate = prevDate
        ? `${prevDate.slice(0, 4)}.${prevDate.slice(4, 6)}.${prevDate.slice(6, 8)}`
        : null;
    const scanningInProgress = ncavDailyList.scanningInProgress;

    const activeFilterCount = [excludeHoldings, excludeDeficit, excludePreferred, country === 'US' && excludeAdr, excludeChinaSmall, excludeLowLiquidity, excludeCashBurn, excludeHalted, excludeManaged, excludeDelisting, sectors.size > 0, markets.size > 0, maxW52Pos > 0, minTrAmt > 0, minMarketCap > 0, maxPbr > 0, maxPer > 0, minRoe > 0, minNcav > 0, minIncomeTax !== null, maxIncomeTax !== null].filter(Boolean).length;
    const isAllActive = activeStrategyIds.size === 0;
    const hasActiveNonStrategyFilters = excludeHoldings || excludeDeficit || excludePreferred || (country === 'US' && excludeAdr) || excludeChinaSmall || excludeLowLiquidity || excludeCashBurn || excludeHalted || excludeManaged || excludeDelisting || sectors.size > 0 || markets.size > 0 || maxW52Pos > 0 || minTrAmt > 0 || minMarketCap > 0 || maxPbr > 0 || maxPer > 0 || minRoe > 0 || minNcav > 0 || minIncomeTax !== null || maxIncomeTax !== null || sortKey !== DEFAULT_SORT || sortOrder !== 'desc' || showLikedOnly;
    const isFiltered = !showLikedOnly && filteredList.length !== ncavDailyList.list.length;
    // 업종 묶기는 응답에 sector/industry 가 있을 때만. 없으면 세그먼트에서 비활성.
    const hasSectorData = ncavDailyList.list.some((i: any) => i.sector ?? i.industry);
    // 워커가 아직 이 값을 채우기 전(migration 0013 배포 전)에는 해당 서랍 카드를 아예 띄우지
    // 않는다. 조작해도 아무 일이 없는 손잡이를 두는 것보다 없는 편이 낫다.
    const hasTrAmtData = useMemo(() => baseList.some(i => scanTradingAmount(i, country) !== null), [baseList, country]);
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
        minIncomeTax !== null && { label: `법인세 등 ≥ ${minIncomeTax}${country === 'US' ? 'M달러' : '억'}`, override: { minIncomeTax: null }, clear: () => setMinIncomeTax(null) },
        maxIncomeTax !== null && { label: `법인세 등 ≤ ${maxIncomeTax}${country === 'US' ? 'M달러' : '억'}`, override: { maxIncomeTax: null }, clear: () => setMaxIncomeTax(null) },
        minMarketCap > 0 && { label: `시총 ${minMarketCap}${country === 'US' ? 'M달러' : '억'}+`, override: { minMarketCap: 0 } as Partial<ScreenerFilters>, clear: () => setMinMarketCap(0) },
        maxPbr > 0       && { label: `PBR ≤ ${maxPbr}`,        override: { maxPbr: 0 } as Partial<ScreenerFilters>,       clear: () => setMaxPbr(0) },
        maxPer > 0       && { label: `PER ≤ ${maxPer}`,        override: { maxPer: 0 } as Partial<ScreenerFilters>,       clear: () => setMaxPer(0) },
        minNcav > 0      && { label: `NCAV ≥ ${minNcav}`,      override: { minNcav: 0 } as Partial<ScreenerFilters>,      clear: () => setMinNcav(0) },
        minRoe > 0       && { label: `ROE ≥ ${minRoe}%`,       override: { minRoe: 0 } as Partial<ScreenerFilters>,       clear: () => setMinRoe(0) },
        excludeDeficit   && { label: '적자 기업 제외',           override: { excludeDeficit: false } as Partial<ScreenerFilters>,   clear: () => setExcludeDeficit(false) },
        excludeHoldings  && { label: '홀딩스 제외',              override: { excludeHoldings: false } as Partial<ScreenerFilters>,  clear: () => setExcludeHoldings(false) },
        excludePreferred && { label: '우선주 제외',              override: { excludePreferred: false } as Partial<ScreenerFilters>, clear: () => setExcludePreferred(false) },
        country === 'US' && excludeAdr && { label: 'ADR 제외', override: { excludeAdr: false } as Partial<ScreenerFilters>, clear: () => setExcludeAdr(false) },
        excludeChinaSmall && { label: '중국 소재 소형주 제외', override: { excludeChinaSmall: false } as Partial<ScreenerFilters>, clear: () => setExcludeChinaSmall(false) },
        excludeLowLiquidity && { label: '저유동성 제외', override: { excludeLowLiquidity: false } as Partial<ScreenerFilters>, clear: () => setExcludeLowLiquidity(false) },
        excludeCashBurn && { label: '지속 현금 소진 제외', override: { excludeCashBurn: false } as Partial<ScreenerFilters>, clear: () => setExcludeCashBurn(false) },
        excludeHalted    && { label: '거래정지 제외',             override: { excludeHalted: false } as Partial<ScreenerFilters>,    clear: () => setExcludeHalted(false) },
        excludeManaged   && { label: '관리종목 제외',             override: { excludeManaged: false } as Partial<ScreenerFilters>,   clear: () => setExcludeManaged(false) },
        excludeDelisting && { label: '정리매매 제외',             override: { excludeDelisting: false } as Partial<ScreenerFilters>, clear: () => setExcludeDelisting(false) },
        minTrAmt > 0     && { label: `거래대금 ${minTrAmt}${country === 'US' ? 'M달러' : '억'}+`, override: { minTrAmt: 0 } as Partial<ScreenerFilters>, clear: () => setMinTrAmt(0) },
        maxW52Pos > 0    && { label: `52주 저점권 ${maxW52Pos}%`, override: { maxW52Pos: 0 } as Partial<ScreenerFilters>,            clear: () => setMaxW52Pos(0) },
        sectors.size > 0 && { label: `업종 ${sectors.size}개`,    override: { sectors: new Set<string>() } as Partial<ScreenerFilters>, clear: () => setSectors(new Set()) },
        markets.size > 0 && { label: `시장 ${Array.from(markets).join('·')}`, override: { markets: new Set<string>() } as Partial<ScreenerFilters>, clear: () => setMarkets(new Set()) },
    ].filter(Boolean) as { label: string; override: Partial<ScreenerFilters>; clear: () => void }[]),
    [country, minMarketCap, maxPbr, maxPer, minNcav, minRoe, minIncomeTax, maxIncomeTax, excludeDeficit, excludeHoldings, excludePreferred, excludeAdr, excludeChinaSmall, excludeLowLiquidity, excludeCashBurn, excludeHalted, excludeManaged, excludeDelisting, minTrAmt, maxW52Pos, sectors, markets]);

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
        setMinIncomeTax(null); setMaxIncomeTax(null);
        setExcludeHoldings(false); setExcludeDeficit(false); setExcludePreferred(false); setExcludeAdr(false); setExcludeChinaSmall(false); setExcludeLowLiquidity(false); setExcludeCashBurn(false);
        setExcludeHalted(false); setExcludeManaged(false); setExcludeDelisting(false);
        setSectors(new Set()); setMarkets(new Set()); setMaxW52Pos(0); setMinTrAmt(0);
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const persistSets = useCallback((next: SavedFilterSet[]) => {
        setSavedSets(next);
        localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(next));
    }, []);

    const saveCurrentSet = useCallback(() => {
        const fallback = activeConditions.map(c => c.label).join(' · ') || t("all");
        const name = (window.prompt('저장할 이름', fallback) ?? '').trim();
        if (!name) return;
        persistSets([...savedSets, { id: `${Date.now()}`, name, qs: queryString }].slice(-12));
    }, [activeConditions, savedSets, queryString, persistSets]);

    const applySavedSet = useCallback((qs: string) => {
        const p = expandWorldcupParams(qs);
        setWorldcupAnswers(readWorldcupCode(p.get('w'))?.answers ?? []);
        setCountry(p.get('country') === 'US' ? 'US' : 'KR');
        setActiveStrategyIds(new Set((p.get('strategies') ?? '').split(',').filter(id => STRATEGY_PRESETS.some(s => s.id === id))));
        setSortKey(VALID_SORT_KEYS.includes(p.get('sort') as DiscoverySortKey) ? p.get('sort') as DiscoverySortKey : DEFAULT_SORT);
        setSortOrder(p.get('order') === 'asc' ? 'asc' : 'desc');
        const ex = p.get('exclude')?.split(',') ?? [];
        setExcludeHoldings(ex.includes('holdings'));
        setExcludeDeficit(ex.includes('deficit'));
        setExcludePreferred(ex.includes('preferred'));
        setExcludeAdr(ex.includes('adr'));
        setExcludeChinaSmall(ex.includes('china-small'));
        setExcludeLowLiquidity(ex.includes('low-liquidity'));
        setExcludeCashBurn(ex.includes('cash-burn'));

        setExcludeHalted(ex.includes('halted'));
        setExcludeManaged(ex.includes('managed'));
        setExcludeDelisting(ex.includes('delisting'));
        setSectors(new Set((p.get('sectors') ?? '').split(',').map(v => v.trim()).filter(Boolean)));
        setMarkets(new Set((p.get('markets') ?? '').split(',').map(v => v.trim().toUpperCase()).filter(Boolean)));
        setMaxW52Pos(safeNum(p.get('w52')));
        setMinTrAmt(safeNum(p.get('mintr')));
        setMinMarketCap(safeNum(p.get('mincap')));
        setMaxPbr(safeNum(p.get('maxpbr')));
        setMaxPer(safeNum(p.get('maxper')));
        setMinRoe(safeNum(p.get('minroe')));
        setMinNcav(safeNum(p.get('minncav')));
        setMinIncomeTax(parseIncomeTaxBound(p.get('mintax')));
        setMaxIncomeTax(parseIncomeTaxBound(p.get('maxtax')));
        setShowLikedOnly(p.get('filter') === 'liked');
        const group = p.get('group');
        setGroupMode(group === 'sector' || group === 'strategy' ? group : 'none');
        setViewMode(parseViewMode(p.get('view')));
        setDisplayCount(DAILY_PAGE_SIZE);
    }, []);

    const clearStockSelection = () => {
        setEtfCreationMode(false);
        setEtfSelectionError('');
        setComparisonSelection({ country, tickers: [] });
    };

    useEffect(() => {
        if (previousFilterMethod.current === filterMethod) return;
        previousFilterMethod.current = filterMethod;
        (filterMethod === 'worldcup' ? worldcupBackButton : filterButton).current?.focus();
    }, [filterMethod]);

    const changeMarket = (value: 'KR' | 'US') => {
        if (country === value) return;
        setCountry(value);
        setEtfSelectionError('');
        setWorldcupAnswers([]);
        setSelectedDate("latest");
        setAvailableDates([]);
        setWeeklyPeriods([]);
        setMarkets(new Set());
        setSectors(new Set());
        // 두 시장의 시가총액·거래대금 입력 단위가 달라 이전 값을 옮길 수 없다.
        setMinMarketCap(0);
        setMinTrAmt(0);
        setMinIncomeTax(null); setMaxIncomeTax(null);
        setExcludeAdr(false); setExcludeChinaSmall(false); setExcludeLowLiquidity(false); setExcludeCashBurn(false);
        setExcludeHalted(false);
        setExcludeManaged(false);
        setExcludeDelisting(false);
        setShowLikedOnly(false);
        setDisplayCount(DAILY_PAGE_SIZE);
    };

    return (
        <Tooltip.Provider delayDuration={300}>
        <div id="screener-page" className={cn(styles.page, "landing-style-page min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas text-neutral-900 dark:text-neutral-100")}>
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* ── 페이지 헤더 (공통 규칙) ── */}
            <PageHeader
                title={etfCreationMode ? t("etfTitle") : showLikedOnly ? t("watchlistTitle") : t("title")}
                mobileTitleInNavigation={!showLikedOnly}
                mobileCompact
                mobileTitleOnScroll
                compactMetaOnScrollOnly
                compactMeta={<span className="text-xs">
                    {country === 'KR' ? t("kr") : t("us")} · {isLoading
                        ? t("loading")
                        : resultsFailed
                            ? t("failed")
                            : t("count", { count: matchedTotal })}
                </span>}
                meta={(
                    isLoading ? (
                        <span className="flex items-center gap-1.5">
                            <Loader2 size={11} className="animate-spin" />
                            {t("loadingResult", { result: resultName })}
                        </span>
                    ) : resultsFailed ? (
                        <span>{t("failedResult", { result: resultName })}</span>
                    ) : (
                        <>
                            {!showLikedOnly && formattedDate && <><span className="font-mono">{formattedDate}</span><span>·</span></>}
                            <span>{t.rich("matchCount", { count: matchedTotal, strong: value => <span className={cn("font-extrabold", isFiltered ? "text-brand-ink-hover dark:text-brand-ink" : "text-neutral-700 dark:text-neutral-300")}>{value}</span> })}</span>
                            {!showLikedOnly && ncavDailyList.list.length !== filteredList.length && (
                                <span className="text-neutral-300 dark:text-neutral-600">{t("totalCount", { count: ncavDailyList.list.length })}</span>
                            )}
                        </>
                    )
                )}
                share={{ path: filterMethod === 'worldcup' && worldcupSharePath ? worldcupSharePath : `/screener?${shareParams}` }}
                actions={<>
                    <button type="button" onClick={handleRefresh} disabled={isLoading || isRefreshing} className={PAGE_ACTION_CLS}>
                        <RefreshCw size={16} aria-hidden="true" className={isLoading || isRefreshing ? "motion-safe:animate-spin" : undefined} />
                        {t("refresh")}
                    </button>
                    <ScreenerUsageGuide />
                    {scanningInProgress && !showLikedOnly && filterMethod === 'manual' && (
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                            <Clock size={13} className="mt-1 shrink-0" />
                            <p>
                                {formattedPrevDate ? t("scanningDate", { date: formattedPrevDate }) : t("scanning")}
                            </p>
                        </div>
                    )}
                </>}
                primaryAction={etfCreationMode
                    ? <button type="button" disabled={!canAddEtfHoldings} onClick={addSelectionToEtf} className={`${PAGE_PRIMARY_ACTION_CLS} dark:text-neutral-950 max-[479px]:px-0`}>
                        <Plus size={16} aria-hidden="true" className="min-[480px]:hidden" />
                        <span className="max-[479px]:sr-only">초안에 담기{compareTickers.length > 0 && ` (${compareTickers.length})`}</span>
                    </button>
                    : undefined}

            />

            {etfCreationMode && <div className="service-container flex flex-wrap items-center justify-between gap-x-3">
                <p className="py-2 text-sm text-neutral-600 dark:text-neutral-300">목록에서 같은 시장의 종목을 골라 초안에 담으세요.</p>
                <Link href="/etfs/draft" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-ink underline-offset-4 hover:underline">초안 보기</Link>
                {etfSelectionError && <p role="alert" className="w-full pb-2 text-sm text-rose-700 dark:text-rose-300">{etfSelectionError}</p>}
            </div>}

            {!showLikedOnly && ncavDailyList.country === country && (ncavDailyList.refreshing || (ncavDailyList.receivedAt !== null && ncavDailyList.error)) && (
                <div className="service-container">
                    <ScanRefreshNotice refreshing={ncavDailyList.refreshing} error={ncavDailyList.error} onRetry={handleRefresh} />
                </div>
            )}

            {isAdmin && <div className="border-b border-neutral-200 bg-white dark:border-surface-dark-border dark:bg-surface-dark-card">
                <div className="service-container flex items-center gap-2">
                        <div className="relative ml-auto min-w-0 max-w-[168px] rounded-full py-1.5 focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 dark:focus-within:ring-offset-surface-dark-card">
                            <div className={cn(
                                "pointer-events-none flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
                                datesError ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400" : "border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-surface-dark-border dark:bg-surface-dark-hover dark:text-neutral-300",
                                datesLoading && "opacity-50",
                            )} aria-hidden="true">
                                {datesLoading ? <Loader2 size={13} className="shrink-0 animate-spin" /> : <CalendarDays size={13} className="shrink-0" />}
                                <span className="truncate">{datesError ? "날짜 조회 실패" : selectedDate === "latest" ? "최신 스캔" : `${weeklyPeriod ? "주간 " : ""}${selectedDate.replace("weekly:", "").replace(/^(\d{4})(\d{2})(\d{2})$/, "$1.$2.$3")}`}</span>
                                <ChevronDown size={12} className="shrink-0 text-neutral-400" />
                            </div>
                            <select
                                id="screener-date"
                                aria-label={datesError ? "조회 날짜 · 날짜 조회 실패" : "조회 날짜"}
                                value={selectedDate}
                                onChange={event => {
                                    setSelectedDate(event.target.value);
                                    setShowLikedOnly(false);
                                    setDisplayCount(DAILY_PAGE_SIZE);
                                }}
                                disabled={datesLoading || datesError}
                                className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0 disabled:cursor-wait"
                            >
                                <option value="latest">최신 스캔</option>
                                {availableDates.map(date => (
                                    <option key={date} value={date}>{date.slice(0, 4)}.{date.slice(4, 6)}.{date.slice(6, 8)}</option>
                                ))}
                                {weeklyPeriods.length > 0 && <optgroup label="주간 아카이브">
                                    {weeklyPeriods.map(period => (
                                        <option key={period} value={`weekly:${period}`}>주간 {period.slice(0, 4)}.{period.slice(4, 6)}.{period.slice(6, 8)} 시작</option>
                                    ))}
                                </optgroup>}
                            </select>
                        </div>
                </div>
            </div>}

            <div className="service-container pt-2 md:pt-5">
                <section aria-label={t("overview")} className={styles.overview}>
                    <div className={styles.overviewIntro}>
                        <h2>{etfCreationMode ? t("etfTitle") : showLikedOnly ? t("watchlistTitle") : t("title")}</h2>
                        <p>{t.rich("intro", { br: () => <br /> })}</p>
                        <div className={styles.overviewArt} aria-hidden="true">
                            <ScreenerHeroCoins className={styles.overviewCoins} />
                        </div>
                    </div>
                    <div className={styles.overviewMetrics}>
                        <div className={styles.overviewMetric}>
                            <Popover.Root>
                                <Popover.Trigger id="screener-market" className={styles.marketTrigger}>
                                    <span className={styles.marketLabel}>{t("market")}</span>
                                    <span className={styles.marketValue}>{country === 'KR' ? t("kr") : t("us")}</span>
                                    <ChevronDown aria-hidden="true" size={16} className={styles.marketChevron} />
                                </Popover.Trigger>
                                <Popover.Portal>
                                    <Popover.Content aria-label={t("selectMarket")} align="end" sideOffset={6} collisionPadding={8} className={styles.marketMenu}>
                                        {([['KR', t("kr")], ['US', t("us")]] as const).map(([value, label]) => (
                                            <Popover.Close key={value} type="button" aria-pressed={country === value}
                                                className={styles.marketOption} onClick={() => changeMarket(value)}>
                                                {label}
                                                {country === value && <Check size={16} aria-hidden="true" />}
                                            </Popover.Close>
                                        ))}
                                    </Popover.Content>
                                </Popover.Portal>
                            </Popover.Root>
                        </div>
                        <div className={styles.overviewMetric}>
                            <span>{t("match")}</span>
                            <strong className="tabular-nums">{isLoading ? '—' : resultsFailed ? '—' : matchedTotal.toLocaleString('ko-KR')} <small>{isLoading ? t("querying") : resultsFailed ? t("failed") : t("stocks")}</small></strong>
                        </div>
                        <div className={styles.overviewMetric}>
                            <span>{t("conditions")}</span>
                            <strong className="tabular-nums">{activeFilterCount}<small>개</small></strong>
                        </div>
                        <div className={styles.overviewMetric}>
                            <span>{t("asOf")}</span>
                            <strong className={styles.overviewDate}>{isLoading ? t("querying") : resultsFailed ? t("failed") : showLikedOnly ? t("notApplicable") : formattedDate || t("unavailable")}</strong>
                        </div>
                    </div>
                </section>
            </div>

            <div id="screener-worldcup" className={styles.worldcupSection} hidden={filterMethod !== 'worldcup'}>
                <div className="service-container">
                    <button
                        type="button"
                        ref={worldcupBackButton}
                        className={styles.actionQuiet}
                        onClick={() => setFilterMethod('manual')}
                    >
                        직접 필터로 돌아가기
                    </button>
                    <FilterWorldcup key={`${country}:${worldcupAnswers.join()}`} country={country} initialAnswers={worldcupAnswers} hasTradingAmount={hasTrAmtData} loading={scanLoading}
                        previewCount={proposal => applyFilters(baseList, { ...filters, ...proposal }).length}
                        onSharePathChange={setWorldcupSharePath}
                        onApply={(proposal, answers) => {
                            setWorldcupAnswers(answers);
                            setExcludeDeficit(proposal.excludeDeficit); setMaxPer(proposal.maxPer);
                            setMaxPbr(proposal.maxPbr); setMinTrAmt(proposal.minTrAmt);
                            setDisplayCount(DAILY_PAGE_SIZE); setFilterOpen(false); setFilterMethod('manual');
                        }} />
                </div>
            </div>

            {/* 검색은 상단바에, 전략 조건·정렬·필터는 본문에 둔다. */}
            <div className={cn(
                styles.filterSection,
                (filterMethod === 'worldcup') && "hidden"
            )}>
                <div className="service-container">
                    <div className={styles.filterToolbar}>
                        <button
                            type="button"
                            className={styles.strategyControl}
                            aria-expanded={strategiesOpen}
                            aria-controls="screener-strategies"
                            onClick={() => setStrategiesOpen(open => !open)}
                        >
                            <span>{t("strategy")} <span className={styles.strategySelection}>· {isAllActive ? t("all") : t("selected", { count: activeStrategyIds.size })}</span></span>
                            <ChevronDown size={14} aria-hidden="true" />
                        </button>

                        <div id="screener-strategies" className={styles.strategyLane} hidden={!strategiesOpen}>
                            <div role="group" aria-label={t("strategies")} className={styles.strategyOptions}>
                                <StrategyCell label={t("all")} count={strategyCounts.all} active={isAllActive} onClick={clearStrategies} />
                                {STRATEGY_PRESETS.map(preset => (
                                    <StrategyCell
                                        key={preset.id}
                                        label={strategyText(preset.id)}
                                        count={strategyCounts[preset.id] ?? 0}
                                        active={activeStrategyIds.has(preset.id)}
                                        title={strategyText(preset.id, "hint", preset.hint)}
                                        onClick={() => toggleStrategy(preset.id)}
                                    />
                                ))}
                            </div>
                            <button type="button" aria-expanded={showGuide} onClick={() => setShowGuide(open => !open)}
                                title={t("strategyGuide")} aria-label={t("strategyGuide")} className={styles.strategyHelp}>
                                <Info size={16} aria-hidden="true" />
                            </button>
                        </div>

                        <div className={styles.filterActions}>
                            <button
                                type="button"
                                ref={filterButton}
                                aria-expanded={filterOpen}
                                aria-controls={filterOpen ? "screener-filters" : undefined}
                                onClick={() => setFilterOpen(o => !o)}
                                data-active={filterOpen || activeFilterCount > 0}
                                className={styles.filterAction}
                            >
                                <SlidersHorizontal size={12} />
                                {t("advanced")}
                                {activeFilterCount > 0 && (
                                    <span className={styles.filterCount}>
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {/* 관심 종목 */}
                            <button
                                type="button"
                                aria-pressed={showLikedOnly}
                                aria-label={t("watchlistOnly")}
                                onClick={() => {
                                    if (!isLoggedIn) { requireLogin(); return; }
                                    setShowLikedOnly(o => !o); setActiveStrategyIds(new Set()); setDisplayCount(DAILY_PAGE_SIZE);
                                }}
                                className={styles.filterAction}
                            >
                                <Heart size={11} fill={showLikedOnly ? "currentColor" : "none"} />
                                {t("watchlistButton")}
                                {isLoggedIn
                                    ? <span className="text-xs tabular-nums">{likedTickers.size}</span>
                                    : <Lock size={10} aria-label={t("signInRequired")} />}
                            </button>
                        </div>

                    </div>

                    {/* 적용된 조건 칩 — 서랍이 닫혀 있을 때만. 열려 있으면 같은 조건이 서랍 안에
                        그대로 보이므로 두 번 나열할 이유가 없다. */}
                    {!filterOpen && (() => {
                        const chips: { key: string; label: string; clear: () => void }[] = [];
                        if (minIncomeTax !== null) chips.push({ key: 'mintax', label: `법인세 등 ≥ ${minIncomeTax}${country === 'US' ? 'M달러' : '억'}`, clear: () => setMinIncomeTax(null) });
                        if (maxIncomeTax !== null) chips.push({ key: 'maxtax', label: `법인세 등 ≤ ${maxIncomeTax}${country === 'US' ? 'M달러' : '억'}`, clear: () => setMaxIncomeTax(null) });
                        if (minMarketCap > 0) chips.push({ key: 'cap', label: `시총 ${country === 'US' ? `${minMarketCap}M달러+` : (MKTCAP_PRESETS.find(p => p.value === minMarketCap)?.label ?? `${minMarketCap}억+`)}`, clear: () => { setMinMarketCap(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (minNcav > 0)     chips.push({ key: 'ncav', label: `NCAV ≥ ${minNcav}`, clear: () => { setMinNcav(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (maxPbr > 0)      chips.push({ key: 'pbr', label: `PBR ≤ ${maxPbr}`, clear: () => { setMaxPbr(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (maxPer > 0)      chips.push({ key: 'per', label: `PER ≤ ${maxPer}`, clear: () => { setMaxPer(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (minRoe > 0)      chips.push({ key: 'roe', label: `ROE ≥ ${minRoe}%`, clear: () => { setMinRoe(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (excludeHoldings) chips.push({ key: 'hold', label: '홀딩스 제외', clear: () => setExcludeHoldings(false) });
                        if (excludeDeficit)  chips.push({ key: 'def',  label: '적자 제외',  clear: () => setExcludeDeficit(false) });
                        if (excludePreferred) chips.push({ key: 'pref', label: '우선주 제외', clear: () => setExcludePreferred(false) });
                        if (country === 'US' && excludeAdr) chips.push({ key: 'adr', label: 'ADR 제외', clear: () => setExcludeAdr(false) });
                        if (excludeChinaSmall) chips.push({ key: 'china-small', label: '중국 소재 소형주 제외', clear: () => setExcludeChinaSmall(false) });
                        if (excludeLowLiquidity) chips.push({ key: 'low-liquidity', label: '저유동성 제외', clear: () => setExcludeLowLiquidity(false) });
                        if (excludeCashBurn) chips.push({ key: 'cash-burn', label: '지속 현금 소진 제외', clear: () => setExcludeCashBurn(false) });
                        if (excludeHalted)   chips.push({ key: 'halt', label: '거래정지 제외', clear: () => setExcludeHalted(false) });
                        if (excludeManaged)  chips.push({ key: 'mang', label: '관리종목 제외', clear: () => setExcludeManaged(false) });
                        if (excludeDelisting) chips.push({ key: 'slt', label: '정리매매 제외', clear: () => setExcludeDelisting(false) });
                        if (minTrAmt > 0)    chips.push({ key: 'tr',   label: `거래대금 ${minTrAmt}${country === 'US' ? 'M달러' : '억'}+`, clear: () => { setMinTrAmt(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (maxW52Pos > 0)   chips.push({ key: 'w52',  label: `52주 저점권 ${maxW52Pos}%`, clear: () => { setMaxW52Pos(0); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (sectors.size > 0) chips.push({ key: 'sec', label: `업종 ${sectors.size}개`, clear: () => { setSectors(new Set()); setDisplayCount(DAILY_PAGE_SIZE); } });
                        if (markets.size > 0) chips.push({ key: 'mkt', label: `시장 ${Array.from(markets).join('·')}`, clear: () => { setMarkets(new Set()); setDisplayCount(DAILY_PAGE_SIZE); } });
                        // 전략은 옵션의 ‘전체’에서 해제한다. 정렬·관심을 초기화하는 경로는 유지한다.
                        if (chips.length === 0 && !hasActiveNonStrategyFilters) return null;
                        return (
                            <div className="pb-2.5 flex items-center gap-1.5 min-w-0">
                                {chips.length > 0 && <span className="hidden sm:inline text-xs text-neutral-400 font-medium shrink-0">적용:</span>}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto no-scrollbar">
                                {chips.map(c => (
                                    <span key={c.key} className={styles.appliedChip}>
                                        {c.label}
                                        <button type="button" onClick={c.clear} className={styles.actionQuiet} aria-label={`${c.label} 해제`}><X size={13} aria-hidden="true" /></button>
                                    </span>
                                ))}
                                </div>
                                {hasActiveNonStrategyFilters && (
                                    <button
                                        type="button"
                                        onClick={resetAllFilters}
                                        title="모든 조건 초기화"
                                        className={cn(styles.actionQuiet, "shrink-0")}
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
                <div id="screener-filters" aria-label={t("advanced")} className={styles.drawer}>
                    <div className="service-container">
                        <section className={styles.drawerFrame}>

                            <header className={styles.drawerHeader}>
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold">{t("advanced")}</h2>
                                    <p className={styles.drawerMeta} aria-live="polite">현재 {t("count", { count: filteredList.length })} · 조건을 바꾸면 바로 반영됩니다</p>
                                </div>
                                <div className={styles.drawerHeaderActions}>
                                    <button type="button" className={cn(styles.action, styles.actionRaised)}
                                        aria-label="이상형 월드컵으로 필터 고르기" onClick={() => {
                                        setFilterOpen(false);
                                        setFilterMethod('worldcup');
                                    }}>
                                        이상형 월드컵
                                    </button>
                                    <button type="button" onClick={clearDetailFilters} className={styles.actionQuiet}>전체 해제</button>
                                    <button type="button" onClick={() => setFilterOpen(false)} aria-label="필터 닫기" className={styles.actionQuiet}>
                                        <X size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </header>
                            <dl className={styles.drawerFunnel} aria-label="조건별 남은 종목 수">
                                {funnel.map(step => (
                                    <div key={step.label}>
                                        <dt>{step.label}</dt>
                                        <dd>{step.count.toLocaleString('ko-KR')}<span>{t("stocks")}</span></dd>
                                        <span aria-hidden="true" className={styles.funnelTrack}>
                                            <span style={{ width: `${funnel[0].count > 0 ? (step.count / funnel[0].count) * 100 : 0}%` }} />
                                        </span>
                                    </div>
                                ))}
                            </dl>

                        <div className={styles.drawerGrid}>

                            {/* 시가총액 — 프리셋과 직접 입력을 함께 둔다. 프리셋만 있으면 정확한 값을
                                못 넣고, 입력만 있으면 초보자가 무슨 값을 넣을지 모른다. */}
                            <DrawerCard label="시가총액" remain={cumulativeCounts.mktcap}>
                                <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                    {(country === 'US' ? US_MKTCAP_PRESETS : MKTCAP_PRESETS.filter(p => p.value > 0)).map(p => (
                                        <DrawerChip
                                            key={p.value}
                                            active={minMarketCap === p.value}
                                            onClick={() => { setMinMarketCap(minMarketCap === p.value ? 0 : p.value); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        >
                                            {p.label}
                                        </DrawerChip>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs">
                                    <input
                                        aria-label="시가총액 하한 직접 입력"
                                        type="number"
                                        min={0}
                                        value={minMarketCap || ''}
                                        onChange={e => { setMinMarketCap(Math.max(0, safeNum(e.target.value))); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        placeholder="0"
                                        className="w-24"
                                    />
                                    <span className={styles.drawerMeta}>{country === 'US' ? '백만 달러' : '억원'} 이상</span>
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
                                    aria-label="PBR 상한" className="w-full h-1 accent-brand cursor-pointer"
                                />
                                <div className={cn(styles.drawerMeta, "mt-1 flex items-center justify-between tabular-nums")}>
                                    <span>0</span>
                                    <span className={cn(maxPbr > 0 && "font-bold text-brand-ink")}>{maxPbr > 0 ? maxPbr.toFixed(2) : '미적용'}</span>
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
                                <label className="mt-3 block text-xs text-neutral-500">직접 입력 · PER
                                    <input aria-label="PER 직접 입력" type="number" min="0" step="0.1" value={maxPer || ''} placeholder="미적용" onChange={e => { setMaxPer(Math.max(0, safeNum(e.target.value))); setDisplayCount(DAILY_PAGE_SIZE); }} className="mt-1 w-full" />
                                </label>
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
                                <label className="mt-3 block text-xs text-neutral-500">직접 입력 · NCAV 비율
                                    <input aria-label="NCAV 비율 직접 입력" type="number" min="0" step="0.01" value={minNcav || ''} placeholder="미적용" onChange={e => { setMinNcav(Math.max(0, safeNum(e.target.value))); setDisplayCount(DAILY_PAGE_SIZE); }} className="mt-1 w-full" />
                                </label>
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
                                <label className="mt-3 block text-xs text-neutral-500">직접 입력 · ROE (%)
                                    <input aria-label="ROE (%) 직접 입력" type="number" min="0" step="0.1" value={minRoe || ''} placeholder="미적용" onChange={e => { setMinRoe(Math.max(0, safeNum(e.target.value))); setDisplayCount(DAILY_PAGE_SIZE); }} className="mt-1 w-full" />
                                </label>
                                <fieldset className="mt-3 border-t border-neutral-200 pt-3 dark:border-surface-dark-border">
                                    <legend className="text-xs font-bold">{country === 'KR' ? '법인세 등(차액) · 억 원' : '법인세비용(혜택) · 백만 달러'}</legend>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="text-xs text-neutral-500">최소 금액
                                            <input aria-label="법인세 등 최소 금액" type="number" step="any" value={minIncomeTax ?? ''} placeholder="미적용" onChange={e => { setMinIncomeTax(parseIncomeTaxBound(e.target.value)); setDisplayCount(DAILY_PAGE_SIZE); }} className="mt-1 w-full" />
                                        </label>
                                        <label className="text-xs text-neutral-500">최대 금액
                                            <input aria-label="법인세 등 최대 금액" type="number" step="any" value={maxIncomeTax ?? ''} placeholder="미적용" onChange={e => { setMaxIncomeTax(parseIncomeTaxBound(e.target.value)); setDisplayCount(DAILY_PAGE_SIZE); }} className="mt-1 w-full" />
                                        </label>
                                    </div>
                                    <p className="mt-2 text-xs leading-5 text-neutral-500">{country === 'KR' ? '경상이익 + 특별이익 − 특별손실 − 당기순이익의 차액이며, 공시 법인세비용과 다를 수 있습니다.' : '공시된 법인세비용이며 음수는 세금 혜택입니다.'} 최신 수집 재무기간 기준이며, 조건 적용 시 자료가 없는 종목은 제외합니다. 0·음수도 입력할 수 있습니다.</p>
                                    {minIncomeTax !== null && maxIncomeTax !== null && minIncomeTax > maxIncomeTax && <p role="alert" className="mt-1 text-xs text-rose-500">최소 금액이 최대 금액보다 큽니다.</p>}
                                </fieldset>
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
                                            className={cn(styles.actionQuiet, "mt-2")}
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
                                        {(country === 'US' ? US_TR_AMT_PRESETS : KR_TR_AMT_PRESETS).map(v => (
                                            <DrawerChip key={v} active={minTrAmt === v} onClick={() => { setMinTrAmt(minTrAmt === v ? 0 : v); setDisplayCount(DAILY_PAGE_SIZE); }}>
                                                {v}{country === 'US' ? 'M달러' : '억'} 이상
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
                                    {country === 'US' && (
                                        <DrawerCheck
                                            checked={excludeAdr}
                                            onChange={v => { setExcludeAdr(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                            label="ADR 제외"
                                            delta={excludeAdr
                                                ? countWith({ excludeAdr: false }) - filteredList.length
                                                : filteredList.length - countWith({ excludeAdr: true })}
                                        />
                                    )}
                                    <DrawerCheck
                                        checked={excludeChinaSmall}
                                        onChange={v => { setExcludeChinaSmall(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        label="중국 소재 소형주 제외"
                                        delta={excludeChinaSmall ? countWith({ excludeChinaSmall: false }) - filteredList.length : filteredList.length - countWith({ excludeChinaSmall: true })}
                                    />
                                    <DrawerCheck
                                        checked={excludeLowLiquidity}
                                        onChange={v => { setExcludeLowLiquidity(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        label="저유동성 제외"
                                        delta={excludeLowLiquidity ? countWith({ excludeLowLiquidity: false }) - filteredList.length : filteredList.length - countWith({ excludeLowLiquidity: true })}
                                    />
                                    <DrawerCheck
                                        checked={excludeCashBurn}
                                        onChange={v => { setExcludeCashBurn(v); setDisplayCount(DAILY_PAGE_SIZE); }}
                                        label="지속 현금 소진 제외"
                                        delta={excludeCashBurn ? countWith({ excludeCashBurn: false }) - filteredList.length : filteredList.length - countWith({ excludeCashBurn: true })}
                                    />
                                    <p className="px-2 py-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                                        중국 소재 소형주: 미국 상장·본사 중국·시총 3억 달러 미만. 저유동성: 일 거래대금 국내 3억원·미국 10만 달러 미만. 현금 소진: 최근 3개 연도 영업현금흐름 연속 음수. 미확인 종목은 제외하지 않습니다.
                                    </p>
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
                                <p className="text-xs leading-relaxed text-neutral-400 mb-2.5">
                                    자주 쓰는 필터를 이름 붙여 저장하고 다음에 한 번에 불러옵니다.
                                </p>
                                {savedSets.length > 0 && (
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
                                        {savedSets.map(s => (
                                            <span key={s.id} className={styles.savedChip}>
                                                <button type="button" onClick={() => applySavedSet(s.qs)} className={styles.actionQuiet} title={s.name}>
                                                    <span className="max-w-[160px] truncate">{s.name}</span>
                                                </button>
                                                <button type="button" onClick={() => persistSets(savedSets.filter(x => x.id !== s.id))} className={styles.actionQuiet} aria-label={`${s.name} 삭제`}>
                                                    <X size={13} aria-hidden="true" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <button
                                    onClick={saveCurrentSet}
                                    className={cn(styles.action, "w-full")}
                                >
                                    <Plus size={14} aria-hidden="true" /> 내 필터로 저장
                                </button>
                            </DrawerCard>
                        </div>
                        </section>
                    </div>
                    <div className={styles.drawerFooter}>
                        <button type="button" onClick={() => setFilterOpen(false)} className={cn(styles.actionPrimary, "w-full")}>
                            {filteredList.length}종목 결과 보기
                        </button>
                    </div>
                </div>
            )}

            {/* ── 전략 가이드 패널 ── */}
            {filterMethod === 'manual' && showGuide && (
                <div className="service-container py-2">
                    <section className={cn(styles.panelSurface, "p-3 sm:p-4")}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-sm font-black text-neutral-900 dark:text-white">{t("strategyExplanation")}</h2>
                                <p className="text-xs text-neutral-600 dark:text-neutral-400">{t("strategyLegend")}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuide(false)}
                                aria-label={t("closeStrategyExplanation")}
                                className={styles.actionQuiet}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {STRATEGY_PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => toggleStrategy(preset.id)}
                                    type="button"
                                    aria-pressed={activeStrategyIds.has(preset.id)}
                                    className={styles.guideOption}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "text-xs font-extrabold px-2 py-0.5 rounded",
                                            STRATEGY_BADGE[preset.id] ?? "bg-surface-canvas text-neutral-500"
                                        )}>
                                            {strategyText(preset.id)}
                                        </span>
                                        <span className="text-xs text-neutral-400 font-mono">
                                            {t("groupCount", { count: strategyCounts[preset.id] ?? 0 })}
                                        </span>
                                        {activeStrategyIds.has(preset.id) && (
                                            <span className="ml-auto text-xs font-black text-brand-ink dark:text-brand-ink bg-brand-light dark:bg-brand-muted/40 px-1.5 py-0.5 rounded">{t("strategySelected")}</span>
                                        )}
                                    </div>
                                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{strategyText(preset.id, "formula", preset.formula)}</p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                        {strategyText(preset.id, "hint", preset.hint)}
                                    </p>
                                </button>
                            ))}
                        </div>

                    </section>
                </div>
            )}

            {/* ── 종목 리스트 ── */}
            {filterMethod === 'manual' && showLikedOnly && likesState === "fulfilled" && session?.user?.id && <WatchlistChanges />}

            <div className={cn('service-container pt-2 sm:pt-4 pb-20', filterMethod === 'worldcup' && 'hidden')}>


                {isLoading && (
                    <div role="status" className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 size={32} aria-hidden="true" className="animate-spin text-brand-ink/50" />
                        <p className="text-sm font-bold text-neutral-400">{t("loadingResult", { result: resultName })}</p>
                    </div>
                )}

                {!isLoading && filteredList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                        <div className={cn(styles.panelSurface, "p-4")}>
                            {showLikedOnly
                                ? <Heart size={24} className="text-neutral-400" />
                                : <Search size={24} className="text-neutral-400" />
                            }
                        </div>
                        <div>
                            {resultsFailed ? (
                                <>
                                    <p role="alert" className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{showLikedOnly ? "관심종목을" : "스캔 데이터를"} 불러오지 못했습니다</p>
                                    <button type="button" onClick={handleRefresh} className={cn(styles.action, "mt-2")}>{t("retry")}</button>
                                </>
                            ) : baseList.length === 0 ? (
                                <>
                                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                        {country === 'US' ? t("us") : t("kr")} {showLikedOnly ? '관심종목이 없습니다' : '스캔 데이터가 없습니다'}
                                    </p>
                                    {showLikedOnly && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">발굴 목록에서 하트를 눌러 종목을 저장하세요.</p>}
                                    <button type="button" onClick={() => showLikedOnly ? setShowLikedOnly(false) : handleRefresh()} className={cn(styles.action, "mt-2")}>
                                        {showLikedOnly ? t("showScreener") : t("retry")}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
                                        {showLikedOnly ? t("noWatchlistMatch") : t("noMatch")}
                                    </p>
                                    <div className="mt-2 flex flex-wrap justify-center gap-2">
                                        {emptySuggestion ? (
                                            <button type="button" onClick={() => { emptySuggestion.clear(); setDisplayCount(DAILY_PAGE_SIZE); }} className={styles.action}>
                                                &lsquo;{emptySuggestion.label}&rsquo; 해제 · {emptySuggestion.count}종목 충족
                                            </button>
                                        ) : activeConditions.length > 0 && (
                                            <button type="button" onClick={clearDetailFilters} className={styles.action}>{t("clearAdvanced")}</button>
                                        )}
                                        {activeStrategyIds.size > 0 && (
                                            <button type="button" onClick={clearStrategies} className={styles.action}>전략 선택 해제</button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {!isLoading && filteredList.length > 0 && (
                    <>
                    <Tabs.Root value={viewMode} onValueChange={value => setViewMode(parseViewMode(value))} className={styles.resultsWorkbench}>
                        {/* 결과 분포 — 목록을 늘어놓기 전에 "무엇을 받았는지"를 먼저 보여준다.
                            업종과 전략을 한 카드에 둔다: 같은 목록을 두 각도로 자른 것이라
                            나란히 놓아야 "이 업황 하나에 이 전략 하나" 같은 쏠림이 눈에 띈다. */}
                        {showInsights && (sectorMix || strategyMix) && (
                            <div className={cn(styles.panelSurface, "m-3 px-3.5 py-3")}>
                                <div className="flex items-baseline justify-between gap-2 mb-2">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t("distribution")}</span>
                                    <span className="text-xs font-mono text-neutral-400 tabular-nums shrink-0">{t("count", { count: accessibleList.length })}</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {sectorMix && <MixRow label={t("sector")} mix={sectorMix} />}
                                    {strategyMix && <MixRow label={t("strategy")} mix={strategyMix} strategy />}
                                </div>
                                {sectorMix && sectorMix.top3Pct >= 60 && (
                                    <p className="mt-2.5 pt-2.5 border-t border-neutral-100 dark:border-border-subtle-dark text-xs leading-relaxed text-[#b8762e] dark:text-[#d9a05a] break-keep">
                                        {t("sectorConcentration", { names: sectorMix.topNames.join(" · "), percent: sectorMix.top3Pct.toFixed(0) })}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* 검색 조건과 결과 표현을 분리해, 목록을 훑으면서 보기/묶기를 바꿀 수 있게 한다. */}
                        <div className={styles.resultsHeading}>
                            <h2 className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white">
                                {showLikedOnly ? t("watchlistLabel") : t("results")} <span className="font-mono tabular-nums text-brand-ink">{t("count", { count: filteredList.length })}</span>
                            </h2>
                            {etfCreationMode && <button type="button" onClick={clearStockSelection} className={styles.actionQuiet}>선택 취소</button>}
                            <button
                                onClick={() => setShowInsights(v => !v)}
                                aria-expanded={showInsights}
                                className={cn(styles.actionQuiet, "ml-auto")}
                            >
                                {showInsights ? t("hideInsights") : t("insights")}
                            </button>
                        </div>
                        {compareMode && <div aria-label={etfCreationMode ? "ETF 종목 선택 현황" : "비교 선택 현황"} className={cn(styles.panelSurface, "m-3 p-3 text-sm")}>
                            <p role="status">{etfCreationMode ? "선택한 종목" : "목록에서 비교할 종목을 선택하세요."} {compareTickers.length}/{compareLimit}개</p>
                            {!etfCreationMode && etfSelectionError && <p role="alert" className="text-rose-700 dark:text-rose-300">{etfSelectionError}</p>}
                            <div className="mt-2 flex flex-wrap gap-2">{compareTickers.map(ticker => <button key={ticker} type="button" onClick={() => toggleComparison(ticker)} className={styles.action} aria-label={`${ticker} 선택 해제`}>
                                {stockName({ ticker, name: filteredList.find((item: any) => item.ticker === ticker)?.name ?? ticker })} ×
                            </button>)}</div>
                        </div>}

                        {/* 지표 설명과 산점도는 필요할 때만 펼친다 — 목록을 훑는 흐름을 막지 않는다. */}
                        {showInsights && <>
                            <TermStrip />
                            <ResultSummary list={accessibleList} />
                        </>}

                        <div className={styles.resultToolbar}>
                            <Tabs.List aria-label={t("resultView")} className={styles.viewTabs}>
                                {([['valuation', 'valuationView', 'valuationViewTip'], ['table', 'list', 'listTip'], ['ratio', 'ratio', 'ratioTip']] as const).map(([id, label, tip]) => (
                                    <Tabs.Trigger key={id} value={id} title={t(tip)} className={styles.tab}>
                                        {t(label)}
                                    </Tabs.Trigger>
                                ))}
                            </Tabs.List>
                            <label className="relative flex min-w-0 items-center text-neutral-700 dark:text-neutral-200">
                                <span className="sr-only">{t("group")}</span>
                                <select
                                    value={groupMode}
                                    onChange={event => setGroupMode(event.target.value as GroupMode)}
                                    className="min-h-11 min-w-0 w-full appearance-none rounded bg-transparent py-1 pl-2 pr-6 text-base font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-ink"
                                >
                                    <option value="none">{t("noGroup")}</option>
                                    <option value="sector" disabled={!hasSectorData}>{t("bySector")}</option>
                                    <option value="strategy">{t("byStrategy")}</option>
                                </select>
                                <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-1.5" />
                            </label>
                        </div>
                        <Tabs.Content value={viewMode} className={styles.resultPanel}>
                        {viewMode !== 'table' ? (
                            <>
                                {viewMode === 'valuation' && <div className="px-3 pb-1"><WatchlistPriceLegend /></div>}
                                {groups ? (
                                    <div className="bg-white dark:bg-surface-dark-card rounded-lg border border-neutral-200 dark:border-border-subtle-dark overflow-hidden">
                                        <GroupedResults {...groupedProps} bodyClassName={styles.stockGrid}
                                            renderRow={(item: any) => (
                                                <ChartRow isUs={country === "US"} key={item.ticker} item={item} displayName={stockName(item)} actions={stockActions} isLiked={likedTickers.has(watchTickerFor(item.ticker, item.name))} onToggleLike={handleToggleLike} comparison={comparisonFor(item.ticker)} />
                                            )} />
                                    </div>
                                ) : (
                                    <div className={styles.stockGrid}>
                                        {visibleList.map((item: any) => (
                                            <ChartRow isUs={country === "US"} key={item.ticker} item={item} displayName={stockName(item)} actions={stockActions} isLiked={likedTickers.has(watchTickerFor(item.ticker, item.name))} onToggleLike={handleToggleLike} comparison={comparisonFor(item.ticker)} />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                        <div className="bg-white dark:bg-surface-dark-card overflow-x-auto">
                            <div className="min-w-[17rem]">
                                <div className={cn("grid gap-0.5 min-[360px]:gap-1 lg:gap-4 items-center px-2 sm:px-4 sm:py-2.5 lg:px-6 lg:py-1 bg-surface-canvas dark:bg-surface-dark border-b border-neutral-200 dark:border-border-subtle-dark", TABLE_COLUMNS)}>
                                    <SortableHeader label={t("stockName")} sortKey="ticker" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} />
                                    <div className="hidden lg:block text-xs font-bold text-neutral-400 uppercase tracking-wider">{t("strategy")}</div>
                                    <SortableHeader label="NCAV" sortKey="ncav_ratio" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "ncav_ratio" in metricHighlight} />
                                    <SortableHeader label="PBR" sortKey="pbr" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "pbr" in metricHighlight} />
                                    <SortableHeader label="PER" sortKey="per" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "per" in metricHighlight} />
                                    <div className="hidden lg:block"><SortableHeader label="ROE" sortKey="roe" currentKey={sortKey} order={sortOrder} onToggle={toggleSort} relevant={!!metricHighlight && "roe" in metricHighlight} title={ROE_BASIS_HINT} /></div>
                                    <div />
                                </div>
                                {groups ? (
                                    <GroupedResults {...groupedProps} bodyClassName=""
                                        renderRow={(item: any) => (
                                            <TableRow key={item.ticker} item={item} displayName={stockName(item)} actions={stockActions} isLiked={likedTickers.has(watchTickerFor(item.ticker, item.name))} onToggleLike={handleToggleLike} highlight={metricHighlight} comparison={comparisonFor(item.ticker)} />
                                        )}
                                    />
                                ) : (
                                    <div>
                                        {visibleList.map((item: any) => (
                                            <TableRow key={item.ticker} item={item} displayName={stockName(item)} actions={stockActions} isLiked={likedTickers.has(watchTickerFor(item.ticker, item.name))} onToggleLike={handleToggleLike} highlight={metricHighlight} comparison={comparisonFor(item.ticker)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        )}

                        </Tabs.Content>

                        {previewCapped && (
                            <div className={cn(styles.panelSurface, "m-3 p-5 text-center")}>
                                <Lock size={18} className="mx-auto mb-3 text-neutral-400" />
                                <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                                    {t("moreStocks", { count: matchedTotal - PREVIEW_SIZE })}
                                </p>
                                <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                                    {t("signInHint")}
                                </p>
                                <button
                                    onClick={requireLogin}
                                    className={cn(styles.actionPrimary, "mt-4")}
                                >
                                    {t("signInMore")}
                                </button>
                            </div>
                        )}

                        {hasMore && (
                            <div className="flex justify-center p-3">
                                <button
                                    onClick={() => setDisplayCount(c => c + DAILY_PAGE_SIZE)}
                                    className={styles.action}
                                >
                                    더 보기 ({filteredList.length - displayCount}개 남음)
                                </button>
                            </div>
                        )}
                    </Tabs.Root>
                    </>
                )}
                {!etfCreationMode && compareTickers.length > 0 && (
                    <div aria-label="선택한 종목 비교" role="group" className={cn(styles.panelSurface, "sticky bottom-[var(--mobile-bottom-inset)] z-30 mt-3 flex flex-wrap items-center justify-end gap-2 p-2 md:bottom-4")}>
                        <button type="button" onClick={clearStockSelection} className={styles.action}>선택 취소</button>
                        {canAddEtfHoldings && <button type="button" onClick={addSelectionToEtf} className={styles.action}>ETF에 담기</button>}
                        <button type="button" className={styles.actionPrimary} onClick={() => {
                            router.push(comparisonHref(country, compareTickers, scanDate || new Date().toLocaleDateString('sv-SE'), crypto.randomUUID()));
                        }}>
                            {compareTickers.length}종목 비교하기
                        </button>
                    </div>
                )}
            </div>
            {country === 'KR' && <p className="mt-6 text-xs leading-relaxed text-neutral-500">{analysis.rich("krSource", { source: text => <a href="https://opendart.fss.or.kr/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{text}</a> })}</p>}
            {isLoggedIn && filterMethod === 'manual' && <div className="service-container"><FactorWorkbench appearance={{ panel: cn(styles.panelSurface, styles.factorPanel), action: styles.action, primary: styles.actionPrimary, input: styles.factorInput }} items={ncavDailyList.country === country ? filteredList : []} scanDate={ncavDailyList.country === country ? ncavDailyList.scanDate : null} country={country} isAdmin={isAdmin} availableDates={availableDates} /></div>}
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
                <Loader2 className="animate-spin text-brand-ink" size={24} />
            </div>
        }>
            <ScreenerContent />
        </Suspense>
    );
}
