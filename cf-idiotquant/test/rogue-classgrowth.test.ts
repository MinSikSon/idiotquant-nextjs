// 레벨업은 체력과 무기 숙련을 올리며, 능력치를 고르는 단계는 없다.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
    alchemistHealMult,
    newGame,
    partyItemLuck,
    perform,
    rogueTrapEvade,
    scholarPreserveChance,
    type Command,
} from "@/lib/rogue/game";
import { EXP_LEVELS, gainExp, heroArmor, heroDefense } from "@/lib/rogue/hero";
import { defenseOf, itemTier, makeItem, randomItem } from "@/lib/rogue/items";
import {
    ADVANCED_GUARD_BONUS,
    ADVANCED_PRESERVE_CHANCE,
    ADVANCED_TRAP_EVADE,
    ADVANCE_LEVEL,
} from "@/lib/rogue/origins";
import { Rng } from "@/lib/rogue/rng";
import { spawnMonster } from "@/lib/rogue/monsters";
import { deserialize, serialize } from "@/lib/rogue/storage";
import { idx, type GameState } from "@/lib/rogue/types";
import { VISIBLE } from "@/lib/rogue/fov";

const run = (s: GameState, cmd: Command) => perform(s, cmd);

test("레벨업은 체력을 올리고 여섯 능력치는 그대로 둔다", () => {
    const state = newGame(700);
    const hero = state.heroes[0];
    const before = [hero.str, hero.dexterity, hero.constitution, hero.intelligence, hero.wisdom, hero.charisma];
    const hp = hero.maxHp;
    gainExp(hero, EXP_LEVELS[5], new Rng(1));
    assert.equal(hero.level, 7);
    assert.ok(hero.maxHp > hp);
    assert.deepEqual([hero.str, hero.dexterity, hero.constitution, hero.intelligence, hero.wisdom, hero.charisma], before);
    assert.equal("pendingSkillPicks" in hero, false);
});

test("전직 기술 — 근위대는 패시브, 나머지는 층마다 한 번 쓰는 액티브다", () => {
    const ready = (origin: "knight" | "rogue" | "alchemist" | "scholar", seed: number) => {
        const s = newGame(seed, {}, {}, {}, {}, origin);
        s.heroes[0].level = ADVANCE_LEVEL;
        s.level.monsters = [];
        return s;
    };
    const visibleMonster = (s: GameState) => {
        const h = s.heroes[0];
        const m = spawnMonster("K", h.x, h.y, new Rng(1));
        s.level.monsters.push(m);
        s.level.flags[idx(m.x, m.y)] |= VISIBLE;
        return m;
    };

    // 전직 전에는 턴도 사용 기회도 쓰지 않는다.
    const novice = newGame(730, {}, {}, {}, {}, "knight");
    const noviceTurn = novice.turn;
    run(novice, { t: "classSkill" });
    assert.equal(novice.turn, noviceTurn);
    assert.equal(novice.heroes[0].classSkillDepth, 0);

    const knight = ready("knight", 731);
    knight.heroes[0].hp = Math.floor(knight.heroes[0].maxHp / 2);
    const defenseBefore = heroDefense({ ...knight.heroes[0], level: ADVANCE_LEVEL - 1 });
    assert.equal(heroDefense(knight.heroes[0]), defenseBefore + 2, "기사단장의 불굴의 방벽이 발동하지 않았다");
    const knightTurn = knight.turn;
    run(knight, { t: "classSkill" });
    assert.equal(knight.turn, knightTurn, "패시브 기술이 턴을 썼다");
    assert.equal(knight.heroes[0].classSkillDepth, 0, "패시브 기술이 층별 사용 기회를 기록했다");

    const rogue = ready("rogue", 732);
    const watcher = visibleMonster(rogue);
    watcher.awake = true;
    watcher.target = 0;
    run(rogue, { t: "classSkill" });
    assert.equal(watcher.awake, false, "도적의 연막을 쓴 턴에 괴물이 다시 깨어났다");
    assert.equal(watcher.target, undefined);

    const alchemist = ready("alchemist", 733);
    const first = alchemist.heroes[0].pack.find((it) => it.kind === "potion")!;
    const second = makeItem("potion", "poison", 7330, -1, -1);
    second.letter = "z";
    alchemist.heroes[0].pack.push(second);
    run(alchemist, { t: "classSkill", ingredients: [first.letter!, "z"] });
    assert.ok(alchemist.heroes[0].pack.some((it) => it.kind === "potion" && it.type === "blessing"), "연금술사가 축복의 기름을 만들지 못했다");

    const scholar = ready("scholar", 734);
    run(scholar, { t: "classSkill" });
    assert.ok(scholar.heroes[0].detect > 0, "연구자가 괴물의 기척을 읽지 못했다");
    const usedTurn = scholar.turn;
    run(scholar, { t: "classSkill" });
    assert.equal(scholar.turn, usedTurn, "같은 층에서 전직 기술을 두 번 썼다");
    assert.equal(scholar.heroes[0].classSkillDepth, scholar.level.depth);
});


test("Luck은 일반 아이템의 등급과 난수 흐름을 바꾸지 않는다", () => {
    // ── luck=0 은 인자를 안 준 것과 완전히 같다 — 결과도 난수 소모도
    {
        const rngA = new Rng(42);
        const a = itemTier(10, rngA);
        const rngB = new Rng(42);
        const b = itemTier(10, rngB, 0);
        assert.equal(a, b, "luck=0 인데 등급이 다르다");
        assert.equal(rngA.state, rngB.state, "luck=0 인데 난수 소모가 달라졌다 — 안 고른 판의 시드가 갈린다");
    }

    // ── Luck 값이 달라도 같은 시드에서는 등급과 난수 흐름이 같다.
    {
        const N = 4000;
        let sumPlain = 0;
        const r1 = new Rng(7);
        for (let i = 0; i < N; i++) sumPlain += itemTier(10, r1, 0);
        let sumLucky = 0;
        const r2 = new Rng(7);
        for (let i = 0; i < N; i++) sumLucky += itemTier(10, r2, 0.3);
        assert.equal(sumLucky, sumPlain, "Luck이 일반 아이템 등급을 바꿨다");
        assert.equal(r1.state, r2.state, "Luck이 아이템 등급의 난수 흐름을 바꿨다");
    }

    // ── randomItem 에도 그대로 전달된다
    {
        const TRIALS = 500;
        for (let seed = 1; seed <= TRIALS; seed++) {
            const rPlain = new Rng(seed);
            const rLucky = new Rng(seed);
            // 같은 시드로 같은 분류를 뽑되, Luck 값만 다르게 준다.
            const plain = randomItem(10, seed, -1, -1, rPlain, "weapon", 0);
            const lucky = randomItem(10, seed, -1, -1, rLucky, "weapon", 0.5);
            assert.equal(lucky.type, plain.type, `시드 ${seed}: Luck이 물건 종류를 바꿨다`);
            assert.equal(lucky.plusHit, plain.plusHit, `시드 ${seed}: Luck이 물건 손질을 바꿨다`);
            assert.equal(rLucky.state, rPlain.state, `시드 ${seed}: Luck이 물건 난수 흐름을 바꿨다`);
        }
    }

    // ── partyItemLuck — **가장 높은 값**, 쓰러진 사람은 안 센다
    {
        const s = newGame(720);
        s.heroes[0].itemLuck = 0.1;
        assert.equal(partyItemLuck(s), 0.1);

        const s2 = newGame(721);
        s2.heroes[0].itemLuck = 0.1;
        s2.heroes.push({ ...s2.heroes[0], itemLuck: 0.3 });
        assert.equal(partyItemLuck(s2), 0.3, "더 높은 쪽을 안 썼다");

        s2.heroes[1].hp = 0;
        assert.equal(partyItemLuck(s2), 0.1, "쓰러진 사람의 아이템운을 그대로 셌다");
    }
});

test("전직(레벨 9) — 칭호가 바뀌고, 이미 있던 특성이 숫자만 깊어진다", () => {
    // ── 근위대: 대기(guarded) 방어 보너스가 +2 → +4
    {
        const s = newGame(730);
        const hero = s.heroes[0];
        hero.origin = "knight";
        hero.guarded = true;
        const bare = defenseOf(heroArmor(hero));

        hero.level = ADVANCE_LEVEL - 1;
        assert.equal(heroDefense(hero) - bare, 2, "전직 전인데 이미 강화된 보너스를 받는다");

        hero.level = ADVANCE_LEVEL;
        assert.equal(heroDefense(hero) - bare, ADVANCED_GUARD_BONUS, "전직했는데 보너스가 그대로다");
    }

    // ── 도적: 함정 회피 확률이 0.5 → ADVANCED_TRAP_EVADE
    {
        const s = newGame(731);
        const hero = s.heroes[0];
        hero.origin = "rogue";
        hero.level = ADVANCE_LEVEL - 1;
        assert.equal(rogueTrapEvade(hero), 0.5);
        hero.level = ADVANCE_LEVEL;
        assert.equal(rogueTrapEvade(hero), ADVANCED_TRAP_EVADE);
        // 다른 직업은 언제나 0 — 함정 회피 자체가 없다
        hero.origin = "knight";
        assert.equal(rogueTrapEvade(hero), 0);
    }

    // ── 연금술사: 회복 배율은 기본 특성 1.5배로 유지한다.
    {
        const s = newGame(732);
        const hero = s.heroes[0];
        hero.origin = "alchemist";
        hero.level = ADVANCE_LEVEL - 1;
        assert.equal(alchemistHealMult(hero), 1.5);
        hero.level = ADVANCE_LEVEL;
        assert.equal(alchemistHealMult(hero), 1.5);
        hero.origin = "scholar";
        assert.equal(alchemistHealMult(hero), 1, "연금술사가 아닌데 배율이 붙는다");
    }

    // ── 연구자: 주문서 보존 확률이 0.25 → ADVANCED_PRESERVE_CHANCE
    {
        const s = newGame(733);
        const hero = s.heroes[0];
        hero.origin = "scholar";
        hero.level = ADVANCE_LEVEL - 1;
        assert.equal(scholarPreserveChance(hero), 0.25);
        hero.level = ADVANCE_LEVEL;
        assert.equal(scholarPreserveChance(hero), ADVANCED_PRESERVE_CHANCE);
        hero.origin = "knight";
        assert.equal(scholarPreserveChance(hero), 0);
    }
});

test("옛 저장의 성장 선택권을 버리고 다른 상태는 유지한다", () => {
    // ── 저장 · 되읽기
    {
        const s0 = newGame(740);
        s0.heroes[0].bonusDefense = 3;
        s0.heroes[0].itemLuck = 0.15;
        const back = deserialize(serialize(s0));
        assert.ok(back, "되읽기가 실패했다");
        assert.equal("pendingSkillPicks" in back!.heroes[0], false);
        assert.equal(back!.heroes[0].bonusDefense, 3);
        assert.equal(back!.heroes[0].itemLuck, undefined, "옛 아이템운이 현재 저장에 남았다");
    }

    // ── 옛 저장에 남은 선택권은 복구하지 않는다.
    {
        const s0 = newGame(741);
        const raw = JSON.parse(serialize(s0));
        for (const h of raw.heroes) {
            h.pendingSkillPicks = 2;
            delete h.bonusDefense;
            delete h.itemLuck;
        }
        const back = deserialize(JSON.stringify(raw));
        assert.ok(back, "빈 칸이 있는 옛 저장을 못 읽었다");
        assert.equal("pendingSkillPicks" in back!.heroes[0], false);
        assert.equal(back!.heroes[0].bonusDefense, 0);
        assert.equal(back!.heroes[0].itemLuck, undefined);
    }
});
