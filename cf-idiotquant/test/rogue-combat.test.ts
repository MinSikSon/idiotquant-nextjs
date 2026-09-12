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

import { heroAttack, heroLuck, monsterHitBonus } from "@/lib/rogue/combat";
import { newGame } from "@/lib/rogue/game";
import { idx } from "@/lib/rogue/types";
import { abilityMod, attackRoll, damageRoll, luckOf, proficiency } from "@/lib/rogue/dnd";
import { armorClass } from "@/lib/rogue/items";
import { armorClassOf, makeItem } from "@/lib/rogue/items";
import { EXP_LEVELS, HP_PER_LEVEL, gainExp, makeHero, strDamBonus, strHitBonus } from "@/lib/rogue/hero";
import { Rng } from "@/lib/rogue/rng";
import { MONSTERS, randomMonsterChar, spawnMonster } from "@/lib/rogue/monsters";

/** 레벨 `atLevel` 에 보정 `bonus` 인 쪽이, 방어 등급 `opArmor` 인 쪽을 때린다. */
function hitRate(atLevel: number, opArmor: number, bonus: number, n = 20000): number {
    const rng = new Rng(12345);
    let hits = 0;
    for (let i = 0; i < n; i++) {
        if (attackRoll(proficiency(atLevel) + bonus, armorClass(opArmor), rng).hit) hits++;
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
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(attackRoll(0, 10, rng).roll);
    assert.equal(Math.min(...seen), 1);
    assert.equal(Math.max(...seen), 20);
    assert.equal(seen.size, 20);
});

test("막는 쪽은 **굴리지 않는다** — D&D 는 방어도가 고정된 문턱이다", () => {
    const rng = new Rng(77);
    const a = attackRoll(3, 15, rng);
    assert.equal(a.total, a.roll + 3);
    assert.equal(a.ac, 15);
    assert.equal(a.rolls.length, 1, "주사위를 한 번만 굴려야 한다");
    if (!a.crit && !a.fumble) assert.equal(a.hit, a.total >= a.ac);
});

test("방어도와 같으면 **맞는다** — D&D 는 「이상」이다", () => {
    const rng = new Rng(4242);
    let ties = 0;
    for (let i = 0; i < 20000 && ties < 200; i++) {
        const a = attackRoll(0, 12, rng);
        if (a.total !== a.ac || a.crit || a.fumble) continue;
        ties++;
        assert.equal(a.hit, true, "방어도와 같은데 빗나갔다");
    }
    assert.ok(ties > 50, `같은 경우가 ${ties} 번뿐이라 못 잰다`);
});

test("자연 20 은 무조건 맞고, 자연 1 은 무조건 빗나간다", () => {
    const rng = new Rng(9);
    let crits = 0;
    let fumbles = 0;
    for (let i = 0; i < 20000; i++) {
        // 방어도 99 — 보정으로는 절대 못 넘는다. 그래도 20 은 맞아야 한다.
        const hi = attackRoll(0, 99, rng);
        if (hi.roll === 20) { crits++; assert.ok(hi.hit && hi.crit, "자연 20 이 안 맞았다"); }
        // 방어도 −99 — 절대 빗나갈 수 없다. 그래도 1 은 빗나가야 한다.
        const lo = attackRoll(50, -99, rng);
        if (lo.roll === 1) { fumbles++; assert.ok(!lo.hit && lo.fumble, "자연 1 이 맞았다"); }
    }
    assert.ok(crits > 500 && fumbles > 500, `20 이 ${crits} 번, 1 이 ${fumbles} 번`);
});

test("치명타는 피해 주사위를 **두 번** 굴리고 보정은 한 번만 얹는다", () => {
    const rng = new Rng(11);
    for (let i = 0; i < 200; i++) {
        const d = damageRoll("2d4", 3, true, rng);
        assert.equal(d.rolled.length, 2, "주사위를 두 번 안 굴렸다");
        assert.equal(d.total, d.rolled[0] + d.rolled[1] + 3, "보정까지 두 배가 됐다");
    }
    const plain = damageRoll("2d4", 3, false, new Rng(11));
    assert.equal(plain.rolled.length, 1);
});

test("유리는 높은 쪽, 불리는 낮은 쪽 — 둘 다면 서로 지운다", () => {
    const rng = new Rng(31);
    for (let i = 0; i < 500; i++) {
        const up = attackRoll(0, 10, rng, "advantage");
        assert.equal(up.rolls.length, 2);
        assert.equal(up.roll, Math.max(...up.rolls));
        const down = attackRoll(0, 10, rng, "disadvantage");
        assert.equal(down.roll, Math.min(...down.rolls));
    }
    assert.equal(luckOf([true], [true]), "normal", "유리와 불리가 안 지워졌다");
    assert.equal(luckOf([true], [false]), "advantage");
    assert.equal(luckOf([false], [true]), "disadvantage");
    assert.equal(luckOf([], []), "normal");
});

test("능력 보정과 숙련은 D&D 의 식 그대로다", () => {
    assert.equal(abilityMod(10), 0);
    assert.equal(abilityMod(11), 0);
    assert.equal(abilityMod(16), 3);
    assert.equal(abilityMod(8), -1);
    assert.equal(abilityMod(20), 5);
    assert.equal(proficiency(1), 2);
    assert.equal(proficiency(4), 2);
    assert.equal(proficiency(5), 3);
    assert.equal(proficiency(9), 4);
});

test("방어도는 클수록 단단하다 — 맨몸 10 이 양쪽에서 맞아떨어진다", () => {
    assert.equal(armorClass(10), 10, "맨몸은 D&D 도 10");
    assert.equal(armorClass(3), 17, "판금");
    assert.equal(armorClass(-1), 21, "용");
    // **손질하면 숫자가 커진다.**
    assert.ok(armorClass(8 - 1) > armorClass(8), "+1 갑옷의 방어도가 안 올랐다");
});

test("몬스터의 공격 보정도 레벨을 따라 오른다", () => {
    const of = (ch: string) => monsterHitBonus({ def: MONSTERS[ch] } as never);
    assert.ok(of("E") < of("T"), "에뮤가 트롤보다 잘 때린다");
    assert.ok(of("T") < of("D"), "트롤이 용보다 잘 때린다");
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

test("유리·불리가 판의 상태에서 나온다 — 자는 놈, 눈먼 나", () => {
    const s = newGame(1);
    const asleep = spawnMonster("S", 0, 0, new Rng(7));
    asleep.awake = false;
    const awake = spawnMonster("S", 0, 0, new Rng(7));
    awake.awake = true;

    const cases: [string, boolean, boolean, string][] = [
        ["깬 놈 · 멀쩡", true, false, "normal"],
        // 5판에서 의식 없는 상대를 치면 유리다.
        ["자는 놈 · 멀쩡", false, false, "advantage"],
        ["깬 놈 · 눈멂", true, true, "disadvantage"],
        // **서로 지운다** — 이것도 5판의 규칙이다.
        ["자는 놈 · 눈멂", false, true, "normal"],
    ];
    for (const [label, mAwake, blind, want] of cases) {
        s.hero.blind = blind ? 5 : 0;
        assert.equal(heroLuck(s.hero, mAwake ? awake : asleep), want, label);
    }

    // 헷갈려도 불리하다.
    s.hero.blind = 0;
    s.hero.confused = 3;
    assert.equal(heroLuck(s.hero, awake), "disadvantage", "헷갈리는데 불리가 아니다");
});

test("치명타가 실제 싸움에서 피해를 두 배 주사위로 굴린다", () => {
    // 굴림과 피해가 따로 놀면 「치명타!」라고 적고 평타만큼만 때린다.
    const s = newGame(700);
    s.hero.hp = s.hero.maxHp = 99999;
    const m = spawnMonster("T", s.hero.x + 1, s.hero.y, new Rng(7));
    m.hp = m.maxHp = 999999;
    s.level.tiles[idx(s.hero.x + 1, s.hero.y)] = 1;
    s.level.monsters = s.level.monsters.filter((x) => !(x.x === m.x && x.y === m.y));
    s.level.monsters.push(m);

    const rng = new Rng(21);
    let crits = 0;
    for (let i = 0; i < 400; i++) {
        const r = heroAttack(s, m, rng);
        const line = r.messages.find((l) => l.startsWith("· 피해 "));
        const critLine = r.messages[0].includes("치명타");
        if (!critLine) continue;
        crits++;
        assert.ok(line?.includes("두 번"), `치명타인데 주사위를 한 번만 굴렸다: ${line}`);
    }
    assert.ok(crits > 5, `사백 번에 치명타가 ${crits} 번뿐이라 못 잰다`);
});
