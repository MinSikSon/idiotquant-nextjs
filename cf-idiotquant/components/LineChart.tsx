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
    ReferenceDot,
} from "recharts";
import { useTheme } from "next-themes";

// IdiotQuant 테마와 싱크를 맞춘 프리미엄 컬러 팔레트
const tailwindPalette = {
    light: {
        primary: "#3b82f6",     // [#f0fdf4]0
        secondary: "#10b981",   // emerald-500
        accent: "#f59e0b",      // amber-500
        pink: "#ec4899",       // pink-500
        violet: "#8b5cf6",     // violet-500
        text: "#4b5563",       // gray-600
        grid: "#f3f4f6",       // gray-100
    },
    dark: {
        primary: "#60a5fa",     // [#16a34a]
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
            <div className="bg-white/80 dark:bg-[#1a1915]/80 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-200/60 dark:border-[#35332e]/80 shadow-xl text-[11px] font-medium transition-all duration-200">
                <p className="text-neutral-400 dark:text-neutral-500 font-bold mb-1 font-mono tracking-wider">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                            <div 
                                className="w-1.5 h-1.5 rounded-full shadow-sm" 
                                style={{ backgroundColor: entry.color || entry.stroke }} 
                            />
                            <span className="text-neutral-500 dark:text-neutral-400 font-semibold">{entry.name}:</span>
                            <span className="font-bold text-neutral-900 dark:text-white font-mono italic">
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
        const overlays = props.overlays || [];
        return categories.map((label: any, idx: number) => {
            const row: any = { label };
            series.forEach((s: any) => {
                row[s.name] = s.data[idx] ?? null;
            });
            // 보조지표 — 값이 없는 앞 구간은 null 로 두어 선이 바닥까지 떨어지지 않게 한다
            overlays.forEach((o: any) => {
                row[o.name] = o.data[idx] ?? null;
            });
            return row;
        });
    }, [props.data_array, props.category_array, props.overlays]);

    // 상단 미니바 혹은 인라인 배치를 판단하는 플래그
    const isMiniMode = props.height <= 36 || props.show_yaxis_label === false;

    // 차트 외곽 마진 설정 (미니모드일 때는 패딩 공백 없이 영역을 꽉 채우도록 수치 극소화)
    // 마커 라벨은 점 바깥에 그려진다. 마지막 캔들에 찍힌 마커는 오른쪽 끝에 붙으므로
    // 기본 마진(10)으로는 라벨이 잘린다 — 마커가 있을 때만 상/우 여백을 넓힌다.
    const hasMarkers = !!props.markers?.length;
    const chartMargin = isMiniMode
        ? { top: 2, right: 2, left: 2, bottom: 2 }
        : { top: hasMarkers ? 18 : 10, right: hasMarkers ? 24 : 10, left: 0, bottom: 5 };

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

                {/* 선택 옵션: 가격 위에 겹쳐 그리는 보조지표(이동평균선·볼린저밴드).
                    별도 영역을 만들지 않고 겹치는 이유는 모바일에서 차트 높이를 더 못 쓰기
                    때문이다. 면은 칠하지 않고 얇은 선만 남긴다. */}
                {props.overlays?.map((o: any) => (
                    <Area
                        key={`ov_${o.name}`}
                        type="monotone"
                        dataKey={o.name}
                        name={o.name}
                        stroke={o.color}
                        strokeWidth={1.2}
                        strokeDasharray={o.dash}
                        fill="none"
                        fillOpacity={0}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                        legendType="none"
                        connectNulls={false}
                    />
                ))}

                {/* 선택 옵션: 특정 지점에 점을 찍는다. x 는 category_array 의 값과 같아야 한다.
                    (모의투자에서 매수·매도 시점을 표시하는 데 쓴다) */}
                {props.markers?.map((m: any, i: number) => (
                    <ReferenceDot
                        key={`marker_${i}`}
                        x={m.x}
                        y={m.y}
                        r={4}
                        fill={m.color}
                        stroke={mode === "dark" ? "#09090b" : "#ffffff"}
                        strokeWidth={1.5}
                        label={m.label ? {
                            value: m.label,
                            position: m.labelPosition ?? "top",
                            fontSize: 9,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                            fill: m.color,
                        } : undefined}
                    />
                ))}
            </AreaChart>
        </ResponsiveContainer>
    );
}