// 떨어지는 물건의 **등급이 층과 맞는가.**
//
// 예전에는 빈도표 하나로만 뽑아서 지하 1층에 판금 갑옷이 놓이고 25층에 단검이 놓였다.
// 화면은 멀쩡하고 판도 돌아간다 — 다만 **줍는 일이 판단거리가 아니라 그냥 운**이 되고,
// 내려갈 이유가 금화뿐이 된다. 고장이 고장처럼 안 보이는 자리라 여기서 센다.
//
// 거는 것 넷:
//
//   ① 얕은 층에 깊은 물건이 안 떨어진다 (사다리의 아래쪽)
//   ② 깊은 층에 허름한 **장비**가 안 떨어진다 (사다리의 위쪽 — 장비만 낡는다)
//   ③ 소모품과 반지·지팡이는 **안 낡는다** — 26층에서도 체력 회복 물약이 나온다
//   ④ 사다리가 단조롭다 — 층이 깊을수록 세다

import { test } from "node:test";
import assert from "node:assert/strict";

import { ARMORS, POTIONS, RINGS, SCROLLS, WANDS, WEAPONS, itemDepthRange, randomItem } from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";
import type { Item } from "@/lib/rogue/types";

/** 그 층에서 물건을 잔뜩 떨어뜨려 본다. */
function drops(depth: number, n: number, seed = 1): Item[] {
    const rng = new Rng(seed * 7919 + depth);
    const out: Item[] = [];
    for (let i = 0; i < n; i++) out.push(randomItem(depth, i, 0, 0, rng));
    return out;
}

const DEPTHS = [1, 2, 4, 7, 11, 15, 19, 23, 26];

test("얕은 층에 깊은 물건이, 깊은 층에 단검이 안 떨어진다", () => {
    // ── 얕은 층에 깊은 물건이 안 떨어진다
    {
        for (const depth of DEPTHS) {
            for (let seed = 1; seed <= 20; seed++) {
                for (const it of drops(depth, 60, seed)) {
                    const band = itemDepthRange(it.kind, it.type);
                    if (!band) continue; // 금화·식량·증표는 사다리가 없다
                    assert.ok(
                        band.min <= depth,
                        `지하 ${depth}층에 ${it.type} 가 떨어졌다 — ${band.min}층부터 나와야 한다`,
                    );
                }
            }
        }
    }

    // ── 26층 바닥에 단검과 가죽 갑옷이 안 뒹군다
    {
        // **이름으로 못 박는다.** 위아래 띠는 `itemDepthRange` 도 같은 상수를 보므로, 그
        // 상수가 통째로 풀리면 둘이 같이 풀려서 서로를 못 잡는다. 여기만은 값이 아니라
        // **이름**을 건다 — 26층에서 단검이 나오면 그건 그냥 고장이다.
        const seen = new Set<string>();
        for (let seed = 1; seed <= 60; seed++) {
            for (const it of drops(26, 60, seed)) {
                if (it.kind === "weapon" || it.kind === "armor") seen.add(it.type);
            }
        }
        for (const junk of ["dagger", "mace", "spear", "long sword", "leather", "ring mail"]) {
            assert.ok(!seen.has(junk), `26층에 ${junk} 가 떨어졌다`);
        }
        assert.ok(seen.size > 0, "26층에서 무기·갑옷이 하나도 안 나왔다 — 세는 자리가 틀렸다");
    }
});

test("뽑을 것 없는 칸이 없고, 손질은 깊을수록 커진다", () => {
    // ── 스물여섯 층 어디에도 뽑을 것이 없는 칸은 없다
    {
        // 사다리에 구멍이 나면 그 층에서는 뽑기가 하한까지 물러선다 — 즉 조용히 옛날로
        // 돌아간다. 구멍이 있는지를 여기서 본다.
        for (let depth = 1; depth <= 26; depth++) {
            for (const [label, table, band] of [
                ["무기", WEAPONS, 8],
                ["갑옷", ARMORS, 8],
                ["물약", POTIONS, Infinity],
                ["주문서", SCROLLS, Infinity],
                ["반지", RINGS, Infinity],
                ["지팡이", WANDS, Infinity],
            ] as [string, Record<string, { depth: number }>, number][]) {
                // 그 층에서 나올 수 있는 제일 낮은 등급으로 재 본다 — 제일 빡빡한 경우다.
                const tier = Math.max(1, depth - 6);
                const pool = Object.keys(table).filter(
                    (k) => table[k].depth <= tier && table[k].depth > tier - band,
                );
                assert.ok(pool.length > 0, `지하 ${depth}층(등급 ${tier})에서 뽑을 ${label}가 없다`);
            }
        }
    }

    // ── 손질(+N)은 깊을수록 커진다 — 다만 한 칸씩만
    {
        const best = (depth: number) => {
            let hi = 0;
            for (let seed = 1; seed <= 40; seed++) {
                for (const it of drops(depth, 80, seed)) {
                    if (it.cursed) continue;
                    hi = Math.max(hi, it.plusHit ?? 0, it.plusArmor ?? 0);
                }
            }
            return hi;
        };
        const shallow = best(1);
        const deep = best(26);
        assert.ok(deep > shallow, `깊은 층의 손질(+${deep})이 얕은 층(+${shallow})보다 안 크다`);
        assert.ok(deep <= 3, `손질이 +${deep} 까지 나온다 — 주문서로 올릴 자리가 없어진다`);
    }
});

test("적어 놓은 띠와 실제로 떨어지는 층이 같다", () => {
    // `itemDepthRange` 가 `randomItem` 과 다른 식을 쓰기 시작하면 화면이 거짓말을 한다.
    for (const [kind, table] of [
        ["weapon", WEAPONS],
        ["armor", ARMORS],
    ] as const) {
        for (const type of Object.keys(table)) {
            const band = itemDepthRange(kind, type)!;
            assert.ok(band, `${type} 의 띠가 없다`);
            // 띠의 양 끝에서는 실제로 나와야 하고, 그 바깥에서는 안 나와야 한다.
            const seenAt = (depth: number) => {
                for (let seed = 1; seed <= 80; seed++) {
                    if (drops(depth, 60, seed).some((it) => it.kind === kind && it.type === type)) {
                        return true;
                    }
                }
                return false;
            };
            assert.ok(seenAt(band.min), `${type} 가 ${band.min}층에서 안 나온다`);
            if (band.min > 1) {
                assert.ok(!seenAt(band.min - 1), `${type} 가 ${band.min - 1}층에서 나온다`);
            }
            if (band.max < 26) {
                assert.ok(!seenAt(band.max + 1), `${type} 가 ${band.max + 1}층에서 나온다`);
            }
        }
    }
});

// ── 화면에 **로마자를 안 내보낸다** ──────────────────────────────────────────
//
// `describe()` 는 표에 없는 `type` 이 오면 예전에 그 키를 그대로 찍었다. 키는 영문이다
// (`banded mail` · `plate mail` …). 평소에는 안 보이지만, **표에서 한 줄을 지우는 순간
// 그것을 들고 있던 옛 저장이 영어로 뜬다** — 물건 등급을 층에 맞추면서 `banded mail`
// 을 지웠을 때 실제로 그랬다.
//
// 저장은 판을 넘어 남고 표는 계속 바뀐다. 그래서 「지우지 말자」는 약속이 아니라
// **못 새게 하는 자물쇠**가 필요하다.
