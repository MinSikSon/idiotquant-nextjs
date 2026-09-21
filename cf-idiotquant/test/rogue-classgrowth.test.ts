// 레벨업 성장과 전직 — **원작에 없던 자리를 주인이 열었다.**
//
// `CLAUDE.md` 는 오래 「레벨 특성(고를 것을 주는 것)은 안 한다 — 원작 Rogue가 안 하는
// 것」이라고 이름까지 짚어 막아 두었다. 레벨업이 주는 것은 체력 +5 와 네 레벨마다 숙련
// +1 뿐이어야 했다. 이 파일은 그 규칙을 주인이 바꿔 연 자리를 건다 — 캠프 상자가
// 「판을 넘는 성장은 안 한다」를 열었던 것과 같은 결의 일이다.
//
// 열면서 값을 둘 붙였다:
//
//   ① **3레벨마다 성장 하나를 고른다** — 힘 · 방어력 · 아이템운. **캠프도, 턴도
//      필요 없다** — 레벨업 자체가 이미 턴을 안 쓰는 자리이기 때문이다(경험치는 몬스터를
//      잡을 때 는다). 한 번에 여러 레벨을 건너뛰면(경험치 배율 몬스터 등) 지나친 3의
//      배수만큼 쌓인다 — 하나만 세면 큰 사냥감 한 마리로 성장을 잃는다.
//   ② **전직(`ADVANCE_LEVEL` = 9)** — 숙련이 3→4 로 두 번째 오르는 자리에서 직업
//      칭호가 바뀌고, **이미 있던** 직업 특성(철벽의 자세 · 기습 암습 · 연금술의 통찰 ·
//      비전 전도)이 숫자만 깊어진다. 새 메커니즘을 안 만든 것은 「원작이 안 하던 것」의
//      틀을 최대한 지키기 위해서다 — 흔들리는 것은 규칙 하나(레벨 특성 금지)뿐이지,
//      「한 값은 한 자리에서 낸다」·「판을 걷는 동안 두는 것과 옵션 메뉴」 같은 다른
//      규칙까지 같이 흔들면 안 된다.
//
// **아이템운은 `luck = 0` 이면 `rng` 를 한 번도 더 안 건드린다.** 아무도 안 고른 판은
// 물건 뽑는 난수 흐름이 예전과 한 글자도 안 바뀐다 — 「시드가 같으면 판도 같다」가
// 고르지 않은 사람에게는 그대로 지켜진다.

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
import { defenseOf, itemTier, randomItem } from "@/lib/rogue/items";
import {
    ADVANCED_GUARD_BONUS,
    ADVANCED_HEAL_MULT,
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

    const rogue = ready("rogue", 732);
    const watcher = visibleMonster(rogue);
    watcher.awake = true;
    watcher.target = 0;
    run(rogue, { t: "classSkill" });
    assert.equal(watcher.awake, false, "도적의 연막을 쓴 턴에 괴물이 다시 깨어났다");
    assert.equal(watcher.target, undefined);

    const alchemist = ready("alchemist", 733);
    alchemist.heroes[0].hp = 1;
    alchemist.heroes[0].blind = 3;
    run(alchemist, { t: "classSkill" });
    assert.ok(alchemist.heroes[0].hp > 1);
    assert.equal(alchemist.heroes[0].blind, 0);

    const scholar = ready("scholar", 734);
    run(scholar, { t: "classSkill" });
    assert.ok(scholar.heroes[0].detect > 0, "연구자가 괴물의 기척을 읽지 못했다");
    const usedTurn = scholar.turn;
    run(scholar, { t: "classSkill" });
    assert.equal(scholar.turn, usedTurn, "같은 층에서 전직 기술을 두 번 썼다");
    assert.equal(scholar.heroes[0].classSkillDepth, scholar.level.depth);
});

test("레벨업 성장 — 3레벨마다 쌓이고, 여러 레벨을 건너뛰어도 안 놓친다", () => {
    // ── 3의 배수를 안 지나면 안 쌓인다 (레벨 1 → 2)
    {
        const s = newGame(700);
        const hero = s.heroes[0];
        const rng = new Rng(1);
        gainExp(hero, EXP_LEVELS[0], rng);
        assert.equal(hero.level, 2);
        assert.equal(hero.pendingSkillPicks, 0, "3의 배수를 안 지났는데 성장이 쌓였다");
    }

    // ── 3을 지나면 하나 (레벨 1 → 3)
    {
        const s = newGame(701);
        const hero = s.heroes[0];
        const rng = new Rng(1);
        gainExp(hero, EXP_LEVELS[1], rng);
        assert.equal(hero.level, 3);
        assert.equal(hero.pendingSkillPicks, 1, "레벨 3인데 성장이 하나가 아니다");
    }

    // ── **한 번에 3과 6을 둘 다 지나면 둘** (레벨 1 → 7, 큰 몬스터 한 마리를 흉내)
    {
        const s = newGame(702);
        const hero = s.heroes[0];
        const rng = new Rng(1);
        gainExp(hero, EXP_LEVELS[5], rng);
        assert.equal(hero.level, 7);
        assert.equal(hero.pendingSkillPicks, 2, "3과 6을 한 번에 지났는데 하나만 세었다 — 큰 사냥감이 성장을 삼켰다");
    }

    // ── 이미 성장이 있는 채로 또 지나면 **더해진다** (안 덮어쓴다)
    {
        const s = newGame(703);
        const hero = s.heroes[0];
        hero.pendingSkillPicks = 2;
        const rng = new Rng(1);
        gainExp(hero, EXP_LEVELS[1], rng); // 레벨 1 → 3, 3 하나를 더 지난다
        assert.equal(hero.pendingSkillPicks, 3, "쌓여 있던 성장이 사라졌다");
    }
});

test("성장 고르기 — 힘·방어·아이템운, 캠프도 턴도 필요 없다", () => {
    // ── 쌓인 것이 없으면 아무 일도 안 난다 — 주문서 대상 없이 읽는 것과 같은 자리
    {
        const s0 = newGame(710);
        assert.equal(s0.heroes[0].pendingSkillPicks, 0);
        const strBefore = s0.heroes[0].str;
        const turnBefore = s0.turn;
        const s1 = run(s0, { t: "pickSkill", option: "str" });
        assert.equal(s1.heroes[0].str, strBefore, "쌓인 게 없는데 힘이 올랐다");
        assert.equal(s1.turn, turnBefore, "아무 일도 안 일어났는데 턴을 썼다");
    }

    // ── 힘 — 물약(`quaff` 의 strength)과 같은 식으로 오르고 `maxStr` 을 따라간다
    {
        const s0 = newGame(711);
        const hero = s0.heroes[0];
        hero.pendingSkillPicks = 2;
        const strBefore = hero.str;
        const turnBefore = s0.turn;
        const s1 = run(s0, { t: "pickSkill", option: "str" });
        assert.equal(s1.heroes[0].str, strBefore + 1);
        assert.equal(s1.heroes[0].maxStr, strBefore + 1);
        assert.equal(s1.heroes[0].pendingSkillPicks, 1, "골랐는데 하나가 안 줄었다");
        // **턴을 안 쓴다** — 레벨업 자체가 턴을 안 쓰는 것과 같은 자리다.
        assert.equal(s1.turn, turnBefore, "성장을 고르는 데 턴을 썼다");
    }

    // ── 힘은 31 을 안 넘는다 — 물약의 상한과 같다
    {
        const s0 = newGame(712);
        const hero = s0.heroes[0];
        hero.str = 31;
        hero.pendingSkillPicks = 1;
        const s1 = run(s0, { t: "pickSkill", option: "str" });
        assert.equal(s1.heroes[0].str, 31, "힘이 상한(31)을 넘었다");
    }

    // ── 방어 — `heroDefense` **하나**에 그대로 얹힌다(딴 자리에서 따로 안 센다)
    {
        const s0 = newGame(713);
        const hero = s0.heroes[0];
        hero.pendingSkillPicks = 1;
        const before = heroDefense(hero);
        const s1 = run(s0, { t: "pickSkill", option: "def" });
        assert.equal(heroDefense(s1.heroes[0]), before + 1);
    }

    // ── 아이템운 — 5%씩 쌓이고 100%(1)를 넘지 않는다
    {
        const s0 = newGame(714);
        s0.heroes[0].pendingSkillPicks = 100;
        let s = s0;
        for (let i = 0; i < 30; i++) s = run(s, { t: "pickSkill", option: "luck" });
        assert.equal(s.heroes[0].itemLuck, 1, "아이템운이 100%에서 안 멈췄다");
    }

    // ── 캠프 밖에서도, 아무 층에서도 된다 — `stash`/`melt` 와 다른 자리다
    {
        const s0 = newGame(715);
        const hero = s0.heroes[0];
        hero.pendingSkillPicks = 1;
        // 모루가 아닌 칸으로 옮긴다 — 시작 자리가 하필 모루일 수 있다.
        const anvil = s0.level.anvil!;
        if (hero.x === anvil.x && hero.y === anvil.y) hero.x += 1;
        const s1 = run(s0, { t: "pickSkill", option: "str" });
        assert.equal(s1.heroes[0].pendingSkillPicks, 0, "캠프가 아니라서 성장이 막혔다");
    }
});

test("아이템운 — 0이면 난수를 한 번도 더 안 건드리고, 있으면 등급이 올라간다", () => {
    // ── luck=0 은 인자를 안 준 것과 완전히 같다 — 결과도 난수 소모도
    {
        const rngA = new Rng(42);
        const a = itemTier(10, rngA);
        const rngB = new Rng(42);
        const b = itemTier(10, rngB, 0);
        assert.equal(a, b, "luck=0 인데 등급이 다르다");
        assert.equal(rngA.state, rngB.state, "luck=0 인데 난수 소모가 달라졌다 — 안 고른 판의 시드가 갈린다");
    }

    // ── luck>0 은 평균 등급을 올린다(유리 굴림 — 두 번 굴려 높은 쪽)
    {
        const N = 4000;
        let sumPlain = 0;
        const r1 = new Rng(7);
        for (let i = 0; i < N; i++) sumPlain += itemTier(10, r1, 0);
        let sumLucky = 0;
        const r2 = new Rng(7);
        for (let i = 0; i < N; i++) sumLucky += itemTier(10, r2, 0.3);
        assert.ok(
            sumLucky / N > sumPlain / N,
            `아이템운이 있는데 평균 등급(${(sumLucky / N).toFixed(2)}) 이 없을 때(${(sumPlain / N).toFixed(2)}) 보다 안 높다`,
        );
    }

    // ── randomItem 에도 그대로 전달된다
    {
        let higher = 0;
        const TRIALS = 500;
        for (let seed = 1; seed <= TRIALS; seed++) {
            const rPlain = new Rng(seed);
            const rLucky = new Rng(seed);
            // 같은 시드로 같은 분류를 뽑되, luck 만 다르게 준다.
            const plain = randomItem(10, seed, -1, -1, rPlain, "weapon", 0);
            const lucky = randomItem(10, seed, -1, -1, rLucky, "weapon", 0.5);
            // enchantOf 를 직접 비교하긴 번거로우니 손질(plusHit)로 등급 상승의 낌새만 본다.
            if ((lucky.plusHit ?? 0) >= (plain.plusHit ?? 0)) higher++;
        }
        assert.ok(higher > TRIALS * 0.5, `아이템운을 줬는데 반 이상에서도 안 나아졌다 (${higher}/${TRIALS})`);
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

    // ── 연금술사: 회복 배율이 1.5 → ADVANCED_HEAL_MULT
    {
        const s = newGame(732);
        const hero = s.heroes[0];
        hero.origin = "alchemist";
        hero.level = ADVANCE_LEVEL - 1;
        assert.equal(alchemistHealMult(hero), 1.5);
        hero.level = ADVANCE_LEVEL;
        assert.equal(alchemistHealMult(hero), ADVANCED_HEAL_MULT);
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

test("레벨업 성장 — 저장했다 되읽어도 그대로다, 옛 저장은 0으로 채운다", () => {
    // ── 저장 · 되읽기
    {
        const s0 = newGame(740);
        s0.heroes[0].pendingSkillPicks = 2;
        s0.heroes[0].bonusDefense = 3;
        s0.heroes[0].itemLuck = 0.15;
        const back = deserialize(serialize(s0));
        assert.ok(back, "되읽기가 실패했다");
        assert.equal(back!.heroes[0].pendingSkillPicks, 2);
        assert.equal(back!.heroes[0].bonusDefense, 3);
        assert.equal(back!.heroes[0].itemLuck, 0.15);
    }

    // ── **옛 저장에는 이 칸들이 없다** — 안 채우면 성장 단추를 여는 순간 터진다
    {
        const s0 = newGame(741);
        const raw = JSON.parse(serialize(s0));
        for (const h of raw.heroes) {
            delete h.pendingSkillPicks;
            delete h.bonusDefense;
            delete h.itemLuck;
        }
        const back = deserialize(JSON.stringify(raw));
        assert.ok(back, "빈 칸이 있는 옛 저장을 못 읽었다");
        assert.equal(back!.heroes[0].pendingSkillPicks, 0);
        assert.equal(back!.heroes[0].bonusDefense, 0);
        assert.equal(back!.heroes[0].itemLuck, 0);

        // 실제로 굴려 본다 — 고르기까지 한 번 지나가야 「불러와지긴 하는데 터진다」가 없다.
        back!.heroes[0].pendingSkillPicks = 1;
        const played = run(back!, { t: "pickSkill", option: "def" });
        assert.equal(played.heroes[0].bonusDefense, 1);
    }
});
