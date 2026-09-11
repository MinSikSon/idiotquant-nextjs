// 층 만들기 — **끊긴 층이 하나도 없어야 한다.**
//
// 이 파일이 지키는 것이 이 게임에서 제일 비싼 것이다. 방 하나가 복도에서 끊기면
// 화면은 멀쩡히 그려지고, 그 방에 계단이 있으면 판이 거기서 죽는다. 사람은 자기가
// 길을 못 찾는 줄 알고 한참을 헤맨다 — **고장이 고장처럼 안 보이는 자리**다.
//
// 그래서 1층부터 26층까지, 시드를 갈아 가며 여러 번 만들어 전부 걸어서 닿는지 본다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLevel, freeSpot, reachable } from "@/lib/rogue/dungeon";
import { Rng } from "@/lib/rogue/rng";
import { MAP_H, MAP_W, T, type Tile, idx, walkable } from "@/lib/rogue/types";

/** 방 안쪽(없는 방이면 그 점)에서 대표 칸 하나. */
function anchorOf(r: { x: number; y: number; w: number; h: number; gone: boolean }) {
    return r.gone ? { x: r.x, y: r.y } : { x: r.x + 1, y: r.y + 1 };
}

test("어느 시드로 만들어도 모든 방이 서로 이어진다", () => {
    for (let seed = 1; seed <= 60; seed++) {
        for (const depth of [1, 2, 7, 13, 20, 26]) {
            const rng = new Rng(seed * 7919 + depth);
            const level = buildLevel(depth, rng);
            const rooms = level.rooms;
            const base = anchorOf(rooms[0]);
            for (let i = 1; i < rooms.length; i++) {
                const target = anchorOf(rooms[i]);
                assert.ok(
                    reachable(level, base, target),
                    `시드 ${seed} 깊이 ${depth}: 방 0 에서 방 ${i} 로 못 간다`,
                );
            }
        }
    }
});

test("계단은 언제나 걸어서 닿는 곳에 있다", () => {
    for (let seed = 1; seed <= 60; seed++) {
        const depth = 1 + (seed % 26);
        const rng = new Rng(seed * 104729);
        const level = buildLevel(depth, rng);
        const base = anchorOf(level.rooms[0]);
        assert.ok(reachable(level, base, level.stairs), `시드 ${seed}: 내려가는 계단에 못 간다`);
        assert.ok(level.upStairs, "올라가는 계단이 없다");
        assert.ok(reachable(level, base, level.upStairs!), `시드 ${seed}: 올라가는 계단에 못 간다`);
    }
});

test("계단이 놓인 칸은 걸어 들어갈 수 있는 칸이다", () => {
    for (let seed = 1; seed <= 40; seed++) {
        const level = buildLevel(1 + (seed % 26), new Rng(seed * 31337));
        assert.equal(level.tiles[idx(level.stairs.x, level.stairs.y)], T.STAIRS);
        const up = level.upStairs!;
        assert.ok(
            walkable(level.tiles[idx(up.x, up.y)] as Tile),
            "올라가는 계단이 벽 속에 박혔다",
        );
    }
});

test("같은 시드는 같은 층을 만든다 — 재현이 안 되면 고장을 못 본다", () => {
    const a = buildLevel(9, new Rng(4242));
    const b = buildLevel(9, new Rng(4242));
    assert.deepEqual(Array.from(a.tiles), Array.from(b.tiles));
    assert.deepEqual(a.stairs, b.stairs);
    assert.deepEqual(a.rooms, b.rooms);
});

test("방은 서로 겹치지 않는다", () => {
    for (let seed = 1; seed <= 40; seed++) {
        const level = buildLevel(1 + (seed % 26), new Rng(seed * 7717));
        const real = level.rooms.filter((r) => !r.gone);
        for (let i = 0; i < real.length; i++) {
            for (let j = i + 1; j < real.length; j++) {
                const a = real[i];
                const b = real[j];
                const overlap =
                    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
                assert.ok(!overlap, `시드 ${seed}: 방 ${i} 와 ${j} 가 겹친다`);
            }
        }
    }
});

test("1층은 전부 밝은 방이다 — 처음 켠 사람이 지도를 본다", () => {
    for (let seed = 1; seed <= 20; seed++) {
        const level = buildLevel(1, new Rng(seed * 911));
        assert.ok(level.rooms.every((r) => r.gone || !r.dark));
        assert.ok(level.rooms.every((r) => !r.gone), "1층에는 「없는 방」이 없다");
    }
});

test("지도 밖으로 새어 나간 칸이 없다", () => {
    const level = buildLevel(13, new Rng(2024));
    assert.equal(level.tiles.length, MAP_W * MAP_H);
    // 마지막 행과 열은 방이 차지하지 않는다 — 칸의 여백으로 남겨 둔 자리다.
    for (let x = 0; x < MAP_W; x++) {
        assert.notEqual(level.tiles[idx(x, MAP_H - 1)], T.FLOOR);
    }
});

test("빈 자리 찾기는 걸어 들어갈 수 있는 칸만 준다", () => {
    const rng = new Rng(555);
    const level = buildLevel(5, rng);
    for (let i = 0; i < 50; i++) {
        const p = freeSpot(level, rng);
        assert.ok(walkable(level.tiles[idx(p.x, p.y)] as Tile), `${p.x},${p.y} 가 벽이다`);
    }
});
