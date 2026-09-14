// 모루 — **강화를 옮겨 심는 자리.**
//
// 강화는 못 되돌린다. 4층에서 주운 장검에 주문서 다섯 장을 부어 `+5` 를 만들고 나면,
// 16층에서 목마른 자의 검이 떨어져도 그 다섯 장이 낡은 칼에 갇혀 있다. 그러면 **좋은
// 무기를 줍는 것이 반갑지 않은** 기묘한 자리가 생긴다. 모루가 그 자리를 연다.
//
// 거는 것:
//
//   ① **층마다 하나 있고, 계단과 겹치지 않는다.** 겹치면 내려가려다 녹이게 되거나
//      그 반대가 된다.
//   ② **모루 위에서만 녹는다.** 아무 데서나 되면 그건 장소가 아니라 그냥 명령이다.
//   ③ **쇠붙이 하나에 한 장이 깔린다.** 강화 안 된 칼도 한 장이 나온다 — 안 그러면
//      층마다 떨어지는 칼이 그냥 쓰레기이고, 모루는 이미 키운 무기를 갈아 끼울 때만
//      쓰는 좁은 칸이 된다. 강화된 것은 그 수치가 그대로 나온다(`+5` → 다섯 장).
//   ④ **화살·표창은 깔아 주지 않는다.** 한 번에 대여섯씩 떨어지는 것들이라 낱개마다
//      한 장을 깔면 한 판에 열여덟 장이 나오고(재 봤다) `+9` 가 그냥 걸어 들어온다.
//      나올 것이 없으면 **주문서도 턴도 안 쓴다**(못 박은 규칙 3).
//   ⑤ **한 자루씩** — 표창처럼 겹쳐 쌓인 것도 한 번에 하나다.
//   ⑥ **되뽑은 것을 그대로 다시 걸 수 있다** — 이 길이 막히면 모루가 아무것도 아니다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { addToPack, equippedWeapon, packItem } from "@/lib/rogue/hero";
import { makeItem, meltYield } from "@/lib/rogue/items";
import { buildLevel } from "@/lib/rogue/dungeon";
import { Rng } from "@/lib/rogue/rng";
import { walkable, type GameState, type Item, type Tile, idx } from "@/lib/rogue/types";

/** 모루 위에 세우고, 배낭에 `+plus` 짜리 무기 하나를 넣는다. */
function atAnvil(seed: number, plus: number, type = "long sword", count = 1) {
    const s = newGame(seed);
    const a = s.level.anvil!;
    s.hero.x = a.x;
    s.hero.y = a.y;
    const it = makeItem("weapon", type, 900, -1, -1, count);
    it.plusHit = plus;
    it.plusDam = plus;
    addToPack(s.hero, it);
    return { s, it };
}

/** 배낭에 든 무기 강화 주문서의 장수. */
function scrolls(s: GameState): number {
    return s.hero.pack
        .filter((p: Item) => p.kind === "scroll" && p.type === "enchant weapon")
        .reduce((n: number, p: Item) => n + p.count, 0);
}

test("모루는 층마다 하나 있고, 걸어 들어갈 수 있는 칸에 선다", () => {
    const rng = new Rng(20260914);
    for (let depth = 1; depth <= 26; depth++) {
        const level = buildLevel(depth, rng);
        const a = level.anvil;
        assert.ok(a, `${depth}층에 모루가 없다`);
        assert.ok(walkable(level.tiles[idx(a.x, a.y)] as Tile), `${depth}층의 모루가 바위 속에 있다`);
        // 계단과 겹치면 내려가려다 녹이게 된다.
        assert.notDeepEqual({ x: a.x, y: a.y }, level.stairs, `${depth}층: 모루가 내려가는 계단 위다`);
        assert.notDeepEqual({ x: a.x, y: a.y }, level.upStairs, `${depth}층: 모루가 올라가는 계단 위다`);
    }
});

test("모루 위가 아니면 안 녹는다 — 턴도 안 쓴다", () => {
    const { s, it } = atAnvil(11, 5);
    // 한 칸 비켜선다.
    const away = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ].find(([dx, dy]) => walkable(s.level.tiles[idx(s.hero.x + dx, s.hero.y + dy)] as Tile))!;
    s.hero.x += away[0];
    s.hero.y += away[1];

    const turnBefore = s.turn;
    const after = perform(s, { t: "melt", letter: it.letter! });
    assert.ok(after.hero.pack.some((p) => p.id === it.id), "모루도 없는데 무기가 사라졌다");
    assert.equal(scrolls(after), 0, "모루도 없는데 주문서가 나왔다");
    assert.equal(after.turn, turnBefore, "아무 일도 안 났는데 턴이 갔다");
    assert.ok(after.messages.some((m) => m.includes("모루가 없다")));
});

test("나오는 장수는 강화 수치 그대로다 — 다만 아래가 한 장으로 깔린다", () => {
    for (let plus = 0; plus <= 9; plus++) {
        const { s, it } = atAnvil(100 + plus, plus);
        const after = perform(s, { t: "melt", letter: it.letter! });
        assert.ok(!after.hero.pack.some((p) => p.id === it.id), `+${plus}: 녹였는데 무기가 남았다`);
        assert.equal(scrolls(after), Math.max(1, plus), `+${plus} 에서 나온 장수가 다르다`);
    }
});

// 강화 안 된 칼도 한 장은 나와야 한다. 안 그러면 층마다 떨어지는 칼이 그냥 쓰레기이고,
// 모루는 **이미 키운 무기를 갈아 끼울 때만** 쓰는 좁은 칸이 된다.
test("강화 없는 무기도 한 장은 나온다", () => {
    const { s, it } = atAnvil(12, 0);
    assert.equal(meltYield(it), 1, "화면이 적을 장수부터 0 이다");
    const after = perform(s, { t: "melt", letter: it.letter! });
    assert.ok(!after.hero.pack.some((p) => p.id === it.id), "녹였는데 무기가 남았다");
    assert.equal(scrolls(after), 1);
});

// 한 번에 대여섯씩 떨어지는 것들이라(`stack`) 낱개마다 한 장을 깔면 한 판에 **열여덟
// 장**이 나온다 — 재 봤다. 그러면 `+9` 가 그냥 걸어 들어오고 도박 구간이 사라진다.
test("화살·표창은 깔아 주지 않는다 — 강화된 것만 되뽑는다", () => {
    for (const type of ["dart", "arrow", "silver arrow"]) {
        const { s, it } = atAnvil(30, 0, type, 6);
        assert.equal(meltYield(it), 0, `${type}: 강화도 없는데 나올 것이 있다`);
        const turnBefore = s.turn;
        const after = perform(s, { t: "melt", letter: it.letter! });
        assert.equal(after.hero.pack.find((p) => p.id === it.id)?.count, 6, `${type}: 한 대가 사라졌다`);
        assert.equal(scrolls(after), 0);
        assert.equal(after.turn, turnBefore, `${type}: 아무 일도 안 났는데 턴이 갔다`);
        assert.ok(after.messages.some((m) => m.includes("뽑아낼 것이 없다")));
    }
    // 강화된 화살은 그 수치만큼 나온다.
    const { s, it } = atAnvil(31, 3, "dart", 6);
    assert.equal(meltYield(it), 3);
    assert.equal(scrolls(perform(s, { t: "melt", letter: it.letter! })), 3);
});

test("겹쳐 쌓인 것은 한 자루씩 녹는다", () => {
    const { s, it } = atAnvil(13, 2, "dart", 6);
    const after = perform(s, { t: "melt", letter: it.letter! });
    const left = after.hero.pack.find((p) => p.id === it.id);
    assert.equal(left?.count, 5, "여섯 자루가 한꺼번에 녹았다");
    assert.equal(scrolls(after), 2, "한 자루 몫보다 많이 나왔다");
});

test("쥐고 있던 것을 녹이면 그 자리도 빈다", () => {
    const { s, it } = atAnvil(14, 3);
    s.hero.weaponId = it.id;
    const after = perform(s, { t: "melt", letter: it.letter! });
    assert.equal(equippedWeapon(after.hero), undefined, "녹았는데 아직 쥐고 있다");
    assert.equal(after.hero.weaponId, null);
});

test("쥐고 있는 저주받은 무기는 못 녹인다 — 내려놓지도 못하는 것이다", () => {
    const { s, it } = atAnvil(15, 4);
    it.cursed = true;
    s.hero.weaponId = it.id;
    const turnBefore = s.turn;
    const after = perform(s, { t: "melt", letter: it.letter! });
    assert.ok(after.hero.pack.some((p) => p.id === it.id), "손에 붙은 것이 녹았다");
    assert.equal(after.turn, turnBefore);
    assert.ok(after.messages.some((m) => m.includes("몸에서 떨어지지 않는다")));

    // 배낭에 든 저주받은 무기는 녹일 수 있다 — 손에 붙은 것이 아니다.
    s.hero.weaponId = null;
    const ok = perform(s, { t: "melt", letter: it.letter! });
    assert.equal(scrolls(ok), 4);
});

test("무기가 아니면 모루에 안 올라간다", () => {
    const { s } = atAnvil(16, 0);
    const armor = makeItem("armor", "plate mail", 950, -1, -1);
    armor.plusArmor = 5;
    addToPack(s.hero, armor);
    const after = perform(s, { t: "melt", letter: armor.letter! });
    assert.ok(after.hero.pack.some((p) => p.id === armor.id), "갑옷이 녹았다");
    assert.equal(scrolls(after), 0);
});

// 이것이 모루의 **존재 이유**다. 되뽑은 주문서를 새 칼에 못 거는 순간 모루는
// 「무기를 없애는 칸」이 된다.
test("되뽑은 주문서로 다른 무기를 올릴 수 있다 — 강화를 옮겨 심는다", () => {
    const { s, it } = atAnvil(17, 4, "long sword");
    const better = makeItem("weapon", "baphomet sword", 951, -1, -1);
    addToPack(s.hero, better);

    let after = perform(s, { t: "melt", letter: it.letter! });
    assert.equal(scrolls(after), 4);
    const scroll = after.hero.pack.find((p) => p.kind === "scroll" && p.type === "enchant weapon")!;

    // 넉 장을 그대로 새 칼에 붓는다 — +4 까지는 안전 구간이다.
    for (let i = 0; i < 4; i++) {
        after = perform(after, { t: "read", letter: scroll.letter!, target: better.letter! });
    }
    assert.equal(better.plusHit, 4, "옮겨 심은 강화가 안 올랐다");
    assert.equal(packItem(after.hero, scroll.letter!), undefined, "넉 장을 다 안 썼다");
});

test("녹이면 무기 강화 주문서의 정체를 알게 된다", () => {
    const { s, it } = atAnvil(18, 2);
    assert.ok(!s.known["scroll:enchant weapon"], "녹이기 전부터 알고 있다");
    const after = perform(s, { t: "melt", letter: it.letter! });
    assert.ok(after.known["scroll:enchant weapon"], "손에 쥐었는데 무엇인지 모른다");
});
