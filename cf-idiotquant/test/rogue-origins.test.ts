import assert from "node:assert/strict";
import { test } from "node:test";
import { joinGame, newGame, perform } from "@/lib/rogue/game";
import { DIG_DOWN_EFFORT, DIG_WALL_EFFORT, addToPack, canOffHand, digEffort, heldPickAxe, equippedWand, heroArmorClass, heroArmorClassTerms, heroDamTerms, heroDefense, heroHitTerms, heroStr, hungerOf, isDualWielding, searchChance, strDamBonus, weaponAffinityOf } from "@/lib/rogue/hero";
import { makeItem } from "@/lib/rogue/items";
import { spawnMonster } from "@/lib/rogue/monsters";
import { ADVANCE_LEVEL, ARCHEOLOGIST_DIG_MULT, ORIGINS, ORIGIN_LIST } from "@/lib/rogue/origins";
import { Rng } from "@/lib/rogue/rng";
import { bury, deserialize, graves, serialize } from "@/lib/rogue/storage";
import { idx, T, walkable, type GameState, type Tile } from "@/lib/rogue/types";

test("6대 출신(직업) 목록 및 스탯이 올바르게 정의되어 있다", () => {
    assert.equal(ORIGIN_LIST.length, 6);
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

    // Ranger (NetHack) — 활을 쥐고 화살 묶음을 든 채 시작한다
    assert.equal(ORIGINS.ranger.name, "변방 레인저");
    assert.equal(ORIGINS.ranger.baseHp, 12);
    assert.equal(ORIGINS.ranger.baseStr, 14);
    assert.equal(ORIGINS.ranger.advancedSkillKind, "passive");

    // Archeologist (NetHack) — 곡괭이를 쥐고 시작한다
    assert.equal(ORIGINS.archeologist.name, "유적 고고학자");
    assert.equal(ORIGINS.archeologist.baseHp, 12);
    assert.equal(ORIGINS.archeologist.baseStr, 15);
    assert.equal(ORIGINS.archeologist.advancedSkillKind, "passive");
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
        assert.ok(heroHitTerms(hero).some((term) => term.why.startsWith("basic ") && term.n === 0));
        assert.ok(heroDamTerms(hero).some((term) => term.why.startsWith("basic ") && term.n === 0));
        assert.ok(!heroHitTerms(hero).some((term) => term.why === ORIGINS[origin].weaponAffinity.name));
        assert.ok(!heroDamTerms(hero).some((term) => term.why === ORIGINS[origin].weaponAffinity.name));
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

    // NetHack Rogue의 핵심 장비를 이 게임의 사다리에 맞춘다: 단검 묶음과 +1 가죽 갑옷.
    const dagger = s.heroes[0].pack.find((p) => p.kind === "weapon" && p.type === "dagger");
    const leather = s.heroes[0].pack.find((p) => p.kind === "armor" && p.type === "leather");
    const teleport = s.heroes[0].pack.find((p) => p.kind === "scroll" && p.type === "teleport");
    assert.ok(dagger && dagger.count === 6, "단검 6개 묶음이 있어야 함");
    assert.ok(leather && leather.plusArmor === 1, "+1 가죽 갑옷이 있어야 함");
    assert.ok(teleport, "순간이동 주문서가 있어야 함");
});

test("혼자 잠입한 도적은 일부 평범한 적을 잠든 채 만난다", () => {
    let sleeping = 0;
    for (let seed = 1; seed <= 20; seed++) {
        const s = newGame(seed, {}, {}, {}, {}, "rogue");
        sleeping += s.level.monsters.filter((monster) => !monster.awake).length;
    }
    assert.ok(sleeping > 0, "도적의 은신이 시작 몬스터를 한 번도 재우지 않는다");
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
    assert.equal(equippedWand(s.heroes[0])?.type, "magic missile", "연금술사는 시작 지팡이를 장착해야 함");
});

test("지팡이를 다루는 출신은 시작 지팡이를 바로 장착한다", () => {
    const scholar = newGame(34, {}, {}, {}, {}, "scholar").heroes[0];
    assert.equal(equippedWand(scholar)?.type, "magic missile");
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

test("고고학자의 곡괭이 — 벽으로 걸으면 판다", () => {
    const s = newGame(11, {}, {}, {}, {}, "archeologist");
    const hero = s.heroes[0];

    // ── 곡괭이를 쥐고 시작한다 · 벽 뒤지기 45% → 전직 65%
    {
        const pick = hero.pack.find((p) => p.id === hero.weaponId);
        assert.equal(pick?.type, "pick-axe", "곡괭이를 쥐고 시작해야 곧바로 판다");
        assert.equal(pick?.plusHit, 1);
        assert.equal(searchChance(hero), 0.45);
        hero.level = ADVANCE_LEVEL;
        assert.equal(searchChance(hero), 0.65, "전직한 고고학자의 벽 뒤지기가 반지만큼 안 오른다");
        hero.level = 1;
    }

    const setup = (st: GameState) => {
        const h = st.heroes[0];
        h.x = 10;
        h.y = 10;
        h.food = 1300;
        st.level.monsters = [];
        st.level.tiles[idx(10, 10)] = T.FLOOR;
        return h;
    };

    // ── 벽은 여러 턴에 걸쳐 문턱이 되고, 그동안 제자리다
    {
        setup(s);
        s.level.tiles[idx(11, 10)] = T.WALL_V;
        let st = s;
        let turns = 0;
        while (st.level.tiles[idx(11, 10)] === T.WALL_V && turns < 30) {
            const before = st.turn;
            st = perform(st, { t: "move", dx: 1, dy: 0 });
            assert.equal(st.turn, before + 1, "파는 것은 턴을 쓴다");
            turns++;
        }
        assert.equal(st.level.tiles[idx(11, 10)], T.DOOR, "방 벽을 파면 문턱이 돼야 한다");
        assert.ok(turns >= 2, `벽이 ${turns}턴 만에 뚫렸다 — 한 번에 뚫리면 곡괭이가 굴착 지팡이보다 싸다`);
        assert.equal(st.heroes[0].x, 10, "파는 동안 걸어 들어갔다");
        assert.equal(st.heroes[0].dig, undefined, "다 판 뒤에도 파던 자리가 남았다");
    }

    // ── 바위는 복도가 된다 · 숨은 문은 문턱이 된다
    {
        for (const [tile, expect] of [[T.ROCK, T.CORRIDOR], [T.SECRET, T.DOOR]] as const) {
            const st0 = newGame(12, {}, {}, {}, {}, "archeologist");
            setup(st0);
            st0.level.tiles[idx(10, 9)] = tile;
            let st = st0;
            for (let i = 0; i < 30 && st.level.tiles[idx(10, 9)] === tile; i++) st = perform(st, { t: "move", dx: 0, dy: -1 });
            assert.equal(st.level.tiles[idx(10, 9)], expect, `${tile} 를 파서 ${expect} 가 안 됐다`);
        }
    }

    // ── 다른 칸으로 돌리면 처음부터 판다
    {
        const st0 = newGame(13, {}, {}, {}, {}, "archeologist");
        const h = setup(st0);
        st0.level.tiles[idx(11, 10)] = T.ROCK;
        st0.level.tiles[idx(9, 10)] = T.ROCK;
        let st = perform(st0, { t: "move", dx: 1, dy: 0 });
        assert.equal(st.heroes[0].dig?.x, 11);
        st = perform(st, { t: "move", dx: -1, dy: 0 });
        const oneTurnMax = (10 + 4 + strDamBonus(h.str) + 1) * ARCHEOLOGIST_DIG_MULT;
        assert.equal(st.heroes[0].dig?.x, 9, "새 칸을 파는데 옛 자리를 붙들고 있다");
        assert.ok(st.heroes[0].dig!.effort <= oneTurnMax, "새 칸에 옛 칸의 힘이 얹혔다");
    }

    // ── 대각선·지도 테두리·곡괭이 없는 사람은 안 판다 — 턴도 안 쓴다
    {
        const st0 = newGame(14, {}, {}, {}, {}, "archeologist");
        setup(st0);
        st0.level.tiles[idx(11, 11)] = T.ROCK;
        const turnBefore = st0.turn;
        const diag = perform(st0, { t: "move", dx: 1, dy: 1 });
        assert.equal(diag.turn, turnBefore, "대각선으로 팠다");
        assert.equal(diag.level.tiles[idx(11, 11)], T.ROCK);

        const edge = newGame(15, {}, {}, {}, {}, "archeologist");
        const eh = setup(edge);
        eh.x = 1;
        edge.level.tiles[idx(1, 10)] = T.FLOOR;
        const t0 = edge.turn;
        const after = perform(edge, { t: "move", dx: -1, dy: 0 });
        assert.equal(after.turn, t0, "지도 테두리를 팠다");

        const knight = newGame(16, {}, {}, {}, {}, "knight");
        setup(knight);
        knight.level.tiles[idx(11, 10)] = T.WALL_V;
        const knightTurn = knight.turn;
        const bump = perform(knight, { t: "move", dx: 1, dy: 0 });
        assert.equal(bump.turn, knightTurn, "곡괭이 없이 벽을 들이받았는데 턴을 썼다");
        assert.equal(bump.level.tiles[idx(11, 10)], T.WALL_V);
    }
});

test("고고학자의 곡괭이 — 계단 밖에서 내려가면 발밑을 판다", () => {
    const s = newGame(21, {}, {}, {}, {}, "archeologist");
    const hero = s.heroes[0];
    hero.x = 10;
    hero.y = 10;
    hero.food = 1300;
    s.level.monsters = [];
    s.level.tiles[idx(10, 10)] = T.FLOOR;
    s.level.upStairs = { x: 3, y: 3 };

    // ── 모루 위는 못 판다 — 턴도 안 쓴다
    s.level.anvil = { x: 10, y: 10 };
    const turnBefore = s.turn;
    const refused = perform(s, { t: "descend" });
    assert.equal(refused.turn, turnBefore, "모루 위를 파려다 턴을 썼다");
    assert.equal(refused.level.depth, 1);

    // ── 여러 턴 파면 아래층으로 떨어진다
    s.level.anvil = { x: 3, y: 4 };
    let st = s;
    let turns = 0;
    while (st.level.depth === 1 && turns < 40) {
        st = perform(st, { t: "descend" });
        turns++;
    }
    assert.equal(st.level.depth, 2, "발밑을 40턴 파도 안 떨어진다");
    assert.ok(turns >= 3, `발밑이 ${turns}턴 만에 뚫렸다 — 계단을 찾을 까닭이 사라진다`);
    assert.ok(DIG_DOWN_EFFORT > DIG_WALL_EFFORT, "발밑이 벽보다 쉽게 뚫린다");
    assert.equal(st.heroes[0].dig, undefined);

    // ── 곡괭이가 없으면 계단 밖에서 내려가도 아무 일도 없다
    const k = newGame(22, {}, {}, {}, {}, "knight");
    k.heroes[0].x = 10;
    k.heroes[0].y = 10;
    k.level.tiles[idx(10, 10)] = T.FLOOR;
    const knightTurn = k.turn;
    const none = perform(k, { t: "descend" });
    assert.equal(none.turn, knightTurn);
    assert.equal(none.level.depth, 1);
});

test("파다 만 자리는 저장했다 되읽어도 남고, 모양이 틀리면 지운다", () => {
    const s = newGame(31, {}, {}, {}, {}, "archeologist");
    s.heroes[0].dig = { x: 4, y: 5, depth: 1, effort: 40 };
    assert.deepEqual(deserialize(serialize(s))!.heroes[0].dig, { x: 4, y: 5, depth: 1, effort: 40 });

    (s.heroes[0] as { dig?: unknown }).dig = { x: "a" };
    assert.ok(!("dig" in deserialize(serialize(s))!.heroes[0]), "모양이 틀린 파던 자리가 되읽혔다");
});

test("곡괭이의 파는 힘 — 직업이 아니라 쥔 물건이 판다", () => {
    const pickOf = (origin: "archeologist" | "knight") => {
        const s = newGame(41, {}, {}, {}, {}, origin);
        const h = s.heroes[0];
        const pick = makeItem("weapon", "pick-axe", 9001, -1, -1);
        addToPack(h, pick);
        h.weaponId = pick.id;
        h.str = 15;
        h.maxStr = 15;
        return { s, h, pick };
    };

    // ── 같은 굴림이면 고고학자가 정확히 두 배 · 손질이 한 칸마다 얹힌다
    {
        const a = pickOf("archeologist");
        const k = pickOf("knight");
        for (let seed = 1; seed <= 20; seed++) {
            const ka = digEffort(k.h, k.pick, new Rng(seed));
            assert.equal(digEffort(a.h, a.pick, new Rng(seed)), ka * ARCHEOLOGIST_DIG_MULT, `시드 ${seed}: 고고학자가 두 배로 안 판다`);
            k.pick.plusHit = 3;
            assert.equal(digEffort(k.h, k.pick, new Rng(seed)), ka + 3, `시드 ${seed}: +3 곡괭이가 세 칸 더 안 판다`);
            k.pick.plusHit = 0;
        }
    }

    // ── 곡괭이를 쥔 근위대도 판다(고고학자보다 느릴 뿐) · 곡괭이를 내린 고고학자는 안 판다
    {
        const k = pickOf("knight");
        k.h.x = 10;
        k.h.y = 10;
        k.s.level.monsters = [];
        k.s.level.tiles[idx(10, 10)] = T.FLOOR;
        k.s.level.tiles[idx(11, 10)] = T.ROCK;
        let st = k.s;
        for (let i = 0; i < 40 && st.level.tiles[idx(11, 10)] === T.ROCK; i++) st = perform(st, { t: "move", dx: 1, dy: 0 });
        assert.equal(st.level.tiles[idx(11, 10)], T.CORRIDOR, "곡괭이를 쥔 근위대가 못 판다");

        const a = newGame(42, {}, {}, {}, {}, "archeologist");
        const ah = a.heroes[0];
        const dagger = makeItem("weapon", "dagger", 9002, -1, -1);
        addToPack(ah, dagger);
        ah.weaponId = dagger.id;
        assert.equal(heldPickAxe(ah), undefined);
        ah.x = 10;
        ah.y = 10;
        a.level.monsters = [];
        a.level.tiles[idx(10, 10)] = T.FLOOR;
        a.level.tiles[idx(11, 10)] = T.ROCK;
        const turnBefore = a.turn;
        const bump = perform(a, { t: "move", dx: 1, dy: 0 });
        assert.equal(bump.turn, turnBefore, "곡괭이를 배낭에 넣은 채로 팠다");
        assert.equal(bump.level.tiles[idx(11, 10)], T.ROCK);
        assert.equal(bump.heroes[0].dig, undefined);
    }
});

test("곡괭이로 파다 만 자리 — 이어 파기 · 층이 바뀌면 처음부터 · 배는 고파진다", () => {
    const s = newGame(51, {}, {}, {}, {}, "archeologist");
    const h = s.heroes[0];
    h.x = 10;
    h.y = 10;
    h.food = 1300;
    s.level.monsters = [];
    s.level.tiles[idx(10, 10)] = T.FLOOR;
    s.level.tiles[idx(11, 10)] = T.ROCK;

    // ── 같은 칸을 다시 파면 쌓인다
    let st = perform(s, { t: "move", dx: 1, dy: 0 });
    const first = st.heroes[0].dig!.effort;
    const foodAfterOne = st.heroes[0].food;
    assert.ok(foodAfterOne < 1300, "파는 턴에 배가 안 고파진다 — 파기가 공짜 걸음이 된다");
    st = perform(st, { t: "move", dx: 1, dy: 0 });
    if (st.level.tiles[idx(11, 10)] === T.ROCK) {
        assert.ok(st.heroes[0].dig!.effort > first, "같은 칸을 이어 팠는데 힘이 안 쌓였다");
    }

    // ── 다른 층의 같은 좌표는 이어 파지 않는다
    const s2 = newGame(52, {}, {}, {}, {}, "archeologist");
    const h2 = s2.heroes[0];
    h2.x = 10;
    h2.y = 10;
    s2.level.monsters = [];
    s2.level.tiles[idx(10, 10)] = T.FLOOR;
    s2.level.tiles[idx(11, 10)] = T.ROCK;
    h2.dig = { x: 11, y: 10, depth: 7, effort: DIG_WALL_EFFORT - 1 };
    const after = perform(s2, { t: "move", dx: 1, dy: 0 });
    assert.equal(after.level.tiles[idx(11, 10)], T.ROCK, "7층에서 파던 힘이 1층의 같은 칸에 얹혔다");
    assert.equal(after.heroes[0].dig?.depth, 1);
});

test("곡괭이를 쥐어도 계단 위에서는 계단으로 내려가고, 올라가는 계단은 못 판다", () => {
    // ── 계단 위: 파지 않고 곧장 내려가 **올라가는 계단 위**에 선다(떨어진 것이 아니다)
    {
        const s = newGame(61, {}, {}, {}, {}, "archeologist");
        const h = s.heroes[0];
        h.x = s.level.stairs.x;
        h.y = s.level.stairs.y;
        const down = perform(s, { t: "descend" });
        assert.equal(down.level.depth, 2);
        assert.equal(down.heroes[0].dig, undefined, "계단 위에서 발밑을 팠다");
        assert.deepEqual({ x: down.heroes[0].x, y: down.heroes[0].y }, down.level.upStairs, "계단으로 내려왔는데 아무 데나 떨어졌다");
    }
    // ── 올라가는 계단 위는 못 판다 — 턴도 안 쓴다
    {
        const s = newGame(62, {}, {}, {}, {}, "archeologist");
        const h = s.heroes[0];
        h.x = 10;
        h.y = 10;
        s.level.tiles[idx(10, 10)] = T.FLOOR;
        s.level.upStairs = { x: 10, y: 10 };
        s.level.anvil = null;
        const turnBefore = s.turn;
        const refused = perform(s, { t: "descend" });
        assert.equal(refused.turn, turnBefore, "올라가는 계단을 파려다 턴을 썼다");
        assert.equal(refused.heroes[0].dig, undefined);
    }
});

test("협동 — 곡괭이는 쥔 사람의 것이고, 발밑이 뚫리면 파티가 같이 떨어진다", () => {
    const s = joinGame(newGame(71, {}, {}, {}, {}, "knight"), "archeologist");
    const [host, guest] = s.heroes;
    assert.equal(guest.origin, "archeologist");
    assert.equal(heldPickAxe(guest)?.type, "pick-axe", "손님 고고학자가 곡괭이를 안 쥐었다");
    s.level.monsters = [];
    guest.x = 10;
    guest.y = 10;
    guest.food = 1300;
    host.x = 12;
    host.y = 10;
    s.level.tiles[idx(10, 10)] = T.FLOOR;
    s.level.tiles[idx(12, 10)] = T.FLOOR;
    s.level.tiles[idx(11, 10)] = T.FLOOR;
    s.level.upStairs = { x: 3, y: 3 };
    s.level.anvil = { x: 3, y: 4 };

    // ── 방장(곡괭이 없음)이 계단 밖에서 내려가도 아무 일 없다 — 손님의 곡괭이를 안 빌린다
    const turnBefore = s.turn;
    const hostTry = perform(s, { t: "descend", who: 0 });
    assert.equal(hostTry.turn, turnBefore, "방장이 손님의 곡괭이로 팠다");

    // ── 손님이 판다 — 파던 자리는 손님에게만 남는다
    let st = perform(s, { t: "descend", who: 1 });
    assert.ok(st.heroes[1].dig, "손님이 판 자리가 손님에게 없다");
    assert.equal(st.heroes[0].dig, undefined, "손님이 판 자리가 방장에게 남았다");

    // ── 다 뚫리면 둘 다 아래층에 선다
    for (let i = 0; i < 40 && st.level.depth === 1; i++) st = perform(st, { t: "descend", who: 1 });
    assert.equal(st.level.depth, 2, "손님이 발밑을 40턴 파도 안 떨어진다");
    for (const h of st.heroes) {
        assert.ok(h.x >= 0 && h.y >= 0, "파티 한 사람이 층 밖에 남았다");
        assert.ok(walkable(st.level.tiles[idx(h.x, h.y)] as Tile), `(${h.x},${h.y}) 바위 속에 떨어졌다`);
    }
});
