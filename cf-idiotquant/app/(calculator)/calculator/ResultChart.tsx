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
    ComposedChart // Area와 Line을 섞어 쓸 때는 ComposedChart가 더 안정적입니다.
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
        <Card
            elevation={Elevation.ZERO}
            className={`w-full flex flex-col p-0 border-none bg-transparent ${height}`}
        >
            <div className="flex-grow w-full h-full overflow-visible">
                <ResponsiveContainer width="100%" height="100%">
                    {/* ComposedChart는 Area와 Line을 동시에 렌더링할 때 최적화되어 있습니다. */}
                    <AreaChart
                        data={data}
                        // 마진 확보: 하단은 X축 라벨을 위해, 좌우는 Y축 라벨을 위해 넉넉히 설정
                        margin={{ top: 10, right: 10, bottom: 25, left: 20 }}
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
                            dy={10} // 라벨과 축 사이 간격
                            interval="preserveStartEnd" // 라벨이 겹치지 않게 자동으로 최적화
                        />

                        <YAxis
                            yAxisId="left"
                            width={50} // Y축 공간을 명시적으로 확보하여 숫자가 짤리는 것을 방지
                            tick={{ fontSize: 10, fill: "#888" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(1)}억` : `${v.toLocaleString()}만`}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            width={40} // 오른쪽 Y축 공간 확보
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
                                fontSize: "14px", // 모바일 가독성을 위해 살짝 조절
                                color: "#fff",
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
                                top: -10 // 레전드가 차트 상단과 너무 가깝지 않게 조정
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
                            dot={{ r: 0 }} // 완전히 숨기는 대신 0으로 설정
                            activeDot={{ r: 4 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default ResultChart;