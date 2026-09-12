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
function roomAround(level: Level, x: number, y: number): number {
    for (let i = 0; i < level.rooms.length; i++) {
        const r = level.rooms[i];
        if (r.gone) continue;
        if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
    }
    return -1;
}

/**
 * 지금 보이는 것을 다시 센다. 한 걸음마다 부른다.
 *
 * 기억(`SEEN`)은 지우지 않는다 — 지운 적이 있는데 그러면 뒤돌아서는 순간 지도가
 * 통째로 사라졌다.
 */
export function computeFov(level: Level, from: Pos): void {
    const { flags, tiles } = level;
    for (let i = 0; i < flags.length; i++) flags[i] &= ~VISIBLE;

    const light = (x: number, y: number) => {
        if (!inBounds(x, y)) return;
        flags[idx(x, y)] |= VISIBLE | SEEN;
    };

    // 제자리와 맞닿은 여덟 칸은 언제나 보인다 — 어디에 서 있든.
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) light(from.x + dx, from.y + dy);
    }

    // 안쪽에 섰으면 그 방, **문턱에 섰으면 그 문이 난 방.** 문에서 방이 안 켜지면
    // 들어서는 그 한 걸음 동안 방이 깜깜해 보인다 — 원작은 문턱에서도 방을 보여 준다.
    const ri =
        roomOf(level, from.x, from.y) >= 0
            ? roomOf(level, from.x, from.y)
            : tiles[idx(from.x, from.y)] === T.DOOR
              ? roomAround(level, from.x, from.y)
              : -1;
    if (ri < 0) return;
    const room = level.rooms[ri];
    // 미로 방은 「방」이 아니다 — 안쪽이 얽힌 통로라 통째로 보이면 미로가 아니게 된다.
    if (!room || room.dark || room.gone || room.maze) return;

    // 밝은 방 — 벽까지 통째로.
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) light(x, y);
    }
    // 벽에 난 문도 그 방의 것이다.
    for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
            if (tiles[idx(x, y)] === T.DOOR) light(x, y);
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
