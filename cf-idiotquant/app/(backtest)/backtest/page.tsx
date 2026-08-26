"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
    selectNcavDailyDates,
    reqGetNcavDailyDates,
} from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
    getScanDailyList,
    getScanDailyByTicker,
    getScanDailyAll,
    getPortfolioSimulation,
} from "@/lib/features/algorithmTrade/algorithmTradeAPI";
import { cn } from "@/lib/utils";
import { safeNum } from "@/lib/utils/numbers";
import { STRATEGY_LABEL, STRATEGY_BADGE, STRATEGY_PRESETS_CLIENT, MKTCAP_PRESETS } from "@/lib/constants/strategies";
import type { StrategyPreset } from "@/lib/constants/strategies";
import {
    parseStrategies, resolveAllStrategies, getDayKor, fmtDate,
    fillDateGaps, calcReturn, recomputePortfolioWithFilter, augmentPortfolioResult,
    type PortfolioPoint, type PortfolioSummary, type TickerSeries,
    type PortfolioResult, type DailyItem,
} from "./calc";
import { Loader2, History, ChevronRight, TrendingUp, SlidersHorizontal, Info, X } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis,
    Tooltip as RTooltip, ResponsiveContainer, Cell,
    AreaChart, Area, LineChart, Line, ComposedChart, CartesianGrid,
    ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'name' | 'ncav_ratio' | 'last_price' | 'return_pct' | 'pbr' | 'per';
type SortOrder = 'asc' | 'desc';

// ─── Constants ────────────────────────────────────────────────────────────────


// 각 뷰 탭에 대한 사용 설명
type ViewTabId = 'history' | 'portfolio' | 'stocks';
const TAB_HELP: Record<ViewTabId, { title: string; desc: string }> = {
    history: {
        title: '히스토리 — 일별 후보 수 추이',
        desc: '날짜별로 위 필터 바 조건을 통과한 종목 수를 막대로 보여줍니다. 막대를 클릭하면 그 날을 기준일로 잡고, 아래 요약 카드(후보 수·평균 NCAV·평균 PBR·평균 수익률)가 함께 갱신됩니다. 각 날짜 데이터는 탭 진입 시 분리 로드되며, 로딩 중인 날짜는 잠정 집계로 표시됩니다.',
    },
    portfolio: {
        title: '포트폴리오 — 균등 매수 시뮬레이션 + 종목별 스냅샷',
        desc: '선택한 기준일에 후보 종목을 동일 금액으로 매수했다고 가정한 누적 수익률 추이입니다. 이후 스캔 데이터가 쌓이면 시계열 차트로, 데이터가 부족하면 현재가 기준 스냅샷으로 자동 대체됩니다. 차트 아래에 진입가 대비 종목별 수익률 스냅샷도 함께 표시됩니다.',
    },
    stocks: {
        title: '종목 목록 — 후보 상세 테이블',
        desc: '기준일 후보 종목을 표로 보여줍니다. 헤더를 클릭해 정렬하고, 행을 클릭하면 30일 주가·수익률 차트가 펼쳐집니다. 필터 바 조건이 테이블에 즉시 반영됩니다.',
    },
};



// ─── SortableHeader ───────────────────────────────────────────────────────────

function SortTh({ label, sortKey: key, current, order, onToggle }: {
    label: string; sortKey: SortKey; current: SortKey; order: SortOrder;
    onToggle: (k: SortKey) => void;
}) {
    const isActive = current === key;
    return (
        <button
            onClick={() => onToggle(key)}
            className={cn(
                "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                isActive
                    ? "text-[#16a34a] dark:text-[#16a34a]"
                    : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            )}
        >
            {label}
            <span className="text-[9px] font-mono">{isActive ? (order === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
    );
}

// ─── DrillDown Panel ──────────────────────────────────────────────────────────

function DrillDown({ name, ticker, stockHistory, loading, onNavigate, entryDate, entryPrice, entryMarketCap, splitAdjusted, currentLstnMap }: {
    name: string; ticker: string;
    stockHistory: DailyItem[];
    loading: boolean;
    onNavigate: () => void;
    entryDate: string | null;
    entryPrice: number;
    entryMarketCap?: number;
    splitAdjusted: boolean;
    currentLstnMap: Map<string, number>;
}) {
    const priceChartData = useMemo(() => {
        const raw = stockHistory.map(d => ({ date: d.scan_date, price: d.last_price }));
        return fillDateGaps(raw, ['price']).map(d => ({ ...d, date: fmtDate(d.date) }));
    }, [stockHistory]);

    const returnChartData = useMemo(() => {
        if (!entryDate || entryPrice <= 0) return [];
        const raw = stockHistory
            .filter(d => d.scan_date >= entryDate)
            .map(d => {
                let return_pct: number;
                if (splitAdjusted && entryMarketCap && entryMarketCap > 0 && d.lstn_stcn && d.lstn_stcn > 0) {
                    // entryMarketCap은 억원, last_price는 원 → ×100_000_000 변환
                    return_pct = Math.round((d.last_price * d.lstn_stcn / (entryMarketCap * 100_000_000) - 1) * 10000) / 100;
                } else {
                    return_pct = Math.round((d.last_price / entryPrice - 1) * 10000) / 100;
                }
                return { date: d.scan_date, return_pct };
            });
        return fillDateGaps(raw, ['return_pct']).map(d => ({ ...d, date: fmtDate(d.date) }));
    }, [stockHistory, entryDate, entryPrice, entryMarketCap, splitAdjusted]);

    const currentReturn = returnChartData.at(-1)?.return_pct ?? 0;
    const returnColor = currentReturn >= 0 ? "#16a34a" : "#ef4444";
    const returnGradId = `retGrad_${ticker}`;

    return (
        <div className="bg-[#f0fdf4]/40 dark:bg-[#052e16]/10 border-b border-neutral-100 dark:border-border-subtle-dark px-4 sm:px-6 py-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                        {name}
                        <span className="text-xs font-mono text-neutral-400 ml-1.5">({ticker})</span>
                    </p>
                    {returnChartData.length > 0 && (
                        <span className={cn(
                            "text-sm font-black font-mono tabular-nums",
                            currentReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                        )}>
                            {currentReturn >= 0 ? "+" : ""}{currentReturn.toFixed(2)}%
                        </span>
                    )}
                </div>
                <button
                    onClick={onNavigate}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold transition-colors"
                >
                    상세 분석
                    <ChevronRight size={11} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-[#16a34a]/40" />
                </div>
            ) : priceChartData.length === 0 ? (
                <p className="text-center text-xs text-neutral-400 py-6">이력 데이터가 없습니다.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 주가 추이 */}
                    <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">주가 추이 (30일)</p>
                        <ResponsiveContainer width="100%" height={140}>
                            <AreaChart data={priceChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={44} />
                                <RTooltip
                                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                    formatter={(v: unknown) => [Number(v).toLocaleString(), '주가']}
                                />
                                <Area type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2} fill="url(#priceGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* 수익률 추이 (기준일 대비) */}
                    <div>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                            수익률 추이
                            {entryDate && <span className="ml-1 font-normal normal-case text-neutral-300">(기준일 {fmtDate(entryDate)} 대비)</span>}
                        </p>
                        {returnChartData.length === 0 ? (
                            <p className="text-center text-xs text-neutral-400 py-10">기준일 이후 데이터가 없습니다.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={140}>
                                <AreaChart data={returnChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={returnGradId} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={returnColor} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={returnColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis
                                        tick={{ fontSize: 9, fill: '#9ca3af' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={44}
                                        tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                                    />
                                    <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2" />
                                    <RTooltip
                                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                                        formatter={(v: unknown) => {
                                            const n = Number(v);
                                            return [`${n >= 0 ? '+' : ''}${n.toFixed(2)}%`, '수익률'];
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="return_pct"
                                        stroke={returnColor}
                                        strokeWidth={2}
                                        fill={`url(#${returnGradId})`}
                                        dot={false}
                                        activeDot={{ r: 3, fill: returnColor }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Portfolio Overview Chart ─────────────────────────────────────────────────

function PortfolioOverviewChart({ result, loading, strategy, synthetic }: {
    result: PortfolioResult | null;
    loading: boolean;
    strategy: string;
    synthetic?: boolean;
}) {
    const chartData = useMemo(() => {
        const raw = (result?.time_series ?? []).map(d => ({
            date: d.date,
            pct: d.portfolio_pct,
            covered: d.covered,
            win_rate: d.covered > 0 ? Math.round((d.win_count / d.covered) * 100) : 0,
        }));
        const data = synthetic ? fillDateGaps(raw, ['pct', 'win_rate']) : raw;
        return data.map(d => ({ ...d, label: fmtDate(d.date) }));
    }, [result, synthetic]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 flex items-center justify-center h-40">
                <Loader2 size={20} className="animate-spin text-[#16a34a]/50" />
            </div>
        );
    }

    if (chartData.length === 0) return null;

    const strategyLabel: Record<string, string> = {
        ncav: 'NCAV', low_pbr: '저PBR', low_per: '저PER', s_rim: 'S-RIM', all: '전체',
    };

    const maxAbs = Math.max(...chartData.map(d => Math.abs(d.pct)), 0.1);

    return (
        <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-border-subtle-dark flex items-center gap-2">
                <p className="text-sm font-black text-neutral-900 dark:text-white">구간별 수익률</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a]">
                    {strategyLabel[strategy] ?? strategy}
                </span>
                <span className="text-[10px] text-neutral-400 ml-1">선택 기준일 → 해당 시점 누적 수익률</span>
            </div>
            <div className="px-5 pt-4 pb-3">
                <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chartData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                            domain={[-maxAbs * 1.2, maxAbs * 1.2]}
                            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                        />
                        <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2" />
                        <RTooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}
                            formatter={(v: unknown, _name: string, props: any) => {
                                const n = Number(v);
                                const p = props?.payload;
                                const estimatedTag = p?.estimated ? ' (추정)' : '';
                                if (p?.estimated) {
                                    return [
                                        `${n >= 0 ? '+' : ''}${n.toFixed(2)}%${estimatedTag}`,
                                        '포트폴리오 누적 수익률',
                                    ];
                                }
                                return [
                                    `${n >= 0 ? '+' : ''}${n.toFixed(2)}%  (${p?.covered}종목, 승률 ${p?.win_rate}%)`,
                                    '포트폴리오 누적 수익률',
                                ];
                            }}
                            labelFormatter={(label: string) => label}
                        />
                        <Bar dataKey="pct" radius={[3, 3, 0, 0]} maxBarSize={36}>
                            {chartData.map((entry) => (
                                <Cell
                                    key={entry.date}
                                    fill={entry.pct >= 0 ? '#4ade80' : '#fca5a5'}
                                    fillOpacity={(entry as any).estimated ? 0.35 : 1}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ─── Portfolio Simulation Chart ───────────────────────────────────────────────

function PortfolioChart({ result, loading, strategy }: {
    result: PortfolioResult | null;
    loading: boolean;
    strategy: string;
}) {
    const [showLines, setShowLines] = useState(false);

    const chartData = useMemo(() => {
        const rawBase = (result?.time_series ?? []).map(p => ({
            date: p.date,
            pct: p.portfolio_pct,
            covered: p.covered,
            win: p.win_count,
        }));
        const interp = fillDateGaps(rawBase, ['pct', 'covered', 'win']);
        const tickerDateMap: Record<string, Record<string, number>> = {};
        if (showLines && result?.ticker_series?.length) {
            for (const ts of result.ticker_series) {
                tickerDateMap[ts.ticker] = {};
                for (const d of ts.data) tickerDateMap[ts.ticker][d.date] = d.pct;
            }
        }
        return interp.map(row => {
            const extra: Record<string, unknown> = {};
            if (showLines && result?.ticker_series?.length) {
                for (const ts of result.ticker_series!) {
                    const v = tickerDateMap[ts.ticker]?.[row.date];
                    if (v !== undefined) extra[`t_${ts.ticker}`] = v;
                }
            }
            return { label: fmtDate(row.date), date: row.date, pct: row.pct, covered: row.covered, win: row.win, estimated: row.estimated, ...extra };
        });
    }, [result, showLines]);

    const tickerLines = useMemo(() => {
        if (!showLines || !result?.ticker_series?.length) return [];
        return result.ticker_series.slice(0, 40);
    }, [result, showLines]);

    const current = result?.summary?.current_pct ?? 0;
    const isPositive = current >= 0;

    const lineColor = isPositive ? "#16a34a" : "#ef4444";
    const gradientId = "portfolioGrad";

    if (loading) {
        return (
            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 flex items-center justify-center h-48">
                <Loader2 size={22} className="animate-spin text-[#16a34a]/50" />
            </div>
        );
    }

    if (!result || result.candidate_count === 0) {
        return (
            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 flex items-center justify-center h-36">
                <p className="text-xs text-neutral-400">{result?.note ?? "포트폴리오 시뮬레이션 데이터가 없습니다."}</p>
            </div>
        );
    }

    const strategyLabel: Record<string, string> = {
        ncav: 'NCAV', low_pbr: '저PBR', low_per: '저PER', s_rim: 'S-RIM', all: '전체',
    };

    const hasTickerSeries = (result.ticker_series?.length ?? 0) > 0;

    return (
        <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-border-subtle-dark flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <TrendingUp size={15} className={isPositive ? "text-emerald-500" : "text-red-500"} />
                    <p className="text-sm font-black text-neutral-900 dark:text-white">포트폴리오 수익률 추이</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a]">
                        {strategyLabel[strategy] ?? strategy}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {hasTickerSeries && (
                        <button
                            onClick={() => setShowLines(v => !v)}
                            className={cn(
                                "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors",
                                showLines
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-neutral-200 dark:border-border-subtle-dark text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 dark:hover:border-emerald-600"
                            )}
                        >
                            종목별
                        </button>
                    )}
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">현재 수익률</p>
                        <p className={cn(
                            "text-lg font-black font-mono tabular-nums",
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                        )}>
                            {isPositive ? "+" : ""}{current.toFixed(2)}%
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">종목 수</p>
                        <p className="text-lg font-black font-mono tabular-nums">{result.candidate_count}</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="px-5 pt-4 pb-2">
                <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%"  stopColor={lineColor} stopOpacity={0.2} />
                                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            width={40}
                            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                        />
                        <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 2" />
                        <RTooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}
                            formatter={(v: unknown, name: string) => {
                                if (name === 'pct') {
                                    const num = Number(v);
                                    return [`${num >= 0 ? '+' : ''}${num.toFixed(2)}%`, '포트폴리오'];
                                }
                                if (name.startsWith('t_')) {
                                    const ticker = name.slice(2);
                                    const ts = result.ticker_series?.find(s => s.ticker === ticker);
                                    const num = Number(v);
                                    return [`${num >= 0 ? '+' : ''}${num.toFixed(2)}%`, ts?.name ?? ticker];
                                }
                                return [String(v), name];
                            }}
                        />
                        {tickerLines.map(ts => (
                            <Line
                                key={`t_${ts.ticker}`}
                                type="monotone"
                                dataKey={`t_${ts.ticker}`}
                                stroke={(ts.final_pct ?? 0) >= 0 ? "#4ade80" : "#f87171"}
                                strokeWidth={1}
                                strokeOpacity={0.45}
                                dot={false}
                                connectNulls
                                name={`t_${ts.ticker}`}
                                legendType="none"
                                isAnimationActive={false}
                            />
                        ))}
                        <Area
                            type="monotone"
                            dataKey="pct"
                            stroke={lineColor}
                            strokeWidth={2.5}
                            fill={`url(#${gradientId})`}
                            dot={false}
                            activeDot={{ r: 4, fill: lineColor }}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Summary row */}
            <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
                <div className="bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">기간</p>
                    <p className="text-xs font-black mt-0.5">{result.summary.days}일</p>
                </div>
                <div className="bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">승률</p>
                    <p className="text-xs font-black mt-0.5">
                        {result.time_series.length > 0
                            ? `${Math.round((result.time_series.at(-1)!.win_count / result.time_series.at(-1)!.covered) * 100)}%`
                            : '—'}
                    </p>
                </div>
                {result.summary.top_gainer && (
                    <div className="bg-[#f0fdf4] dark:bg-[#052e16]/20 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">최고 수익</p>
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                            {result.summary.top_gainer.name}
                        </p>
                        <p className="text-[10px] font-mono font-black text-emerald-600 dark:text-emerald-400">
                            +{result.summary.top_gainer.pct.toFixed(1)}%
                        </p>
                    </div>
                )}
                {result.summary.top_loser && (
                    <div className="bg-[#fef2f2] dark:bg-red-950/10 rounded-xl p-3 text-center">
                        <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider">최저 수익</p>
                        <p className="text-[10px] font-black text-red-500 dark:text-red-400 mt-0.5 truncate">
                            {result.summary.top_loser.name}
                        </p>
                        <p className="text-[10px] font-mono font-black text-red-500 dark:text-red-400">
                            {result.summary.top_loser.pct.toFixed(1)}%
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Portfolio Snapshot Chart (이후 날짜 데이터 없을 때 대체 표시) ────────────

interface SnapshotEntry {
    ticker: string;
    label: string;
    fullName: string;
    pct: number;
}

function PortfolioSnapshotChart({ result, loading, strategy, currentPriceMap, selectedDate, fallbackCandidates, currentLstnMap, splitAdjusted, filteredTickers }: {
    result: PortfolioResult | null;
    loading: boolean;
    strategy: string;
    currentPriceMap: Map<string, number>;
    selectedDate: string | null;
    fallbackCandidates: { ticker: string; name: string; start_price: number; start_market_cap?: number }[];
    currentLstnMap: Map<string, number>;
    splitAdjusted: boolean;
    filteredTickers: Set<string>;
}) {
    // portfolioResult.candidates 가 있으면 filteredTickers 로 교차 필터, 없으면 fallbackCandidates(이미 filteredList 기반)
    const effectiveCandidates = useMemo(() => {
        if ((result?.candidates?.length ?? 0) > 0) {
            // 필터가 전체를 포함하는 경우(no-op) vs 일부를 제외하는 경우 모두 처리
            return result!.candidates.filter(c => filteredTickers.has(c.ticker));
        }
        return fallbackCandidates;
    }, [result, fallbackCandidates, filteredTickers]);

    // 전체 후보 수는 원본 API 값 우선, fallback 시 filteredList 기준
    const effectiveCount = result?.candidate_count ?? effectiveCandidates.length;

    const snapshotData: SnapshotEntry[] = useMemo(() => {
        if (!effectiveCandidates.length) return [];
        return effectiveCandidates
            .map(c => {
                const cur = currentPriceMap.get(c.ticker);
                if (!cur || c.start_price <= 0) return null;
                const pct = Math.round(calcReturn(c.start_price, c.start_market_cap, c.ticker, cur, splitAdjusted, currentLstnMap) * 100) / 100;
                return {
                    ticker: c.ticker,
                    label: c.name.length > 7 ? c.name.slice(0, 6) + '…' : c.name,
                    fullName: c.name,
                    pct,
                };
            })
            .filter((x): x is SnapshotEntry => x !== null)
            .sort((a, b) => b.pct - a.pct);
    }, [effectiveCandidates, currentPriceMap, splitAdjusted, currentLstnMap]);

    const strategyLabel: Record<string, string> = {
        ncav: 'NCAV', low_pbr: '저PBR', low_per: '저PER', s_rim: 'S-RIM', all: '전체',
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 flex items-center justify-center h-48">
                <Loader2 size={22} className="animate-spin text-[#16a34a]/50" />
            </div>
        );
    }

    if (effectiveCandidates.length === 0) {
        return (
            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-6 flex flex-col items-center justify-center gap-2 text-center">
                <Info size={20} className="text-neutral-300" />
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">표시할 후보 종목이 없습니다</p>
                <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed">
                    {result?.note ?? "선택한 기준일에 조건을 충족한 종목이 없거나, 필터가 모든 종목을 제외했습니다. 필터를 완화하거나 다른 기준일을 선택해 보세요."}
                </p>
            </div>
        );
    }

    if (snapshotData.length === 0) {
        return (
            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-[#16a34a]/50 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                        {effectiveCount}개 후보 — 최근 스캔 가격 로딩 중
                    </p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">이후 스캔 사이클 완료 시 수익률이 표시됩니다</p>
                </div>
            </div>
        );
    }

    const avgPct = snapshotData.reduce((s, d) => s + d.pct, 0) / snapshotData.length;
    const winCount = snapshotData.filter(d => d.pct >= 0).length;
    const isPositive = avgPct >= 0;
    const maxAbs = Math.max(...snapshotData.map(d => Math.abs(d.pct)), 0.1);
    const chartHeight = Math.max(180, snapshotData.length * 24);

    return (
        <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-border-subtle-dark flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <TrendingUp size={15} className={isPositive ? "text-emerald-500" : "text-red-500"} />
                    <p className="text-sm font-black text-neutral-900 dark:text-white">종목별 수익률 스냅샷</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a]">
                        {strategyLabel[strategy] ?? strategy}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">포트폴리오 평균</p>
                        <p className={cn(
                            "text-lg font-black font-mono tabular-nums",
                            isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                        )}>
                            {isPositive ? "+" : ""}{avgPct.toFixed(2)}%
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">커버</p>
                        <p className="text-lg font-black font-mono tabular-nums">
                            {snapshotData.length}
                            <span className="text-xs text-neutral-400">/{effectiveCount}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub-note */}
            <div className="px-5 pt-3">
                <p className="text-[10px] text-neutral-400">
                    기준일 {selectedDate ? fmtDate(selectedDate) : '—'} 진입가 대비 최근 스캔가 기준 · {winCount}/{snapshotData.length} 수익
                </p>
            </div>

            {/* Horizontal bar chart */}
            <div className="px-5 pt-2 pb-4">
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={snapshotData} layout="vertical" margin={{ top: 4, right: 48, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[-maxAbs * 1.2, maxAbs * 1.2]}
                            tickFormatter={(v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                        />
                        <YAxis
                            type="category"
                            dataKey="label"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={false}
                            tickLine={false}
                            width={60}
                        />
                        <ReferenceLine x={0} stroke="#d1d5db" strokeDasharray="4 2" />
                        <RTooltip
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}
                            formatter={(v: unknown, _name: string, props: any) => {
                                const n = Number(v);
                                return [`${n >= 0 ? '+' : ''}${n.toFixed(2)}%`, props?.payload?.fullName ?? ''];
                            }}
                            labelFormatter={() => ''}
                        />
                        <Bar
                            dataKey="pct"
                            radius={[0, 3, 3, 0]}
                            maxBarSize={18}
                            label={{ position: 'right', formatter: (v: unknown) => { const n = Number(v); return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }, fontSize: 9, fill: '#9ca3af' }}
                        >
                            {snapshotData.map(entry => (
                                <Cell key={entry.ticker} fill={entry.pct >= 0 ? '#4ade80' : '#fca5a5'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Summary row */}
            <div className="px-5 pb-4 grid grid-cols-3 gap-2">
                <div className="bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">후보 수</p>
                    <p className="text-xs font-black mt-0.5">{effectiveCount}개</p>
                </div>
                <div className="bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">커버</p>
                    <p className="text-xs font-black mt-0.5">{snapshotData.length}개 ({Math.round(snapshotData.length / effectiveCount * 100)}%)</p>
                </div>
                <div className="bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">승률</p>
                    <p className={cn(
                        "text-xs font-black mt-0.5",
                        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                    )}>
                        {Math.round(winCount / snapshotData.length * 100)}%
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─── Main content ─────────────────────────────────────────────────────────────

function BacktestContent() {
    const dispatch    = useAppDispatch();
    const router      = useRouter();
    const datesState  = useAppSelector(selectNcavDailyDates);

    const [selectedDate,        setSelectedDate]        = useState<string | null>(null);
    const [historicalList,      setHistoricalList]      = useState<DailyItem[]>([]);
    const [currentPriceMap,     setCurrentPriceMap]     = useState<Map<string, number>>(new Map());
    const [currentLstnMap,      setCurrentLstnMap]      = useState<Map<string, number>>(new Map());
    const [splitAdjusted,       setSplitAdjusted]       = useState(false);
    const [viewTab,             setViewTab]             = useState<ViewTabId>('history');
    const [selectedStock,       setSelectedStock]       = useState<string | null>(null);
    const [stockHistory,        setStockHistory]        = useState<DailyItem[]>([]);
    const [sortKey,             setSortKey]             = useState<SortKey>('ncav_ratio');
    const [sortOrder,           setSortOrder]           = useState<SortOrder>('desc');
    const [searchQuery,         setSearchQuery]         = useState('');
    const [filterNcav,          setFilterNcav]          = useState<'all' | '0.5' | '0.7' | '1.0'>('all');
    const [filterReturn,        setFilterReturn]        = useState<'all' | 'win' | 'loss'>('all');
    const [filterPbr,           setFilterPbr]           = useState<'all' | '0.3' | '0.5' | '0.7'>('all');
    const [filterPer,           setFilterPer]           = useState<'all' | '5' | '10' | '15'>('all');
    const [filterStrategies,    setFilterStrategies]    = useState<Set<string>>(new Set());
    const [filterStrategyMode,  setFilterStrategyMode]  = useState<'OR' | 'AND'>('OR');
    const [minMarketCap,        setMinMarketCap]        = useState(0);
    const [excludeHoldings,     setExcludeHoldings]     = useState(false);
    const [excludeDeficit,      setExcludeDeficit]      = useState(false);
    const [filterOpen,          setFilterOpen]          = useState(false);
    const [loadingList,          setLoadingList]         = useState(false);
    const [loadingCurrentPrices, setLoadingCurrentPrices]= useState(false);
    const [loadingStock,         setLoadingStock]        = useState(false);
    const [portfolioResult,      setPortfolioResult]     = useState<PortfolioResult | null>(null);
    const [loadingPortfolio,     setLoadingPortfolio]    = useState(false);

    const dateInitialized      = useRef(false);
    const pricesLoaded         = useRef(false);
    // 포트폴리오 시뮬레이션을 마지막으로 로드한 기준일 (탭 전환 시 중복 fetch 방지)
    const portfolioLoadedDate  = useRef<string | null>(null);
    // 날짜별 전체 종목 리스트 캐시 (히스토리 탭 필터 집계용, 분리 지연 로드)
    const dailyListCache       = useRef<Map<string, DailyItem[]>>(new Map());
    // 히스토리 탭 날짜별 리스트 로딩 진행 상태 (캐시된 날짜 수)
    const [historyLoadedCount, setHistoryLoadedCount] = useState(0);

    // 1. Load date list on mount
    useEffect(() => {
        dispatch(reqGetNcavDailyDates());
    }, [dispatch]);

    // 2. Load current prices once (latest scan)
    useEffect(() => {
        if (pricesLoaded.current) return;
        pricesLoaded.current = true;
        setLoadingCurrentPrices(true);
        getScanDailyAll('latest')
            .then((res: { data?: { ticker: string; last_price: number; lstn_stcn?: number }[] }) => {
                const priceMap = new Map<string, number>();
                const lstnMap  = new Map<string, number>();
                (res?.data ?? []).forEach(item => {
                    if (item.ticker && item.last_price) priceMap.set(item.ticker, safeNum(item.last_price));
                    if (item.ticker && item.lstn_stcn)  lstnMap.set(item.ticker, safeNum(item.lstn_stcn));
                });
                setCurrentPriceMap(priceMap);
                setCurrentLstnMap(lstnMap);
            })
            .catch(() => {})
            .finally(() => setLoadingCurrentPrices(false));
    }, []);

    // 3. Initialize selectedDate once dates are loaded
    useEffect(() => {
        if (dateInitialized.current) return;
        if (datesState.state === 'fulfilled' && datesState.dates.length > 0) {
            dateInitialized.current = true;
            setSelectedDate(datesState.dates[0].scan_date);
        }
    }, [datesState.state, datesState.dates]);

    // 4. Fetch historical list when date changes (always fetch all strategies)
    useEffect(() => {
        if (!selectedDate) return;
        setLoadingList(true);
        setSelectedStock(null);
        // 기준일 변경 → 포트폴리오 결과 무효화 (탭 활성 시 새 기준일로 재로드)
        setPortfolioResult(null);
        portfolioLoadedDate.current = null;
        getScanDailyList(selectedDate, 'all')
            .then((res: { data?: Record<string, unknown>[] }) => {
                const raw = res?.data ?? [];
                const list: DailyItem[] = raw.map(item => ({
                    ...(item as Omit<DailyItem, 'strategies'>),
                    strategies: parseStrategies(item.strategies),
                }));
                setHistoricalList(list);
                // 히스토리 탭 필터 집계용 캐시에 기준일 리스트 시드
                if (!dailyListCache.current.has(selectedDate)) {
                    dailyListCache.current.set(selectedDate, list);
                    setHistoryLoadedCount(dailyListCache.current.size);
                }
            })
            .catch(() => setHistoricalList([]))
            .finally(() => setLoadingList(false));
    }, [selectedDate]);

    // 5. Fetch individual stock history on drill-down
    useEffect(() => {
        if (!selectedStock) { setStockHistory([]); return; }
        setStockHistory([]);
        setLoadingStock(true);
        getScanDailyByTicker(selectedStock, 30)
            .then((res: { data?: Record<string, unknown>[] }) => {
                const raw = (res?.data ?? []).map(item => ({
                    ...(item as Omit<DailyItem, 'strategies'>),
                    strategies: parseStrategies(item.strategies),
                }));
                raw.sort((a, b) => a.scan_date.localeCompare(b.scan_date));
                setStockHistory(raw);
            })
            .catch(() => {})
            .finally(() => setLoadingStock(false));
    }, [selectedStock]);

    // 6. Fetch portfolio simulation — 포트폴리오 탭 활성 시에만 (분리 지연 로드)
    //    전략 구분 없이 전체(all) 후보를 불러오고, 공통 필터는 클라이언트에서 적용한다.
    useEffect(() => {
        if (!selectedDate || viewTab !== 'portfolio') return;
        // 같은 기준일을 이미 로드했으면 재fetch 생략
        if (portfolioLoadedDate.current === selectedDate && portfolioResult) return;
        setLoadingPortfolio(true);
        getPortfolioSimulation(selectedDate, 'all')
            .then((res: { success?: boolean; data?: PortfolioResult }) => {
                if (res?.success && res.data) {
                    setPortfolioResult(res.data);
                    portfolioLoadedDate.current = selectedDate;
                }
            })
            .catch(() => {})
            .finally(() => setLoadingPortfolio(false));
    }, [selectedDate, viewTab]); // eslint-disable-line react-hooks/exhaustive-deps

    const isLatestDate = selectedDate !== null
        && datesState.dates.length > 0
        && selectedDate === datesState.dates[0].scan_date;

    // 단일 종목이 현재 공통 필터를 통과하는지 판정 (filteredList + 히스토리 날짜별 집계 공용).
    // applyReturn: 수익률 필터 적용 여부 (최신일은 수익률 ~0 이라 제외).
    const matchesFilters = useCallback((item: DailyItem, applyReturn: boolean): boolean => {
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            if (!(item.name.toLowerCase().includes(q) || item.ticker.includes(q))) return false;
        }
        if (filterStrategies.size > 0) {
            const ids = Array.from(filterStrategies);
            const test = (id: string) => {
                const preset = STRATEGY_PRESETS_CLIENT.find(p => p.id === id);
                return preset?.clientFilter ? preset.clientFilter(item) : false;
            };
            const ok = filterStrategyMode === 'AND' ? ids.every(test) : ids.some(test);
            if (!ok) return false;
        }
        if (minMarketCap > 0 && safeNum(item.market_cap) < minMarketCap) return false;
        if (excludeHoldings && item.name.includes('홀딩스')) return false;
        if (excludeDeficit && !(safeNum(item.eps) > 0)) return false;
        if (filterNcav !== 'all' && !(safeNum(item.ncav_ratio) >= parseFloat(filterNcav))) return false;
        if (applyReturn && filterReturn !== 'all') {
            const cur = currentPriceMap.get(item.ticker);
            if (!cur || item.last_price <= 0) return false;
            const ret = calcReturn(item.last_price, item.market_cap, item.ticker, cur, splitAdjusted, currentLstnMap);
            if (filterReturn === 'win' ? ret < 0 : ret >= 0) return false;
        }
        if (filterPbr !== 'all' && !(safeNum(item.pbr) > 0 && safeNum(item.pbr) <= parseFloat(filterPbr))) return false;
        if (filterPer !== 'all' && !(safeNum(item.per) > 0 && safeNum(item.per) <= parseFloat(filterPer))) return false;
        return true;
    }, [searchQuery, filterStrategies, filterStrategyMode, minMarketCap, excludeHoldings, excludeDeficit, filterNcav, filterReturn, filterPbr, filterPer, currentPriceMap, splitAdjusted, currentLstnMap]);

    // Bar chart data (chronological).
    // 날짜별 리스트가 캐시되면 공통 필터 통과 종목 수를, 아직 미도착이면 서버 집계 합계(임시)를 표시.
    const latestDateForChart = datesState.dates[0]?.scan_date;
    const chartData = useMemo(() =>
        [...datesState.dates].reverse().map(d => {
            const cached = dailyListCache.current.get(d.scan_date);
            const filteredCnt = cached
                ? cached.reduce((n, item) => n + (matchesFilters(item, d.scan_date !== latestDateForChart) ? 1 : 0), 0)
                : null;
            return {
                ...d,
                label: fmtDate(d.scan_date),
                total_cnt: filteredCnt ?? ((d.ncav_cnt ?? 0) + (d.low_pbr_cnt ?? 0) + (d.low_per_cnt ?? 0) + (d.s_rim_cnt ?? 0)),
                filtered: filteredCnt !== null,
            };
        }),
    // historyLoadedCount: 캐시 갱신 시 재계산 (ref 변경은 리렌더를 트리거하지 않으므로)
    [datesState.dates, matchesFilters, historyLoadedCount, latestDateForChart]);

    // 7. 히스토리 탭: 날짜별 전체 리스트를 지연 로드 (분리 로드 · 동시성 제한 · 캐시 재사용)
    useEffect(() => {
        if (viewTab !== 'history') return;
        const dates = datesState.dates;
        if (!dates.length) return;
        const missing = dates.map(d => d.scan_date).filter(dt => !dailyListCache.current.has(dt));
        if (!missing.length) return;

        let cancelled = false;
        let idx = 0;
        const CONCURRENCY = 4;

        const worker = async () => {
            while (!cancelled && idx < missing.length) {
                const dt = missing[idx++];
                try {
                    const res: { data?: Record<string, unknown>[] } = await getScanDailyList(dt, 'all');
                    if (cancelled) return;
                    const list: DailyItem[] = (res?.data ?? []).map(item => ({
                        ...(item as Omit<DailyItem, 'strategies'>),
                        strategies: parseStrategies(item.strategies),
                    }));
                    dailyListCache.current.set(dt, list);
                    setHistoryLoadedCount(dailyListCache.current.size);
                } catch {
                    // 실패한 날짜는 캐시하지 않음 → 서버 집계 합계로 임시 표시, 탭 재진입 시 재시도
                }
            }
        };
        Promise.all(Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker));

        return () => { cancelled = true; };
    }, [viewTab, datesState.dates]);

    // Filtered list — 모든 필터 조건 적용 (선택 기준일)
    const filteredList = useMemo(
        () => historicalList.filter(i => matchesFilters(i, !isLatestDate)),
        [historicalList, matchesFilters, isLatestDate]
    );

    // Fallback candidates — filteredList 기반으로 필터 조건 반영
    const fallbackCandidates = useMemo(() =>
        filteredList
            .filter(item => item.last_price > 0)
            .map(item => ({ ticker: item.ticker, name: item.name, start_price: item.last_price, start_market_cap: item.market_cap })),
    [filteredList]);

    // 필터 적용 ticker set (portfolioResult.candidates 교차 필터링에 사용)
    const filteredTickers = useMemo(() => new Set(filteredList.map(i => i.ticker)), [filteredList]);

    // Fetch prices for candidates missing from currentPriceMap (포트폴리오 탭 전용, 분리 지연 로드)
    useEffect(() => {
        if (viewTab !== 'portfolio') return;
        const candidates = (portfolioResult?.candidates?.length ?? 0) > 0
            ? portfolioResult!.candidates
            : fallbackCandidates;
        if (!candidates.length) return;
        const missing = candidates.filter(c => !currentPriceMap.has(c.ticker)).slice(0, 50);
        if (!missing.length) return;

        Promise.all(
            missing.map(c =>
                getScanDailyByTicker(c.ticker, 1)
                    .then((res: { data?: Record<string, unknown>[] }) => {
                        const price = safeNum((res?.data?.[0] as any)?.last_price);
                        return price > 0 ? [c.ticker, price] as [string, number] : null;
                    })
                    .catch(() => null)
            )
        ).then(results => {
            const newPrices = results.filter((r): r is [string, number] => r !== null);
            if (!newPrices.length) return;
            setCurrentPriceMap(prev => {
                const next = new Map(prev);
                for (const [t, p] of newPrices) next.set(t, p);
                return next;
            });
        });
    // currentPriceMap 제외: 가격 업데이트 후 무한 루프 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [portfolioResult, fallbackCandidates, viewTab]);

    // Sorted table rows
    const sortedList = useMemo(() => {
        const list = [...filteredList];
        list.sort((a, b) => {
            if (sortKey === 'name') {
                return sortOrder === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            }
            if (sortKey === 'return_pct') {
                const getPct = (item: DailyItem) => {
                    const cur = currentPriceMap.get(item.ticker);
                    if (!cur || item.last_price <= 0) return -Infinity;
                    return calcReturn(item.last_price, item.market_cap, item.ticker, cur, splitAdjusted, currentLstnMap);
                };
                const ra = getPct(a), rb = getPct(b);
                return sortOrder === 'asc' ? ra - rb : rb - ra;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const va = safeNum((a as any)[sortKey]);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const vb = safeNum((b as any)[sortKey]);
            return sortOrder === 'asc' ? va - vb : vb - va;
        });
        return list;
    }, [filteredList, sortKey, sortOrder, currentPriceMap, splitAdjusted, currentLstnMap]);

    const toggleSort = useCallback((key: SortKey) => {
        setSortKey(prev => {
            if (prev === key) { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); return key; }
            setSortOrder('desc');
            return key;
        });
    }, []);

    const toggleStrategy = useCallback((id: string) => {
        setFilterStrategies(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }, []);

    const strategyCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const preset of STRATEGY_PRESETS_CLIENT) {
            counts[preset.id] = preset.clientFilter
                ? historicalList.filter(item => preset.clientFilter!(item)).length
                : 0;
        }
        return counts;
    }, [historicalList]);

    // Summary stats
    const stats = useMemo(() => {
        if (filteredList.length === 0) return null;
        const cnt = filteredList.length;
        const avgNcav = filteredList.reduce((s, i) => s + safeNum(i.ncav_ratio), 0) / cnt;
        const hasPbr = filteredList.filter(i => safeNum(i.pbr) > 0);
        const hasPer = filteredList.filter(i => safeNum(i.per) > 0);
        const avgPbr = hasPbr.length ? hasPbr.reduce((s, i) => s + safeNum(i.pbr), 0) / hasPbr.length : 0;
        const avgPer = hasPer.length ? hasPer.reduce((s, i) => s + safeNum(i.per), 0) / hasPer.length : 0;
        const withReturn = filteredList.filter(i => currentPriceMap.has(i.ticker) && i.last_price > 0);
        const avgReturn = withReturn.length
            ? withReturn.reduce((s, i) => s + calcReturn(i.last_price, i.market_cap, i.ticker, currentPriceMap.get(i.ticker)!, splitAdjusted, currentLstnMap), 0) / withReturn.length
            : null;
        return { cnt, avgNcav, avgPbr, avgPer, avgReturn };
    }, [filteredList, currentPriceMap, splitAdjusted, currentLstnMap]);

    const formattedSelectedDate = selectedDate
        ? `${selectedDate.slice(0, 4)}.${selectedDate.slice(4, 6)}.${selectedDate.slice(6, 8)}(${getDayKor(selectedDate)})`
        : null;

    const latestScanDate = datesState.dates[0]?.scan_date;
    const formattedLatestDate = latestScanDate
        ? `${latestScanDate.slice(0, 4)}.${latestScanDate.slice(4, 6)}.${latestScanDate.slice(6, 8)}(${getDayKor(latestScanDate)})`
        : null;

    // 시계열 부족 시 현재가 기준 보간 결과 (항상 차트 표시용)
    const augmentedPortfolioResult = useMemo(() => {
        if (!selectedDate) return null;
        return augmentPortfolioResult(
            portfolioResult,
            fallbackCandidates,
            currentPriceMap,
            currentLstnMap,
            splitAdjusted,
            filteredTickers,
            selectedDate,
            latestScanDate ?? null,
        );
    // splitAdjusted 변경 시 수익률 재계산 필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [portfolioResult, fallbackCandidates, currentPriceMap, currentLstnMap, splitAdjusted, filteredTickers, selectedDate, latestScanDate]);

    const datesLoading = datesState.state === 'pending' || datesState.state === 'init';

    return (
        <div className="min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas text-neutral-900 dark:text-neutral-100">

            {/* ── Header ── */}
            <div className="bg-white dark:bg-surface-dark border-b border-neutral-200 dark:border-surface-dark-border border-t-[3px] border-t-[#16a34a]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <History size={18} className="text-[#16a34a]" strokeWidth={2.5} />
                                <h1 className="text-xl font-black tracking-tight">전략 히스토리</h1>
                                {formattedLatestDate && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#dcfce7] dark:bg-[#052e16]/40 text-[#16a34a]">
                                        최신 {formattedLatestDate}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-neutral-400 font-medium">
                                기준일 후보 수 추이 · 기준일 대비 현재 주가 수익률 · 개별 종목 30일 차트
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24">

                {/* Loading state */}
                {datesLoading && (
                    <div className="flex items-center justify-center py-24">
                        <Loader2 size={28} className="animate-spin text-[#16a34a]/50" />
                    </div>
                )}

                {/* Error state */}
                {datesState.state === 'rejected' && (
                    <div className="text-center py-16 text-sm text-neutral-400">
                        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
                    </div>
                )}

                {/* Empty state */}
                {!datesLoading && datesState.state === 'fulfilled' && datesState.dates.length === 0 && (
                    <div className="text-center py-16 text-sm text-neutral-400">
                        스캔 이력 데이터가 없습니다.
                    </div>
                )}

                {!datesLoading && datesState.dates.length > 0 && (
                    <>
                        {/* ── 공통 필터 바 (뷰 탭 위) ── */}
                        {!loadingList && historicalList.length > 0 && (() => {
                            const hasAnyFilter = filterStrategies.size > 0 || minMarketCap > 0 || excludeHoldings || excludeDeficit || searchQuery !== '' || filterNcav !== 'all' || filterReturn !== 'all' || filterPbr !== 'all' || filterPer !== 'all';
                            const resetAll = () => { setFilterStrategies(new Set()); setMinMarketCap(0); setExcludeHoldings(false); setExcludeDeficit(false); setSearchQuery(''); setFilterNcav('all'); setFilterReturn('all'); setFilterPbr('all'); setFilterPer('all'); };
                            return (
                            <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark shadow-sm overflow-hidden">
                                {/* ── 전략 필터 (전체 9종) ── */}
                                <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-neutral-100 dark:border-border-subtle-dark">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider shrink-0">전략</span>
                                        {STRATEGY_PRESETS_CLIENT.map(preset => {
                                            const isActive = filterStrategies.has(preset.id);
                                            const count = strategyCounts[preset.id] ?? 0;
                                            return (
                                                <button
                                                    key={preset.id}
                                                    onClick={() => toggleStrategy(preset.id)}
                                                    title={preset.hint}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all",
                                                        isActive
                                                            ? cn(STRATEGY_BADGE[preset.id], 'border-current')
                                                            : "border-neutral-200 dark:border-border-subtle-dark text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500 bg-white dark:bg-transparent"
                                                    )}
                                                >
                                                    {preset.label}
                                                    <span className="text-[9px] font-mono opacity-70">{count}</span>
                                                </button>
                                            );
                                        })}
                                        {filterStrategies.size >= 2 && (
                                            <div className="flex rounded-lg border border-neutral-200 dark:border-border-subtle-dark overflow-hidden">
                                                {(['OR', 'AND'] as const).map(mode => (
                                                    <button
                                                        key={mode}
                                                        onClick={() => setFilterStrategyMode(mode)}
                                                        className={cn(
                                                            "px-2 py-1 text-[10px] font-bold transition-colors",
                                                            filterStrategyMode === mode
                                                                ? "bg-[#16a34a] text-white"
                                                                : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
                                                        )}
                                                    >{mode}</button>
                                                ))}
                                            </div>
                                        )}
                                        {filterStrategies.size > 0 && (
                                            <button
                                                onClick={() => setFilterStrategies(new Set())}
                                                className="text-[10px] text-neutral-400 hover:text-[#16a34a] dark:hover:text-[#16a34a] ml-0.5"
                                            >초기화</button>
                                        )}
                                    </div>
                                </div>
                                {/* ── 수치 필터 바 ── */}
                                <div className="px-5 sm:px-6 py-3 flex flex-wrap items-center gap-2">
                                    {/* 검색 */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="종목명·티커"
                                            className="text-xs px-3 py-1.5 pr-6 rounded-lg border border-neutral-200 dark:border-border-subtle-dark bg-white dark:bg-surface-dark-canvas text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 w-28 focus:outline-none focus:ring-1 focus:ring-[#16a34a]/40"
                                        />
                                        {searchQuery && (
                                            <button onClick={() => setSearchQuery('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-sm leading-none">×</button>
                                        )}
                                    </div>

                                    {/* NCAV */}
                                    <div className="flex">
                                        {(['all', '0.5', '0.7', '1.0'] as const).map((v, idx) => (
                                            <button key={v} onClick={() => setFilterNcav(v)}
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-1 border-y border-r transition-colors whitespace-nowrap",
                                                    idx === 0 && "rounded-l-lg border-l", idx === 3 && "rounded-r-lg",
                                                    filterNcav === v ? "border-[#16a34a] bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] z-10 relative" : "border-neutral-200 dark:border-border-subtle-dark text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500"
                                                )}
                                            >{v === 'all' ? 'NCAV' : `≥${v}x`}</button>
                                        ))}
                                    </div>

                                    {/* 수익률 */}
                                    {!isLatestDate && currentPriceMap.size > 0 && (
                                        <div className="flex">
                                            {(['all', 'win', 'loss'] as const).map((v, idx) => (
                                                <button key={v} onClick={() => setFilterReturn(v)}
                                                    className={cn(
                                                        "text-[10px] font-bold px-2 py-1 border-y border-r transition-colors whitespace-nowrap",
                                                        idx === 0 && "rounded-l-lg border-l", idx === 2 && "rounded-r-lg",
                                                        filterReturn === v
                                                            ? v === 'win' ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 z-10 relative"
                                                              : v === 'loss' ? "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 z-10 relative"
                                                              : "border-[#16a34a] bg-[#f0fdf4] dark:bg-[#052e16]/40 text-[#16a34a] z-10 relative"
                                                            : "border-neutral-200 dark:border-border-subtle-dark text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500"
                                                    )}
                                                >{v === 'all' ? '수익률' : v === 'win' ? '수익' : '손실'}</button>
                                            ))}
                                        </div>
                                    )}

                                    {/* PBR */}
                                    <div className="flex">
                                        {(['all', '0.3', '0.5', '0.7'] as const).map((v, idx) => (
                                            <button key={v} onClick={() => setFilterPbr(v)}
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-1 border-y border-r transition-colors whitespace-nowrap",
                                                    idx === 0 && "rounded-l-lg border-l", idx === 3 && "rounded-r-lg",
                                                    filterPbr === v ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 z-10 relative" : "border-neutral-200 dark:border-border-subtle-dark text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500"
                                                )}
                                            >{v === 'all' ? 'PBR' : `≤${v}`}</button>
                                        ))}
                                    </div>

                                    {/* PER */}
                                    <div className="flex">
                                        {(['all', '5', '10', '15'] as const).map((v, idx) => (
                                            <button key={v} onClick={() => setFilterPer(v)}
                                                className={cn(
                                                    "text-[10px] font-bold px-2 py-1 border-y border-r transition-colors whitespace-nowrap",
                                                    idx === 0 && "rounded-l-lg border-l", idx === 3 && "rounded-r-lg",
                                                    filterPer === v ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 z-10 relative" : "border-neutral-200 dark:border-border-subtle-dark text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500"
                                                )}
                                            >{v === 'all' ? 'PER' : `≤${v}`}</button>
                                        ))}
                                    </div>

                                    {/* 고급 필터 토글 */}
                                    <button
                                        onClick={() => setFilterOpen(o => !o)}
                                        className={cn(
                                            "flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all",
                                            filterOpen || minMarketCap > 0 || excludeHoldings || excludeDeficit
                                                ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-brand-light-hover dark:border-[#166534] text-[#15803d] dark:text-[#16a34a]"
                                                : "bg-white dark:bg-transparent border-neutral-200 dark:border-border-subtle-dark text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-500"
                                        )}
                                    >
                                        <SlidersHorizontal size={10} />
                                        고급
                                        {(minMarketCap > 0 || excludeHoldings || excludeDeficit) && (
                                            <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full bg-[#16a34a] text-white text-[8px] font-black">
                                                {[minMarketCap > 0, excludeHoldings, excludeDeficit].filter(Boolean).length}
                                            </span>
                                        )}
                                    </button>

                                    {/* 전체 초기화 */}
                                    {hasAnyFilter && (
                                        <button onClick={resetAll} className="text-[10px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline ml-0.5">전체 초기화</button>
                                    )}

                                    {/* 결과 종목 수 — 필터 적용 시 강조 */}
                                    <div className={cn(
                                        "ml-auto flex items-baseline gap-1 px-2.5 py-1 rounded-lg border",
                                        hasAnyFilter
                                            ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 border-[#bbf7d0] dark:border-[#166534]/50"
                                            : "bg-surface-canvas dark:bg-surface-dark-canvas border-neutral-200 dark:border-border-subtle-dark"
                                    )}>
                                        <span className={cn(
                                            "text-sm font-black tabular-nums leading-none",
                                            hasAnyFilter ? "text-[#15803d] dark:text-[#16a34a]" : "text-neutral-700 dark:text-neutral-200"
                                        )}>{filteredList.length}</span>
                                        <span className="text-[10px] font-bold text-neutral-400">개</span>
                                        {filteredList.length !== historicalList.length && (
                                            <span className="text-[10px] font-medium text-neutral-400 ml-0.5">/ {historicalList.length}</span>
                                        )}
                                    </div>
                                </div>

                                {/* ── 적용된 조건 칩 — 무엇이 걸려있는지 한눈에 ── */}
                                {(() => {
                                    const chips: { key: string; label: string; clear: () => void }[] = [];
                                    if (searchQuery)        chips.push({ key: 'q',    label: `검색 "${searchQuery}"`, clear: () => setSearchQuery('') });
                                    if (filterNcav !== 'all') chips.push({ key: 'ncav', label: `NCAV ≥${filterNcav}x`, clear: () => setFilterNcav('all') });
                                    if (filterReturn !== 'all') chips.push({ key: 'ret', label: filterReturn === 'win' ? '수익' : '손실', clear: () => setFilterReturn('all') });
                                    if (filterPbr !== 'all') chips.push({ key: 'pbr',  label: `PBR ≤${filterPbr}`, clear: () => setFilterPbr('all') });
                                    if (filterPer !== 'all') chips.push({ key: 'per',  label: `PER ≤${filterPer}`, clear: () => setFilterPer('all') });
                                    if (minMarketCap > 0)   chips.push({ key: 'cap',  label: `시총 ${MKTCAP_PRESETS.find(p => p.value === minMarketCap)?.label ?? `${minMarketCap}억+`}`, clear: () => setMinMarketCap(0) });
                                    if (excludeHoldings)    chips.push({ key: 'hold', label: '홀딩스 제외', clear: () => setExcludeHoldings(false) });
                                    if (excludeDeficit)     chips.push({ key: 'def',  label: '적자 제외',  clear: () => setExcludeDeficit(false) });
                                    if (chips.length === 0) return null;
                                    return (
                                        <div className="px-5 sm:px-6 pb-3 -mt-0.5 flex items-center gap-1.5 flex-wrap">
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

                                {/* ── 고급 필터 확장 패널 ── */}
                                {filterOpen && (
                                    <div className="px-5 sm:px-6 pb-4 pt-3 border-t border-neutral-100 dark:border-border-subtle-dark flex flex-wrap items-center gap-x-5 gap-y-3">
                                        {/* 시가총액 */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">시가총액</span>
                                            {MKTCAP_PRESETS.map(p => (
                                                <button
                                                    key={p.value}
                                                    onClick={() => setMinMarketCap(p.value)}
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all",
                                                        minMarketCap === p.value
                                                            ? "bg-[#16a34a] border-[#16a34a] text-white"
                                                            : "bg-white dark:bg-transparent border-neutral-200 dark:border-border-subtle-dark text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-500"
                                                    )}
                                                >{p.label}</button>
                                            ))}
                                        </div>
                                        <div className="w-px h-4 bg-neutral-200 dark:bg-surface-dark-elevated hidden sm:block" />
                                        {/* 제외 조건 */}
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">제외</span>
                                            {[
                                                { label: '홀딩스', value: excludeHoldings, set: setExcludeHoldings },
                                                { label: '적자 기업', value: excludeDeficit, set: setExcludeDeficit },
                                            ].map(opt => (
                                                <label key={opt.label} className="flex items-center gap-1.5 cursor-pointer select-none">
                                                    <input type="checkbox" checked={opt.value} onChange={e => opt.set(e.target.checked)} className="rounded accent-[#16a34a]" />
                                                    <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            );
                        })()}

                        {/* ── View Tabs ── */}
                        <div className="flex items-end gap-0 border-b border-neutral-200 dark:border-border-subtle-dark -mb-2">
                            {(['history', 'portfolio', 'stocks'] as const).map(tab => {
                                const labels = { history: '히스토리', portfolio: '포트폴리오', stocks: '종목 목록' };
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setViewTab(tab)}
                                        className={cn(
                                            "px-4 pb-3 pt-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
                                            viewTab === tab
                                                ? "border-[#16a34a] text-[#16a34a]"
                                                : "border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                                        )}
                                    >
                                        {labels[tab]}
                                    </button>
                                );
                            })}
                            {/* 병합조정 토글 — 비최신일 + 현재가 로드됐을 때만 표시 */}
                            {!isLatestDate && !loadingCurrentPrices && currentPriceMap.size > 0 && (
                                <div className="ml-auto pb-2 flex items-center gap-1.5">
                                    <button
                                        onClick={() => setSplitAdjusted(p => !p)}
                                        className={cn(
                                            "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors",
                                            splitAdjusted
                                                ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-500"
                                                : "border-neutral-200 dark:border-border-subtle-dark text-neutral-400 hover:border-neutral-300"
                                        )}
                                    >
                                        병합조정 {splitAdjusted ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── 탭 사용 설명 ── */}
                        {(() => {
                            const help = TAB_HELP[viewTab as ViewTabId];
                            return (
                                <div className="flex items-start gap-2.5 rounded-xl bg-[#f0fdf4] dark:bg-[#052e16]/20 border border-[#bbf7d0] dark:border-[#166534]/40 px-4 py-3">
                                    <Info size={14} className="text-[#16a34a] shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-[#15803d] dark:text-[#4ade80]">{help.title}</p>
                                        <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-0.5">{help.desc}</p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ── 히스토리 탭 ── */}
                        {viewTab === 'history' && (
                        <>

                        {/* ── Bar Chart ── */}
                        <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                                    일별 후보 수 추이 (필터 반영)
                                </p>
                                {historyLoadedCount < datesState.dates.length && (
                                    <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                                        <Loader2 size={11} className="animate-spin text-[#16a34a]/60" />
                                        필터 반영 집계 중 {historyLoadedCount}/{datesState.dates.length}
                                    </span>
                                )}
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                                    <RTooltip
                                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' }}
                                        formatter={(value: unknown) => [String(value), '후보 수']}
                                        labelFormatter={(label: string) => label}
                                    />
                                    <Bar
                                        dataKey="total_cnt"
                                        radius={[3, 3, 0, 0]}
                                        cursor="pointer"
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onClick={(data: any) => setSelectedDate(data.scan_date)}
                                    >
                                        {chartData.map(entry => (
                                            <Cell
                                                key={entry.scan_date}
                                                fill={entry.scan_date === selectedDate ? '#16a34a' : '#d4c9b4'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {formattedSelectedDate && (
                                <p className="mt-2 text-[11px] text-neutral-400 text-center">
                                    선택한 기준일:
                                    <span className="font-bold text-neutral-700 dark:text-neutral-300 ml-1">{formattedSelectedDate}</span>
                                    {isLatestDate && (
                                        <span className="ml-1.5 text-[10px] bg-[#dcfce7] dark:bg-[#052e16]/40 text-[#16a34a] px-1.5 py-0.5 rounded font-bold">
                                            최신
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>

                        {/* ── Summary Cards ── */}
                        {stats && !loadingList && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    { label: '후보 수',    value: `${stats.cnt}개`,     color: '' },
                                    { label: '평균 NCAV',  value: stats.avgNcav > 0 ? `${stats.avgNcav.toFixed(2)}x` : '—', color: '' },
                                    { label: '평균 PBR',   value: stats.avgPbr > 0  ? stats.avgPbr.toFixed(2) : '—', color: '' },
                                    !isLatestDate && stats.avgReturn !== null
                                        ? {
                                            label: splitAdjusted ? '평균수익률(조정)' : '평균 수익률',
                                            value: `${stats.avgReturn >= 0 ? '+' : ''}${stats.avgReturn.toFixed(1)}%`,
                                            color: stats.avgReturn >= 0
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-red-500 dark:text-red-400',
                                          }
                                        : { label: '평균 PER', value: stats.avgPer > 0 ? stats.avgPer.toFixed(1) : '—', color: '' },
                                ].map(card => (
                                    <div key={card.label} className="bg-white dark:bg-surface-dark-card rounded-xl border border-neutral-200 dark:border-border-subtle-dark p-4 text-center">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{card.label}</p>
                                        <p className={cn("text-lg font-black mt-1 font-mono tabular-nums", card.color || "text-neutral-900 dark:text-white")}>
                                            {card.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        </> /* end 히스토리 탭 */
                        )}

                        {/* ── 포트폴리오 탭 ── */}
                        {viewTab === 'portfolio' && (
                        <>
                            {loadingPortfolio ? (
                                <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-5 flex items-center justify-center h-48">
                                    <Loader2 size={22} className="animate-spin text-[#16a34a]/50" />
                                </div>
                            ) : augmentedPortfolioResult ? (
                                /* 항상 시계열 시뮬레이션 차트 표시 (데이터 부족 시 현재가 보간) */
                                <>
                                    {(portfolioResult?.time_series?.length ?? 0) < 2 && (
                                        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 px-4 py-3">
                                            <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                                                후속 스캔 데이터가 부족해
                                                <span className="font-bold"> 현재가 기준 보간</span> 시뮬레이션을 표시합니다.
                                                기준일({formattedSelectedDate ?? '—'}) 진입가(0%) → 최근 스캔가를 선형 보간한 추정치이며,
                                                실제 스캔 데이터가 쌓이면 자동으로 실측 시계열로 전환됩니다.
                                            </p>
                                        </div>
                                    )}
                                    <PortfolioOverviewChart
                                        result={augmentedPortfolioResult}
                                        loading={false}
                                        strategy="all"
                                        synthetic={(portfolioResult?.time_series?.length ?? 0) < 2}
                                    />
                                    <PortfolioChart
                                        result={augmentedPortfolioResult}
                                        loading={false}
                                        strategy="all"
                                    />
                                </>
                            ) : (
                                /* 후보 없음 또는 가격 데이터 없음 */
                                <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark p-6 flex flex-col items-center justify-center gap-2 text-center">
                                    <Info size={20} className="text-neutral-300" />
                                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">표시할 데이터가 없습니다</p>
                                    <p className="text-[11px] text-neutral-400 max-w-xs leading-relaxed">
                                        선택한 날짜의 후보 종목이 없거나 가격 데이터를 로드하지 못했습니다. 다른 날짜를 선택하거나 필터를 초기화해 보세요.
                                    </p>
                                </div>
                            )}

                            {/* ── 종목별 수익률 스냅샷 (포트폴리오 탭 하단) ── */}
                            {!loadingPortfolio && currentPriceMap.size > 0 && (
                                <>
                                    <div className="border-t border-neutral-200 dark:border-border-subtle-dark pt-4">
                                        <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                                            종목별 수익률 스냅샷
                                        </p>
                                    </div>
                                    <PortfolioSnapshotChart
                                        result={portfolioResult}
                                        loading={loadingPortfolio}
                                        strategy="all"
                                        currentPriceMap={currentPriceMap}
                                        selectedDate={selectedDate}
                                        fallbackCandidates={fallbackCandidates}
                                        currentLstnMap={currentLstnMap}
                                        splitAdjusted={splitAdjusted}
                                        filteredTickers={filteredTickers}
                                    />
                                </>
                            )}
                        </> /* end 포트폴리오 탭 */
                        )}

                        {/* ── 종목 목록 탭 ── */}
                        {viewTab === 'stocks' && (
                        <>

                        {/* ── Table ── */}
                        <div className="bg-white dark:bg-surface-dark-card rounded-2xl border border-neutral-200 dark:border-border-subtle-dark overflow-hidden shadow-sm">
                            <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-border-subtle-dark flex items-center gap-3">
                                <p className="text-sm font-black text-neutral-900 dark:text-white">
                                    {formattedSelectedDate ? `${formattedSelectedDate} 후보 종목` : '후보 종목'}
                                </p>
                                {loadingList && <Loader2 size={13} className="animate-spin text-neutral-400" />}
                                {!loadingList && historicalList.length > 0 && (
                                    <span className={cn(
                                        "inline-flex items-baseline gap-1 px-2 py-0.5 rounded-md",
                                        filteredList.length !== historicalList.length
                                            ? "bg-[#f0fdf4] dark:bg-[#052e16]/30 text-[#15803d] dark:text-[#16a34a]"
                                            : "text-neutral-400"
                                    )}>
                                        <span className="text-xs font-black tabular-nums">{filteredList.length}</span>
                                        <span className="text-[10px] font-bold">개</span>
                                        {filteredList.length !== historicalList.length && (
                                            <span className="text-[10px] font-medium text-neutral-400">/ {historicalList.length}</span>
                                        )}
                                    </span>
                                )}
                                {!isLatestDate && currentPriceMap.size > 0 && (
                                    <span className="ml-auto text-[10px] text-neutral-400 font-medium">현재가 기준 수익률</span>
                                )}
                            </div>

                            {loadingList ? (
                                <div className="flex justify-center py-14">
                                    <Loader2 size={24} className="animate-spin text-[#16a34a]/40" />
                                </div>
                            ) : historicalList.length === 0 ? (
                                <p className="text-center py-14 text-sm text-neutral-400">
                                    해당 날짜의 후보 데이터가 없습니다.
                                </p>
                            ) : filteredList.length === 0 ? (
                                <p className="text-center py-14 text-sm text-neutral-400">
                                    필터 조건에 맞는 종목이 없습니다.
                                </p>
                            ) : (
                                <>
                                    {/* ── Desktop table ── */}
                                    <div className="hidden md:block overflow-x-auto">
                                        {/* Header */}
                                        <div className={cn(
                                            "grid gap-4 items-center px-6 py-3.5 bg-[#fcfaf7] dark:bg-surface-dark border-b border-neutral-200 dark:border-border-subtle-dark",
                                            isLatestDate
                                                ? "grid-cols-[minmax(160px,2.5fr)_80px_90px_90px_68px_68px_48px]"
                                                : "grid-cols-[minmax(160px,2.5fr)_80px_90px_90px_80px_68px_68px_48px]"
                                        )}>
                                            <SortTh label="종목명"    sortKey="name"       current={sortKey} order={sortOrder} onToggle={toggleSort} />
                                            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">전략</div>
                                            <SortTh label="NCAV 비율" sortKey="ncav_ratio"  current={sortKey} order={sortOrder} onToggle={toggleSort} />
                                            <SortTh label="기준일 주가" sortKey="last_price" current={sortKey} order={sortOrder} onToggle={toggleSort} />
                                            {!isLatestDate && <SortTh label="수익률" sortKey="return_pct" current={sortKey} order={sortOrder} onToggle={toggleSort} />}
                                            <SortTh label="PBR"       sortKey="pbr"         current={sortKey} order={sortOrder} onToggle={toggleSort} />
                                            <SortTh label="PER"       sortKey="per"         current={sortKey} order={sortOrder} onToggle={toggleSort} />
                                            <div />
                                        </div>

                                        {/* Rows */}
                                        {sortedList.map(item => {
                                            const curPrice  = currentPriceMap.get(item.ticker);
                                            const returnPct = !isLatestDate && curPrice && item.last_price > 0
                                                ? calcReturn(item.last_price, item.market_cap, item.ticker, curPrice, splitAdjusted, currentLstnMap)
                                                : null;
                                            const ncav      = safeNum(item.ncav_ratio);
                                            const isExpanded = selectedStock === item.ticker;

                                            return (
                                                <div key={item.ticker}>
                                                    <div
                                                        className={cn(
                                                            "grid gap-4 items-center px-6 py-4 border-b border-neutral-100 dark:border-border-subtle-dark last:border-0 cursor-pointer transition-colors",
                                                            isExpanded
                                                                ? "bg-[#f0fdf4]/60 dark:bg-[#052e16]/20"
                                                                : "hover:bg-[#f0fdf4]/30 dark:hover:bg-surface-dark/60",
                                                            isLatestDate
                                                                ? "grid-cols-[minmax(160px,2.5fr)_80px_90px_90px_68px_68px_48px]"
                                                                : "grid-cols-[minmax(160px,2.5fr)_80px_90px_90px_80px_68px_68px_48px]"
                                                        )}
                                                        onClick={() => setSelectedStock(isExpanded ? null : item.ticker)}
                                                    >
                                                        {/* 종목명 */}
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm truncate leading-tight">{item.name}</p>
                                                            <p className="text-[11px] text-neutral-400 font-mono mt-0.5 tracking-wider">{item.ticker}</p>
                                                        </div>

                                                        {/* 전략 배지 */}
                                                        {(() => {
                                                            const strats = resolveAllStrategies(item);
                                                            return (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {strats.slice(0, 2).map(s => (
                                                                        <span key={s} className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", STRATEGY_BADGE[s] ?? "bg-surface-canvas dark:bg-surface-dark-elevated text-neutral-500")}>
                                                                            {STRATEGY_LABEL[s] ?? s}
                                                                        </span>
                                                                    ))}
                                                                    {strats.length > 2 && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface-canvas dark:bg-surface-dark-elevated text-neutral-400">
                                                                            +{strats.length - 2}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* NCAV 비율 */}
                                                        <div className="text-right">
                                                            <span className={cn(
                                                                "text-sm font-mono font-black tabular-nums",
                                                                ncav >= 1   ? "text-emerald-600 dark:text-emerald-400"
                                                                : ncav >= 0.7 ? "text-amber-500"
                                                                : "text-neutral-400"
                                                            )}>
                                                                {ncav > 0 ? `${ncav.toFixed(2)}x` : '—'}
                                                            </span>
                                                        </div>

                                                        {/* 기준일 주가 */}
                                                        <div className="text-right">
                                                            <span className="text-sm font-mono text-neutral-700 dark:text-neutral-300 tabular-nums">
                                                                {item.last_price > 0 ? item.last_price.toLocaleString() : '—'}
                                                            </span>
                                                        </div>

                                                        {/* 수익률 */}
                                                        {!isLatestDate && (
                                                            <div className="text-right">
                                                                {returnPct !== null ? (
                                                                    <span className={cn(
                                                                        "text-sm font-mono font-bold tabular-nums",
                                                                        returnPct >= 0
                                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                                            : "text-red-500 dark:text-red-400"
                                                                    )}>
                                                                        {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-neutral-400">—</span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* PBR */}
                                                        <div className="text-right">
                                                            <span className="text-sm font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                                                                {safeNum(item.pbr) > 0 ? safeNum(item.pbr).toFixed(2) : '—'}
                                                            </span>
                                                        </div>

                                                        {/* PER */}
                                                        <div className="text-right">
                                                            <span className="text-sm font-mono text-neutral-600 dark:text-neutral-300 tabular-nums">
                                                                {safeNum(item.per) > 0 ? safeNum(item.per).toFixed(1) : '—'}
                                                            </span>
                                                        </div>

                                                        {/* Expand toggle */}
                                                        <div className="flex justify-end">
                                                            <ChevronRight
                                                                size={14}
                                                                className={cn(
                                                                    "text-neutral-400 transition-transform duration-200",
                                                                    isExpanded && "rotate-90"
                                                                )}
                                                            />
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <DrillDown
                                                            ticker={item.ticker}
                                                            name={item.name}
                                                            stockHistory={stockHistory}
                                                            loading={loadingStock}
                                                            onNavigate={() => router.push(`/analyze?ticker=${encodeURIComponent(item.name)}&from=backtest`)}
                                                            entryDate={selectedDate}
                                                            entryPrice={item.last_price}
                                                            entryMarketCap={item.market_cap}
                                                            splitAdjusted={splitAdjusted}
                                                            currentLstnMap={currentLstnMap}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ── Mobile cards ── */}
                                    <div className="md:hidden divide-y divide-neutral-100 dark:divide-[#35332e]">
                                        {sortedList.map(item => {
                                            const curPrice  = currentPriceMap.get(item.ticker);
                                            const returnPct = !isLatestDate && curPrice && item.last_price > 0
                                                ? calcReturn(item.last_price, item.market_cap, item.ticker, curPrice, splitAdjusted, currentLstnMap)
                                                : null;
                                            const ncav      = safeNum(item.ncav_ratio);
                                            const isExpanded = selectedStock === item.ticker;

                                            return (
                                                <div key={item.ticker}>
                                                    <div
                                                        className={cn(
                                                            "px-4 py-4 cursor-pointer transition-colors",
                                                            isExpanded && "bg-[#f0fdf4]/50 dark:bg-[#052e16]/10"
                                                        )}
                                                        onClick={() => setSelectedStock(isExpanded ? null : item.ticker)}
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-3">
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-bold text-sm truncate leading-tight">{item.name}</p>
                                                                <p className="text-[11px] text-neutral-400 font-mono tracking-wider mt-0.5">{item.ticker}</p>
                                                            </div>
                                                            <div className={cn(
                                                                "px-2.5 py-1.5 rounded-xl text-sm font-black font-mono shrink-0 tabular-nums",
                                                                ncav >= 1
                                                                    ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                                                                    : ncav >= 0.7
                                                                    ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400"
                                                                    : "bg-surface-canvas dark:bg-surface-dark text-neutral-500"
                                                            )}>
                                                                {ncav > 0 ? `${ncav.toFixed(2)}x` : '—'}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="text-center p-2.5 bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl">
                                                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">기준가</p>
                                                                <p className="text-xs font-mono font-bold mt-0.5 tabular-nums">
                                                                    {item.last_price > 0 ? item.last_price.toLocaleString() : '—'}
                                                                </p>
                                                            </div>

                                                            {!isLatestDate ? (
                                                                <div className="text-center p-2.5 bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl">
                                                                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">수익률</p>
                                                                    <p className={cn(
                                                                        "text-xs font-mono font-bold mt-0.5 tabular-nums",
                                                                        returnPct === null
                                                                            ? "text-neutral-400"
                                                                            : returnPct >= 0
                                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                                            : "text-red-500 dark:text-red-400"
                                                                    )}>
                                                                        {returnPct !== null
                                                                            ? `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%`
                                                                            : '—'}
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="text-center p-2.5 bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl">
                                                                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">PBR</p>
                                                                    <p className="text-xs font-mono font-bold mt-0.5">
                                                                        {safeNum(item.pbr) > 0 ? safeNum(item.pbr).toFixed(2) : '—'}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="text-center p-2.5 bg-surface-canvas dark:bg-surface-dark-canvas rounded-xl">
                                                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">PER</p>
                                                                <p className="text-xs font-mono font-bold mt-0.5">
                                                                    {safeNum(item.per) > 0 ? safeNum(item.per).toFixed(1) : '—'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isExpanded && (
                                                        <DrillDown
                                                            ticker={item.ticker}
                                                            name={item.name}
                                                            stockHistory={stockHistory}
                                                            loading={loadingStock}
                                                            onNavigate={() => router.push(`/analyze?ticker=${encodeURIComponent(item.name)}&from=backtest`)}
                                                            entryDate={selectedDate}
                                                            entryPrice={item.last_price}
                                                            entryMarketCap={item.market_cap}
                                                            splitAdjusted={splitAdjusted}
                                                            currentLstnMap={currentLstnMap}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function BacktestPage() {
    const { data: session, status } = useSession();
    const isAdmin = (session?.user as any)?.role === "admin";

    if (status === "loading") {
        return (
            <div className="flex items-center justify-center min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas">
                <Loader2 className="animate-spin text-[#16a34a]" size={24} />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas gap-3">
                <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">준비 중인 기능입니다.</p>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-surface-canvas dark:bg-surface-dark-canvas">
                <Loader2 className="animate-spin text-[#16a34a]" size={24} />
            </div>
        }>
            <BacktestContent />
        </Suspense>
    );
}
