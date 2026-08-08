"use client";

// 탄탄함 좌표평면.
//
// 지금까지 탄탄함은 0~100 막대 하나였다. 그런데 그 숫자는 두 가지를 눌러 합친 값이다 —
// "얼마나 싼가"와 "실제로 회수할 수 있는가". 둘을 합치면 성격이 정반대인 포트폴리오가
// 같은 점수에 앉는다. 싸지만 정리매매가 섞인 목록과, 안 싸지만 전부 멀쩡한 목록이
// 똑같이 72로 보인다.
//
// 그래서 두 축으로 편다.
//   X — 저평가 (computeValueScore)
//   Y — 회수 가능성 (riskFactor)
//
// Y축 경계 75는 임의로 고른 값이 아니다. riskFactor 0.3·0.5·0.7 구간은 목록에서
// 빨간 배지가 붙는 종목(정리매매·거래정지·관리종목·투자위험·투자경고)과 정확히 같은
// 집합이고, 0.85 이상이 노란 배지·무배지다. 화면에 이미 보이는 선을 그대로 쓴다.
//
// 가장 중요한 칸은 오른쪽 아래 "함정"이다. 폐지가 확정되면 주가가 먼저 무너져
// 청산가치 대비 저평가 점수가 오히려 올라가므로, 싸다는 이유만 보면 상위에 온다.

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import {
    SAFETY_LINE, VALUE_LINE,
    type SolidityPoint, type Quadrant,
} from "@/lib/utils/portfolioSolidity";

const QUADRANT_LABEL: Record<Quadrant, string> = {
    solid: "탄탄",
    trap: "함정",
    plain: "무난",
    weak: "취약",
};

const QUADRANT_DESC: Record<Quadrant, string> = {
    solid: "싸고, 지금 팔 수 있습니다",
    trap: "싼 이유가 위험일 수 있습니다",
    plain: "안전하지만 특별히 싸지는 않습니다",
    weak: "싸지도 안전하지도 않습니다",
};

// 좌표계 — 0~100 을 그대로 쓰고 여백만 둔다
const PAD = { l: 7, r: 7, t: 7, b: 7 };
const W = 100 + PAD.l + PAD.r;
const H = 100 + PAD.t + PAD.b;
const px = (v: number) => PAD.l + v;
const py = (v: number) => PAD.t + (100 - v);   // Y 는 위가 큰 값

export default function SolidityPlane({
    points, value, safety, trapCount, sample = false,
}: {
    points: SolidityPoint[];
    /** 포트폴리오 평균 — 큰 표식 */
    value: number;
    safety: number;
    trapCount: number;
    /** 아직 담은 종목이 없는 사용자에게 개념만 보여주는 예시. 오른쪽 설명이 바뀐다. */
    sample?: boolean;
}) {
    const uid = useId();
    const [active, setActive] = useState<SolidityPoint | null>(null);

    // 같은 좌표에 여러 종목이 겹치면 한 점처럼 보인다. 살짝 흩어 개수가 드러나게 한다.
    // 흩어는 폭은 눈금 1칸 미만이라 사분면 판정을 넘지 않는다.
    const spread = new Map<string, number>();
    const placed = points.map(p => {
        const key = `${p.value}:${p.safety}`;
        const n = spread.get(key) ?? 0;
        spread.set(key, n + 1);
        const ring = Math.floor(n / 6);
        const ang = (n % 6) * (Math.PI / 3) + ring * 0.5;
        const r = n === 0 ? 0 : 1.6 + ring * 1.5;
        return { ...p, cx: px(p.value) + Math.cos(ang) * r, cy: py(p.safety) + Math.sin(ang) * r };
    });

    /** 누른 지점에서 가장 가까운 종목. viewBox 와 실제 크기의 비율만 맞추면 되므로 좌표 변환은 선형이다. */
    function nearest(e: React.PointerEvent<SVGRectElement>): SolidityPoint | null {
        const box = e.currentTarget.getBoundingClientRect();
        if (!box.width || !box.height) return null;
        const x = ((e.clientX - box.left) / box.width) * W;
        const y = ((e.clientY - box.top) / box.height) * H;
        let best: (typeof placed)[number] | null = null;
        let bestD = Infinity;
        for (const p of placed) {
            const d = (p.cx - x) ** 2 + (p.cy - y) ** 2;
            if (d < bestD) { bestD = d; best = p; }
        }
        // 판의 빈 구석을 눌렀을 때까지 억지로 집지는 않는다
        return best && bestD <= 22 ** 2 ? best : null;
    }

    return (
        <div className="px-5 pt-1 pb-3">
            <div className="flex items-start gap-3">
                {/* ── 평면 ─────────────────────────────────────────── */}
                <div className="relative shrink-0 w-[9.5rem] sm:w-[11rem]">
                    <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="w-full h-auto overflow-visible"
                        role="img"
                        aria-label={`관심 종목 ${points.length}개의 저평가·회수 가능성 분포. 함정 구역 ${trapCount}종목.`}
                    >
                        {/* 함정 칸만 바탕을 깐다 — 눈이 먼저 가야 하는 곳이다 */}
                        <rect
                            x={px(VALUE_LINE)} y={py(SAFETY_LINE)}
                            width={100 - VALUE_LINE} height={SAFETY_LINE}
                            className="fill-rose-500/[0.07] dark:fill-rose-400/[0.09]"
                        />
                        {/* 축 */}
                        <line x1={px(0)} y1={py(0)} x2={px(100)} y2={py(0)}
                              className="stroke-neutral-300 dark:stroke-[#4a4741]" strokeWidth=".7" />
                        <line x1={px(0)} y1={py(0)} x2={px(0)} y2={py(100)}
                              className="stroke-neutral-300 dark:stroke-[#4a4741]" strokeWidth=".7" />
                        {/* 사분면 경계 */}
                        <line x1={px(VALUE_LINE)} y1={py(0)} x2={px(VALUE_LINE)} y2={py(100)}
                              className="stroke-neutral-200 dark:stroke-[#3a3833]" strokeWidth=".6" strokeDasharray="2 2" />
                        <line x1={px(0)} y1={py(SAFETY_LINE)} x2={px(100)} y2={py(SAFETY_LINE)}
                              className="stroke-neutral-200 dark:stroke-[#3a3833]" strokeWidth=".6" strokeDasharray="2 2" />

                        {/* 사분면 이름 — 위쪽 두 칸은 경계선 바로 위에 붙인다.
                            정상 종목은 회수 100에 몰려 위 모서리를 채우므로, 거기 두면 점에 가린다. */}
                        <text x={px(97)} y={py(SAFETY_LINE) - 2.5} textAnchor="end"
                              className="fill-neutral-300 dark:fill-[#57534a] text-[7px] font-black">탄탄</text>
                        <text x={px(3)} y={py(SAFETY_LINE) - 2.5}
                              className="fill-neutral-300 dark:fill-[#57534a] text-[7px] font-black">무난</text>
                        <text x={px(3)} y={py(3)}
                              className="fill-neutral-300 dark:fill-[#57534a] text-[7px] font-black">취약</text>
                        <text x={px(97)} y={py(3)} textAnchor="end"
                              className="fill-rose-400 dark:fill-rose-500/80 text-[7px] font-black">함정</text>

                        {/* Y축 이름 — CSS 로 겹쳐 놓으면 축선과 붙으므로 SVG 안에서 회전시킨다 */}
                        <text x={PAD.l - 2.5} y={py(50)} textAnchor="middle"
                              transform={`rotate(-90 ${PAD.l - 2.5} ${py(50)})`}
                              className="fill-neutral-400 dark:fill-neutral-500 text-[6.5px] font-bold">
                            회수 가능성 →
                        </text>

                        {/* 종목 점 — 그리기만 한다. 손가락으로 6px 점을 정확히 누를 수는 없어서
                            집는 일은 아래 판 전체가 맡는다. */}
                        {placed.map((p, i) => (
                            <circle
                                key={`${uid}-${p.ticker}-${i}`}
                                cx={p.cx} cy={p.cy} r={active?.ticker === p.ticker ? 3.6 : 2.4}
                                className={cn(
                                    "pointer-events-none transition-all",
                                    p.quadrant === "trap"
                                        ? "fill-rose-500 dark:fill-rose-400"
                                        : p.quadrant === "solid"
                                            ? "fill-[#16a34a] dark:fill-[#22c55e]"
                                            : "fill-neutral-300 dark:fill-[#57534a]"
                                )}
                            >
                                <title>{`${p.name} · 저평가 ${p.value} · 회수 ${p.safety}`}</title>
                            </circle>
                        ))}

                        {/* 포트폴리오 평균 — 십자로 그려 종목 점과 섞이지 않게 한다 */}
                        <g className="pointer-events-none">
                            <line x1={px(value) - 5} y1={py(safety)} x2={px(value) + 5} y2={py(safety)}
                                  className="stroke-neutral-900 dark:stroke-neutral-100" strokeWidth="1.1" />
                            <line x1={px(value)} y1={py(safety) - 5} x2={px(value)} y2={py(safety) + 5}
                                  className="stroke-neutral-900 dark:stroke-neutral-100" strokeWidth="1.1" />
                            <circle cx={px(value)} cy={py(safety)} r="2.2"
                                    className="fill-white dark:fill-[#242320] stroke-neutral-900 dark:stroke-neutral-100"
                                    strokeWidth="1.1" />
                        </g>

                        {/* 집는 판 — 판 위 아무 데나 누르면 가장 가까운 종목이 잡힌다.
                            점 하나는 화면에서 6px 남짓이라 손가락으로 겨냥할 수 없고,
                            20종목이 150px 안에 들어가므로 점마다 큰 터치 영역을 두면 서로 겹친다. */}
                        <rect
                            x="0" y="0" width={W} height={H} fill="transparent"
                            className="cursor-pointer touch-none"
                            onPointerMove={e => { if (e.pointerType === "mouse") setActive(nearest(e)); }}
                            onPointerDown={e => setActive(nearest(e))}
                            onPointerLeave={e => { if (e.pointerType === "mouse") setActive(null); }}
                        />
                    </svg>

                    {/* X축 이름 */}
                    <div className="flex items-center justify-between mt-0.5 pl-3 text-[9px] font-bold text-neutral-400 dark:text-neutral-500">
                        <span>← 비쌈</span>
                        <span>저평가 →</span>
                    </div>
                </div>

                {/* ── 읽는 법 ──────────────────────────────────────── */}
                <div className="flex-1 min-w-0 pt-1">
                    {active ? (
                        <div>
                            <p className="text-[11px] font-black text-neutral-800 dark:text-neutral-200 truncate">
                                {active.name}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-400 mt-0.5 tabular-nums">
                                저평가 {active.value} · 회수 {active.safety}
                            </p>
                            <p className={cn(
                                "text-[10px] font-bold mt-1",
                                active.quadrant === "trap"
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-neutral-500 dark:text-neutral-400"
                            )}>
                                {QUADRANT_LABEL[active.quadrant]} — {QUADRANT_DESC[active.quadrant]}
                            </p>
                        </div>
                    ) : sample ? (
                        <div>
                            <p className="text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-300">
                                가로는 <b className="font-black text-[#16a34a] dark:text-[#22c55e]">얼마나 싼가</b>,
                                세로는 <b className="font-black text-[#16a34a] dark:text-[#22c55e]">지금 팔 수 있는가</b>입니다.
                            </p>
                            <p className="text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-1.5">
                                오른쪽 아래 <b className="font-bold text-rose-600 dark:text-rose-400">함정</b>은
                                싼 이유가 상장폐지인 종목입니다. 관심 종목을 담으면 여기 들어온 것을 알려드립니다.
                            </p>
                        </div>
                    ) : trapCount > 0 ? (
                        <div>
                            <p className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                                함정 구역 {trapCount}종목
                            </p>
                            <p className="text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-1">
                                싼데 지금 팔기 어려운 종목입니다. 폐지가 확정되면 주가가 먼저
                                무너져 <b className="font-bold">더 싸 보이게</b> 됩니다.
                            </p>
                            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1.5">
                                점을 눌러 종목을 확인하세요.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[11px] font-black text-[#16a34a] dark:text-[#22c55e]">
                                함정 구역 없음
                            </p>
                            <p className="text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400 mt-1">
                                오른쪽 위로 갈수록 싸면서 팔 수 있는 종목입니다.
                                십자는 관심 목록 전체의 평균입니다.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
