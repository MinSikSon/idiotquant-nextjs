"use client";

import { useRef, useState } from "react";
import { won, type YearRow } from "./calc";

/**
 * 납입 원금 위에 투자수익을 얹은 누적 면적.
 *
 * 두 띠 사이에는 종이색 선을 한 겹 깔아 2px 틈을 만든다 — 겹친 면을 그대로 두면
 * 한 덩어리로 뭉쳐서 어디까지가 원금인지 읽히지 않는다.
 *
 * 색은 검증기를 돌려 고른 두 값이다(밝은 화면 #1d4ed8/#16a34a, 어두운 화면
 * #4f83e0/#2fa85a — 색각 이상에서도 분리 ΔE 20 이상).
 */

const W = 760;
const H = 260;
const PAD = { l: 8, r: 58, t: 12, b: 26 };

interface Props {
    rows: YearRow[];
}

export default function GrowthChart({ rows }: Props) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hover, setHover] = useState<number | null>(null);

    const maxV = Math.max(1, ...rows.map((d) => Math.max(d.value, d.principal)));
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;

    const X = (i: number) => PAD.l + (i / Math.max(1, rows.length - 1)) * iw;
    const Y = (v: number) => PAD.t + ih - (v / maxV) * ih;

    const line = (get: (d: YearRow) => number) =>
        rows.map((d, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(get(d)).toFixed(1)}`).join("");

    const area = (top: (d: YearRow) => number, bottom: (d: YearRow) => number) => {
        const up = line(top);
        const down = rows
            .map((_, i) => rows.length - 1 - i)
            .map((i) => `L${X(i).toFixed(1)} ${Y(bottom(rows[i])).toFixed(1)}`)
            .join("");
        return `${up}${down}Z`;
    };

    /** 눈금은 둘이면 충분하다 — 격자가 촘촘하면 선보다 격자가 먼저 보인다. */
    const gridVals = [maxV, maxV / 2];
    const everyN = rows.length > 26 ? 10 : rows.length > 12 ? 5 : 2;

    function onMove(e: React.PointerEvent<SVGSVGElement>) {
        const svg = svgRef.current;
        if (!svg) return;
        const box = svg.getBoundingClientRect();
        const rel = ((e.clientX - box.left) / box.width) * W;

        let best = 0;
        let bd = Infinity;
        for (let i = 0; i < rows.length; i++) {
            const d = Math.abs(X(i) - rel);
            if (d < bd) { bd = d; best = i; }
        }
        setHover(best);
    }

    const at = hover === null ? null : rows[hover];

    return (
        <div className="relative">
            <div className="flex gap-4 text-[11px] font-bold text-neutral-600 dark:text-neutral-400 mb-2.5">
                <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-[1px] bg-[#1d4ed8] dark:bg-[#4f83e0]" />
                    납입 원금
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <i className="w-2.5 h-2.5 rounded-[1px] bg-[#16a34a] dark:bg-[#2fa85a]" />
                    투자수익
                </span>
            </div>

            <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-auto overflow-visible touch-none"
                role="img"
                aria-label="연차별 납입 원금과 투자수익 누적 그래프"
                onPointerMove={onMove}
                onPointerLeave={() => setHover(null)}
            >
                {gridVals.map((g) => (
                    <g key={g}>
                        <line
                            x1={PAD.l} x2={PAD.l + iw} y1={Y(g)} y2={Y(g)}
                            className="stroke-neutral-200 dark:stroke-[#35332e]" strokeWidth={1}
                        />
                        <text
                            x={PAD.l + iw + 8} y={Y(g) + 4} fontSize={10}
                            className="fill-neutral-400 dark:fill-neutral-500 font-mono"
                        >
                            {Math.round((g / 10000) * 10) / 10}억
                        </text>
                    </g>
                ))}

                <path d={area((d) => d.principal, () => 0)} className="fill-[#1d4ed8]/[0.13] dark:fill-[#4f83e0]/20" />
                <path d={area((d) => d.value, (d) => d.principal)} className="fill-[#16a34a]/[0.14] dark:fill-[#2fa85a]/20" />

                {/* 두 띠 사이의 틈 — 종이색을 한 겹 깔아 경계가 붙어 보이지 않게 한다 */}
                <path d={line((d) => d.principal)} fill="none" strokeWidth={4} className="stroke-[#faf9f7] dark:stroke-[#1a1915]" />
                <path d={line((d) => d.principal)} fill="none" strokeWidth={2} className="stroke-[#1d4ed8] dark:stroke-[#4f83e0]" />
                <path d={line((d) => d.value)} fill="none" strokeWidth={2} className="stroke-[#16a34a] dark:stroke-[#2fa85a]" />

                {rows.map((d, i) =>
                    i % everyN === 0 || i === rows.length - 1 ? (
                        <text
                            key={d.year} x={X(i)} y={H - 6} fontSize={10} textAnchor="middle"
                            className="fill-neutral-400 dark:fill-neutral-500 font-mono"
                        >
                            {d.year}
                        </text>
                    ) : null
                )}

                {at && hover !== null && (
                    <g>
                        <line
                            x1={X(hover)} x2={X(hover)} y1={PAD.t} y2={PAD.t + ih}
                            className="stroke-neutral-400 dark:stroke-neutral-600" strokeWidth={1}
                        />
                        <circle
                            cx={X(hover)} cy={Y(at.principal)} r={4} strokeWidth={2}
                            className="fill-[#1d4ed8] dark:fill-[#4f83e0] stroke-[#faf9f7] dark:stroke-[#1a1915]"
                        />
                        <circle
                            cx={X(hover)} cy={Y(at.value)} r={4} strokeWidth={2}
                            className="fill-[#16a34a] dark:fill-[#2fa85a] stroke-[#faf9f7] dark:stroke-[#1a1915]"
                        />
                    </g>
                )}
            </svg>

            {at && hover !== null && (
                <div
                    className="absolute pointer-events-none bg-neutral-900 dark:bg-neutral-100 text-[#faf9f7] dark:text-[#1a1915] rounded-xl px-2.5 py-2 text-[11px] leading-relaxed whitespace-nowrap z-10"
                    style={{
                        left: `min(max(${(X(hover) / W) * 100}% - 60px, 0px), calc(100% - 190px))`,
                        top: `max(${(Y(at.value) / H) * 100}% - 74px, 0px)`,
                    }}
                >
                    <span className="opacity-60">{at.year}년차</span>
                    <br />
                    평가금액 {won(at.value)}
                    <br />
                    <span className="opacity-60">
                        원금 {won(at.principal)} · 수익 {won(at.value - at.principal)}
                    </span>
                </div>
            )}
        </div>
    );
}
