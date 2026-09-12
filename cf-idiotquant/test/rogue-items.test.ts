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
import { heroArmor, heroDefense, heroStr, hungerRate, packItem, wornRings } from "@/lib/rogue/hero";
import { itemPower, makeItem } from "@/lib/rogue/items";
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

test("겹쳐 쌓인 것을 주워도 배낭 자리를 제대로 말한다", () => {
    // 예전에는 「undefined) 식량」이 떴다. 바닥에서 집은 쪽에는 자리(letter)가 없는데,
    // `addToPack` 이 true 만 돌려줘서 부르는 쪽이 **집은 물건**의 자리를 읽었다.
    const s = newGame(910);
    const mine = s.hero.pack.find((p) => p.kind === "food")!;
    assert.ok(mine.letter, "처음 든 식량에 자리가 없다");
    const before = mine.count;

    const dropped = makeItem("food", "food ration", 995, s.hero.x, s.hero.y, 2);
    s.level.items = s.level.items.filter((i) => !(i.x === s.hero.x && i.y === s.hero.y));
    s.level.items.push(dropped);

    const after = perform(s, { t: "pickup" });
    const line = after.messages[after.messages.length - 1];
    assert.ok(!line.includes("undefined"), `자리를 못 읽었다: ${line}`);
    assert.ok(line.startsWith(`${mine.letter})`), `${line} 가 ${mine.letter}) 로 시작하지 않는다`);
    // 겹쳐 쌓였으니 배낭 칸은 안 늘고 개수만 는다.
    assert.equal(after.hero.pack.filter((p) => p.kind === "food").length, 1);
    assert.equal(after.hero.pack.find((p) => p.kind === "food")!.count, before + 2);
});

test("배낭의 모든 물건에는 자리가 있다 — 자리 없는 것은 못 쓴다", () => {
    // 자리가 없으면 「마신다」로 고를 수도, 내려놓을 수도 없다. 조용히 못 쓰는 물건이 된다.
    let s = newGame(911);
    const rng = new Rng(3);
    for (let i = 0; i < 400 && s.phase === "playing"; i++) {
        const d = rng.pick([{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 0, dy: -1 }])!;
        s = perform(s, i % 5 === 0 ? { t: "pickup" } : { t: "move", dx: d.dx, dy: d.dy });
        for (const p of s.hero.pack) {
            assert.ok(p.letter, `${p.kind}:${p.type} 에 자리가 없다`);
        }
    }
});

test("+ 가 붙으면 배낭에 적히는 숫자가 **커진다**", () => {
    // 예전에는 무기는 기본 주사위만 적어 `+2 장검` 과 맹탕 장검이 똑같이 보였고,
    // 갑옷은 방어 등급을 그대로 적어 `+1` 이 8 을 7 로 **내려서 나빠 보였다.**
    const known = { "weapon:long sword": true, "armor:leather": true };

    const plain = makeItem("weapon", "long sword", 1, -1, -1);
    const fine = makeItem("weapon", "long sword", 2, -1, -1);
    fine.plusDam = 2;
    assert.equal(itemPower(plain, known), "피해 3d4");
    assert.equal(itemPower(fine, known), "피해 3d4+2");

    const rags = makeItem("armor", "leather", 3, -1, -1);
    const good = makeItem("armor", "leather", 4, -1, -1);
    good.plusArmor = 1;
    assert.equal(itemPower(rags, known), "방어도 12");
    assert.equal(itemPower(good, known), "방어도 13", "손질한 갑옷의 숫자가 안 올랐다");

    // 상한 것은 내려간다 — 방향이 양쪽으로 맞아야 한다.
    const rusted = makeItem("armor", "leather", 5, -1, -1);
    rusted.plusArmor = -2;
    assert.equal(itemPower(rusted, known), "방어도 10");
});

test("정체를 모르는 물건은 손질을 안 흘린다", () => {
    const w = makeItem("weapon", "long sword", 6, -1, -1);
    w.plusDam = 3;
    assert.equal(itemPower(w, {}), "피해 3d4", "모르는 무기의 손질이 샜다");
    const a = makeItem("armor", "plate mail", 7, -1, -1);
    a.plusArmor = 3;
    assert.equal(itemPower(a, {}), "방어도 17", "모르는 갑옷의 손질이 샜다");
    assert.equal(itemPower(a, { "armor:plate mail": true }), "방어도 20");
});

test("배낭에 적는 숫자와 실제로 맞는 방어가 같다", () => {
    // 갈리면 화면은 방어 3 이라 적고 몸은 2 로 맞는다.
    const s = newGame(920);
    const armor = makeItem("armor", "plate mail", 930, -1, -1);
    armor.plusArmor = 2;
    armor.letter = "z";
    s.hero.pack.push(armor);
    s.hero.armorId = armor.id;
    s.known["armor:plate mail"] = true;
    assert.equal(itemPower(armor, s.known), `방어도 ${heroDefense(s.hero)}`);
});

test("던지면 하나씩 줄고, 남은 개수를 말한다", () => {
    const s = newGame(921);
    const darts = makeItem("weapon", "dart", 940, -1, -1, 10);
    darts.letter = "z";
    s.hero.pack.push(darts);

    const after = perform(s, { t: "throw", letter: "z", dx: 1, dy: 0 });
    assert.equal(packItem(after.hero, "z")!.count, 9, "던졌는데 개수가 그대로다");
    const line = after.messages.filter((m) => m.includes("다트")).pop()!;
    // 예전에는 「다트 10개을(를) 던졌다」가 떠서 열 개를 다 던진 것처럼 읽혔다.
    assert.ok(!line.includes("다트 10개"), `한 개를 던졌는데 열 개라고 적었다: ${line}`);
    assert.ok(line.includes("9개 남음"), `남은 개수를 안 적었다: ${line}`);
});

test("마지막 하나를 던지면 배낭에서 사라진다", () => {
    let s = newGame(922);
    const darts = makeItem("weapon", "dart", 941, -1, -1, 2);
    darts.letter = "z";
    s.hero.pack.push(darts);
    s = perform(s, { t: "throw", letter: "z", dx: 1, dy: 0 });
    assert.equal(packItem(s.hero, "z")!.count, 1);
    s = perform(s, { t: "throw", letter: "z", dx: 1, dy: 0 });
    assert.equal(packItem(s.hero, "z"), undefined, "다 던졌는데 배낭에 남았다");
});

test("한 자리에 던진 것은 겹쳐 쌓인다 — 사라지지 않는다", () => {
    let s = newGame(923);
    const darts = makeItem("weapon", "dart", 942, -1, -1, 6);
    darts.letter = "z";
    s.hero.pack.push(darts);
    for (let i = 0; i < 6; i++) s = perform(s, { t: "throw", letter: "z", dx: 1, dy: 0 });
    assert.equal(packItem(s.hero, "z"), undefined, "여섯 개를 다 안 던졌다");
    const onFloor = s.level.items
        .filter((i) => i.kind === "weapon" && i.type === "dart")
        .reduce((n, i) => n + i.count, 0);
    assert.equal(onFloor, 6, `던진 여섯 개 중 ${onFloor} 개만 바닥에 있다`);
});

test("착용하면 **그 물건의** 능력치를 말한다 — 내 능력치가 아니라", () => {
    // 한때 갑옷을 입으면 내 방어 **등급**(낮을수록 단단)을 적었다. 그건 (ㄱ) 물건이
    // 아니라 나의 값이고 (ㄴ) 화면의 「방어도」와 방향이 반대라, 좋은 갑옷을 입으면
    // 숫자가 내려가 보였다.
    const s = newGame(930);
    const sword = makeItem("weapon", "long sword", 950, -1, -1);
    sword.plusDam = 2;
    sword.letter = "p";
    const plate = makeItem("armor", "plate mail", 951, -1, -1);
    plate.plusArmor = 1;
    plate.letter = "q";
    const ring = makeItem("ring", "protection", 952, -1, -1);
    ring.plusRing = 2;
    ring.letter = "r";
    s.hero.pack.push(sword, plate, ring);

    const said = (cur: GameState, needle: string) =>
        cur.messages.filter((m) => m.includes(needle)).pop() ?? "";

    let cur = perform(s, { t: "wield", letter: "p" });
    assert.ok(said(cur, "쥐었다").includes("(피해 3d4+2)"), said(cur, "쥐었다"));

    cur = perform(cur, { t: "wear", letter: "q" });
    const worn = said(cur, "입었다");
    // **배낭 줄과 같은 숫자여야 한다.** 갈리면 한쪽만 고치는 날이 온다.
    assert.ok(worn.includes(`(${itemPower(plate, cur.known)})`), worn);
    assert.ok(worn.includes("방어도 18"), `판금+1 은 방어도 18 이어야 한다: ${worn}`);
    // 내 방어도가 아니라 **갑옷 몫**이다 — 보호 반지를 껴도 이 숫자는 안 바뀐다.
    assert.ok(!worn.includes("방어 2"), `옛 방어 등급을 적고 있다: ${worn}`);

    cur = perform(cur, { t: "putOn", letter: "r" });
    assert.ok(said(cur, "꼈다").includes("(방어도 +2)"), said(cur, "꼈다"));
});

test("정체 모르는 물건은 착용 메시지에도 속을 안 흘린다", () => {
    // 다만 쥐거나 입거나 끼면 **그 순간 정체를 알게 되므로**, 그 뒤의 숫자는 참값이다.
    const s = newGame(931);
    const w = makeItem("weapon", "two-handed sword", 953, -1, -1);
    w.plusDam = 3;
    w.letter = "p";
    s.hero.pack.push(w);
    assert.equal(itemPower(w, {}), "피해 4d4", "쥐기 전에는 손질을 모른다");

    const cur = perform(s, { t: "wield", letter: "p" });
    assert.ok(cur.known["weapon:two-handed sword"], "쥐었는데도 정체를 모른다");
    const line = cur.messages.filter((m) => m.includes("쥐었다")).pop()!;
    assert.ok(line.includes("(피해 4d4+3)"), line);
});
