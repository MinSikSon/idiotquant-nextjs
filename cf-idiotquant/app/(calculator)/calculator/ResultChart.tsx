"use client";

import { Card, Elevation } from "@blueprintjs/core";
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

// 차트 내부용 만원 단위 상세 변환 함수
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
        <Card
            elevation={Elevation.ZERO}
            className={`w-full flex flex-col p-0 border-none bg-transparent ${height}`}
        >
            <div className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 0, bottom: 0, left: -20 }}
                    >
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />

                        <XAxis
                            dataKey="year"
                            tick={{ fontSize: 12, fill: "#888", fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                            interval={data.length > 15 ? 4 : 1}
                        />

                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 10, fill: "#888" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${v.toLocaleString()}만`}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 10, fill: "#f59e0b" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: "rgba(0, 0, 0, 0.85)",
                                border: "1px solid #444",
                                borderRadius: "10px",
                                padding: "12px",
                                fontSize: "15px",
                                color: "#fff"
                            }}
                            itemStyle={{ color: "#fff", padding: "4px 0" }}
                            formatter={(value: any, name: string) => {
                                if (name === "수익률") return [`${value}%`, name];
                                return [formatValueFull(value), name];
                            }}
                        />

                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconSize={10}
                            wrapperStyle={{ paddingBottom: "20px", fontSize: "12px", fontWeight: "bold" }}
                        />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalValue"
                            name="자산 총액"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#colorValue)"
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="profitRate"
                            name="수익률"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ResultChart;