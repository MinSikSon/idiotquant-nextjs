// 판이 도는가 — **명령 하나가 턴 하나다.**
//
// 제일 값어치 있는 것은 마지막의 「막 굴려도 안 터진다」이다. 로그라이크는 경우의 수가
// 손으로 셀 수 있는 크기를 넘어서므로, 규칙을 하나 고칠 때마다 사람이 다 돌아볼 수가
// 없다. 수천 턴을 막 굴려 보는 것이 그 자리를 대신한다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { type Command, newGame, perform, score } from "@/lib/rogue/game";
import { hungerOf, packItem } from "@/lib/rogue/hero";
import { ALL_DIRS, T, type GameState, type Tile, idx, walkable } from "@/lib/rogue/types";
import { makeItem } from "@/lib/rogue/items";
import { Rng } from "@/lib/rogue/rng";

test("새 판은 걸어 들어갈 수 있는 칸에서 시작한다", () => {
    for (let seed = 1; seed <= 40; seed++) {
        const s = newGame(seed);
        const { hero, level } = s;
        assert.ok(walkable(level.tiles[idx(hero.x, hero.y)] as Tile), `시드 ${seed}: 벽에서 시작했다`);
        assert.equal(level.depth, 1);
        assert.equal(s.phase, "playing");
        assert.ok(hero.hp > 0 && hero.hp === hero.maxHp);
        // 처음에는 철퇴·갑옷·식량 셋을 들고 있다.
        assert.equal(hero.pack.length, 3);
        assert.ok(hero.weaponId !== null && hero.armorId !== null);
    }
});

test("벽을 들이받으면 턴이 안 간다 — 배고픔 시계가 거짓말하면 안 된다", () => {
    const s0 = newGame(3);
    // 벽으로 둘러싸인 방향을 찾는다.
    const { hero, level } = s0;
    const blocked = ALL_DIRS.find(
        (d) => !walkable(level.tiles[idx(hero.x + d.dx, hero.y + d.dy)] as Tile),
    );
    assert.ok(blocked, "사방이 뚫린 자리에서 시작해 이 테스트를 못 한다");
    const before = { turn: s0.turn, food: s0.hero.food };
    const s1 = perform(s0, { t: "move", dx: blocked!.dx, dy: blocked!.dy });
    assert.equal(s1.turn, before.turn, "벽에 부딪혔는데 턴이 갔다");
    assert.equal(s1.hero.food, before.food, "벽에 부딪혔는데 배가 고파졌다");
});

test("한 걸음에 배고픔이 1 준다", () => {
    let s = newGame(11);
    const start = s.hero.food;
    let moved = 0;
    for (let i = 0; i < 60 && moved < 20; i++) {
        const before = s.turn;
        s = perform(s, { t: "rest" });
        if (s.turn > before) moved++;
    }
    assert.equal(moved, 20);
    assert.equal(s.hero.food, start - 20);
});

test("배고픔의 단계는 문턱에서만 바뀐다", () => {
    const s = newGame(1);
    s.hero.food = 1000;
    assert.equal(hungerOf(s.hero), "");
    s.hero.food = 300;
    assert.equal(hungerOf(s.hero), "시장함");
    s.hero.food = 150;
    assert.equal(hungerOf(s.hero), "허기짐");
    s.hero.food = 20;
    assert.equal(hungerOf(s.hero), "탈진");
});

test("증표 없이는 **나갈** 수 없다 — 이기는 길은 1층의 그 한 칸이다", () => {
    const s0 = newGame(5);
    const up = s0.level.upStairs!;
    s0.hero.x = up.x;
    s0.hero.y = up.y;
    const s1 = perform(s0, { t: "ascend" });
    assert.equal(s1.phase, "playing");
    assert.equal(s1.level.depth, 1, "증표 없이 1층에서 나갔다");
    assert.ok(s1.messages.some((m) => m.includes("증표 없이")), s1.messages.slice(-3).join(" / "));

    // 증표를 쥐면 1층의 올라가는 계단이 곧 승리다.
    s1.hero.hasAmulet = true;
    const s2 = perform(s1, { t: "ascend" });
    assert.equal(s2.phase, "won");
    assert.ok(score(s2) >= 10000, "증표는 점수에 크게 얹힌다");
});

/** 내려가는 계단 위로 옮겨 서서 한 층 내려간다 — 걸어가는 것은 이 테스트의 관심이 아니다. */
function godown(s: GameState): GameState {
    s.hero.x = s.level.stairs.x;
    s.hero.y = s.level.stairs.y;
    return perform(s, { t: "descend" });
}

test("아래층에서는 증표 없이도 물러설 수 있다 — 도망이 선택지에 있어야 한다", () => {
    let s = godown(godown(newGame(55)));
    assert.equal(s.level.depth, 3);
    assert.equal(s.deepest, 3);

    // 내려오면 올라가는 계단 위에 선다. 증표는 없다.
    assert.equal(s.hero.hasAmulet, false);
    s = perform(s, { t: "ascend" });
    assert.equal(s.level.depth, 2, "증표가 없다고 아래층에서까지 막혔다");
    // 물러서도 점수는 안 깎인다 — 깊이는 **가 본 가장 깊은 곳**으로 잰다.
    assert.equal(s.deepest, 3);
});

test("되돌아간 층은 **떠난 그대로**다 — 지도도, 밝혀 둔 기억도", () => {
    let s = godown(newGame(56)); // 2층
    const tiles = Array.from(s.level.tiles);
    // 조금 걸어 다니며 지도를 밝힌다.
    for (let i = 0; i < 30; i++) s = perform(s, { t: "move", dx: i % 2 ? 1 : 0, dy: i % 2 ? 0 : 1 });
    const lit = Array.from(s.level.flags).filter((f) => f > 0).length;
    assert.ok(lit > 0, "걸었는데 아무것도 안 밝혀졌다");

    s = godown(s); // 3층
    s = perform(s, { t: "ascend" }); // 다시 2층
    assert.equal(s.level.depth, 2);
    assert.deepEqual(Array.from(s.level.tiles), tiles, "같은 층이 안 돌아왔다");
    assert.ok(
        Array.from(s.level.flags).filter((f) => f > 0).length >= lit,
        "밝혀 둔 기억이 사라졌다",
    );
});

test("되돌아가도 몬스터와 물건이 불어나지 않는다", () => {
    let s = godown(newGame(57)); // 2층
    const items = s.level.items.length;
    const monsters = s.level.monsters.length;

    for (let i = 0; i < 3; i++) {
        s = godown(s); // 3층
        s = perform(s, { t: "ascend" }); // 2층
        assert.equal(s.level.depth, 2);
    }
    // 되돌아갈 때마다 또 뿌리면 여기서 늘어난다. (몬스터는 죽거나 따라와서 줄 수는 있다.)
    assert.ok(s.level.items.length <= items, `물건이 ${items} → ${s.level.items.length} 로 늘었다`);
    assert.ok(
        s.level.monsters.length <= monsters,
        `몬스터가 ${monsters} → ${s.level.monsters.length} 로 늘었다`,
    );
});

test("두고 온 물건은 그 자리에 있다", () => {
    let s = godown(newGame(58)); // 2층
    const dagger = makeItem("weapon", "dagger", 970, -1, -1);
    dagger.letter = "z";
    s.hero.pack.push(dagger);
    s = perform(s, { t: "drop", letter: "z" });
    const where = { x: s.hero.x, y: s.hero.y };
    assert.ok(s.level.items.some((i) => i.id === 970), "안 내려놓아졌다");

    s = godown(s);
    s = perform(s, { t: "ascend" });
    const back = s.level.items.find((i) => i.id === 970);
    assert.ok(back, "두고 온 단검이 사라졌다");
    assert.deepEqual({ x: back!.x, y: back!.y }, where, "단검이 딴 자리로 갔다");
});

test("지금 딛고 선 층은 창고에 없다 — 두 벌이 되면 한쪽만 바뀐다", () => {
    let s = newGame(59);
    assert.deepEqual(s.levels, {});
    s = godown(s);
    assert.equal(s.level.depth, 2);
    assert.ok(s.levels[1], "떠난 1층이 창고에 없다");
    assert.equal(s.levels[2], undefined, "딛고 선 층이 창고에도 있다");
    s = perform(s, { t: "ascend" });
    assert.equal(s.levels[1], undefined, "돌아온 층이 창고에 남았다");
    assert.ok(s.levels[2], "떠난 2층이 창고에 없다");
});

test("계단 위에서만 내려간다", () => {
    const s0 = newGame(8);
    const notStairs = perform(s0, { t: "descend" });
    assert.equal(notStairs.level.depth, 1);
    assert.ok(notStairs.messages.some((m) => m.includes("계단이 없다")));

    s0.hero.x = s0.level.stairs.x;
    s0.hero.y = s0.level.stairs.y;
    assert.equal(s0.level.tiles[idx(s0.hero.x, s0.hero.y)], T.STAIRS);
    const s1 = perform(s0, { t: "descend" });
    assert.equal(s1.level.depth, 2);
    assert.equal(s1.deepest, 2);
    // 내려가면 올라가는 계단 위에 선다 — 온 길이 발밑에 있다.
    assert.deepEqual({ x: s1.hero.x, y: s1.hero.y }, s1.level.upStairs);
});

test("물약은 마셔야 정체를 안다 — 그 전에는 겉모습으로 불린다", () => {
    const s0 = newGame(21);
    const potion = makeItem("potion", "healing", 900, -1, -1);
    potion.letter = "z";
    s0.hero.pack.push(potion);
    s0.hero.hp = 1;

    assert.ok(!s0.known["potion:healing"], "처음부터 알면 수집이 없다");
    const s1 = perform(s0, { t: "quaff", letter: "z" });
    assert.ok(s1.known["potion:healing"], "마셨는데도 모른다");
    assert.ok(s1.hero.hp > 1, "회복 물약인데 안 나았다");
    assert.equal(packItem(s1.hero, "z"), undefined, "마신 물약이 배낭에 남았다");
});

test("겉모습은 판마다 섞인다 — 지난 판의 파란 물약은 다음 판의 것이 아니다", () => {
    const looks = new Set<string>();
    for (let seed = 1; seed <= 30; seed++) {
        looks.add(newGame(seed).appearance["potion:healing"]);
    }
    assert.ok(looks.size > 3, `회복 물약의 겉모습이 ${looks.size} 가지뿐이다`);
});

test("지도 주문서는 층을 통째로 기억에 넣는다", () => {
    const s0 = newGame(13);
    const scroll = makeItem("scroll", "magic mapping", 901, -1, -1);
    scroll.letter = "z";
    s0.hero.pack.push(scroll);
    const before = Array.from(s0.level.flags).filter((f) => f & 1).length;
    const s1 = perform(s0, { t: "read", letter: "z" });
    const after = Array.from(s1.level.flags).filter((f) => f & 1).length;
    assert.ok(after > before, `${before} → ${after}`);
});

test("죽으면 되돌아오지 않는다", () => {
    const s0 = newGame(17);
    s0.hero.hp = 1;
    s0.hero.food = -200; // 이 턴에 굶어 죽는다
    const s1 = perform(s0, { t: "rest" });
    assert.equal(s1.phase, "dead");
    assert.ok(s1.epitaph.length > 0);
    // 죽은 뒤에는 어떤 명령도 판을 안 바꾼다.
    const s2 = perform(s1, { t: "move", dx: 1, dy: 0 });
    assert.equal(s2.phase, "dead");
    assert.equal(s2.turn, s1.turn);
});

test("막 굴려도 안 터진다 — 스무 판 × 이천 턴", () => {
    for (let seed = 1; seed <= 20; seed++) {
        const rng = new Rng(seed * 7717);
        let s = newGame(seed);
        for (let i = 0; i < 2000 && s.phase === "playing"; i++) {
            const r = rng.rnd(100);
            let cmd: Command;
            if (r < 78) {
                const d = rng.pick(ALL_DIRS)!;
                cmd = { t: "move", dx: d.dx, dy: d.dy };
            } else if (r < 80) cmd = { t: "pickup" };
            else if (r < 83) cmd = { t: "descend" };
            else if (r < 84) cmd = { t: "ascend" };
            else if (r < 87) cmd = { t: "search" };
            else {
                const it = rng.pick(s.hero.pack);
                const letter = it?.letter ?? "a";
                const d = rng.pick(ALL_DIRS)!;
                cmd =
                    r < 89
                        ? { t: "quaff", letter }
                        : r < 91
                          ? { t: "read", letter }
                          : r < 92
                            ? { t: "eat", letter }
                            : r < 93
                              ? { t: "wield", letter }
                              : r < 94
                                ? { t: "wear", letter }
                                : r < 95
                                  ? { t: "putOn", letter }
                                  : r < 96
                                    ? { t: "removeRing", letter }
                                    : r < 97
                                      ? { t: "drop", letter }
                                      : r < 98
                                        ? { t: "zap", letter, dx: d.dx, dy: d.dy }
                                        : { t: "throw", letter, dx: d.dx, dy: d.dy };
            }
            s = perform(s, cmd);

            // 어떤 턴에도 깨지면 안 되는 것들.
            assert.ok(
                walkable(s.level.tiles[idx(s.hero.x, s.hero.y)] as Tile),
                `시드 ${seed} 턴 ${i}: 벽 속에 서 있다`,
            );
            assert.ok(s.hero.hp <= s.hero.maxHp, "체력이 최대를 넘었다");
            assert.ok(s.level.depth >= 1, "0층으로 내려갔다");
            assert.ok(
                s.level.monsters.every((m) => m.hp > 0),
                "죽은 몬스터가 판에 남았다",
            );
            assert.ok(
                new Set(s.hero.pack.map((p) => p.letter)).size === s.hero.pack.length,
                "배낭에 같은 자리가 둘이다",
            );
            // 몸에 걸친 것은 반드시 배낭 안에 있다 — 밖에 있으면 화면이 유령을 그린다.
            for (const id of [s.hero.weaponId, s.hero.armorId, s.hero.leftRingId, s.hero.rightRingId]) {
                if (id === null) continue;
                assert.ok(s.hero.pack.some((p) => p.id === id), `걸친 물건 ${id} 가 배낭에 없다`);
            }
            assert.ok(
                s.hero.leftRingId === null || s.hero.leftRingId !== s.hero.rightRingId,
                "같은 반지를 양손에 꼈다",
            );
            assert.ok(
                s.level.items.every((it) => it.x >= 0 && it.y >= 0),
                "바닥의 물건이 좌표를 잃었다",
            );
        }
    }
});
