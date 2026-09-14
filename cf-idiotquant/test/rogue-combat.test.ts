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

import { heroAttack, heroLuck, monsterAttack, monsterDamBonus, monsterHitBonus } from "@/lib/rogue/combat";
import { newGame } from "@/lib/rogue/game";
import { idx } from "@/lib/rogue/types";
import { abilityMod, damageRoll, luckOf, opposedRoll, pierce, proficiency } from "@/lib/rogue/dnd";
import { defenseOf } from "@/lib/rogue/items";
import { armorClassOf, makeItem } from "@/lib/rogue/items";
import { EXP_LEVELS, HP_PER_LEVEL, gainExp, heroDefense, makeHero, strDamBonus, strHitBonus } from "@/lib/rogue/hero";

/** 지금 내 방어력. */
const heroDefenseOf = (s: { hero: Parameters<typeof heroDefense>[0] }) => heroDefense(s.hero);
import { Rng } from "@/lib/rogue/rng";
import { MONSTERS, randomMonsterChar, spawnMonster } from "@/lib/rogue/monsters";

/** 레벨 `atLevel` 에 보정 `bonus` 인 쪽이, 레벨 `opLevel` 인 쪽을 때린다. */
function hitRate(atLevel: number, opLevel: number, bonus: number, n = 20000): number {
    const rng = new Rng(12345);
    let hits = 0;
    for (let i = 0; i < n; i++) {
        if (opposedRoll(proficiency(atLevel) + bonus, proficiency(opLevel), rng).hit) hits++;
    }
    return hits / n;
}

// **갑옷은 이제 명중을 안 건드린다.** 피하는 쪽의 굴림에 붙는 것은 숙련뿐이라, 갑옷을
// 껴입어도 맞는 횟수는 그대로다 — 대신 매 대가 덜 아프다. 이 둘을 헷갈리면 「갑옷을
// 입을수록 잘 맞는 게임」이 되는데 화면에는 숫자가 멀쩡히 떠서 아무도 못 알아챈다.
test("맞히기 어려운 쪽은 **레벨이 높은 쪽**이다 — 갑옷이 아니라", () => {
    const weak = hitRate(1, 1, 0);
    const strong = hitRate(1, 10, 0);
    assert.ok(strong < weak, `레벨 10(${strong}) 이 레벨 1(${weak}) 보다 맞히기 쉬우면 안 된다`);
});

test("레벨이 오르면 더 잘 맞힌다", () => {
    const lv1 = hitRate(1, 3, 0);
    const lv5 = hitRate(5, 3, 0);
    const lv10 = hitRate(10, 3, 0);
    assert.ok(lv1 < lv5 && lv5 < lv10, `${lv1} < ${lv5} < ${lv10} 이어야 한다`);
});

test("손질한 무기는 더 잘 맞는다", () => {
    assert.ok(hitRate(1, 3, 0) < hitRate(1, 3, 2));
});

// 이 파일의 핵심 한 줄. 부호가 뒤집히면 「갑옷을 입을수록 더 아픈 게임」이 된다.
test("피해 = 공격력 − 방어력. 0 밑은 0 이다", () => {
    assert.equal(pierce(14, 4), 10);
    assert.equal(pierce(3, 7), 0, "방어력이 크면 0 이어야 한다");
    assert.equal(pierce(7, 7), 0, "같으면 0");
    assert.equal(pierce(5, 0), 5, "맨몸은 깎을 것이 없다");
    // 단조롭다 — 방어력이 오르는데 더 아파지는 구간이 없다.
    let last = 99;
    for (let d = 0; d <= 12; d++) {
        const got = pierce(10, d);
        assert.ok(got <= last, `방어력 ${d} 에서 피해가 늘었다`);
        last = got;
    }
});

test("방어력은 0 밑으로 안 내려간다 — 음수 방어력은 갑옷이 아니다", () => {
    assert.equal(defenseOf(10), 0, "맨몸은 0");
    assert.equal(defenseOf(3), 7, "판금");
    assert.equal(defenseOf(-1), 11, "용");
    assert.equal(defenseOf(12), 0, "등급이 10 을 넘어도 0 에서 멈춘다");
    // **손질하면 숫자가 커진다**(등급이 내려가므로).
    assert.ok(defenseOf(8 - 1) > defenseOf(8), "+1 갑옷의 방어력이 안 올랐다");
});

test("굴림은 1 에서 20 사이다 — 다면체가 스무 면이다", () => {
    const rng = new Rng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(opposedRoll(0, 0, rng).roll);
    assert.equal(Math.min(...seen), 1);
    assert.equal(Math.max(...seen), 20);
    assert.equal(seen.size, 20);
});

test("**양쪽이 굴린다** — 피하는 쪽도 스무면체를 돌린다", () => {
    const rng = new Rng(77);
    const a = opposedRoll(3, 4, rng);
    assert.equal(a.total, a.roll + 3);
    assert.equal(a.dodge, a.dodgeRoll + 4);
    assert.equal(a.rolls.length, 1, "때리는 쪽은 한 번만 굴린다");
    if (!a.crit && !a.fumble) assert.equal(a.hit, a.total > a.dodge);

    // **굴린다는 것은 값이 달라진다는 뜻이다.** 고정된 문턱을 `dodgeRoll` 에 담아 두면
    // 위의 assert 는 전부 통과하는데 체계는 옛날 것 그대로다 — 실제로 그렇게 되돌려
    // 봤더니 이 파일이 아무 말도 안 했다.
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) seen.add(opposedRoll(0, 0, rng).dodgeRoll);
    assert.equal(seen.size, 20, `피하는 쪽의 눈이 ${seen.size} 가지뿐이다 — 안 굴리고 있다`);
    assert.equal(Math.min(...seen), 1);
    assert.equal(Math.max(...seen), 20);
});

test("동점은 **빗나간다** — 피하는 쪽이 비기면 이긴다", () => {
    const rng = new Rng(4242);
    let ties = 0;
    for (let i = 0; i < 40000 && ties < 200; i++) {
        const a = opposedRoll(0, 0, rng);
        if (a.total !== a.dodge || a.crit || a.fumble) continue;
        ties++;
        assert.equal(a.hit, false, "동점인데 맞았다");
    }
    assert.ok(ties > 50, `같은 경우가 ${ties} 번뿐이라 못 잰다`);
});

test("자연 20 은 무조건 맞고, 자연 1 은 무조건 빗나간다", () => {
    const rng = new Rng(9);
    let crits = 0;
    let fumbles = 0;
    for (let i = 0; i < 20000; i++) {
        // 상대 보정 +99 — 굴림으로는 절대 못 넘는다. 그래도 20 은 맞아야 한다.
        const hi = opposedRoll(0, 99, rng);
        if (hi.roll === 20) { crits++; assert.ok(hi.hit && hi.crit, "자연 20 이 안 맞았다"); }
        // 내 보정 +99 — 절대 빗나갈 수 없다. 그래도 1 은 빗나가야 한다.
        const lo = opposedRoll(99, 0, rng);
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
        const up = opposedRoll(0, 0, rng, "advantage");
        assert.equal(up.rolls.length, 2);
        assert.equal(up.roll, Math.max(...up.rolls));
        const down = opposedRoll(0, 0, rng, "disadvantage");
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

test("몬스터의 공격 보정도 레벨을 따라 오른다", () => {
    const of = (ch: string) => monsterHitBonus({ def: MONSTERS[ch] } as never);
    assert.ok(of("E") < of("T"), "에뮤가 트롤보다 잘 때린다");
    assert.ok(of("T") < of("D"), "트롤이 용보다 잘 때린다");
});

// 나는 힘과 손질을 얹은 값에서 상대 갑옷을 뺀다. 상대 쪽에 보정이 없으면 **같은 식이
// 한쪽에만 공평하고**, 갑옷이 깎기 시작한 순간 약한 놈은 아예 아무것도 못 하게 된다.
test("몬스터의 공격력에도 보정이 붙는다 — 안 붙으면 갑옷이 한쪽만 살린다", () => {
    const of = (ch: string) => monsterDamBonus({ def: MONSTERS[ch] } as never);
    assert.ok(of("E") > 0, "레벨 1 짜리에게 보정이 하나도 없다");
    assert.ok(of("E") < of("T") && of("T") < of("D"), "레벨을 따라 안 오른다");
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

    // 주사위를 펼쳐 적으려면 잡아 본 종이어야 한다(도감 규칙).
    s.bestiary.T = 1;
    const rng = new Rng(21);
    let crits = 0;
    for (let i = 0; i < 400; i++) {
        const r = heroAttack(s, m, rng);
        const line = r.messages.find((l) => l.startsWith("· 공격력 "));
        const critLine = r.messages[0].includes("치명타");
        if (!critLine) continue;
        crits++;
        assert.ok(line?.includes("두 번"), `치명타인데 주사위를 한 번만 굴렸다: ${line}`);
    }
    assert.ok(crits > 5, `사백 번에 치명타가 ${crits} 번뿐이라 못 잰다`);
});

// ── 실제 싸움에서 ────────────────────────────────────────────────────────

/** 옆에 몬스터 하나를 세우고 그 판을 준다. */
function duel(seed: number, ch: string, hp = 99999) {
    const s = newGame(seed);
    s.hero.hp = s.hero.maxHp = 99999;
    const x = s.hero.x + 1;
    const y = s.hero.y;
    s.level.tiles[idx(x, y)] = 1;
    s.level.monsters = [];
    const m = spawnMonster(ch, x, y, new Rng(7));
    m.hp = m.maxHp = hp;
    m.awake = true;
    s.level.monsters.push(m);
    return { s, m };
}

// 이 체계에서 갑옷이 하는 일의 전부. 뚫리면 갑옷은 그냥 무게이고, 안 뚫리면 「덜 아프게」가
// 아니라 「안 아프게」다 — 둘 다 실제로 일어나야 한다.
test("갑옷이 두꺼우면 피해가 0 이 된다 — 그리고 그 줄이 남는다", () => {
    // 얼음괴물(1d2, 레벨 1)과 판금 갑옷(방어력 7).
    const { s, m } = duel(800, "I");
    const plate = makeItem("armor", "plate mail", 900, -1, -1);
    plate.plusArmor = 2; // 방어력 9
    s.hero.pack.push(plate);
    s.hero.armorId = plate.id;

    const rng = new Rng(5);
    let blocked = 0;
    let hurt = 0;
    for (let i = 0; i < 300; i++) {
        const before = s.hero.hp;
        const r = monsterAttack(s, m, rng);
        if (!r.hit) continue;
        if (s.hero.hp === before) blocked++;
        else hurt++;
    }
    assert.ok(blocked > 0, "판금을 입고 얼음괴물에게 삼백 번 맞았는데 한 번도 안 튕겼다");
    assert.equal(hurt, 0, `1d2 짜리가 방어력 9 를 뚫었다(${hurt}번)`);
});

test("맨몸이면 공격력이 그대로 들어온다", () => {
    const { s, m } = duel(801, "H"); // 홉고블린 1d8
    s.hero.armorId = null;
    assert.equal(heroDefenseOf(s), 0, "맨몸인데 방어력이 있다");
    const rng = new Rng(6);
    let hurt = 0;
    for (let i = 0; i < 200; i++) {
        const before = s.hero.hp;
        monsterAttack(s, m, rng);
        if (s.hero.hp < before) hurt++;
    }
    assert.ok(hurt > 20, `맨몸으로 이백 번 맞았는데 ${hurt} 번만 아팠다`);
});

// 세 대를 뭉쳐 한 번만 빼면 트롤이 지금보다 훨씬 세진다. 갑옷을 입을 까닭이 여기서 난다.
test("여러 대를 때리는 놈은 **대마다** 깎인다", () => {
    const { s, m } = duel(802, "T"); // 트롤 1d8 · 1d8 · 2d6
    s.bestiary.T = 1;
    const chain = makeItem("armor", "chain mail", 901, -1, -1);
    s.hero.pack.push(chain);
    s.hero.armorId = chain.id;
    const guard = heroDefenseOf(s);
    assert.ok(guard > 0);

    const rng = new Rng(7);
    let checked = 0;
    for (let i = 0; i < 300; i++) {
        const before = s.hero.hp;
        const r = monsterAttack(s, m, rng);
        const line = r.messages.find((l) => l.startsWith("· 공격력 "));
        if (!line) continue;

        // 줄에 적힌 대마다: `1d8 → 6 +6공격력 −3방어력 → 3`
        const blows = [...line.matchAll(/→ ([\d+]+)(?: \+(\d+)공격력)? −(\d+)방어력 → (\d+)/g)];
        assert.ok(blows.length > 0, `깎는 자리가 없다: ${line}`);
        for (const [, rolled, add, cut, got] of blows) {
            const raw = rolled.split("+").reduce((n, x) => n + Number(x), 0);
            assert.equal(Number(cut), guard, `방어력이 다르게 적혔다: ${line}`);
            assert.equal(Number(add ?? 0), monsterDamBonus(m), `공격력 보정이 다르게 적혔다: ${line}`);
            // **줄 위에서 셈이 맞아야 한다.** 보정을 안 적으면 `1d8 → 1 −4방어력 → 3` 처럼
            // 눈으로 봐서 틀린 줄이 남고, 그러면 기록을 통째로 못 믿게 된다.
            assert.equal(
                Number(got),
                Math.max(0, raw + Number(add ?? 0) - Number(cut)),
                `줄에 적힌 숫자끼리 안 맞는다: ${line}`,
            );
            // **대마다** 뺀 값이어야 한다. 뭉쳐서 한 번만 빼면 이 등식이 깨진다.
            assert.equal(
                Number(got),
                Math.max(0, raw + monsterDamBonus(m) - guard),
                `한 대의 셈이 안 맞는다: ${line}`,
            );
        }
        // 줄에 적힌 합이 실제로 깎인 체력과 같다.
        const lost = before - s.hero.hp;
        assert.equal(blows.reduce((n, b) => n + Number(b[4]), 0), lost, `줄의 합과 깎인 체력이 다르다: ${line}`);
        checked++;
    }
    assert.ok(checked > 20, `잰 판이 ${checked} 번뿐이라 못 잰다`);
});

test("내 공격도 상대 방어력에 깎인다 — 못 뚫으면 영영 못 죽인다", () => {
    // 용(방어력 11)을 단검(1d6)으로 친다. 힘 보정을 빼면 절대 못 뚫는다.
    const { s, m } = duel(803, "D", 9999);
    const knife = makeItem("weapon", "dagger", 902, -1, -1);
    s.hero.pack.push(knife);
    s.hero.weaponId = knife.id;
    s.hero.str = 3; // 힘 보정 −4
    const rng = new Rng(8);
    const before = m.hp;
    for (let i = 0; i < 300; i++) heroAttack(s, m, rng);
    assert.equal(m.hp, before, "1d6−4 짜리가 방어력 11 을 뚫었다");
});
