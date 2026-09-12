// 주사위를 기록에 적는다 — **다만 적어서는 안 되는 숫자가 하나 있다.**
//
// 명중은 이렇게 정해진다.
//
//     need = 20 - 때리는 쪽 레벨 - 맞는 쪽 방어등급
//     맞았다 = 굴린 눈 + 보정 >= need
//
// 그래서 `need` 를 그대로 적으면 **나머지가 역산된다.** 내가 때릴 때는 내 레벨을 아니까
// 상대의 **방어등급**이 나오고, 상대가 때릴 때는 내 방어등급을 아니까 상대의 **레벨**이
// 나온다. 둘 다 도감이 「한 마리 잡아야 준다」고 잠가 둔 값이다. 숫자를 보여 주려다
// 처음 보는 글자 앞의 그 무서운 순간을 없애면 안 된다.
//
// 그래서 이 파일이 지키는 것 셋.
//
//   1. 굴린 눈은 늘 남는다 (내 것도, 상대 것도, 던진 것도).
//   2. **문턱은 잡아 본 종에게만.** 스물여섯 종을 하나하나 때려 보며 확인한다.
//   3. 굴림 줄이 **결과 줄보다 먼저** 온다 — 화면 위 두 줄 띠는 마지막 두 줄만 보여
//      주므로, 순서가 뒤집히면 띠가 「d20 14」로 끝나고 무슨 일이 났는지가 사라진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { DETAIL, attackLine, damageLine, heroAttack, isDetail, monsterAttack, multiAttackLine, outcomeOf } from "@/lib/rogue/combat";
import { attackRoll } from "@/lib/rogue/dnd";
import { Rng as R } from "@/lib/rogue/rng";
import { newGame, perform } from "@/lib/rogue/game";
import { heroAttackText, heroHitBonus, heroHitTerms } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { MONSTERS, spawnMonster } from "@/lib/rogue/monsters";
import { Rng } from "@/lib/rogue/rng";
import { idx, type GameState } from "@/lib/rogue/types";

/**
 * 겨룸 줄에서 **상대의 몫**만 떼어 낸다.
 *
 * D&D 는 한쪽만 굴리므로 상대의 몫이 방향에 따라 다른 자리에 선다.
 *
 *   · 내가 때리면 → `vs 방어도 N` 의 N 이 **상대의 방어도**다.
 *   · 상대가 때리면 → `vs 방어도 N` 은 **내 방어도**라 감출 것이 아니고, 굴림에 붙은
 *     `+N공격` 이 **상대의 공격 보정**이다.
 */
function theirHalf(line: string, iAttacked: boolean): string {
    const [mine, theirs] = line.split("  vs  ");
    return iAttacked ? (theirs ?? "") : (mine ?? "");
}

/** 상대의 숫자가 드러난 모양. */
const BREAKDOWN = { mine: /방어도 -?\d+/, theirs: /[+−]\d+공격/ };

function placeNextTo(s: GameState, ch: string, hp = 1) {
    const x = s.hero.x + 1;
    const y = s.hero.y;
    s.level.tiles[idx(x, y)] = 1;
    s.level.monsters = s.level.monsters.filter((m) => !(m.x === x && m.y === y));
    const m = spawnMonster(ch, x, y, new Rng(7));
    m.hp = hp;
    m.maxHp = Math.max(hp, m.maxHp);
    s.level.monsters.push(m);
    return m;
}

/** 눈이 고정된 공격 굴림 하나를 만든다 — 줄 모양만 보려는 것이라 굴림은 흉내다. */
function fake(roll: number, bonus: number, ac: number, luck: "normal" | "advantage" | "disadvantage" = "normal", second?: number) {
    const rolls = second === undefined ? [roll] : [roll, second];
    return {
        hit: roll === 20 || (roll !== 1 && roll + bonus >= ac),
        rolls, roll, total: roll + bonus, ac,
        crit: roll === 20, fumble: roll === 1, luck,
    };
}

test("공격 줄은 굴린 눈과 보정과 방어도를 그대로 적는다", () => {
    assert.equal(
        attackLine("나", fake(13, 7, 17), [{ n: 2, why: "숙련" }, { n: 3, why: "힘" }, { n: 2, why: "무기" }], true, "맞았다"),
        "· 나 d20 13 +2숙련 +3힘 +2무기 = 20  vs  방어도 17  → 맞았다",
    );
    // **모르는 종의 방어도는 가린다** — 표의 값이라 그대로 주면 도감이 뚫린다.
    assert.equal(
        attackLine("나", fake(13, 7, 17), [{ n: 7, why: "숙련" }], false, "맞았다"),
        "· 나 d20 13 +7숙련 = 20  vs  방어도 ?  → 맞았다",
    );
    // 0인 보정은 안 적고, 보정이 하나도 없으면 합도 안 적는다.
    assert.equal(
        attackLine("나", fake(4, 0, 15), [{ n: 0, why: "무기" }], true, "빗나갔다"),
        "· 나 d20 4  vs  방어도 15  → 빗나갔다",
    );
    // 유리·불리는 두 눈과 고른 쪽을 같이 적는다.
    assert.equal(
        attackLine("나", fake(14, 2, 12, "advantage", 6), [{ n: 2, why: "숙련" }], true, "맞았다"),
        "· 나 d20 14, 6 (유리 → 14) +2숙련 = 16  vs  방어도 12  → 맞았다",
    );
});

test("치명타와 자동 실패는 따로 말한다", () => {
    assert.equal(outcomeOf(fake(20, 0, 99)), "치명타!");
    assert.equal(outcomeOf(fake(1, 50, 5)), "자동 실패");
    assert.equal(outcomeOf(fake(15, 3, 12)), "맞았다");
    assert.equal(outcomeOf(fake(5, 0, 12)), "빗나갔다");
});

test("여러 번 때리는 놈은 눈만 늘어놓는다 — 치명타에는 표가 붙는다", () => {
    assert.equal(
        multiAttackLine("트롤", [fake(4, 5, 14), fake(20, 5, 14), fake(11, 5, 14)], [{ n: 5, why: "공격" }], true, "3대 중 2대 (치명타 1)"),
        "· 트롤 d20 4, 20!, 11 +5공격  vs  방어도 14  → 3대 중 2대 (치명타 1)",
    );
});

test("피해 줄은 굴린 눈에서 결과까지 이어 적는다", () => {
    assert.equal(damageLine("1d8", [5], [], 5), "· 피해: 1d8 → 5");
    assert.equal(
        damageLine("2d4", [5], [{ n: 3, why: "힘" }, { n: 2, why: "무기" }], 10),
        "· 피해: 2d4 → 5 +3힘 +2무기 = 10",
    );
    // **치명타면 주사위를 두 번 굴린다** — 둘 다 적는다.
    assert.equal(
        damageLine("2d4", [5, 7], [{ n: 3, why: "힘" }], 15),
        "· 피해: 2d4 두 번 → 5+7 = 12 +3힘 = 15",
    );
    // 깎여서 0 밑으로 내려가면 0 이다(D&D 도 그렇다).
    assert.equal(
        damageLine("1d2", [1], [{ n: -3, why: "힘" }], 0),
        "· 피해: 1d2 → 1 −3힘 = -2 → 최소 0",
    );
    // 주사위를 안 주면 총합만 — 상대의 표기는 도감이 할 일이다.
    assert.equal(damageLine(null, [], [], 7), "· 피해: 7");
});

test("계산 줄에는 표시가 붙는다 — 띠가 그것을 걸러 낸다", () => {
    assert.ok(isDetail(attackLine("나", fake(5, 0, 10), [], true, "빗나갔다")));
    assert.ok(isDetail(damageLine("1d8", [5], [], 5)));
    assert.ok(!isDetail("황조롱이을(를) 맞혔다."));
    assert.ok(DETAIL.length > 0);
    void attackRoll;
    void R;
});

test("내가 때리면 굴린 눈이 기록에 남는다", () => {
    let s = newGame(402);
    placeNextTo(s, "S", 200);
    s = perform(s, { t: "move", dx: 1, dy: 0 });
    assert.ok(
        s.messages.some((l) => /^· 나 d20 \d+/.test(l)),
        `내 굴림이 기록에 없다: ${JSON.stringify(s.messages.slice(-4))}`,
    );
});

test("상대가 때려도 굴린 눈이 남는다", () => {
    const s = newGame(403);
    s.hero.hp = s.hero.maxHp = 9999;
    const m = placeNextTo(s, "S", 200);
    const r = monsterAttack(s, m, new Rng(5));
    assert.match(r.messages[0], new RegExp(`^· ${MONSTERS.S.name} d20 \\d+`));
});

test("던진 것도 굴린 눈을 남긴다", () => {
    const s = newGame(404);
    const dagger = makeItem("weapon", "dagger", 991, -1, -1);
    dagger.count = 20;
    dagger.plusHit = 10; // 반드시 맞도록
    dagger.letter = "z";
    s.hero.pack.push(dagger);
    placeNextTo(s, "H", 200);

    const after = perform(s, { t: "throw", letter: "z", dx: 1, dy: 0 });
    assert.ok(
        after.messages.some((l) => /^· 나\(던짐\) d20 \d+/.test(l)),
        `던진 굴림이 기록에 없다: ${JSON.stringify(after.messages.slice(-4))}`,
    );
});

test("잡아 본 적 없는 종은 겨룸 줄에서도 속을 안 보인다 — 방어·레벨", () => {
    for (const ch of Object.keys(MONSTERS)) {
        const s = newGame(500);
        s.hero.hp = s.hero.maxHp = 99999;
        const m = placeNextTo(s, ch, 99999);
        const rng = new Rng(3);
        for (let i = 0; i < 40; i++) {
            m.hp = 99999; // 죽이면 도감에 올라 조건이 달라진다
            for (const [msgs, mine] of [
                [heroAttack(s, m, rng).messages, true],
                [monsterAttack(s, m, rng).messages, false],
            ] as [string[], boolean][]) {
                for (const line of msgs.filter(isDetail)) {
                    if (!line.includes("  vs  ")) continue;
                    assert.doesNotMatch(
                        theirHalf(line, mine),
                        mine ? BREAKDOWN.mine : BREAKDOWN.theirs,
                        `${ch}(${MONSTERS[ch].name}) 의 속이 샜다: ${line}`,
                    );
                }
            }
        }
        assert.equal(s.bestiary[ch] ?? 0, 0);
    }
});

test("잡아 본 종에게는 내역까지 적는다 — 도감에 올랐으면 숨길 것이 없다", () => {
    const s = newGame(501);
    s.bestiary.S = 1;
    s.hero.hp = s.hero.maxHp = 9999;
    const m = placeNextTo(s, "S", 9999);
    const rng = new Rng(3);
    assert.match(theirHalf(heroAttack(s, m, rng).messages[0], true), BREAKDOWN.mine);
    assert.match(theirHalf(monsterAttack(s, m, rng).messages[0], false), BREAKDOWN.theirs);
});

test("상대의 피해 주사위 표기는 안 적는다 — 숫자만 적는다", () => {
    // 트롤은 1d8·1d8·2d6 을 굴린다. 그 표기가 줄에 뜨면 도감을 안 열고도 알게 된다.
    const s = newGame(502);
    s.bestiary.T = 1; // 문턱까지 열어 둔 상태에서도
    s.hero.hp = s.hero.maxHp = 99999;
    const m = placeNextTo(s, "T", 99999);
    const rng = new Rng(9);
    for (let i = 0; i < 30; i++) {
        const line = monsterAttack(s, m, rng).messages.filter(isDetail).join(" ");
        for (const d of MONSTERS.T.damage) {
            assert.ok(!line.includes(d), `상대의 피해 주사위(${d})가 줄에 적혔다: ${line}`);
        }
    }
});

test("굴림 줄이 결과 줄보다 먼저 온다 — 띠의 마지막 줄이 결과여야 한다", () => {
    const s = newGame(403);
    s.hero.hp = s.hero.maxHp = 99999;
    const m = placeNextTo(s, "S", 99999);
    const rng = new Rng(11);
    for (let i = 0; i < 30; i++) {
        m.hp = 99999;
        const mine = heroAttack(s, m, rng).messages;
        assert.ok(mine.length >= 2, `결과 줄이 없다: ${JSON.stringify(mine)}`);
        assert.match(mine[0], /^· 나 d20 /);
        assert.doesNotMatch(mine[mine.length - 1], /^· /);

        const theirs = monsterAttack(s, m, rng).messages;
        assert.ok(theirs.length >= 2, `결과 줄이 없다: ${JSON.stringify(theirs)}`);
        assert.match(theirs[0], /^· .* d20 /);
        assert.doesNotMatch(theirs[theirs.length - 1], /^· /);
    }
});

test("화면에 적는 「공격」은 엔진이 낸다 — 주사위 + 손질 + 힘", () => {
    const s = newGame(600);
    const w = makeItem("weapon", "two-handed sword", 980, -1, -1);
    w.letter = "z";
    w.plusDam = 2;
    s.hero.pack.push(w);
    s.hero.weaponId = w.id;
    s.hero.str = 16; // 능력 보정 +3

    // **써 보기 전에는 손질을 모른다.** 모르는 무기의 속을 화면이 흘리면 안 된다.
    // 힘 16 → 능력 보정 +3 (D&D 식). 손질 +2 는 정체를 알아야 붙는다.
    assert.equal(heroAttackText(s.hero, {}), "4d4+3");
    assert.equal(heroAttackText(s.hero, { "weapon:two-handed sword": true }), "4d4+5");

    // 맨손은 1d2, 보정 없는 힘이면 주사위만.
    const bare = newGame(601);
    bare.hero.weaponId = null;
    bare.hero.str = 10;
    assert.equal(heroAttackText(bare.hero, {}), "1d2");
});

test("실제로 들어가는 피해와 화면의 「공격」이 같은 식이다", () => {
    // 여기서 갈리면 화면은 3d4+6 이라 적고 몸은 3d4+4 를 때린다.
    const s = newGame(602);
    const w = makeItem("weapon", "long sword", 981, -1, -1);
    w.letter = "z";
    w.plusDam = 2;
    s.hero.pack.push(w);
    s.hero.weaponId = w.id;
    s.hero.str = 18; // 능력 보정 +4
    s.known["weapon:long sword"] = true;
    s.bestiary.S = 1;

    const m = placeNextTo(s, "S", 999999);
    const rng = new Rng(4);
    const shown = heroAttackText(s.hero, s.known); // `3d4+6` 꼴
    const [dice, plus] = shown.split(/(?=[+-])/);
    let seen = 0;
    let crits = 0;
    for (let i = 0; i < 200; i++) {
        const line = heroAttack(s, m, rng).messages.find((l) => l.startsWith("· 피해:"));
        if (!line) continue; // 빗나갔다
        seen++;
        assert.ok(line.includes(`피해: ${dice} `), `${line} 가 ${dice} 로 안 굴렀다`);

        // 치명타면 `2d4 두 번 → 5+7 = 12 +4힘 = 16`, 아니면 `2d4 → 5 +4힘 = 9`.
        const crit = line.includes("두 번");
        if (crit) crits++;
        const rolledSum = crit
            ? Number(line.match(/→ [\d+]+ = (\d+)/)![1])
            : Number(line.match(/→ (\d+)/)![1]);
        const total = Number(line.match(/= (-?\d+)$/)?.[1] ?? rolledSum);
        assert.equal(total - rolledSum, Number(plus), `${line} 의 보정이 화면의 ${plus} 와 다르다`);
    }
    assert.ok(seen > 20, `맞은 횟수가 ${seen} 뿐이라 못 잰다`);
    assert.ok(crits > 0, "이백 번을 때렸는데 치명타가 한 번도 안 났다");
});

test("화면의 「명중」과 실제 굴림에 얹히는 보정이 같다", () => {
    // 여기서 갈리면 화면은 +8 이라 적고 몸은 +6 으로 굴린다. 세는 자리가 둘이면 난다.
    const s = newGame(650);
    const w = makeItem("weapon", "long sword", 982, -1, -1);
    w.letter = "z";
    w.plusHit = 2;
    s.hero.pack.push(w);
    s.hero.weaponId = w.id;
    s.hero.str = 18; // 능력 보정 +4
    s.known["weapon:long sword"] = true;
    s.bestiary.S = 1;

    const m = placeNextTo(s, "S", 999999);
    const rng = new Rng(6);
    const shown = heroHitBonus(s.hero, s.known);
    // 숙련 2(레벨 1) + 힘 4 + 무기 2
    assert.equal(shown, 8, `화면의 명중이 ${shown} 이다`);

    for (let i = 0; i < 60; i++) {
        const line = heroAttack(s, m, rng).messages[0];
        // `· 나 d20 9 +2숙련 +4힘 +2무기 = 17  vs …` 에서 눈과 합을 떼어 낸다.
        const eye = Number(line.match(/d20 (\d+)/)![1]);
        const total = Number(line.match(/= (-?\d+)/)?.[1] ?? eye);
        assert.equal(total - eye, shown, `${line} 의 보정이 화면의 +${shown} 와 다르다`);
    }
});

test("정체 모르는 무기의 손질은 「명중」에도 안 샌다", () => {
    const s = newGame(651);
    const w = makeItem("weapon", "long sword", 983, -1, -1);
    w.letter = "z";
    w.plusHit = 3;
    s.hero.pack.push(w);
    s.hero.weaponId = w.id;
    s.hero.str = 10; // 능력 보정 0

    // 숙련 2 만 보여야 한다 — 손질 +3 은 써 봐야 안다.
    assert.equal(heroHitBonus(s.hero, {}), 2);
    assert.equal(heroHitBonus(s.hero, { "weapon:long sword": true }), 5);
    // 다만 **굴림은 실제 값으로** 한다 — 화면만 가리는 것이지 약해지는 것이 아니다.
    assert.equal(
        heroHitTerms(s.hero).reduce((a, t) => a + t.n, 0),
        5,
        "굴림에 얹히는 값까지 깎였다",
    );
});
