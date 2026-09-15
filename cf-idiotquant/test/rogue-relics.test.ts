import { test } from "node:test";
import assert from "node:assert/strict";

import {
    GEM_DEFS,
    GEMS,
    RELIC_DEFS,
    RELICS,
    hasRelic,
    midasBonus,
    socketGemIntoItem,
} from "../lib/rogue/relics";
import { addToPack, equippedArmor, equippedWeapon, heroDodgeBonus } from "../lib/rogue/hero";
import { armorClassOf, makeItem } from "../lib/rogue/items";
import { newGame, perform } from "../lib/rogue/game";
import { heroAttack } from "../lib/rogue/combat";
import { spawnMonster } from "../lib/rogue/monsters";
import { Rng } from "../lib/rogue/rng";

test("4대 전설 유물 및 4대 원소 보석 정의 확인", () => {
    assert.equal(RELICS.length, 4);
    for (const relic of RELICS) {
        const def = RELIC_DEFS[relic];
        assert.ok(def, `${relic} 유물 정의가 누락되었습니다.`);
        assert.ok(def.name, `${relic} 이름이 없습니다.`);
        assert.ok(def.description, `${relic} 설명이 없습니다.`);
    }

    assert.equal(GEMS.length, 4);
    for (const gem of GEMS) {
        const def = GEM_DEFS[gem];
        assert.ok(def, `${gem} 보석 정의가 누락되었습니다.`);
        assert.ok(def.slot === "weapon" || def.slot === "armor", `${gem} 슬롯이 올바르지 않습니다.`);
    }
});

test("미다스의 건틀릿 (Midas Gauntlet) 금화 비례 공격력 보너스", () => {
    let state = newGame(123);
    assert.equal(midasBonus(state.hero), 0);

    const gauntlet = makeItem("relic", "midas_gauntlet", state.nextItemId++, 0, 0);
    addToPack(state.hero, gauntlet);
    assert.ok(hasRelic(state.hero, "midas_gauntlet"));

    state.hero.gold = 350;
    assert.equal(midasBonus(state.hero), 3); // 350 / 100 = 3

    state.hero.gold = 1500;
    assert.equal(midasBonus(state.hero), 10); // 최대 상한 10
});

test("불사조의 깃털 (Phoenix Feather) 치명상 시 1회 완전 부활", () => {
    let state = newGame(123);
    const feather = makeItem("relic", "phoenix_feather", state.nextItemId++, 0, 0);
    addToPack(state.hero, feather);
    assert.ok(hasRelic(state.hero, "phoenix_feather"));

    state.hero.hp = 1;
    // 치명타 피해로 사망 시도
    state.hero.hp = 0;
    state = perform(state, { t: "rest" });

    // 부활 동작 검증
    assert.equal(state.phase, "playing", "불사조의 깃털로 인해 게임 오버가 되지 않아야 합니다.");
    assert.equal(state.hero.hp, state.hero.maxHp, "체력이 최대치로 회복되어야 합니다.");
    assert.ok(!hasRelic(state.hero, "phoenix_feather"), "사용한 불사조의 깃털은 소멸해야 합니다.");
});

test("시간의 모래시계 (Time Hourglass) 3턴 시간 정지 액티브", () => {
    let state = newGame(123);
    const hourglass = makeItem("relic", "time_hourglass", state.nextItemId++, 0, 0);
    const itemInPack = addToPack(state.hero, hourglass);
    assert.ok(itemInPack?.letter);

    state = perform(state, { t: "use_relic", letter: itemInPack.letter });
    // 사용 턴에 1턴 정지가 소비되어 남은 정지 턴수는 2턴
    assert.equal(state.hero.timeStop, 2, "모래시계 사용 직후 남은 시간 정지 턴수는 2턴이어야 합니다.");
    assert.equal(itemInPack.relicCooldown, 49, "모래시계 쿨다운이 50턴에서 1턴 소비되어 49턴이어야 합니다.");
});

test("모루 보석 세공 (Socketing): 루비(화상), 토파즈(방어/회피)", () => {
    let state = newGame(123);
    const weapon = equippedWeapon(state.hero)!;
    const armor = equippedArmor(state.hero)!;
    const baseArmorClass = armorClassOf(armor);

    const ruby = makeItem("gem", "ruby", state.nextItemId++, 0, 0);
    const rubyInPack = addToPack(state.hero, ruby)!;

    const topaz = makeItem("gem", "topaz", state.nextItemId++, 0, 0);
    const topazInPack = addToPack(state.hero, topaz)!;

    // 모루 칸으로 이동
    state.hero.x = state.level.anvil!.x;
    state.hero.y = state.level.anvil!.y;

    // 무기에 루비 장착
    state = perform(state, { t: "socket", gearLetter: weapon.letter!, gemLetter: rubyInPack.letter! });
    assert.equal(weapon.socketGem, "ruby", "무기에 루비가 장착되어야 합니다.");

    // 갑옷에 토파즈 장착
    const baseDodge = heroDodgeBonus(state.hero);
    state = perform(state, { t: "socket", gearLetter: armor.letter!, gemLetter: topazInPack.letter! });
    assert.equal(armor.socketGem, "topaz", "갑옷에 토파즈가 장착되어야 합니다.");

    // 토파즈 방어력/회피 보정 검증
    assert.equal(armorClassOf(armor), baseArmorClass - 1, "토파즈 장착 시 방어 등급이 1 내려가야(방어력+1) 합니다.");
    assert.equal(heroDodgeBonus(state.hero), baseDodge + 2, "토파즈 장착 시 회피 보정이 +2 증가해야 합니다.");

    // 루비 장착 무기로 공격 시 화상 검증
    const rng = new Rng(456);
    const monster = spawnMonster("O", 1, 1, rng);
    heroAttack(state, monster, rng);
    assert.equal(monster.burnTurns, 3, "루비가 장착된 무기로 공격 시 몬스터에게 3턴 화상이 걸려야 합니다.");
});
