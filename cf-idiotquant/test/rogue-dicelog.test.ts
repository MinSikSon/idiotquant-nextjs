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

import { DETAIL, damageLine, heroAttack, hitLine, isDetail, monsterAttack } from "@/lib/rogue/combat";
import { newGame, perform } from "@/lib/rogue/game";
import { heroAttackText } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { MONSTERS, spawnMonster } from "@/lib/rogue/monsters";
import { Rng } from "@/lib/rogue/rng";
import { idx, type GameState } from "@/lib/rogue/types";

/** 문턱이 적힌 자리. 이 모양이 한 글자라도 새면 도감이 뚫린 것이다. */
const NEED = /vs -?\d+/;

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

test("명중 줄은 굴린 눈과 보정과 문턱을 그대로 적는다", () => {
    assert.equal(hitLine("나", [15], [], null, "맞았다"), "· 명중 나: d20 15 → 맞았다");
    assert.equal(
        hitLine("나", [15], [{ n: 1, why: "무기" }, { n: 2, why: "힘" }], 13, "맞았다"),
        "· 명중 나: d20 15 +1무기 +2힘 = 18 vs 13 → 맞았다",
    );
    // 0인 보정은 안 적는다 — 없는 것을 적으면 줄만 길어진다.
    assert.equal(
        hitLine("나", [4], [{ n: 0, why: "무기" }, { n: -1, why: "힘" }], null, "빗나갔다"),
        "· 명중 나: d20 4 −1힘 = 3 → 빗나갔다",
    );
    // 여러 번 때리는 놈은 눈이 여러 개다. 그때는 합을 안 적는다.
    assert.equal(
        hitLine("트롤", [4, 19, 11], [], 9, "3대 중 2대"),
        "· 명중 트롤: d20 4, 19, 11 vs 9 → 3대 중 2대",
    );
});

test("피해 줄은 굴린 눈에서 결과까지 이어 적는다", () => {
    assert.equal(damageLine("1d8", 5, [], 5), "· 피해: 1d8 → 5");
    assert.equal(
        damageLine("2d4", 5, [{ n: 1, why: "무기" }, { n: 2, why: "힘" }], 8),
        "· 피해: 2d4 → 5 +1무기 +2힘 = 8",
    );
    // 깎여서 0 이하가 되면 1 로 올린다. 그 자리를 안 적으면 식과 결과가 안 맞아 보인다.
    assert.equal(
        damageLine("1d2", 1, [{ n: -3, why: "힘" }], 1),
        "· 피해: 1d2 → 1 −3힘 = -2 → 최소 1",
    );
    // 주사위를 안 주면 총합만 — 상대의 표기는 도감이 할 일이다.
    assert.equal(damageLine(null, 0, [], 7), "· 피해: 7");
});

test("계산 줄에는 표시가 붙는다 — 띠가 그것을 걸러 낸다", () => {
    assert.ok(isDetail(hitLine("나", [5], [], null, "맞았다")));
    assert.ok(isDetail(damageLine("1d8", 5, [], 5)));
    assert.ok(!isDetail("황조롱이을(를) 맞혔다."));
    assert.ok(DETAIL.length > 0);
});

test("내가 때리면 굴린 눈이 기록에 남는다", () => {
    let s = newGame(402);
    placeNextTo(s, "S", 200);
    s = perform(s, { t: "move", dx: 1, dy: 0 });
    assert.ok(
        s.messages.some((l) => /^· 명중 나: d20 \d+/.test(l)),
        `내 굴림이 기록에 없다: ${JSON.stringify(s.messages.slice(-4))}`,
    );
});

test("상대가 때려도 굴린 눈이 남는다", () => {
    const s = newGame(403);
    s.hero.hp = s.hero.maxHp = 9999;
    const m = placeNextTo(s, "S", 200);
    const r = monsterAttack(s, m, new Rng(5));
    assert.match(r.messages[0], new RegExp(`^· 명중 ${MONSTERS.S.name}: d20 \\d+`));
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
        after.messages.some((l) => /^· 명중 나\(던짐\): d20 \d+/.test(l)),
        `던진 굴림이 기록에 없다: ${JSON.stringify(after.messages.slice(-4))}`,
    );
});

test("잡아 본 적 없는 종에게는 문턱을 한 번도 안 준다 — 방어·레벨이 역산된다", () => {
    for (const ch of Object.keys(MONSTERS)) {
        const s = newGame(500);
        s.hero.hp = s.hero.maxHp = 99999;
        const m = placeNextTo(s, ch, 99999);
        const rng = new Rng(3);
        for (let i = 0; i < 40; i++) {
            m.hp = 99999; // 죽이면 도감에 올라 조건이 달라진다
            for (const line of [...heroAttack(s, m, rng).messages, ...monsterAttack(s, m, rng).messages]) {
                assert.doesNotMatch(line, NEED, `${ch}(${MONSTERS[ch].name}) 의 문턱이 샜다: ${line}`);
            }
        }
        assert.equal(s.bestiary[ch] ?? 0, 0);
    }
});

test("잡아 본 종에게는 문턱을 준다 — 도감에 올랐으면 숨길 것이 없다", () => {
    const s = newGame(501);
    s.bestiary.S = 1;
    s.hero.hp = s.hero.maxHp = 9999;
    const m = placeNextTo(s, "S", 9999);
    const rng = new Rng(3);
    assert.match(heroAttack(s, m, rng).messages[0], NEED);
    assert.match(monsterAttack(s, m, rng).messages[0], NEED);
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
        assert.match(mine[0], /^· 명중 나: d20 /);
        assert.doesNotMatch(mine[mine.length - 1], /^· /);

        const theirs = monsterAttack(s, m, rng).messages;
        assert.ok(theirs.length >= 2, `결과 줄이 없다: ${JSON.stringify(theirs)}`);
        assert.match(theirs[0], /^· 명중 .*: d20 /);
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
    s.hero.str = 16; // 피해 보정 +1

    // **써 보기 전에는 손질을 모른다.** 모르는 무기의 속을 화면이 흘리면 안 된다.
    assert.equal(heroAttackText(s.hero, {}), "4d4+1");
    assert.equal(heroAttackText(s.hero, { "weapon:two-handed sword": true }), "4d4+3");

    // 맨손은 1d2, 보정 없는 힘이면 주사위만.
    const bare = newGame(601);
    bare.hero.weaponId = null;
    bare.hero.str = 10;
    assert.equal(heroAttackText(bare.hero, {}), "1d2");
});

test("실제로 들어가는 피해와 화면의 「공격」이 같은 식이다", () => {
    // 여기서 갈리면 화면은 4d4+3 이라 적고 몸은 4d4+1 을 때린다.
    const s = newGame(602);
    const w = makeItem("weapon", "long sword", 981, -1, -1);
    w.letter = "z";
    w.plusDam = 2;
    s.hero.pack.push(w);
    s.hero.weaponId = w.id;
    s.hero.str = 18;
    s.known["weapon:long sword"] = true;
    s.bestiary.S = 1;

    const m = placeNextTo(s, "S", 99999);
    const rng = new Rng(4);
    const shown = heroAttackText(s.hero, s.known); // "3d5+5" 꼴
    const [dice, plus] = shown.split(/(?=[+-])/);
    for (let i = 0; i < 40; i++) {
        const line = heroAttack(s, m, rng).messages.find((l) => l.startsWith("· 피해:"));
        if (!line) continue; // 빗나갔다
        assert.ok(line.includes(`피해: ${dice} →`), `${line} 가 ${dice} 로 안 굴렀다`);
        const total = Number(line.match(/= (-?\d+)/)![1]);
        const rolled = Number(line.match(/→ (\d+)/)![1]);
        assert.equal(total - rolled, Number(plus), `${line} 의 보정이 화면의 ${plus} 와 다르다`);
    }
});
