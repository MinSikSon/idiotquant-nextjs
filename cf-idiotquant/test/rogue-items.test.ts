// 반지 · 지팡이 · 던지기 · 저주 · 함정 · 비밀문.
//
// 이 파일이 지키는 것 중 제일 중요한 둘:
//
//   1. **저주받은 것은 벗을 수 없다.** 이 한 줄이 「좋아 보이는 것을 집는 일」에 값을
//      매긴다. 조용히 벗겨지면 저주는 그냥 −1 짜리 물건이 된다.
//   2. **반지는 배를 더 고프게 한다.** 이 대가가 없으면 두 손에 둘을 안 낄 이유가 없다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { heroArmor, heroStr, hungerRate, packItem, wornRings } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { buildLevel } from "@/lib/rogue/dungeon";
import { Rng } from "@/lib/rogue/rng";
import { T, idx, type GameState, type Item } from "@/lib/rogue/types";

/** 배낭에 물건 하나를 밀어 넣고 그 글자를 준다. */
function give(s: GameState, it: Item, letter: string): string {
    it.letter = letter;
    it.x = -1;
    it.y = -1;
    s.hero.pack.push(it);
    return letter;
}

test("저주받은 갑옷은 입으면 드러나고, 그 뒤로는 벗을 수 없다", () => {
    const s0 = newGame(101);
    const bad = makeItem("armor", "leather", 900, -1, -1);
    bad.cursed = true;
    bad.plusArmor = -2;
    const good = makeItem("armor", "plate mail", 901, -1, -1);
    give(s0, bad, "y");
    give(s0, good, "z");

    assert.ok(!bad.curseKnown, "입기 전에는 저주를 알 수 없어야 한다");
    const s1 = perform(s0, { t: "wear", letter: "y" });
    assert.equal(s1.hero.armorId, bad.id);
    assert.ok(bad.curseKnown, "입었는데 저주가 안 드러났다");

    // 다른 갑옷으로 못 바꾼다.
    const s2 = perform(s1, { t: "wear", letter: "z" });
    assert.equal(s2.hero.armorId, bad.id, "저주받은 갑옷이 벗겨졌다");
    // 내려놓지도 못한다.
    const s3 = perform(s2, { t: "drop", letter: "y" });
    assert.ok(packItem(s3.hero, "y"), "저주받은 갑옷을 내려놓았다");

    // 저주 풀기 주문서를 읽으면 풀린다.
    give(s3, makeItem("scroll", "remove curse", 902, -1, -1), "x");
    const s4 = perform(s3, { t: "read", letter: "x" });
    assert.ok(!bad.cursed, "저주가 안 풀렸다");
    const s5 = perform(s4, { t: "wear", letter: "z" });
    assert.equal(s5.hero.armorId, good.id, "풀린 뒤에도 못 바꾼다");
});

test("보호 반지는 방어를 내리고, 힘 반지는 힘을 올린다", () => {
    const s0 = newGame(102);
    const base = heroArmor(s0.hero);
    const prot = makeItem("ring", "protection", 910, -1, -1);
    prot.plusRing = 2;
    give(s0, prot, "y");

    const s1 = perform(s0, { t: "putOn", letter: "y" });
    assert.equal(heroArmor(s1.hero), base - 2, "보호 반지가 방어 등급을 **내려야** 한다");

    const str0 = heroStr(s1.hero);
    const might = makeItem("ring", "add strength", 911, -1, -1);
    might.plusRing = 3;
    give(s1, might, "z");
    const s2 = perform(s1, { t: "putOn", letter: "z" });
    assert.equal(heroStr(s2.hero), str0 + 3);
    assert.equal(wornRings(s2.hero).length, 2);

    // 세 번째는 낄 손이 없다.
    give(s2, makeItem("ring", "searching", 912, -1, -1), "w");
    const s3 = perform(s2, { t: "putOn", letter: "w" });
    assert.equal(wornRings(s3.hero).length, 2, "손이 셋이 되었다");
});

test("반지를 끼면 배가 더 고프다 — 이 대가가 없으면 반지는 공짜다", () => {
    const s0 = newGame(103);
    assert.equal(hungerRate(s0.hero), 1);

    give(s0, makeItem("ring", "regeneration", 920, -1, -1), "y");
    const s1 = perform(s0, { t: "putOn", letter: "y" });
    assert.ok(hungerRate(s1.hero) > 1, "재생 반지가 공짜다");

    // 실제로 시계가 더 빨리 돈다.
    const before = s1.hero.food;
    const s2 = perform(s1, { t: "rest" });
    assert.equal(before - s2.hero.food, hungerRate(s2.hero));

    // 소화 억제는 반대로 간다.
    const s3 = perform(s2, { t: "removeRing", letter: "y" });
    give(s3, makeItem("ring", "slow digestion", 921, -1, -1), "z");
    const s4 = perform(s3, { t: "putOn", letter: "z" });
    assert.ok(hungerRate(s4.hero) < 1, "소화 억제가 안 듣는다");
});

test("저주받은 반지는 뺄 수 없다", () => {
    const s0 = newGame(104);
    const bad = makeItem("ring", "adornment", 930, -1, -1);
    bad.cursed = true;
    give(s0, bad, "y");
    const s1 = perform(s0, { t: "putOn", letter: "y" });
    const s2 = perform(s1, { t: "removeRing", letter: "y" });
    assert.equal(wornRings(s2.hero).length, 1, "저주받은 반지가 빠졌다");
});

test("지팡이는 횟수를 쓰고, 다 쓰면 아무 일도 안 난다", () => {
    const s0 = newGame(105);
    const wand = makeItem("wand", "magic missile", 940, -1, -1);
    wand.charges = 2;
    give(s0, wand, "y");

    // 옆에 몬스터를 세운다.
    const m = s0.level.monsters[0];
    assert.ok(m, "이 층에 몬스터가 없다");
    m.x = s0.hero.x + 1;
    m.y = s0.hero.y;
    m.hp = 60;
    m.maxHp = 60;

    const s1 = perform(s0, { t: "zap", letter: "y", dx: 1, dy: 0 });
    assert.equal(wand.charges, 1);
    assert.ok(m.hp < 60, "맞았는데 체력이 그대로다");
    assert.ok(s1.known["wand:magic missile"], "맞혔는데 정체를 모른다");

    perform(s1, { t: "zap", letter: "y", dx: 1, dy: 0 });
    assert.equal(wand.charges, 0);
    const hpBefore = m.hp;
    perform(s1, { t: "zap", letter: "y", dx: 1, dy: 0 });
    assert.equal(m.hp, hpBefore, "빈 지팡이가 피해를 줬다");
});

test("둔화 지팡이는 몬스터를 두 턴에 한 번만 움직이게 한다", () => {
    const s0 = newGame(106);
    const wand = makeItem("wand", "slow monster", 950, -1, -1);
    wand.charges = 3;
    give(s0, wand, "y");
    const m = s0.level.monsters[0];
    m.x = s0.hero.x + 1;
    m.y = s0.hero.y;
    assert.equal(m.speed, 0);
    perform(s0, { t: "zap", letter: "y", dx: 1, dy: 0 });
    assert.equal(m.speed, -1, "둔화가 안 걸렸다");
});

test("던진 무기는 떨어진 자리에 남고, 물약은 깨진다", () => {
    const s0 = newGame(107);
    const dagger = makeItem("weapon", "dagger", 960, -1, -1);
    give(s0, dagger, "y");
    const before = s0.level.items.length;
    const s1 = perform(s0, { t: "throw", letter: "y", dx: 1, dy: 0 });
    assert.equal(packItem(s1.hero, "y"), undefined, "던진 단검이 배낭에 남았다");
    assert.equal(s1.level.items.length, before + 1, "던진 단검이 사라졌다");

    const potion = makeItem("potion", "healing", 961, -1, -1);
    give(s1, potion, "z");
    const mid = s1.level.items.length;
    const s2 = perform(s1, { t: "throw", letter: "z", dx: -1, dy: 0 });
    assert.equal(s2.level.items.length, mid, "깨진 물약이 바닥에 남았다");
});

test("던지려면 방향이 있어야 한다 — 제자리로는 못 던진다", () => {
    const s0 = newGame(108);
    give(s0, makeItem("weapon", "dagger", 970, -1, -1), "y");
    const s1 = perform(s0, { t: "throw", letter: "y", dx: 0, dy: 0 });
    assert.ok(packItem(s1.hero, "y"), "제자리로 던져서 물건이 사라졌다");
});

test("비밀문은 찾기 전에는 벽이고, 뒤지면 문이 된다", () => {
    // 비밀문이 있는 층을 찾는다 — 깊을수록 잦다.
    let s: GameState | null = null;
    for (let seed = 1; seed <= 300 && !s; seed++) {
        const g = newGame(seed);
        for (let d = 0; d < 12 && g.level.depth < 12; d++) {
            g.hero.x = g.level.stairs.x;
            g.hero.y = g.level.stairs.y;
            perform(g, { t: "descend" });
        }
        if (g.level.tiles.includes(T.SECRET)) s = g;
    }
    assert.ok(s, "깊은 층 삼백 판에 비밀문이 하나도 없다 — 확률이 0 이 되었다");

    const at = s!.level.tiles.indexOf(T.SECRET);
    const sx = at % 80;
    const sy = Math.floor(at / 80);
    // 비밀문은 걸어 들어갈 수 있는 칸이 아니다.
    s!.hero.x = sx - 1;
    s!.hero.y = sy;
    const blocked = perform(s!, { t: "move", dx: 1, dy: 0 });
    assert.notEqual(blocked.hero.x, sx, "찾지도 않은 비밀문을 지나갔다");

    // 옆에 서서 뒤지면 언젠가 찾는다.
    let found = false;
    for (let i = 0; i < 200 && !found; i++) {
        perform(s!, { t: "search" });
        found = s!.level.tiles[idx(sx, sy)] === T.DOOR;
    }
    assert.ok(found, "이백 번을 뒤져도 못 찾았다");
});

test("함정은 밟으면 터진다 — 곰덫은 발을 묶는다", () => {
    const s0 = newGame(109);
    const tx = s0.hero.x + 1;
    const ty = s0.hero.y;
    // 오른쪽이 막혀 있으면 이 판으로는 못 잰다.
    s0.level.tiles[idx(tx, ty)] = T.FLOOR;
    s0.level.monsters = s0.level.monsters.filter((m) => !(m.x === tx && m.y === ty));
    s0.level.traps.push({ x: tx, y: ty, kind: "beartrap", found: false });

    const s1 = perform(s0, { t: "move", dx: 1, dy: 0 });
    assert.equal(s1.hero.x, tx);
    assert.ok(s1.hero.stuck > 0, "곰덫을 밟았는데 안 묶였다");
    assert.ok(s1.level.traps[s1.level.traps.length - 1].found, "밟은 함정이 안 드러났다");

    // 묶인 동안에는 못 걷는다.
    const x = s1.hero.x;
    const s2 = perform(s1, { t: "move", dx: 1, dy: 0 });
    assert.equal(s2.hero.x, x, "덫에 걸렸는데 걸어 나갔다");
});

test("함정문은 나를 한 층 아래로 떨어뜨린다", () => {
    const s0 = newGame(110);
    const tx = s0.hero.x + 1;
    const ty = s0.hero.y;
    s0.level.tiles[idx(tx, ty)] = T.FLOOR;
    s0.level.monsters = s0.level.monsters.filter((m) => !(m.x === tx && m.y === ty));
    s0.level.traps.push({ x: tx, y: ty, kind: "trapdoor", found: false });
    const s1 = perform(s0, { t: "move", dx: 1, dy: 0 });
    assert.equal(s1.level.depth, 2, "함정문을 밟았는데 그 층에 남았다");
    assert.equal(s1.deepest, 2);
});

test("미로 방도 걸어서 다 닿는다", () => {
    let mazes = 0;
    for (let seed = 1; seed <= 80; seed++) {
        const level = buildLevel(14, new Rng(seed * 5711));
        if (!level.maze) continue;
        mazes++;
        // 연결성은 rogue-dungeon.test.ts 가 이미 모든 깊이에서 본다. 여기서는
        // 미로 방 안쪽이 **바닥이 아니라 통로**인지만 확인한다 — 그래야 어둡다.
        const mazeRoom = level.rooms.find((r) => r.maze);
        assert.ok(mazeRoom, "maze 플래그는 섰는데 미로 방이 없다");
        let corridorCells = 0;
        for (let y = mazeRoom!.y + 1; y < mazeRoom!.y + mazeRoom!.h - 1; y++) {
            for (let x = mazeRoom!.x + 1; x < mazeRoom!.x + mazeRoom!.w - 1; x++) {
                if (level.tiles[idx(x, y)] === T.CORRIDOR) corridorCells++;
                assert.notEqual(level.tiles[idx(x, y)], T.FLOOR, "미로 안에 방 바닥이 남았다");
            }
        }
        assert.ok(corridorCells > 3, "미로가 안 파였다");
    }
    assert.ok(mazes > 0, "80판을 만들어도 14층에 미로가 하나도 없다");
});

test("괴물 감지 물약은 벽 너머를 잠깐 보여 준다", () => {
    const s0 = newGame(111);
    give(s0, makeItem("potion", "detect monsters", 980, -1, -1), "y");
    const s1 = perform(s0, { t: "quaff", letter: "y" });
    assert.ok(s1.hero.detect > 0);
    assert.ok(s1.known["potion:detect monsters"]);
});
