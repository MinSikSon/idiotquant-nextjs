import { test } from "node:test";
import assert from "node:assert/strict";

import {
    CHAMPION_DEFS,
    CHAMPION_PREFIXES,
    FLOOR_MUTATOR_DEFS,
    FLOOR_MUTATORS,
    applyChampion,
    dropChampionLoot,
    rollChampionPrefix,
    rollFloorMutator,
} from "../lib/rogue/champions";
import { Rng } from "../lib/rogue/rng";
import { heroAttack, monsterAttack } from "../lib/rogue/combat";
import { monsterName, spawnMonster } from "../lib/rogue/monsters";
import { newGame, perform } from "../lib/rogue/game";

test("5대 접두사 챔피언 및 4대 층 돌발 이벤트 정의 확인", () => {
    assert.equal(CHAMPION_PREFIXES.length, 5);
    for (const prefix of CHAMPION_PREFIXES) {
        const def = CHAMPION_DEFS[prefix];
        assert.ok(def, `${prefix} 정의가 누락되었습니다.`);
        assert.ok(def.name, `${prefix} 한글 접두사명이 없습니다.`);
        assert.ok(def.tag, `${prefix} 아이콘 태그가 없습니다.`);
        assert.ok(def.colorVar.startsWith("--rg-"), `${prefix} 테마 색상 변수가 올바르지 않습니다.`);
    }

    assert.equal(FLOOR_MUTATORS.length, 4);
    for (const mutator of FLOOR_MUTATORS) {
        const def = FLOOR_MUTATOR_DEFS[mutator];
        assert.ok(def, `${mutator} 정의가 누락되었습니다.`);
        assert.ok(def.banner, `${mutator} 배너 문구가 없습니다.`);
        assert.ok(def.tag, `${mutator} 태그가 없습니다.`);
    }
});

test("챔피언 몬스터 생성 및 스탯 보정 (체력 1.5배, 신속 속도+1, 표시 이름)", () => {
    const rng = new Rng(12345);
    const normal = spawnMonster("O", 5, 5, rng);
    assert.equal(normal.hp, 4);
    assert.equal(monsterName(normal), "오크");

    const champion = spawnMonster("O", 5, 5, rng, "blazing");
    assert.equal(champion.champion, "blazing");
    assert.equal(champion.hp, 6); // 4 * 1.5 = 6
    assert.equal(champion.maxHp, 6);
    assert.equal(champion.awake, true);
    assert.equal(monsterName(champion), "타오르는 오크");

    const swift = spawnMonster("T", 5, 5, rng, "swift");
    assert.equal(swift.speed, 1);
    assert.equal(monsterName(swift), "신속의 트롤");
});

test("챔피언 처치 시 100% 확정 고급 전리품 드랍", () => {
    const rng = new Rng(42);
    const state = newGame(42);
    const m = spawnMonster("O", 3, 3, rng, "gilded");

    const loot = dropChampionLoot(state, m, rng);
    assert.ok(loot.length >= 2, "황금 챔피언은 금화 + 확정 아이템을 드랍해야 합니다.");
    const hasGold = loot.some((i) => i.kind === "gold");
    assert.ok(hasGold, "황금 챔피언 드랍에 금화가 포함되어야 합니다.");

    const blazing = spawnMonster("T", 3, 3, rng, "blazing");
    const blazingLoot = dropChampionLoot(state, blazing, rng);
    assert.ok(blazingLoot.length >= 1, "챔피언은 최소 1개 이상의 고급 아이템을 100% 드랍해야 합니다.");
});

test("챔피언 특수 전투 효과: 흡혈(vampiric) 및 화염 반사(blazing)", () => {
    const rng = new Rng(999);
    const state = newGame(999);

    // 타오르는 챔피언 공격 시 영웅에게 화상 반사
    const blazing = spawnMonster("O", 1, 1, rng, "blazing");
    heroAttack(state, blazing, rng);
    assert.equal(state.hero.burnTurns, 3, "타오르는 챔피언 피격 시 영웅에게 3턴 화상이 걸려야 합니다.");

    // 흡혈 챔피언 공격 성공 시 몬스터 체력 회복
    const vampiric = spawnMonster("T", 1, 1, rng, "vampiric");
    vampiric.hp = 10;
    vampiric.maxHp = 40;
    const res = monsterAttack(state, vampiric, rng);
    if (res.hit && res.damage > 0) {
        assert.ok(vampiric.hp > 10, "흡혈 챔피언은 공격 성공 시 체력을 회복해야 합니다.");
    }
});
