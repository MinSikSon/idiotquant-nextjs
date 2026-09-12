// 층의 **모양** — 「방이 안 밝혀진다」와 「길이 중간에 끊긴다」가 났던 자리.
//
// `rogue-dungeon.test.ts` 는 **방과 방이 이어지는가**를 본다. 그것만으로는 안 잡히는
// 고장이 넷 있었다. 넷 다 화면은 멀쩡히 그려지고, 사람만 헤맨다.
//
//   1. **계단이 바위 속에 박힌다.** 내려가는 계단을 `randomSpotIn` 으로 아무 데나
//      찍었는데, 미로 방은 안쪽 대부분이 바위다. 방끼리는 이어져 있으니 위 테스트는
//      통과하고, 그 층은 내려갈 수 없는 층이 된다.
//   2. **길이 방 벽에 부딪혀 끊긴다.** 복도는 곧은 선으로 파는데 `digCorridor` 는
//      바위만 판다. 그 선이 남의 방을 가로지르면 방 안쪽은 안 파이고 **양쪽 끄트머리만**
//      남는다. 어디로도 안 가는 복도 토막이다.
//   3. **문이 벽만 마주 본다.** 그 토막이 물고 있던 문은 밖이 바위다.
//   4. **문턱에 서면 방이 깜깜하다.** `roomAt` 은 방 안쪽에만 박혀 있어서 문 위에서는
//      -1 이었다 — 「방에 들어갔는데 안 밝혀진다」가 정확히 이 한 걸음이다.
//
// 아래는 그 넷을 **성질**로 건다. 시드 여든 × 깊이 열 = 팔백 층을 훑는다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLevel } from "@/lib/rogue/dungeon";
import { computeFov, isVisible } from "@/lib/rogue/fov";
import { Rng } from "@/lib/rogue/rng";
import { type Level, MAP_H, MAP_W, T, type Tile, idx, inBounds, walkable } from "@/lib/rogue/types";

const SEEDS = 80;
const DEPTHS = [1, 2, 5, 7, 11, 13, 17, 20, 23, 26];

const N4: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];
const DIAG: [number, number][] = [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
];

function* levels() {
    for (let seed = 1; seed <= SEEDS; seed++) {
        for (const depth of DEPTHS) {
            yield {
                level: buildLevel(depth, new Rng(seed * 7919 + depth)),
                tag: `시드 ${seed} 깊이 ${depth}`,
            };
        }
    }
}

/** 맞닿은 네 칸 중 걸어 들어갈 수 있는 칸의 수. `secretToo` 면 비밀문도 친다. */
function openNbrs(level: Level, x: number, y: number, secretToo = false): number {
    return N4.filter(([dx, dy]) => {
        if (!inBounds(x + dx, y + dy)) return false;
        const t = level.tiles[idx(x + dx, y + dy)] as Tile;
        return walkable(t) || (secretToo && t === T.SECRET);
    }).length;
}

/** 한 칸에서 걸어서 닿는 모든 칸. */
function flood(level: Level, from: { x: number; y: number }, secretToo: boolean): Uint8Array {
    const seen = new Uint8Array(MAP_W * MAP_H);
    const stack = [from];
    seen[idx(from.x, from.y)] = 1;
    while (stack.length) {
        const p = stack.pop()!;
        for (const [dx, dy] of N4) {
            const nx = p.x + dx;
            const ny = p.y + dy;
            if (!inBounds(nx, ny) || seen[idx(nx, ny)]) continue;
            const t = level.tiles[idx(nx, ny)] as Tile;
            if (!walkable(t) && !(secretToo && t === T.SECRET)) continue;
            seen[idx(nx, ny)] = 1;
            stack.push({ x: nx, y: ny });
        }
    }
    return seen;
}

function inMazeRoom(level: Level, x: number, y: number): boolean {
    return level.rooms.some(
        (r) => r.maze && !r.gone && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
    );
}

function isGoneAnchor(level: Level, x: number, y: number): boolean {
    return level.rooms.some((r) => r.gone && r.x === x && r.y === y);
}

test("계단은 사방이 막히지 않는다 — 미로 방에서 바위 속에 박히던 자리", () => {
    for (const { level, tag } of levels()) {
        assert.ok(
            openNbrs(level, level.stairs.x, level.stairs.y) > 0,
            `${tag}: 내려가는 계단(${level.stairs.x},${level.stairs.y}) 사방이 막혔다`,
        );
        const up = level.upStairs!;
        assert.ok(
            openNbrs(level, up.x, up.y) > 0,
            `${tag}: 올라가는 계단(${up.x},${up.y}) 사방이 막혔다`,
        );
    }
});

test("비밀문을 다 열면 걸어갈 수 있는 칸이 하나도 안 남고 이어진다", () => {
    // 비밀문을 안 연 상태로 못 가는 칸은 **있어도 된다** — 그게 지름길이다. 하지만
    // 비밀문까지 열고도 못 닿는 칸은 어디에서도 못 가는 칸이고, 거기 물건이나 몬스터가
    // 놓이면 영영 못 만난다.
    for (const { level, tag } of levels()) {
        const seen = flood(level, level.stairs, true);
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (!walkable(level.tiles[idx(x, y)] as Tile)) continue;
                assert.ok(seen[idx(x, y)], `${tag}: (${x},${y}) 에 아무 데서도 못 간다`);
            }
        }
    }
});

test("어디로도 안 가는 복도 토막이 없다 — 「길이 중간에 끊긴다」", () => {
    // 미로 안쪽만 뺀다 — 미로는 막다른 길로 **이루어진** 것이다. 비밀문에 닿은 끝도
    // 뺀다(`openNbrs` 의 `secretToo`) — 못 찾은 지름길이지 잘못 파인 길이 아니다.
    //
    // **「없는 방」은 안 뺀다.** 길을 하나만 물고 있으면 그건 갈림길이 아니라 막다른
    // 골목이고, 화면에서는 복도가 아무것도 없는 데서 끊겨 보인다. 다듬기는 그 점을
    // 못 지우므로(지우면 방이 사라진다) `buildLevel` 이 길을 하나 더 물려 준다.
    for (const { level, tag } of levels()) {
        for (let y = 1; y < MAP_H - 1; y++) {
            for (let x = 1; x < MAP_W - 1; x++) {
                const t = level.tiles[idx(x, y)] as Tile;
                if (t !== T.CORRIDOR && t !== T.PASSAGE) continue;
                if (inMazeRoom(level, x, y)) continue;
                assert.ok(
                    openNbrs(level, x, y, true) > 1,
                    `${tag}: (${x},${y}) 의 복도가 한쪽만 뚫려 있다` +
                        (isGoneAnchor(level, x, y) ? " — 「없는 방」이 잎으로 남았다" : ""),
                );
            }
        }
    }
});

test("대각으로만 이어진 복도가 없다 — 걸을 수는 있어도 끊겨 보인다", () => {
    for (const { level, tag } of levels()) {
        for (let y = 1; y < MAP_H - 1; y++) {
            for (let x = 1; x < MAP_W - 1; x++) {
                if (level.tiles[idx(x, y)] !== T.CORRIDOR) continue;
                for (const [dx, dy] of DIAG) {
                    if (level.tiles[idx(x + dx, y + dy)] !== T.CORRIDOR) continue;
                    const a = walkable(level.tiles[idx(x + dx, y)] as Tile);
                    const b = walkable(level.tiles[idx(x, y + dy)] as Tile);
                    assert.ok(a || b, `${tag}: (${x},${y}) 와 그 대각이 모서리로만 닿는다`);
                }
            }
        }
    }
});

test("밖이 막힌 문이 없다 — 문은 두 쪽이 뚫려 있어야 문이다", () => {
    for (const { level, tag } of levels()) {
        for (const r of level.rooms) {
            if (r.gone) continue;
            for (let y = r.y; y < r.y + r.h; y++) {
                for (let x = r.x; x < r.x + r.w; x++) {
                    if (level.tiles[idx(x, y)] !== T.DOOR) continue;
                    assert.ok(
                        openNbrs(level, x, y) > 1,
                        `${tag}: (${x},${y}) 의 문이 벽만 마주 본다`,
                    );
                }
            }
        }
    }
});

test("밝은 방의 문턱에 서면 그 방이 켜진다 — 「방에 들어갔는데 깜깜하다」", () => {
    let doors = 0;
    for (const { level, tag } of levels()) {
        for (const r of level.rooms) {
            if (r.gone || r.dark || r.maze) continue;
            for (let y = r.y; y < r.y + r.h; y++) {
                for (let x = r.x; x < r.x + r.w; x++) {
                    if (level.tiles[idx(x, y)] !== T.DOOR) continue;
                    doors++;
                    computeFov(level, { x, y });
                    // 방 한가운데 — 문에서 두 칸 넘게 떨어질 수 있는 자리다.
                    const cx = r.x + Math.floor(r.w / 2);
                    const cy = r.y + Math.floor(r.h / 2);
                    assert.ok(
                        isVisible(level, cx, cy),
                        `${tag}: (${x},${y}) 문턱에서 방 안(${cx},${cy})이 안 보인다`,
                    );
                }
            }
        }
    }
    assert.ok(doors > 1000, `밝은 방의 문이 ${doors}개뿐 — 표본이 너무 적다`);
});

test("어두운 방의 문턱에서는 방이 안 켜진다 — 어두운 방은 어두워야 한다", () => {
    let checked = 0;
    for (const { level } of levels()) {
        for (const r of level.rooms) {
            if (r.gone || !r.dark || r.maze) continue;
            for (let y = r.y; y < r.y + r.h; y++) {
                for (let x = r.x; x < r.x + r.w; x++) {
                    if (level.tiles[idx(x, y)] !== T.DOOR) continue;
                    const cx = r.x + Math.floor(r.w / 2);
                    const cy = r.y + Math.floor(r.h / 2);
                    // 문에서 두 칸 넘게 떨어진 가운데만 본다 — 맞닿은 여덟 칸은 언제나 보인다.
                    if (Math.abs(cx - x) <= 1 && Math.abs(cy - y) <= 1) continue;
                    computeFov(level, { x, y });
                    checked++;
                    assert.ok(!isVisible(level, cx, cy), `어두운 방이 문턱에서 켜졌다`);
                }
            }
        }
    }
    assert.ok(checked > 100, `어두운 방의 문이 ${checked}개뿐 — 표본이 너무 적다`);
});
