"use client";

import { FC, useState, useEffect } from "react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";

// ResultChart 내부용 안전한 클래스 병합 유틸리티
function cnLocal(...inputs: (string | boolean | undefined | null)[]) {
    return inputs.filter(Boolean).join(" ");
}

const formatValueFull = (value: number): string => {
    if (value === 0) return "0원";
    const trillion = Math.floor(value / 100000000);
    const billion = Math.floor((value % 100000000) / 10000);
    const million = Math.floor(value % 10000);

    let result = "";
    if (trillion > 0) result += `${trillion}조 `;
    if (billion > 0) result += `${billion}억 `;
    if (million > 0) {
        result += `${million.toLocaleString()}만원`;
    } else if (trillion > 0 || billion > 0) {
        result += "원";
    } else {
        result = `${value.toLocaleString()}만원`;
    }
    return result.trim();
};

export interface ChartDataItem {
    year: number;
    totalValue: number;
    profitRate: number;
}

interface ResultChartProps {
    data: ChartDataItem[];
    height: string;
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-neutral-950/95 dark:bg-[#1f1e1b]/95 backdrop-blur-md border border-neutral-800 p-4 rounded-xl shadow-xl space-y-2 z-50">
                <p className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 font-mono tracking-wider">
                    {payload[0].payload.year}세 예상 진단
                </p>
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-black text-[#16a34a] flex items-center gap-1.5 font-mono">
                        <span className="w-2 h-2 rounded-full bg-[#f0fdf4]0" />
                        {formatValueFull(payload[0].value)}
                    </span>
                    {payload[1] && (
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            누적 수익률: {payload[1].value.toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const ResultChart: FC<ResultChartProps> = ({ data, height }) => {
    const [mounted, setMounted] = useState<boolean>(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className={cnLocal("w-full bg-neutral-50/50 dark:bg-black/10 animate-pulse rounded-2xl flex items-center justify-center text-xs text-neutral-400 font-medium font-sans", height)}>
                차트를 로드하는 중입니다...
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-[#242320]/10 border border-neutral-200/50 dark:border-[#35332e]/50 rounded-2xl p-3 sm:p-5 backdrop-blur-md relative overflow-hidden group shadow-xs">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0fdf4]0 via-indigo-500 to-purple-500 opacity-70" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-8">
                <div className="space-y-0.5">
                    <h3 className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f0fdf4]0 animate-pulse" />
                        Asset Growth Trajectory
                    </h3>
                    <p className="text-xs sm:text-sm font-black text-neutral-800 dark:text-white tracking-tight">
                        자산 총액 및 누적 수익률 추이 시뮬레이션 커브
                    </p>
                </div>
            </div>

            <div className={cnLocal("w-full relative min-h-[300px]", height)} style={{ height: height.includes('h-[') ? undefined : '400px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid 
                            strokeDasharray="4 4" 
                            stroke="currentColor" 
                            className="text-neutral-200/50 dark:text-neutral-800/30" 
                            vertical={false} 
                        />
                        <XAxis
                            dataKey="year"
                            stroke="currentColor"
                            className="text-neutral-400 dark:text-neutral-600 font-mono text-[10px] font-bold"
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            tickFormatter={(v) => `${v}세`}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="currentColor"
                            className="text-neutral-400 dark:text-neutral-600 font-mono text-[9px] font-bold"
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                            tickFormatter={(v) => v >= 100000000 ? `${(v / 100000000).toFixed(0)}조` : v >= 10000 ? `${(v / 10000).toFixed(0)}억` : v > 0 ? `${v}만` : "0"}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="currentColor"
                            className="text-neutral-400 dark:text-neutral-600 font-mono text-[9px] font-bold"
                            tickLine={false}
                            axisLine={false}
                            dx={5}
                            tickFormatter={(v) => `${v}%`}
                        />
                        
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "currentColor", strokeWidth: 1, strokeDasharray: "4 4", className: "text-neutral-200 dark:text-neutral-800" }} />
                        
                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            iconSize={6}
                            wrapperStyle={{
                                fontSize: "11px",
                                fontWeight: "bold",
                                top: -35,
                                right: 0
                            }}
                        />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalValue"
                            name="자산 총액"
                            stroke="#3b82f6"
                            strokeWidth={2.5}
                            fill="url(#colorValue)"
                            isAnimationActive={false}
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="profitRate"
                            name="수익률"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                            activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ResultChart;