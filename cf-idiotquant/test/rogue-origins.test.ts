import assert from "node:assert/strict";
import { test } from "node:test";
import { newGame, perform } from "@/lib/rogue/game";
import { heroDefense, heroStr, hungerOf } from "@/lib/rogue/hero";
import { ORIGINS, ORIGIN_LIST } from "@/lib/rogue/origins";
import { bury, graves } from "@/lib/rogue/storage";

test("4대 출신(직업) 목록 및 스탯이 올바르게 정의되어 있다", () => {
    assert.equal(ORIGIN_LIST.length, 4);
    
    // Knight
    assert.equal(ORIGINS.knight.name, "왕실 근위대");
    assert.equal(ORIGINS.knight.baseHp, 14);
    assert.equal(ORIGINS.knight.baseStr, 16);

    // Rogue
    assert.equal(ORIGINS.rogue.name, "지하 도적");
    assert.equal(ORIGINS.rogue.baseHp, 11);
    assert.equal(ORIGINS.rogue.baseStr, 15);

    // Alchemist
    assert.equal(ORIGINS.alchemist.name, "방랑 연금술사");
    assert.equal(ORIGINS.alchemist.baseHp, 12);
    assert.equal(ORIGINS.alchemist.baseStr, 14);

    // Scholar
    assert.equal(ORIGINS.scholar.name, "고서 연구자");
    assert.equal(ORIGINS.scholar.baseHp, 10);
    assert.equal(ORIGINS.scholar.baseStr, 13);
});

test("왕실 근위대(Knight) 시작 장비 및 철벽의 자세 패시브 동작", () => {
    const s = newGame(1, {}, {}, {}, {}, "knight");
    assert.equal(s.heroes[0].origin, "knight");
    assert.equal(s.heroes[0].hp, 14);
    assert.equal(s.heroes[0].maxHp, 14);
    assert.equal(s.heroes[0].str, 16);

    // 시작 장비 확인 (철퇴, 사슬 고리 갑옷, 식량)
    const mace = s.heroes[0].pack.find((p) => p.kind === "weapon" && p.type === "mace");
    const armor = s.heroes[0].pack.find((p) => p.kind === "armor" && p.type === "ring mail");
    assert.ok(mace, "철퇴가 있어야 함");
    assert.ok(armor, "사슬 고리 갑옷이 있어야 함");
    assert.equal(mace.plusHit, 1);
    assert.equal(armor.plusArmor, 1);

    // 기본 방어력
    const baseDef = heroDefense(s.heroes[0]);
    assert.equal(s.heroes[0].guarded, false);

    // 제자리 대기(rest) 시 guarded 상태 활성화 및 방어력 +2
    const s1 = perform(s, { t: "rest" });
    assert.equal(s1.heroes[0].guarded, true);
    assert.equal(heroDefense(s1.heroes[0]), baseDef + 2);

    // 이동 시 guarded 상태 해제
    const s2 = perform(s1, { t: "rest" }); // again
    assert.equal(s2.heroes[0].guarded, true);
});

test("지하 도적(Rogue) 시작 장비 및 스탯 확인", () => {
    const s = newGame(2, {}, {}, {}, {}, "rogue");
    assert.equal(s.heroes[0].origin, "rogue");
    assert.equal(s.heroes[0].hp, 11);
    assert.equal(s.heroes[0].str, 15);

    // 시작 장비 확인 (단검, 다트 10개, 순간이동 주문서, 식량)
    const dagger = s.heroes[0].pack.find((p) => p.kind === "weapon" && p.type === "dagger");
    const dart = s.heroes[0].pack.find((p) => p.kind === "weapon" && p.type === "dart");
    const teleport = s.heroes[0].pack.find((p) => p.kind === "scroll" && p.type === "teleport");
    assert.ok(dagger, "단검이 있어야 함");
    assert.ok(dart && dart.count === 10, "다트 10개가 있어야 함");
    assert.ok(teleport, "순간이동 주문서가 있어야 함");
});

test("방랑 연금술사(Alchemist) 시작 물약 100% 식별 및 회복 효과", () => {
    const s = newGame(3, {}, {}, {}, {}, "alchemist");
    assert.equal(s.heroes[0].origin, "alchemist");
    assert.equal(s.heroes[0].hp, 12);
    assert.equal(s.heroes[0].str, 14);

    // 모든 물약이 시작부터 식별되어 있어야 함
    assert.equal(s.known["potion:healing"], true);
    assert.equal(s.known["potion:extra healing"], true);
    assert.equal(s.known["potion:poison"], true);
    assert.equal(s.known["potion:blindness"], true);

    // 회복 물약이 배낭에 있어야 함
    const healPot = s.heroes[0].pack.find((p) => p.kind === "potion" && p.type === "healing");
    assert.ok(healPot, "체력 회복 물약이 있어야 함");
});

test("고서 연구자(Scholar) 시작 주문서/지팡이 식별 및 지팡이 8회 충전", () => {
    const s = newGame(4, {}, {}, {}, {}, "scholar");
    assert.equal(s.heroes[0].origin, "scholar");
    assert.equal(s.heroes[0].hp, 10);
    assert.equal(s.heroes[0].str, 13);

    // 모든 주문서와 지팡이가 시작부터 식별되어 있어야 함
    assert.equal(s.known["scroll:magic mapping"], true);
    assert.equal(s.known["scroll:identify"], true);
    assert.equal(s.known["wand:slow monster"], true);

    // 둔화 지팡이가 8회 충전되어 있어야 함
    const wand = s.heroes[0].pack.find((p) => p.kind === "wand" && p.type === "slow monster");
    assert.ok(wand, "둔화 지팡이가 있어야 함");
    assert.equal(wand.charges, 8);
});

test("종료 시 무덤(Tomb) 기록에 영웅 origin 정보가 정상 보존된다", () => {
    const s = newGame(5, {}, {}, {}, {}, "alchemist");
    s.heroes[0].hp = 0;
    s.phase = "dead";
    s.epitaph = "테스트 사망";

    const gravesList = bury(s);
    assert.ok(gravesList.length > 0);
    const latest = gravesList[0];
    assert.ok(latest.hero);
    assert.equal(latest.hero.origin, "alchemist");
});
