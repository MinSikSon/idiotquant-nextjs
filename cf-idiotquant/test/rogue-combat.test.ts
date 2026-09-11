// 싸움 — **방어 등급의 방향**이 이 파일의 전부다.
//
// Rogue 의 방어 등급은 낮을수록 단단하다. 부호를 한 번 뒤집으면 「갑옷을 입을수록 잘
// 맞는 게임」이 되는데, 화면에는 숫자가 멀쩡히 뜨고 전투도 돌아가므로 **아무도 못
// 알아챈다.** 그래서 판금 갑옷과 맨몸을 실제로 만 번 때려 견준다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { swing } from "@/lib/rogue/combat";
import { armorClassOf, makeItem } from "@/lib/rogue/items";
import { EXP_LEVELS, gainExp, makeHero, strDamBonus, strHitBonus } from "@/lib/rogue/hero";
import { Rng } from "@/lib/rogue/rng";
import { MONSTERS, randomMonsterChar } from "@/lib/rogue/monsters";

function hitRate(atLevel: number, opArmor: number, bonus: number, n = 20000): number {
    const rng = new Rng(12345);
    let hits = 0;
    for (let i = 0; i < n; i++) if (swing(atLevel, opArmor, bonus, rng).hit) hits++;
    return hits / n;
}

test("방어 등급이 낮을수록 맞히기 어렵다 — 부호가 뒤집히면 여기서 걸린다", () => {
    const naked = hitRate(1, 10, 0); // 맨몸
    const plate = hitRate(1, 3, 0); // 판금 갑옷
    assert.ok(plate < naked, `판금(${plate}) 이 맨몸(${naked}) 보다 맞기 쉬우면 안 된다`);
    // 용(−1)은 판금보다도 단단하다.
    assert.ok(hitRate(1, -1, 0) < plate);
});

test("레벨이 오르면 더 잘 맞힌다", () => {
    const lv1 = hitRate(1, 5, 0);
    const lv5 = hitRate(5, 5, 0);
    const lv10 = hitRate(10, 5, 0);
    assert.ok(lv1 < lv5 && lv5 < lv10, `${lv1} < ${lv5} < ${lv10} 이어야 한다`);
});

test("손질한 무기는 더 잘 맞는다", () => {
    assert.ok(hitRate(1, 5, 0) < hitRate(1, 5, 2));
});

test("굴림은 1 에서 20 사이다 — 다면체가 스무 면이다", () => {
    const rng = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(swing(1, 5, 0, rng).roll);
    assert.equal(Math.min(...seen), 1);
    assert.equal(Math.max(...seen), 20);
    assert.equal(seen.size, 20);
});

test("갑옷을 손질하면 방어 등급이 내려간다", () => {
    const plain = makeItem("armor", "plate mail", 1, -1, -1);
    assert.equal(armorClassOf(plain), 3);
    plain.plusArmor = 2;
    assert.equal(armorClassOf(plain), 1, "손질은 등급을 **내려야** 한다");
    plain.plusArmor = -1;
    assert.equal(armorClassOf(plain), 4);
    assert.equal(armorClassOf(undefined), 10, "맨몸은 10");
});

test("힘 보정표가 단조롭다 — 힘이 세질수록 나빠지는 구간이 없다", () => {
    let lastHit = -99;
    let lastDam = -99;
    for (let s = 3; s <= 31; s++) {
        assert.ok(strHitBonus(s) >= lastHit, `힘 ${s} 에서 명중 보정이 줄었다`);
        assert.ok(strDamBonus(s) >= lastDam, `힘 ${s} 에서 피해 보정이 줄었다`);
        lastHit = strHitBonus(s);
        lastDam = strDamBonus(s);
    }
});

test("경험치 표는 오르기만 한다", () => {
    for (let i = 1; i < EXP_LEVELS.length; i++) {
        assert.ok(EXP_LEVELS[i] > EXP_LEVELS[i - 1]);
    }
});

test("레벨업은 최대 체력을 올리고 지금 체력도 같이 올린다", () => {
    const rng = new Rng(99);
    const hero = makeHero(rng, (() => { let n = 100; return () => n++; })());
    const before = hero.maxHp;
    const gained = gainExp(hero, EXP_LEVELS[0], rng);
    assert.deepEqual(gained, [2]);
    assert.ok(hero.maxHp > before, "최대 체력이 안 올랐다");
    assert.ok(hero.hp > 12, "레벨업이 지금 체력도 올려야 한다");
});

test("몬스터 표가 스물여섯이고 방어 등급이 제각각이다", () => {
    const keys = Object.keys(MONSTERS);
    assert.equal(keys.length, 26);
    assert.deepEqual(keys.sort(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""));
    // 용이 제일 단단하고 얼음괴물이 제일 무르다 — 표가 평평하면 깊이가 의미가 없다.
    assert.ok(MONSTERS.D.armor < MONSTERS.Z.armor);
});

test("깊이가 곧 난이도다 — 깊은 층일수록 센 놈이 자주 나온다", () => {
    const rng = new Rng(31337);
    const avgAt = (depth: number) => {
        let sum = 0;
        const n = 4000;
        for (let i = 0; i < n; i++) sum += MONSTERS[randomMonsterChar(depth, rng)].level;
        return sum / n;
    };
    const shallow = avgAt(2);
    const deep = avgAt(20);
    assert.ok(deep > shallow * 2, `2층 평균 ${shallow}, 20층 평균 ${deep}`);
});
