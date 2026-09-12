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
