// 축복받은 주문서 & 아이템 시스템 테스트 (Blessed Scrolls & Items)
//
// 1. 축복받은 아이템 생성 및 식별 시 접두사 표기 ('축복받은 ')
// 2. 축복받은 순간이동 주문서 (축순): 계단 주변으로 안전 텔레포트
// 3. 축복받은 지도 제작 주문서 (축지도): 전체 맵 공개 + 함정 탐지 + 30턴 몬스터 감지
// 4. 축복받은 감정 주문서 (축감정): 배낭 전체 식별 + 비밀문 개방
// 5. 축복받은 저주 해제 주문서 (축축저): 배낭 전체 저주 해제 + 착용 무기/방어구 축복 부여
// 6. 축복받은 재련 주문서 (축재련): 상위 티어 장비 변환 + 확정 +1 보너스

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { describe, makeItem, WEAPONS } from "@/lib/rogue/items";
import { T, idx } from "@/lib/rogue/types";

test("축복받은 아이템 생성 및 설명 표시 (식별 시 '축복받은 ' 접두사)", () => {
    const item = makeItem("weapon", "dagger", 1, 0, 0);
    item.blessed = true;
    item.plusHit = 1;
    item.plusDam = 1;

    // 미식별 상태일 때 (단검은 기본 시작 시 식별 상태 아님)
    const known: Record<string, boolean> = {};
    assert.equal(describe(item, known, {}), "단검");

    // 식별 상태일 때 — **무기·갑옷의 손질은 종류가 아니라 물건마다 안다**(`plusKnown`).
    // 종류로 알던 시절에는 `known["weapon:dagger"]` 를 세웠는데, 그러면 배낭 속 딴 단검의
    // 손질까지 공짜로 드러난다.
    known["weapon:dagger"] = true;
    item.plusKnown = true;
    const desc = describe(item, known, {});
    assert.ok(desc.startsWith("축복받은 단검 +1"), `예상: 축복받은 단검 +1..., 실제: ${desc}`);
});

test("축복 주문서를 가진 채 같은 일반 주문서를 주워도 축복이 전파되지 않는다", () => {
    const s = newGame(41);
    const blessed = makeItem("scroll", "teleport", 9001, -1, -1);
    blessed.blessed = true;
    blessed.letter = "a";
    const plain = makeItem("scroll", "teleport", 9002, s.heroes[0].x, s.heroes[0].y);
    s.heroes[0].pack = [blessed];
    s.level.items.push(plain);

    perform(s, { t: "pickup" });

    const teleports = s.heroes[0].pack.filter((it) => it.kind === "scroll" && it.type === "teleport");
    assert.equal(teleports.length, 2, "축복·일반 주문서가 한 묶음으로 합쳐졌다");
    assert.deepEqual(teleports.map((it) => it.blessed).sort(), [false, true], "일반 주문서에 축복이 전파됐다");
});

test("축복받은 순간이동 주문서 (축순): 계단 주변으로 안전 텔레포트", () => {
    const s = newGame(42);
    const scroll = makeItem("scroll", "teleport", 101, -1, -1);
    scroll.letter = "a";
    scroll.blessed = true;
    s.heroes[0].pack = [scroll];

    const stairs = s.level.stairs;
    perform(s, { t: "read", letter: "a" });

    const dist = Math.abs(s.heroes[0].x - stairs.x) + Math.abs(s.heroes[0].y - stairs.y);
    assert.ok(dist <= 4, `축복받은 순간이동은 계단 주변으로 이동해야 합니다 (현재 거리: ${dist})`);
});

test("축복받은 지도 제작 주문서 (축지도): 전체 맵 공개 + 함정 탐지 + 30턴 몬스터 감지", () => {
    const s = newGame(77);
    const scroll = makeItem("scroll", "magic mapping", 101, -1, -1);
    scroll.letter = "a";
    scroll.blessed = true;
    s.heroes[0].pack = [scroll];

    perform(s, { t: "read", letter: "a" });

    // 1. 30턴 몬스터 감지 버프 (턴 종료 시 1 감소하여 29)
    assert.ok(s.heroes[0].detect >= 29, `몬스터 감지 버프는 29 이상이어야 합니다 (현재: ${s.heroes[0].detect})`);
    // 2. 층의 모든 함정이 발견(t.found = true) 상태가 됨
    for (const trap of s.level.traps) {
        assert.equal(trap.found, true);
    }
});

test("축복받은 감정 주문서 (축감정): 배낭 전체 식별 + 비밀문 개방", () => {
    const s = newGame(88);
    // 비밀문 배치
    s.level.tiles[idx(5, 5)] = T.SECRET;

    // 미식별 물약 추가
    const unidenPot = makeItem("potion", "healing", 100, -1, -1);
    unidenPot.letter = "b";
    delete s.known["potion:healing"];

    const scroll = makeItem("scroll", "identify", 101, -1, -1);
    scroll.letter = "a";
    scroll.blessed = true;
    s.heroes[0].pack = [scroll, unidenPot];

    perform(s, { t: "read", letter: "a" });

    // 배낭 내 물약이 식별되었는지 확인
    assert.equal(s.known["potion:healing"], true);
    // 비밀문이 일반 문으로 개방되었는지 확인
    assert.equal(s.level.tiles[idx(5, 5)], T.DOOR);
});

test("축복받은 저주 해제 주문서 (축축저): 배낭 전체 저주 해제 + 착용 무기/방어구 축복 부여", () => {
    const s = newGame(99);
    const cursedWep = makeItem("weapon", "mace", 100, -1, -1);
    cursedWep.letter = "a";
    cursedWep.cursed = true;
    const cursedArmor = makeItem("armor", "chain", 101, -1, -1);
    cursedArmor.letter = "b";
    cursedArmor.cursed = true;
    const cursedRing = makeItem("ring", "protection", 102, -1, -1);
    cursedRing.letter = "c";
    cursedRing.cursed = true;

    s.heroes[0].pack = [cursedWep, cursedArmor, cursedRing];
    s.heroes[0].weaponId = cursedWep.id;
    s.heroes[0].armorId = cursedArmor.id;

    const scroll = makeItem("scroll", "remove curse", 103, -1, -1);
    scroll.letter = "d";
    scroll.blessed = true;
    s.heroes[0].pack = [cursedWep, cursedArmor, cursedRing, scroll];

    perform(s, { t: "read", letter: "d" });

    // 배낭 내 모든 저주 해제
    assert.equal(cursedWep.cursed, false);
    assert.equal(cursedArmor.cursed, false);
    assert.equal(cursedRing.cursed, false);

    // 장착 중인 무기와 방어구에 축복 부여
    assert.equal(cursedWep.blessed, true);
    assert.equal(cursedArmor.blessed, true);
});

test("축복받은 재련 주문서 (축재련): 상위 티어 변환 + 확정 +1 보너스", () => {
    const s = newGame(123);
    const mace = makeItem("weapon", "mace", 100, -1, -1);
    mace.letter = "a";
    mace.plusHit = 0;
    mace.plusDam = 0;
    s.heroes[0].pack = [mace];
    s.heroes[0].weaponId = mace.id;

    const scroll = makeItem("scroll", "transmutation", 101, -1, -1);
    scroll.letter = "b";
    scroll.blessed = true;
    s.heroes[0].pack = [mace, scroll];

    perform(s, { t: "read", letter: "b", target: "a" });

    const wep = s.heroes[0].pack.find((it) => it.id === s.heroes[0].weaponId);
    assert.ok(wep);
    // 철퇴의 depth(1) 이상의 장비로 변환되었는지 확인
    assert.ok((WEAPONS[wep.type]?.depth ?? 1) >= (WEAPONS["mace"].depth ?? 1));
    // **겹쳐 쌓이는 것으로 바뀌면 +1 이 안 붙는다** — 표창·화살은 강화를 못 가진다
    // (`canHoldEnchant`). 한 장이 열 자루를 올리고 모루는 한 자루씩 녹이므로, 거기로
    // 주문서가 복사됐다. 확정 +1 은 **강화를 가질 수 있는 것으로 바뀌었을 때**의 약속이다.
    const bonus = WEAPONS[wep.type]?.stack ? 0 : 1;
    assert.equal(wep.plusHit, bonus, `${wep.type} 로 재련됐는데 명중 보정이 맞지 않는다`);
    assert.equal(wep.plusDam, bonus, `${wep.type} 로 재련됐는데 피해 보정이 맞지 않는다`);
    assert.equal(wep.blessed, true);
});
