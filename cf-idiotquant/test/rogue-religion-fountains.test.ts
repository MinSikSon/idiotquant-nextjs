import assert from "node:assert/strict";
import { test } from "node:test";
import { glyphAt, newGame, perform } from "@/lib/rogue/game";
import { MAP_W, T, idx } from "@/lib/rogue/types";

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

test("웅덩이에 들어가면 첨벙 소리와 담그기 안내가 나온다", () => {
    const state = newGame(894);
    const hero = state.heroes[0];
    hero.x = 20;
    hero.y = 10;
    state.level.tiles[idx(hero.x, hero.y)] = T.FLOOR;
    state.level.tiles[idx(hero.x + 1, hero.y)] = T.POOL;
    state.level.monsters = state.level.monsters.filter((m) => m.x !== hero.x + 1 || m.y !== hero.y);
    state.level.items = state.level.items.filter((it) => it.x !== hero.x + 1 || it.y !== hero.y);
    state.messages = [];

    const after = perform(state, { t: "move", dx: 1, dy: 0 });

    assert.equal(after.heroes[0].x, 21, "웅덩이는 걸어서 건널 수 있다");
    assert.ok(after.messages.some((line) => line.includes("물웅덩이를 첨벙 지나간다") && line.includes("담글 수 있다")), "웅덩이에 들어갔다는 안내가 없다");
});

test("분수 물줄기가 솟으면 분수가 넘쳤다고 알린다", () => {
    const state = newGame(51);
    const hero = state.heroes[0];
    state.level.fountains = [{ x: hero.x, y: hero.y, magic: false, magicUsed: false, drinks: 0 }];
    state.level.fountain = null;
    // 분수 사건은 상태 초기 난수와 별개로 직접 고정한다 — 시드로 전체 층을 만들면
    // 지형 생성이 바뀔 때 이 테스트가 넘침 사건 대신 다른 사건을 시험하게 된다.
    state.rngState = 43; // 첫 굴림의 분수 사건표가 30이다.

    const after = perform(state, { t: "fountain" });

    assert.ok(after.messages.some((line) => line.includes("분수가 넘쳐")), "넘침 사건이 발생했는데 안내하지 않았다");
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

test("분수 위에서 큰 호의로 치명상을 기도하면 멈추지 않고 회복한다", () => {
    const state = newGame(895);
    const hero = state.heroes[0];
    hero.prayerTimeout = 0;
    hero.luck = 13;
    hero.hp = 1;
    state.level.fountains = [{ x: hero.x, y: hero.y, magic: false, magicUsed: false, drinks: 0 }];
    state.level.fountain = null;
    state.level.monsters = [];

    const after = perform(state, { t: "pray" });

    assert.equal(after.heroes[0].hp, after.heroes[0].maxHp, "치명상 기도는 체력을 회복한다");
    assert.equal(after.turn, 1, "기도가 끝나면 턴도 정상적으로 처리한다");
});
