// 강화 — **이 게임에서 캐릭터를 키우는 자리.**
//
// 레벨업은 체력 +5 와 네 레벨마다 숙련 +1 뿐이라, 키우는 맛은 손에 쥔 것의 숫자가 낸다.
// 그래서 이 규칙이 흔들리면 「키운다」가 통째로 사라진다.
//
// 거는 것:
//
//   ① **안전 구간은 종류마다 다르다** — 무기는 `+6`, 갑옷은 `+4` 까지 안 굴린다. 안전
//      구간이 없으면 첫 주문서부터 도박이고, 그건 키우기가 아니라 그냥 운이다. 그런데
//      **떨어지는 물건이 이미 `+0~+3`** 이라 안전 구간을 `+3` 에 두면 강화가 운 좋은
//      드랍과 똑같아진다 — 재 보고 알았다. 갑옷이 두 칸 낮은 것은 **한 칸의 무게가 다르기
//      때문**이다: 갑옷 `+1` 은 맞는 것 자체를 줄여 모든 싸움에 듣는다.
//   ② **실패하면 부서진다** — 수치가 내려가는 게 아니라 물건이 사라진다.
//   ③ **+9 가 끝이다.** 상한이 없으면 운 좋은 `+12 장검`(4층짜리)이 바포메트의 검
//      (25층짜리)을 이겨서 **내려갈 이유가 사라진다.**
//   ④ **대상 없이 읽으면 아무 일도 안 난다** — 주문서도 턴도 안 쓴다. 화면이 고를 것을
//      묻는 사이에 판이 한 턴 흐르면 안 된다.
//   ⑤ **화면이 적는 확률과 실제로 굴리는 확률이 같다.** 갈리면 사람은 자기가 본 숫자를
//      믿고 걸었다가 영문을 모른 채 물건을 잃는다.
//   ⑥ **축복은 안전 구간 안에서만 다르다** — 한 번에 `1~3` 칸을 올리되 그 종류의 천장에서
//      잘린다. 천장 위에서는 굴림도 대가도 일반과 똑같다. 축복이 천장까지 올리면 `+9` 가
//      걸어 들어와서 사다리(층)가 무너진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { addToPack, equippedArmor, equippedWeapon } from "@/lib/rogue/hero";
import { ENCHANT_MAX, enchantOdds, enchantOf, enchantSafeMax, makeItem } from "@/lib/rogue/items";
import { isDetail } from "@/lib/rogue/combat";
import type { GameState, Item } from "@/lib/rogue/types";

/**
 * 배낭에 강화 주문서 한 장과 물건 하나를 넣고 그 둘을 돌려준다.
 *
 * 수치는 **손으로** 놓는다(`setEnchant` 를 안 쓴다) — 그 함수가 고장 나도 테스트가
 * 같이 눈이 멀면 안 된다.
 */
function setup(seed: number, kind: "weapon" | "armor", type: string, plus: number, blessed = false) {
    const s = newGame(seed);
    const it = makeItem(kind, type, 900, -1, -1);
    if (kind === "armor") it.plusArmor = plus;
    else {
        it.plusHit = plus;
        it.plusDam = plus;
    }
    addToPack(s.hero, it);
    const scrollType = blessed ? "blessed enchant" : kind === "armor" ? "enchant armor" : "enchant weapon";
    const scroll = makeItem("scroll", scrollType, 901, -1, -1);
    addToPack(s.hero, scroll);
    s.known[`scroll:${scroll.type}`] = true;
    return { s, it, scroll };
}

/** 종류마다 「어디까지 안전한가」 — 표와 테스트가 같은 것을 본다. */
const SAFE = [
    ["weapon", "long sword", 6],
    ["armor", "plate mail", 4],
] as const;

test("안전 구간은 종류마다 다르다 — 무기 +6 · 갑옷 +4", () => {
    // ── 표: 천장까지 100%, 그 위는 단조 감소, 상한에서 0
    {
        for (const [kind, , safe] of SAFE) {
            assert.equal(enchantSafeMax(kind), safe, `${kind} 의 천장이 표와 다르다`);
            for (let n = 0; n < safe; n++) {
                assert.equal(enchantOdds(n, kind), 1, `${kind} +${n} 이 안전하지 않다`);
            }
            assert.ok(enchantOdds(safe, kind) < 1, `${kind} 는 +${safe} 위도 안전하다 — 도박이 없다`);
            for (let n = 1; n <= ENCHANT_MAX; n++) {
                assert.ok(
                    enchantOdds(n, kind) <= enchantOdds(n - 1, kind),
                    `${kind} +${n} 의 성공률이 +${n - 1} 보다 높다 — 올라갈수록 어려워야 한다`,
                );
            }
            assert.equal(enchantOdds(ENCHANT_MAX, kind), 0, `${kind} 가 상한에서 더 오른다`);
            for (let n = safe; n < ENCHANT_MAX; n++) {
                assert.ok(
                    enchantOdds(n, kind) > 0 && enchantOdds(n, kind) < 1,
                    `${kind} +${n} 에 도박이 없다`,
                );
            }
        }
    }

    // ── 갑옷은 **먼저** 도박을 시작할 뿐, 같은 자리에서 더 가혹하지는 않다
    {
        for (let n = 0; n <= ENCHANT_MAX; n++) {
            assert.ok(
                enchantOdds(n, "armor") <= enchantOdds(n, "weapon"),
                `+${n} 에서 갑옷이 무기보다 잘 붙는다 — 안전 구간이 좁은 쪽이 유리해졌다`,
            );
        }
        // 두 천장을 다 지난 뒤로는 **같은 값**을 쓴다. 종류마다 꼬리를 따로 밀면 `+9`
        // 도달률이 한쪽만 수십 배로 벌어진다(밀면 무기 15.4% 대 갑옷 0.6%).
        for (let n = 6; n <= ENCHANT_MAX; n++) {
            assert.equal(
                enchantOdds(n, "armor"),
                enchantOdds(n, "weapon"),
                `+${n} 에서 두 종류의 꼬리가 갈렸다`,
            );
        }
    }

    // ── 천장까지는 절대 안 부서진다
    {
        for (const [kind, type, safe] of SAFE) {
            for (let plus = 0; plus < safe; plus++) {
                for (let seed = 1; seed <= 60; seed++) {
                    const { s, it, scroll } = setup(seed * 31 + plus, kind, type, plus);
                    const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
                    assert.ok(
                        after.hero.pack.some((p) => p.id === it.id),
                        `${kind} +${plus} 짜리가 부서졌다 — 여기까지는 안전해야 한다`,
                    );
                    assert.equal(enchantOf(it), plus + 1, `${kind} +${plus} 에서 안 올랐다`);
                }
            }
        }
    }
});

test("실패하면 사라진다 — 쥐고 있던 자리도 빈다", () => {
    // ── 실패하면 부서진다 — 수치가 내려가는 것이 아니라 사라진다
    {
        let broke = 0;
        let grew = 0;
        for (let seed = 1; seed <= 200; seed++) {
            // +8 은 25% — 대부분 부서진다.
            const { s, it, scroll } = setup(seed * 7919, "weapon", "silver sword", 8);
            const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
            const still = after.hero.pack.find((p) => p.id === it.id);
            if (still) {
                grew++;
                assert.equal(still.plusHit, 9, "살아남았는데 안 올랐다");
            } else {
                broke++;
            }
            // **어느 쪽이든 마이너스는 없다.**
            assert.ok((still?.plusHit ?? 0) >= 0);
        }
        assert.ok(broke > 0, "한 번도 안 부서졌다 — 도박이 없다");
        assert.ok(grew > 0, "한 번도 안 올랐다 — 걸 이유가 없다");
    }

    // ── 쥐고 있던 것이 부서지면 그 자리도 빈다
    {
        let seen = false;
        for (let seed = 1; seed <= 200 && !seen; seed++) {
            const { s, it, scroll } = setup(seed * 104729, "weapon", "silver sword", 8);
            s.hero.weaponId = it.id;
            const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
            if (after.hero.pack.some((p) => p.id === it.id)) continue;
            seen = true;
            assert.equal(equippedWeapon(after.hero), undefined, "부서졌는데 아직 쥐고 있다");
            assert.equal(after.hero.weaponId, null);
        }
        assert.ok(seen, "이백 번을 걸어도 한 번도 안 부서졌다");
    }
});

test("상한과 대상 없는 읽기는 주문서도 턴도 안 쓴다", () => {
    // ── +9 는 더 안 오른다 — 주문서도 턴도 안 쓴다
    {
        const { s, it, scroll } = setup(77, "weapon", "knight sword", ENCHANT_MAX);
        const packBefore = s.hero.pack.length;
        const turnBefore = s.turn;
        const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
        assert.equal(after.hero.pack.length, packBefore, "상한인데 주문서가 없어졌다");
        assert.equal(after.turn, turnBefore, "상한인데 턴이 갔다");
        assert.equal(it.plusHit, ENCHANT_MAX, "상한을 넘었다");
        assert.ok(after.messages.some((m) => m.includes("더 손댈 곳이 없다")));
    }

    // ── 대상 없이 읽으면 아무 일도 안 난다 — 주문서도 턴도 그대로
    {
        const { s, scroll } = setup(78, "weapon", "long sword", 0);
        const packBefore = s.hero.pack.length;
        const turnBefore = s.turn;
        const msgBefore = s.messages.length;
        const after = perform(s, { t: "read", letter: scroll.letter! });
        assert.equal(after.hero.pack.length, packBefore, "대상도 없이 주문서가 없어졌다");
        assert.equal(after.turn, turnBefore, "대상도 없이 턴이 갔다");
        assert.equal(after.messages.length, msgBefore, "아무 일도 안 났는데 말이 남았다");
    }
});

test("갑옷도 강화되고, 엉뚱한 것에는 안 걸린다", () => {
    // ── 갑옷도 강화된다 — 실패하면 갑옷이 부서진다
    {
        // 안전 구간에서는 반드시 오른다.
        const { s, it, scroll } = setup(84, "armor", "plate mail", 2);
        perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
        assert.equal(it.plusArmor, 3, "갑옷이 안 올랐다");

        // 도박 구간에서는 부서지고, 입고 있었으면 맨몸이 된다.
        let seen = false;
        for (let seed = 1; seed <= 200 && !seen; seed++) {
            const g = setup(seed * 911, "armor", "plate mail", 8);
            g.s.hero.armorId = g.it.id;
            const after = perform(g.s, { t: "read", letter: g.scroll.letter!, target: g.it.letter! });
            if (after.hero.pack.some((p) => p.id === g.it.id)) continue;
            seen = true;
            assert.equal(equippedArmor(after.hero), undefined, "부서졌는데 아직 입고 있다");
        }
        assert.ok(seen, "이백 번을 걸어도 한 번도 안 부서졌다");
    }

    // ── 무기 강화 주문서로 갑옷을 못 건드린다 — 주문서도 턴도 안 쓴다
    {
        const { s, scroll } = setup(83, "weapon", "long sword", 0);
        const armor = makeItem("armor", "plate mail", 951, -1, -1);
        addToPack(s.hero, armor);
        const packBefore = s.hero.pack.length;
        const turnBefore = s.turn;
        const after = perform(s, { t: "read", letter: scroll.letter!, target: armor.letter! });
        assert.equal(armor.plusArmor, 0);
        assert.equal(after.hero.pack.length, packBefore, "거절했는데 주문서가 없어졌다");
        assert.equal(after.turn, turnBefore, "거절했는데 턴이 갔다");
    }
});

test("굴림 줄이 남고, 저주받은 것도 걸리고, 정체를 알게 된다", () => {
    // ── 굴림 줄이 남는다 — 확률과 굴린 눈과 결과
    {
        const { s, it, scroll } = setup(81, "weapon", "silver sword", 6); // 무기 천장 바로 위 — 55%
        const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
        // **마지막 계산 줄이 아니라 강화 줄을 집는다.** 같은 턴에 몬스터가 때리면 그
        // 뒤에 `· 피해 …` 가 붙어서, 마지막 줄로 잡으면 엉뚱한 것을 본다.
        const line = after.messages.filter(isDetail).find((l) => l.startsWith("· 강화 "))!;
        assert.ok(line, `강화 줄이 없다: ${JSON.stringify(after.messages.filter(isDetail))}`);
        assert.match(line, /^· 강화 /, `강화 줄이 없다: ${line}`);
        assert.match(line, /→ \+7/, "어디로 가는지가 없다");
        assert.match(line, /d100 \d+/, "굴린 눈이 없다");
        // **화면이 적는 확률과 같은 자리에서 온다**(`enchantOdds`).
        assert.ok(
            line.includes(`${Math.round(enchantOdds(6, "weapon") * 100)}%`),
            `적힌 확률이 표와 다르다: ${line}`,
        );
        assert.match(line, /→ (성공|실패)$/, "결과가 없다");
    }

    // ── 저주받은 것도 걸 수 있다 — 부서지면 저주에서 풀려난다
    {
        let seen = false;
        for (let seed = 1; seed <= 200 && !seen; seed++) {
            const { s, it, scroll } = setup(seed * 313, "weapon", "silver sword", 8);
            it.cursed = true;
            it.curseKnown = true;
            s.hero.weaponId = it.id;
            const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
            if (after.hero.pack.some((p) => p.id === it.id)) continue;
            seen = true;
            // 쥐고 놓을 수 없던 것이 사라졌다 — 그것이 이 도박의 다른 쪽 값이다.
            assert.equal(equippedWeapon(after.hero), undefined);
        }
        assert.ok(seen, "저주받은 것을 이백 번 걸어도 한 번도 안 부서졌다");
    }

    // ── 강화하면 그 물건의 정체를 알게 된다
    {
        const { s, it, scroll } = setup(82, "weapon", "thirsty sword", 0);
        assert.ok(!s.known["weapon:thirsty sword"], "걸기 전부터 알고 있다");
        const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
        assert.ok(after.known["weapon:thirsty sword"], "걸어 봤는데 아직 모른다");
    }
});

test("축복은 안전 구간 안에서만 다르다 — 한 번에 1~3 칸, 천장에서 잘린다", () => {
    // ── +0 에 읽으면 1~3 칸이 오르고, 셋이 다 나온다
    {
        for (const [kind, type] of SAFE) {
            const steps = new Set<number>();
            for (let seed = 1; seed <= 200; seed++) {
                const { s, it, scroll } = setup(seed * 7717, kind, type, 0, true);
                const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
                assert.ok(
                    after.hero.pack.some((p) => p.id === it.id),
                    `${kind} 축복이 안전 구간 안에서 부서졌다`,
                );
                const got = enchantOf(it);
                assert.ok(got >= 1 && got <= 3, `${kind} 축복이 ${got} 칸 올랐다 — 1~3 이어야 한다`);
                steps.add(got);
            }
            assert.deepEqual([...steps].sort(), [1, 2, 3], `${kind} 축복의 눈이 1~3 을 다 안 돈다`);
        }
    }

    // ── 천장을 넘는 눈이 나와도 **천장에서 멈춘다**
    {
        for (const [kind, type, safe] of SAFE) {
            for (let seed = 1; seed <= 120; seed++) {
                const { s, it, scroll } = setup(seed * 5281, kind, type, safe - 1, true);
                perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
                assert.equal(
                    enchantOf(it),
                    safe,
                    `${kind} 축복이 천장 +${safe} 에서 안 멈췄다 — 넘으면 +9 가 걸어 들어온다`,
                );
            }
        }
    }

    // ── 무기는 명중과 피해가 **같이** 움직인다 (여러 칸을 한 번에 올려도)
    {
        for (let seed = 1; seed <= 40; seed++) {
            const { s, it, scroll } = setup(seed * 4242, "weapon", "long sword", 0, true);
            perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
            assert.equal(it.plusDam, it.plusHit, "명중만 오르고 피해가 안 따라왔다");
        }
    }

    // ── 천장 **위**에서는 일반과 똑같다 — 한 칸씩 오르고, 실패하면 부서진다
    {
        let broke = 0;
        let grew = 0;
        for (let seed = 1; seed <= 200; seed++) {
            const { s, it, scroll } = setup(seed * 8663, "weapon", "silver sword", 8, true);
            const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
            const still = after.hero.pack.find((p) => p.id === it.id);
            if (still) {
                grew++;
                assert.equal(enchantOf(still), 9, "천장 위인데 한 칸보다 많이 올랐다");
            } else {
                broke++;
            }
        }
        assert.ok(broke > 0, "축복이 천장 위에서도 안 부서진다 — 그러면 도박이 통째로 사라진다");
        assert.ok(grew > 0, "천장 위에서 한 번도 안 올랐다");
    }

    // ── 상한에 닿은 것에는 축복도 안 걸린다 — 주문서도 턴도 안 쓴다
    {
        const { s, it, scroll } = setup(4244, "weapon", "knight sword", ENCHANT_MAX, true);
        const packBefore = s.hero.pack.length;
        const turnBefore = s.turn;
        const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
        assert.equal(after.hero.pack.length, packBefore, "상한인데 축복 주문서가 없어졌다");
        assert.equal(after.turn, turnBefore, "상한인데 턴이 갔다");
        assert.equal(enchantOf(it), ENCHANT_MAX, "축복이 상한을 넘었다");
    }

    // ── 굴림 줄이 남는다 — 어디로 갔는지와 굴린 눈
    {
        const { s, it, scroll } = setup(4243, "weapon", "long sword", 0, true);
        const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
        const line = after.messages.filter(isDetail).find((l) => l.startsWith("· 축복 강화 "));
        assert.ok(line, `축복 줄이 없다: ${JSON.stringify(after.messages.filter(isDetail))}`);
        assert.match(line!, /→ \+[1-3]/, "어디로 갔는지가 없다");
        assert.match(line!, /d3 [1-3]/, "굴린 눈이 없다");
    }
});
