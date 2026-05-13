"use client";

import { FC } from "react";
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

const ResultChart: FC<ResultChartProps> = ({ data, height }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className={`w-full flex flex-col p-0 bg-transparent relative overflow-visible ${height}`}>
            <div className="flex-grow w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, bottom: 25, left: 20 }}
                    >
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke="currentColor" 
                            className="text-zinc-200 dark:text-zinc-800 opacity-50"
                            vertical={false} 
                        />

                        <XAxis
                            dataKey="year"
                            tick={{ fontSize: 12, fontWeight: 600 }}
                            className="fill-zinc-400 dark:fill-zinc-500"
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                            interval="preserveStartEnd"
                        />

                        <YAxis
                            yAxisId="left"
                            width={50}
                            tick={{ fontSize: 10 }}
                            className="fill-zinc-400 dark:fill-zinc-500"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${v.toLocaleString()}만`}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            width={40}
                            tick={{ fontSize: 10, fill: "#f59e0b" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: "rgba(18, 18, 18, 0.9)", // 다크 테마 기반 배경
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "12px",
                                padding: "12px",
                                fontSize: "14px",
                                color: "#fff",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                                zIndex: 100
                            }}
                            itemStyle={{ color: "#fff", padding: "2px 0" }}
                            formatter={(value: any, name: string) => {
                                if (name === "수익률") return [`${value}%`, name];
                                return [formatValueFull(value), name];
                            }}
                        />

                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconSize={10}
                            wrapperStyle={{ 
                                paddingBottom: "20px", 
                                fontSize: "12px", 
                                fontWeight: "bold",
                                top: -10
                            }}
                        />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalValue"
                            name="자산 총액"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#colorValue)"
                            isAnimationActive={true}
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="profitRate"
                            name="수익률"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false} // 점 숨김 (r:0 대신 false 가능)
                            activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ResultChart;