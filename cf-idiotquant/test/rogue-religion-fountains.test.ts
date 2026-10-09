import assert from "node:assert/strict";
import { test } from "node:test";
import { glyphAt, newGame, perform } from "@/lib/rogue/game";
import { MAP_W, T } from "@/lib/rogue/types";

test("지도에서 분수와 웅덩이는 원작 글리프로 구별된다", () => {
    const state = newGame(891);
    const fountain = { x: 3, y: 3, magic: false, magicUsed: false, drinks: 0 };
    state.level.fountains = [fountain];
    state.level.tiles[3 + 3 * MAP_W] = T.FLOOR;
    state.level.tiles[4 + 3 * MAP_W] = T.POOL;
    state.level.flags[3 + 3 * MAP_W] = 3;
    state.level.flags[4 + 3 * MAP_W] = 3;

    assert.equal(glyphAt(state, 3, 3)?.ch, "{", "분수는 { 로 표시한다");
    assert.equal(glyphAt(state, 4, 3)?.ch, "}", "웅덩이는 } 로 표시한다");
});

test("문제가 가벼우면 낮은 행운의 기도는 응답을 받지 못할 수 있다", () => {
    const state = newGame(892);
    const hero = state.heroes[0];
    hero.prayerTimeout = 0;
    hero.luck = 0;
    hero.hp -= 1;
    hero.blind = 5;

    const after = perform(state, { t: "pray" });

    assert.ok(after.heroes[0].hp < after.heroes[0].maxHp, "낮은 호의에서는 가벼운 부상이 남을 수 있다");
    assert.ok(after.heroes[0].blind > 0, "도움을 받지 못하면 실명 상태도 남는다");
});

test("큰 위기에서 받아들여진 기도는 최악의 문제부터 해결한다", () => {
    const state = newGame(893);
    const hero = state.heroes[0];
    hero.prayerTimeout = 0;
    hero.luck = 0;
    hero.hp = 1;
    hero.blind = 5;

    const after = perform(state, { t: "pray" });

    assert.equal(after.heroes[0].hp, after.heroes[0].maxHp, "치명적인 부상은 우선 치료한다");
    assert.ok(after.heroes[0].blind > 0, "추가 호의가 없으면 사소한 문제는 남는다");
});
