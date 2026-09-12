// 싸움 — **방어의 방향**이 이 파일의 전부다.
//
// 안쪽에 든 원작의 방어 등급은 낮을수록 단단하고, 바깥으로 나가는 「방어」는
// `defenseOf` 가 `10 - 등급` 으로 뒤집어 클수록 단단하다. 부호를 한 번 뒤집으면
// 「갑옷을 입을수록 잘 맞는 게임」이 되는데, 화면에는 숫자가 멀쩡히 뜨고 전투도
// 돌아가므로 **아무도 못 알아챈다.** 그래서 판금 갑옷과 맨몸을 실제로 만 번 때려 견준다.
//
// 그리고 **양쪽이 다 굴린다.** 때리는 쪽만 굴리던 때에는 갑옷이 문턱에 박힌 고정
// 숫자였다 — 판에서 일어나는 일이 아니라 확률을 깎는 설정값이었다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { contest, defenseOf } from "@/lib/rogue/combat";
import { armorClassOf, makeItem } from "@/lib/rogue/items";
import { EXP_LEVELS, HP_PER_LEVEL, gainExp, makeHero, strDamBonus, strHitBonus } from "@/lib/rogue/hero";
import { Rng } from "@/lib/rogue/rng";
import { MONSTERS, randomMonsterChar, spawnMonster } from "@/lib/rogue/monsters";

/** 레벨 `atLevel` 에 보정 `bonus` 인 쪽이, 방어 등급 `opArmor` 인 쪽을 때린다. */
function hitRate(atLevel: number, opArmor: number, bonus: number, n = 20000): number {
    const rng = new Rng(12345);
    let hits = 0;
    for (let i = 0; i < n; i++) {
        if (contest(atLevel + bonus, defenseOf(opArmor), rng).hit) hits++;
    }
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
    const atk = new Set<number>();
    const def = new Set<number>();
    for (let i = 0; i < 5000; i++) {
        const c = contest(0, 0, rng);
        atk.add(c.atkRoll);
        def.add(c.defRoll);
    }
    for (const seen of [atk, def]) {
        assert.equal(Math.min(...seen), 1);
        assert.equal(Math.max(...seen), 20);
        assert.equal(seen.size, 20);
    }
});

test("막는 쪽도 굴린다 — 갑옷이 매번 일한다", () => {
    const rng = new Rng(77);
    const c = contest(3, 4, rng);
    assert.equal(c.atkTotal, c.atkRoll + 3);
    assert.equal(c.defTotal, c.defRoll + 4);
    assert.equal(c.hit, c.atkTotal > c.defTotal);
});

test("비기면 막은 것으로 친다 — 때리는 쪽이 넘어서야 한다", () => {
    // 같은 값이 나오는 경우를 여러 판 굴려 모두 확인한다.
    const rng = new Rng(4242);
    let ties = 0;
    for (let i = 0; i < 20000; i++) {
        const c = contest(0, 0, rng);
        if (c.atkTotal !== c.defTotal) continue;
        ties++;
        assert.equal(c.hit, false, "비겼는데 맞았다");
    }
    assert.ok(ties > 100, `비긴 경우가 ${ties} 번뿐이라 못 잰다`);
});

test("방어는 클수록 단단하다 — 화면에 나가는 숫자의 방향", () => {
    assert.equal(defenseOf(10), 0, "맨몸은 0");
    assert.equal(defenseOf(3), 7, "판금은 7");
    assert.equal(defenseOf(-1), 11, "용은 11");
    // **손질하면 숫자가 커진다.** 예전에는 8 이 7 로 내려가서 나빠 보였다.
    assert.ok(defenseOf(8 - 1) > defenseOf(8), "+1 갑옷의 방어가 안 올랐다");
});

test("갑옷을 손질하면 방어 등급이 내려간다 (안쪽 표현)", () => {
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

test("레벨이 오르면 잘 맞힌다 — 레벨이 공격 굴림에 얹힌다", () => {
    assert.ok(hitRate(1, 5, 0) < hitRate(5, 5, 0));
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

test("같은 종은 같은 체력으로 선다 — 굴리지 않는다", () => {
    // 예전에는 `6d8` 을 굴려서 같은 트롤이 6 부터 48 까지 제각각이었다. 「이 트롤이
    // 센 트롤인가」는 사람이 알 수 없는 것이라 판단거리가 아니라 그냥 운이었다.
    for (const ch of Object.keys(MONSTERS)) {
        const seen = new Set<number>();
        for (let i = 0; i < 50; i++) {
            const m = spawnMonster(ch, 1, 1, new Rng(i * 7 + 1));
            seen.add(m.hp);
            assert.equal(m.hp, m.maxHp);
        }
        assert.equal(seen.size, 1, `${ch} 의 체력이 ${[...seen].join(", ")} 로 갈린다`);
        assert.equal([...seen][0], MONSTERS[ch].hp);
    }
});

test("체력 표는 깊이를 따라 오른다 — 아래로 갈수록 질기다", () => {
    assert.ok(MONSTERS.E.hp < MONSTERS.T.hp, "에뮤가 트롤보다 질기다");
    assert.ok(MONSTERS.T.hp < MONSTERS.D.hp, "트롤이 용보다 질기다");
    for (const ch of Object.keys(MONSTERS)) {
        assert.ok(Number.isInteger(MONSTERS[ch].hp), `${ch} 의 체력이 정수가 아니다`);
        assert.ok(MONSTERS[ch].hp > 0, `${ch} 의 체력이 0 이하다`);
    }
});

test("레벨업으로 느는 체력도 고정이다", () => {
    const rng = new Rng(5);
    const hero = makeHero(rng, (() => { let n = 100; return () => n++; })());
    const before = hero.maxHp;
    gainExp(hero, EXP_LEVELS[0], rng);
    assert.equal(hero.maxHp, before + HP_PER_LEVEL);
    // 같은 레벨의 두 판이 체력만 다르면 그건 판단거리가 아니라 운이다.
    const other = makeHero(new Rng(999), (() => { let n = 200; return () => n++; })());
    gainExp(other, EXP_LEVELS[0], new Rng(1));
    assert.equal(other.maxHp, hero.maxHp);
});
