"use client";

// 캔들차트 — 하루의 시가·고가·저가·종가를 한 몸으로 그린다.
//
// 종가 선 하나로는 같은 종가라도 하루 안에서 15% 오갔던 날과 조용한 날이 똑같아 보인다.
// 고가·저가를 따로 선으로 그려 봤지만(예전 방식) 세 줄이 나란히 흐를 뿐이라, 어느 날이
// 어땠는지는 여전히 안 읽혔다. 캔들은 그 하루를 한 덩어리로 보여 준다.
//
// recharts 에 캔들 차트는 없다. Bar 의 shape 를 직접 그리는 방식이 정석인데, 여기서
// 쓰는 값은 [저가, 고가] 범위다 — 그러면 recharts 가 y·height 를 저가~고가 픽셀로 계산해
// 주므로, 몸통(시가~종가)은 그 안에서 비례로 찍으면 된다. 축 계산을 우리가 다시 하지
// 않는다는 게 요점이다.

import { useMemo } from "react";
import {
    ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot,
} from "recharts";
import { useTheme } from "next-themes";

export interface Candle { d: string; o: number; h: number; l: number; c: number }

export interface CandleOverlay {
    name: string;
    data: (number | null)[];
    color: string;
    dash?: string;
}

export interface CandleMarker {
    x: string;
    y: number;
    color: string;
    label?: string;
    labelPosition?: "top" | "bottom";
}

/** 오르면 빨강, 내리면 파랑 — 국내 시세판과 같은 방향. */
const UP = "#e14b4b";
const DOWN = "#3b82f6";

function CandleShape(props: any) {
    const { x, y, width, height, payload, index, growLast, lastIndex } = props;
    const { o, h, l, c } = payload;
    if (!(h > 0) || !(l > 0)) return null;

    // 오늘 새로 열린 캔들만 자라며 들어온다. 하루를 넘겼는데 화면이 그냥 다시 그려지면
    // 무엇이 달라졌는지 눈이 못 따라간다. 새 날짜는 새 요소라 마운트될 때 한 번만 돈다.
    const fresh = growLast && index === lastIndex;

    const span = h - l;
    // 저가~고가가 height 픽셀이다. 그 사이 값은 비례로 찍는다.
    const yOf = (v: number) => (span > 0 ? y + ((h - v) / span) * height : y + height / 2);

    const up = c >= o;
    const color = up ? UP : DOWN;
    const bodyTop = yOf(Math.max(o, c));
    const bodyH = Math.max(1, Math.abs(yOf(o) - yOf(c)));   // 보합이면 1px 선으로

    // 몸통은 칸의 60% — 붙어 있으면 하루를 셀 수 없고, 너무 좁으면 색이 안 보인다.
    const bw = Math.max(1, Math.min(width * 0.6, 14));
    const bx = x + (width - bw) / 2;
    const cx = x + width / 2;

    return (
        <g className={fresh ? "candle-in" : undefined}>
            {/* 꼬리 — 그날 오간 폭 */}
            <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
            <rect x={bx} y={bodyTop} width={bw} height={bodyH} fill={color} stroke={color} />
        </g>
    );
}

function CandleTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload;
    if (!row) return null;
    const up = row.c >= row.o;
    const move = row.o > 0 ? ((row.c - row.o) / row.o) * 100 : 0;

    // 겹선(이동평균선 등)은 값이 있는 것만
    const lines = payload.filter((p: any) => p.dataKey !== "range" && p.value != null);

    return (
        <div className="bg-white/90 dark:bg-surface-dark-canvas/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-neutral-200/60 dark:border-border-subtle-dark/80 shadow-xl text-[11px]">
            <p className="text-neutral-400 font-bold mb-1 font-mono tracking-wider">{label}</p>
            <div className="grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 font-mono">
                <span className="text-neutral-400">시</span><span className="text-neutral-700 dark:text-neutral-200">{row.o?.toLocaleString()}</span>
                <span className="text-neutral-400">고</span><span className="text-neutral-700 dark:text-neutral-200">{row.h?.toLocaleString()}</span>
                <span className="text-neutral-400">저</span><span className="text-neutral-700 dark:text-neutral-200">{row.l?.toLocaleString()}</span>
                <span className="text-neutral-400">종</span>
                <span className="font-black" style={{ color: up ? UP : DOWN }}>
                    {row.c?.toLocaleString()} ({move >= 0 ? "+" : ""}{move.toFixed(1)}%)
                </span>
            </div>
            {lines.length > 0 && (
                <div className="mt-1 pt-1 border-t border-neutral-100 dark:border-border-subtle-dark flex flex-col gap-0.5">
                    {lines.map((p: any) => (
                        <div key={p.dataKey} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color ?? p.stroke }} />
                            <span className="text-neutral-500">{p.name}</span>
                            <span className="font-mono font-bold text-neutral-800 dark:text-neutral-100">
                                {typeof p.value === "number" ? Math.round(p.value).toLocaleString() : p.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function CandleChart({
    candles, overlays = [], markers = [], height = "100%", growLast = false, forceTheme,
}: {
    candles: Candle[];
    overlays?: CandleOverlay[];
    markers?: CandleMarker[];
    height?: number | string;
    /** 마지막(오늘) 캔들이 자라며 들어오게 한다 — 진행 중인 판에서만 뜻이 있다. */
    growLast?: boolean;
    /**
     * 앱 테마를 무시하고 이 명암으로 그린다.
     *
     * 차트가 늘 어두운 바탕 위에 놓이는 자리가 있다(게임의 브라운관 화면). 거기서는 앱이
     * 밝은 테마여도 축 글자가 검정으로 나와 검은 배경에서 사라진다.
     */
    forceTheme?: "dark" | "light";
}) {
    const { theme: appTheme } = useTheme();
    const theme = forceTheme ?? appTheme;
    const textColor = theme === "dark" ? "#9ca3af" : "#4b5563";

    const data = useMemo(() => candles.map((c, i) => {
        const row: any = { label: c.d.slice(4), o: c.o || c.c, h: c.h || c.c, l: c.l || c.c, c: c.c, range: [c.l || c.c, c.h || c.c] };
        for (const ov of overlays) row[ov.name] = ov.data[i] ?? null;
        return row;
    }), [candles, overlays]);

    // 축은 캔들 전체(저가~고가)와 겹선을 함께 담아야 한다 — 평단선이 밖으로 나가면
    // 어디쯤인지 알 수 없다.
    const [lo, hi] = useMemo(() => {
        let min = Infinity, max = -Infinity;
        for (const c of candles) {
            min = Math.min(min, c.l || c.c);
            max = Math.max(max, c.h || c.c);
        }
        for (const ov of overlays) for (const v of ov.data) {
            if (typeof v === "number") { min = Math.min(min, v); max = Math.max(max, v); }
        }
        if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
        const pad = Math.max(1, (max - min) * 0.06);
        return [Math.floor(min - pad), Math.ceil(max + pad)];
    }, [candles, overlays]);

    const hasMarkers = markers.length > 0;

    return (
        <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data} margin={{ top: hasMarkers ? 18 : 10, right: hasMarkers ? 24 : 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="label" hide tickLine={false} axisLine={false} />
                <YAxis
                    domain={[lo, hi]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: textColor, fontSize: 9, fontFamily: "var(--font-mono)" }}
                    width={35}
                />
                <Tooltip
                    content={<CandleTooltip />}
                    cursor={{ stroke: theme === "dark" ? "#1f2937" : "#f3f4f6", strokeWidth: 1, strokeDasharray: "4 4" }}
                    // 상자 밖으로 나갈 수 있게 둔다 — 위쪽 캔들을 찍으면 설명이 차트 천장에
                    // 잘려 값이 안 보였다. 부모의 overflow 도 함께 열어 둬야 뜻이 있다.
                    allowEscapeViewBox={{ x: false, y: true }}
                    wrapperStyle={{ zIndex: 30, pointerEvents: "none" }}
                />

                <Bar dataKey="range" isAnimationActive={false}
                    shape={<CandleShape growLast={growLast} lastIndex={data.length - 1} />} />

                {overlays.map(ov => (
                    <Line
                        key={ov.name}
                        type="monotone"
                        dataKey={ov.name}
                        name={ov.name}
                        stroke={ov.color}
                        strokeWidth={1.2}
                        strokeDasharray={ov.dash}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                        connectNulls={false}
                    />
                ))}

                {markers.map((m, i) => (
                    <ReferenceDot
                        key={`m${i}`}
                        x={m.x}
                        y={m.y}
                        r={4}
                        fill={m.color}
                        stroke={theme === "dark" ? "#09090b" : "#ffffff"}
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
            </ComposedChart>
        </ResponsiveContainer>
    );
}
