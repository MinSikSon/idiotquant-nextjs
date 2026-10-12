import assert from "node:assert/strict";
import { test } from "node:test";
import { addToPack, carryCapacity, dexHitBonus, encumbrance, gainExp, heroConstitution, heroDamTerms, heroHitTerms, hpGainPerLevel, makeHero, packWeight, prayerTimeoutLimit, regenEvery, strDamBonus, strHitBonus } from "@/lib/rogue/hero";
import { glyphAt, newGame, perform, spellCastingChance, survey } from "@/lib/rogue/game";
import { SEEN } from "@/lib/rogue/fov";
import { spawnMonster } from "@/lib/rogue/monsters";
import { Rng } from "@/lib/rogue/rng";
import { MAP_W, T } from "@/lib/rogue/types";
import { charismaPriceFactor, unitPrice } from "@/lib/rogue/shop";
import { itemWeight, makeItem } from "@/lib/rogue/items";
import { deserialize, serialize } from "@/lib/rogue/storage";

test("NetHack 힘과 민첩의 명중·피해 구간을 따른다", () => {
    assert.deepEqual([3, 6, 8, 16, 17, 18].map((str) => strHitBonus(str, 3)), [-2, -1, 0, 0, 1, 1]);
    assert.equal(strHitBonus(16, 2), 1, "1~2레벨의 명중 보너스");
    assert.deepEqual([3, 6, 15, 16, 17, 18].map(strDamBonus), [-1, 0, 0, 1, 1, 2]);
    assert.deepEqual([3, 4, 6, 8, 13, 14, 15, 18].map(dexHitBonus), [-3, -2, -1, 0, 0, 0, 1, 4]);
});

test("NetHack 건강 구간이 레벨업 체력에 반영된다", () => {
    let id = 0;
    const hero = makeHero(new Rng(1), () => ++id);
    const base = hpGainPerLevel({ ...hero, constitution: 10 });
    assert.deepEqual([3, 6, 14, 15, 16, 17, 18].map((constitution) => hpGainPerLevel({ ...hero, constitution }) - base), [-2, -1, 0, 1, 1, 2, 3]);
    assert.equal(regenEvery(hero), 15);
    assert.equal(regenEvery({ ...hero, level: 9 }), 4);
    assert.equal(regenEvery({ ...hero, level: 10 }), 3);
});

test("건강 반지가 레벨 10 이후 자연 회복량에도 반영된다", () => {
    const state = newGame(191);
    const hero = state.heroes[0];
    hero.level = 10;
    hero.constitution = 10;
    hero.hp = 20;
    hero.maxHp = 100;
    const ring = makeItem("ring", "constitution", state.nextItemId++, -1, -1);
    ring.plusRing = 3;
    ring.letter = "z";
    hero.pack.push(ring);
    hero.leftRingId = ring.id;
    assert.equal(heroConstitution(hero), 13);

    // 자연 회복 발동 턴(3의 배수)을 만든다. Con 13이면 1~3HP를 회복한다.
    state.turn = 2;
    const after = perform(state, { t: "rest" });
    assert.ok(after.heroes[0].hp >= 21 && after.heroes[0].hp <= 23, `건강 반지 회복량이 잘못됐다: ${after.heroes[0].hp - 20}`);
});

test("전투는 힘의 명중 표와 별도 피해 표를 사용한다", () => {
    let id = 0;
    const hero = makeHero(new Rng(2), () => ++id);
    hero.level = 3;
    hero.str = 16;
    hero.dexterity = 15;
    assert.equal(heroHitTerms(hero).find((term) => term.why === "힘")?.n, 0);
    assert.equal(heroHitTerms(hero).find((term) => term.why === "민첩")?.n, 1);
    assert.equal(heroDamTerms(hero).find((term) => term.why === "힘")?.n, 1);
});

test("NetHack 매력 구간이 구매가에 반영된다", () => {
    assert.deepEqual([5, 7, 10, 11, 15, 16, 18, 19].map(charismaPriceFactor), [2, 1.5, 4 / 3, 1, 1, 0.75, 2 / 3, 0.5]);
    const potion = makeItem("potion", "healing", 1, 0, 0);
    assert.equal(unitPrice(potion), 100, "캐릭터가 없는 도감 가격은 기본가");
    assert.equal(unitPrice(potion, 10), 133);
    assert.equal(unitPrice(potion, 18), 67);
});

test("힘과 건강이 무게 한도를 정하고 과적은 명중과 이동을 제한한다", () => {
    let id = 0;
    const hero = makeHero(new Rng(3), () => ++id);
    const capacity = carryCapacity(hero);
    assert.equal(carryCapacity({ ...hero, str: hero.str + 1 }), Math.min(1000, capacity + 25));
    assert.equal(carryCapacity({ ...hero, constitution: hero.constitution + 1 }), Math.min(1000, capacity + 25));
    const heavy = makeItem("armor", "plate mail", ++id, -1, -1);
    assert.equal(itemWeight(heavy), 450);
    assert.ok(addToPack(hero, heavy));
    assert.ok(packWeight(hero) >= 450);
    assert.ok(encumbrance(hero) >= 0);
    const excess = makeItem("potion", "healing", ++id, -1, -1, 200);
    const before = packWeight(hero);
    assert.equal(addToPack(hero, excess), null);
    assert.equal(packWeight(hero), before);
});

test("짐을 덜어 과적 단계가 풀리면 명중 굴림에서 과적 보정도 사라진다", () => {
    let id = 0;
    const hero = makeHero(new Rng(31), () => ++id);
    const potion = makeItem("potion", "healing", ++id, -1, -1, 100);
    hero.pack = [potion];

    assert.ok(encumbrance(hero) > 0);
    assert.ok(heroHitTerms(hero).some((term) => term.why === "과적"));

    potion.count = 1;
    assert.equal(encumbrance(hero), 0);
    assert.ok(!heroHitTerms(hero).some((term) => term.why === "과적"));
});

test("기도 대기 허용치는 위기 때만 늘어난다", () => {
    let id = 0;
    const hero = makeHero(new Rng(32), () => ++id);
    assert.equal(prayerTimeoutLimit(hero), 0);
    assert.equal(prayerTimeoutLimit({ ...hero, food: 699 }), 100);
    assert.equal(prayerTimeoutLimit({ ...hero, hp: Math.floor(hero.maxHp / 4) }), 200);
});

test("지능은 마법책 학습, 지혜는 마력 성장과 직업별 시전에 반영된다", () => {
    const scholar = newGame(301, {}, {}, {}, {}, "scholar");
    const knight = newGame(302);
    assert.ok(spellCastingChance({ ...scholar.heroes[0], intelligence: 18 }, "healing") > spellCastingChance({ ...scholar.heroes[0], intelligence: 8 }, "healing"));
    assert.ok(spellCastingChance({ ...knight.heroes[0], wisdom: 18 }, "healing") > spellCastingChance({ ...knight.heroes[0], wisdom: 8 }, "healing"));
    const hero = scholar.heroes[0];
    hero.level = 10;
    hero.intelligence = 18;
    const book = makeItem("spellbook", "healing", 7000, -1, -1);
    assert.ok(addToPack(hero, book));
    const before = scholar.turn;
    perform(scholar, { t: "study", letter: book.letter! });
    assert.equal(scholar.turn, before + 1);
    assert.equal(book.studyCount, 1);
    assert.ok(hero.spells.healing > scholar.turn);
    hero.hp -= 5;
    const mana = hero.power;
    perform(scholar, { t: "cast", spell: "healing" });
    assert.equal(hero.power, mana - 5);
    assert.equal(perform(scholar, { t: "cast", spell: "unknown" }).turn, scholar.turn);

    const lowWis = makeHero(new Rng(4), () => 1);
    const highWis = { ...lowWis, wisdom: 18 };
    gainExp(lowWis, 10, new Rng(8));
    gainExp(highWis, 10, new Rng(8));
    assert.ok(highWis.maxPower > lowWis.maxPower);
});

test("마법책 세 종류를 익혀 시전하고, 실패·기억 만료·저장을 처리한다", () => {
    const state = newGame(303, {}, {}, {}, {}, "scholar");
    const hero = state.heroes[0];
    state.level.monsters = [];
    hero.level = 30;
    hero.intelligence = 100;
    hero.power = hero.maxPower = 100;
    for (const [i, spell] of ["healing", "detect monsters", "magic mapping"].entries()) {
        const book = makeItem("spellbook", spell, 7100 + i, -1, -1);
        assert.ok(addToPack(hero, book));
        const before = state.turn;
        perform(state, { t: "study", letter: book.letter! });
        assert.equal(state.turn, before + 1, `${spell}: 공부가 턴을 쓰지 않았다`);
        assert.equal(book.studyCount, 1, `${spell}: 책의 학습 횟수가 안 올랐다`);
        assert.ok(hero.spells[spell] > state.turn, `${spell}: 주문을 못 외웠다`);
        assert.equal(spellCastingChance(hero, spell), 100, `${spell}: 성공 경로를 확정할 수 없다`);
    }

    const healingBook = hero.pack.find((it) => it.kind === "spellbook" && it.type === "healing")!;
    perform(state, { t: "study", letter: healingBook.letter! });
    perform(state, { t: "study", letter: healingBook.letter! });
    assert.equal(healingBook.studyCount, 3);
    const exhaustedTurn = state.turn;
    perform(state, { t: "study", letter: healingBook.letter! });
    assert.equal(state.turn, exhaustedTurn, "세 번 읽은 책을 다시 읽으며 턴을 썼다");
    hero.blind = 1;
    const detectBook = hero.pack.find((it) => it.kind === "spellbook" && it.type === "detect monsters")!;
    perform(state, { t: "study", letter: detectBook.letter! });
    assert.equal(state.turn, exhaustedTurn, "눈이 먼 상태에서 책을 읽으며 턴을 썼다");
    hero.blind = 0;

    const restored = deserialize(serialize(state));
    assert.ok(restored, "주문을 외운 판이 저장 복원되지 않았다");
    assert.deepEqual(restored.heroes[0].spells, hero.spells);
    assert.equal(restored.heroes[0].pack.find((it) => it.type === "healing" && it.kind === "spellbook")?.studyCount, 3);

    hero.maxHp = 30;
    hero.hp = 20;
    const mana = hero.power;
    perform(state, { t: "cast", spell: "healing" });
    assert.ok(hero.hp > 20, "치유 주문이 체력을 회복하지 않았다");
    assert.equal(hero.power, mana - 5, "치유 마력 비용이 다르다");
    const hidden = state.level.tiles.findIndex((tile, i) => tile === T.FLOOR && !(state.level.flags[i] & SEEN));
    assert.ok(hidden >= 0, "탐지와 지도 작성 효과를 시험할 미탐사 칸이 없다");
    const hiddenX = hidden % MAP_W;
    const hiddenY = Math.floor(hidden / MAP_W);
    const monster = spawnMonster("B", hiddenX, hiddenY, new Rng(303));
    monster.awake = false;
    state.level.monsters = [monster];
    assert.equal(glyphAt(state, hiddenX, hiddenY), null, "시전 전 미탐사 칸에 괴물이 보인다");
    perform(state, { t: "cast", spell: "detect monsters" });
    assert.ok(hero.detect > 0, "괴물 탐지 주문이 감지를 켜지 않았다");
    assert.ok(survey(state).some((entry) => entry.id === monster.id), "괴물 탐지가 조사 목록에 발현되지 않았다");
    assert.equal(state.level.flags[monster.y * MAP_W + monster.x] & SEEN, 0, "탐지 시험 대상이 시야에 들어왔다");
    assert.deepEqual(glyphAt(state, monster.x, monster.y), { ch: "B", kind: "monster-sensed" }, "괴물 탐지가 미탐사 지도 칸에 표시되지 않았다");
    state.level.monsters = [];
    const unmapped = state.level.tiles.findIndex((tile, i) => tile === T.FLOOR && !(state.level.flags[i] & SEEN));
    assert.ok(unmapped >= 0, "지도 작성 효과를 시험할 미탐사 바닥이 없다");
    const mapX = unmapped % MAP_W;
    const mapY = Math.floor(unmapped / MAP_W);
    assert.equal(glyphAt(state, mapX, mapY), null, "지도 작성 전 미탐사 바닥이 보인다");
    const seenBefore = state.level.flags.reduce((n, flag) => n + (flag & SEEN ? 1 : 0), 0);
    perform(state, { t: "cast", spell: "magic mapping" });
    const seenAfter = state.level.flags.reduce((n, flag) => n + (flag & SEEN ? 1 : 0), 0);
    assert.ok(seenAfter > seenBefore, "지도 작성 주문이 지형을 밝히지 않았다");
    assert.notEqual(glyphAt(state, mapX, mapY), null, "지도 작성 주문이 지도 글자표에 발현되지 않았다");

    const beforeExpired = state.turn;
    hero.spells.healing = state.turn;
    perform(state, { t: "cast", spell: "healing" });
    assert.equal(state.turn, beforeExpired, "기억이 만료된 주문이 턴을 썼다");

    const novice = newGame(304);
    novice.level.monsters = [];
    const weak = novice.heroes[0];
    weak.wisdom = 3;
    weak.hp = Math.max(1, weak.maxHp - 5);
    weak.power = 10;
    weak.spells.healing = 100;
    assert.equal(spellCastingChance(weak, "healing"), 0);
    const weakMana = weak.power;
    const weakTurn = novice.turn;
    perform(novice, { t: "cast", spell: "healing" });
    assert.equal(novice.turn, weakTurn + 1, "실패한 시전이 턴을 쓰지 않았다");
    assert.equal(weak.power, weakMana - 2, "실패 시전은 마력 절반을 써야 한다");
});
