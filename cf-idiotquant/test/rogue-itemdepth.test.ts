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
    ARMORS,
    POTIONS,
    RINGS,
    SCROLLS,
    WANDS,
    WEAPONS,
    itemDepthRange,
    randomItem,
} from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";
import type { Item } from "@/lib/rogue/types";

/** 그 층에서 물건을 잔뜩 떨어뜨려 본다. */
function drops(depth: number, n: number, seed = 1): Item[] {
    const rng = new Rng(seed * 7919 + depth);
    const out: Item[] = [];
    for (let i = 0; i < n; i++) out.push(randomItem(depth, i, 0, 0, rng));
    return out;
}

/** 주사위의 기댓값 — `4d5` → 12. 사다리가 오르는지 보는 데 쓴다. */
function expect(dice: string): number {
    const [n, sides] = dice.split("d").map(Number);
    return (n * (sides + 1)) / 2;
}

const DEPTHS = [1, 2, 4, 7, 11, 15, 19, 23, 26];

test("얕은 층에 깊은 물건이 안 떨어진다", () => {
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
});

test("26층 바닥에 단검과 가죽 갑옷이 안 뒹군다", () => {
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
});

test("깊은 층에 허름한 장비가 안 떨어진다 — 낡는 것은 장비뿐이다", () => {
    for (const depth of [19, 23, 26]) {
        for (let seed = 1; seed <= 20; seed++) {
            for (const it of drops(depth, 60, seed)) {
                if (it.kind !== "weapon" && it.kind !== "armor") continue;
                const band = itemDepthRange(it.kind, it.type)!;
                assert.ok(
                    band.max >= depth,
                    `지하 ${depth}층에 ${it.type} 가 떨어졌다 — ${band.max}층까지만 나와야 한다`,
                );
            }
        }
    }
});

test("26층에서도 체력 회복 물약과 식량이 나온다 — 소모품은 안 낡는다", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
        for (const it of drops(26, 60, seed)) seen.add(`${it.kind}:${it.type}`);
    }
    assert.ok(seen.has("potion:healing"), "26층에 체력 회복 물약이 없다");
    assert.ok(seen.has("food:food ration"), "26층에 식량이 없다");
    assert.ok(seen.has("scroll:identify"), "26층에 감정 주문서가 없다");
});

test("1층에서 뽑히는 무기·갑옷은 1층짜리들뿐이다", () => {
    const weapons = new Set<string>();
    const armors = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
        for (const it of drops(1, 40, seed)) {
            if (it.kind === "weapon") weapons.add(it.type);
            if (it.kind === "armor") armors.add(it.type);
        }
    }
    assert.ok(weapons.size > 0 && armors.size > 0, "1층에서 무기·갑옷이 하나도 안 나왔다");
    for (const t of weapons) {
        assert.ok(WEAPONS[t].depth <= 4, `1층에 ${t}(${WEAPONS[t].depth}층짜리)가 나왔다`);
    }
    for (const t of armors) {
        assert.ok(ARMORS[t].depth <= 4, `1층에 ${t}(${ARMORS[t].depth}층짜리)가 나왔다`);
    }
});

test("사다리가 단조롭다 — 깊은 층의 것이 더 세다", () => {
    // **같은 층끼리는 안 본다.** 1층에 단검(1d6)·철퇴(2d4)·창(2d3)이 같이 있는 것은
    // 고를 것이 있다는 뜻이지 사다리가 어긋난 것이 아니다. 어긋나면 안 되는 것은
    // **층이 다른 둘**이다 — 4층짜리가 1층짜리보다 약하면 내려갈 이유가 없어진다.
    const gear = Object.values(WEAPONS).filter((w) => !w.stack);
    for (const a of gear) {
        for (const b of gear) {
            if (a.depth >= b.depth) continue;
            assert.ok(
                expect(b.damage) > expect(a.damage),
                `${b.name}(${b.depth}층 ${b.damage}) 이 ${a.name}(${a.depth}층 ${a.damage}) 보다 약하다`,
            );
        }
    }
    // 갑옷: 방어 등급은 **낮을수록 단단하다** — 깊을수록 내려가야 한다.
    const armors = Object.values(ARMORS);
    for (const a of armors) {
        for (const b of armors) {
            if (a.depth >= b.depth) continue;
            assert.ok(
                b.armor < a.armor,
                `${b.name}(${b.depth}층 등급 ${b.armor}) 이 ${a.name}(${a.depth}층 등급 ${a.armor}) 보다 무르다`,
            );
        }
    }
    // 뭉치는 것(다트·화살·은화살)도 저희끼리는 사다리다.
    const ammo = Object.values(WEAPONS).filter((w) => w.stack);
    for (const a of ammo) {
        for (const b of ammo) {
            if (a.depth >= b.depth) continue;
            assert.ok(expect(b.damage) > expect(a.damage), `${b.name} 이 ${a.name} 보다 약하다`);
        }
    }
});

test("스물여섯 층 어디에도 뽑을 것이 없는 칸은 없다", () => {
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
});

test("손질(+N)은 깊을수록 커진다 — 다만 한 칸씩만", () => {
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

import { describe as nameOf, rollAppearances } from "@/lib/rogue/items";

/** 로마자가 한 글자라도 섞였는가. */
const hasLatin = (s: string) => /[A-Za-z]/.test(s);

test("모든 물건 이름이 한글이다 — 알아낸 것도, 모르는 것도", () => {
    const app = rollAppearances(new Rng(4242));
    const tables: [Item["kind"], Record<string, unknown>][] = [
        ["weapon", WEAPONS],
        ["armor", ARMORS],
        ["potion", POTIONS],
        ["scroll", SCROLLS],
        ["ring", RINGS],
        ["wand", WANDS],
    ];
    for (const [kind, table] of tables) {
        for (const type of Object.keys(table)) {
            const it = { id: 1, kind, type, count: 1, x: 0, y: 0, charges: 3 } as Item;
            const known = nameOf(it, { [`${kind}:${type}`]: true }, app);
            const unknown = nameOf(it, {}, app);
            assert.ok(!hasLatin(known), `${kind}:${type} 를 알아내면 「${known}」로 뜬다`);
            assert.ok(!hasLatin(unknown), `${kind}:${type} 를 모르면 「${unknown}」로 뜬다`);
        }
    }
});

test("표에 없는 물건도 한글로 물러선다 — 옛 저장이 영어로 뜨지 않는다", () => {
    // **어느 표에도 없는 키**여야 한다. 예전에 지웠다 되살린 `banded mail` 을 쓰면 갑옷
    // 표가 이름을 찾아 주므로 물러설 일이 없고, 테스트가 아무것도 안 보게 된다.
    const app = rollAppearances(new Rng(7));
    for (const kind of ["weapon", "armor", "potion", "scroll", "ring", "wand"] as const) {
        const it = { id: 1, kind, type: "rusty gizmo", count: 1, x: 0, y: 0, charges: 1 } as Item;
        for (const known of [{}, { [`${kind}:rusty gizmo`]: true }]) {
            const shown = nameOf(it, known, app);
            assert.ok(!hasLatin(shown), `${kind} 의 모르는 종류가 「${shown}」로 뜬다`);
        }
    }
});

test("예전 표에 있던 종류는 지금도 이름이 있다 — 저장은 판을 넘어 남는다", () => {
    // 표에서 줄을 지우면 그것을 들고 있던 저장이 갈 곳을 잃는다. 지웠던 `banded mail`
    // 을 되살린 뒤로, 첫 판(`/game` 이 Rogue 가 된 판) 이래의 키는 전부 여기 있다.
    for (const type of ["dagger", "mace", "long sword", "two-handed sword", "spear", "dart", "arrow"]) {
        assert.ok(WEAPONS[type], `무기 ${type} 가 표에서 사라졌다 — 옛 저장이 이름을 잃는다`);
    }
    for (const type of ["leather", "ring mail", "scale mail", "chain mail", "banded mail", "plate mail"]) {
        assert.ok(ARMORS[type], `갑옷 ${type} 가 표에서 사라졌다 — 옛 저장이 이름을 잃는다`);
    }
});

// ── **마이너스 손질은 없다** ────────────────────────────────────────────────
//
// 저주받은 물건이 `−2` 로 나오면 저주의 대가가 **두 벌**이 된다 — 못 벗는다는 것과
// 숫자가 깎인다는 것. 지금은 하나다: 못 벗는다. 사다리가 층을 타는 지금 그 값은 예전보다
// 오히려 크다 — 20층에서 4층짜리 장검에 손이 묶이는 것이 `−2` 보다 아프다.

test("떨어지는 물건에 마이너스 손질이 없다 — 저주받은 것도", () => {
    let cursed = 0;
    for (const depth of [1, 5, 11, 18, 26]) {
        for (let seed = 1; seed <= 40; seed++) {
            for (const it of drops(depth, 60, seed)) {
                if (it.cursed) cursed++;
                for (const [what, n] of [
                    ["명중", it.plusHit],
                    ["피해", it.plusDam],
                    ["갑옷", it.plusArmor],
                    ["반지", it.plusRing],
                ] as [string, number | undefined][]) {
                    assert.ok(
                        (n ?? 0) >= 0,
                        `지하 ${depth}층의 ${it.type} 에 ${what} ${n} — 마이너스는 없어야 한다`,
                    );
                }
            }
        }
    }
    // 저주 자체는 그대로 있다. 없앤 것은 깎인 숫자이지 저주가 아니다.
    assert.ok(cursed > 0, "저주받은 물건이 하나도 안 나온다 — 저주까지 사라졌다");
});
