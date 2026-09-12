// 저장 — **되읽은 판이 굴러가야 한다.**
//
// 이 파일이 있는 이유는 실제로 난 사고 하나다. 규칙에 함정을 더하면서 `level.traps` 가
// 생겼는데, **그 전에 저장된 판에는 그 칸이 없었다.** 화면은 멀쩡히 떴고 한 걸음 걷는
// 순간 `traps.find` 가 undefined 를 읽어 터졌다. 그리고 새로고침하면 같은 저장을 다시
// 읽어 또 터지므로, 그 사람에게 `/game` 은 **영영 안 열리는 주소**가 됐다.
//
// 그래서 여기서 지키는 것은 값 하나가 아니라 **성질**이다:
//
//   저장에서 칸을 아무거나 하나 빼도, 되읽은 결과는
//   ① `null`(새 판을 연다) 이거나 ② **끝까지 굴러가는 판**이어야 한다.
//   「불러와지긴 하는데 한 걸음 걸으면 터진다」는 셋째 경우가 있으면 안 된다.
//
// 값을 새로 더할 때 `storage.normalize` 를 안 고치면 여기서 걸린다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { type Command, newGame, perform, survey } from "@/lib/rogue/game";
import { packItem } from "@/lib/rogue/hero";
import { deserialize, serialize } from "@/lib/rogue/storage";
import { Rng } from "@/lib/rogue/rng";
import { ALL_DIRS, MAP_H, MAP_W, type GameState } from "@/lib/rogue/types";

/** 되읽은 판을 실제로 굴려 본다. 터지면 그대로 던진다. */
function play(s: GameState, turns = 120) {
    const rng = new Rng(99);
    let cur = s;
    for (let i = 0; i < turns && cur.phase === "playing"; i++) {
        survey(cur); // 화면이 매 그림마다 부르는 것
        const r = rng.rnd(100);
        const d = rng.pick(ALL_DIRS)!;
        const letter = rng.pick(cur.hero.pack)?.letter ?? "a";
        const cmd: Command =
            r < 70
                ? { t: "move", dx: d.dx, dy: d.dy }
                : r < 76
                  ? { t: "pickup" }
                  : r < 82
                    ? { t: "search" }
                    : r < 86
                      ? { t: "descend" }
                      : r < 90
                        ? { t: "quaff", letter }
                        : r < 94
                          ? { t: "wear", letter }
                          : r < 97
                            ? { t: "putOn", letter }
                            : { t: "throw", letter, dx: d.dx, dy: d.dy };
        cur = perform(cur, cmd);
    }
    return cur;
}

test("저장했다 되읽으면 같은 판이다 — 지도가 배열로 돌아온다", () => {
    const s = newGame(1234);
    const back = deserialize(serialize(s))!;
    assert.ok(back, "되읽지 못했다");
    // 이게 이 파일의 첫 번째 이유였다: JSON 은 Uint8Array 를 객체로 바꿔 놓는다.
    assert.ok(back.level.tiles instanceof Uint8Array);
    assert.ok(back.level.flags instanceof Uint8Array);
    assert.ok(back.level.roomAt instanceof Int8Array);
    assert.equal(back.level.tiles.length, MAP_W * MAP_H);
    assert.deepEqual(Array.from(back.level.tiles), Array.from(s.level.tiles));
    assert.deepEqual(back.hero, s.hero);
    assert.equal(back.level.monsters.length, s.level.monsters.length);
    // 몬스터의 표는 저장하지 않고 글자로 다시 찾는다.
    assert.equal(back.level.monsters[0]?.def.ch, s.level.monsters[0]?.def.ch);
});

test("옛 저장(함정·도감이 없던 때)도 굴러간다", () => {
    const s = newGame(4242);
    const old = JSON.parse(serialize(s));
    old.v = 1;
    // #816 시절의 저장에는 이 칸들이 아예 없었다.
    delete old.bestiary;
    delete old.level.traps;
    delete old.level.maze;
    delete old.hero.stuck;
    delete old.hero.detect;
    delete old.hero.leftRingId;
    delete old.hero.rightRingId;
    delete old.hero.maxStr;
    for (const m of old.level.monsters) {
        delete m.speed;
        delete m.cancelled;
    }

    const back = deserialize(JSON.stringify(old));
    assert.ok(back, "옛 저장을 버렸다 — 굴리던 판이 날아간다");
    assert.deepEqual(back!.level.traps, []);
    assert.deepEqual(back!.bestiary, {});
    assert.equal(back!.hero.stuck, 0);
    assert.equal(back!.hero.leftRingId, null);
    // 그리고 실제로 굴러가야 한다. 예전에는 여기서 터졌다.
    play(back!);
});

test("칸을 아무거나 하나 빼도 — 새 판을 열거나, 끝까지 굴러가거나", () => {
    const base = newGame(777);
    const topLevel = Object.keys(JSON.parse(serialize(base)));
    const levelKeys = Object.keys(JSON.parse(serialize(base)).level);
    const heroKeys = Object.keys(JSON.parse(serialize(base)).hero);

    const attempts: { where: string; drop: (o: Record<string, unknown>) => void }[] = [
        ...topLevel.map((k) => ({
            where: `state.${k}`,
            drop: (o: Record<string, unknown>) => delete o[k],
        })),
        ...levelKeys.map((k) => ({
            where: `level.${k}`,
            drop: (o: Record<string, unknown>) => delete (o.level as Record<string, unknown>)[k],
        })),
        ...heroKeys.map((k) => ({
            where: `hero.${k}`,
            drop: (o: Record<string, unknown>) => delete (o.hero as Record<string, unknown>)[k],
        })),
    ];

    for (const a of attempts) {
        const o = JSON.parse(serialize(newGame(777)));
        a.drop(o);
        let back: GameState | null = null;
        try {
            back = deserialize(JSON.stringify(o));
        } catch (e) {
            assert.fail(`${a.where} 를 뺐더니 되읽다가 터졌다: ${(e as Error).message}`);
        }
        if (!back) continue; // 새 판을 연다 — 그것도 맞는 답이다
        try {
            play(back, 60);
        } catch (e) {
            assert.fail(
                `${a.where} 가 없는 저장이 불러와졌는데 굴리다 터졌다 — ` +
                    `storage.normalize 에 그 칸을 채우는 줄이 빠졌다: ${(e as Error).message}`,
            );
        }
    }
});

test("깨진 저장은 버린다 — 여기서 던지면 게임이 아예 안 열린다", () => {
    for (const bad of [
        "",
        "{",
        "null",
        "[]",
        '"문자열"',
        "{}",
        '{"v":2}',
        '{"v":2,"hero":{}}',
        '{"v":2,"level":{},"hero":{}}',
        // 지도의 길이가 안 맞으면 채울 방법이 없다.
        '{"v":2,"level":{"tiles":[1,2,3],"flags":[],"roomAt":[]},"hero":{}}',
    ]) {
        assert.equal(deserialize(bad), null, `${bad} 를 판으로 받아들였다`);
    }
});

test("앞으로 나올 판은 못 읽는다 — 모르는 규칙 위에서 굴리지 않는다", () => {
    const o = JSON.parse(serialize(newGame(5)));
    o.v = 999;
    assert.equal(deserialize(JSON.stringify(o)), null);
});

test("기억의 길이가 어긋나면 통째로 새로 만든다 — 반쯤 맞는 기억은 없는 것만 못하다", () => {
    const o = JSON.parse(serialize(newGame(6)));
    o.level.flags = [1, 1, 1];
    o.level.roomAt = [];
    const back = deserialize(JSON.stringify(o))!;
    assert.ok(back);
    assert.equal(back.level.flags.length, MAP_W * MAP_H);
    assert.equal(back.level.roomAt.length, MAP_W * MAP_H);
    assert.ok(Array.from(back.level.roomAt).every((v) => v === -1));
    play(back, 60);
});

test("끝난 판은 끝난 채로 돌아온다", () => {
    const s = newGame(7);
    s.phase = "dead";
    s.epitaph = "굶어 죽었다.";
    const back = deserialize(serialize(s))!;
    assert.equal(back.phase, "dead");
    assert.equal(back.epitaph, "굶어 죽었다.");
});

test("이상한 phase 는 굴러가는 판으로 친다 — 멈춰 선 판보다 낫다", () => {
    const o = JSON.parse(serialize(newGame(8)));
    o.phase = "무엇이든";
    assert.equal(deserialize(JSON.stringify(o))!.phase, "playing");
});

test("지도 크기는 저장과 코드가 같아야 한다", () => {
    // 지도 크기를 바꾸면 옛 저장은 전부 못 읽는다. 그 사실을 여기에 박아 둔다.
    assert.equal(MAP_W * MAP_H, newGame(9).level.tiles.length);
    assert.equal(MAP_H, 22);
    assert.equal(MAP_W, 80);
});

test("지나온 층들도 저장했다 되읽으면 그대로다", () => {
    // 1 → 2 → 3 층까지 내려갔다가 되돌아온 판.
    let s = newGame(4321);
    for (let i = 0; i < 2; i++) {
        s.hero.x = s.level.stairs.x;
        s.hero.y = s.level.stairs.y;
        s = perform(s, { t: "descend" });
    }
    s = perform(s, { t: "ascend" });
    assert.equal(s.level.depth, 2);
    assert.deepEqual(Object.keys(s.levels).sort(), ["1", "3"]);

    const back = deserialize(serialize(s))!;
    assert.ok(back, "되읽지 못했다");
    assert.deepEqual(Object.keys(back.levels).sort(), ["1", "3"]);
    for (const d of [1, 3]) {
        const a = s.levels[d];
        const b = back.levels[d];
        // JSON 은 Uint8Array 를 객체로 바꿔 놓는다 — 층 하나하나가 다 그 함정을 지난다.
        assert.ok(b.tiles instanceof Uint8Array, `${d}층의 지도가 배열이 아니다`);
        assert.ok(b.flags instanceof Uint8Array);
        assert.ok(b.roomAt instanceof Int8Array);
        assert.deepEqual(Array.from(b.tiles), Array.from(a.tiles), `${d}층이 달라졌다`);
        assert.deepEqual(Array.from(b.flags), Array.from(a.flags), `${d}층의 기억이 달라졌다`);
        assert.equal(b.monsters.length, a.monsters.length);
        assert.equal(b.monsters[0]?.def.ch, a.monsters[0]?.def.ch, "몬스터 표를 못 찾았다");
    }
    play(back);
});

test("지나온 층 하나가 깨져도 판은 안 버린다 — 그 층의 기억만 잃는다", () => {
    let s = newGame(4322);
    s.hero.x = s.level.stairs.x;
    s.hero.y = s.level.stairs.y;
    s = perform(s, { t: "descend" });

    const o = JSON.parse(serialize(s));
    o.levels["1"].tiles = [1, 2, 3]; // 길이가 안 맞는다
    const back = deserialize(JSON.stringify(o));
    assert.ok(back, "층 하나가 깨졌다고 굴리던 판을 통째로 버렸다");
    assert.equal(back!.level.depth, 2, "딛고 선 층까지 잃었다");
    assert.equal(back!.levels[1], undefined, "반쯤 맞는 층을 받아들였다");
    play(back!);
});

test("딛고 선 층이 창고에도 있으면 창고 쪽을 버린다", () => {
    // 두 벌이 되면 어느 날 한쪽만 바뀐다.
    const s = newGame(4323);
    const o = JSON.parse(serialize(s));
    o.levels = { 1: JSON.parse(JSON.stringify(o.level)) };
    const back = deserialize(JSON.stringify(o))!;
    assert.equal(back.levels[1], undefined);
    play(back);
});

test("옛 저장(층이 하나뿐이던 때)도 굴러간다", () => {
    const s = newGame(4324);
    const o = JSON.parse(serialize(s));
    o.v = 2;
    delete o.levels; // v2 에는 이 칸이 없었다
    const back = deserialize(JSON.stringify(o));
    assert.ok(back, "옛 저장을 버렸다");
    assert.deepEqual(back!.levels, {});
    play(back!);
});

test("스물여섯 층을 다 들고도 저장이 브라우저에 들어간다", () => {
    // localStorage 는 대개 5MB 다. 층마다 지도가 1,760칸이라 넉넉한지 한 번 재 둔다.
    let s = newGame(4325);
    for (let i = 0; i < 25; i++) {
        // 재는 것은 크기다 — 도중에 죽거나 함정에 빠지면 못 잰다.
        s.hero.hp = s.hero.maxHp = 9999;
        s.hero.food = 9999;
        s.hero.x = s.level.stairs.x;
        s.hero.y = s.level.stairs.y;
        s = perform(s, { t: "descend" });
    }
    assert.equal(Object.keys(s.levels).length + 1, 26, `${Object.keys(s.levels).length + 1}층만 들었다`);
    const bytes = serialize(s).length;
    assert.ok(bytes < 3_000_000, `26층짜리 저장이 ${bytes} 바이트다 — 브라우저가 거부할 수 있다`);
});

test("자리 없는 물건이 든 저장은 **되읽을 때 고친다** — 안 고치면 영영 「undefined) 식량」", () => {
    // 규칙을 고쳐 새로 생기는 것을 막아도, **이미 그렇게 저장된 판은 안 낫는다.**
    // 화면은 배낭을 `${letter}) 이름` 으로 찍으므로 열 때마다 그 줄이 다시 뜬다.
    const s = newGame(1);
    const o = JSON.parse(serialize(s));
    for (const p of o.hero.pack) delete p.letter;

    const back = deserialize(JSON.stringify(o))!;
    assert.ok(back, "되읽지 못했다");
    for (const p of back.hero.pack) {
        assert.ok(p.letter, `${p.kind}:${p.type} 의 자리를 안 메웠다`);
    }
    // 자리가 겹치면 안 된다 — 겹치면 하나는 고를 수도 버릴 수도 없는 물건이 된다.
    const letters = back.hero.pack.map((p) => p.letter);
    assert.equal(new Set(letters).size, letters.length, `자리가 겹친다: ${letters.join(", ")}`);
    play(back);
});

test("자리가 겹친 저장도 고친다", () => {
    const s = newGame(2);
    const o = JSON.parse(serialize(s));
    for (const p of o.hero.pack) p.letter = "a"; // 셋 다 a
    const back = deserialize(JSON.stringify(o))!;
    const letters = back.hero.pack.map((p) => p.letter);
    assert.equal(new Set(letters).size, letters.length, `겹침이 안 고쳐졌다: ${letters.join(", ")}`);
    // 이름으로 집을 수 있어야 한다.
    for (const p of back.hero.pack) {
        assert.equal(packItem(back.hero, p.letter!)!.id, p.id, `${p.letter} 로 집으니 딴 물건이 온다`);
    }
    play(back);
});

test("멀쩡한 자리는 건드리지 않는다", () => {
    const s = newGame(3);
    const before = s.hero.pack.map((p) => `${p.id}:${p.letter}`);
    const back = deserialize(serialize(s))!;
    assert.deepEqual(back.hero.pack.map((p) => `${p.id}:${p.letter}`), before);
});

test("이상한 자리(숫자·빈 글자·두 글자)도 고친다", () => {
    const s = newGame(4);
    const o = JSON.parse(serialize(s));
    o.hero.pack[0].letter = "";
    o.hero.pack[1].letter = "zz";
    if (o.hero.pack[2]) o.hero.pack[2].letter = 7;
    const back = deserialize(JSON.stringify(o))!;
    for (const p of back.hero.pack) {
        assert.ok(p.letter && /^[a-z]$/.test(p.letter), `이상한 자리가 남았다: ${JSON.stringify(p.letter)}`);
    }
    play(back);
});
