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

import {
    ARMORS, ENCHANT_SCROLLS, POTIONS, RINGS, SCROLLS, WANDS, WEAPONS,
    categoryWeights, itemDepthRange, pickCategory, randomItem,
} from "@/lib/rogue/items";
import { newGame, perform } from "@/lib/rogue/game";
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

// ── 강화 주문서는 **층이 사정을 본다** ─────────────────────────────────
//
// 강화는 이 게임의 캐릭터 키우기 자리다. 주문서 여덟 종 안에 섞여 있으면 층별로
// 조절할 손잡이가 없고(빈도를 건드리면 감정·지도까지 같이 움직인다), 확률만으로
// 두면 **다섯 층 연속 안 나오는 판**이 나와 그 축이 통째로 사라진다.

test("강화 주문서는 분류로 서고, 층 규칙이 그 위에 얹힌다", () => {
    // ── 보통 주문서 통에는 강화가 **없다**
    {
        // 안 빼면 강화가 두 통에 다 들어 있어서, 최상위 가중치를 낮춰도 주문서 쪽으로
        // 새어 나온다 — 손잡이를 달아 놓고 안 듣는 꼴이다.
        const rng = new Rng(4242);
        let leaked = 0;
        for (let i = 0; i < 4000; i++) {
            const it = randomItem(13, i, 0, 0, rng, "scroll");
            assert.equal(it.kind, "scroll");
            if (ENCHANT_SCROLLS.includes(it.type)) leaked++;
        }
        assert.equal(leaked, 0, "보통 주문서 통에서 강화가 나왔다");
    }

    // ── 강화 분류는 **강화만** 내고, 무기 쪽이 더 잦다
    {
        const rng = new Rng(99);
        const got: Record<string, number> = {};
        for (let i = 0; i < 4000; i++) {
            const it = randomItem(13, i, 0, 0, rng, "enchant");
            assert.ok(ENCHANT_SCROLLS.includes(it.type), `강화 분류에서 ${it.type} 이 나왔다`);
            got[it.type] = (got[it.type] ?? 0) + 1;
        }
        // 55:45 — 갑옷 강화는 피해를 깎는 쪽이라 한 장의 체감이 더 크다.
        assert.ok(
            got["enchant weapon"] > got["enchant armor"],
            `무기 쪽이 더 잦아야 한다 (무기 ${got["enchant weapon"]} · 갑옷 ${got["enchant armor"]})`,
        );
    }

    // ── 가중치는 **깊을수록 오르고**, 합은 어디서나 100 이다
    {
        let last = 0;
        for (const d of [1, 5, 6, 12, 13, 19, 20, 26]) {
            const w = categoryWeights(d);
            const sum = Object.values(w).reduce((a, b) => a + b, 0);
            assert.equal(sum, 100, `${d}층 가중치 합이 ${sum} 이다`);
            assert.ok(w.enchant >= last, `${d}층에서 강화 가중치가 내려갔다`);
            last = w.enchant;
            // 식량과 물약은 깊어져도 마르면 안 된다 — 굶어 죽는 까닭이 운이 된다.
            assert.ok(w.food >= 9 && w.potion >= 14, `${d}층에서 식량·물약이 너무 말랐다`);
        }
        assert.ok(categoryWeights(26).enchant > categoryWeights(1).enchant);
    }

    // ── 가뭄 보정이 **실제로 켜진다**
    {
        const rate = (scale: number) => {
            const rng = new Rng(777);
            let n = 0;
            for (let i = 0; i < 20000; i++) if (pickCategory(10, rng, scale) === "enchant") n++;
            return n / 20000;
        };
        const dry = rate(1 + 0.8 * 3);
        assert.ok(rate(0) === 0, "0 배인데도 강화가 나왔다 — 1층 규칙이 안 듣는다");
        assert.ok(dry > rate(1) * 2, `굶은 뒤가 더 잦아야 한다 (보통 ${rate(1)} · 가뭄 ${dry})`);
    }
});

test("층이 실제로 강화를 두 장까지만, 1층에는 하나도 안 놓는다", () => {
    // 위는 뽑기의 성질이고, 이건 **층을 실제로 파서** 센다 — 둘이 갈리면 규칙이
    // 어딘가에서 안 불리고 있는 것이다.
    const ench = (l: { items: Item[] }) =>
        l.items.filter((i) => i.kind === "scroll" && ENCHANT_SCROLLS.includes(i.type)).length;

    let first = 0;
    let worstFloor = 0;
    let worstDrought = 0;
    for (let seed = 1; seed <= 40; seed++) {
        let s = newGame(seed);
        first += ench(s.level);
        let drought = ench(s.level) > 0 ? 0 : 1;
        for (let d = 2; d <= 20; d++) {
            s.hero.x = s.level.stairs.x;
            s.hero.y = s.level.stairs.y;
            s = perform(s, { t: "descend" });
            if (s.level.depth !== d) break;
            const n = ench(s.level);
            worstFloor = Math.max(worstFloor, n);
            drought = n > 0 ? 0 : drought + 1;
            worstDrought = Math.max(worstDrought, drought);
        }
    }
    assert.equal(first, 0, "1층에 강화 주문서가 놓였다 — 쥔 것도 입은 것도 없이 읽으면 버리는 셈이다");
    assert.ok(worstFloor <= 2, `한 층에 ${worstFloor} 장이 놓였다 — 두 장까지다`);
    // 보정이 있으므로 오래 굶을 수 없다. 스무 층에 열 층 넘게 굶으면 규칙이 안 듣는 것이다.
    assert.ok(worstDrought <= 10, `${worstDrought} 층 연속 강화가 없었다 — 가뭄 보정이 안 듣는다`);
});

test("장비는 띠 안에서 **위쪽이 더 잦다**", () => {
    // 띠를 좁혀서 낡은 것을 빼면 「깊은 층에서 등급이 튄다」가 된다. 띠는 그대로 두고
    // 기울기만 준다 — 그래서 단검은 여전히 20층에 나오되 드물어야 한다.
    const meanTier = (depth: number) => {
        const rng = new Rng(31 + depth);
        let sum = 0;
        let n = 0;
        for (let i = 0; i < 6000; i++) {
            const it = randomItem(depth, i, 0, 0, rng, i % 2 ? "weapon" : "armor");
            const table = it.kind === "weapon" ? WEAPONS : ARMORS;
            const def = table[it.type as keyof typeof table] as { depth: number } | undefined;
            if (def) {
                sum += def.depth;
                n++;
            }
        }
        return sum / n;
    };
    // 기울기가 없으면 20층 평균이 띠 한가운데(≈14)에 선다. 위로 실렸으면 그보다 높다.
    const deep = meanTier(20);
    assert.ok(deep > 14.6, `20층 장비 평균 등급이 ${deep.toFixed(2)} — 위쪽에 안 실렸다`);
    assert.ok(meanTier(20) > meanTier(10), "깊을수록 등급이 올라야 한다");
});
