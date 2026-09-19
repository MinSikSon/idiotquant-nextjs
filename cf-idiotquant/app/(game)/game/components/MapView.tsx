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

/** 협동에서 `heroes` 칸 번호마다의 색. 파티 줄도 이것을 쓴다. */
export const PARTY_INK = ["var(--rg-leader)", "var(--rg-mate)"];
/** 그 사람의 `@` 밑에 까는 바닥 — 글자색만으로는 작은 글씨에서 둘이 헷갈린다. */
export const PARTY_BG = ["var(--rg-leader-bg)", "var(--rg-mate-bg)"];

/** 글자 색 — **한 곳에서만 정한다.** 화면마다 정하면 같은 `@` 가 달라 보인다. */
const INK: Record<string, string> = {
    hero: "var(--rg-hero)",
    // 동료 — 나와 같은 `@` 이되 **색이 달라야** 「지금 내가 조종하는 쪽」이 보인다.
    ally: "var(--rg-ally)",
    monster: "var(--rg-monster)",
    // 감지 물약으로 벽 너머를 느끼는 것 — **본 것과 색이 달라야 한다.**
    // 같은 색으로 그리면 벽 뒤의 놈이 눈앞에 있는 것처럼 읽힌다.
    "monster-sensed": "var(--rg-monster-sensed)",
    "item-gold": "var(--rg-gold)",
    "item-potion": "var(--rg-potion)",
    "item-scroll": "var(--rg-scroll)",
    "item-weapon": "var(--rg-weapon)",
    "item-armor": "var(--rg-armor)",
    "item-food": "var(--rg-food)",
    "item-ring": "var(--rg-ring)",
    "item-wand": "var(--rg-wand)",
    "item-amulet": "var(--rg-amulet)",
    "item-relic": "var(--rg-gold)",
    "item-gem": "var(--rg-potion)",
    "champion-blazing": "var(--rg-trap)",
    "champion-shadow": "var(--rg-wand)",
    "champion-gilded": "var(--rg-gold)",
    "champion-swift": "var(--rg-ring)",
    "champion-vampiric": "var(--rg-potion)",
    trap: "var(--rg-trap)",
    "trap-dim": "var(--rg-trap-dim)",
    anvil: "var(--rg-anvil)",
    "anvil-dim": "var(--rg-anvil-dim)",
    stairs: "var(--rg-stairs)",
    door: "var(--rg-door)",
    "door-dim": "var(--rg-door-dim)",
    wall: "var(--rg-wall)",
    "wall-dim": "var(--rg-wall-dim)",
    floor: "var(--rg-floor)",
    "floor-dim": "var(--rg-floor-dim)",
    corridor: "var(--rg-corridor)",
    "corridor-dim": "var(--rg-corridor-dim)",
};

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}

/**
 * 글자 한 줄의 높이 ÷ 글꼴 크기 — 아래 `<pre>` 의 `leading-[1.32]` 와 **같은 수여야 한다.**
 *
 * 이름표가 칸 크기를 재는 데 쓴다. 잰 것은 칸의 폭·높이뿐이라, 거기서 글꼴 크기를
 * 되짚으려면 이 비율이 필요하다(`글꼴 = 칸높이 ÷ 이 값`). 클래스만 고치고 여기를
 * 안 고치면 이름표만 칸 밖으로 삐져나간다 — `test/rogue-layout.test.ts` 가 둘을 맞춰 본다.
 */
const LEADING = 1.32;

/**
 * 지도 위의 **이름표** — 넉 자를 2×2 로, 그 사람이 선 **한 칸에** 앉힌다.
 *
 * ── 왜 칸 안에 그리나 ────────────────────────────────────────────────
 * 지도는 고정폭 글자판 한 장이라(`못 박은 규칙 4`) 한 칸에 두 칸짜리를 넣으면 **그 줄의
 * 오른쪽이 통째로 밀린다** — 벽 `|` 이 위아래 줄과 어긋난다. 그래서 폭이 정확히 한 칸인
 * 상자를 그 칸 **위에 덮는다.** 덮는 것은 제 `@` 하나뿐이라 가리는 것도 없다.
 *
 * ── 크기 ────────────────────────────────────────────────────────────
 * 390px 에서 한 칸은 **7.8 × 17.16px**. 넉 자를 한 줄에 놓으면 글자 하나가 1.95px 라
 * 브라우저가 그리지도 못한다(재 봤다 — 얼룩으로 나온다). **두 줄로 나누면** 줄당
 * 8.58px 을 쓰고, 가로만 눌러(`scaleX`) 두 글자를 한 칸 폭에 앉힌다.
 * 세로를 안 줄이는 것이 핵심이다 — 균등 축소면 6.5px 로 떨어진다.
 *
 * ── 안 그리는 때 ────────────────────────────────────────────────────
 * **쓰러진 사람에게는 안 붙인다.** `†` 를 덮어 버리면 생사가 지도에서 안 보인다.
 * 이름이 없으면(혼자 하는 판) 당연히 안 붙는다 — `@` 그대로다.
 */
function NickTag({ nick, ink, bg, cell, left, top }: {
    nick: string;
    ink: string;
    bg?: string;
    cell: { w: number; h: number };
    left: number;
    top: number;
}) {
    const font = cell.h / 2;
    // 안 누른 두 글자의 폭 — 한 글자의 폭(`cell.w`)은 지도 글꼴 크기(`cell.h / LEADING`)의 것이라
    // 이 글꼴 크기로 환산해서 잡는다.
    const natural = 2 * cell.w * (font / (cell.h / LEADING));
    return (
        <span
            aria-hidden
            className="pointer-events-none absolute overflow-hidden"
            style={{ left, top, width: cell.w, height: cell.h, backgroundColor: bg }}
        >
            <span
                className="absolute top-1/2 left-0 text-center font-[family-name:var(--font-plex-mono)] font-bold whitespace-pre"
                style={{
                    width: natural,
                    color: ink,
                    fontSize: font,
                    lineHeight: 1,
                    transform: `translateY(-50%) scaleX(${cell.w / natural})`,
                    transformOrigin: "left center",
                }}
            >
                {nick.slice(0, 2)}
                {nick.length > 2 ? "\n" : ""}
                {nick.slice(2, 4)}
            </span>
        </span>
    );
}

interface Run {
    text: string;
    ink: string;
    bg?: string;
}

/**
 * 불 켜진 방에 **처음 들어설 때** 한 겹씩 밝아지는 중 — 선 자리에서 `r` 칸까지만 보이고
 * 나머지 방 안은 아직 어둡다. 화면의 연출이라 판(`GameState`)에는 없다.
 */
export interface Reveal {
    cx: number;
    cy: number;
    r: number;
    room: { x: number; y: number; w: number; h: number };
}

export interface CellFlash {
    ink?: string;
    bg?: string;
}

export default function MapView({
    state,
    who = 0,
    cellFlashes = {},
    shake = false,
    reveal,
}: {
    state: GameState;
    /** 이 화면이 **조종하는** 영웅. 지도는 그 사람을 가운데 두고, 그 사람만 밝게 그린다. */
    who?: number;
    cellFlashes?: Record<string, CellFlash>;
    shake?: boolean;
    reveal?: Reveal | null;
}) {
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

    // **조종하는 사람을 가운데 둔다** — 온라인이면 화면마다 가운데가 다르다.
    const me = state.heroes[who] ?? state.heroes[0];
    const ox = clamp(me.x - Math.floor(view.cols / 2), 0, MAP_W - view.cols);
    const oy = clamp(me.y - Math.floor(view.rows / 2), 0, MAP_H - view.rows);

    const rows: Run[][] = [];
    for (let y = oy; y < oy + view.rows; y++) {
        const runs: Run[] = [];
        for (let x = ox; x < ox + view.cols; x++) {
            // 밝아지는 중인 방 — 아직 빛이 안 닿은 칸은 **비워 둔다.** 처음 들어선 방이라
            // 기억도 없어서, 비워 두는 것이 곧 「아직 못 봤다」와 같다.
            if (
                reveal &&
                x >= reveal.room.x &&
                x < reveal.room.x + reveal.room.w &&
                y >= reveal.room.y &&
                y < reveal.room.y + reveal.room.h &&
                Math.max(Math.abs(x - reveal.cx), Math.abs(y - reveal.cy)) > reveal.r
            ) {
                const last0 = runs[runs.length - 1];
                if (last0 && last0.ink === "transparent" && !last0.bg) last0.text += " ";
                else runs.push({ text: " ", ink: "transparent" });
                continue;
            }
            const g = glyphAt(state, x, y, who);
            const ch = g?.ch ?? " ";
            const flash = cellFlashes[`${x},${y}`];
            // 협동이면 `@` 는 **사람마다 정한 색** — 조종을 넘겨도 누가 누구인지 안 바뀐다.
            const p = (g?.kind === "hero" || g?.kind === "ally") && state.heroes.length > 1
                ? state.heroes.findIndex((h) => h.x === x && h.y === y)
                : -1;
            const ink = flash?.ink ?? PARTY_INK[p] ?? (g ? (INK[g.kind] ?? "var(--rg-wall)") : "transparent");
            const bg = flash?.bg ?? PARTY_BG[p];
            const last = runs[runs.length - 1];
            if (last && last.ink === ink && last.bg === bg) {
                last.text += ch;
            } else {
                runs.push({ text: ch, ink, bg });
            }
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

            <div className={`relative inline-block ${shake ? "shake-crit" : ""}`}>
                <pre
                    aria-label={`지하 ${state.level.depth}층 지도`}
                    className="m-0 select-none whitespace-pre font-[family-name:var(--font-plex-mono)] text-[13px] leading-[1.32] sm:text-[15px]"
                >
                    {rows.map((runs, i) => (
                        <div key={i}>
                            {runs.map((r, j) => (
                                <span key={j} style={{ color: r.ink, backgroundColor: r.bg }}>
                                    {r.text}
                                </span>
                            ))}
                        </div>
                    ))}
                </pre>
                {/* **이름표** — 화면 **안**에 서 있고 이름이 있는 사람에게만.
                    화면 밖은 아래의 화살표가 맡는다. */}
                {state.heroes.map((h, i) => {
                    if (!h.nick || h.hp <= 0 || h.x < 0) return null;
                    const cx = h.x - ox;
                    const cy = h.y - oy;
                    if (cx < 0 || cy < 0 || cx >= view.cols || cy >= view.rows) return null;
                    return (
                        <NickTag
                            key={i}
                            nick={h.nick}
                            ink={PARTY_INK[i] ?? INK[i === who ? "hero" : "ally"]}
                            bg={PARTY_BG[i]}
                            cell={cell}
                            left={cx * cell.w}
                            top={cy * cell.h}
                        />
                    );
                })}

                {/* **화면 밖의 동료** — 좁은 화면에서 지도가 나를 따라가면 동료가 잘려 나간다.
                    그 사람 쪽 가장자리에 제 색 화살표와 거리(칸)를 세운다. */}
                {state.heroes.map((h, i) => {
                    if (i === who || h.x < 0) return null;
                    const dx = h.x < ox ? -1 : h.x >= ox + view.cols ? 1 : 0;
                    const dy = h.y < oy ? -1 : h.y >= oy + view.rows ? 1 : 0;
                    if (!dx && !dy) return null;
                    const arrow = ["↖", "↑", "↗", "←", "", "→", "↙", "↓", "↘"][(dy + 1) * 3 + dx + 1];
                    const dist = Math.max(Math.abs(h.x - me.x), Math.abs(h.y - me.y));
                    // 이름이 있으면 `2P` 대신 그것을 적는다 — 여기는 한 칸이 아니라 띄운
                    // 표라서 넉 자가 그대로 들어간다.
                    const tag = h.nick ?? `${i + 1}P`;
                    return (
                        <span
                            key={i}
                            aria-label={`${tag} 는 화면 밖 ${dist}칸`}
                            className="pointer-events-none absolute whitespace-nowrap rounded-[2px] px-1 font-[family-name:var(--font-plex-mono)] text-[11px] font-bold leading-[1.4]"
                            style={{
                                color: PARTY_INK[i],
                                backgroundColor: PARTY_BG[i],
                                outline: `1px solid ${PARTY_INK[i]}`,
                                ...(dx < 0 ? { left: 0 } : dx > 0 ? { right: 0 } : { left: (h.x - ox) * cell.w, transform: "translateX(-50%)" }),
                                ...(dy < 0 ? { top: 0 } : dy > 0 ? { bottom: 0 } : { top: (h.y - oy) * cell.h, transform: dx ? undefined : "translateX(-50%)" }),
                            }}
                        >
                            {dx < 0 || (!dx && dy) ? arrow : ""}
                            {h.hp > 0 ? "@" : "†"}
                            {tag} {dist}
                            {dx > 0 ? arrow : ""}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}
