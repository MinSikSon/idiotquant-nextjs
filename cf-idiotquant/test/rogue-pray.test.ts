import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { PRAYER_TIMEOUT_START } from "@/lib/rogue/hero";
import { deserialize, serialize } from "@/lib/rogue/storage";
import type { GameState } from "@/lib/rogue/types";

/** 몬스터가 없는 판 — 기도 뒤 적의 차례가 체력을 건드리지 않게. */
function quiet(seed: number): GameState {
    const s = newGame(seed);
    s.level.monsters = [];
    return s;
}

const WRATH = /불쾌해하는|경험이 빠져나갔다|검은 빛/;

test("새 판은 기도 시간 제한 300 에서 시작하고, 턴마다 1 씩 준다", () => {
    const s = quiet(1);
    assert.equal(s.heroes[0].prayerTimeout, PRAYER_TIMEOUT_START);
    const after = perform(s, { t: "search" });
    assert.equal(after.heroes[0].prayerTimeout, PRAYER_TIMEOUT_START - 1);
});

test("체력이 바닥이고 제한이 200 이하면 신이 체력을 채운다", () => {
    const s = quiet(2);
    const hero = s.heroes[0];
    hero.hp = 2;
    hero.prayerTimeout = 200;
    const turn = s.turn;
    const after = perform(s, { t: "pray" });
    assert.equal(after.heroes[0].hp, after.heroes[0].maxHp);
    assert.equal(after.turn, turn + 1, "기도가 턴을 안 썼다");
    assert.ok(after.heroes[0].prayerTimeout > 0, "들어준 뒤 제한이 다시 서지 않았다");
});

test("큰 곤경이라도 제한이 200 을 넘으면 신이 노하고 고쳐 주지 않는다", () => {
    const s = quiet(3);
    s.heroes[0].hp = 2;
    s.heroes[0].prayerTimeout = 201;
    const after = perform(s, { t: "pray" });
    assert.ok(after.heroes[0].hp < after.heroes[0].maxHp);
    assert.ok(after.messages.some((m) => WRATH.test(m)), "노한 신의 줄이 없다");
});

test("허기(Weak)는 큰 곤경이다 — 배를 900 으로 채운다", () => {
    const s = quiet(4);
    s.heroes[0].food = 100;
    s.heroes[0].prayerTimeout = 150;
    const after = perform(s, { t: "pray" });
    assert.ok(after.heroes[0].food >= 890, `배가 안 찼다: ${after.heroes[0].food}`);
});

/** 쥔 무기를 저주하고 빈다 — 풀렸는가. */
function prayCursed(seed: number, timeout: number, luck: number): boolean {
    const s = quiet(seed);
    const hero = s.heroes[0];
    hero.pack.find((it) => it.id === hero.weaponId)!.cursed = true;
    hero.prayerTimeout = timeout;
    hero.luck = luck;
    const after = perform(s, { t: "pray" });
    return !after.heroes[0].pack.find((it) => it.id === hero.weaponId)!.cursed;
}

test("작은 곤경(쥔 것의 저주)은 행운이 있고 제한이 100 이하일 때만 풀린다", () => {
    const seeds = Array.from({ length: 40 }, (_, i) => i + 1);
    assert.ok(seeds.every((seed) => !prayCursed(seed, 100, 0)), "행운 0 인데 작은 곤경을 고쳤다(원작은 action 1~2)");
    assert.ok(seeds.some((seed) => prayCursed(seed, 100, 5)), "행운이 있는데 한 번도 안 풀렸다");
    assert.ok(seeds.every((seed) => !prayCursed(seed, 101, 10)), "제한 101 에서 풀렸다");
});

test("행운이 음수면 제한이 차 있어도 신이 노한다", () => {
    const s = quiet(11);
    s.heroes[0].hp = 2;
    s.heroes[0].prayerTimeout = 0;
    s.heroes[0].luck = -1;
    const after = perform(s, { t: "pray" });
    assert.ok(after.heroes[0].hp < after.heroes[0].maxHp);
    assert.ok(after.messages.some((m) => WRATH.test(m) || /나타났다|번개/.test(m)));
});

test("너무 이른 기도는 행운 −3 을 치른다", () => {
    const s = quiet(12);
    s.heroes[0].prayerTimeout = 999;
    const after = perform(s, { t: "pray" });
    assert.equal(after.heroes[0].luck, -3);
});

test("행운이 바닥이면 노한 신의 번개에 죽을 수 있다", () => {
    for (let seed = 1; seed <= 200; seed++) {
        const s = quiet(seed);
        s.heroes[0].prayerTimeout = 999;
        s.heroes[0].luck = -10;
        const after = perform(s, { t: "pray" });
        if (after.messages.some((m) => /번개/.test(m))) {
            assert.equal(after.phase, "dead");
            assert.match(after.epitaph ?? "", /번개/);
            return;
        }
    }
    assert.fail("행운 −10 에서 번개가 한 번도 안 났다");
});

test("곤경이 없으면 제한이 0 일 때만 흡족해하고, 그 전에 빌면 노한다", () => {
    const calm = quiet(6);
    calm.heroes[0].prayerTimeout = 0;
    const ok = perform(calm, { t: "pray" });
    assert.ok(ok.messages.some((m) => /흡족/.test(m)));

    const early = quiet(6);
    early.heroes[0].prayerTimeout = 1;
    const angry = perform(early, { t: "pray" });
    assert.ok(angry.messages.some((m) => WRATH.test(m)));
});

test("노한 신의 세 갈래가 모두 난다", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60 && seen.size < 3; seed++) {
        const s = quiet(seed);
        s.heroes[0].prayerTimeout = 999;
        const after = perform(s, { t: "pray" });
        const line = after.messages.find((m) => WRATH.test(m));
        if (line) seen.add(line.match(WRATH)![0]);
    }
    assert.equal(seen.size, 3, [...seen].join(", "));
});

test("노한 신의 경험 앗기는 레벨을 안 내린다", () => {
    for (let seed = 1; seed <= 60; seed++) {
        const s = quiet(seed);
        const hero = s.heroes[0];
        hero.exp = 1000;
        hero.level = 5;
        hero.prayerTimeout = 999;
        const after = perform(s, { t: "pray" });
        assert.equal(after.heroes[0].level, 5);
        if (after.messages.some((m) => /경험이 빠져나갔다/.test(m))) {
            assert.ok(after.heroes[0].exp < 1000);
            return;
        }
    }
    assert.fail("경험 앗기가 한 번도 안 났다");
});

test("협동에서는 빈 사람만 고친다", () => {
    const s = quiet(8);
    s.heroes.push(structuredClone(s.heroes[0]));
    for (const h of s.heroes) {
        h.hp = 2;
        h.prayerTimeout = 100;
    }
    const after = perform(s, { t: "pray", who: 1 });
    assert.equal(after.heroes[1].hp, after.heroes[1].maxHp);
    assert.ok(after.heroes[0].hp < after.heroes[0].maxHp);
});

test("저장은 제한을 그대로 되읽고, 옛 저장(칸 없음)은 300 으로 채운다", () => {
    const s = quiet(9);
    s.heroes[0].prayerTimeout = 42;
    assert.equal(deserialize(serialize(s))!.heroes[0].prayerTimeout, 42);

    const old = JSON.parse(serialize(s));
    for (const h of old.heroes ?? []) delete h.prayerTimeout;
    if (old.hero) delete old.hero.prayerTimeout;
    assert.equal(deserialize(JSON.stringify(old))!.heroes[0].prayerTimeout, PRAYER_TIMEOUT_START);
});
