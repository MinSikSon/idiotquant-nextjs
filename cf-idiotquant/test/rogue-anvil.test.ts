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
//   ③ **쇠붙이 몫 한 장은 반드시 나온다.** 강화 안 된 칼도 한 장이 나온다 — 안 그러면
//      층마다 떨어지는 칼이 그냥 쓰레기이고, 모루는 이미 키운 것을 갈아 끼울 때만 쓰는
//      좁은 칸이 된다.
//   ③-2 **걸린 강화는 확률로 돌아온다**(`MELT_RETURN`). 다 돌려주면 옮겨 심기가 공짜라
//      「지금 이 칼에 넣을까」가 결정이 아니게 된다. **무기도 갑옷도 녹는다.**
//   ④ **화살·표창은 깔아 주지 않는다.** 한 번에 대여섯씩 떨어지는 것들이라 낱개마다
//      한 장을 깔면 한 판에 열여덟 장이 나오고(재 봤다) `+9` 가 그냥 걸어 들어온다.
//      나올 것이 없으면 **주문서도 턴도 안 쓴다**(못 박은 규칙 3).
//   ⑤ **한 자루씩** — 표창처럼 겹쳐 쌓인 것도 한 번에 하나다.
//   ⑥ **되뽑은 것을 그대로 다시 걸 수 있다** — 이 길이 막히면 모루가 아무것도 아니다.

import { test } from "node:test";
import assert from "node:assert/strict";

import { newGame, perform } from "@/lib/rogue/game";
import { addToPack, equippedWeapon, packItem } from "@/lib/rogue/hero";
import { MELT_RETURN, enchantOf, makeItem, meltMax, meltYield } from "@/lib/rogue/items";
import { buildLevel } from "@/lib/rogue/dungeon";
import { Rng } from "@/lib/rogue/rng";
import { walkable, idx, type GameState, type Item, type Tile } from "@/lib/rogue/types";

/** 모루 위에 세우고, 배낭에 `+plus` 짜리 물건 하나를 넣는다. */
function atAnvil(seed: number, plus: number, type = "long sword", count = 1, kind: "weapon" | "armor" = "weapon") {
    const s = newGame(seed);
    const a = s.level.anvil!;
    s.heroes[0].x = a.x;
    s.heroes[0].y = a.y;
    const it = makeItem(kind, type, 900, -1, -1, count);
    if (kind === "armor") it.plusArmor = plus;
    else {
        it.plusHit = plus;
        it.plusDam = plus;
    }
    addToPack(s.heroes[0], it);
    return { s, it };
}

/** 배낭에 든 강화 주문서의 장수. */
function scrolls(s: GameState, type = "enchant weapon"): number {
    return s.heroes[0].pack
        .filter((p: Item) => p.kind === "scroll" && p.type === type)
        .reduce((n: number, p: Item) => n + p.count, 0);
}

test("모루는 층마다 하나, 그 칸에서만 녹는다", () => {
    // ── 모루는 층마다 하나 있고, 걸어 들어갈 수 있는 칸에 선다
    {
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
    }

    // ── 모루 위가 아니면 안 녹는다 — 턴도 안 쓴다
    {
        const { s, it } = atAnvil(11, 5);
        // 한 칸 비켜선다.
        const away = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
        ].find(([dx, dy]) => walkable(s.level.tiles[idx(s.heroes[0].x + dx, s.heroes[0].y + dy)] as Tile))!;
        s.heroes[0].x += away[0];
        s.heroes[0].y += away[1];

        const turnBefore = s.turn;
        const after = perform(s, { t: "melt", letter: it.letter! });
        assert.ok(after.heroes[0].pack.some((p) => p.id === it.id), "모루도 없는데 무기가 사라졌다");
        assert.equal(scrolls(after), 0, "모루도 없는데 주문서가 나왔다");
        assert.equal(after.turn, turnBefore, "아무 일도 안 났는데 턴이 갔다");
        assert.ok(after.messages.some((m) => m.includes("모루가 없다")));
    }
});

// 다 돌려주면 **옮겨 심기가 공짜**라 「지금 이 칼에 넣을까, 더 좋은 것을 주울 때까지
// 아낄까」가 결정이 아니게 된다. 그렇다고 늘 한 장이면 강화한 것을 녹일 까닭이 없다.

// 강화 안 된 칼도 한 장은 나와야 한다. 안 그러면 층마다 떨어지는 칼이 그냥 쓰레기이고,
// 모루는 **이미 키운 것을 갈아 끼울 때만** 쓰는 좁은 칸이 된다.
test("나오는 장수 — 쇠붙이 몫 한 장은 확정, 강화분은 확률", () => {
    // ── 나오는 장수는 **쇠붙이 몫 한 장과 강화분 사이**다
    {
        for (let plus = 0; plus <= 9; plus++) {
            for (let seed = 0; seed < 40; seed++) {
                const { s, it } = atAnvil(100 + plus * 97 + seed, plus);
                assert.equal(meltMax(it), 1 + plus, `+${plus}: 화면이 적을 최대가 다르다`);
                const after = perform(s, { t: "melt", letter: it.letter! });
                assert.ok(!after.heroes[0].pack.some((p) => p.id === it.id), `+${plus}: 녹였는데 물건이 남았다`);
                const got = scrolls(after);
                assert.ok(got >= 1, `+${plus}: 쇠붙이 몫 한 장이 안 나왔다(${got})`);
                assert.ok(got <= 1 + plus, `+${plus}: 있지도 않은 강화가 나왔다(${got})`);
            }
        }
    }

    // ── 강화분은 **확률로** 돌아온다 — 다도 아니고 하나도 아니다
    {
        let full = 0;
        let short = 0;
        let sum = 0;
        const runs = 400;
        for (let seed = 0; seed < runs; seed++) {
            const { s, it } = atAnvil(5000 + seed * 31, 6);
            const got = scrolls(perform(s, { t: "melt", letter: it.letter! }));
            sum += got - 1; // 쇠붙이 몫을 뺀 강화 회수분
            if (got === 7) full++;
            else short++;
        }
        assert.ok(full > 0, "여섯 칸이 다 돌아온 판이 한 번도 없다");
        assert.ok(short > 0, "언제나 다 돌아온다 — 확률이 아니다");
        // 평균이 표의 값 언저리여야 한다. 화면이 적는 확률과 갈리면 사람이 속는다.
        const rate = sum / (runs * 6);
        assert.ok(
            Math.abs(rate - MELT_RETURN) < 0.06,
            `회수율이 ${(rate * 100).toFixed(1)}% — 표의 ${MELT_RETURN * 100}% 와 다르다`,
        );
    }

    // ── 강화 없는 무기도 한 장은 나온다 — 그 한 장은 확률이 아니다
    {
        for (let seed = 0; seed < 60; seed++) {
            const { s, it } = atAnvil(12 + seed * 17, 0);
            assert.deepEqual(meltYield(it), { sure: 1, risky: 0 }, "화면이 적을 장수부터 0 이다");
            const after = perform(s, { t: "melt", letter: it.letter! });
            assert.ok(!after.heroes[0].pack.some((p) => p.id === it.id), "녹였는데 무기가 남았다");
            assert.equal(scrolls(after), 1);
        }
    }
});

// 갑옷 강화가 돌아왔다. 되돌리는 길이 무기에만 있던 것이 그때 뺐던 까닭이었는데,
// 이제 **갑옷도 녹으므로** 그 까닭이 사라졌다.
test("갑옷도 녹는다 — 입고 있는 저주받은 것만 빼고", () => {
    // ── 갑옷도 녹는다 — 나오는 것은 **갑옷** 강화 주문서다
    {
        const { s, it } = atAnvil(60, 4, "plate mail", 1, "armor");
        assert.equal(enchantOf(it), 4);
        assert.equal(meltMax(it), 5);
        const after = perform(s, { t: "melt", letter: it.letter! });
        assert.ok(!after.heroes[0].pack.some((p) => p.id === it.id), "녹였는데 갑옷이 남았다");
        assert.equal(scrolls(after, "enchant weapon"), 0, "갑옷에서 무기 주문서가 나왔다");
        const got = scrolls(after, "enchant armor");
        assert.ok(got >= 1 && got <= 5, `나온 장수가 ${got}`);
        assert.ok(after.known["scroll:enchant armor"], "손에 쥐었는데 무엇인지 모른다");
    }

    // ── 입고 있는 저주받은 갑옷은 못 녹인다
    {
        const { s, it } = atAnvil(61, 3, "plate mail", 1, "armor");
        it.cursed = true;
        s.heroes[0].armorId = it.id;
        const after = perform(s, { t: "melt", letter: it.letter! });
        assert.ok(after.heroes[0].pack.some((p) => p.id === it.id), "몸에 붙은 것이 녹았다");
        assert.ok(after.messages.some((m) => m.includes("몸에서 떨어지지 않는다")));
    }
});

test("쥐고 있던 것을 녹이면 그 자리도 빈다 — 저주받은 것은 못 녹인다", () => {
    // ── 쥐고 있던 것을 녹이면 그 자리도 빈다
    {
        const { s, it } = atAnvil(14, 3);
        s.heroes[0].weaponId = it.id;
        const after = perform(s, { t: "melt", letter: it.letter! });
        assert.equal(equippedWeapon(after.heroes[0]), undefined, "녹았는데 아직 쥐고 있다");
        assert.equal(after.heroes[0].weaponId, null);
    }

    // ── 쥐고 있는 저주받은 무기는 못 녹인다 — 내려놓지도 못하는 것이다
    {
        const { s, it } = atAnvil(15, 4);
        it.cursed = true;
        s.heroes[0].weaponId = it.id;
        const turnBefore = s.turn;
        const after = perform(s, { t: "melt", letter: it.letter! });
        assert.ok(after.heroes[0].pack.some((p) => p.id === it.id), "손에 붙은 것이 녹았다");
        assert.equal(after.turn, turnBefore);
        assert.ok(after.messages.some((m) => m.includes("몸에서 떨어지지 않는다")));

        // 배낭에 든 저주받은 무기는 녹일 수 있다 — 손에 붙은 것이 아니다.
        // **장수는 굴림에 달렸으니 폭으로 본다** — 한 숫자를 박으면 굴림을 바꾸는 날
        // 이 테스트가 「저주」와 상관없는 이유로 깨진다.
        s.heroes[0].weaponId = null;
        const ok = perform(s, { t: "melt", letter: it.letter! });
        assert.ok(!ok.heroes[0].pack.some((p) => p.id === it.id), "배낭에 든 것이 안 녹았다");
        const got = scrolls(ok);
        assert.ok(got >= 1 && got <= 5, `나온 장수가 ${got}`);
    }
});

// 이것이 모루의 **존재 이유**다. 되뽑은 주문서를 새 칼에 못 거는 순간 모루는
// 「무기를 없애는 칸」이 된다.
test("무기도 갑옷도 아니면 안 올라간다 · 되뽑은 것으로 다시 걸 수 있다", () => {
    // ── 무기도 갑옷도 아니면 모루에 안 올라간다
    {
        const { s } = atAnvil(16, 0);
        const ring = makeItem("ring", "protection", 950, -1, -1);
        ring.plusRing = 5;
        addToPack(s.heroes[0], ring);
        const after = perform(s, { t: "melt", letter: ring.letter! });
        assert.ok(after.heroes[0].pack.some((p) => p.id === ring.id), "반지가 녹았다");
        assert.equal(scrolls(after), 0);
        assert.ok(after.messages.some((m) => m.includes("모루에 올릴 것이 아니다")));
    }

    // ── 되뽑은 주문서로 다른 무기를 올릴 수 있다 — 강화를 옮겨 심는다
    {
        // 돌아온 장수는 굴림에 달렸으니 **나온 만큼** 붓는다. 이 길이 막히면 모루는
        // 「물건을 없애는 칸」이 된다.
        const { s, it } = atAnvil(17, 4, "long sword");
        const better = makeItem("weapon", "baphomet sword", 951, -1, -1);
        addToPack(s.heroes[0], better);

        let after = perform(s, { t: "melt", letter: it.letter! });
        const got = scrolls(after);
        assert.ok(got >= 1);
        const scroll = after.heroes[0].pack.find((p) => p.kind === "scroll" && p.type === "enchant weapon")!;

        for (let i = 0; i < got; i++) {
            after = perform(after, { t: "read", letter: scroll.letter!, target: better.letter! });
        }
        assert.equal(better.plusHit, got, "옮겨 심은 강화가 안 올랐다");
        assert.equal(packItem(after.heroes[0], scroll.letter!), undefined, "다 안 썼다");
    }
});
