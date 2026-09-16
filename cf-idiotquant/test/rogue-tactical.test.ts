// 신규 전술 지팡이 3종 & 재련 주문서 1종 유닛 테스트
//
// 1. wand:digging (굴착) - 최대 4칸 벽 관통 파괴 & 2d6 파편 피해
// 2. wand:swapping (위치 교환) - 괴물과 영웅 좌표 교체
// 3. wand:gust (돌풍) - 3칸 넉백 및 충돌 시 3d4 피해 + 둔화
// 4. scroll:transmutation (재련) - 무기/갑옷/반지 재연성 및 25% 보너스

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform, scrollTargetKinds } from "@/lib/rogue/game";
import { ARMORS, RINGS, SCROLLS, WANDS, WEAPONS, makeItem } from "@/lib/rogue/items";
import { spawnMonster } from "@/lib/rogue/monsters";
import { Rng } from "@/lib/rogue/rng";
import { idx, MAP_H, MAP_W, T } from "@/lib/rogue/types";

test("굴착의 지팡이 (digging): 최대 4칸 벽을 부수고 파편 피해를 준다", () => {
    const s = newGame(301);
    const { hero, level } = s;

    // 영웅 앞 1~3칸을 벽으로, 2칸 위치에 몬스터 배치
    const x1 = hero.x + 1;
    const x2 = hero.x + 2;
    const x3 = hero.x + 3;
    const y = hero.y;

    level.tiles[idx(x1, y)] = T.WALL_H;
    level.tiles[idx(x2, y)] = T.WALL_V;
    level.tiles[idx(x3, y)] = T.ROCK;

    const m = spawnMonster("B", x2, y, new Rng(1));
    m.hp = 20;
    level.monsters = [m];

    const wand = makeItem("wand", "digging", 991, -1, -1);
    wand.charges = 3;
    wand.letter = "z";
    hero.pack.push(wand);

    const after = perform(s, { t: "zap", letter: "z", dx: 1, dy: 0 });

    // 벽이 복도(T.CORRIDOR)로 파괴되었는지 검증
    assert.equal(after.level.tiles[idx(x1, y)], T.CORRIDOR);
    assert.equal(after.level.tiles[idx(x2, y)], T.CORRIDOR);
    assert.equal(after.level.tiles[idx(x3, y)], T.CORRIDOR);

    // 몬스터가 2d6 파편 피해를 입었는지 검증
    assert.ok(m.hp < 20, "몬스터가 파편 피해를 입지 않음");
    assert.ok(after.known["wand:digging"]);
    assert.equal(after.itemUsage["wand:digging"], 1);
});

test("굴착의 지팡이 (digging): 던전 외곽 둘레 벽(경계벽)은 파괴하지 않는다", () => {
    const s = newGame(302);
    const { hero, level } = s;

    // 영웅을 서쪽 끝(x=1)에 배치하고 서쪽(dx=-1)으로 굴착
    hero.x = 1;
    hero.y = 10;
    level.tiles[idx(0, 10)] = T.WALL_V;

    const wand = makeItem("wand", "digging", 992, -1, -1);
    wand.charges = 3;
    wand.letter = "z";
    hero.pack.push(wand);

    const after = perform(s, { t: "zap", letter: "z", dx: -1, dy: 0 });
    // 던전 0번 열 벽은 보존되어야 함
    assert.equal(after.level.tiles[idx(0, 10)], T.WALL_V);
});

test("위치 교환의 지팡이 (swapping): 영웅과 몬스터의 위치를 맞바꾼다", () => {
    const s = newGame(303);
    const { hero, level } = s;

    const origHx = hero.x;
    const origHy = hero.y;

    const mx = hero.x + 3;
    const my = hero.y;
    level.tiles[idx(hero.x + 1, hero.y)] = T.FLOOR;
    level.tiles[idx(hero.x + 2, hero.y)] = T.FLOOR;
    level.tiles[idx(mx, my)] = T.FLOOR;

    const m = spawnMonster("O", mx, my, new Rng(1));
    m.frozenTurns = 1; // 턴 종료 후 AI 추격 이동 방지
    level.monsters = [m];

    const wand = makeItem("wand", "swapping", 993, -1, -1);
    wand.charges = 4;
    wand.letter = "z";
    hero.pack.push(wand);

    const after = perform(s, { t: "zap", letter: "z", dx: 1, dy: 0 });

    // 영웅과 몬스터의 좌표가 서로 바뀌었는지 검증
    assert.equal(after.hero.x, mx);
    assert.equal(after.hero.y, my);
    assert.equal(m.x, origHx);
    assert.equal(m.y, origHy);
    assert.equal(m.awake, true);
    assert.ok(after.known["wand:swapping"]);
    assert.equal(after.itemUsage["wand:swapping"], 1);
});

test("돌풍의 지팡이 (gust): 3칸 넉백 및 벽 충돌 시 3d4 피해와 기절을 준다", () => {
    // 1. 탁 트인 공간에서 3칸 넉백
    {
        const s = newGame(304);
        const { hero, level } = s;

        const mx = hero.x + 1;
        const my = hero.y;
        for (let x = hero.x + 1; x <= hero.x + 5; x++) {
            level.tiles[idx(x, my)] = T.FLOOR;
        }

        const m = spawnMonster("E", mx, my, new Rng(1));
        m.hp = 30;
        m.frozenTurns = 1; // 턴 종료 후 역방향 걸음 방지
        level.monsters = [m];

        const wand = makeItem("wand", "gust", 994, -1, -1);
        wand.charges = 5;
        wand.letter = "z";
        hero.pack.push(wand);

        const after = perform(s, { t: "zap", letter: "z", dx: 1, dy: 0 });
        // 3칸 밀려나서 mx + 3 = hero.x + 4 위치여야 함
        assert.equal(m.x, mx + 3);
        assert.equal(m.hp, 30); // 충돌 없으므로 충돌 피해 없음
    }

    // 2. 몬스터 바로 뒤가 벽인 경우 벽 충돌 피해 (3d4) 및 기절(speed = -1)
    {
        const s = newGame(305);
        const { hero, level } = s;

        const mx = hero.x + 1;
        const my = hero.y;
        level.tiles[idx(mx, my)] = T.FLOOR;
        level.tiles[idx(mx + 1, my)] = T.WALL_V; // 바로 뒤가 벽

        const m = spawnMonster("K", mx, my, new Rng(1));
        m.hp = 30;
        level.monsters = [m];

        const wand = makeItem("wand", "gust", 995, -1, -1);
        wand.charges = 5;
        wand.letter = "z";
        hero.pack.push(wand);

        const after = perform(s, { t: "zap", letter: "z", dx: 1, dy: 0 });
        // 위치는 mx 그대로
        assert.equal(m.x, mx);
        // 충돌 피해를 입고 둔화/기절 상태가 됨
        assert.ok(m.hp < 30);
        assert.equal(m.speed, -1);
        assert.ok(after.known["wand:gust"]);
    }
});

test("재련의 주문서 (transmutation): 무기, 갑옷, 반지를 같은 분류의 다른 장비로 재련한다", () => {
    // 1. scrollTargetKinds 검증
    {
        const s = newGame(306);
        const scr = makeItem("scroll", "transmutation", 996, -1, -1);
        scr.letter = "s";
        s.hero.pack.push(scr);

        const kinds = scrollTargetKinds(s, "s");
        assert.deepEqual(kinds, ["weapon", "armor", "ring"]);
    }

    // 2. 무기 재련 검증 (단검 -> 다른 무기)
    {
        const s = newGame(307);
        const scr = makeItem("scroll", "transmutation", 997, -1, -1);
        scr.letter = "s";
        const wep = makeItem("weapon", "dagger", 998, -1, -1);
        wep.letter = "w";
        wep.plusHit = 2;
        wep.plusDam = 2;
        s.hero.pack.push(scr, wep);

        const after = perform(s, { t: "read", letter: "s", target: "w" });
        const transmuted = after.hero.pack.find((p) => p.id === wep.id)!;
        assert.ok(transmuted);
        assert.equal(transmuted.kind, "weapon");
        assert.notEqual(transmuted.type, "dagger");
        assert.ok(WEAPONS[transmuted.type], "유효한 무기 타입이어야 함");
        assert.ok(after.known[`weapon:${transmuted.type}`]);
        assert.ok(after.known["scroll:transmutation"]);
        assert.equal(after.itemUsage["scroll:transmutation"], 1);
    }

    // 3. 갑옷 재련 검증 (가죽 갑옷 -> 다른 갑옷)
    {
        const s = newGame(308);
        const scr = makeItem("scroll", "transmutation", 999, -1, -1);
        scr.letter = "s";
        const arm = makeItem("armor", "leather", 1000, -1, -1);
        arm.letter = "u";
        s.hero.pack.push(scr, arm);

        const after = perform(s, { t: "read", letter: "s", target: "u" });
        const transmuted = after.hero.pack.find((p) => p.id === arm.id)!;
        assert.ok(transmuted);
        assert.equal(transmuted.kind, "armor");
        assert.notEqual(transmuted.type, "leather");
        assert.ok(ARMORS[transmuted.type], "유효한 갑옷 타입이어야 함");
        assert.ok(after.known[`armor:${transmuted.type}`]);
    }

    // 4. 반지 재련 검증 (보호 반지 -> 다른 반지)
    {
        const s = newGame(309);
        const scr = makeItem("scroll", "transmutation", 1001, -1, -1);
        scr.letter = "s";
        const ring = makeItem("ring", "protection", 1002, -1, -1);
        ring.letter = "r";
        s.hero.pack.push(scr, ring);

        const after = perform(s, { t: "read", letter: "s", target: "r" });
        const transmuted = after.hero.pack.find((p) => p.id === ring.id)!;
        assert.ok(transmuted);
        assert.equal(transmuted.kind, "ring");
        assert.notEqual(transmuted.type, "protection");
        assert.ok(RINGS[transmuted.type], "유효한 반지 타입이어야 함");
        assert.ok(after.known[`ring:${transmuted.type}`]);
    }
});
