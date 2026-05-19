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
    // 1. 모바일 화면 여부를 감지하기 위한 반응형 상태 추가
    const [isMobile, setIsMobile] = useState<boolean>(false);

    useEffect(() => {
        const handleResize = () => {
            // 768px 미만을 모바일 기준으로 정의
            setIsMobile(window.innerWidth < 768);
        };

        // 초기 로드 시 실행 및 이벤트 리스너 등록
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (!data || data.length === 0) return null;

    return (
        <div className={`w-full flex flex-col p-0 bg-transparent relative overflow-visible ${height}`}>
            <div className="flex-grow w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        /* 
                          [개선 포인트 1] 차트 자체의 마진을 모바일과 데스크톱별로 최적화
                          모바일에서는 공간 확보를 위해 좌우 여백을 대폭 줄입니다.
                        */
                        margin={{ 
                            top: 10, 
                            right: isMobile ? 5 : 15, 
                            bottom: isMobile ? 15 : 25, 
                            left: isMobile ? -5 : 15 
                        }}
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
                            /* [개선 포인트 2] X축 텍스트 크기 조절 및 간격 확보 */
                            tick={{ fontSize: isMobile ? 10 : 12, fontWeight: 600 }}
                            className="fill-zinc-400 dark:fill-zinc-500"
                            axisLine={false}
                            tickLine={false}
                            dy={isMobile ? 6 : 10}
                            interval="preserveStartEnd"
                        />

                        <YAxis
                            yAxisId="left"
                            /* 
                              [개선 포인트 3] Y축 글자가 크거나 짤리지 않도록 너비를 유동적으로 설정
                              모바일에서는 수치 표현이 간결하므로 너비를 줄여 차트 영역을 더 크게 확보합니다.
                            */
                            width={isMobile ? 40 : 60}
                            tick={{ fontSize: isMobile ? 9 : 10 }}
                            className="fill-zinc-400 dark:fill-zinc-500"
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => {
                                if (v >= 10000) {
                                    const rawValue = v / 10000;
                                    return Number.isInteger(rawValue) ? `${rawValue}억` : `${rawValue.toFixed(1)}억`;
                                }
                                return `${v.toLocaleString()}만`;
                            }}
                        />

                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            width={isMobile ? 30 : 45}
                            tick={{ fontSize: isMobile ? 9 : 10, fill: "#f59e0b" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(value) => `${value}%`}
                        />

                        <Tooltip
                            /* [개선 포인트 4] 툴팁이 차트 뷰박스 밖으로 탈출할 수 있도록 허용하고 가독성 패딩 조절 */
                            allowEscapeViewBox={{ x: true, y: true }}
                            contentStyle={{
                                backgroundColor: "rgba(18, 18, 18, 0.95)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "12px",
                                padding: isMobile ? "8px 10px" : "12px",
                                fontSize: isMobile ? "12px" : "14px",
                                color: "#fff",
                                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
                                zIndex: 100
                            }}
                            itemStyle={{ color: "#fff", padding: "1px 0" }}
                            formatter={(value: any, name: string) => {
                                if (name === "수익률") return [`${value}%`, name];
                                return [formatValueFull(value), name];
                            }}
                        />

                        <Legend
                            verticalAlign="top"
                            align="right"
                            iconSize={isMobile ? 8 : 10}
                            wrapperStyle={{ 
                                paddingBottom: isMobile ? "10px" : "20px", 
                                fontSize: isMobile ? "11px" : "12px", 
                                fontWeight: "bold",
                                top: isMobile ? -15 : -10
                            }}
                        />

                        <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalValue"
                            name="자산 총액"
                            stroke="#3b82f6"
                            strokeWidth={isMobile ? 2 : 3}
                            fill="url(#colorValue)"
                            isAnimationActive={true}
                        />

                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="profitRate"
                            name="수익률"
                            stroke="#f59e0b"
                            strokeWidth={isMobile ? 1.5 : 2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: isMobile ? 3 : 4, fill: "#f59e0b", strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ResultChart;