"use client";

import { Util } from "@/components/util";
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
    height: string;
}

const ResultChart: FC<ResultChartProps> = ({ data, height }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className={`w-full bg-white dark:bg-gray-900 rounded-2xl ${height}`}>
            <h2 className="pt-2 px-3 text-lg font-semibold dark:text-white">
                연도별 수익 차트
            </h2>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}
                    margin={{ top: 10, right: 0, bottom: 30, left: 10 }} // ← left 값 늘리기
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year"
                        tick={{ fontSize: 14, fill: "#333" }} // 글자 크기, 색상 변경
                    />
                    <YAxis yAxisId="left"
                        tick={{ fontSize: 12, fill: "#333" }} // 글자 크기, 색상 변경
                        angle={-45}           // 글자 기울이기
                        textAnchor="end"       // 글자 기준점 조정
                    />
                    <YAxis yAxisId="right" orientation="right"
                        tick={{ fontSize: 14, fill: "#333" }} // 글자 크기, 색상 변경
                    />
                    <Tooltip
                        // formatter={(value) => value.toLocaleString()}
                        formatter={(value: any, name: string) => {
                            // value는 숫자, name은 <Line name="..."> 값
                            if (typeof value === "number") {
                                if (name.includes("수익률")) {
                                    return [`${value > 0 ? ("+" + value.toFixed(2)) : (value.toFixed(2))} %`, name]; // 퍼센트 표시
                                }
                                return [`${value.toLocaleString()} 원 (${Util.UnitConversion(value, true)})`, name]; // 금액은 원 단위
                            }
                            return [value, name];
                        }}
                        labelFormatter={(label) => `투자 ${label}년차`} // X축 값(연도) 포맷
                    />
                    <Legend
                        layout="horizontal"
                        verticalAlign="top"
                        align="center"
                        wrapperStyle={{ fontSize: 14, fontWeight: 'bold' }} // 글자 스타일
                        iconSize={12}      // 범례 아이콘 크기
                        formatter={(value) => value.toUpperCase()} // 이름 변환
                    />
                    <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalValue"
                        name="총 자산"
                        stroke="#4F46E5"
                        strokeWidth={2}
                    />
                    <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="profitRate"
                        name="수익률(%)"
                        stroke="#F59E0B"
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ResultChart;
