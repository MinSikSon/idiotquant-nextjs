import assert from "node:assert/strict";
import { test } from "node:test";
import { addToPack, carryCapacity, dexHitBonus, encumbrance, gainExp, heroDamTerms, heroHitTerms, hpGainPerLevel, makeHero, packWeight, regenEvery, strDamBonus, strHitBonus } from "@/lib/rogue/hero";
import { newGame, perform, spellCastingChance } from "@/lib/rogue/game";
import { Rng } from "@/lib/rogue/rng";
import { charismaPriceFactor, unitPrice } from "@/lib/rogue/shop";
import { itemWeight, makeItem } from "@/lib/rogue/items";

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
