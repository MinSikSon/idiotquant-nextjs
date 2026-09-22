import assert from "node:assert/strict";
import { test } from "node:test";
import { newGame, perform } from "@/lib/rogue/game";
import { canOffHand, heroArmorClass, heroArmorClassTerms, heroDamTerms, heroDefense, heroHitTerms, heroStr, hungerOf, isDualWielding, weaponAffinityOf } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { spawnMonster } from "@/lib/rogue/monsters";
import { ORIGINS, ORIGIN_LIST } from "@/lib/rogue/origins";
import { Rng } from "@/lib/rogue/rng";
import { bury, graves } from "@/lib/rogue/storage";
import { idx, T } from "@/lib/rogue/types";

test("4대 출신(직업) 목록 및 스탯이 올바르게 정의되어 있다", () => {
    assert.equal(ORIGIN_LIST.length, 4);
    for (const origin of ORIGIN_LIST) {
        assert.ok(origin.advancedSkillName);
        assert.ok(origin.advancedSkillDescription);
    }
    assert.equal(ORIGINS.knight.advancedSkillKind, "passive");
    
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

test("직업 무기를 쥐면 명중과 피해에 같은 숙련 보너스가 붙는다", () => {
    const cases = [
        ["knight", "mace"],
        ["rogue", "dagger"],
        ["alchemist", "spear"],
        ["scholar", "dagger"],
    ] as const;
    for (const [origin, type] of cases) {
        const state = newGame(100, {}, {}, {}, {}, origin);
        const hero = state.heroes[0];
        const weapon = hero.pack.find((it) => it.kind === "weapon" && it.type === type);
        if (!weapon) {
            const first = hero.pack.find((it) => it.kind === "weapon")!;
            first.type = type;
        }
        const equipped = hero.pack.find((it) => it.kind === "weapon" && it.type === type)!;
        hero.weaponId = equipped.id;
        assert.ok(weaponAffinityOf(hero), `${origin}의 ${type}은 직업 무기여야 한다`);
        assert.ok(heroHitTerms(hero).some((term) => term.why === ORIGINS[origin].weaponAffinity.name && term.n === 1));
        assert.ok(heroDamTerms(hero).some((term) => term.why === ORIGINS[origin].weaponAffinity.name && term.n === 1));
    }
});

test("근위대는 단검·철퇴·창·장검, 도적은 단검을 이도류로 쥔다", () => {
    for (const [origin, type] of [["knight", "dagger"], ["knight", "mace"], ["knight", "spear"], ["knight", "long sword"], ["rogue", "dagger"]] as const) {
        const state = newGame(102, {}, {}, {}, {}, origin);
        const hero = state.heroes[0];
        const main = hero.pack.find((it) => it.kind === "weapon")!;
        main.type = type;
        const off = makeItem("weapon", type, 9002, -1, -1);
        off.letter = "z";
        hero.pack.push(off);
        hero.weaponId = main.id;
        assert.ok(canOffHand(hero, off), `${origin}은 두 번째 ${type}을(를) 보조손에 쥘 수 있어야 한다`);
        hero.offWeaponId = off.id;
        assert.ok(isDualWielding(hero), `${origin}의 이도류 상태를 읽지 못한다`);
    }
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
    assert.equal(heroArmorClass(s.heroes[0]), 10 - baseDef, "Rogue식 방어 등급이 실제 방어력과 어긋난다");
    assert.equal(s.heroes[0].guarded, false);

    // 제자리 대기(rest) 시 guarded 상태 활성화 및 방어력 +2
    const s1 = perform(s, { t: "rest" });
    assert.equal(s1.heroes[0].guarded, true);
    assert.equal(s1.heroes[0].guardTurns, 3);
    assert.equal(heroDefense(s1.heroes[0]), baseDef + 2);
    assert.equal(heroArmorClass(s1.heroes[0]), 10 - (baseDef + 2), "철벽 자세가 방어 등급에도 안 반영된다");
    assert.equal(heroArmorClassTerms(s1.heroes[0]).reduce((sum, term) => sum + term.n, 0), heroArmorClass(s1.heroes[0]), "상태 상세의 방어 등급 식이 실제 값과 다르다");

    // 곁의 적을 제자리에서 치면 적의 반격까지 포함해 세 번 버틴다.
    const hero = s1.heroes[0];
    const mx = hero.x + 1;
    const my = hero.y;
    s1.level.tiles[idx(mx, my)] = T.FLOOR;
    const target = spawnMonster("Z", mx, my, new Rng(91));
    target.hp = 999;
    target.maxHp = 999;
    target.awake = true;
    s1.level.monsters = [target];
    for (const remaining of [2, 1]) {
        hero.hp = hero.maxHp;
        perform(s1, { t: "move", dx: 1, dy: 0 });
        assert.equal(hero.guarded, true);
        assert.equal(hero.guardTurns, remaining);
    }
    hero.hp = hero.maxHp;
    const s2 = perform(s1, { t: "move", dx: 1, dy: 0 });
    assert.equal(s2.heroes[0].guarded, false);
    assert.ok(s2.messages.some((m) => m.includes("철벽의 자세가 풀렸다")), "자세 해제 안내가 로그에 없다");

    // 다른 행동을 하면 남은 횟수와 관계없이 바로 풀린다.
    const s3 = perform(s2, { t: "rest" });
    const s4 = perform(s3, { t: "search" });
    assert.equal(s4.heroes[0].guarded, false);
});

test("왕실 근위 기사단장의 불굴의 방벽은 위기에서 철벽의 자세와 중첩된다", () => {
    const s = newGame(6, {}, {}, {}, {}, "knight");
    const hero = s.heroes[0];
    hero.level = 9;
    const healthy = heroDefense(hero);
    hero.hp = Math.floor(hero.maxHp / 2);
    assert.equal(heroDefense(hero), healthy + 2);
    hero.guarded = true;
    assert.equal(heroDefense(hero), healthy + 2 + 4);

    hero.guarded = false;
    const guarded = perform(s, { t: "rest" });
    assert.ok(guarded.messages.at(-1)?.includes("방어 등급 -4"), "전직 뒤 철벽 자세 로그가 실제 방어 등급 변화를 적지 않는다");
});

test("인접한 적에게서도 일반 이동으로 도망칠 수 있고, 공격은 제자리에서 한다", () => {
    const s = newGame(7, {}, {}, {}, {}, "knight");
    const hero = s.heroes[0];
    hero.x = 10;
    hero.y = 10;
    s.level.tiles[idx(9, 10)] = T.FLOOR;
    s.level.tiles[idx(11, 10)] = T.FLOOR;
    const target = spawnMonster("Z", 11, 10, new Rng(92));
    target.hp = 999;
    target.maxHp = 999;
    s.level.monsters = [target];

    const fled = perform(s, { t: "move", dx: -1, dy: 0 });
    assert.equal(fled.heroes[0].x, 9);
    assert.equal(fled.heroes[0].y, 10);
    assert.equal(target.x, 11, "방금 떠난 칸으로 추격한 적이 공격 대신 이동했다");

    const s2 = newGame(8, {}, {}, {}, {}, "knight");
    const fighter = s2.heroes[0];
    fighter.x = 10;
    fighter.y = 10;
    s2.level.tiles[idx(11, 10)] = T.FLOOR;
    const opponent = spawnMonster("Z", 11, 10, new Rng(93));
    opponent.hp = 999;
    opponent.maxHp = 999;
    s2.level.monsters = [opponent];
    const fought = perform(s2, { t: "move", dx: 1, dy: 0 });
    assert.equal(fought.heroes[0].x, 10, "공격은 제자리에서 해야 한다");
});

test("적은 이번 행동에 합법적으로 영웅 칸에 닿을 때만 공격한다", () => {
    const s = newGame(9, {}, {}, {}, {}, "knight");
    const hero = s.heroes[0];
    hero.x = 10;
    hero.y = 10;
    s.level.tiles[idx(10, 10)] = T.FLOOR;
    s.level.tiles[idx(9, 9)] = T.FLOOR;
    s.level.tiles[idx(9, 10)] = T.ROCK;
    s.level.tiles[idx(10, 9)] = T.ROCK;
    const monster = spawnMonster("Z", 9, 9, new Rng(94));
    monster.awake = true;
    s.level.monsters = [monster];
    const hp = hero.hp;

    perform(s, { t: "rest" });
    assert.equal(hero.hp, hp, "대각선 모서리에 막힌 적이 벽 너머로 때렸다");
    assert.equal(monster.x, 9);
    assert.equal(monster.y, 9);
});

test("용은 원작처럼 직선·대각선 여섯 칸에서 불꽃을 뿜는다", () => {
    let breathed = false;
    let trailSeen = false;
    for (let seed = 900; seed < 930; seed++) {
        const s = newGame(seed, {}, {}, {}, {}, "knight");
        const hero = s.heroes[0];
        hero.x = 10;
        hero.y = 10;
        hero.hp = 1000;
        hero.maxHp = 1000;
        for (let y = 4; y <= 10; y++) s.level.tiles[idx(10, y)] = T.FLOOR;
        const dragon = spawnMonster("D", 10, 4, new Rng(seed));
        dragon.awake = true;
        s.level.monsters = [dragon];

        perform(s, { t: "rest" });
        if (s.messages.some((m) => m.includes("불꽃을 뿜었다"))) {
            breathed = true;
            trailSeen ||= !!s.projectile?.cells.some((cell) => cell.ch === "|");
        }
    }
    assert.equal(breathed, true, "용이 원거리 불꽃 공격을 한 번도 쓰지 않았다");
    assert.equal(trailSeen, true, "용의 불꽃 궤적이 엔진에 남지 않았다");
});

test("왕실 근위 기사단장의 불굴의 방벽은 위기에서 철벽의 자세와 중첩된다", () => {
    const s = newGame(6, {}, {}, {}, {}, "knight");
    const hero = s.heroes[0];
    hero.level = 9;
    const healthy = heroDefense(hero);
    hero.hp = Math.floor(hero.maxHp / 2);
    assert.equal(heroDefense(hero), healthy + 2);
    hero.guarded = true;
    assert.equal(heroDefense(hero), healthy + 2 + 4);
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

test("연금술사는 해로운 물약을 무작위 이득으로 바꾼다", () => {
    const outcomes = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
        const s = newGame(seed, {}, {}, {}, {}, "alchemist");
        const hero = s.heroes[0];
        const poison = makeItem("potion", "poison", 10000 + seed, -1, -1);
        poison.letter = "z";
        hero.pack.push(poison);
        hero.food = 100;
        const before = { str: hero.str, food: hero.food, detect: hero.detect };
        const after = perform(s, { t: "quaff", letter: "z" });
        const h = after.heroes[0];
        assert.equal(h.blind, 0, "해로운 물약의 원래 상태 이상이 적용됐다");
        if (h.str > before.str) outcomes.add("str");
        if (h.food > before.food) outcomes.add("food");
        if (h.detect > before.detect) outcomes.add("detect");
    }
    assert.deepEqual(outcomes, new Set(["str", "food", "detect"]));
});

test("현자의 연금술은 포션 두 개로 축복의 기름을 만들고 장비에 입힌다", () => {
    const s = newGame(63, {}, {}, {}, {}, "alchemist");
    const hero = s.heroes[0];
    hero.level = 9;
    const first = hero.pack.find((it) => it.kind === "potion")!;
    const second = makeItem("potion", "poison", 1063, -1, -1);
    second.letter = "z";
    hero.pack.push(second);

    const made = perform(s, { t: "classSkill", ingredients: [first.letter!, "z"] });
    const blessing = made.heroes[0].pack.find((it) => it.kind === "potion" && it.type === "blessing");
    assert.ok(blessing, "포션 두 개로 축복의 기름을 만들지 못했다");

    const weapon = made.heroes[0].pack.find((it) => it.kind === "weapon")!;
    const after = perform(made, { t: "quaff", letter: blessing.letter!, target: weapon.letter! });
    assert.equal(weapon.blessed, true, "축복의 기름이 선택한 장비에 축복을 입히지 못했다");
    assert.ok(!after.heroes[0].pack.some((it) => it.id === blessing.id), "쓴 축복의 기름이 남았다");
});

test("축복받은 장비는 위험 강화 실패를 한 번 막고 축복만 잃는다", () => {
    let protectedOnce = false;
    for (let seed = 1; seed <= 200; seed++) {
        const s = newGame(seed);
        const hero = s.heroes[0];
        const weapon = hero.pack.find((it) => it.kind === "weapon")!;
        weapon.plusHit = 6;
        weapon.plusDam = 6;
        weapon.blessed = true;
        const scroll = makeItem("scroll", "enchant weapon", 20000 + seed, -1, -1);
        scroll.letter = "z";
        hero.pack.push(scroll);
        const after = perform(s, { t: "read", letter: "z", target: weapon.letter! });
        const kept = after.heroes[0].pack.find((it) => it.id === weapon.id);
        if (kept && !kept.blessed && kept.plusHit === 6) {
            protectedOnce = true;
            break;
        }
    }
    assert.ok(protectedOnce, "위험 강화 실패에서 축복이 장비 파괴를 막지 못했다");
});

test("축복받은 장비는 강화에 성공하면 축복을 유지한다", () => {
    const s = newGame(64);
    const hero = s.heroes[0];
    const weapon = hero.pack.find((it) => it.kind === "weapon")!;
    weapon.blessed = true;
    const scroll = makeItem("scroll", "enchant weapon", 1064, -1, -1);
    scroll.letter = "z";
    hero.pack.push(scroll);

    perform(s, { t: "read", letter: "z", target: weapon.letter! });
    assert.equal(weapon.blessed, true, "강화 성공 후에도 축복이 사라졌다");
});

test("고서 연구자(Scholar) 시작 주문서/지팡이 식별 및 지팡이 8회 충전", () => {
    const s = newGame(4, {}, {}, {}, {}, "scholar");
    assert.equal(s.heroes[0].origin, "scholar");
    assert.equal(s.heroes[0].hp, 10);
    assert.equal(s.heroes[0].str, 13);

    // 모든 주문서와 지팡이가 시작부터 식별되어 있어야 함
    assert.equal(s.known["scroll:magic mapping"], true);
    assert.equal(s.known["scroll:identify"], true);
    assert.equal(s.known["wand:magic missile"], true);

    // 마법 화살 지팡이가 8회 충전되어 있어야 함
    const wand = s.heroes[0].pack.find((p) => p.kind === "wand" && p.type === "magic missile");
    assert.ok(wand, "마법 화살 지팡이가 있어야 함");
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
