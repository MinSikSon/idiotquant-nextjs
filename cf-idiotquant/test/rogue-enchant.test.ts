// 강화 — **이 게임에서 캐릭터를 키우는 자리.**
//
// 레벨업은 체력 +5 와 네 레벨마다 숙련 +1 뿐이라, 키우는 맛은 손에 쥔 것의 숫자가 낸다.
// 그래서 이 규칙이 흔들리면 「키운다」가 통째로 사라진다.
//
// 거는 것:
//
//   ① **+5 까지는 절대 안 부서진다.** 안전 구간이 없으면 첫 주문서부터 도박이고, 그건
//      키우기가 아니라 그냥 운이다. 그런데 **떨어지는 물건이 이미 `+0~+3`** 이라 안전
//      구간을 `+3` 에 두면 강화가 운 좋은 드랍과 똑같아진다 — 재 보고 두 칸을 더 줬다.
//   ② **실패하면 부서진다** — 수치가 내려가는 게 아니라 물건이 사라진다.
//   ③ **+9 가 끝이다.** 상한이 없으면 운 좋은 `+12 장검`(4층짜리)이 바포메트의 검
//      (25층짜리)을 이겨서 **내려갈 이유가 사라진다.**
//   ④ **대상 없이 읽으면 아무 일도 안 난다** — 주문서도 턴도 안 쓴다. 화면이 고를 것을
//      묻는 사이에 판이 한 턴 흐르면 안 된다.
//   ⑤ **화면이 적는 확률과 실제로 굴리는 확률이 같다.** 갈리면 사람은 자기가 본 숫자를
//      믿고 걸었다가 영문을 모른 채 물건을 잃는다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { isEnchantScroll, newGame, perform } from "@/lib/rogue/game";
import { addToPack, equippedWeapon } from "@/lib/rogue/hero";
import { ENCHANT_MAX, SCROLLS, enchantOdds, makeItem, randomItem } from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";
import { isDetail } from "@/lib/rogue/combat";
import type { GameState, Item } from "@/lib/rogue/types";

/** 배낭에 강화 주문서 한 장과 무기 하나를 넣고 그 둘을 돌려준다. */
function setup(seed: number, _kind: "weapon", type: string, plus: number) {
    const s = newGame(seed);
    const it = makeItem("weapon", type, 900, -1, -1);
    it.plusHit = plus;
    it.plusDam = plus;
    addToPack(s.hero, it);
    const scroll = makeItem("scroll", "enchant weapon", 901, -1, -1);
    addToPack(s.hero, scroll);
    s.known[`scroll:${scroll.type}`] = true;
    return { s, it, scroll };
}

/** 주문서를 한 장 더 준다 — 여러 번 걸어 볼 때. */
function giveScroll(s: GameState, type: string, id: number): Item {
    const sc = makeItem("scroll", type, id, -1, -1);
    addToPack(s.hero, sc);
    return sc;
}

test("성공률표는 단조 감소하고, +5 까지는 100% 이며, 상한에서는 0 이다", () => {
    // 떨어지는 물건이 이미 +0~+3 이다. 안전 구간이 거기서 끝나면 강화가 운 좋은
    // 드랍과 똑같아져서 **키운 보람이 없다** — 그래서 두 칸을 더 준다(+5 까지).
    for (let n = 0; n <= 4; n++) {
        assert.equal(enchantOdds(n), 1, `+${n} 이 안전하지 않다`);
    }
    assert.ok(enchantOdds(5) < 1, "+5 위가 안전하다 — 도박이 없다");
    for (let n = 1; n <= ENCHANT_MAX; n++) {
        assert.ok(
            enchantOdds(n) <= enchantOdds(n - 1),
            `+${n} 의 성공률이 +${n - 1} 보다 높다 — 올라갈수록 어려워야 한다`,
        );
    }
    assert.equal(enchantOdds(ENCHANT_MAX), 0, "상한에서 더 오를 수 있다");
    for (let n = 5; n < ENCHANT_MAX; n++) {
        assert.ok(enchantOdds(n) > 0 && enchantOdds(n) < 1, `+${n} 에 도박이 없다`);
    }
});

test("+5 까지는 절대 안 부서진다", () => {
    for (let plus = 0; plus <= 4; plus++) {
        for (let seed = 1; seed <= 120; seed++) {
            const { s, it, scroll } = setup(seed * 31 + plus, "weapon", "long sword", plus);
            const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
            assert.ok(
                after.hero.pack.some((p) => p.id === it.id),
                `+${plus} 짜리가 부서졌다 — 여기까지는 안전해야 한다`,
            );
            assert.equal(it.plusHit, plus + 1, `+${plus} 에서 안 올랐다`);
        }
    }
});

test("실패하면 부서진다 — 수치가 내려가는 것이 아니라 사라진다", () => {
    let broke = 0;
    let grew = 0;
    for (let seed = 1; seed <= 200; seed++) {
        // +8 은 15% — 대부분 부서진다.
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
});

test("쥐고 있던 것이 부서지면 그 자리도 빈다", () => {
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
});

test("+9 는 더 안 오른다 — 주문서도 턴도 안 쓴다", () => {
    const { s, it, scroll } = setup(77, "weapon", "knight sword", ENCHANT_MAX);
    const packBefore = s.hero.pack.length;
    const turnBefore = s.turn;
    const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
    assert.equal(after.hero.pack.length, packBefore, "상한인데 주문서가 없어졌다");
    assert.equal(after.turn, turnBefore, "상한인데 턴이 갔다");
    assert.equal(it.plusHit, ENCHANT_MAX, "상한을 넘었다");
    assert.ok(after.messages.some((m) => m.includes("더 손댈 곳이 없다")));
});

test("대상 없이 읽으면 아무 일도 안 난다 — 주문서도 턴도 그대로", () => {
    const { s, scroll } = setup(78, "weapon", "long sword", 0);
    const packBefore = s.hero.pack.length;
    const turnBefore = s.turn;
    const msgBefore = s.messages.length;
    const after = perform(s, { t: "read", letter: scroll.letter! });
    assert.equal(after.hero.pack.length, packBefore, "대상도 없이 주문서가 없어졌다");
    assert.equal(after.turn, turnBefore, "대상도 없이 턴이 갔다");
    assert.equal(after.messages.length, msgBefore, "아무 일도 안 났는데 말이 남았다");
});

test("화면이 묻는 것과 엔진이 아는 것이 같다 — `isEnchantScroll`", () => {
    const { s, scroll } = setup(80, "weapon", "long sword", 0);
    assert.ok(isEnchantScroll(s, scroll.letter!));
    // 강화가 아닌 주문서는 고를 것을 안 묻는다.
    const other = giveScroll(s, "identify", 961);
    assert.ok(!isEnchantScroll(s, other.letter!));
    // 주문서가 아닌 것도, 없는 자리도 거짓.
    const potion = makeItem("potion", "healing", 962, -1, -1);
    addToPack(s.hero, potion);
    assert.ok(!isEnchantScroll(s, potion.letter!));
    assert.ok(!isEnchantScroll(s, "Z"));
});

// **갑옷 강화는 없앴다.** 남아 있으면 주문서가 둘로 갈려 어느 쪽도 안 오르고, 「모루에
// 녹여 되뽑는다」는 길이 무기에만 있어서 갑옷 쪽은 되돌릴 방법 없이 운에만 기댄다.
test("갑옷 강화 주문서는 없다 — 표에도, 떨어지는 것에도", () => {
    assert.ok(!("enchant armor" in SCROLLS), "표에 아직 남아 있다");
    // 스물여섯 층을 훑어 실제로 한 장도 안 나오는지 본다.
    const rng = new Rng(4242);
    for (let depth = 1; depth <= 26; depth++) {
        for (let i = 0; i < 400; i++) {
            const it = randomItem(depth, i, -1, -1, rng);
            assert.notEqual(it.type, "enchant armor", `${depth}층에서 갑옷 강화가 나왔다`);
        }
    }
});

test("무기 강화 주문서로 갑옷을 못 건드린다 — 주문서도 턴도 안 쓴다", () => {
    const { s, scroll } = setup(83, "weapon", "long sword", 0);
    const armor = makeItem("armor", "plate mail", 951, -1, -1);
    addToPack(s.hero, armor);
    const packBefore = s.hero.pack.length;
    const turnBefore = s.turn;
    const after = perform(s, { t: "read", letter: scroll.letter!, target: armor.letter! });
    assert.equal(armor.plusArmor, 0);
    assert.equal(after.hero.pack.length, packBefore, "거절했는데 주문서가 없어졌다");
    assert.equal(after.turn, turnBefore, "거절했는데 턴이 갔다");
});

test("굴림 줄이 남는다 — 확률과 굴린 눈과 결과", () => {
    const { s, it, scroll } = setup(81, "weapon", "silver sword", 5); // 70%
    const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
    // **마지막 계산 줄이 아니라 강화 줄을 집는다.** 같은 턴에 몬스터가 때리면 그
    // 뒤에 `· 피해 …` 가 붙어서, 마지막 줄로 잡으면 엉뚱한 것을 본다.
    const line = after.messages.filter(isDetail).find((l) => l.startsWith("· 강화 "))!;
    assert.ok(line, `강화 줄이 없다: ${JSON.stringify(after.messages.filter(isDetail))}`);
    assert.match(line, /^· 강화 /, `강화 줄이 없다: ${line}`);
    assert.match(line, /→ \+6/, "어디로 가는지가 없다");
    assert.match(line, /d100 \d+/, "굴린 눈이 없다");
    // **화면이 적는 확률과 같은 자리에서 온다**(`enchantOdds`).
    assert.ok(
        line.includes(`${Math.round(enchantOdds(5) * 100)}%`),
        `적힌 확률이 표와 다르다: ${line}`,
    );
    assert.match(line, /→ (성공|실패)$/, "결과가 없다");
});

test("저주받은 것도 걸 수 있다 — 부서지면 저주에서 풀려난다", () => {
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
});

test("강화하면 그 물건의 정체를 알게 된다", () => {
    const { s, it, scroll } = setup(82, "weapon", "thirsty sword", 0);
    assert.ok(!s.known["weapon:thirsty sword"], "걸기 전부터 알고 있다");
    const after = perform(s, { t: "read", letter: scroll.letter!, target: it.letter! });
    assert.ok(after.known["weapon:thirsty sword"], "걸어 봤는데 아직 모른다");
});
