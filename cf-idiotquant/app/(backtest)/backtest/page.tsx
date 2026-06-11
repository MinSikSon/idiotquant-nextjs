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
import type { NcavDailyDateItem } from "@/lib/features/algorithmTrade/algorithmTradeSlice";
import {
    getScanDailyList,
    getScanDailyByTicker,
    getScanDailyAll,
    getPortfolioSimulation,
} from "@/lib/features/algorithmTrade/algorithmTradeAPI";
import { cn } from "@/lib/utils";
import { Loader2, History, ChevronRight, TrendingUp } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis,
    Tooltip as RTooltip, ResponsiveContainer, Cell,
    AreaChart, Area, LineChart, Line, ComposedChart, CartesianGrid,
    ReferenceLine,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioPoint {
    date: string;
    portfolio_pct: number;
    covered: number;
    win_count: number;
}

interface PortfolioSummary {
    current_pct: number;
    days: number;
    top_gainer: { ticker: string; name: string; pct: number } | null;
    top_loser:  { ticker: string; name: string; pct: number } | null;
}

interface TickerSeries {
    ticker: string;
    name: string;
    data: { date: string; pct: number }[];
    final_pct?: number;
}

interface PortfolioResult {
    start_date: string;
    strategy: string;
    candidate_count: number;
    candidates: { ticker: string; name: string; start_price: number }[];
    time_series: PortfolioPoint[];
    ticker_series?: TickerSeries[];
    summary: PortfolioSummary;
    note?: string;
}

interface DailyItem {
    ticker: string;
    name: string;
    scan_date: string;
    ncav_ratio: number;
    last_price: number;
    per: number;
    pbr: number;
    eps: number;
    bps: number;
    strategies: string[];
}

type StrategyId = 'ncav' | 'low_pbr' | 'low_per' | 's_rim';
type SortKey = 'name' | 'ncav_ratio' | 'last_price' | 'return_pct' | 'pbr' | 'per';
type SortOrder = 'asc' | 'desc';

// ─── Constants ────────────────────────────────────────────────────────────────

const STRATEGY_TABS: {
    id: StrategyId;
    label: string;
    cntKey: keyof NcavDailyDateItem;
    activeCls: string;
    barColor: string;
}[] = [
    { id: 'ncav',    label: 'NCAV',  cntKey: 'ncav_cnt',    activeCls: 'bg-emerald-600 border-emerald-600 text-white',  barColor: '#16a34a' },
    { id: 'low_pbr', label: '저PBR', cntKey: 'low_pbr_cnt', activeCls: 'bg-sky-600 border-sky-600 text-white',           barColor: '#0284c7' },
    { id: 'low_per', label: '저PER', cntKey: 'low_per_cnt', activeCls: 'bg-orange-500 border-orange-500 text-white',     barColor: '#f97316' },
    { id: 's_rim',   label: 'S-RIM', cntKey: 's_rim_cnt',   activeCls: 'bg-violet-600 border-violet-600 text-white',     barColor: '#7c3aed' },
];

const STRATEGY_LABEL: Record<string, string> = {
    ncav: 'NCAV', low_pbr: '저PBR', low_per: '저PER', s_rim: 'S-RIM',
    graham_number: '그레이엄', magic_formula: '마법공식', quality_value: '퀄리티',
    near_ncav: 'NCAV근접', balanced_value: '균형가치',
};

const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

function parseStrategies(strategies: unknown): string[] {
    if (Array.isArray(strategies)) return strategies as string[];
    try { return JSON.parse((strategies as string) ?? '[]'); } catch { return []; }
}

function fmtDate(yyyymmdd: string): string {
    return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}

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

function DrillDown({ name, ticker, stockHistory, loading, onNavigate, entryDate, entryPrice }: {
    name: string; ticker: string;
    stockHistory: DailyItem[];
    loading: boolean;
    onNavigate: () => void;
    entryDate: string | null;
    entryPrice: number;
}) {
    const priceChartData = useMemo(() =>
        stockHistory.map(d => ({
            date: fmtDate(d.scan_date),
            price: d.last_price,
        })),
    [stockHistory]);

    const returnChartData = useMemo(() => {
        if (!entryDate || entryPrice <= 0) return [];
        return stockHistory
            .filter(d => d.scan_date >= entryDate)
            .map(d => ({
                date: fmtDate(d.scan_date),
                return_pct: Math.round((d.last_price / entryPrice - 1) * 10000) / 100,
            }));
    }, [stockHistory, entryDate, entryPrice]);

    const currentReturn = returnChartData.at(-1)?.return_pct ?? 0;
    const returnColor = currentReturn >= 0 ? "#16a34a" : "#ef4444";
    const returnGradId = `retGrad_${ticker}`;

    return (
        <div className="bg-[#f0fdf4]/40 dark:bg-[#052e16]/10 border-b border-neutral-100 dark:border-[#35332e] px-4 sm:px-6 py-5">
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

function PortfolioOverviewChart({ result, loading, strategy }: {
    result: PortfolioResult | null;
    loading: boolean;
    strategy: string;
}) {
    const chartData = useMemo(() =>
        (result?.time_series ?? []).map(d => ({
            label: fmtDate(d.date),
            date: d.date,
            pct: d.portfolio_pct,
            covered: d.covered,
            win_rate: d.covered > 0 ? Math.round((d.win_count / d.covered) * 100) : 0,
        })),
    [result]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex items-center justify-center h-40">
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
        <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-[#35332e] flex items-center gap-2">
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
        const base = (result?.time_series ?? []).map(p => ({
            label: fmtDate(p.date),
            date: p.date,
            pct: p.portfolio_pct,
            covered: p.covered,
            win: p.win_count,
        }));
        if (!showLines || !result?.ticker_series?.length) return base;
        const tickerDateMap: Record<string, Record<string, number>> = {};
        for (const ts of result.ticker_series) {
            tickerDateMap[ts.ticker] = {};
            for (const d of ts.data) tickerDateMap[ts.ticker][d.date] = d.pct;
        }
        return base.map(row => {
            const extra: Record<string, unknown> = {};
            for (const ts of result.ticker_series!) {
                const v = tickerDateMap[ts.ticker]?.[row.date];
                if (v !== undefined) extra[`t_${ts.ticker}`] = v;
            }
            return { ...row, ...extra };
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
            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex items-center justify-center h-48">
                <Loader2 size={22} className="animate-spin text-[#16a34a]/50" />
            </div>
        );
    }

    if (!result || result.candidate_count === 0) {
        return (
            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex items-center justify-center h-36">
                <p className="text-xs text-neutral-400">{result?.note ?? "포트폴리오 시뮬레이션 데이터가 없습니다."}</p>
            </div>
        );
    }

    const strategyLabel: Record<string, string> = {
        ncav: 'NCAV', low_pbr: '저PBR', low_per: '저PER', s_rim: 'S-RIM', all: '전체',
    };

    const hasTickerSeries = (result.ticker_series?.length ?? 0) > 0;

    return (
        <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between gap-3 flex-wrap">
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
                                    : "border-neutral-200 dark:border-[#35332e] text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 dark:hover:border-emerald-600"
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
                <div className="bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">기간</p>
                    <p className="text-xs font-black mt-0.5">{result.summary.days}일</p>
                </div>
                <div className="bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl p-3 text-center">
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

function PortfolioSnapshotChart({ result, loading, strategy, currentPriceMap, selectedDate }: {
    result: PortfolioResult | null;
    loading: boolean;
    strategy: string;
    currentPriceMap: Map<string, number>;
    selectedDate: string | null;
}) {
    const snapshotData: SnapshotEntry[] = useMemo(() => {
        if (!result?.candidates?.length) return [];
        return result.candidates
            .map(c => {
                const cur = currentPriceMap.get(c.ticker);
                if (!cur || c.start_price <= 0) return null;
                const pct = Math.round((cur / c.start_price - 1) * 10000) / 100;
                return {
                    ticker: c.ticker,
                    label: c.name.length > 7 ? c.name.slice(0, 6) + '…' : c.name,
                    fullName: c.name,
                    pct,
                };
            })
            .filter((x): x is SnapshotEntry => x !== null)
            .sort((a, b) => b.pct - a.pct);
    }, [result, currentPriceMap]);

    const strategyLabel: Record<string, string> = {
        ncav: 'NCAV', low_pbr: '저PBR', low_per: '저PER', s_rim: 'S-RIM', all: '전체',
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex items-center justify-center h-48">
                <Loader2 size={22} className="animate-spin text-[#16a34a]/50" />
            </div>
        );
    }

    if (!result || result.candidate_count === 0) {
        return (
            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex items-center justify-center h-36">
                <p className="text-xs text-neutral-400">{result?.note ?? "포트폴리오 시뮬레이션 데이터가 없습니다."}</p>
            </div>
        );
    }

    if (snapshotData.length === 0) {
        return (
            <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 flex items-center gap-3">
                <Loader2 size={16} className="animate-spin text-[#16a34a]/50 shrink-0" />
                <div>
                    <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">
                        {result.candidate_count}개 후보 — 최근 스캔 가격 로딩 중
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
        <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-neutral-100 dark:border-[#35332e] flex items-center justify-between gap-3 flex-wrap">
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
                            <span className="text-xs text-neutral-400">/{result.candidate_count}</span>
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
                            label={{ position: 'right', formatter: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`, fontSize: 9, fill: '#9ca3af' }}
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
                <div className="bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">후보 수</p>
                    <p className="text-xs font-black mt-0.5">{result.candidate_count}개</p>
                </div>
                <div className="bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl p-3 text-center">
                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">커버</p>
                    <p className="text-xs font-black mt-0.5">{snapshotData.length}개 ({Math.round(snapshotData.length / result.candidate_count * 100)}%)</p>
                </div>
                <div className="bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl p-3 text-center">
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
    const [activeStrategy,      setActiveStrategy]      = useState<StrategyId>('ncav');
    const [historicalList,      setHistoricalList]      = useState<DailyItem[]>([]);
    const [currentPriceMap,     setCurrentPriceMap]     = useState<Map<string, number>>(new Map());
    const [selectedStock,       setSelectedStock]       = useState<string | null>(null);
    const [stockHistory,        setStockHistory]        = useState<DailyItem[]>([]);
    const [sortKey,             setSortKey]             = useState<SortKey>('ncav_ratio');
    const [sortOrder,           setSortOrder]           = useState<SortOrder>('desc');
    const [loadingList,          setLoadingList]         = useState(false);
    const [loadingCurrentPrices, setLoadingCurrentPrices]= useState(false);
    const [loadingStock,         setLoadingStock]        = useState(false);
    const [portfolioResult,      setPortfolioResult]     = useState<PortfolioResult | null>(null);
    const [loadingPortfolio,     setLoadingPortfolio]    = useState(false);

    const dateInitialized      = useRef(false);
    const pricesLoaded         = useRef(false);

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
            .then((res: { data?: { ticker: string; last_price: number }[] }) => {
                const map = new Map<string, number>();
                (res?.data ?? []).forEach(item => {
                    if (item.ticker && item.last_price) map.set(item.ticker, safeNum(item.last_price));
                });
                setCurrentPriceMap(map);
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

    // 4. Fetch historical list when date or strategy changes
    useEffect(() => {
        if (!selectedDate) return;
        setLoadingList(true);
        setSelectedStock(null);
        getScanDailyList(selectedDate, activeStrategy)
            .then((res: { data?: Record<string, unknown>[] }) => {
                const raw = res?.data ?? [];
                setHistoricalList(raw.map(item => ({
                    ...(item as Omit<DailyItem, 'strategies'>),
                    strategies: parseStrategies(item.strategies),
                })));
            })
            .catch(() => setHistoricalList([]))
            .finally(() => setLoadingList(false));
    }, [selectedDate, activeStrategy]);

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

    // 6. Fetch portfolio simulation when date or strategy changes
    useEffect(() => {
        if (!selectedDate) return;
        setPortfolioResult(null);
        setLoadingPortfolio(true);
        getPortfolioSimulation(selectedDate, activeStrategy)
            .then((res: { success?: boolean; data?: PortfolioResult }) => {
                if (res?.success && res.data) setPortfolioResult(res.data);
            })
            .catch(() => {})
            .finally(() => setLoadingPortfolio(false));
    }, [selectedDate, activeStrategy]);

    // Bar chart data (chronological order)
    const chartData = useMemo(() =>
        [...datesState.dates].reverse().map(d => ({ ...d, label: fmtDate(d.scan_date) })),
    [datesState.dates]);

    const activeTab = STRATEGY_TABS.find(t => t.id === activeStrategy) ?? STRATEGY_TABS[0];

    const isLatestDate = selectedDate !== null
        && datesState.dates.length > 0
        && selectedDate === datesState.dates[0].scan_date;

    // Sorted table rows
    const sortedList = useMemo(() => {
        const list = [...historicalList];
        list.sort((a, b) => {
            if (sortKey === 'name') {
                return sortOrder === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            }
            if (sortKey === 'return_pct') {
                const getPct = (item: DailyItem) => {
                    const cur = currentPriceMap.get(item.ticker);
                    return cur && item.last_price > 0 ? (cur / item.last_price - 1) : -Infinity;
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
    }, [historicalList, sortKey, sortOrder, currentPriceMap]);

    const toggleSort = useCallback((key: SortKey) => {
        setSortKey(prev => {
            if (prev === key) { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); return key; }
            setSortOrder('desc');
            return key;
        });
    }, []);

    // Summary stats
    const stats = useMemo(() => {
        if (historicalList.length === 0) return null;
        const cnt = historicalList.length;
        const avgNcav = historicalList.reduce((s, i) => s + safeNum(i.ncav_ratio), 0) / cnt;
        const hasPbr = historicalList.filter(i => safeNum(i.pbr) > 0);
        const hasPer = historicalList.filter(i => safeNum(i.per) > 0);
        const avgPbr = hasPbr.length ? hasPbr.reduce((s, i) => s + safeNum(i.pbr), 0) / hasPbr.length : 0;
        const avgPer = hasPer.length ? hasPer.reduce((s, i) => s + safeNum(i.per), 0) / hasPer.length : 0;
        const withReturn = historicalList.filter(i => currentPriceMap.has(i.ticker) && i.last_price > 0);
        const avgReturn = withReturn.length
            ? withReturn.reduce((s, i) => s + (currentPriceMap.get(i.ticker)! / i.last_price - 1) * 100, 0) / withReturn.length
            : null;
        return { cnt, avgNcav, avgPbr, avgPer, avgReturn };
    }, [historicalList, currentPriceMap]);

    const formattedSelectedDate = selectedDate
        ? `${selectedDate.slice(0, 4)}.${selectedDate.slice(4, 6)}.${selectedDate.slice(6, 8)}`
        : null;

    const latestScanDate = datesState.dates[0]?.scan_date;
    const formattedLatestDate = latestScanDate
        ? `${latestScanDate.slice(0, 4)}.${latestScanDate.slice(4, 6)}.${latestScanDate.slice(6, 8)}`
        : null;

    const datesLoading = datesState.state === 'pending' || datesState.state === 'init';

    return (
        <div className="min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] text-neutral-900 dark:text-neutral-100">

            {/* ── Header ── */}
            <div className="bg-white dark:bg-[#1f1e1b] border-b border-neutral-200 dark:border-[#3a3834] border-t-[3px] border-t-[#16a34a]">
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

            {/* ── Strategy Tabs (sticky) ── */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#1f1e1b]/95 backdrop-blur-md border-b border-neutral-200 dark:border-[#3a3834]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {STRATEGY_TABS.map(tab => {
                        const isActive = tab.id === activeStrategy;
                        const latestCnt = datesState.dates[0]?.[tab.cntKey] ?? 0;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveStrategy(tab.id)}
                                className={cn(
                                    "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap shadow-sm",
                                    isActive
                                        ? tab.activeCls
                                        : "border-neutral-200 dark:border-[#3a3834] text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#242320]"
                                )}
                            >
                                {tab.label}
                                <span className={cn(
                                    "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                                    isActive ? "bg-white/20 dark:bg-black/20" : "bg-[#faf9f7] dark:bg-[#4a4641] text-neutral-500"
                                )}>
                                    {latestCnt}
                                </span>
                            </button>
                        );
                    })}
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
                        {/* ── Bar Chart ── */}
                        <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] p-5 shadow-sm">
                            <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-4">
                                일별 후보 수 추이 — {activeTab.label}
                            </p>
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
                                        dataKey={activeTab.cntKey as string}
                                        radius={[3, 3, 0, 0]}
                                        cursor="pointer"
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onClick={(data: any) => setSelectedDate(data.scan_date)}
                                    >
                                        {chartData.map(entry => (
                                            <Cell
                                                key={entry.scan_date}
                                                fill={entry.scan_date === selectedDate ? activeTab.barColor : '#d4c9b4'}
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
                                            label: '평균 수익률',
                                            value: `${stats.avgReturn >= 0 ? '+' : ''}${stats.avgReturn.toFixed(1)}%`,
                                            color: stats.avgReturn >= 0
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : 'text-red-500 dark:text-red-400',
                                          }
                                        : { label: '평균 PER', value: stats.avgPer > 0 ? stats.avgPer.toFixed(1) : '—', color: '' },
                                ].map(card => (
                                    <div key={card.label} className="bg-white dark:bg-[#242320] rounded-xl border border-neutral-200 dark:border-[#35332e] p-4 text-center">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{card.label}</p>
                                        <p className={cn("text-lg font-black mt-1 font-mono tabular-nums", card.color || "text-neutral-900 dark:text-white")}>
                                            {card.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Portfolio Charts ── */}
                        {(portfolioResult?.time_series?.length ?? 0) >= 2 ? (
                            <>
                                <PortfolioOverviewChart
                                    result={portfolioResult}
                                    loading={loadingPortfolio}
                                    strategy={activeStrategy}
                                />
                                <PortfolioChart
                                    result={portfolioResult}
                                    loading={loadingPortfolio}
                                    strategy={activeStrategy}
                                />
                            </>
                        ) : (
                            <PortfolioSnapshotChart
                                result={portfolioResult}
                                loading={loadingPortfolio}
                                strategy={activeStrategy}
                                currentPriceMap={currentPriceMap}
                                selectedDate={selectedDate}
                            />
                        )}

                        {/* ── Table ── */}
                        <div className="bg-white dark:bg-[#242320] rounded-2xl border border-neutral-200 dark:border-[#35332e] overflow-hidden shadow-sm">
                            <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-[#35332e] flex items-center gap-3">
                                <p className="text-sm font-black text-neutral-900 dark:text-white">
                                    {formattedSelectedDate ? `${formattedSelectedDate} 후보 종목` : '후보 종목'}
                                </p>
                                {loadingList && <Loader2 size={13} className="animate-spin text-neutral-400" />}
                                {!loadingList && historicalList.length > 0 && (
                                    <span className="text-xs text-neutral-400 font-medium">{historicalList.length}개</span>
                                )}
                                {!isLatestDate && !loadingCurrentPrices && currentPriceMap.size > 0 && (
                                    <span className="ml-auto text-[10px] text-neutral-400 font-medium">현재가 기준 수익률 표시</span>
                                )}
                            </div>

                            {loadingList ? (
                                <div className="flex justify-center py-14">
                                    <Loader2 size={24} className="animate-spin text-[#16a34a]/40" />
                                </div>
                            ) : historicalList.length === 0 ? (
                                <p className="text-center py-14 text-sm text-neutral-400">
                                    해당 날짜의 {activeTab.label} 후보 데이터가 없습니다.
                                </p>
                            ) : (
                                <>
                                    {/* ── Desktop table ── */}
                                    <div className="hidden md:block overflow-x-auto">
                                        {/* Header */}
                                        <div className={cn(
                                            "grid gap-4 items-center px-6 py-3.5 bg-[#fcfaf7] dark:bg-[#1f1e1b] border-b border-neutral-200 dark:border-[#35332e]",
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
                                                ? (curPrice / item.last_price - 1) * 100
                                                : null;
                                            const ncav      = safeNum(item.ncav_ratio);
                                            const isExpanded = selectedStock === item.ticker;

                                            return (
                                                <div key={item.ticker}>
                                                    <div
                                                        className={cn(
                                                            "grid gap-4 items-center px-6 py-4 border-b border-neutral-100 dark:border-[#35332e] last:border-0 cursor-pointer transition-colors",
                                                            isExpanded
                                                                ? "bg-[#f0fdf4]/60 dark:bg-[#052e16]/20"
                                                                : "hover:bg-[#f0fdf4]/30 dark:hover:bg-[#1f1e1b]/60",
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
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.strategies.slice(0, 1).map(s => (
                                                                <span key={s} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                                                                    {STRATEGY_LABEL[s] ?? s}
                                                                </span>
                                                            ))}
                                                            {item.strategies.length > 1 && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#faf9f7] dark:bg-[#4a4641] text-neutral-400">
                                                                    +{item.strategies.length - 1}
                                                                </span>
                                                            )}
                                                        </div>

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
                                                ? (curPrice / item.last_price - 1) * 100
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
                                                                    : "bg-[#faf9f7] dark:bg-[#1f1e1b] text-neutral-500"
                                                            )}>
                                                                {ncav > 0 ? `${ncav.toFixed(2)}x` : '—'}
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="text-center p-2.5 bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl">
                                                                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">기준가</p>
                                                                <p className="text-xs font-mono font-bold mt-0.5 tabular-nums">
                                                                    {item.last_price > 0 ? item.last_price.toLocaleString() : '—'}
                                                                </p>
                                                            </div>

                                                            {!isLatestDate ? (
                                                                <div className="text-center p-2.5 bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl">
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
                                                                <div className="text-center p-2.5 bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl">
                                                                    <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">PBR</p>
                                                                    <p className="text-xs font-mono font-bold mt-0.5">
                                                                        {safeNum(item.pbr) > 0 ? safeNum(item.pbr).toFixed(2) : '—'}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            <div className="text-center p-2.5 bg-[#faf9f7] dark:bg-[#1a1915] rounded-xl">
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
            <div className="flex items-center justify-center min-h-screen bg-[#faf9f7] dark:bg-[#1a1915]">
                <Loader2 className="animate-spin text-[#16a34a]" size={24} />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#faf9f7] dark:bg-[#1a1915] gap-3">
                <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400">준비 중인 기능입니다.</p>
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#faf9f7] dark:bg-[#1a1915]">
                <Loader2 className="animate-spin text-[#16a34a]" size={24} />
            </div>
        }>
            <BacktestContent />
        </Suspense>
    );
}
