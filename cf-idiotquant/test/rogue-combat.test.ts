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

import { heroAttack, monsterAttack, monsterDamBonus } from "@/lib/rogue/combat";
import { newGame } from "@/lib/rogue/game";
import { idx } from "@/lib/rogue/types";
import { attackRoll, damageRoll, hitDifficulty, luckOf, pierce, proficiency } from "@/lib/rogue/dnd";
import { defenseOf } from "@/lib/rogue/items";
import { makeItem } from "@/lib/rogue/items";
import { EXP_LEVELS, HP_PER_LEVEL, gainExp, heroDefense, makeHero } from "@/lib/rogue/hero";

/** 지금 내 방어력. */
const heroDefenseOf = (s: { heroes: Parameters<typeof heroDefense>[0][] }) => heroDefense(s.heroes[0]);
import { Rng } from "@/lib/rogue/rng";
import { MONSTERS, spawnMonster } from "@/lib/rogue/monsters";

// 이 파일의 핵심 한 줄. 부호가 뒤집히면 「갑옷을 입을수록 더 아픈 게임」이 된다.
test("피해 = 공격력 − 방어력, 0 밑은 0 — 방어력도 0 밑이 없다", () => {
    // ── 피해 = 공격력 − 방어력. 0 밑은 0 이다
    {
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
    }

    // ── 방어력은 0 밑으로 안 내려간다 — 음수 방어력은 갑옷이 아니다
    {
        assert.equal(defenseOf(10), 0, "맨몸은 0");
        assert.equal(defenseOf(3), 7, "판금");
        assert.equal(defenseOf(-1), 11, "용");
        assert.equal(defenseOf(12), 0, "등급이 10 을 넘어도 0 에서 멈춘다");
        // **손질하면 숫자가 커진다**(등급이 내려가므로).
        assert.ok(defenseOf(8 - 1) > defenseOf(8), "+1 갑옷의 방어력이 안 올랐다");
    }
});

test("D&D식 명중 굴림은 고정 난이도를 넘는다", () => {
    // ── 굴림은 1 에서 20 사이다 — 다면체가 스무 면이다
    {
        const rng = new Rng(7);
        const seen = new Set<number>();
        for (let i = 0; i < 5000; i++) seen.add(attackRoll(0, 11, rng).roll);
        assert.equal(Math.min(...seen), 1);
        assert.equal(Math.max(...seen), 20);
        assert.equal(seen.size, 20);
    }

    // ── 수비 쪽은 굴리지 않고, 명중 난이도가 고정이다
    {
        const rng = new Rng(77);
        const difficulty = hitDifficulty(4);
        const a = attackRoll(3, difficulty, rng);
        assert.equal(a.total, a.roll + 3);
        assert.equal(a.rolls.length, 1, "때리는 쪽은 한 번만 굴린다");
        if (!a.crit && !a.fumble) assert.equal(a.hit, a.total >= difficulty);
        assert.equal(hitDifficulty(0), 11);
        assert.equal(hitDifficulty(4), 15);
    }
});

test("최종값 20 대성공·자연 1, 치명타 두 번, 유리·불리", () => {
    // ── 최종값 20은 무조건 맞고, 자연 1은 무조건 빗나간다
    {
        const rng = new Rng(9);
        let crits = 0;
        let fumbles = 0;
        for (let i = 0; i < 20000; i++) {
            // 상대 보정 +99 — 굴림으로는 절대 못 넘는다. 그래도 20 은 맞아야 한다.
            const hi = attackRoll(0, 99, rng);
            if (hi.roll === 20) { crits++; assert.ok(hi.hit && hi.crit, "자연 20 이 안 맞았다"); }
            // 내 보정 +99 — 절대 빗나갈 수 없다. 그래도 1 은 빗나가야 한다.
            const lo = attackRoll(99, 1, rng);
            if (lo.roll === 1) { fumbles++; assert.ok(!lo.hit && lo.fumble, "자연 1 이 맞았다"); }
        }
        assert.ok(crits > 500 && fumbles > 500, `20 이 ${crits} 번, 1 이 ${fumbles} 번`);
        const boosted = attackRoll(10, 99, { rnd: () => 9 } as never);
        assert.ok(boosted.hit && boosted.crit && boosted.total === 20, "보정을 합친 20이 대성공이 아니다");
        const naturalOne = attackRoll(99, 1, { rnd: () => 0 } as never);
        assert.ok(!naturalOne.hit && naturalOne.fumble, "자연 1이 보정으로 대성공이 됐다");
    }

    // ── 치명타는 피해 주사위를 **두 번** 굴리고 보정은 한 번만 얹는다
    {
        const rng = new Rng(11);
        for (let i = 0; i < 200; i++) {
            const d = damageRoll("2d4", 3, true, rng);
            assert.equal(d.rolled.length, 2, "주사위를 두 번 안 굴렸다");
            assert.equal(d.total, d.rolled[0] + d.rolled[1] + 3, "보정까지 두 배가 됐다");
        }
        const plain = damageRoll("2d4", 3, false, new Rng(11));
        assert.equal(plain.rolled.length, 1);
    }

    // ── 유리는 높은 쪽, 불리는 낮은 쪽 — 둘 다면 서로 지운다
    {
        const rng = new Rng(31);
        for (let i = 0; i < 500; i++) {
            const up = attackRoll(0, 11, rng, "advantage");
            assert.equal(up.rolls.length, 2);
            assert.equal(up.roll, Math.max(...up.rolls));
            const down = attackRoll(0, 11, rng, "disadvantage");
            assert.equal(down.roll, Math.min(...down.rolls));
        }
        assert.equal(luckOf([true], [true]), "normal", "유리와 불리가 안 지워졌다");
        assert.equal(luckOf([true], [false]), "advantage");
        assert.equal(luckOf([false], [true]), "disadvantage");
        assert.equal(luckOf([], []), "normal");
    }
});

// 나는 힘과 손질을 얹은 값에서 상대 갑옷을 뺀다. 상대 쪽에 보정이 없으면 **같은 식이
// 한쪽에만 공평하고**, 갑옷이 깎기 시작한 순간 약한 놈은 아예 아무것도 못 하게 된다.
test("몬스터의 공격력에도 보정이 붙는다 — 안 붙으면 갑옷이 한쪽만 살린다", () => {
    const of = (ch: string) => monsterDamBonus({ def: MONSTERS[ch] } as never);
    assert.ok(of("E") > 0, "레벨 1 짜리에게 보정이 하나도 없다");
    assert.ok(of("E") < of("T") && of("T") < of("D"), "레벨을 따라 안 오른다");
});

test("체력은 굴리지 않는다 — 종마다도, 레벨업도 고정", () => {
    // ── 같은 종은 같은 체력으로 선다 — 굴리지 않는다
    {
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
    }

    // ── 체력 표는 깊이를 따라 오른다 — 아래로 갈수록 질기다
    {
        assert.ok(MONSTERS.E.hp < MONSTERS.T.hp, "에뮤가 트롤보다 질기다");
        assert.ok(MONSTERS.T.hp < MONSTERS.D.hp, "트롤이 용보다 질기다");
        for (const ch of Object.keys(MONSTERS)) {
            assert.ok(Number.isInteger(MONSTERS[ch].hp), `${ch} 의 체력이 정수가 아니다`);
            assert.ok(MONSTERS[ch].hp > 0, `${ch} 의 체력이 0 이하다`);
        }
    }

    // ── 레벨업으로 느는 체력도 고정이다
    {
        const rng = new Rng(5);
        const hero = makeHero(rng, (() => { let n = 100; return () => n++; })());
        const before = hero.maxHp;
        gainExp(hero, EXP_LEVELS[0], rng);
        assert.equal(hero.maxHp, before + HP_PER_LEVEL);
        // 같은 레벨의 두 판이 체력만 다르면 그건 판단거리가 아니라 운이다.
        const other = makeHero(new Rng(999), (() => { let n = 200; return () => n++; })());
        gainExp(other, EXP_LEVELS[0], new Rng(1));
        assert.equal(other.maxHp, hero.maxHp);
    }
});

// ── 실제 싸움에서 ────────────────────────────────────────────────────────

/** 옆에 몬스터 하나를 세우고 그 판을 준다. */
function duel(seed: number, ch: string, hp = 99999) {
    const s = newGame(seed);
    s.heroes[0].hp = s.heroes[0].maxHp = 99999;
    const x = s.heroes[0].x + 1;
    const y = s.heroes[0].y;
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
test("갑옷이 두꺼우면 0, 맨몸이면 그대로 들어온다", () => {
    // ── 갑옷이 두꺼우면 피해가 0 이 된다 — 그리고 그 줄이 남는다
    {
        // 얼음괴물(1d2, 레벨 1)과 판금 갑옷(방어력 7).
        const { s, m } = duel(800, "I");
        const plate = makeItem("armor", "plate mail", 900, -1, -1);
        plate.plusArmor = 2; // 방어력 9
        s.heroes[0].pack.push(plate);
        s.heroes[0].armorId = plate.id;

        const rng = new Rng(5);
        let blocked = 0;
        let hurt = 0;
        for (let i = 0; i < 300; i++) {
            const before = s.heroes[0].hp;
            const r = monsterAttack(s, m, s.heroes[0], rng);
            if (!r.hit) continue;
            if (s.heroes[0].hp === before) blocked++;
            else hurt++;
        }
        assert.ok(blocked > 0, "판금을 입고 얼음괴물에게 삼백 번 맞았는데 한 번도 안 튕겼다");
        assert.equal(hurt, 0, `1d2 짜리가 방어력 9 를 뚫었다(${hurt}번)`);
    }

    // ── 맨몸이면 공격력이 그대로 들어온다
    {
        const { s, m } = duel(801, "H"); // 홉고블린 1d8
        s.heroes[0].armorId = null;
        assert.equal(heroDefenseOf(s), 0, "맨몸인데 방어력이 있다");
        const rng = new Rng(6);
        let hurt = 0;
        for (let i = 0; i < 200; i++) {
            const before = s.heroes[0].hp;
            monsterAttack(s, m, s.heroes[0], rng);
            if (s.heroes[0].hp < before) hurt++;
        }
        assert.ok(hurt > 20, `맨몸으로 이백 번 맞았는데 ${hurt} 번만 아팠다`);
    }
});

// 세 대를 뭉쳐 한 번만 빼면 트롤이 지금보다 훨씬 세진다. 갑옷을 입을 까닭이 여기서 난다.
test("대마다 깎인다 · 못 뚫으면 영영 못 죽인다", () => {
    // ── 여러 대를 때리는 놈은 **대마다** 깎인다
    {
        const { s, m } = duel(802, "T"); // 트롤 1d8 · 1d8 · 2d6
        s.bestiary.T = 1;
        const chain = makeItem("armor", "chain mail", 901, -1, -1);
        s.heroes[0].pack.push(chain);
        s.heroes[0].armorId = chain.id;
        const guard = heroDefenseOf(s);
        assert.ok(guard > 0);

        const rng = new Rng(7);
        let checked = 0;
        for (let i = 0; i < 300; i++) {
            const before = s.heroes[0].hp;
            const r = monsterAttack(s, m, s.heroes[0], rng);
            const line = r.messages.find((l) => l.startsWith("· 공격력 "));
            if (!line) continue;

            // 줄에 적힌 대마다: `1d8 → 6 +6 공격력 −3 방어력 → 3` (치명타면 `→ 5, 6`)
            const blows = [...line.matchAll(/([\d, ]+)\([^)]*굴림\)(?:=\d+\(주사위 합\))?(?:\+(\d+)\(공격 보정\))?−(\d+)\(방어력\)=(\d+)\(피해\)/g)];
            assert.ok(blows.length > 0, `깎는 자리가 없다: ${line}`);
            for (const [, rolled, add, cut, got] of blows) {
                const raw = rolled.split(",").reduce((n, x) => n + Number(x.trim()), 0);
                assert.equal(Number(cut), guard, `방어력이 다르게 적혔다: ${line}`);
                assert.equal(Number(add ?? 0), monsterDamBonus(m), `공격력 보정이 다르게 적혔다: ${line}`);
                // **줄 위에서 셈이 맞아야 한다.** 보정을 안 적으면 `1d8 → 1 −4 방어력 → 3` 처럼
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
            const lost = before - s.heroes[0].hp;
            assert.equal(blows.reduce((n, b) => n + Number(b[4]), 0), lost, `줄의 합과 깎인 체력이 다르다: ${line}`);
            checked++;
        }
        assert.ok(checked > 20, `잰 판이 ${checked} 번뿐이라 못 잰다`);
    }

    // ── 내 공격도 상대 방어력에 깎인다 — 못 뚫으면 영영 못 죽인다
    {
        // 용(방어력 11)을 단검(1d6)으로 친다. 힘 보정을 빼면 절대 못 뚫는다.
        const { s, m } = duel(803, "D", 9999);
        const knife = makeItem("weapon", "dagger", 902, -1, -1);
        s.heroes[0].pack.push(knife);
        s.heroes[0].weaponId = knife.id;
        s.heroes[0].str = 3; // 힘 보정 −4
        const rng = new Rng(8);
        const before = m.hp;
        for (let i = 0; i < 300; i++) heroAttack(s, s.heroes[0], m, rng);
        assert.equal(m.hp, before, "1d6−4 짜리가 방어력 11 을 뚫었다");
    }
});
