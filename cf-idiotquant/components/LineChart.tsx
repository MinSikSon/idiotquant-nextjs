"use client";

import { useState, useMemo } from "react";
import {
    AreaChart,
    Area,
    Tooltip,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { useTheme } from "next-themes";

// IdiotQuant 테마와 싱크를 맞춘 프리미엄 컬러 팔레트
const tailwindPalette = {
    light: {
        primary: "#3b82f6",     // blue-500
        secondary: "#10b981",   // emerald-500
        accent: "#f59e0b",      // amber-500
        pink: "#ec4899",       // pink-500
        violet: "#8b5cf6",     // violet-500
        text: "#4b5563",       // gray-600
        grid: "#f3f4f6",       // gray-100
    },
    dark: {
        primary: "#60a5fa",     // blue-400
        secondary: "#34d399",   // emerald-400
        accent: "#fbbf24",      // amber-400
        pink: "#f472b6",       // pink-400
        violet: "#a78bfa",     // violet-400
        text: "#9ca3af",       // gray-400
        grid: "#1f2937",       // gray-800
    },
};

// 커스텀 고해상도 툴팁 컴포넌트
const CustomTooltip = ({ active, payload, label, mode }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 dark:bg-[#0d0d0d]/80 backdrop-blur-md px-3 py-2 rounded-xl border border-zinc-200/60 dark:border-[#2a2a2a]/80 shadow-xl text-[11px] font-medium transition-all duration-200">
                <p className="text-zinc-400 dark:text-zinc-500 font-bold mb-1 font-mono tracking-wider">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div 
                                className="w-1.5 h-1.5 rounded-full shadow-sm" 
                                style={{ backgroundColor: entry.color || entry.stroke }} 
                            />
                            <span className="text-zinc-500 dark:text-zinc-400 font-semibold">{entry.name}:</span>
                            <span className="font-bold text-zinc-900 dark:text-white font-mono italic">
                                {typeof entry.value === "number" ? entry.value.toLocaleString() : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export default function LineChart(props: any) {
    const { theme } = useTheme();
    const mode = theme === "dark" ? "dark" : "light";

    const textColor = tailwindPalette[mode].text;

    // 인덱스별 매핑 시리즈 컬러 팔레트
    const colorPalette = useMemo(() => [
        tailwindPalette[mode].primary,
        tailwindPalette[mode].secondary,
        tailwindPalette[mode].accent,
        tailwindPalette[mode].pink,
        tailwindPalette[mode].violet,
    ], [mode]);

    // Recharts용 데이터 구조 결합 및 포맷팅
    const data = useMemo(() => {
        const categories = props.category_array || [];
        const series = props.data_array || [];
        return categories.map((label: any, idx: number) => {
            const row: any = { label };
            series.forEach((s: any) => {
                row[s.name] = s.data[idx] ?? null;
            });
            return row;
        });
    }, [props.data_array, props.category_array]);

    // 상단 미니바 혹은 인라인 배치를 판단하는 플래그
    const isMiniMode = props.height <= 36 || props.show_yaxis_label === false;

    // 차트 외곽 마진 설정 (미니모드일 때는 패딩 공백 없이 영역을 꽉 채우도록 수치 극소화)
    const chartMargin = isMiniMode 
        ? { top: 2, right: 2, left: 2, bottom: 2 }
        : { top: 10, right: 10, left: 0, bottom: 5 };

    return (
        <ResponsiveContainer width={props.width ?? "100%"} height={props.height ?? 120}>
            <AreaChart data={data} margin={chartMargin}>
                <defs>
                    {props.data_array?.map((s: any, index: number) => {
                        // 만약 개별 데이터 배열에 커스텀 컬러가 명시되어 있다면 최우선 적용
                        const strokeColor = s.color || colorPalette[index % colorPalette.length];
                        return (
                            <linearGradient
                                key={index}
                                id={`grad_${s.name.replace(/\s+/g, '_')}`}
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor={strokeColor} stopOpacity={mode === "dark" ? 0.25 : 0.2} />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                            </linearGradient>
                        );
                    })}
                </defs>

                <XAxis
                    dataKey="label"
                    hide={true}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: textColor, fontSize: 9, fontFamily: "var(--font-mono)" }}
                />
                
                <YAxis
                    hide={props.show_yaxis_label === false}
                    tickLine={false}
                    axisLine={false}
                    domain={['auto', 'auto']}
                    tick={{ fill: textColor, fontSize: 9, fontFamily: "var(--font-mono)" }}
                    width={props.show_yaxis_label === false ? 0 : 35}
                />

                {/* 미니 차트 레이아웃 내부에서는 마우스 상호작용 툴팁 오버레이 비활성화 */}
                {!isMiniMode && (
                    <Tooltip
                        content={<CustomTooltip mode={mode} />}
                        cursor={{ stroke: tailwindPalette[mode].grid, strokeWidth: 1, strokeDasharray: "4 4" }}
                    />
                )}

                {!!!props.legend_disable && !isMiniMode && (
                    <Legend
                        verticalAlign="bottom"
                        height={24}
                        iconType="circle"
                        iconSize={6}
                        wrapperStyle={{
                            fontSize: "10px",
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                            paddingTop: "6px",
                            color: textColor,
                        }}
                    />
                )}

                {props.data_array?.map((s: any, index: number) => {
                    const finalColor = s.color || colorPalette[index % colorPalette.length];
                    return (
                        <Area
                            key={s.name}
                            type="monotone"
                            dataKey={s.name}
                            name={s.name}
                            stroke={finalColor}
                            strokeWidth={isMiniMode ? 1.5 : 2}
                            fill={`url(#grad_${s.name.replace(/\s+/g, '_')})`}
                            isAnimationActive={false}
                            dot={false}
                            activeDot={!isMiniMode ? {
                                r: 3.5,
                                stroke: finalColor,
                                strokeWidth: 1.5,
                                fill: mode === "dark" ? "#09090b" : "#ffffff",
                            } : false}
                        />
                    );
                })}
            </AreaChart>
        </ResponsiveContainer>
    );
}