/**
 * 지팡이 연출 표 — 화면의 그림일 뿐 규칙이 아니다(엔진은 `projectile.fx` 에 지팡이 종류만 남긴다).
 * `.tsx` 밖에 두는 까닭: 테스트가 프레임을 직접 만들어 보려면 JSX 없이 읽혀야 한다(`monsterArt.ts` 와 같다).
 */

import { idx, inBounds } from "@/lib/rogue/types";

/** 한 칸의 번쩍임 — `MapView` 의 `CellFlash` 와 같은 모양이다. */
export interface ZapFlash {
    ink?: string;
    bg?: string;
}

/**
 * 지팡이마다의 사용 연출 — **이름과 효과에 맞춘 움직임**이다. 그림일 뿐 규칙이 아니다 — 키는 `WANDS` 의 키.
 *
 *   · `bolt`  — 한 점이 날아간다. `tail` 칸만큼 옅은 꼬리를 끈다.
 *   · `beam`  — 광선이 쏜 자리부터 **늘어나** 끝에 닿은 뒤 잠깐 남는다(화염·냉기).
 *   · `flash` — 길 전체가 **한 번에** 번쩍이며 몇 번 튄다(번개).
 *
 * `glyphs` 는 머리 글자를 걸음마다 돌린다(없으면 엔진이 남긴 글자). `burst` 는 착탄이
 * 번지는 반경(0 = 그 칸), `bothEnds` 는 쏜 자리도 같이 번쩍인다(위치 교환).
 */
export interface ZapFx {
    mode: "bolt" | "beam" | "flash";
    /** 한 걸음(한 프레임)의 길이 — 둔화는 느리게, 가속은 빠르게. */
    stepMs: number;
    ink: string;
    tailInk?: string;
    glyphs?: string[];
    tailGlyph?: string;
    tail?: number;
    impact: ZapFlash;
    /** 착탄 둘레(반경 안, 가운데 빼고)의 번쩍임 — 없으면 `impact` 를 옅게 쓴다. */
    ring?: ZapFlash;
    burst?: number;
    impactMs: number;
    bothEnds?: boolean;
    /** 부순 벽 칸(`projectile.dug`)마다 `impact` 로 흙먼지를 일으킨다(굴착). */
    crumble?: boolean;
    shake?: boolean;
}

export const ZAP_FX: Record<string, ZapFx> = {
    // 반짝이는 별 하나가 보랏빛 잔광을 끌고 날아가 톡 터진다.
    "magic missile": { mode: "bolt", stepMs: 40, ink: "var(--rg-wand)", glyphs: ["*", "+"], tail: 1, tailGlyph: ".", tailInk: "var(--rg-wand)", impact: { ink: "var(--rg-wand)", bg: "rgba(139, 92, 246, 0.35)" }, impactMs: 240 },
    // 길 전체가 한꺼번에 번쩍이며 지직거리고, 끝에서 사방으로 튄다. 화면이 흔들린다.
    lightning: { mode: "flash", stepMs: 70, ink: "var(--rg-gold)", glyphs: ["*", "~"], impact: { ink: "var(--rg-gold)", bg: "rgba(250, 204, 21, 0.55)" }, ring: { bg: "rgba(250, 204, 21, 0.25)" }, burst: 1, impactMs: 260, shake: true },
    // 불길이 뻗어 나가며 뒤로 불꽃 길을 남기고, 끝에서 크게 번진다.
    fire: { mode: "beam", stepMs: 35, ink: "var(--rg-trap)", glyphs: ["*", "&"], tailInk: "var(--rg-anvil)", impact: { ink: "var(--rg-trap)", bg: "rgba(249, 115, 22, 0.55)" }, ring: { bg: "rgba(239, 68, 68, 0.28)" }, burst: 1, impactMs: 340 },
    // 얼음 광선이 천천히 뻗고, 끝이 얼어붙은 듯 오래 남는다.
    cold: { mode: "beam", stepMs: 50, ink: "var(--rg-scroll)", glyphs: ["*"], tailInk: "var(--rg-scroll)", impact: { ink: "var(--rg-scroll)", bg: "rgba(56, 189, 248, 0.5)" }, ring: { bg: "rgba(186, 230, 253, 0.3)" }, burst: 1, impactMs: 520 },
    // 바위를 갈아 내며 **굴이 늘어난다**(앞머리는 늘 굴 글자 `#`) — 지나온 자리에 부스러기(`:`)가 남고, 부순 벽 칸마다
    // 흙먼지가 일며 끝에서 먼지가 둘레로 퍼진다. 화면이 묵직하게 흔들린다.
    digging: { mode: "beam", stepMs: 85, ink: "var(--rg-anvil)", glyphs: ["#"], tailGlyph: ":", tailInk: "var(--rg-door)", impact: { ink: "var(--rg-door)", bg: "rgba(146, 64, 14, 0.5)" }, ring: { bg: "rgba(180, 120, 60, 0.25)" }, burst: 1, crumble: true, impactMs: 420, shake: true },
    // 은빛 고리가 오가고, **쏜 자리와 맞은 자리가 함께** 번쩍인다 — 자리가 바뀌었다.
    swapping: { mode: "bolt", stepMs: 30, ink: "var(--rg-weapon)", glyphs: ["o", "0"], impact: { ink: "var(--rg-weapon)", bg: "rgba(148, 163, 184, 0.5)" }, impactMs: 320, bothEnds: true },
    // 바람 물결이 길게 꼬리를 끌며 휩쓸고 지나간다.
    gust: { mode: "bolt", stepMs: 30, ink: "var(--rg-ring)", glyphs: ["~", "="], tail: 3, tailGlyph: "~", tailInk: "var(--rg-ring)", impact: { ink: "var(--rg-ring)", bg: "rgba(45, 212, 191, 0.35)" }, impactMs: 220 },
    // 느릿느릿 기어가고, 맞은 자리가 오래 가라앉는다.
    "slow monster": { mode: "bolt", stepMs: 110, ink: "var(--rg-armor)", glyphs: [":", "."], impact: { ink: "var(--rg-armor)", bg: "rgba(59, 130, 246, 0.35)" }, impactMs: 600 },
    // 번개처럼 빠르게 긴 잔상을 남기고 꽂힌다.
    "haste monster": { mode: "bolt", stepMs: 15, ink: "var(--rg-fourth)", glyphs: ["!"], tail: 3, tailGlyph: "-", tailInk: "var(--rg-fourth)", impact: { ink: "var(--rg-fourth)", bg: "rgba(245, 158, 11, 0.4)" }, impactMs: 180 },
    // 깜빡이며 날아가 맞은 자리 둘레가 일렁인다 — 어딘가로 사라졌다.
    "teleport away": { mode: "bolt", stepMs: 45, ink: "var(--rg-potion)", glyphs: ["?", "*"], impact: { ink: "var(--rg-potion)", bg: "rgba(217, 70, 239, 0.45)" }, ring: { bg: "rgba(217, 70, 239, 0.2)" }, burst: 1, impactMs: 360 },
    // 잿빛 가위표가 날아가 맞은 자리의 기운을 빼앗는다 — 어둡게 가라앉는다.
    cancel: { mode: "bolt", stepMs: 60, ink: "var(--rg-faint)", glyphs: ["x", "+"], impact: { ink: "var(--rg-faint)", bg: "rgba(51, 65, 85, 0.55)" }, impactMs: 440 },
};

export type ZapCell = { x: number; y: number; ch: string; ink?: string };

/** 지팡이가 지난 길을 비추는 화면용 시야. 탐험 기록은 바꾸지 않는다. */
export function zapLight(flags: Uint8Array, path: { x: number; y: number }[]): Uint8Array {
    const lit = flags.slice();
    for (const shot of path) {
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const x = shot.x + dx;
            const y = shot.y + dy;
            if (!inBounds(x, y)) continue;
            const i = idx(x, y);
            lit[i] |= 3;
        }
    }
    return lit;
}

/** 궤적을 프레임들로 — 한 프레임은 그 순간 지도 위에 얹을 글자들이다. */
export function zapFrames(fx: ZapFx, cells: { x: number; y: number; ch: string }[]): ZapCell[][] {
    const head = (i: number, ch: string) => fx.glyphs?.[i % fx.glyphs.length] ?? ch;
    if (fx.mode === "flash") {
        // 세 번 튄다 — 칸마다 글자를 번갈아 지직거리게 한다.
        return [0, 1, 2].map((k) => cells.map((c, j) => ({ ...c, ch: (j + k) % 2 ? head(1, c.ch) : c.ch, ink: fx.ink })));
    }
    const frames = cells.map((c, i) => {
        const frame: ZapCell[] = [];
        const from = fx.mode === "beam" ? 0 : Math.max(0, i - (fx.tail ?? 0));
        for (let j = from; j < i; j++) frame.push({ ...cells[j]!, ch: fx.tailGlyph ?? cells[j]!.ch, ink: fx.tailInk ?? fx.ink });
        frame.push({ ...c, ch: head(i, c.ch), ink: fx.ink });
        return frame;
    });
    // 광선은 끝에 닿은 모습으로 한 번 더 머문다.
    if (fx.mode === "beam") frames.push(cells.map((c) => ({ ...c, ch: fx.tailGlyph ?? c.ch, ink: fx.tailInk ?? fx.ink })));
    return frames;
}

/** 착탄의 번쩍임 — 끝 칸(과 둘레), 위치 교환이면 쏜 자리도, 굴착이면 부순 벽 칸마다. */
export function zapImpact(fx: ZapFx, end: { x: number; y: number }, from?: { x: number; y: number }, dug: { x: number; y: number }[] = []): Record<string, ZapFlash> {
    const out: Record<string, ZapFlash> = {};
    const r = fx.burst ?? 0;
    const ring = fx.ring ?? { bg: fx.impact.bg };
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) out[`${end.x + dx},${end.y + dy}`] = dx || dy ? ring : fx.impact;
    if (fx.bothEnds && from) out[`${from.x},${from.y}`] = fx.impact;
    if (fx.crumble) for (const c of dug) out[`${c.x},${c.y}`] = fx.impact;
    return out;
}
