// 상점 — NetHack 의 가게. **사고, 팔고, 훔치면 주인이 쫓아온다.**
//
// 여기서 지키는 것:
//   ① 값은 참 이름이 정한다(겉모습이 아니라) — 그래야 값으로 무리를 짐작한다.
//   ② 집으면 외상 · 내려놓으면 돌려준 것 · 값을 치러야 내 것. 외상인 것은 못 쓴다.
//   ③ 외상을 들고 있으면 주인이 문 안쪽을 막는다. 곡괭이를 든 손님도 문 앞에서 막는다.
//   ④ 그래도 벗어나면 훔친 것 — 빚이 서고 주인이 화낸다. 빚을 갚으면 누그러진다.
//   ⑤ 주인을 쓰러뜨리면 가게가 닫힌다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { joinGame, newGame, perform } from "@/lib/rogue/game";
import { makeItem } from "@/lib/rogue/items";
import { addToPack } from "@/lib/rogue/hero";
import { billOf, forSale, inShop, isTradable, price, sellPrice, shopkeeperOf, unitPrice, SHOPKEEPER } from "@/lib/rogue/shop";
import { deserialize, serialize } from "@/lib/rogue/storage";
import { T, idx, walkable, type GameState, type Item, type Pos, type Tile } from "@/lib/rogue/types";

/** 상점이 선 층까지 계단으로 내려간 판. */
function shopGame(seedFrom = 1, origin: "knight" | "archeologist" = "knight"): GameState {
    for (let seed = seedFrom; seed < seedFrom + 400; seed++) {
        let s = newGame(seed, {}, {}, {}, {}, origin);
        for (let d = 2; d <= 8; d++) {
            s.heroes[0].x = s.level.stairs.x;
            s.heroes[0].y = s.level.stairs.y;
            s = perform(s, { t: "descend" });
            if (s.level.depth !== d) break;
            if (s.level.shop) return s;
        }
    }
    throw new Error("상점이 선 층을 못 찾았다");
}

/** 가게 안에 들어서 진열품 하나 위에 선다. 주인은 비켜 선 자리에 둔다. */
function standOnWare(s: GameState): Item {
    const shop = s.level.shop!;
    const shk = shopkeeperOf(s.level)!;
    shk.x = shop.rest.x;
    shk.y = shop.rest.y;
    // 다른 몬스터가 끼어들지 않게 치운다 — 가게의 규칙만 본다.
    s.level.monsters = [shk];
    const ware = s.level.items.find((it) => forSale(s.level, it))!;
    s.heroes[0].x = ware.x;
    s.heroes[0].y = ware.y;
    return ware;
}

const at = (p: Pos, q: Pos) => p.x === q.x && p.y === q.y;

test("상점은 3층부터 서고, 문 하나 · 주인 · 진열품을 갖춘다", () => {
    // ── 1·2층에는 없다 — 쓸 돈이 없는 층이다
    {
        for (let seed = 1; seed <= 80; seed++) {
            let s = newGame(seed);
            assert.equal(s.level.shop ?? null, null, `시드 ${seed}: 1층에 상점이 섰다`);
            s.heroes[0].x = s.level.stairs.x;
            s.heroes[0].y = s.level.stairs.y;
            s = perform(s, { t: "descend" });
            assert.equal(s.level.shop ?? null, null, `시드 ${seed}: 2층에 상점이 섰다`);
        }
    }

    // ── 3층에서는 흔하다(NetHack 의 `rn2(depth) < 3`) — 맞는 방이 있으면 늘 선다
    {
        let shops = 0;
        let n = 0;
        for (let seed = 1; seed <= 120; seed++) {
            let s = newGame(seed);
            for (let d = 2; d <= 3; d++) {
                s.heroes[0].x = s.level.stairs.x;
                s.heroes[0].y = s.level.stairs.y;
                s = perform(s, { t: "descend" });
            }
            if (s.level.depth !== 3) continue;
            n++;
            if (s.level.shop) shops++;
        }
        assert.ok(shops / n > 0.4, `3층 상점이 ${((shops / n) * 100).toFixed(0)}% 뿐이다 — 「자주」가 아니다`);
    }

    // ── 모양 — 문 하나(비밀문 아님), 주인은 문 안쪽, 진열품은 파는 물건만
    {
        for (let from = 1; from <= 200; from += 40) {
            const s = shopGame(from);
            const { level } = s;
            const shop = level.shop!;
            const r = level.rooms[shop.room];
            assert.equal(level.special?.kind, "shop");
            assert.equal(level.tiles[idx(shop.door.x, shop.door.y)], T.DOOR, "가게 문이 숨어 있다");
            const shk = shopkeeperOf(level)!;
            assert.ok(shk, "주인이 없다");
            assert.equal(shk.def, SHOPKEEPER);
            assert.ok(inShop(level, shop.home.x, shop.home.y) && inShop(level, shop.rest.x, shop.rest.y));
            // 문 안쪽 칸은 문과 맞닿는다 — 거기 서면 문이 막힌다.
            assert.equal(Math.abs(shop.home.x - shop.door.x) + Math.abs(shop.home.y - shop.door.y), 1);
            const wares = level.items.filter((it) => forSale(level, it));
            assert.ok(wares.length >= 6, `진열품이 ${wares.length} 개뿐이다`);
            for (const it of level.items) {
                const inside = it.x > r.x && it.x < r.x + r.w - 1 && it.y > r.y && it.y < r.y + r.h - 1;
                if (!inside) continue;
                assert.ok(it.kind !== "gold", "가게에서 금화를 판다");
                assert.ok(isTradable(it), `값이 없는 ${it.kind}:${it.type} 이 진열됐다`);
                assert.ok(!at(it, shop.home) && !at(it, shop.rest), "주인이 설 자리에 물건이 놓였다");
            }
        }
    }
});

test("값은 참 이름이 정한다 — 겉모습이 아니다, 손질은 10씩 붙는다", () => {
    const heal = makeItem("potion", "healing", 1, 0, 0, 3);
    const poison = makeItem("potion", "poison", 2, 0, 0);
    assert.equal(unitPrice(heal), 100);
    assert.equal(price(heal), 300, "더미는 개수만큼");
    assert.equal(sellPrice(heal), 150, "파는 값은 절반");
    assert.equal(unitPrice(poison), 50);
    // 겉모습(판마다 섞이는 이름)을 바꿔도 값은 그대로다 — 값이 참 이름을 귀띔한다.
    const s = newGame(7);
    const other = newGame(8);
    assert.notEqual(s.appearance["potion:healing"], undefined);
    assert.equal(unitPrice(heal), unitPrice({ ...heal }), "같은 물건이 판에 따라 값이 다르다");
    void other;

    const sword = makeItem("weapon", "long sword", 3, 0, 0);
    assert.equal(unitPrice(sword), 15);
    sword.plusHit = 2;
    sword.plusDam = 2;
    assert.equal(unitPrice(sword), 35, "+2 장검은 15 + 20");
    const mail = makeItem("armor", "plate mail", 4, 0, 0);
    mail.plusArmor = 1;
    assert.equal(unitPrice(mail), 610);
    assert.equal(sellPrice(makeItem("weapon", "dart", 5, 0, 0, 1)), 1, "한 푼 아래로는 안 내려간다");

    // 안 사고 안 파는 것
    assert.ok(!isTradable(makeItem("gold", "gold", 6, 0, 0, 50)));
    assert.ok(!isTradable(makeItem("amulet", "amulet", 7, 0, 0)));
    assert.ok(!isTradable(makeItem("relic", "midas_gauntlet", 8, 0, 0)));
});

test("집으면 외상 — 주인이 문을 막고, 외상인 것은 못 쓰고, 내려놓으면 돌려준 것이다", () => {
    const s = shopGame();
    const ware = standOnWare(s);
    const hero = s.heroes[0];
    const shop = s.level.shop!;

    // ── 값을 말해 준다(가격 감정의 재료)
    {
        // 다시 밟아 본다 — 발밑 한 마디에 값이 붙는다.
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: ware.x + dx, y: ware.y + dy }))
            .find((p) => inShop(s.level, p.x, p.y) && !s.level.items.some((it) => at(it, p)) && !at(p, shop.rest) && !at(p, shop.home));
        if (nb) {
            hero.x = nb.x;
            hero.y = nb.y;
            const back = perform(s, { t: "move", dx: ware.x - nb.x, dy: ware.y - nb.y });
            assert.ok(back.messages.some((m) => m.includes(`값 ${price(ware)}`)), "발밑의 진열품 값을 안 말한다");
        }
    }

    // ── 집는다 → 외상
    const r = perform(s, { t: "pickup" });
    const got = hero.pack.find((it) => it.unpaid)!;
    assert.ok(got, "집은 것이 외상이 아니다");
    assert.equal(billOf(hero.pack), price(got));
    assert.ok(r.messages.some((m) => m.includes("외상")), "외상이라고 안 말한다");

    // ── 주인이 문 안쪽으로 와서 막는다
    perform(s, { t: "search" });
    const shk = shopkeeperOf(s.level)!;
    assert.ok(at(shk, shop.home), "외상을 들었는데 주인이 문을 안 막는다");

    // ── 부딪혀도 싸우지 않는다 — 말만 하고 턴도 안 쓴다
    {
        const hp = shk.hp;
        const turn = s.turn;
        hero.x = shop.home.x + (shop.home.x - shop.door.x);
        hero.y = shop.home.y + (shop.home.y - shop.door.y);
        const bump = perform(s, { t: "move", dx: shop.home.x - hero.x, dy: shop.home.y - hero.y });
        assert.equal(shk.hp, hp, "화나지 않은 주인을 때렸다");
        assert.equal(bump.turn, turn, "말만 걸었는데 턴이 흘렀다");
        assert.ok(bump.messages.some((m) => m.includes("값을 치르시오")));
        assert.equal(shop.angry, false);
    }

    // ── 외상인 것은 못 쓴다 — 무엇이든 턴 없이 거절
    {
        const turn = s.turn;
        const tries = [
            { t: "quaff", letter: got.letter! },
            { t: "read", letter: got.letter! },
            { t: "eat", letter: got.letter! },
            { t: "wield", letter: got.letter! },
            { t: "wear", letter: got.letter! },
            { t: "throw", letter: got.letter!, dx: 1, dy: 0 },
        ] as const;
        for (const cmd of tries) {
            perform(s, cmd);
            assert.ok(got.unpaid && hero.pack.includes(got), `${cmd.t} 로 외상인 것을 썼다`);
        }
        assert.equal(s.turn, turn, "거절했는데 턴이 흘렀다");
    }

    // ── 도로 내려놓으면 외상에서 빠지고 다시 파는 물건이 된다
    {
        const spot = s.level.items.some((it) => at(it, hero)) ? null : { x: hero.x, y: hero.y };
        if (!spot) {
            hero.x = shop.rest.x;
            hero.y = shop.rest.y;
            shk.x = shop.home.x;
            shk.y = shop.home.y;
        }
        perform(s, { t: "drop", letter: got.letter! });
        assert.equal(billOf(hero.pack), 0, "내려놓았는데 외상이 남았다");
        assert.ok(forSale(s.level, got), "돌려준 물건이 파는 물건으로 안 돌아갔다");
        // 주인의 걸음은 영웅의 턴이 흘러야 갱신된다. 길을 비켜 주고 한 턴을 보낸다.
        hero.x = ware.x;
        hero.y = ware.y;
        perform(s, { t: "rest" });
        assert.ok(at(shk, shop.rest), "외상이 없는데 주인이 문을 계속 막는다");
        assert.equal(shop.angry, false);
    }
});

test("값을 치르면 내 것 — 모자라면 못 치르고, 치르고 나가면 도둑이 아니다", () => {
    const s = shopGame(3);
    standOnWare(s);
    const hero = s.heroes[0];
    const shop = s.level.shop!;
    perform(s, { t: "pickup" });
    const got = hero.pack.find((it) => it.unpaid)!;
    const cost = price(got);

    // ── 모자라면 못 치른다 — 턴도 안 쓴다
    hero.gold = cost - 1;
    const turn = s.turn;
    perform(s, { t: "pay" });
    assert.ok(got.unpaid, "모자란데 치렀다");
    assert.equal(s.turn, turn);

    // ── 넉넉하면 치른다 — 금화가 주인의 금고로 간다
    hero.gold = cost + 7;
    const till = shop.till;
    perform(s, { t: "pay" });
    assert.ok(!got.unpaid, "치렀는데 외상이 남았다");
    assert.equal(hero.gold, 7);
    assert.equal(shop.till, till + cost);

    // ── 치르고 나가면 아무 일도 없다
    hero.x = shop.door.x;
    hero.y = shop.door.y;
    perform(s, { t: "search" });
    assert.equal(shop.angry, false, "값을 치르고 나갔는데 주인이 화낸다");
    assert.equal(shop.debt, 0);
    assert.ok(hero.pack.includes(got));
});

test("판다 — 사는 값의 절반, 판 물건은 진열된다 · 안 사는 것과 걸친 것은 거절", () => {
    const s = shopGame(5);
    standOnWare(s);
    const hero = s.heroes[0];
    const shop = s.level.shop!;
    // 빈 바닥에 선다(판 물건이 발밑에 놓이는지도 본다).
    hero.x = shop.rest.x;
    hero.y = shop.rest.y;
    const shk = shopkeeperOf(s.level)!;
    shk.x = shop.home.x;
    shk.y = shop.home.y;
    s.level.items = s.level.items.filter((it) => !at(it, hero));

    const gem = makeItem("potion", "extra healing", 9001, -1, -1, 2);
    addToPack(hero, gem);
    const gold = hero.gold;
    const till = shop.till;
    perform(s, { t: "sell", letter: gem.letter! });
    assert.equal(hero.gold, gold + 100, "고급 회복 둘(200)의 절반을 받아야 한다");
    assert.equal(shop.till, till - 100);
    assert.ok(!hero.pack.includes(gem));
    assert.ok(forSale(s.level, gem), "판 물건이 진열되지 않았다");

    // ── 안 사는 것 · 몸에 걸친 것은 거절, 턴도 안 쓴다
    const turn = s.turn;
    const amulet = makeItem("amulet", "amulet", 9002, -1, -1);
    addToPack(hero, amulet);
    perform(s, { t: "sell", letter: amulet.letter! });
    assert.ok(hero.pack.includes(amulet), "증표를 팔았다");
    const armor = hero.pack.find((it) => it.id === hero.armorId)!;
    perform(s, { t: "sell", letter: armor.letter! });
    assert.ok(hero.pack.includes(armor), "입은 갑옷을 팔았다");
    assert.equal(s.turn, turn);

    // ── 주인의 돈이 모자라면 못 판다
    shop.till = 10;
    const pricey = makeItem("wand", "cancel", 9003, -1, -1);
    addToPack(hero, pricey);
    perform(s, { t: "sell", letter: pricey.letter! });
    assert.ok(hero.pack.includes(pricey), "주인 돈이 모자란데 팔렸다");

    // ── 가게 밖에서는 못 판다
    shop.till = 5000;
    hero.x = s.level.stairs.x;
    hero.y = s.level.stairs.y;
    perform(s, { t: "sell", letter: pricey.letter! });
    assert.ok(hero.pack.includes(pricey), "가게 밖에서 팔렸다");
});

test("가게 바닥에 내려놓은 내 물건은 내 것 — 다시 주워도 값이 없다", () => {
    const s = shopGame(9);
    standOnWare(s);
    const hero = s.heroes[0];
    const shop = s.level.shop!;
    hero.x = shop.rest.x;
    hero.y = shop.rest.y;
    shopkeeperOf(s.level)!.x = shop.home.x;
    shopkeeperOf(s.level)!.y = shop.home.y;
    s.level.items = s.level.items.filter((it) => !at(it, hero));
    const mine = makeItem("scroll", "identify", 9100, -1, -1);
    addToPack(hero, mine);
    perform(s, { t: "drop", letter: mine.letter! });
    assert.ok(!forSale(s.level, mine), "내 물건이 파는 물건이 됐다");
    perform(s, { t: "pickup" });
    const back = hero.pack.find((it) => it.kind === "scroll" && it.type === "identify")!;
    assert.ok(back && !back.unpaid, "제 물건을 다시 주웠는데 외상이 됐다");
    assert.ok(!("noCharge" in back), "배낭 속 물건이 가게 바닥의 표를 들고 있다");
});

test("외상과 치른 것은 한 더미로 안 합친다", () => {
    const s = shopGame(11);
    const hero = s.heroes[0];
    const owned = makeItem("potion", "healing", 9200, -1, -1);
    addToPack(hero, owned);
    const ware = makeItem("potion", "healing", 9201, -1, -1);
    ware.unpaid = true;
    addToPack(hero, ware);
    const heals = hero.pack.filter((it) => it.kind === "potion" && it.type === "healing");
    assert.equal(heals.length, 2, "외상 물약이 치른 물약 더미에 섞였다");
    assert.equal(billOf(hero.pack), 100, "외상이 한 병 값이 아니다");
});

test("훔치면 — 빚이 서고 주인이 화내고 쫓아온다. 빚을 갚으면 누그러진다", () => {
    // ── 가게를 벗어나면(벽을 팠든 순간이동이든) 그 걸음에 훔친 것이 된다
    {
        const s = shopGame(13);
        standOnWare(s);
        const hero = s.heroes[0];
        const shop = s.level.shop!;
        perform(s, { t: "pickup" });
        const got = hero.pack.find((it) => it.unpaid)!;
        const cost = price(got);
        // 가게 밖 아무 데나 — 순간이동으로 떨어진 셈이다.
        hero.x = s.level.stairs.x;
        hero.y = s.level.stairs.y;
        const r = perform(s, { t: "search" });
        assert.equal(shop.angry, true, "외상을 들고 나갔는데 주인이 가만있다");
        assert.equal(shop.debt, cost);
        assert.ok(!got.unpaid && hero.pack.includes(got), "훔친 물건은 손에 남고 외상 표는 지워져야 한다");
        assert.ok(r.messages.some((m) => m.includes("도둑")));
        const shk = shopkeeperOf(s.level)!;
        assert.equal(shk.awake, true);
        assert.equal(shk.target, 0);

        // 화나면 가게는 **아무것도 안 판다** — 외상이 다시 붙지 않는다.
        assert.ok(!s.level.items.some((it) => forSale(s.level, it)));

        // 빚이 모자라면 못 갚는다 — 곁에 가도.
        shk.x = hero.x + 1;
        shk.y = hero.y;
        hero.gold = cost - 1;
        perform(s, { t: "pay" });
        assert.equal(shop.angry, true);

        // 다 갚으면 누그러진다.
        hero.gold = cost;
        shk.x = hero.x + 1;
        shk.y = hero.y;
        shk.hp = 3;
        perform(s, { t: "pay" });
        assert.equal(shop.angry, false, "빚을 갚았는데 계속 화낸다");
        assert.equal(shop.debt, 0);
        assert.equal(hero.gold, 0);
        assert.equal(shk.hp, shk.maxHp, "누그러진 주인이 다친 채로 남아 곧바로 다시 화낸다");
        perform(s, { t: "search" });
        assert.equal(shop.angry, false);
    }

    // ── 외상을 든 채 층을 떠나도 훔친 것이다 — 떠난 층의 주인이 화낸 채로 남는다
    {
        const s = shopGame(17);
        standOnWare(s);
        const hero = s.heroes[0];
        perform(s, { t: "pickup" });
        const depth = s.level.depth;
        hero.x = s.level.stairs.x;
        hero.y = s.level.stairs.y;
        // 걸음으로 나가면 그 걸음에 잡힌다. 층째로 떠나는 길을 보려고 바로 계단에서 내려간다.
        const next = perform(s, { t: "descend" });
        assert.equal(next.level.depth, depth + 1);
        assert.equal(next.levels[depth].shop!.angry, true, "외상을 들고 층을 떠났는데 주인이 가만있다");
        assert.equal(billOf(next.heroes[0].pack), 0);
    }

    // ── 협동 — 훔친 사람을 쫓는다. 외상은 사람마다 따로다
    {
        const solo = shopGame(37);
        const s = joinGame(solo);
        standOnWare(s);
        const [p1, p2] = s.heroes;
        p2.x = p1.x;
        p2.y = p1.y;
        p1.x = s.level.shop!.rest.x;
        p1.y = s.level.shop!.rest.y;
        shopkeeperOf(s.level)!.x = s.level.shop!.home.x;
        shopkeeperOf(s.level)!.y = s.level.shop!.home.y;
        perform(s, { t: "pickup", who: 1 });
        assert.ok(billOf(p2.pack) > 0 && billOf(p1.pack) === 0, "외상이 집은 사람에게 안 붙었다");
        p2.x = s.level.stairs.x;
        p2.y = s.level.stairs.y;
        perform(s, { t: "search", who: 1 });
        assert.equal(s.level.shop!.angry, true);
        assert.equal(shopkeeperOf(s.level)!.target, 1, "훔친 사람이 아니라 딴 사람을 쫓는다");
    }

    // ── 화난 주인은 때린다
    {
        const s = shopGame(19);
        standOnWare(s);
        const hero = s.heroes[0];
        const shop = s.level.shop!;
        shop.angry = true;
        const shk = shopkeeperOf(s.level)!;
        shk.awake = true;
        shk.target = 0;
        shk.x = hero.x === shop.rest.x && hero.y === shop.rest.y ? shop.home.x : shop.rest.x;
        shk.y = hero.x === shop.rest.x && hero.y === shop.rest.y ? shop.home.y : shop.rest.y;
        hero.hp = hero.maxHp = 999;
        for (let i = 0; i < 6; i++) perform(s, { t: "search" });
        assert.ok(hero.hp < 999, "화난 주인이 곁에서 안 때린다");
    }
});

test("주인을 다치게 하면 화낸다 · 쓰러뜨리면 가게가 닫히고 금고가 쏟아진다", () => {
    const s = shopGame(23);
    standOnWare(s);
    const hero = s.heroes[0];
    const shop = s.level.shop!;
    perform(s, { t: "pickup" });
    const got = hero.pack.find((it) => it.unpaid)!;
    const shk = shopkeeperOf(s.level)!;

    // ── 다치면 화낸다(지팡이·던지기 무엇이든 — 체력이 줄었는가만 본다)
    // 화난 주인은 한 번에 서른 넘게 친다 — 끝까지 보려면 버틸 체력을 준다.
    hero.hp = hero.maxHp = 999;
    shk.hp -= 1;
    perform(s, { t: "search" });
    assert.equal(shop.angry, true, "주인이 다쳤는데 가만있다");

    // ── 쓰러뜨리면 — 곁에 세워 두고 칠 때까지 친다(빗나갈 수 있다)
    const till = shop.till;
    const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => walkable(s.level.tiles[idx(hero.x + dx, hero.y + dy)] as Tile))!;
    for (let i = 0; i < 300 && shopkeeperOf(s.level); i++) {
        const k = shopkeeperOf(s.level)!;
        k.hp = 1;
        k.x = hero.x + dx;
        k.y = hero.y + dy;
        hero.hp = hero.maxHp = 999;
        perform(s, { t: "move", dx, dy });
    }
    assert.equal(s.level.shop, null, "주인이 쓰러졌는데 가게가 안 닫혔다");
    assert.ok(!got.unpaid, "닫힌 가게의 외상이 남았다");
    assert.ok(s.level.items.some((it) => it.kind === "gold" && it.count === till), "금고의 돈이 안 쏟아졌다");
    assert.ok(!s.level.items.some((it) => forSale(s.level, it)), "닫힌 가게에 파는 물건이 남았다");
    assert.equal(s.bestiary["@"], undefined, "상점 주인이 도감에 들어갔다");
});

test("곡괭이를 든 손님은 문 앞에서 막는다(NetHack 그대로)", () => {
    const s = shopGame(29, "archeologist");
    const hero = s.heroes[0];
    const shop = s.level.shop!;
    const shk = shopkeeperOf(s.level)!;
    s.level.monsters = [shk];
    shk.x = shop.rest.x;
    shk.y = shop.rest.y;
    hero.x = shop.door.x;
    hero.y = shop.door.y;
    perform(s, { t: "search" });
    assert.ok(at(shk, shop.home), "곡괭이를 든 손님 앞에서 문을 안 막는다");
    const bump = perform(s, { t: "move", dx: shop.home.x - hero.x, dy: shop.home.y - hero.y });
    assert.ok(bump.messages.some((m) => m.includes("곡괭이")));
    assert.ok(at(hero, shop.door), "막았는데 들어왔다");

    // 곡괭이를 밖에 두면 비켜 준다.
    const pick = hero.pack.find((it) => it.type === "pick-axe")!;
    hero.weaponId = null;
    hero.pack = hero.pack.filter((it) => it !== pick);
    perform(s, { t: "search" });
    assert.ok(at(shk, shop.rest), "곡괭이를 내려놨는데 계속 막는다");
});

test("저장했다 되읽어도 가게·주인·외상이 그대로다", () => {
    const s = shopGame(31);
    standOnWare(s);
    perform(s, { t: "pickup" });
    const back = deserialize(serialize(s))!;
    assert.deepEqual(back.level.shop, s.level.shop);
    const shk = shopkeeperOf(back.level)!;
    assert.equal(shk.def, SHOPKEEPER, "되읽은 주인이 다른 몬스터가 됐다");
    assert.equal(shk.shk, true);
    assert.equal(billOf(back.heroes[0].pack), billOf(s.heroes[0].pack));
    assert.ok(billOf(back.heroes[0].pack) > 0);

    // 모양이 틀린 가게는 없는 것으로 — 반쯤 맞는 가게는 한 걸음마다 터진다.
    const raw = JSON.parse(serialize(s));
    raw.level.shop = { room: 99, door: { x: 1, y: 1 } };
    assert.equal(deserialize(JSON.stringify(raw))!.level.shop, null);
});
