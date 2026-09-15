// 지난 판 상세 기록 (Run History & Post-mortem Inspection) 테스트
//
// 1. 게임 종료 시 hero의 모든 스탯 (Lv, Exp, HP/MaxHP, Str/MaxStr, Gold, Defense) 보존
// 2. 장착 장비 (무기, 갑옷, 좌/우 반지, 증표)의 정확한 이름 및 강화/저주 상태 보존
// 3. 배낭 아이템 목록 (모든 소지품의 수량, 강화, 충전량, 성능, 장착 태그) 보존
// 4. 사망/승리 직전의 최근 로그 (recentLog) 보존
// 5. graves()를 통한 영구 저장 및 되읽기 무결성
// 6. 이전 버전 간이 Tomb 객체와의 완벽한 하위 호환성

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, score, tombScore } from "@/lib/rogue/game";
import { bury, graves, type Tomb } from "@/lib/rogue/storage";
import { makeItem } from "@/lib/rogue/items";

function withStorage(fn: () => void): void {
    const store = new Map<string, string>();
    const g = globalThis as unknown as { localStorage?: unknown };
    g.localStorage = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
    };
    try {
        fn();
    } finally {
        delete g.localStorage;
    }
}

test("게임 종료 시 영웅 스탯, 장비, 배낭 소지품이 모두 상세하게 기록된다", () => {
    withStorage(() => {
        const s = newGame(555);
        s.hero.level = 4;
        s.hero.exp = 120;
        s.hero.hp = 28;
        s.hero.maxHp = 35;
        s.hero.str = 17;
        s.hero.maxStr = 18;
        s.hero.gold = 650;
        s.deepest = 8;
        s.turn = 240;
        s.epitaph = "오크에게 맞아 전사했다";
        s.phase = "dead";
        s.messages = [
            "오크가 덤벼든다!",
            "오크에게 6의 피해를 입었다.",
            "체력이 0이 되었다.",
            "오크에게 맞아 전사했다.",
        ];

        // 특수 장비 세팅: 장검 +2, 판금 갑옷 +1, 힘의 반지 +1
        const sword = makeItem("weapon", "long sword", 101, -1, -1);
        sword.plusHit = 2;
        sword.plusDam = 3;
        sword.letter = "a";

        const plate = makeItem("armor", "plate mail", 102, -1, -1);
        plate.plusArmor = 1;
        plate.letter = "b";

        const ring = makeItem("ring", "add strength", 103, -1, -1);
        ring.plusRing = 1;
        ring.letter = "c";

        const wand = makeItem("wand", "teleportation", 104, -1, -1);
        wand.charges = 6;
        wand.letter = "d";

        const potion = makeItem("potion", "extra healing", 105, -1, -1);
        potion.count = 2;
        potion.letter = "e";

        s.hero.pack = [sword, plate, ring, wand, potion];
        s.hero.weaponId = sword.id;
        s.hero.armorId = plate.id;
        s.hero.leftRingId = ring.id;
        s.hero.rightRingId = null;

        const list = bury(s);
        assert.equal(list.length, 1);
        const record = list[0];

        // 1. 기본 정보
        assert.equal(record.depth, 8);
        assert.equal(record.gold, 650);
        assert.equal(record.turns, 240);
        assert.equal(record.epitaph, "오크에게 맞아 전사했다");
        assert.equal(record.won, false);
        assert.equal(record.score, score(s));

        // 2. 영웅 스탯
        assert.ok(record.hero);
        assert.equal(record.hero.level, 4);
        assert.equal(record.hero.exp, 120);
        assert.equal(record.hero.hp, 28);
        assert.equal(record.hero.maxHp, 35);
        assert.equal(record.hero.str, 17);
        assert.equal(record.hero.maxStr, 18);
        assert.equal(record.hero.gold, 650);
        assert.ok(record.hero.defense > 0);

        // 3. 장착 장비
        assert.ok(record.hero.weaponName?.includes("장검"));
        assert.ok(record.hero.weaponName?.includes("+2"));
        assert.ok(record.hero.armorName?.includes("판금 갑옷"));
        assert.ok(record.hero.armorName?.includes("+1"));
        assert.ok(record.hero.leftRingName?.includes("힘 반지"));
        assert.equal(record.hero.rightRingName, null);

        // 4. 배낭 아이템 목록
        assert.equal(record.hero.pack.length, 5);
        const pSword = record.hero.pack.find((it) => it.id === sword.id);
        assert.ok(pSword);
        assert.equal(pSword.equipped, "weapon");
        assert.ok(pSword.power?.includes("피해"));

        const pPlate = record.hero.pack.find((it) => it.id === plate.id);
        assert.ok(pPlate);
        assert.equal(pPlate.equipped, "armor");
        assert.ok(pPlate.power?.includes("방어력"));

        const pWand = record.hero.pack.find((it) => it.id === wand.id);
        assert.ok(pWand);
        assert.ok(pWand.power?.includes("6회"));

        const pPotion = record.hero.pack.find((it) => it.id === potion.id);
        assert.ok(pPotion);
        assert.equal(pPotion.count, 2);

        // 5. 최근 로그
        assert.ok(record.recentLog);
        assert.equal(record.recentLog.length, 4);
        assert.equal(record.recentLog[3], "오크에게 맞아 전사했다.");

        // 6. localStorage 재조회 일치성
        const loaded = graves();
        assert.equal(loaded.length, 1);
        assert.equal(loaded[0].hero?.level, 4);
        assert.equal(loaded[0].hero?.pack.length, 5);
    });
});

test("증표를 쥐고 탈출 성공 시 승리 상태와 증표 소지가 정확히 남는다", () => {
    withStorage(() => {
        const s = newGame(777);
        s.hero.gold = 2500;
        s.deepest = 26;
        s.hero.hasAmulet = true;
        s.phase = "won";
        s.epitaph = "옌더의 증표를 쥐고 던전을 탈출했다!";

        const amulet = makeItem("amulet", "amulet", 999, -1, -1);
        amulet.letter = "z";
        s.hero.pack.push(amulet);

        const list = bury(s);
        const record = list[0];
        assert.equal(record.won, true);
        assert.equal(record.amulet, true);
        assert.equal(record.hero?.hasAmulet, true);
        assert.ok(tombScore(record) >= 12500); // 2500 + 10000 + 26*50
    });
});

test("hero 정보가 없는 이전 버전 간이 Tomb 객체도 에러 없이 렌더링/점수 계산 가능", () => {
    const oldTomb: Tomb = {
        at: Date.now() - 100000,
        depth: 12,
        gold: 400,
        turns: 500,
        epitaph: "뱀에게 물려 사망",
        won: false,
    };
    assert.equal(tombScore(oldTomb), 400 + 12 * 50);
    assert.equal(oldTomb.hero, undefined);
});
