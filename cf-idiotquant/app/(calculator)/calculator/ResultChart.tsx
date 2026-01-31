"use client";

import { Util } from "@/components/util";
import { Card, Elevation, Text } from "@blueprintjs/core";
import { FC } from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
} from "recharts";

export interface ChartDataItem {
    year: number;
    totalValue: number;
    profitRate: number;
}

interface ResultChartProps {
    data: ChartDataItem[];
    height: string; // Tailwind 클래스 (예: h-80, h-96)
}

const ResultChart: FC<ResultChartProps> = ({ data, height }) => {
    if (!data || data.length === 0) return null;

    // Blueprintjs 다크모드 및 라이트모드 그리드 색상 대응
    const gridColor = "rgba(128, 128, 128, 0.2)";

    return (
        <Card
            elevation={Elevation.ZERO}
            className={`w-full flex flex-col p-0 border-none bg-transparent dark:!bg-black ${height}`}
        >
            <div className="pt-2 px-4 mb-4">
                <Text className="font-bold opacity-80 uppercase tracking-wider text-xs dark:!text-white">
                    Annual Growth Insight
                </Text>
            </div>

            <div className="flex-grow w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />

                        <XAxis
                            dataKey="year"
                            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.6 }}
                            axisLine={{ stroke: gridColor }}
                            tickLine={false}
                            dy={10}
                        />

                        <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 10, fill: "#4F46E5" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => Util.UnitConversion(value, true, 0)}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tick={{ fontSize: 10, fill: "#F59E0B" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                        />

                        <Tooltip
                            contentStyle={{
                                backgroundColor: "var(--pt-card-background-color, #fff)",
                                border: "1px solid var(--pt-divider-black, #ccc)",
                                borderRadius: "8px",
                                fontSize: "12px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                            }}
                            itemStyle={{ padding: "2px 0" }}
                            formatter={(value: any, name: string) => {
                                if (typeof value === "number") {
                                    if (name.includes("수익률")) {
                                        const color = value >= 0 ? "#d91212" : "#1261d9";
                                        return [`${value > 0 ? "+" : ""}${value.toFixed(2)}%`, name];
                                    }
                                    return [`${value.toLocaleString()}원`, name];
                                }
                                return [value, name];
                            }}
                            labelFormatter={(label) => `${label}년차 투자 리포트`}
                        />

                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconType="circle"
                            wrapperStyle={{
                                paddingBottom: "20px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase"
                            }}
                        />

                        <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalValue"
                            name="총 자산"
                            stroke="#4F46E5" // Blueprint Indigo
                            strokeWidth={3}
                            dot={{ r: 0 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                            animationDuration={1500}
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="profitRate"
                            name="수익률"
                            stroke="#F59E0B" // Blueprint Gold
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={{ r: 0 }}
                            activeDot={{ r: 4 }}
                            animationDuration={1500}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ResultChart;