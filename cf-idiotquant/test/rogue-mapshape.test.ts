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

import { buildLevel, freeSpot, roomArea } from "@/lib/rogue/dungeon";
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
