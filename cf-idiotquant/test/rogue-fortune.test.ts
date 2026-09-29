import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { changeFortune, FORTUNE_MAX, FORTUNE_MIN, FORTUNE_TIMEOUT, FORTUNE_TIMEOUT_AMULET, rnl, tickFortune } from "@/lib/rogue/hero";
import { Rng } from "@/lib/rogue/rng";
import { deserialize, serialize } from "@/lib/rogue/storage";

test("새 판의 행운은 0 이고, 바꾸는 자리가 경계에서 자른다", () => {
    const hero = newGame(1).heroes[0];
    assert.equal(hero.fortune, 0);
    changeFortune(hero, 99);
    assert.equal(hero.fortune, FORTUNE_MAX);
    changeFortune(hero, -99);
    assert.equal(hero.fortune, FORTUNE_MIN);
});

test("행운은 주기마다 한 칸씩 0 으로 돌아오고, 증표를 들면 주기가 반이다", () => {
    const hero = newGame(2).heroes[0];
    hero.fortune = 3;
    tickFortune(hero, FORTUNE_TIMEOUT - 1);
    assert.equal(hero.fortune, 3);
    tickFortune(hero, FORTUNE_TIMEOUT);
    assert.equal(hero.fortune, 2);
    hero.fortune = -2;
    tickFortune(hero, FORTUNE_TIMEOUT_AMULET);
    assert.equal(hero.fortune, -2, "증표 없이 300 턴에 돌아왔다");
    hero.hasAmulet = true;
    tickFortune(hero, FORTUNE_TIMEOUT_AMULET);
    assert.equal(hero.fortune, -1);
});

test("판이 도는 턴에서 행운이 돌아온다", () => {
    const s = newGame(3);
    s.level.monsters = [];
    s.heroes[0].fortune = 5;
    s.turn = FORTUNE_TIMEOUT - 1;
    const after = perform(s, { t: "search" });
    assert.equal(after.heroes[0].fortune, 4);
});

test("행운 0 의 rnl 은 rng.rnd 와 같은 수를 같은 만큼 쓴다", () => {
    const hero = newGame(4).heroes[0];
    const a = new Rng(77);
    const b = new Rng(77);
    for (let i = 0; i < 200; i++) assert.equal(rnl(20, hero, a), b.rnd(20));
    assert.equal(a.state, b.state);
});

test("좋은 행운은 rnl 을 낮추고 나쁜 행운은 올린다", () => {
    const hero = newGame(5).heroes[0];
    const mean = (luck: number, x: number) => {
        hero.fortune = luck;
        const rng = new Rng(9);
        let sum = 0;
        for (let i = 0; i < 4000; i++) sum += rnl(x, hero, rng);
        return sum / 4000;
    };
    for (const x of [5, 20]) {
        assert.ok(mean(10, x) < mean(0, x), `x=${x} 좋은 행운`);
        assert.ok(mean(-10, x) > mean(0, x), `x=${x} 나쁜 행운`);
    }
    hero.fortune = 10;
    const rng = new Rng(1);
    for (let i = 0; i < 500; i++) {
        const v = rnl(3, hero, rng);
        assert.ok(v >= 0 && v < 3);
    }
});

test("저장은 행운을 되읽고, 옛 저장은 0 · 경계 밖은 자른다", () => {
    const s = newGame(6);
    s.heroes[0].fortune = -7;
    assert.equal(deserialize(serialize(s))!.heroes[0].fortune, -7);
    const raw = JSON.parse(serialize(s));
    delete raw.heroes[0].fortune;
    assert.equal(deserialize(JSON.stringify(raw))!.heroes[0].fortune, 0);
    raw.heroes[0].fortune = 40;
    assert.equal(deserialize(JSON.stringify(raw))!.heroes[0].fortune, FORTUNE_MAX);
});
