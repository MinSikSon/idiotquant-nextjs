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

import { diceLine, heroAttack, monsterAttack } from "@/lib/rogue/combat";
import { newGame, perform } from "@/lib/rogue/game";
import { makeItem } from "@/lib/rogue/items";
import { MONSTERS, spawnMonster } from "@/lib/rogue/monsters";
import { Rng } from "@/lib/rogue/rng";
import { idx, type GameState } from "@/lib/rogue/types";

/** 문턱이 적힌 자리. 이 모양이 한 글자라도 새면 도감이 뚫린 것이다. */
const NEED = /\(명중 -?\d+↑\)/;

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

test("굴림 줄의 모양 — 보정이 있으면 더한 값까지 보여 준다", () => {
    assert.equal(diceLine("나", [{ roll: 15, bonus: 0 }], null, null), "나: d20 15");
    assert.equal(diceLine("나", [{ roll: 15, bonus: 2 }], null, null), "나: d20 15+2=17");
    assert.equal(diceLine("나", [{ roll: 15, bonus: -1 }], null, null), "나: d20 15-1=14");
    assert.equal(
        diceLine("트롤", [{ roll: 4, bonus: 0 }, { roll: 19, bonus: 0 }], null, { total: 7 }),
        "트롤: d20 4, 19 · 피해 7",
    );
    assert.equal(
        diceLine("나", [{ roll: 11, bonus: 1 }], 13, { dice: "1d8", bonus: 2, total: 6 }),
        "나: d20 11+1=12 (명중 13↑) · 피해 1d8+2 → 6",
    );
});

test("내가 때리면 굴린 눈이 기록에 남는다", () => {
    let s = newGame(402);
    placeNextTo(s, "S", 200);
    s = perform(s, { t: "move", dx: 1, dy: 0 });
    assert.ok(
        s.messages.some((l) => /^나: d20 \d+/.test(l)),
        `내 굴림이 기록에 없다: ${JSON.stringify(s.messages.slice(-4))}`,
    );
});

test("상대가 때려도 굴린 눈이 남는다", () => {
    const s = newGame(403);
    s.hero.hp = s.hero.maxHp = 9999;
    const m = placeNextTo(s, "S", 200);
    const r = monsterAttack(s, m, new Rng(5));
    assert.match(r.messages[0], new RegExp(`^${MONSTERS.S.name}: d20 \\d+`));
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
        after.messages.some((l) => /^나: d20 \d+/.test(l)),
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
        const line = monsterAttack(s, m, rng).messages[0];
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
        assert.match(mine[0], /^나: d20 /);
        assert.doesNotMatch(mine[mine.length - 1], /^나: d20 /);

        const theirs = monsterAttack(s, m, rng).messages;
        assert.ok(theirs.length >= 2, `결과 줄이 없다: ${JSON.stringify(theirs)}`);
        assert.match(theirs[0], /: d20 /);
        assert.doesNotMatch(theirs[theirs.length - 1], /: d20 /);
    }
});
