"use client";

/**
 * 던전 — 고정폭 글자 한 판.
 *
 * 캔버스를 안 쓴다. 80×22 짜리 글자판은 DOM 이 그리는 것이 본업이고, 그러면 글꼴·확대·
 * 선택·스크린리더가 전부 공짜로 따라온다. 예전 게임이 캔버스라 손으로 만들어야 했던
 * 것들이다.
 *
 * **한 칸에 한 엘리먼트를 두지 않는다.** 1,760개를 매 턴 새로 만들면 폰에서 눈에 띄게
 * 느리다. 같은 색이 이어지는 구간을 한 덩어리로 묶어 그린다 — 던전은 바닥과 바위가
 * 길게 이어지므로 실제로는 줄당 대여섯 덩이면 끝난다.
 *
 * **화면이 지도보다 좁으면 나를 따라다닌다.** 폰의 390px 에 80칸을 밀어 넣으면 한 칸이
 * 4.8px 이라 글자가 안 읽힌다. 글자 크기를 재서 들어갈 만큼만 잘라 보여 주고, 창은
 * `@` 를 가운데 둔다.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { glyphAt } from "@/lib/rogue/game";
import { MAP_H, MAP_W, type GameState } from "@/lib/rogue/types";

/** 글자 색 — **한 곳에서만 정한다.** 화면마다 정하면 같은 `@` 가 달라 보인다. */
const INK: Record<string, string> = {
    hero: "#ffffff",
    monster: "#f2884b",
    "item-gold": "#ffd24a",
    "item-potion": "#d987c4",
    "item-scroll": "#cfe3f5",
    "item-weapon": "#c3ced6",
    "item-armor": "#8fb6cf",
    "item-food": "#cfa878",
    "item-amulet": "#ffe27a",
    stairs: "#f0f0f0",
    door: "#c08a45",
    "door-dim": "#6a5029",
    wall: "#8a9a95",
    "wall-dim": "#4a5653",
    floor: "#5f706b",
    "floor-dim": "#39423f",
    corridor: "#6b7c77",
    "corridor-dim": "#3d4845",
};

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

interface Run {
    text: string;
    ink: string;
}

export default function MapView({ state }: { state: GameState }) {
    const boxRef = useRef<HTMLDivElement>(null);
    const probeRef = useRef<HTMLSpanElement>(null);
    const [cell, setCell] = useState({ w: 8.4, h: 17 });
    const [view, setView] = useState({ cols: MAP_W, rows: MAP_H });

    // 글자 한 칸이 실제로 몇 px 인지 재 본다. 글꼴이 늦게 와도 다시 잰다.
    useLayoutEffect(() => {
        const probe = probeRef.current;
        if (!probe) return;
        const measure = () => {
            const r = probe.getBoundingClientRect();
            if (r.width > 0) setCell({ w: r.width / 20, h: r.height });
        };
        measure();
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        fonts?.ready?.then(measure).catch(() => {});
    }, []);

    useEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const fit = () => {
            const r = box.getBoundingClientRect();
            setView({
                cols: clamp(Math.floor(r.width / cell.w), 20, MAP_W),
                rows: clamp(Math.floor(r.height / cell.h), 8, MAP_H),
            });
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(box);
        return () => ro.disconnect();
    }, [cell]);

    const ox = clamp(state.hero.x - Math.floor(view.cols / 2), 0, MAP_W - view.cols);
    const oy = clamp(state.hero.y - Math.floor(view.rows / 2), 0, MAP_H - view.rows);

    const rows: Run[][] = [];
    for (let y = oy; y < oy + view.rows; y++) {
        const runs: Run[] = [];
        for (let x = ox; x < ox + view.cols; x++) {
            const g = glyphAt(state, x, y);
            const ch = g?.ch ?? " ";
            const ink = g ? (INK[g.kind] ?? "#8a9a95") : "transparent";
            const last = runs[runs.length - 1];
            if (last && last.ink === ink) last.text += ch;
            else runs.push({ text: ch, ink });
        }
        rows.push(runs);
    }

    return (
        // 지도는 가운데에 선다. 왼쪽에 붙여 두면 넓은 화면에서 던전이 한쪽 구석에 몰리고
        // 오른쪽 절반이 통째로 검은 여백이 된다 — 예전 게임이 겪은 그 자리다.
        <div ref={boxRef} className="relative grid h-full w-full place-items-center overflow-hidden">
            {/* 재기용. 화면 밖에 두되 display:none 은 안 된다 — 크기가 0 이 된다. */}
            <span
                ref={probeRef}
                aria-hidden
                className="pointer-events-none absolute -left-[9999px] top-0 whitespace-pre font-[family-name:var(--font-plex-mono)] text-[13px] leading-[1.32] sm:text-[15px]"
            >
                00000000000000000000
            </span>

            <pre
                aria-label={`지하 ${state.level.depth}층 지도`}
                className="m-0 select-none whitespace-pre font-[family-name:var(--font-plex-mono)] text-[13px] leading-[1.32] sm:text-[15px]"
            >
                {rows.map((runs, i) => (
                    <div key={i}>
                        {runs.map((r, j) => (
                            <span key={j} style={{ color: r.ink }}>
                                {r.text}
                            </span>
                        ))}
                    </div>
                ))}
            </pre>
        </div>
    );
}
