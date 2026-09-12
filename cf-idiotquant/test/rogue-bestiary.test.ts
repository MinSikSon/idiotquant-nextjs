// 도감 — **한 마리를 잡아야 그 종의 속을 안다.**
//
// 이 파일이 지키는 것 셋.
//
//   1. 잡기 전에는 스탯이 **아예 안 나간다.** 조금이라도 새면 「처음 보는 글자 앞에서
//      아무것도 모른 채 결정한다」가 무너지는데, 그 한 번이 이 게임에서 제일 무서운
//      순간이다.
//   2. **어떻게 잡았든 센다.** 손·지팡이·던지기가 따로 세면 「지팡이로만 잡아 본 종은
//      영영 모른다」가 되고, 그건 규칙이 아니라 빠뜨린 자리다.
//   3. 도망친 것은 잡은 것이 아니다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { bestiaryProgress, bestiaryRows, newGame, perform, survey } from "@/lib/rogue/game";
import { makeItem } from "@/lib/rogue/items";
import { MONSTERS, spawnMonster } from "@/lib/rogue/monsters";
import { armorClass } from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";
import { idx, type GameState } from "@/lib/rogue/types";

/** 내 옆에 원하는 놈을 한 마리 세운다. 그 칸은 반드시 비운다. */
function placeNextTo(s: GameState, ch: string, hp = 1) {
    const x = s.hero.x + 1;
    const y = s.hero.y;
    s.level.tiles[idx(x, y)] = 1; // 방 바닥
    s.level.monsters = s.level.monsters.filter((m) => !(m.x === x && m.y === y));
    const m = spawnMonster(ch, x, y, new Rng(7));
    m.hp = hp;
    m.maxHp = Math.max(hp, m.maxHp);
    s.level.monsters.push(m);
    return m;
}

test("잡기 전에는 조사해도 속이 안 나온다", () => {
    const s = newGame(301);
    placeNextTo(s, "S", 30);

    const seen = survey(s).find((x) => x.ch === "S");
    assert.ok(seen, "옆에 세운 놈이 조사에 안 보인다");
    assert.equal(seen!.known, false);
    assert.equal(seen!.kills, 0);
    // **한 조각도 새면 안 된다.**
    assert.equal(seen!.level, undefined);
    assert.equal(seen!.defense, undefined);
    assert.equal(seen!.damage, undefined);
    assert.equal(seen!.exp, undefined);
    assert.equal(seen!.hp, undefined);
    assert.equal(seen!.mean, undefined);
    // 눈으로 보이는 것은 잡아 본 적이 없어도 안다.
    assert.ok(seen!.condition);
    assert.equal(seen!.distance, 1);
});

test("한 마리를 잡으면 그 뒤로는 속을 안다", () => {
    let s = newGame(302);
    placeNextTo(s, "S", 1);

    // 한 방에 죽을 때까지 때린다.
    for (let i = 0; i < 40 && (s.bestiary.S ?? 0) === 0; i++) {
        s = perform(s, { t: "move", dx: 1, dy: 0 });
        if (s.level.monsters.every((m) => m.def.ch !== "S")) break;
    }
    assert.equal(s.bestiary.S, 1, "옆의 뱀을 못 잡았다");
    assert.ok(
        s.messages.some((m) => m.includes("처음 잡았다")),
        "처음 잡은 것을 화면이 말하지 않았다",
    );

    // 다시 만나면 속이 보인다.
    placeNextTo(s, "S", 5);
    const seen = survey(s).find((x) => x.ch === "S")!;
    assert.equal(seen.known, true);
    assert.equal(seen.level, MONSTERS.S.level);
    assert.equal(seen.defense, armorClass(MONSTERS.S.armor));
    assert.equal(seen.exp, MONSTERS.S.exp);
    assert.equal(seen.hp, MONSTERS.S.hp);
    assert.deepEqual(seen.damage, MONSTERS.S.damage);
});

test("지팡이로 잡아도 도감에 들어간다", () => {
    const s = newGame(303);
    const m = placeNextTo(s, "O", 1);
    const wand = makeItem("wand", "magic missile", 990, -1, -1);
    wand.charges = 3;
    wand.letter = "z";
    s.hero.pack.push(wand);

    const after = perform(s, { t: "zap", letter: "z", dx: 1, dy: 0 });
    assert.ok(after.level.monsters.every((x) => x.id !== m.id), "지팡이에 안 죽었다");
    assert.equal(after.bestiary.O, 1, "지팡이로 잡은 것이 도감에 안 들어갔다");
});

test("던져서 잡아도 도감에 들어간다", () => {
    const s = newGame(304);
    // 던진 것이 맞아야 하므로 체력을 1 로 두고 여러 번 던진다.
    const dagger = makeItem("weapon", "dagger", 991, -1, -1);
    dagger.count = 20;
    dagger.plusHit = 10; // 반드시 맞도록
    dagger.letter = "z";
    s.hero.pack.push(dagger);

    let cur: GameState = s;
    for (let i = 0; i < 20 && !(cur.bestiary.H > 0); i++) {
        placeNextTo(cur, "H", 1);
        cur = perform(cur, { t: "throw", letter: "z", dx: 1, dy: 0 });
    }
    assert.ok((cur.bestiary.H ?? 0) > 0, "던져서 잡은 것이 도감에 안 들어갔다");
});

test("도망친 놈은 잡은 것이 아니다", () => {
    const s = newGame(305);
    // 레프러콘은 금화를 채고 스스로 사라진다 — 그건 내가 잡은 것이 아니다.
    const m = placeNextTo(s, "L", 40);
    m.awake = true;
    s.hero.gold = 500;

    let cur: GameState = s;
    for (let i = 0; i < 60 && cur.level.monsters.some((x) => x.id === m.id); i++) {
        cur = perform(cur, { t: "rest" });
    }
    if (cur.level.monsters.some((x) => x.id === m.id)) return; // 끝내 안 훔쳤으면 이 판으로는 못 잰다
    assert.equal(cur.bestiary.L ?? 0, 0, "도망친 레프러콘이 도감에 들어갔다");
});

test("조사는 보이는 것만 준다 — 벽 너머는 안 센다", () => {
    const s = newGame(306);
    // 지도 밖 구석에 억지로 하나 세운다. 본 적 없는 칸이라 보일 리가 없다.
    const far = spawnMonster("T", 1, 1, new Rng(3));
    s.level.monsters.push(far);
    assert.ok(
        !survey(s).some((x) => x.id === far.id),
        "안 보이는 몬스터가 조사에 잡혔다",
    );
});

test("조사는 판을 한 톨도 안 바꾼다 — 턴을 안 쓴다", () => {
    const s = newGame(307);
    placeNextTo(s, "S", 9);
    const before = JSON.stringify({
        turn: s.turn,
        food: s.hero.food,
        hp: s.hero.hp,
        x: s.hero.x,
        y: s.hero.y,
        monsters: s.level.monsters.map((m) => [m.x, m.y, m.hp]),
    });
    survey(s);
    survey(s);
    const after = JSON.stringify({
        turn: s.turn,
        food: s.hero.food,
        hp: s.hero.hp,
        x: s.hero.x,
        y: s.hero.y,
        monsters: s.level.monsters.map((m) => [m.x, m.y, m.hp]),
    });
    assert.equal(after, before, "조사가 판을 바꿨다");
});

test("도감은 새 판으로 이어진다 — 죽어도 남는 유일한 것", () => {
    const kept = { S: 3, O: 1 };
    const s = newGame(308, kept);
    assert.deepEqual(s.bestiary, kept);
    assert.equal(bestiaryProgress(s.bestiary).found, 2);
    assert.equal(bestiaryProgress(s.bestiary).total, 26);

    // 넘긴 객체를 게임이 물들이면 안 된다 — 부르는 쪽의 값이 몰래 바뀐다.
    placeNextTo(s, "S", 1);
    for (let i = 0; i < 40; i++) perform(s, { t: "move", dx: 1, dy: 0 });
    assert.equal(kept.S, 3, "넘긴 도감이 게임 안에서 바뀌었다");
});

test("도감 목록은 잡은 것만, 약한 것부터", () => {
    const rows = bestiaryRows({ D: 1, S: 2, T: 1 });
    assert.deepEqual(rows.map((r) => r.ch), ["S", "T", "D"]);
    assert.equal(rows[0].kills, 2);
    assert.equal(rows[0].name, MONSTERS.S.name);
    // 안 잡은 것은 목록에 아예 없다.
    assert.equal(bestiaryRows({}).length, 0);
});

test("피해 없는 특수 공격(0d0)은 피해 칸에 안 적는다", () => {
    // 망령은 1d6 과 0d0 을 둘 다 갖고 있다. 0d0 을 그대로 적으면 「0d6 짜리 피해」로 읽힌다.
    const rows = bestiaryRows({ W: 1 });
    assert.deepEqual(rows[0].damage, ["1d6"]);
});
