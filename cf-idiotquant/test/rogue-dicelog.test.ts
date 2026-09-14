// 주사위를 기록에 적는다 — **다만 적어서는 안 되는 숫자가 있다.**
//
// 싸움은 이렇게 정해진다.
//
//     맞았다 = (내 d20 + 숙련 + 힘 + 손질) > (상대 d20 + 숙련)
//     피해   = (무기 주사위 + 힘 + 손질) − 상대의 방어력
//
// 그래서 **상대의 보정과 방어력은 적을 수 없다.** 보정은 곧 레벨이고 방어력은 갑옷
// 등급인데, 둘 다 도감이 「한 마리 잡아야 준다」고 잠가 둔 값이다. 숫자를 보여 주려다
// 처음 보는 글자 앞의 그 무서운 순간을 없애면 안 된다. **굴린 눈은 적는다** — 눈만으로는
// 아무것도 역산되지 않는다.
//
// 그래서 이 파일이 지키는 것 셋.
//
//   1. 굴린 눈은 늘 남는다 (내 것도, 상대 것도, 던진 것도) — **양쪽이 굴리므로 둘 다.**
//   2. **보정과 방어력은 잡아 본 종에게만.** 스물여섯 종을 하나하나 때려 보며 확인한다.
//   3. 굴림 줄이 **결과 줄보다 먼저** 온다 — 화면 위 두 줄 띠는 마지막 두 줄만 보여
//      주므로, 순서가 뒤집히면 띠가 「d20 14」로 끝나고 무슨 일이 났는지가 사라진다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { DETAIL, attackLine, damageLine, heroAttack, isDetail, monsterAttack, monsterDamageLine, multiAttackLine, outcomeOf, withDamage } from "@/lib/rogue/combat";
import { damageRoll } from "@/lib/rogue/dnd";
import { newGame } from "@/lib/rogue/game";
import { heroAttackText, heroHitBonus } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { MONSTERS, spawnMonster } from "@/lib/rogue/monsters";
import { Rng } from "@/lib/rogue/rng";
import { idx, type GameState } from "@/lib/rogue/types";

/**
 * 겨룸 줄에서 **상대의 몫**만 떼어 낸다.
 *
 *   · 내가 때리면 → `vs` 뒤가 상대의 수비 굴림이고, 거기 붙은 `+N숙련` 이 상대의 몫이다.
 *   · 상대가 때리면 → `vs` 뒤는 **내** 수비 굴림이라 감출 것이 아니고, 앞쪽 굴림에 붙은
 *     `+N공격` 이 상대의 몫이다.
 */
function theirHalf(line: string, iAttacked: boolean): string {
    const [mine, theirs] = line.split("  vs  ");
    return iAttacked ? (theirs ?? "") : (mine ?? "");
}

/** 상대의 숫자가 드러난 모양. */
const BREAKDOWN = { mine: /[+−]\d+숙련/, theirs: /[+−]\d+공격/ };

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

/** 눈이 고정된 대결 굴림 하나를 만든다 — 줄 모양만 보려는 것이라 굴림은 흉내다. */
function fake(
    roll: number,
    bonus: number,
    dodgeRoll: number,
    dodgeBonus = 0,
    luck: "normal" | "advantage" | "disadvantage" = "normal",
    second?: number,
) {
    const rolls = second === undefined ? [roll] : [roll, second];
    const total = roll + bonus;
    const dodge = dodgeRoll + dodgeBonus;
    return {
        hit: roll === 20 || (roll !== 1 && total > dodge),
        rolls, roll, total, dodgeRoll, dodge,
        crit: roll === 20, fumble: roll === 1, luck,
    };
}

/** 상대 쪽 한 벌 — 이름·보정·보여 줄까. */
const foe = (who: string, n: number, show = true) => ({ who, bonus: [{ n, why: "숙련" }], show });

test("겨룸 줄은 양쪽이 굴린 것을 적는다 — 치명타·여러 대까지", () => {
    // ── 겨룸 줄은 **양쪽이 굴린 것**을 나란히 적는다
    {
        assert.equal(
            attackLine("나", fake(13, 7, 14, 3), [{ n: 2, why: "숙련" }, { n: 3, why: "힘" }, { n: 2, why: "무기" }], foe("트롤", 3), "맞았다"),
            "· 명중 나 d20 13 +2숙련 +3힘 +2무기 = 20  vs  트롤 d20 14 +3숙련 = 17  → 맞았다",
        );
        // **모르는 종의 보정은 가린다** — 곧 레벨이라, 그대로 주면 도감이 뚫린다.
        assert.equal(
            attackLine("나", fake(13, 7, 14, 3), [{ n: 7, why: "숙련" }], foe("에뮤", 3, false), "맞았다"),
            "· 명중 나 d20 13 +7숙련 = 20  vs  에뮤 d20 14 +?  → 맞았다",
        );
        // 0인 보정은 안 적고, 보정이 하나도 없으면 합도 안 적는다.
        assert.equal(
            attackLine("나", fake(4, 0, 15, 0), [{ n: 0, why: "무기" }], foe("뱀", 0), "빗나갔다"),
            "· 명중 나 d20 4  vs  뱀 d20 15  → 빗나갔다",
        );
        // 유리·불리는 두 눈과 고른 쪽을 같이 적는다.
        assert.equal(
            attackLine("나", fake(14, 2, 12, 0, "advantage", 6), [{ n: 2, why: "숙련" }], foe("뱀", 0), "맞았다"),
            "· 명중 나 d20 14, 6 (유리 → 14) +2숙련 = 16  vs  뱀 d20 12  → 맞았다",
        );
    }

    // ── 치명타와 자동 실패는 따로 말한다
    {
        assert.equal(outcomeOf(fake(20, 0, 19, 80)), "치명타!");
        assert.equal(outcomeOf(fake(1, 50, 5)), "자동 실패");
        assert.equal(outcomeOf(fake(15, 3, 12)), "맞았다");
        assert.equal(outcomeOf(fake(5, 0, 12)), "빗나갔다");
    }

    // ── 여러 번 때리는 놈은 눈만 늘어놓는다 — 치명타에는 표가 붙는다
    {
        assert.equal(
            multiAttackLine("트롤", [fake(4, 5, 14), fake(20, 5, 9), fake(11, 5, 3)], [{ n: 5, why: "공격" }], foe("나", 2), "3대 중 2대 (치명타 1)"),
            "· 명중 트롤 d20 4, 20!, 11 +5공격  vs  나 d20 14, 9, 3 +2숙련  → 3대 중 2대 (치명타 1)",
        );
    }
});

// **대마다 따로 깎인다**는 것이 이 체계의 핵심 한 줄이다. 세 대를 뭉쳐 한 번만 빼는
// 것처럼 적으면 갑옷이 왜 좋은지가 줄에서 사라진다.

// 「2d4 인데 왜 5 가 나오나」 — 실제로 들은 물음이다. 치명타의 두 굴림을 `+` 로 이어
// `2d4 두 번 → 5+4` 라고 적었더니 **네 면짜리 눈 두 개를 더한 것**처럼 읽혔고, `5` 는
// 거기 없는 눈이라 화면이 고장 난 것처럼 보였다. 여기 적히는 숫자 하나하나는 **주사위
// 한 벌을 통째로 굴린 값**(`2d4` 면 2~8)이다.
test("공격력 줄은 방어력을 빼는 것까지 적고, 치명타는 쉼표로 가른다", () => {
    // ── 공격력 줄은 굴린 눈에서 **방어력을 빼는 것까지** 이어 적는다
    {
        assert.equal(damageLine("1d8", [5], [], 5, 0, 5), "· 공격력 1d8 → 5  → 피해 5");
        assert.equal(
            damageLine("2d4", [5], [{ n: 3, why: "힘" }, { n: 2, why: "무기" }], 10, 4, 6),
            "· 공격력 2d4 → 5 +3힘 +2무기 = 10  −4방어력  → 피해 6",
        );
        // **치명타면 주사위를 두 번 굴린다** — 둘 다 적는다.
        assert.equal(
            damageLine("2d4", [5, 7], [{ n: 3, why: "힘" }], 15, 2, 13),
            "· 공격력 2d4 두 번 → 5, 7 = 12 +3힘 = 15  −2방어력  → 피해 13",
        );
        // **0 은 따로 말해 준다** — 「피해 0」만 적혀 있으면 고장인지 갑옷인지 알 수 없다.
        assert.equal(
            damageLine("1d6", [3], [], 3, 7, 0),
            "· 공격력 1d6 → 3  −7방어력  → 피해 0 (튕겨 나갔다)",
        );
        // 주사위를 안 주면 결과만 — 상대의 표기도 방어력도 도감이 할 일이다.
        assert.equal(damageLine(null, [], [], 0, 0, 7), "· 피해 7");
    }

    // ── 여러 대의 공격력은 **대마다** 방어력을 만난다
    {
        assert.equal(
            monsterDamageLine(
                [
                    { dice: "1d8", rolled: [6], dealt: 3 },
                    { dice: "2d6", rolled: [9], dealt: 6 },
                ],
                0,
                3,
                9,
            ),
            "· 공격력 1d8 → 6 −3방어력 → 3 · 2d6 → 9 −3방어력 → 6  = 피해 9",
        );
        assert.equal(monsterDamageLine([], 6, 3, 7), "· 피해 7");
    }

    // ── 치명타의 두 굴림은 **더하는 것처럼** 안 적는다
    {
        for (const [dice, lo, hi] of [["2d4", 2, 8], ["3d4", 3, 12], ["1d8", 1, 8]] as const) {
            const rng = new Rng(2024);
            for (let i = 0; i < 200; i++) {
                const d = damageRoll(dice, 0, true, rng);
                const line = damageLine(dice, d.rolled, [], d.total, 0, d.total);

                const shown = line.match(/두 번 → ([\d, ]+) =/);
                assert.ok(shown, `치명타 줄 모양이 아니다: ${line}`);
                // **`+` 로 잇지 않는다** — 이으면 눈을 더한 것으로 읽힌다.
                assert.doesNotMatch(shown[1], /\+/, `굴림을 + 로 이었다: ${line}`);

                const parts = shown[1].split(",").map((x) => Number(x.trim()));
                assert.equal(parts.length, 2, `치명타인데 굴림이 둘이 아니다: ${line}`);
                for (const n of parts) {
                    // 한 벌을 통째로 굴린 값이라 **낱개 눈의 범위가 아니다.**
                    assert.ok(n >= lo && n <= hi, `${dice} 에 ${n} 이 나올 수 없다: ${line}`);
                }
                assert.equal(parts[0] + parts[1], d.total, `적힌 합이 실제와 다르다: ${line}`);
            }
        }
    }
});

test("상대의 내역은 잡아 본 종에게만", () => {
    // ── 잡아 본 적 없는 종은 겨룸 줄에서도 속을 안 보인다 — 방어·레벨
    {
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
    }

    // ── 잡아 본 종에게는 내역까지 적는다 — 도감에 올랐으면 숨길 것이 없다
    {
        const s = newGame(501);
        s.bestiary.S = 1;
        s.hero.hp = s.hero.maxHp = 9999;
        const m = placeNextTo(s, "S", 9999);
        const rng = new Rng(3);
        assert.match(theirHalf(heroAttack(s, m, rng).messages[0], true), BREAKDOWN.mine);
        assert.match(theirHalf(monsterAttack(s, m, rng).messages[0], false), BREAKDOWN.theirs);
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
        assert.match(mine[0], /^· 명중 나 d20 /);
        assert.doesNotMatch(mine[mine.length - 1], /^· /);

        const theirs = monsterAttack(s, m, rng).messages;
        assert.ok(theirs.length >= 2, `결과 줄이 없다: ${JSON.stringify(theirs)}`);
        assert.match(theirs[0], /^· 명중 .* d20 /);
        assert.doesNotMatch(theirs[theirs.length - 1], /^· /);
    }
});

// 띠는 계산 줄을 걸러 내므로, **피해가 계산 줄에만 있으면 펼치지 않은 사람에게는
// 숫자가 하나도 없다.** 굴린 눈은 기록 판 몫이지만 **얼마가 오갔나**는 띠에 있어야
// 「한 대 더 치면 죽나」·「지금 도망가야 하나」를 판을 열지 않고 판단한다.

// **0 은 안 적는다.** 피해는 `Math.max(0, …)` 라 힘이 바닥이면 **맞고도 0** 이 나온다
// (`dnd.damageRoll`). 그 줄에 「피해 0」이 붙으면 맞은 건지 만 건지가 헷갈리고, 빗나간
// 줄과 나란히 놓이면 더 그렇다.
test("띠에 남는 줄에도 피해 숫자가 있다 — 0 이면 안 적는다", () => {
    // ── 띠에 남는 줄에도 피해 숫자가 있다 — 굴림은 빼고 결과만
    {
        const s = newGame(404);
        s.hero.hp = s.hero.maxHp = 99999;
        const m = placeNextTo(s, "T", 99999);
        const rng = new Rng(12);
        let mineSeen = 0;
        let theirsSeen = 0;

        for (let i = 0; i < 60; i++) {
            m.hp = 99999;
            for (const [msgs, got] of [
                [heroAttack(s, m, rng), "mine"] as const,
                [monsterAttack(s, m, rng), "theirs"] as const,
            ]) {
                if (msgs.damage <= 0) continue;
                const strip = msgs.messages.filter((l) => !isDetail(l));
                assert.ok(strip.length > 0, "띠에 남는 줄이 없다");
                const last = strip[strip.length - 1];
                assert.ok(
                    last.includes(`피해 ${msgs.damage}`),
                    `띠 줄에 피해가 없다(${got}): ${last}`,
                );
                if (got === "mine") mineSeen++;
                else theirsSeen++;
            }
        }
        assert.ok(mineSeen > 0, "내가 때려서 피해를 준 판이 한 번도 없다");
        assert.ok(theirsSeen > 0, "상대가 때려서 피해를 준 판이 한 번도 없다");
    }

    // ── 피해가 0 이면 숫자를 안 적는다 — 맞고도 0 이 나올 수 있다
    {
        assert.equal(withDamage("트롤에게 맞았다.", 0), "트롤에게 맞았다.");
        assert.equal(withDamage("트롤에게 맞았다.", 3), "트롤에게 맞았다. 피해 3");

        // 엔진에서도 실제로 그렇게 나오는지 — 힘을 바닥에 두고 제일 작은 무기를 쥔다.
        const s = newGame(405);
        s.hero.hp = s.hero.maxHp = 99999;
        s.hero.str = 3; // 힘 보정 −4
        const dart = makeItem("weapon", "dart", 980, -1, -1, 1);
        dart.letter = "z";
        s.hero.pack.push(dart);
        s.hero.weaponId = dart.id;
        const m = placeNextTo(s, "B", 99999);
        const rng = new Rng(13);
        let zero = 0;
        for (let i = 0; i < 200; i++) {
            m.hp = 99999;
            const r = heroAttack(s, m, rng);
            if (!r.hit || r.damage !== 0) continue;
            zero++;
            for (const line of r.messages.filter((l) => !isDetail(l))) {
                assert.doesNotMatch(line, /피해 0\b/, line);
            }
        }
        assert.ok(zero > 0, "이백 번을 쳐도 0 짜리 한 방이 안 나왔다 — 이 규칙이 안 걸린다");
    }
});

test("화면에 적는 「공격」과 실제로 들어가는 피해가 같은 식이다", () => {
    // ── 화면에 적는 「공격」은 엔진이 낸다 — 주사위 + 손질 + 힘
    {
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
    }

    // ── 실제로 들어가는 피해와 화면의 「공격」이 같은 식이다
    {
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
            const line = heroAttack(s, m, rng).messages.find((l) => l.startsWith("· 공격력 "));
            if (!line) continue; // 빗나갔다
            seen++;
            assert.ok(line.includes(`공격력 ${dice} `), `${line} 가 ${dice} 로 안 굴렀다`);

            // 치명타면 `2d4 두 번 → 5+7 = 12 +4힘 = 16 …`, 아니면 `2d4 → 5 +4힘 = 9 …`.
            // **방어력을 빼기 전의 공격력**을 견준다 — 화면의 「공격」은 내 몫이라서다.
            const crit = line.includes("두 번");
            if (crit) crits++;
            const rolledSum = crit
                ? Number(line.match(/→ [\d, ]+ = (\d+)/)![1])
                : Number(line.match(/→ (\d+)/)![1]);
            const power = Number(line.match(/= (-?\d+)(  −|  →)/)?.[1] ?? rolledSum);
            assert.equal(power - rolledSum, Number(plus), `${line} 의 보정이 화면의 ${plus} 와 다르다`);
        }
        assert.ok(seen > 20, `맞은 횟수가 ${seen} 뿐이라 못 잰다`);
        assert.ok(crits > 0, "이백 번을 때렸는데 치명타가 한 번도 안 났다");
    }
});

// ── 굴림 줄이 **무엇으로 쳤는지**를 적는다 ──────────────────────────────────
//
// 예전에는 `+2무기` 였다. 강화 수치는 보이는데 **어느 칼의 것인지가 안 보인다** — 물건이
// 층을 타는 지금(진은검·목마른 자의 검·기사의 검 …) 그게 곧 판단거리라, 기록을 되짚을 때
// 「그때 뭘 들고 있었지」를 못 읽는다.
test("무기 이름으로 적는다 — 상태 줄에서 가리는 것은 값으로 고른다", () => {
    // ── 굴림 줄에 쥔 무기의 이름이 적힌다 — `+2무기` 가 아니라 `+2진은검`
    {
        const s = newGame(701);
        const w = makeItem("weapon", "silver sword", 990, -1, -1);
        w.letter = "z";
        w.plusHit = 2;
        w.plusDam = 2;
        s.hero.pack.push(w);
        s.hero.weaponId = w.id;
        s.known["weapon:silver sword"] = true;
        s.hero.hp = s.hero.maxHp = 99999;
        // 공격력 줄은 **잡아 본 종**에게만 산수를 펼친다 — 방어력도 표의 값이라서다.
        s.bestiary.S = 1;

        const m = placeNextTo(s, "S", 99999);
        const rng = new Rng(3);
        let sawHit = false;
        let sawDam = false;
        for (let i = 0; i < 40 && !(sawHit && sawDam); i++) {
            m.hp = 99999;
            for (const line of heroAttack(s, m, rng).messages) {
                if (line.startsWith(`${DETAIL}명중`) && line.includes("+2진은검")) sawHit = true;
                if (line.startsWith(`${DETAIL}공격력`) && line.includes("+2진은검")) sawDam = true;
                assert.ok(!line.includes("무기"), `아직 「무기」라고 적는다: ${line}`);
            }
        }
        assert.ok(sawHit, "명중 줄에 무기 이름이 안 적혔다");
        assert.ok(sawDam, "피해 줄에 무기 이름이 안 적혔다");
    }

    // ── 모르는 무기의 손질은 상태 줄에서 가린다 — 이름표를 바꿔도
    {
        // 한때 `why !== "무기"` 로 걸렀다. 굴림 줄에 무기 이름을 적기 시작하자 그 문자열이
        // 안 맞아 **조용히 안 가려졌다.** 빼는 것은 이름표가 아니라 **그 무기의 손질값**이다.
        const s = newGame(702);
        const w = makeItem("weapon", "knight sword", 991, -1, -1);
        w.letter = "z";
        w.plusHit = 3;
        w.plusDam = 3;
        s.hero.pack.push(w);
        s.hero.weaponId = w.id;
        s.hero.str = 16; // 능력 보정 +3, 숙련 +2

        assert.equal(heroHitBonus(s.hero, {}), 5, "모르는 무기의 손질이 상태 줄에 샜다");
        assert.equal(heroHitBonus(s.hero, { "weapon:knight sword": true }), 8);
        assert.equal(heroAttackText(s.hero, {}), "5d6+3");
        assert.equal(heroAttackText(s.hero, { "weapon:knight sword": true }), "5d6+6");
    }

    // ── 상대의 공격력 줄은 등호를 하나만 쓴다 — 어느 쪽이 총합인지 읽혀야 한다
    {
        // 치명타는 주사위가 둘이라 둘 다 적는다.
        assert.equal(
            monsterDamageLine([{ dice: "1d8", rolled: [5, 6], dealt: 8 }], 0, 3, 8),
            "· 공격력 1d8 두 번 → 5, 6 −3방어력 → 8  = 피해 8",
        );
        // 여러 대는 대마다 따로 적고 **등호는 줄 끝에 하나**다. 예전에는 치명타가 섞이면
        // `… = 11 = 18` 처럼 등호가 둘 연달아 섰다.
        assert.equal(
            monsterDamageLine(
                [
                    { dice: "1d8", rolled: [7], dealt: 4 },
                    { dice: "1d8", rolled: [5, 6], dealt: 8 },
                    { dice: "2d6", rolled: [8], dealt: 5 },
                ],
                0,
                3,
                17,
            ),
            "· 공격력 1d8 → 7 −3방어력 → 4 · 1d8 두 번 → 5, 6 −3방어력 → 8 · 2d6 → 8 −3방어력 → 5  = 피해 17",
        );
        // 맨몸이면 뺄 것이 없으니 빼는 자리도 안 적는다.
        assert.equal(
            monsterDamageLine([{ dice: "1d8", rolled: [5], dealt: 5 }], 0, 0, 5),
            "· 공격력 1d8 → 5 → 5  = 피해 5",
        );
        // 모르는 종은 숫자만.
        assert.equal(monsterDamageLine([], 6, 3, 7), "· 피해 7");
    }
});
