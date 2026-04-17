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

// Tailwind 색상 팔레트 정의 (필요시 커스터마이징)
const tailwindPalette = {
    light: {
        primary: "#3b82f6", // blue-500
        secondary: "#10b981", // green-500
        accent: "#f59e0b", // amber-500
        text: "#374151", // gray-700
        surface: "#e5e7eb", // gray-200
    },
    dark: {
        primary: "#60a5fa", // blue-400
        secondary: "#34d399", // green-400
        accent: "#fbbf24", // amber-400
        text: "#d1d5db", // gray-300
        surface: "#1f2937", // gray-800
    },
};

export default function LineChart(props: any) {
    const { theme } = useTheme();
    const mode = theme === "dark" ? "dark" : "light";

    // Tailwind 기반 색상 사용
    const baseColor = tailwindPalette[mode].primary;
    const textColor = tailwindPalette[mode].text;
    const lineColor = tailwindPalette[mode].surface;

    // 시리즈 색상 팔레트
    const colorPalette = [
        tailwindPalette[mode].primary,
        tailwindPalette[mode].secondary,
        tailwindPalette[mode].accent,
        "#ec4899", // pink-500
        "#8b5cf6", // violet-500
    ];

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

    return (
        <ResponsiveContainer width={props.width ?? "100%"} height={props.height ?? 120}>
            <AreaChart data={data}>
                <defs>
                    {props.data_array?.map((_: any, index: number) => (
                        <linearGradient
                            key={index}
                            id={`grad_${index}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor={colorPalette[index]} stopOpacity={0.6} />
                            <stop offset="100%" stopColor={colorPalette[index]} stopOpacity={0.2} />
                        </linearGradient>
                    ))}
                </defs>

                <XAxis
                    dataKey="label"
                    hide={true}
                    tick={{ fill: textColor, fontSize: 8 }}
                />
                <YAxis
                    hide={props.show_yaxis_label === false}
                    tick={{ fill: textColor, fontSize: 8 }}
                />
                <Tooltip
                    contentStyle={{
                        backgroundColor: mode === "dark" ? "#111827" : "#f9fafb",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.75rem",
                    }}
                    labelStyle={{ color: textColor }}
                />
                {!!!props.legend_disable && <Legend
                    wrapperStyle={{
                        fontSize: "10px",
                        paddingTop: "4px",
                        color: textColor,
                    }}
                />}

                {props.data_array?.map((s: any, index: number) => (
                    <Area
                        key={s.name}
                        type="monotone"
                        dataKey={s.name}
                        name={s.name}
                        stroke={colorPalette[index]}
                        strokeWidth={2}
                        fill={`url(#grad_${index})`}
                        isAnimationActive={false}
                        dot={false}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}
