// 층의 **두 방식** — 로그식(3×3 칸)과 넷핵식(아무 데나 흩은 방)을 섞는다.
//
// `rogue-dungeon`·`rogue-mapshape` 는 `buildLevel` 을 그대로 불러서 두 방식을 **섞인
// 비율대로만** 본다. 넷핵식은 4층부터 조금씩 나오므로 거기서는 표본이 적다. 그래서 여기서
// 넷핵식을 **억지로 세워** 같은 자물쇠를 다시 건다 — 층이 끊기지 않는다, 비밀문은 지름길뿐,
// 길 끝은 어딘가로 닿는다, 방 안으로 복도가 안 지나간다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildLevel, floorQuota, itemSpots, nethackChance, pickLayout, reachable } from "@/lib/rogue/dungeon";
import { Rng } from "@/lib/rogue/rng";
import { MAP_H, MAP_W, T, idx, inBounds, walkable, type Level, type Room, type Tile } from "@/lib/rogue/types";

const N4: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
];

function* nethackLevels(seeds = 60) {
    for (let seed = 1; seed <= seeds; seed++) {
        for (const depth of [4, 7, 11, 16, 21, 26]) {
            yield { level: buildLevel(depth, new Rng(seed * 6007 + depth), "nethack"), tag: `시드 ${seed} 깊이 ${depth}` };
        }
    }
}

/** 한 칸에서 걸어서 닿는 칸들. `secretToo` 면 비밀문을 연 것으로 친다. */
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

/** 방 안쪽이 3×3 칸의 경계를 넘나드는가 — 로그식의 방은 제 칸 밖으로 못 나간다. */
function crossesCell(r: Room): boolean {
    const cw = Math.floor(MAP_W / 3);
    const ch = Math.floor(MAP_H / 3);
    const col = (x: number) => Math.min(2, Math.floor(x / cw));
    const row = (y: number) => Math.min(2, Math.floor(y / ch));
    return col(r.x) !== col(r.x + r.w - 1) || row(r.y) !== row(r.y + r.h - 1);
}

test("섞기 — 1~3층은 로그식 그대로, 깊을수록 넷핵식이 잦아진다", () => {
    // ── 확률표: 1~3층은 0, 4층부터 오르고 천장(60%)에서 멈춘다
    {
        for (const d of [1, 2, 3]) assert.equal(nethackChance(d), 0, `${d}층에 넷핵식이 선다`);
        assert.ok(nethackChance(4) > 0, "4층에서 넷핵식이 안 나온다");
        for (let d = 5; d <= 30; d++) assert.ok(nethackChance(d) >= nethackChance(d - 1), `${d}층이 그 위층보다 드물다`);
        assert.equal(nethackChance(26), 0.6);
        assert.equal(nethackChance(99), 0.6, "천장을 넘는다 — 깊은 층에서 로그식이 사라진다");
    }

    // ── 얕은 층은 난수를 안 뽑는다 — 섞기 전과 같은 시드로 같은 층이다
    {
        for (let seed = 1; seed <= 30; seed++) {
            for (const d of [1, 2, 3]) {
                const rng = new Rng(seed);
                const before = rng.state;
                assert.equal(pickLayout(d, rng), "rogue");
                assert.equal(rng.state, before, `${d}층에서 방식을 고르느라 난수를 썼다`);
                const a = buildLevel(d, new Rng(seed * 31 + d));
                const b = buildLevel(d, new Rng(seed * 31 + d), "rogue");
                assert.deepEqual(Array.from(a.tiles), Array.from(b.tiles), `시드 ${seed}·${d}층이 로그식과 다르다`);
            }
        }
    }

    // ── `buildLevel` 은 `pickLayout` 이 고른 방식으로 짓는다 — 굴림과 짓기가 한 줄로 이어진다
    {
        for (let seed = 1; seed <= 40; seed++) {
            const d = 4 + (seed % 23);
            const probe = new Rng(seed * 17);
            const kind = pickLayout(d, probe);
            const direct = buildLevel(d, probe, kind);
            const auto = buildLevel(d, new Rng(seed * 17));
            assert.deepEqual(Array.from(auto.tiles), Array.from(direct.tiles), `시드 ${seed}·${d}층`);
        }
    }

    // ── 실제로 뽑히는 비율이 표와 맞는다
    {
        for (const d of [6, 13, 26]) {
            let hits = 0;
            const n = 4000;
            for (let s = 1; s <= n; s++) if (pickLayout(d, new Rng(s * 2654435761)) === "nethack") hits++;
            const want = nethackChance(d);
            assert.ok(Math.abs(hits / n - want) < 0.03, `${d}층 넷핵식 ${(hits / n).toFixed(3)} — 표는 ${want}`);
        }
    }
});

test("넷핵식 — 방을 칸에 가두지 않고 흩는다", () => {
    let levels = 0;
    let crossing = 0;
    let roomsTotal = 0;
    for (const { level, tag } of nethackLevels()) {
        levels++;
        const rooms = level.rooms.filter((r) => !r.vault);
        roomsTotal += rooms.length;
        assert.ok(rooms.length >= 4, `${tag}: 방이 ${rooms.length}개뿐이다`);
        // 「없는 방」·미로 방은 로그식에만 있다.
        assert.ok(rooms.every((r) => !r.gone && !r.maze), `${tag}: 넷핵식에 없는 방이나 미로 방이 섰다`);
        assert.equal(level.maze, false);
        for (const r of rooms) {
            // 벽이 지도 가장자리에 서지 않는다 — 가장자리는 복도도 굴착도 못 지난다.
            assert.ok(r.x >= 1 && r.y >= 1 && r.x + r.w <= MAP_W - 1 && r.y + r.h <= MAP_H - 1, `${tag}: 방이 가장자리에 닿았다`);
        }
        for (let i = 0; i < rooms.length; i++) {
            for (let j = i + 1; j < rooms.length; j++) {
                const a = rooms[i];
                const b = rooms[j];
                const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
                assert.ok(!overlap, `${tag}: 방 ${i} 와 ${j} 가 겹친다`);
            }
        }
        // **x 순으로 줄 선다** — 「옆 방끼리 잇기」가 이 순서를 탄다. 안 세우면 놓인 순서(무작위)로
        // 이어서 복도가 지도를 가로질러 얽힌다.
        for (let i = 1; i < rooms.length; i++) assert.ok(rooms[i - 1].x <= rooms[i].x, `${tag}: 방이 x 순이 아니다`);
        if (rooms.some(crossesCell)) crossing++;
    }
    // **3×3 에 안 갇힌다.** 로그식은 이 값이 0 이다(아래). 넷핵식이 조용히 로그식으로
    // 떨어지고 있으면 여기가 운다.
    assert.ok(crossing / levels > 0.9, `칸 경계를 넘는 방이 있는 층이 ${((crossing / levels) * 100).toFixed(0)}% 뿐이다`);
    const mean = roomsTotal / levels;
    assert.ok(mean >= 6 && mean <= 11, `층마다 방이 평균 ${mean.toFixed(1)}개 — 넷핵의 6~11 을 벗어났다`);

    // 대조군 — 로그식의 방은 언제나 제 칸 안에 있다.
    for (let seed = 1; seed <= 60; seed++) {
        const level = buildLevel(4 + (seed % 23), new Rng(seed), "rogue");
        assert.ok(level.rooms.filter((r) => !r.gone && !r.vault).every((r) => !crossesCell(r)));
    }
});

test("넷핵식도 끊기지 않고, 비밀문은 지름길뿐이다", () => {
    for (const { level, tag } of nethackLevels()) {
        const rooms = level.rooms.filter((r) => !r.vault);
        const base = { x: rooms[0].x + 1, y: rooms[0].y + 1 };

        // ── 비밀문을 **하나도 안 찾아도** 모든 방·계단·모루에 닿는다
        const plain = flood(level, base, false);
        rooms.forEach((r, i) => {
            assert.ok(plain[idx(r.x + 1, r.y + 1)], `${tag}: 비밀문 없이는 방 ${i} 에 못 간다`);
        });
        for (const [name, p] of [["내려가는 계단", level.stairs], ["올라가는 계단", level.upStairs!], ["모루", level.anvil!]] as const) {
            assert.ok(plain[idx(p.x, p.y)], `${tag}: 비밀문 없이는 ${name}(${p.x},${p.y})에 못 간다`);
        }
        assert.ok(reachable(level, base, level.stairs));

        // ── 비밀문을 다 열면 걸을 수 있는 칸이 하나로 이어진다(금고만 빼고)
        const all = flood(level, base, true);
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (!walkable(level.tiles[idx(x, y)] as Tile)) continue;
                if (level.rooms.some((r) => r.vault && x > r.x && x < r.x + r.w - 1 && y > r.y && y < r.y + r.h - 1)) continue;
                assert.ok(all[idx(x, y)], `${tag}: (${x},${y}) 에 아무 데서도 못 간다`);
            }
        }
    }
});

test("넷핵식 복도 — 방을 비켜 가고, 아무 데서나 끊기지 않는다", () => {
    for (const { level, tag } of nethackLevels()) {
        // ── 방 안쪽으로 복도가 안 지나간다 — 넷핵의 복도는 벽을 만나면 돌아간다
        for (const r of level.rooms) {
            for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
                for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
                    assert.notEqual(level.tiles[idx(x, y)], T.CORRIDOR, `${tag}: 방 안(${x},${y})으로 복도가 지나간다`);
                }
            }
        }
        // ── 눈에 보이는 막다른 복도는 비밀문 앞뿐이다
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (level.tiles[idx(x, y)] !== T.CORRIDOR) continue;
                const open = N4.filter(([dx, dy]) => inBounds(x + dx, y + dy) && walkable(level.tiles[idx(x + dx, y + dy)] as Tile)).length;
                if (open > 1) continue;
                const bySecret = N4.some(([dx, dy]) => inBounds(x + dx, y + dy) && level.tiles[idx(x + dx, y + dy)] === T.SECRET);
                assert.ok(bySecret, `${tag}: (${x},${y})에서 복도가 아무 데도 안 닿고 끊긴다`);
            }
        }
        // ── 문은 벽을 마주 보지 않는다 — 문 밖 어느 한쪽은 걸을 수 있다
        for (let y = 0; y < MAP_H; y++) {
            for (let x = 0; x < MAP_W; x++) {
                if (level.tiles[idx(x, y)] !== T.DOOR) continue;
                const open = N4.filter(([dx, dy]) => inBounds(x + dx, y + dy) && walkable(level.tiles[idx(x + dx, y + dy)] as Tile)).length;
                assert.ok(open >= 2, `${tag}: 문(${x},${y})이 한쪽만 트였다`);
            }
        }
    }
});

test("넷핵식 — 같은 시드는 같은 층이고, 물건 몫은 그대로 다 놓인다", () => {
    {
        const a = buildLevel(15, new Rng(8080), "nethack");
        const b = buildLevel(15, new Rng(8080), "nethack");
        assert.deepEqual(Array.from(a.tiles), Array.from(b.tiles));
        assert.deepEqual(a.rooms, b.rooms);
        assert.deepEqual(a.stairs, b.stairs);
    }
    // 방이 넓고 많아도 층의 몫(쿼터)은 **정확히** 다 놓인다 — 넷핵식이라고 더 주지도 덜 주지도 않는다.
    {
        const rng = new Rng(4040);
        for (let i = 0; i < 200; i++) {
            const level = buildLevel(4 + (i % 23), rng, "nethack");
            const n = floorQuota(level.depth, rng);
            const spots = itemSpots(level, n, rng, []);
            assert.equal(spots.length, n);
            for (const p of spots) assert.ok(walkable(level.tiles[idx(p.x, p.y)] as Tile), "바위 속에 물건을 놓았다");
            assert.equal(new Set(spots.map((p) => `${p.x},${p.y}`)).size, n, "한 칸에 둘을 놓았다");
        }
    }
});
