/**
 * 무엇이 보이는가 — Rogue 원작의 방식.
 *
 * 그림자 캐스팅을 쓰지 않는다. 원작은 훨씬 단순하고, 그 단순함이 곧 이 게임의 긴장이다.
 *
 *   · **밝은 방**에 들어서면 그 방이 통째로 보인다 (벽과 문까지).
 *   · **어두운 방과 복도**에서는 **맞닿은 여덟 칸**만 보인다.
 *   · 한 번 본 칸은 **기억**에 남아 흐리게 그려진다. 다만 **몬스터는 기억되지 않는다** —
 *     지금 보이는 놈만 화면에 선다. 기억된 지도 위에 없는 몬스터를 그리면 그건 지도가
 *     아니라 거짓말이다.
 *
 * 그래서 어두운 층에서는 지도를 **걸어서** 그려야 하고, 그 걸음이 곧 배고픔이다.
 */

import {
    type Level,
    MAP_H,
    MAP_W,
    type Pos,
    T,
    type Tile,
    idx,
    inBounds,
} from "./types";

export const SEEN = 1;
export const VISIBLE = 2;

/** 그 칸이 어느 방의 **안쪽**인가. 벽·문·복도면 -1. */
export function roomOf(level: Level, x: number, y: number): number {
    return inBounds(x, y) ? level.roomAt[idx(x, y)] : -1;
}

/**
 * 그 칸을 **사각형 안에 품는** 방. 벽과 문까지 친다.
 *
 * `roomAt` 은 안쪽에만 박혀 있어서 **문 위에 서면 -1** 이다. 그것 때문에 문턱에 선 채로는
 * 방이 안 밝혀졌다 — 「방에 들어갔는데 깜깜하다」가 그 자리였다. 방은 아홉 개뿐이라
 * 훑어도 싸다.
 */
export function roomAround(level: Level, x: number, y: number): number {
    for (let i = 0; i < level.rooms.length; i++) {
        const r = level.rooms[i];
        if (r.gone) continue;
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
    }
    return -1;
}

/** 시야를 보태는 사람 — 영웅 하나. 눈이 멀었으면 발밑만 보탠다. */
export type Viewer = Pos & { blind?: number; pack?: { kind: string; type: string }[] };

/**
 * 지금 **파티가** 보는 것을 다시 센다. 한 걸음마다 부른다.
 *
 * 기억(`SEEN`)은 지우지 않는다 — 지운 적이 있는데 그러면 뒤돌아서는 순간 지도가
 * 통째로 사라졌다.
 *
 * ── 왜 합쳐서 보나 ───────────────────────────────────────────────────
 * `level.flags` 는 「지금 보인다」를 **한 벌만** 담는다. 둘이 되면 사람마다 따로 들려고
 * 플래그를 사람 수만큼 늘리거나, 합쳐서 보거나 둘 중 하나다. 합치는 쪽이 훨씬 싸고
 * **협동에도 자연스럽다** — 등을 맡긴 사람이 본 것은 나도 아는 것이 맞다.
 *
 * ── 눈먼 사람은 **파티를 눈멀게 하지 않는다** ────────────────────────
 * 예전에는 눈이 멀면 판 전체의 「보인다」를 지우고 제 발밑만 켰다(`applyBlind`). 둘이
 * 되면 그게 **한 사람이 눈멀어 둘 다 앞이 안 보이는** 자리가 된다. 지금은 눈먼 사람이
 * **아무것도 안 보태고** 제 발밑만 보탠다 — 곁의 성한 사람이 보는 것은 그대로 보인다.
 */
export function computeFov(level: Level, viewers: Viewer[]): void {
    const { flags } = level;
    for (let i = 0; i < flags.length; i++) flags[i] &= ~VISIBLE;
    for (const v of viewers) {
        if ((v.blind ?? 0) > 0) {
            // 눈이 멀면 발밑 말고는 아무것도 안 보인다.
            if (inBounds(v.x, v.y)) flags[idx(v.x, v.y)] |= VISIBLE | SEEN;
            continue;
        }
        lightFrom(level, v);
    }
}

/** 한 사람이 선 자리에서 보이는 것을 **보탠다** — 지우지 않는다. */
function lightFrom(level: Level, from: Viewer): void {
    const { flags, tiles } = level;
    const hero = from;

    const light = (x: number, y: number) => {
        if (!inBounds(x, y)) return;
        flags[idx(x, y)] |= VISIBLE | SEEN;
    };

    // 제자리와 맞닿은 여덟 칸은 언제나 보인다 — 어디에 서 있든. **두 칸으로 넓혀 봤더니
    // 복도가 너무 훤해서** 되돌렸다(원작 Rogue 도 복도는 한 칸이다).
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) light(from.x + dx, from.y + dy);
    }

    // 입구 한 칸 전에서는 문 너머를 아주 좁게 엿본다. 문을 통과하기 전에는
    // 방 전체가 읽히면 안 되므로, 문을 향한 축에서 양옆을 강하게 조인다.
    if (tiles[idx(from.x, from.y)] !== T.DOOR && level.mutator !== "fog") {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
                const doorX = from.x + dx;
                const doorY = from.y + dy;
                if (!inBounds(doorX, doorY) || tiles[idx(doorX, doorY)] !== T.DOOR) continue;
                const ri = roomAround(level, doorX, doorY);
                const room = ri >= 0 ? level.rooms[ri] : undefined;
                if (!room || room.dark || room.gone || room.maze) continue;
                for (let y = room.y; y < room.y + room.h; y++) {
                    for (let x = room.x; x < room.x + room.w; x++) {
                        const rx = x - from.x;
                        const ry = y - from.y;
                        const depth = rx * dx + ry * dy;
                        const side = Math.abs(rx * dy - ry * dx);
                        const tile = tiles[idx(x, y)];
                        if (tile !== T.CORRIDOR && tile !== T.PASSAGE && depth > 0 && side * 4 <= depth) light(x, y);
                    }
                }
            }
        }
    }

    {
        // 방 안에서는 방 전체가 보이지만, 문턱에서는 방 안쪽을 향한 삼각형만 보인다.
        // 문을 통과하는 순간(roomOf >= 0)에만 전체 방을 켠다.
        const inside = roomOf(level, from.x, from.y) >= 0;
        const ri = inside
            ? roomOf(level, from.x, from.y)
            : tiles[idx(from.x, from.y)] === T.DOOR
              ? roomAround(level, from.x, from.y)
              : -1;
        if (ri >= 0) {
            const room = level.rooms[ri];
            // 미로 방은 「방」이 아니다 — 안쪽이 얽힌 통로라 통째로 보이면 미로가 아니게 된다.
            if (room && !room.dark && !room.gone && !room.maze) {
                // **짙은 안개는 「방이 통째로 보이는 것」을 지운다.** 그러면 밝은 방도
                // 맞닿은 한 칸뿐이라, 좁히는 사건이 제 할 일을 한다. 예전에는 층 전체를
                // 반경 2 로 덮어써서 **복도에서 오히려 시야가 넓어졌다.**
                if (level.mutator !== "fog") {
                    if (!inside) {
                        // 문턱에서는 문이 붙은 변에서 방 안쪽으로 90도 시야를 낸다.
                        const vx = from.x === room.x ? 1 : from.x === room.x + room.w - 1 ? -1 : 0;
                        const vy = from.y === room.y ? 1 : from.y === room.y + room.h - 1 ? -1 : 0;
                        for (let y = room.y; y < room.y + room.h; y++) {
                            for (let x = room.x; x < room.x + room.w; x++) {
                                const dx = x - from.x;
                                const dy = y - from.y;
                                const depth = dx * vx + dy * vy;
                                const side = Math.abs(dx * vy - dy * vx);
                                if (depth > 0 && side <= depth) light(x, y);
                            }
                        }
                    } else {
                        // 방 안 — 벽까지 통째로.
                        for (let y = room.y; y < room.y + room.h; y++) {
                            for (let x = room.x; x < room.x + room.w; x++) light(x, y);
                        }
                    }
                    // 벽에 난 문도 그 방의 것이다. **안개 속에서는 이것도 안 보인다** —
                    // 문만 떠 있으면 방의 크기가 그대로 읽혀서 안개가 하는 일이 없어진다.
                    for (let y = room.y; y < room.y + room.h; y++) {
                        for (let x = room.x; x < room.x + room.w; x++) {
                            if (tiles[idx(x, y)] === T.DOOR && (inside || isVisible(level, x, y))) light(x, y);
                        }
                    }
                }
            }
        }
    }

    // 다이달로스의 나침반: 모든 비밀문의 위치를 감지하여 기억에 표시
    if (hero?.pack?.some((it) => it.kind === "relic" && it.type === "daedalus_compass")) {
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (tiles[idx(x, y)] === T.SECRET) {
                    flags[idx(x, y)] |= SEEN;
                }
            }
        }
    }
}

export function isVisible(level: Level, x: number, y: number): boolean {
    return inBounds(x, y) && (level.flags[idx(x, y)] & VISIBLE) !== 0;
}

export function isSeen(level: Level, x: number, y: number): boolean {
    return inBounds(x, y) && (level.flags[idx(x, y)] & SEEN) !== 0;
}

/**
 * 몬스터가 나를 알아보는가.
 *
 * 원작의 몬스터는 **같은 방에 있으면** 쫓아오고, 복도에서는 **맞닿아 있을 때**만
 * 안다. 이것이 복도가 안전한 이유이자 방이 무서운 이유다.
 */
export function monsterSees(level: Level, mx: number, my: number, hero: Pos): boolean {
    if (Math.abs(mx - hero.x) <= 1 && Math.abs(my - hero.y) <= 1) return true;
    const mr = roomOf(level, mx, my);
    const hr = roomOf(level, hero.x, hero.y);
    if (mr < 0 || hr < 0 || mr !== hr) return false;
    // 어두운 방에서는 서로 가까워야 안다.
    const room = level.rooms[mr];
    if (room.dark) return Math.abs(mx - hero.x) <= 2 && Math.abs(my - hero.y) <= 2;
    return true;
}

/** 다 아는 층으로 만든다 — 죽거나 이겼을 때 지도를 펼쳐 보여 주는 자리. */
export function revealAll(level: Level): void {
    for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
            if ((level.tiles[idx(x, y)] as Tile) !== T.ROCK) level.flags[idx(x, y)] |= SEEN;
        }
    }
}
