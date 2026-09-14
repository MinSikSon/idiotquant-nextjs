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

import {
    buildLevel,
    effectiveArea,
    floorQuota,
    freeSpot,
    itemSpots,
    roomArea,
    roomWeight,
    shapeFactor,
} from "@/lib/rogue/dungeon";
import { Rng } from "@/lib/rogue/rng";
import { MAP_H, MAP_W, T, idx, inBounds, walkable, type Level, type Tile } from "@/lib/rogue/types";

const SEEDS = 80;
const DEPTHS = [1, 2, 5, 7, 11, 13, 17, 20, 23, 26];

const N4: [number, number][] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
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

test("계단도 비밀문도 막히지 않는다", () => {
    // ── 계단은 사방이 막히지 않는다 — 미로 방에서 바위 속에 박히던 자리
    {
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
    }

    // ── 비밀문을 다 열면 걸어갈 수 있는 칸이 하나도 안 남고 이어진다
    {
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
    }
});

// 「넓은 방이 자주 비어 있다」 — 방을 **고르게** 뽑아 물건을 놓던 때의 모양이다. 방 하나가
// 크든 작든 한 몫씩 가지니, 안쪽이 2칸부터 70칸까지(서른다섯 배) 벌어지는 이 층에서는
// **3×3 벽장과 넓은 홀이 똑같은 확률**을 가졌다. 걸어 들어간 값이 넓이에 반비례한 셈이다.
//
// 넓이를 태워 뽑으면 **바닥 한 칸당 확률이 같아진다.**
test("놓을 자리는 방의 넓이를 태워 고른다", () => {
    // ── 넓은 방일수록 뭔가 놓여 있다 — 방 하나에 한 몫씩이 아니다
    {
        const rng = new Rng(20260915);
        /** 넓이 띠마다 「방 수」와 「뭔가 놓인 방 수」. */
        const bands = [
            { lo: 0, hi: 9, rooms: 0, filled: 0 },
            { lo: 10, hi: 19, rooms: 0, filled: 0 },
            { lo: 20, hi: 34, rooms: 0, filled: 0 },
            { lo: 35, hi: 9999, rooms: 0, filled: 0 },
        ];

        for (let i = 0; i < 600; i++) {
            const level = buildLevel(1 + (i % 26), rng);
            // 물건 셋을 실제 규칙(`freeSpot`)대로 놓는다.
            const spots = [0, 1, 2].map(() => freeSpot(level, rng, []));
            for (const r of level.rooms) {
                if (r.gone || r.maze) continue;
                const band = bands.find((b) => roomArea(r) >= b.lo && roomArea(r) <= b.hi);
                if (!band) continue;
                band.rooms++;
                const inside = (p: { x: number; y: number }) =>
                    p.x > r.x && p.x < r.x + r.w - 1 && p.y > r.y && p.y < r.y + r.h - 1;
                if (spots.some(inside)) band.filled++;
            }
        }

        const rate = bands.map((b) => (b.rooms > 0 ? b.filled / b.rooms : 0));
        for (const b of bands) assert.ok(b.rooms > 100, `${b.lo}~${b.hi} 칸짜리 방이 ${b.rooms}개뿐이라 못 잰다`);

        // **띠를 따라 올라가야 한다.** 고르게 뽑으면 넷이 나란해진다(재 보니 30·33·34·34%).
        for (let i = 1; i < rate.length; i++) {
            assert.ok(
                rate[i] > rate[i - 1],
                `${bands[i].lo}칸 띠(${(rate[i] * 100).toFixed(0)}%)가 그 아래 띠` +
                    `(${(rate[i - 1] * 100).toFixed(0)}%)보다 안 높다`,
            );
        }
        // 제일 넓은 띠와 제일 좁은 띠가 **또렷이** 갈려야 한다 — 조금만 기울면 걸어 들어가는
        // 사람 눈에는 그대로다.
        assert.ok(
            rate[3] > rate[0] * 2,
            `넓은 방 ${(rate[3] * 100).toFixed(0)}% 가 좁은 방 ${(rate[0] * 100).toFixed(0)}% 의 두 배가 안 된다`,
        );
    }

    // ── 넓이 재는 자리는 하나다 — 「없는 방」도 한 칸을 갖는다
    {
        assert.equal(roomArea({ x: 0, y: 0, w: 5, h: 4, dark: false, gone: false, maze: false }), 6);
        assert.equal(roomArea({ x: 0, y: 0, w: 3, h: 3, dark: false, gone: false, maze: false }), 1);
        // 「없는 방」은 복도의 교차점 한 칸이다 — 0 을 주면 영영 안 뽑힌다.
        assert.equal(roomArea({ x: 9, y: 9, w: 1, h: 1, dark: false, gone: true, maze: false }), 1);
    }
});

test("회랑은 깎고 초대형은 꺾는다 — 감쇠와 상한", () => {
    // ── 감쇠는 ρ₀ 아래에서 정확히 1 이고, 그 위에서만 줄어든다
    {
        // **기준점이 1 이 아니다.** 이 생성기의 방은 장단비 중앙값이 이미 3.0 이라,
        // ρ>1 부터 깎으면 감쇠가 아니라 그냥 전체를 줄이는 것이 된다.
        assert.equal(shapeFactor(6, 6), 1, "정사각을 깎는다");
        assert.equal(shapeFactor(10, 4), 1, "ρ=2.5 까지는 안 깎아야 한다");
        assert.ok(shapeFactor(12, 4) < 1, "ρ=3 을 안 깎는다");

        let last = 1;
        for (const a of [3, 4, 5, 6, 8, 10, 12, 14]) {
            const s = shapeFactor(a, 1);
            assert.ok(s <= last, `${a}×1 이 그 앞보다 안 줄었다`);
            assert.ok(s > 0, "감쇠가 0 이나 음수가 됐다 — 방이 영영 안 뽑힌다");
            last = s;
        }
        // 제일 긴 통로가 **눈에 띄게** 깎여야 한다. 조금만 깎으면 회랑이 여전히 홀이다.
        assert.ok(shapeFactor(14, 1) < 0.5, `14×1 통로가 ${shapeFactor(14, 1).toFixed(2)} 로 덜 깎였다`);
    }

    // ── 가중치는 넓이를 따라 오르되 상한을 안 넘는다
    {
        const rng = new Rng(31415);
        const level = buildLevel(3, rng);
        // 실제 층의 방들로 — 넓을수록 무거운가.
        const rows = level.rooms
            .filter((r) => !r.gone)
            .map((r) => ({ a: effectiveArea(level, r), w: roomWeight(level, r) }))
            .sort((p, q) => p.a - q.a);
        for (let i = 1; i < rows.length; i++) {
            assert.ok(rows[i].w >= rows[i - 1].w, "넓은 방이 좁은 방보다 안 무겁다");
        }
        for (const row of rows) assert.ok(row.w <= 32, `가중치 ${row.w} 가 상한을 넘었다`);

        // **상한이 실제로 문다.** 20×20 홀이 들어와도 층을 통째로 먹지 않는다.
        const hall = { x: 0, y: 0, w: 22, h: 22, dark: false, gone: false, maze: false };
        const wide = buildLevel(3, new Rng(1));
        wide.rooms = [hall];
        assert.equal(roomWeight(wide, hall), 32, "초대형 방에서 상한이 안 물었다");
    }
});

test("총량은 층이 정하고 방이 나눠 갖는다 — 쿼터와 배분", () => {
    // ── 층 쿼터는 깊이를 타되 상하한 안에 머문다
    {
        const rng = new Rng(777);
        const seen: Record<number, number[]> = {};
        for (const d of [1, 5, 10, 20, 26]) {
            seen[d] = [];
            for (let i = 0; i < 400; i++) {
                const n = floorQuota(d, rng);
                assert.ok(n >= 2 && n <= 7, `${d}층 쿼터가 ${n} 이다`);
                seen[d].push(n);
            }
        }
        const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
        // 깊을수록 조금 는다 — 위험은 커지는데 보상이 그대로면 내려갈 까닭이 준다.
        assert.ok(mean(seen[26]) > mean(seen[1]), "26층이 1층보다 안 후하다");
        // 다만 **조금만** — 두 배가 되면 바닥층이 창고가 된다.
        assert.ok(mean(seen[26]) < mean(seen[1]) * 1.7, "깊은 층이 너무 후하다");
    }

    // ── 나눠 준 몫의 합이 **정확히 쿼터**다 — 자원 보존의 전부
    {
        const rng = new Rng(20260916);
        for (let i = 0; i < 300; i++) {
            const level = buildLevel(1 + (i % 26), rng);
            const n = floorQuota(level.depth, rng);
            const spots = itemSpots(level, n, rng, []);
            assert.equal(spots.length, n, `${level.depth}층에서 ${n} 을 시켰는데 ${spots.length} 이 나왔다`);
            // 놓인 자리는 전부 걸어갈 수 있어야 하고, 겹치면 안 된다.
            for (const p of spots) {
                assert.ok(walkable(level.tiles[idx(p.x, p.y)] as Tile), "바위 속에 물건을 놓았다");
            }
            const keys = new Set(spots.map((p) => `${p.x},${p.y}`));
            assert.equal(keys.size, spots.length, "한 칸에 둘을 놓았다");
        }
        // 0 을 시키면 0 이 나온다 — 쿼터가 바닥일 때 터지면 안 된다.
        assert.deepEqual(itemSpots(buildLevel(1, rng), 0, rng, []), []);
    }

    // ── 한 방이 층을 통째로 먹지 않고, 넓은 방은 빈 채로 안 둔다
    {
        const rng = new Rng(20260917);
        let big = 0;
        let bigEmpty = 0;
        let over = 0;
        let clumped = 0;
        let floors = 0;

        for (let i = 0; i < 500; i++) {
            const level = buildLevel(1 + (i % 26), rng);
            const spots = itemSpots(level, floorQuota(level.depth, rng), rng, []);
            floors++;
            for (const r of level.rooms) {
                if (r.gone) continue;
                const got = spots.filter(
                    (p) => p.x > r.x && p.x < r.x + r.w - 1 && p.y > r.y && p.y < r.y + r.h - 1,
                ).length;
                if (got > 3) over++;
                if (got >= 2) clumped++;
                if (effectiveArea(level, r) >= 24) {
                    big++;
                    if (got === 0) bigEmpty++;
                }
            }
        }

        assert.ok(big > 300, `넓은 방 표본이 ${big} 개뿐이라 못 잰다`);
        assert.equal(over, 0, `한 방에 넷 이상 놓인 층이 ${over} 번 있다`);
        // **이것이 이 배분의 전부다.** 물건마다 따로 뽑으면 여기가 36% 였다.
        assert.ok(
            bigEmpty / big < 0.15,
            `넓은 방이 ${((bigEmpty / big) * 100).toFixed(1)}% 나 비어 있다 — 배분이 안 듣는다`,
        );
        // 몰림도 같이 본다 — 흩어 놓는 것이 목적이지 한 방에 쌓는 것이 아니다.
        assert.ok(clumped / floors < 0.5, `한 방에 둘 이상이 층마다 ${(clumped / floors).toFixed(2)} 번이다`);
    }

    // ── 같은 방 안에서는 붙여 놓지 않는다 — 겹쳐 보이면 하나를 못 본다
    {
        const rng = new Rng(20260918);
        let pairs = 0;
        let touching = 0;
        for (let i = 0; i < 400; i++) {
            const level = buildLevel(1 + (i % 26), rng);
            const spots = itemSpots(level, 5, rng, []);
            for (let a = 0; a < spots.length; a++) {
                for (let b = a + 1; b < spots.length; b++) {
                    pairs++;
                    if (Math.abs(spots[a].x - spots[b].x) <= 1 && Math.abs(spots[a].y - spots[b].y) <= 1) {
                        touching++;
                    }
                }
            }
        }
        assert.ok(pairs > 1000, "짝이 모자라 못 잰다");
        // 아주 좁은 방에서는 못 띄우므로 0 을 걸지는 않는다 — 흔하면 안 된다는 것이다.
        assert.ok(touching / pairs < 0.02, `${((touching / pairs) * 100).toFixed(1)}% 가 붙어 놓였다`);
    }
});
